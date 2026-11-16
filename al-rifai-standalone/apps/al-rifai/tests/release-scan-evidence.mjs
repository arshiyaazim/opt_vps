// Integration test for the evidence writer in lib/release-scan.ts.
//
// Uses a fake Queryable, so it proves the SQL contract without a database:
//   * deploy safety (schema absent → nothing written),
//   * the evidence UPDATE keyed by the candidate's own dedupe identity,
//   * the conveyance event amount in paisa and its verified flag,
//   * idempotency (deterministic id + ON CONFLICT DO NOTHING),
//   * failure propagation so the worker retries,
//   * no apply / pay / Cash call inside the writer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {detectEvidenceCapability, persistEvidence, RELEASE_EVIDENCE_COLUMNS} from '../lib/release-scan.ts';

const M1 = '01700000001';
const M2 = '01700000002';

const row = (text, overrides = {}) => ({
  assignment: {
    escortPhone: M1,
    endDate: '2026-01-28',
    endShift: 'D',
    amountBdt: 900,
    dutyDays: 6,
    calcStart: '2026-01-22',
    conveyance: null,
    status: 'MATCHED',
    programId: 'prog-1',
    confidence: 'high',
    ...overrides,
  },
  msgId: 'MSG-R1',
  msgAt: '2026-01-28T09:00:00Z',
  msgText: text,
  roster: {lighterVessel: 'Fardin-7', startDate: '2026-01-01'},
});

function fakeClient({columns = true, events = true, failOn = null, rowCount = 1} = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({sql: sql.replace(/\s+/g, ' ').trim(), values});
      if (/information_schema\.columns/.test(sql)) {
        return {rows: [{cols: columns ? RELEASE_EVIDENCE_COLUMNS.length : RELEASE_EVIDENCE_COLUMNS.length - 1, events}]};
      }
      if (/UPDATE public\.release_candidates/.test(sql)) {
        if (failOn === 'update') throw new Error('SIMULATED_DB_FAILURE');
        return {rows: [], rowCount};
      }
      if (/INSERT INTO public\.vessel_conveyance_event/.test(sql)) {
        if (failOn === 'event') throw new Error('SIMULATED_DB_FAILURE');
        return {rows: [], rowCount};
      }
      return {rows: []};
    },
  };
}

test('schema absent: the writer does nothing and never blocks persistence', async () => {
  const client = fakeClient({columns: false, events: false});
  const result = await persistEvidence(client, [row(`ID: ${M1} Name ${M2}(B) 900/- food bill`)]);
  assert.deepEqual(result, {updated: 0, events: 0, skipped: true});
  assert.equal(client.calls.length, 1); // only the capability probe
  assert.match(client.calls[0].sql, /information_schema\.columns/);
});

test('capability probe requires every evidence column and the event table', async () => {
  assert.deepEqual(await detectEvidenceCapability(fakeClient({columns: true, events: true})), {columns: true, events: true});
  assert.deepEqual(await detectEvidenceCapability(fakeClient({columns: false, events: true})), {columns: false, events: true});
  assert.deepEqual(await detectEvidenceCapability(fakeClient({columns: true, events: false})), {columns: true, events: false});
});

