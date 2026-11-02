// R1 backfill: parse the Escort Release Slip group into release_candidates.
//
// Uses the same scanner as the ingestion hook (lib/release-scan.ts), so a backfill
// and a live message can never be matched by different rules.
//
// Read-only against whatsapp_messages_original and programs; the only writes are
// INSERTs into release_candidates. programs is never updated (guardrail §12).
//
// Usage:
//   node --experimental-strip-types scripts/backfill-releases.ts [--dry-run]

import {createPool} from '../db/postgres.mjs';
import {scanReleaseGroup, persistRows, RELEASE_GROUP_JID} from '../lib/release-scan.ts';

const DRY_RUN = process.argv.includes('--dry-run');

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
    const scan = await scanReleaseGroup(client);
    const inserted = DRY_RUN ? 0 : await persistRows(client, scan.rows);

    // Source verification: every candidate must come from the release group.
    const ids = [...new Set(scan.rows.map((r) => r.msgId).filter(Boolean))];
    let foreign = 0;
    if (ids.length) {
      const check = await client.query<{n: string}>(
        `SELECT count(*)::text AS n FROM public.whatsapp_messages_original
          WHERE coalesce(message_id, id::text) = ANY($1::text[]) AND chat_jid <> $2`,
        [ids, RELEASE_GROUP_JID],
      );
      foreign = Number(check.rows[0]?.n ?? 0);
    }

    const rows = scan.rows;
    const matched = rows.filter((r) => r.assignment.status === 'MATCHED');
    const mismatched = rows.filter((r) => r.assignment.status === 'ROSTER_MISMATCH');
    const byStatus = tally(rows, (r) => r.assignment.status);

    console.log(`\n=== RELEASE PARSER BACKFILL (${DRY_RUN ? 'DRY RUN' : 'APPLIED'}) ===`);
    console.log(foreign === 0
      ? `source verified: all ${ids.length} source messages from ${RELEASE_GROUP_JID}`
      : `source WARNING: ${foreign} messages from another group`);
    console.log(`messages processed ${scan.messages}`);
    console.log(`  with phone       ${scan.withPhone}`);
    console.log(`  no phone         ${scan.phoneLess} (not inserted, per owner)`);
    console.log(`payment lines     ${scan.payments}`);
    if (!DRY_RUN) console.log(`rows inserted     ${inserted} (existing rows untouched)`);
    for (const s of ['MATCHED', 'ROSTER_MISMATCH', 'PENDING_REVIEW', 'NO_PAYMENT']) {
      console.log(`  ${s.padEnd(18)} ${byStatus.get(s) ?? 0}`);
    }

    const stepA = matched.filter((r) => r.assignment.matchPass === 1).length;
    const stepCWindow = matched.filter((r) => r.assignment.matchPass === 2).length;
    const stepCOther = matched.filter((r) => r.assignment.matchPass === 3).length;
    const stepD = matched.filter((r) => r.assignment.confidence === 'medium').length;
    console.log(`\nMATCHED by step   A:${stepA}  C-window:${stepCWindow}  C-other:${stepCOther}  D-orphan:${stepD}`);
    console.log(`distinct programs covered: ${new Set(matched.map((r) => r.assignment.programId)).size}`);

    const shift = tally(matched, (r) => r.assignment.endShift ?? '?');
    console.log(`end shift         D:${shift.get('D') ?? 0}  N:${shift.get('N') ?? 0}`);
    const duty = tally(matched.filter((r) => r.assignment.dutyDays !== null), (r) => String(r.assignment.dutyDays));
    console.log(`duty days         ${[...duty.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, n]) => `${d}d:${n}`).join('  ')}`);

    const byKind = tally(mismatched, (r) => String(r.assignment.mismatchKind ?? 'UNCLASSIFIED'));
    console.log('\nROSTER_MISMATCH by kind');
    for (const k of ['NO_ROSTER_PHONE', 'NEW_DUTY_AFTER_RELEASE', 'BEFORE_PROGRAM', 'OUTSIDE_TOLERANCE', 'AMBIGUOUS']) {
      console.log(`  ${k.padEnd(24)} ${byKind.get(k) ?? 0}`);
    }

    console.log(`\n--- Step D lump-sum matches (${stepD}) ---`);
    for (const r of matched.filter((x) => x.assignment.confidence === 'medium')) {
      const a = r.assignment;
      console.log(`  ${a.escortPhone} ${a.escortName ?? ''} | ${a.endDate} | ${a.amountBdt} | ${a.dutyDays}d | calc ${a.calcStart} | program start ${a.nearestStartDate} | ${a.note ?? ''}`);
    }

    console.log('\n--- Korban Ali ---');
    for (const r of rows.filter((x) => (x.assignment.escortName ?? '').toLowerCase().includes('korban'))) {
      const a = r.assignment;
      console.log(`  ${a.endDate} ${a.amountBdt} ${a.dutyDays}d calc ${a.calcStart} -> ${a.status}${a.confidence === 'medium' ? ' (Step D)' : a.matchPass === 1 ? ' (Step A)' : ''}${a.mismatchKind ? ' ' + a.mismatchKind : ''}`);
    }

    console.log('\n--- NEW DUTY after a release (possible missing programs) ---');
    for (const r of mismatched.filter((x) => x.assignment.mismatchKind === 'NEW_DUTY_AFTER_RELEASE')) {
      const a = r.assignment;
      console.log(`  ${a.escortPhone} | ${a.endDate} | ${a.amountBdt} | ${a.dutyDays} | ${a.calcStart} | ${a.note ?? ''}`);
    }

    console.log('\n--- 5 MATCHED ---');
    for (const r of matched.slice(0, 5)) {
      const a = r.assignment;
      console.log(`  ${a.escortPhone} ${a.endDate}(${a.endShift}) food ${a.amountBdt} ${a.dutyDays}d calc ${a.calcStart} -> ${a.nearestStartDate} | ${r.msgText.split('\n')[0].slice(0, 80)}`);
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
