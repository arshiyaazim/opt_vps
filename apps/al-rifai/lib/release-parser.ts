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
  /** Released on, when already known. Empty/absent means the duty is open. */
  endDate?: string | null;
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

// The shift boundary lives in exactly one module (Owner decision D5, 2026-11-04:
// Day 06:00:00–17:59:59, Night 18:00:00–05:59:59 Asia/Dhaka). This parser no
// longer owns a copy of the cutoff; it only reads the local Dhaka clock.
import {dhakaLocalTime, shiftForHour} from './shift-boundary.ts';

export {shiftForHour};

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
  const when = dhakaLocalTime(timestampIso);
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


// ─────────────────────────────────────────────────────────────────────────────
// Assignment (Steps A-D, owner correction 2026-11-02).
//
// A payment dated AFTER a duty's release is a NEW DUTY on a new ship, not a
// partial payment for the same duty. Treating them as partials merged distinct
// ships into one program, which is why the earlier passes were wrong.
//
//   Step A  calc_start within ±2 of a program start  -> primary match
//   Step B  if several payments claim one program, the closest calc_start wins
//   Step C  remaining payments, per escort, relative to that escort's releases:
//             a) inside [program.start, release]      -> partial for that duty
//             b) after the last release               -> new duty: try another
//                program, else ROSTER_MISMATCH (missing program)
//             c) before the first program             -> try another, else mismatch
//   Step D  escorts with no program at all -> every payment is a mismatch
//
// ROSTER_MISMATCH is a useful result here: NEW_DUTY_AFTER_RELEASE points at a
// program the roster is missing.
// ─────────────────────────────────────────────────────────────────────────────

export type MismatchKind =
  | 'NO_ROSTER_PHONE'
  | 'NEW_DUTY_AFTER_RELEASE'
  | 'BEFORE_PROGRAM'
  | 'OUTSIDE_TOLERANCE'
  | 'AMBIGUOUS';

export type Assignment = Payment & {
  status: MatchStatus;
  programId: string | null;
  /** 1 = Step A, 2 = Step C inside an existing duty, 3 = Step C another program. */
  matchPass: 1 | 2 | 3 | null;
  note: string | null;
  mismatchKind: MismatchKind | null;
  /** high = Steps A/B/C (calc_start matched); medium = Step D lump sum. */
  confidence: 'high' | 'medium' | null;
  nearestProgramId: string | null;
  nearestStartDate: string | null;
  startDeltaDays: number | null;
};