test('evidence is written by the candidate dedupe key, not by a new identity', async () => {
  const client = fakeClient();
  const result = await persistEvidence(client, [row(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`)]);
  assert.equal(result.updated, 1);
  assert.equal(result.skipped, false);

  const update = client.calls.find((call) => /UPDATE public\.release_candidates/.test(call.sql));
  assert.ok(update, 'expected an UPDATE');
  assert.match(update.sql, /WHERE source_msg_id = \$20/);
  assert.match(update.sql, /escort_phone = \$21/);
  assert.match(update.sql, /end_date = \$22::date/);
  assert.match(update.sql, /coalesce\(amount_bdt, -1\) = coalesce\(\$23, -1\)/);

  const v = update.values;
  assert.equal(v[0], 'COMPLETE');            // release resolved, no conveyance pending
  assert.equal(v[1], 'FOOD_BILL_EVENT');     // release date source
  assert.equal(v[4], '2026-01-28');          // food bill date
  assert.equal(v[5], 900);                   // food bill amount
  assert.equal(v[7], null);                  // no additional amount
  assert.equal(v[10], 'NONE');               // conveyance status
  assert.equal(v[14], 'ID_LABEL');           // identity source
  assert.equal(v[15], false);                // sukani not mentioned
  assert.deepEqual(JSON.parse(v[16]), ['MSG-R1']);
  assert.deepEqual(JSON.parse(v[17]), []);
  assert.ok(JSON.parse(v[18]).includes('R-FOOD-BILL-RELEASE-DATE'));
  assert.equal(v[19], 'MSG-R1');
  assert.equal(v[20], M1);
  assert.equal(v[21], '2026-01-28');
  assert.equal(v[22], 900);
});

test('a stated day-count mismatch is stored as an audit flag, not a review reason', async () => {
  const client = fakeClient();
  await persistEvidence(client, [row(`ID: ${M1} Name ${M2}(B) 900/- food bill 10-day`)]);
  const update = client.calls.find((call) => /UPDATE public\.release_candidates/.test(call.sql));
  assert.ok(JSON.parse(update.values[18]).includes('DAY_COUNT_MISMATCH'));
  assert.deepEqual(JSON.parse(update.values[17]), []); // no review reason
});

test('a verified conveyance writes one event, amount in paisa', async () => {
  const client = fakeClient();
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, 'গাড়ি ভাড়া 400/-'].join('\n');
  const result = await persistEvidence(client, [row(text, {amountBdt: 900})]);
  assert.equal(result.events, 1);

  const insert = client.calls.find((call) => /INSERT INTO public\.vessel_conveyance_event/.test(call.sql));
  assert.ok(insert, 'expected an event insert');
  assert.match(insert.sql, /ON CONFLICT DO NOTHING/);
  const v = insert.values;
  assert.match(v[0], /^ce-[a-f0-9]{40}$/);   // deterministic id
  assert.equal(v[2], '2026-01-28');          // travel date (same-day established)
  assert.equal(v[3], 40000);                 // BDT 400 → paisa
  assert.equal(v[4], true);                  // verified
  assert.equal(JSON.parse(v[6]).cashPosting, false);
});

test('an unresolved conveyance is stored unverified with no date', async () => {
  const client = fakeClient();
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, `${M1} 500/- গাড়ি ভাড়া টাকা যাবে`].join('\n');
  const result = await persistEvidence(client, [row(text)]);
  assert.equal(result.events, 1);
  const insert = client.calls.find((call) => /INSERT INTO public\.vessel_conveyance_event/.test(call.sql));
  assert.equal(insert.values[2], null);      // no travel date
  assert.equal(insert.values[3], 50000);     // amount preserved
  assert.equal(insert.values[4], false);     // never verified
  const update = client.calls.find((call) => /UPDATE public\.release_candidates/.test(call.sql));
  assert.equal(update.values[0], 'UNRESOLVED_CONVEYANCE');
});

test('the event id is stable, so a rescan cannot create a second row', async () => {
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, 'গাড়ি ভাড়া 400/-'].join('\n');
  const first = fakeClient();
  const second = fakeClient();
  await persistEvidence(first, [row(text)]);
  await persistEvidence(second, [row(text)]);
  const idOf = (client) => client.calls.find((call) => /INSERT INTO public\.vessel_conveyance_event/.test(call.sql)).values[0];
  assert.equal(idOf(first), idOf(second));
});

test('a database failure propagates so the ingestion worker can retry', async () => {
  await assert.rejects(
    () => persistEvidence(fakeClient({failOn: 'update'}), [row(`ID: ${M1} Name ${M2}(B) 900/- food bill`)]),
    /SIMULATED_DB_FAILURE/,
  );
});

test('the writer never applies a release, touches pay or writes Cash', async () => {
  const client = fakeClient();
  await persistEvidence(client, [row(`ID: ${M1} Name ${M2}(B) 900/- food bill\nগাড়ি ভাড়া 400/-`)]);
  const sql = client.calls.map((call) => call.sql).join('\n');
  for (const forbidden of ['alrifai_vessel_program_release', 'recalculate_program_pay', 'cash_', 'cash_postings', 'cash_instructions', 'programs SET']) {
    assert.equal(sql.includes(forbidden), false, `writer must not touch ${forbidden}`);
  }
});
