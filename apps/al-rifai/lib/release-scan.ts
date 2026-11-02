// Release group scan — shared by the backfill script and the ingestion hook.
//
// Reads the Escort Release Slip group from whatsapp_messages_original, parses each
// message, assigns through the four-step matcher and returns rows ready to insert.
// No writes here: callers decide whether to persist.
//
// The whole group is rescanned on every call rather than only new messages,
// because Step D (orphan programs) needs the complete payment picture for an
// escort to decide which payment is a lump-sum release. The group is ~1,000
// messages, so this is cheap, and the dedupe index makes persistence idempotent.

import {parseMessage, assignReleases, type RosterProgram, type Assignment} from './release-parser.ts';

export const RELEASE_GROUP_JID = '120363408741101070@g.us';
export const RELEASE_ACCOUNT = 'wa-01';

export type ScanRow = {
  assignment: Assignment;
  msgId: string;
  msgAt: string;
  msgText: string;
};

export type ScanResult = {
  messages: number;
  withPhone: number;
  phoneLess: number;
  payments: number;
  rows: ScanRow[];
};

export type Queryable = {
  // Deliberately non-generic: the ingestion worker passes a thin adapter whose
  // rows are Record<string, unknown>, which a generic signature rejects.
  query(sql: string, values?: unknown[]): Promise<{rows: unknown[]}>;
};

export async function loadRoster(client: Queryable): Promise<RosterProgram[]> {
  const {rows} = await client.query(
    `SELECT id,
            "escortMobile" AS "escortPhone",
            "escortName"   AS "escortName",
            "startDate"    AS "startDate",
            nullif(btrim("endDate"), '') AS "endDate"
       FROM public.programs
      WHERE dataset_epoch = 'CANONICAL_BACKFILL_20261026'`,
  ) as {rows: Array<{id: string; escortPhone: string | null; escortName: string | null; startDate: string; endDate: string | null}>};
  return rows.map((r) => ({
    id: r.id,
    escortPhone: r.escortPhone,
    escortName: r.escortName,
    startDate: String(r.startDate ?? '').slice(0, 10),
    endDate: r.endDate ? String(r.endDate).slice(0, 10) : null,
  }));
}

const HAS_PHONE = /(?<![\d@])(?:\+?88)?0?1[3-9]\d(?:[\s-]?\d){7}(?!\d)/;

export async function scanReleaseGroup(client: Queryable, roster?: RosterProgram[]): Promise<ScanResult> {
  const effectiveRoster = roster ?? (await loadRoster(client));
  const {rows: messages} = await client.query(
    `SELECT coalesce(message_id, id::text) AS id,
            timestamp::text AS timestamp,
            text_content AS text
       FROM public.whatsapp_messages_original
      WHERE wa_account = $1 AND chat_jid = $2
      ORDER BY timestamp`,
    [RELEASE_ACCOUNT, RELEASE_GROUP_JID],
  ) as {rows: Array<{id: string; timestamp: string; text: string | null}>};

  let withPhone = 0;
  let phoneLess = 0;
  const payments: Array<ReturnType<typeof parseMessage>[number]> = [];
  const meta: Array<{msgId: string; msgAt: string; msgText: string}> = [];

  for (const msg of messages) {
    const body = msg.text ?? '';
    const hasPhone = HAS_PHONE.test(body);
    if (hasPhone) withPhone += 1;

    const parsed = parseMessage(body, msg.timestamp);
    if (!parsed.length) {
      if (!hasPhone) phoneLess += 1;
      continue;
    }
    for (const payment of parsed) {
      payments.push(payment);
      meta.push({msgId: msg.id, msgAt: msg.timestamp, msgText: body});
    }
  }

  const assignments = assignReleases(payments, effectiveRoster);
  const rows: ScanRow[] = assignments.map((assignment, i) => ({
    assignment,
    ...(meta[i] ?? {msgId: '', msgAt: '', msgText: ''}),
  }));

  return {messages: messages.length, withPhone, phoneLess, payments: payments.length, rows};
}

/** Insert rows, ignoring ones already present (dedupe index on message/escort/day/amount). */
export async function persistRows(client: Queryable, rows: readonly ScanRow[]): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    const a = row.assignment;
    const result = await client.query(
      `INSERT INTO public.release_candidates
         (escort_phone, escort_name, program_id, end_date, end_shift,
          amount_bdt, duty_days, calc_start, conveyance, match_status,
          match_pass, mismatch_kind, confidence, notes, source_msg_id, source_date, source_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT DO NOTHING`,
      [
        a.escortPhone, a.escortName, a.programId, a.endDate, a.endShift,
        a.amountBdt, a.dutyDays, a.calcStart, a.conveyance, a.status,
        a.matchPass, a.mismatchKind, a.confidence, a.note,
        row.msgId, row.msgAt, row.msgText.slice(0, 4000),
      ],
    );
    inserted += (result as unknown as {rowCount?: number}).rowCount ?? 0;
  }
  return inserted;
}

/** Trigger conditions from §Step 5 — used by the hook to decide whether to scan. */
export function messageTriggersParse(body: string | null | undefined, mediaType?: string | null): boolean {
  const text = body ?? '';
  if (HAS_PHONE.test(text)) return true;
  if (/\b\d{3,6}\b/.test(text)) return true;
  if ((mediaType ?? '').toLowerCase() === 'image') return true;
  return /release|conv|conveyance|খালাস/i.test(text);
}
