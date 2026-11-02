// R1 backfill: parse the Escort Release Slip group into release_candidates.
//
// Read-only against the mirror (whatsapp_messages_original) and against programs.
// The only writes are INSERTs into release_candidates. programs is never updated,
// which is the §12 guardrail and also the reason this can be re-run safely.
//
// Usage:
//   node --experimental-strip-types scripts/backfill-releases.ts
//   node --experimental-strip-types scripts/backfill-releases.ts --dry-run
//
// Environment: PGHOST / PGDATABASE / PGUSER / PGPASSWORD_FILE (see db/postgres.mjs).

import {createPool} from '../db/postgres.mjs';
import {parseMessage, matchRelease, type RosterProgram, type Payment} from '../lib/release-parser.ts';

/** The only group this parser reads (§1). Verified from bridge-1 `chats`. */
const RELEASE_GROUP_JID = '120363408741101070@g.us';
const ACCOUNT = 'wa-01';
const DRY_RUN = process.argv.includes('--dry-run');

type MessageRow = { id: string; timestamp: string; text: string | null };
type Candidate = {
  payment: Payment;
  status: string;
  programId: string | null;
  nearestStart: string | null;
  nearestProgram: string | null;
  delta: number | null;
  msgId: string;
  msgAt: string;
  msgText: string;
};

function count<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

async function main() {
  const pool = createPool({ readOnly: false });
  const client = await pool.connect();
  try {
    const rosterRows = await client.query<{ id: string; escortPhone: string | null; escortName: string | null; startDate: string }>(
      `SELECT id, "escortMobile" AS "escortPhone", "escortName" AS "escortName", "startDate" AS "startDate"
         FROM public.programs
        WHERE dataset_epoch = 'CANONICAL_BACKFILL_20261026'`,
    );
    const roster: RosterProgram[] = rosterRows.rows.map((r) => ({
      id: r.id,
      escortPhone: r.escortPhone,
      escortName: r.escortName,
      startDate: String(r.startDate ?? '').slice(0, 10),
    }));

    const msgRows = await client.query<MessageRow>(
      `SELECT coalesce(message_id, id::text) AS id,
              timestamp::text AS timestamp,
              text_content AS text
         FROM public.whatsapp_messages_original
        WHERE wa_account = $1 AND chat_jid = $2
        ORDER BY timestamp`,
      [ACCOUNT, RELEASE_GROUP_JID],
    );

    let messages = 0;
    let messagesWithPhone = 0;
    let payments = 0;
    const candidates: Candidate[] = [];
    const noPhoneMessages: string[] = [];

    for (const msg of msgRows.rows) {
      messages += 1;
      const body = msg.text ?? '';
      const hasPhone = /(?<![\d@])(?:\+?88)?0?1[3-9]\d(?:[\s-]?\d){7}(?!\d)/.test(body);
      if (hasPhone) messagesWithPhone += 1;

      const parsed = parseMessage(body, msg.timestamp);
      if (!parsed.length) {
        if (!hasPhone) noPhoneMessages.push(msg.id);
        continue;
      }

      for (const payment of parsed) {
        payments += 1;
        const match = matchRelease(payment, roster);
        candidates.push({
          payment,
          status: match.status,
          programId: match.programId,
          nearestStart: match.nearestStartDate,
          nearestProgram: match.nearestProgramId,
          delta: match.startDeltaDays,
          msgId: msg.id,
          msgAt: msg.timestamp,
          msgText: body,
        });
      }
    }

    // Messages that carried a phone but no usable amount still deserve a row so the
    // gap is visible (§6.4 NO_PAYMENT).
    const noPaymentRows = candidates.filter((c) => c.status === 'NO_PAYMENT');

    if (!DRY_RUN) {
      for (const c of candidates) {
        await client.query(
          `INSERT INTO public.release_candidates
             (escort_phone, escort_name, program_id, end_date, end_shift,
              amount_bdt, duty_days, calc_start, conveyance, match_status,
              source_msg_id, source_date, source_text)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT DO NOTHING`,
          [
            c.payment.escortPhone,
            c.payment.escortName,
            c.programId,
            c.payment.endDate,
            c.payment.endShift,
            c.payment.amountBdt,
            c.payment.dutyDays,
            c.payment.calcStart,
            c.payment.conveyance,
            c.status,
            c.msgId,
            c.msgAt,
            c.msgText.slice(0, 4000),
          ],
        );
      }
    }

    // ---------------- report ----------------
    const byStatus = count(candidates, (c) => c.status);
    const matched = candidates.filter((c) => c.status === 'MATCHED');
    const mismatched = candidates.filter((c) => c.status === 'ROSTER_MISMATCH');
    const ambiguous = candidates.filter((c) => c.status === 'PENDING_REVIEW');

    console.log(`\n=== RELEASE PARSER BACKFILL (${DRY_RUN ? 'DRY RUN' : 'APPLIED'}) ===`);
    console.log(`group                 ${RELEASE_GROUP_JID}`);
    console.log(`messages processed    ${messages}`);
    console.log(`  with a phone number ${messagesWithPhone}`);
    console.log(`  no phone at all     ${noPhoneMessages.length}  (not inserted; nothing to link)`);
    console.log(`payment lines parsed  ${payments}`);
    console.log(`candidates            ${candidates.length}`);
    for (const s of ['MATCHED', 'ROSTER_MISMATCH', 'PENDING_REVIEW', 'NO_PAYMENT']) {
      console.log(`  ${s.padEnd(18)} ${byStatus.get(s) ?? 0}`);
    }

    const duty = count(matched.filter((c) => c.payment.dutyDays !== null), (c) => String(c.payment.dutyDays));
    console.log(`\nduty days (MATCHED)   ${[...duty.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, n]) => `${d}d:${n}`).join('  ')}`);
    const shift = count(matched, (c) => c.payment.endShift ?? '?');
    console.log(`end shift (MATCHED)   D:${shift.get('D') ?? 0}  N:${shift.get('N') ?? 0}`);

    const programsCovered = new Set(matched.map((c) => c.programId));
    console.log(`\ndistinct programs covered by MATCHED: ${programsCovered.size} of ${roster.length}`);

    console.log('\n--- 5 MATCHED ---');
    for (const c of matched.slice(0, 5)) {
      console.log(`  ${c.payment.escortPhone}  ${c.payment.endDate}(${c.payment.endShift})  food ${c.payment.amountBdt}  ${c.payment.dutyDays}d  calc_start ${c.payment.calcStart}  -> program start ${c.nearestStart} (Δ${c.delta})`);
      console.log(`     ${c.msgText.split('\n')[0].slice(0, 120)}`);
    }

    console.log('\n--- 5 ROSTER_MISMATCH ---');
    for (const c of mismatched.slice(0, 5)) {
      console.log(`  ${c.payment.escortPhone}  ${c.payment.endDate}(${c.payment.endShift})  food ${c.payment.amountBdt}  ${c.payment.dutyDays}d  calc_start ${c.payment.calcStart}  nearest start ${c.nearestStart ?? '—'} (Δ${c.delta ?? '—'})`);
      console.log(`     ${c.msgText.split('\n')[0].slice(0, 120)}`);
    }

    if (ambiguous.length) {
      console.log('\n--- PENDING_REVIEW (ambiguous) ---');
      for (const c of ambiguous.slice(0, 5)) {
        console.log(`  ${c.payment.escortPhone}  ${c.payment.endDate}  calc_start ${c.payment.calcStart}  program ${c.nearestStart} (Δ${c.delta})`);
      }
    }

    console.log(`\nnoPaymentRows=${noPaymentRows.length}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('BACKFILL_FAILED', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
