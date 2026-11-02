// Escort Release Parser — extraction and roster matching (R1 §2-§3).
//
// Pure functions only: no database access, no writes, no side effects. The backfill
// script and the ingestion hook both feed this module and persist the results.
//
// Core rule (§3): the message timestamp IS the duty end date. It is never
// recalculated, never validated against the amount, and never rejected. The food
// bill is secondary evidence that yields a back-calculated start, which is then
// compared with the roster to find the program the payment belongs to.
//
// Deliberately NOT implemented (rejected by the owner, §4): forward Δ validation,
// date-window attribution rules, "larger = food" across days, and any inference of
// shift from the time of day beyond the explicit clock rule in §3 STEP 2.

export type RosterProgram = {
  id: string;
  escortPhone: string | null;
  escortName: string | null;
  startDate: string; // YYYY-MM-DD
};

export type Payment = {
  escortPhone: string;   // normalised 01XXXXXXXXX
  escortName: string | null;
  amountBdt: number | null;   // food bill, Taka
  conveyance: number | null;  // Taka, informational
  endDate: string;            // YYYY-MM-DD (message date)
  endShift: 'D' | 'N' | null;
  dutyDays: number | null;    // floor(amount / 150)
  calcStart: string | null;   // endDate - dutyDays
  line: string;               // the source line, for audit
};

export type MatchStatus = 'MATCHED' | 'ROSTER_MISMATCH' | 'NO_PAYMENT' | 'PENDING_REVIEW';

export type MatchResult = {
  status: MatchStatus;
  programId: string | null;
  candidateIds: string[];
  nearestProgramId: string | null;
  nearestStartDate: string | null;
  startDeltaDays: number | null;
};

/** Food rate: one day of food money is BDT 150 (§2.2). */
export const FOOD_RATE_BDT = 150;
/** Roster match tolerance on the back-calculated start (§3 STEP 5). */
export const START_TOLERANCE_DAYS = 2;

// Boundaries matter: bridge LIDs are long digit runs (e.g. @14569099509850) that
// would otherwise be truncated into a plausible-looking 01… number. A match must
// not be preceded by a digit or by '@', and must not run into further digits.
const MOBILE_RE = /(?<![\d@])(?:\+?88)?0?1[3-9]\d(?:[\s-]?\d){7}(?!\d)/g;
const CONVEYANCE_RE = /conv|conveyance|গাড়ি|ভাড়া|gari|vara/i;
const DAYWORD_RE = /\b\d{1,2}\s*[- ]?\s*(?:day|days|dsy|din)\b/gi;
const DATE_RE = /\b\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}\b/g;

/** Normalise any Bangladeshi mobile spelling to 01XXXXXXXXX. */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(3);
  if (d.length === 10 && d.startsWith('1')) d = `0${d}`;
  if (!/^01[3-9]\d{8}$/.test(d)) return null;
  return d;
}

