// R1 backfill: parse the Escort Release Slip group into release_candidates.
//
// Read-only against the mirror (whatsapp_messages_original) and against programs.
// The only writes are INSERTs into release_candidates. programs is never updated,
// which is the §12 guardrail and also the reason this can be re-run safely.
//
// Matching is three-pass (lib/release-parser.assignReleases):
//   pass 1  calc_start within ±2 of a program start  (primary signal)
//   pass 2  same-day partial payment for an escort already matched that day
//   pass 3  duty-window attribution, only for leftovers
//
// Usage:
//   node --experimental-strip-types scripts/backfill-releases.ts
//   node --experimental-strip-types scripts/backfill-releases.ts --dry-run
//
// Environment: PGHOST / PGDATABASE / PGUSER / PGPASSWORD_FILE (see db/postgres.mjs).

import {createPool} from '../db/postgres.mjs';
import {parseMessage, assignReleases, type RosterProgram, type Payment, type Assignment} from '../lib/release-parser.ts';

/** The only group this parser reads (§1). Verified from bridge-1 `chats`. */
const RELEASE_GROUP_JID = '120363408741101070@g.us';
const ACCOUNT = 'wa-01';
const DRY_RUN = process.argv.includes('--dry-run');

type MessageRow = { id: string; timestamp: string; text: string | null };
type Row = { payment: Payment; assignment: Assignment; msgId: string; msgAt: string; msgText: string };

function tally<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