export function assignReleases(
  payments: readonly Payment[],
  roster: readonly RosterProgram[],
): Assignment[] {
  const results: Assignment[] = payments.map((p) => ({
    ...p,
    // A payment with no usable amount is NO_PAYMENT, not a roster mismatch.
    status: (p.amountBdt === null ? 'NO_PAYMENT' : 'ROSTER_MISMATCH') as MatchStatus,
    programId: null,
    matchPass: null,
    note: null,
    mismatchKind: null,
    confidence: null,
    nearestProgramId: null,
    nearestStartDate: null,
    startDeltaDays: null,
  }));

  const byPhone = new Map<string, RosterProgram[]>();
  for (const pr of roster) {
    const key = normalisePhone(pr.escortPhone);
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(pr.startDate)) continue;
    const list = byPhone.get(key) ?? [];
    list.push(pr);
    byPhone.set(key, list);
  }
  const startOf = new Map(roster.map((p) => [p.id, p.startDate]));

  // ---- Step A: candidate (payment, program) pairs within tolerance
  const pairs: Array<{idx: number; programId: string; delta: number}> = [];
  results.forEach((a, idx) => {
    if (!a.calcStart) return;
    for (const pr of byPhone.get(normalisePhone(a.escortPhone) ?? '') ?? []) {
      const d = daysBetween(pr.startDate, a.calcStart);
      if (Number.isFinite(d) && Math.abs(d) <= START_TOLERANCE_DAYS) {
        pairs.push({idx, programId: pr.id, delta: Math.abs(d)});
      }
    }
  });

  // ---- Step B: one payment per program; closest calc_start wins
  const winner = new Map<string, {idx: number; programId: string; delta: number}>();
  for (const pair of pairs) {
    const cur = winner.get(pair.programId);
    if (!cur || pair.delta < cur.delta) winner.set(pair.programId, pair);
  }
  for (const [programId, pair] of winner) {
    const a = results[pair.idx];
    const start = startOf.get(programId) ?? '';
    a.status = 'MATCHED';
    a.programId = programId;
    a.matchPass = 1;
    a.confidence = 'high';
    a.nearestProgramId = programId;
    a.nearestStartDate = start;
    a.startDeltaDays = daysBetween(start, a.calcStart ?? '');
  }

  // ---- Steps C and D, per escort
  const byEscort = new Map<string, number[]>();
  results.forEach((a, i) => {
    const key = normalisePhone(a.escortPhone) ?? '';
    const list = byEscort.get(key) ?? [];
    list.push(i);
    byEscort.set(key, list);
  });

  for (const [phone, idxs] of byEscort) {
    const programs = byPhone.get(phone) ?? [];
    const releases = () =>
      results
        .map((a, i) => ({a, i}))
        .filter(({a}) => a.status === 'MATCHED' && (normalisePhone(a.escortPhone) ?? '') === phone && a.programId)
        .map(({a}) => ({
          programId: a.programId as string,
          start: startOf.get(a.programId as string) ?? '',
          release: a.endDate,
        }));

    if (!programs.length) {
      // Step D
      for (const i of idxs) {
        if (results[i].status === 'NO_PAYMENT') continue;
        results[i].mismatchKind = 'NO_ROSTER_PHONE';
      }
      continue;
    }

    const used = new Set(releases().map((r) => r.programId));
    const ordered = [...idxs].sort((x, y) => results[x].endDate.localeCompare(results[y].endDate));

    for (const i of ordered) {
      const a = results[i];
      if (a.status === 'MATCHED' || a.status === 'NO_PAYMENT') continue;

      const current = releases();

      // (a) inside an existing duty window -> partial for that duty
      const inside = current.find((r) => a.endDate >= r.start && a.endDate <= r.release);
      if (inside) {
        a.status = 'MATCHED';
        a.programId = inside.programId;
        a.matchPass = 2;
        a.confidence = 'high';
        a.note = 'partial payment within duty window';
        a.nearestProgramId = inside.programId;
        a.nearestStartDate = inside.start;
        a.startDeltaDays = daysBetween(inside.start, a.calcStart ?? '');
        continue;
      }

      // (b)/(c) another program of this escort whose start fits this payment
      let other: {id: string; delta: number} | null = null;
      if (a.calcStart) {
        for (const pr of programs) {
          if (used.has(pr.id)) continue;
          const d = daysBetween(pr.startDate, a.calcStart);
          if (Number.isFinite(d) && Math.abs(d) <= START_TOLERANCE_DAYS && (!other || Math.abs(d) < other.delta)) {
            other = {id: pr.id, delta: Math.abs(d)};
          }
        }
      }
      if (other) {
        const start = startOf.get(other.id) ?? '';
        a.status = 'MATCHED';
        a.programId = other.id;
        a.matchPass = 3;
        a.confidence = 'high';
        a.nearestProgramId = other.id;
        a.nearestStartDate = start;
        a.startDeltaDays = daysBetween(start, a.calcStart ?? '');
        used.add(other.id);
        continue;
      }

      // ---- mismatch classification
      const releaseDates = current.map((r) => r.release).sort();
      const latestRelease = releaseDates.length ? releaseDates[releaseDates.length - 1] : null;
      const firstStart = programs.map((pr) => pr.startDate).sort()[0] ?? null;

      if (latestRelease && a.endDate > latestRelease) {
        a.mismatchKind = 'NEW_DUTY_AFTER_RELEASE';
        a.note = `new duty after ${latestRelease}, calc_start ${a.calcStart ?? '—'}`;
      } else if (firstStart && a.endDate < firstStart) {
        a.mismatchKind = 'BEFORE_PROGRAM';
        a.note = `before first program ${firstStart}, calc_start ${a.calcStart ?? '—'}`;
      } else {
        a.mismatchKind = 'OUTSIDE_TOLERANCE';
        a.note = `calc_start ${a.calcStart ?? '—'} outside ±${START_TOLERANCE_DAYS}`;
      }

      // nearest program by start date, for the report
      let nearest: RosterProgram | null = null;
      let nearestDelta = Number.POSITIVE_INFINITY;
      for (const pr of programs) {
        const d = Math.abs(daysBetween(pr.startDate, a.calcStart ?? a.endDate));
        if (Number.isFinite(d) && d < nearestDelta) {
          nearestDelta = d;
          nearest = pr;
        }
      }
      if (nearest) {
        a.nearestProgramId = nearest.id;
        a.nearestStartDate = nearest.startDate;
        a.startDeltaDays = a.calcStart ? daysBetween(nearest.startDate, a.calcStart) : null;
      }
    }
  }

  // ---- Step D: orphan programs — lump-sum settlements that do not back-calculate
  //
  // For an escort's program that received no match from A/B/C, a payment dated at
  // or after its start (and before the next duty) is very likely its release
  // settlement: ৳900 "release + conveyance" divides into 6 meaningless food days.
  //
  // The FIRST such payment is taken as the release; anything later in the same
  // window is a new duty and stays a mismatch. That ordering is deliberate: it is
  // what makes Korban Ali's 10-07 the release and 10-12 a new duty, which the
  // owner verified. Step D matches are 'medium' confidence and always go through
  // admin review.
  for (const [phone, idxs] of byEscort) {
    const programs = (byPhone.get(phone) ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!programs.length) continue;

    const matchedPrograms = new Set(
      results.filter((a) => a.status === 'MATCHED' && (normalisePhone(a.escortPhone) ?? '') === phone && a.programId)
        .map((a) => a.programId as string),
    );

    for (let pi = 0; pi < programs.length; pi += 1) {
      const program = programs[pi];
      if (matchedPrograms.has(program.id)) continue;

      const nextStart = programs[pi + 1]?.startDate ?? null;
      const candidates = idxs
        .map((i) => results[i])
        .filter((a) => a.status === 'ROSTER_MISMATCH'
          && a.endDate >= program.startDate
          && (nextStart === null || a.endDate < nextStart))
        .sort((a, b) => a.endDate.localeCompare(b.endDate));

      if (!candidates.length) continue;

      const release = candidates[0];
      release.status = 'MATCHED';
      release.programId = program.id;
      release.matchPass = null;
      release.confidence = 'medium';
      release.mismatchKind = null;
      release.nearestProgramId = program.id;
      release.nearestStartDate = program.startDate;
      release.startDeltaDays = release.calcStart ? daysBetween(program.startDate, release.calcStart) : null;
      release.note = candidates.length > 1
        ? `lump-sum release (first of ${candidates.length} payments in window), amount does not back-calculate`
        : 'lump-sum release, amount does not back-calculate';
      matchedPrograms.add(program.id);

      // Payments still in the window after that release belong to a later duty.
      for (const later of candidates.slice(1)) {
        if (later.status !== 'ROSTER_MISMATCH') continue;
        later.mismatchKind = 'NEW_DUTY_AFTER_RELEASE';
        later.note = `new duty after ${release.endDate}, calc_start ${later.calcStart ?? '—'}`;
      }
    }
  }

  return results;
}