/** Dhaka wall-clock hour, so the shift rule uses the business timezone (§3 STEP 2). */
function dhakaParts(timestampIso: string): { date: string; hour: number; minute: number } | null {
  const parsed = new Date(timestampIso);
  if (Number.isNaN(parsed.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(parsed).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

export function shiftForHour(hour: number): 'D' | 'N' {
  // 05:00–17:59 is a day message; 18:00–04:59 is a night message. The bill time is
  // the shift; no "morning bill implies night duty" inference is made (§3/§4).
  return hour >= 5 && hour < 18 ? 'D' : 'N';
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((a - b) / 86_400_000);
}

/** All numeric amounts on a line, excluding phone numbers, dates and "N-day" tokens. */
function amountsOnLine(line: string): number[] {
  let text = line;
  // Remove phone numbers first: they are not money.
  text = text.replace(MOBILE_RE, ' ');
  // Remove dates (§2.4 non-numeric content in the money sense).
  text = text.replace(DATE_RE, ' ');
  // Remove "12-day" so the day count is not read as an amount.
  text = text.replace(DAYWORD_RE, ' ');
  const out: number[] = [];
  // Payment-method markers (B)/(N) follow either the payout number or the amount;
  // they are Bkash/Nagad and never a shift (§2.2).
  const cleaned = text.replace(/\([A-Za-z]\)/g, ' ');
  for (const m of cleaned.matchAll(/\b(\d{2,5})(?:\s*\/-)?\b/g)) {
    const value = Number(m[1]);
    if (Number.isFinite(value) && value >= 100 && value <= 50_000) out.push(value);
  }
  return out;
}

/**
 * Parse one message body into release payments.
 *
 * Reads the entire body line by line (§2). A line without a mobile continues the
 * previous line's escort, which is how conveyance lines are written. The first
 * mobile on a line is the escort; later mobiles on the same line are payout
 * numbers and are ignored for identity.
 */
export function parseMessage(body: string, timestampIso: string): Payment[] {
  const when = dhakaParts(timestampIso);
  if (!when) return [];

  const endDate = when.date;
  const endShift = shiftForHour(when.hour);

  const found = new Map<string, Payment>();
  let currentPhone: string | null = null;
  let currentName: string | null = null;

  for (const rawLine of String(body ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const mobiles = [...line.matchAll(MOBILE_RE)]
      .map((m) => normalisePhone(m[0]))
      .filter((v): v is string => Boolean(v));

    if (mobiles.length) {
      currentPhone = mobiles[0];
      // Name heuristic: text after the phone on the same line, trimmed of markers.
      const after = line.slice(line.indexOf(String(mobiles[0]).slice(-4)) + 4);
      const nameMatch = after.replace(/^[\s:,-]+/, '').match(/^([A-Za-z][A-Za-z .'-]{2,40})/);
      currentName = nameMatch ? nameMatch[1].trim() : null;
    } else if (!currentPhone) {
      continue; // no escort in context yet
    }

    const amounts = amountsOnLine(line);
    if (!amounts.length) continue;

    const isConveyance = CONVEYANCE_RE.test(line);
    const existing = found.get(currentPhone) ?? {
      escortPhone: currentPhone,
      escortName: currentName,
      amountBdt: null,
      conveyance: null,
      endDate,
      endShift,
      dutyDays: null,
      calcStart: null,
      line,
    };

    const total = amounts.reduce((a, b) => a + b, 0);
    if (isConveyance) {
      existing.conveyance = Math.max(existing.conveyance ?? 0, total) || existing.conveyance;
    } else {
      // Same-day multiple amounts: keep the largest as the food bill and record the
      // remainder as conveyance when none was found (§3 STEP 7).
      const largest = Math.max(...amounts);
      if (existing.amountBdt === null || largest > existing.amountBdt) {
        if (existing.amountBdt !== null && existing.conveyance === null) {
          existing.conveyance = existing.amountBdt;
        }
        existing.amountBdt = largest;
      } else if (existing.conveyance === null) {
        existing.conveyance = largest;
      }
    }
    found.set(currentPhone, existing);
  }

  return [...found.values()].map((p) => {
    const dutyDays = p.amountBdt === null ? null : Math.floor(p.amountBdt / FOOD_RATE_BDT);
    return {
      ...p,
      dutyDays,
      calcStart: dutyDays === null ? null : addDays(p.endDate, -dutyDays),
    };
  });
}

/**
 * Match a payment against the roster (§3 STEP 5).
 *
 * The back-calculated start must land within ±2 days of a program's start date.
 * One hit is a match; several are ambiguous and go to review; none is reported as
 * ROSTER_MISMATCH rather than dropped (§12).
 */
export function matchRelease(payment: Payment, roster: readonly RosterProgram[]): MatchResult {
  const phone = normalisePhone(payment.escortPhone);
  const base: MatchResult = {
    status: 'ROSTER_MISMATCH',
    programId: null,
    candidateIds: [],
    nearestProgramId: null,
    nearestStartDate: null,
    startDeltaDays: null,
  };
  if (!phone) return base;

  if (payment.amountBdt === null || payment.calcStart === null) {
    return { ...base, status: 'NO_PAYMENT' };
  }

  const samePhone = roster.filter((p) => normalisePhone(p.escortPhone) === phone && p.startDate);
  if (!samePhone.length) return base;

  const within = samePhone.filter((p) => {
    const delta = Math.abs(daysBetween(p.startDate, payment.calcStart as string));
    return Number.isFinite(delta) && delta <= START_TOLERANCE_DAYS;
  });

  // Nearest program regardless of tolerance, for reporting on a mismatch.
  let nearest: RosterProgram | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;
  for (const p of samePhone) {
    const delta = Math.abs(daysBetween(p.startDate, payment.calcStart));
    if (Number.isFinite(delta) && delta < nearestDelta) {
      nearestDelta = delta;
      nearest = p;
    }
  }

  if (within.length === 1) {
    return {
      status: 'MATCHED',
      programId: within[0].id,
      candidateIds: [within[0].id],
      nearestProgramId: within[0].id,
      nearestStartDate: within[0].startDate,
      startDeltaDays: daysBetween(within[0].startDate, payment.calcStart),
    };
  }
  if (within.length > 1) {
    return {
      status: 'PENDING_REVIEW',
      programId: null,
      candidateIds: within.map((p) => p.id),
      nearestProgramId: nearest?.id ?? null,
      nearestStartDate: nearest?.startDate ?? null,
      startDeltaDays: nearest ? daysBetween(nearest.startDate, payment.calcStart) : null,
    };
  }
  return {
    ...base,
    nearestProgramId: nearest?.id ?? null,
    nearestStartDate: nearest?.startDate ?? null,
    startDeltaDays: nearest ? daysBetween(nearest.startDate, payment.calcStart) : null,
  };
}