async function main() {
  const pool = createPool({readOnly: false});
  const client = await pool.connect();
  try {
    const rosterRows = await client.query<{id: string; escortPhone: string | null; escortName: string | null; startDate: string; endDate: string | null}>(
      `SELECT id,
              "escortMobile" AS "escortPhone",
              "escortName"   AS "escortName",
              "startDate"    AS "startDate",
              nullif(btrim("endDate"), '') AS "endDate"
         FROM public.programs
        WHERE dataset_epoch = 'CANONICAL_BACKFILL_20261026'`,
    );
    const roster: RosterProgram[] = rosterRows.rows.map((r) => ({
      id: r.id,
      escortPhone: r.escortPhone,
      escortName: r.escortName,
      startDate: String(r.startDate ?? '').slice(0, 10),
      endDate: r.endDate ? String(r.endDate).slice(0, 10) : null,
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
    let withPhone = 0;
    const payments: Payment[] = [];
    // Parallel to `payments`: assignReleases returns copies, so correlate by index.
    const meta: Array<{msgId: string; msgAt: string; msgText: string}> = [];
    const phoneLess: string[] = [];

    for (const msg of msgRows.rows) {
      messages += 1;
      const body = msg.text ?? '';
      const hasPhone = /(?<![\d@])(?:\+?88)?0?1[3-9]\d(?:[\s-]?\d){7}(?!\d)/.test(body);
      if (hasPhone) withPhone += 1;

      const parsed = parseMessage(body, msg.timestamp);
      if (!parsed.length) {
        if (!hasPhone) phoneLess.push(msg.id);
        continue;
      }
      for (const payment of parsed) {
        payments.push(payment);
        meta.push({msgId: msg.id, msgAt: msg.timestamp, msgText: body});
      }
    }

    const assignments = assignReleases(payments, roster);
    const rows: Row[] = assignments.map((assignment, i) => ({
      payment: payments[i],
      assignment,
      ...(meta[i] ?? {msgId: '', msgAt: '', msgText: ''}),
    }));

    if (!DRY_RUN) {
      for (const row of rows) {
        const a = row.assignment;
        await client.query(
          `INSERT INTO public.release_candidates
             (escort_phone, escort_name, program_id, end_date, end_shift,
              amount_bdt, duty_days, calc_start, conveyance, match_status,
              match_pass, mismatch_kind, notes, source_msg_id, source_date, source_text)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT DO NOTHING`,
          [
            a.escortPhone, a.escortName, a.programId, a.endDate, a.endShift,
            a.amountBdt, a.dutyDays, a.calcStart, a.conveyance, a.status,
            a.matchPass, a.mismatchKind, a.note, row.msgId, row.msgAt, row.msgText.slice(0, 4000),
          ],
        );
      }
    }

    // ---- data source verification (§ before re-run) ----
    const ids = [...new Set(rows.map((r) => r.msgId).filter(Boolean))];
    let foreign = 0;
    if (ids.length) {
      const check = await client.query<{n: string}>(
        `SELECT count(*)::text AS n FROM public.whatsapp_messages_original
          WHERE coalesce(message_id, id::text) = ANY($1::text[]) AND chat_jid <> $2`,
        [ids, RELEASE_GROUP_JID],
      );
      foreign = Number(check.rows[0]?.n ?? 0);
    }
    console.log(foreign === 0
      ? `source verified: all ${ids.length} source messages come from the Release Slip group ${RELEASE_GROUP_JID}`
      : `source WARNING: ${foreign} source messages come from a different group`);

    // ---------------- report ----------------
    const byStatus = tally(rows, (r) => r.assignment.status);
    const matched = rows.filter((r) => r.assignment.status === 'MATCHED');
    const mismatched = rows.filter((r) => r.assignment.status === 'ROSTER_MISMATCH');
    const ambiguous = rows.filter((r) => r.assignment.status === 'PENDING_REVIEW');
    const byPass = tally(matched, (r) => String(r.assignment.matchPass ?? '?'));

    console.log(`\n=== RELEASE PARSER BACKFILL (${DRY_RUN ? 'DRY RUN' : 'APPLIED'}) — three-pass ===`);
    console.log(`group                  ${RELEASE_GROUP_JID}`);
    console.log(`messages processed     ${messages}`);
    console.log(`  with a phone number  ${withPhone}`);
    console.log(`  no phone at all      ${phoneLess.length}  (not inserted, per owner)`);
    console.log(`payment lines parsed   ${payments.length}`);
    for (const s of ['MATCHED', 'ROSTER_MISMATCH', 'PENDING_REVIEW', 'NO_PAYMENT']) {
      console.log(`  ${s.padEnd(18)} ${byStatus.get(s) ?? 0}`);
    }
    console.log(`\nMATCHED by pass        pass1:${byPass.get('1') ?? 0}  pass2:${byPass.get('2') ?? 0}  pass3:${byPass.get('3') ?? 0}`);

    const covered = new Set(matched.map((r) => r.assignment.programId));
    console.log(`distinct programs covered: ${covered.size} of ${roster.length}`);
    const duty = tally(matched.filter((r) => r.assignment.dutyDays !== null), (r) => String(r.assignment.dutyDays));
    console.log(`duty days (MATCHED)    ${[...duty.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, n]) => `${d}d:${n}`).join('  ')}`);
    const shift = tally(matched, (r) => r.assignment.endShift ?? '?');
    console.log(`end shift (MATCHED)    D:${shift.get('D') ?? 0}  N:${shift.get('N') ?? 0}`);

    console.log('\n--- 5 MATCHED ---');
    for (const r of matched.slice(0, 5)) {
      const a = r.assignment;
      console.log(`  [p${a.matchPass}] ${a.escortPhone}  ${a.endDate}(${a.endShift})  food ${a.amountBdt}  ${a.dutyDays}d  calc_start ${a.calcStart}  program start ${a.nearestStartDate ?? '—'} (Δ${a.startDeltaDays ?? '—'})`);
      console.log(`        ${r.msgText.split('\n')[0].slice(0, 110)}`);
      if (a.note) console.log(`        note: ${a.note}`);
    }

    console.log('\n--- 5 ROSTER_MISMATCH ---');
    for (const r of mismatched.slice(0, 5)) {
      const a = r.assignment;
      console.log(`  ${a.escortPhone}  ${a.endDate}(${a.endShift})  food ${a.amountBdt}  ${a.dutyDays}d  calc_start ${a.calcStart}  nearest start ${a.nearestStartDate ?? '—'} (Δ${a.startDeltaDays ?? '—'})`);
      console.log(`        ${r.msgText.split('\n')[0].slice(0, 110)}`);
    }

    if (ambiguous.length) {
      console.log('\n--- PENDING_REVIEW ---');
      for (const r of ambiguous.slice(0, 5)) {
        const a = r.assignment;
        console.log(`  ${a.escortPhone}  ${a.endDate}  calc_start ${a.calcStart}  ${a.note ?? ''}`);
      }
    }

    const byKind = tally(mismatched, (r) => String(r.assignment.mismatchKind ?? 'UNCLASSIFIED'));
    console.log('\nROSTER_MISMATCH by kind');
    for (const k of ['NO_ROSTER_PHONE', 'NEW_DUTY_AFTER_RELEASE', 'BEFORE_PROGRAM', 'OUTSIDE_TOLERANCE', 'AMBIGUOUS']) {
      console.log(`  ${k.padEnd(24)} ${byKind.get(k) ?? 0}`);
    }

    const newDuty = mismatched.filter((r) => r.assignment.mismatchKind === 'NEW_DUTY_AFTER_RELEASE');
    console.log(`\n--- NEW DUTY after a release (possible missing programs): ${newDuty.length} ---`);
    console.log('  Escort | Payment Date | Amount | Days | Calc Start | Previous Release');
    for (const r of newDuty) {
      const a = r.assignment;
      const prev = a.note?.match(/new duty after (\d{4}-\d{2}-\d{2})/)?.[1] ?? '—';
      console.log(`  ${a.escortPhone} | ${a.endDate} | ${a.amountBdt ?? '—'} | ${a.dutyDays ?? '—'} | ${a.calcStart ?? '—'} | ${prev}`);
    }

    console.log('\n--- the four dual-date escorts ---');
    for (const name of ['Kofil', 'Korban', 'Robiul', 'Nazmul-Hasan']) {
      const rowsFor = rows.filter((r) => (r.assignment.escortName ?? '').toLowerCase().includes(name.toLowerCase()));
      if (!rowsFor.length) continue;
      console.log(`  ${name}:`);
      for (const r of rowsFor) {
        const a = r.assignment;
        console.log(`    ${a.endDate} food ${a.amountBdt ?? '—'} ${a.dutyDays ?? '—'}d calc ${a.calcStart ?? '—'} -> ${a.status}${a.matchPass ? ` p${a.matchPass}` : ''}${a.mismatchKind ? ` ${a.mismatchKind}` : ''}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('BACKFILL_FAILED', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
