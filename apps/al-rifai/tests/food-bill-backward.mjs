// Food Bill → backward Program search → Release Date (Owner finishing task).
// Eight essential cases, using the existing roster/applier semantics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignReleases} from '../lib/release-parser.ts';
import {analyseReleaseBundle} from '../lib/release-evidence.ts';
import {backwardSearch, extractFoodBillHint, foodBillAmountBdt} from '../lib/food-bill-match.ts';
import {backwardSearchEnabled, persistBackwardMatches} from '../lib/release-scan.ts';

const P1 = '01700000001';
const P2 = '01700000002';
const P3 = '01700000003';

const program = (over) => ({
  id: 'prog-750', escortPhone: P1, escortName: 'Md. Karim', lighterVessel: 'Fardin-7',
  motherVessel: 'Union-Odyssey', masterMobile: '01700000009',
  startDate: '2026-01-10', endDate: null, ...over,
});

const ROSTER = [
  program(),
  program({id: 'prog-09', escortPhone: P2, escortName: 'Other Escort', lighterVessel: 'Othoi-1', masterMobile: '01700000008', startDate: '2026-01-09'}),
  program({id: 'prog-11', escortPhone: P3, escortName: 'Third Escort', lighterVessel: 'Mansib-1', masterMobile: '01700000007', startDate: '2026-01-11'}),
];
const CLOSED = program({id: 'prog-closed', startDate: '2026-01-10', endDate: '2026-01-14'});

const hint = (over = {}) => ({
  messageId: 'MSG-750', messageDate: '2026-01-15', amountBdt: 750, estimatedDays: 5,
  estimatedStart: '2026-01-10', shift: 'D', escortMobile: null, escortName: null,
  lighterVessel: null, motherVessel: null, masterMobile: null, explicitReleaseDate: null, ...over,
});

// ── 1 ────────────────────────────────────────────────────────────────────────
test('1. BDT 750 on 15 January finds the Program that started on 10 January', () => {
  // The existing phone-based matcher already performs this backward search.
  const payment = {
    escortPhone: P1, escortName: 'Md. Karim', amountBdt: 750, conveyance: null,
    endDate: '2026-01-15', endShift: 'D', dutyDays: 5, calcStart: '2026-01-10', line: '',
  };
  const [assignment] = assignReleases([payment], ROSTER);
  assert.equal(assignment.status, 'MATCHED');
  assert.equal(assignment.programId, 'prog-750');
  assert.equal(assignment.matchPass, 1);
  assert.equal(assignment.startDeltaDays, 0);

  // The backward-search path finds the same Program from a phone-less hint.
  const match = backwardSearch(hint({escortMobile: P1}), ROSTER);
  assert.equal(match.status, 'MATCHED');
  assert.equal(match.programId, 'prog-750');
  assert.equal(match.startDeltaDays, 0);
  assert.equal(match.confidence, 'medium'); // never high, so never auto-applied

  // Nearby programs on 9 and 11 January are in the window but belong to others.
  assert.deepEqual(match.signals, ['ESCORT_MOBILE']);
});

test('1b. the window is a hint: a Program two days away still matches', () => {
  const match = backwardSearch(hint({escortMobile: P1}), [
    program({id: 'prog-08', startDate: '2026-01-08'}),
  ]);
  assert.equal(match.status, 'MATCHED');
  assert.equal(match.programId, 'prog-08');
  assert.equal(match.startDeltaDays, -2);

  const outside = backwardSearch(hint({escortMobile: P1}), [
    program({id: 'prog-05', startDate: '2026-01-05'}),
  ]);
  assert.equal(outside.status, 'NO_MATCH');
});

test('1c. an already released Program is never a candidate', () => {
  const match = backwardSearch(hint({escortMobile: P1}), [CLOSED]);
  assert.equal(match.status, 'NO_MATCH');
});

// ── 2 ────────────────────────────────────────────────────────────────────────
test('2. one or two reliable signals identify a unique Program', () => {
  const byPhone = backwardSearch(hint({escortMobile: P1}), ROSTER);
  assert.equal(byPhone.status, 'MATCHED');

  const byNameAndLighter = backwardSearch(hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7'}), ROSTER);
  assert.equal(byNameAndLighter.status, 'MATCHED');
  assert.equal(byNameAndLighter.programId, 'prog-750');
  assert.deepEqual([...byNameAndLighter.signals].sort(), ['ESCORT_NAME', 'LIGHTER_VESSEL']);

  const byMaster = backwardSearch(hint({masterMobile: '01700000009'}), ROSTER);
  assert.equal(byMaster.status, 'MATCHED');
  assert.equal(byMaster.programId, 'prog-750');

  // A name alone is not enough when it is not corroborated.
  const nameOnly = backwardSearch(hint({escortName: 'Md. Karim'}), ROSTER);
  assert.equal(nameOnly.status, 'NO_MATCH');
  assert.ok(nameOnly.reasons.includes('NO_SIGNAL_IN_WINDOW'));
});

// ── 3 ────────────────────────────────────────────────────────────────────────
const fakeClient = () => {
  const keys = new Set();
  const inserts = [];
  return {
    inserts,
    async query(sql, values) {
      if (!/INSERT INTO public\.release_candidates/.test(sql)) return {rows: []};
      const key = [values[11], values[0], values[3], values[5]].join('|');
      inserts.push({key, values, sql: sql.replace(/\s+/g, ' ').trim()});
      if (keys.has(key)) return {rows: [], rowCount: 0};
      keys.add(key);
      return {rows: [], rowCount: 1};
    },
  };
};

test('3. the matched Program receives the Food Bill release date', async () => {
  const client = fakeClient();
  const match = backwardSearch(hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7'}), ROSTER);
  const result = await persistBackwardMatches(client, [{hint: hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7'}), match}], {enabled: true});
  assert.equal(result.inserted, 1);

  const {values, sql} = client.inserts[0];
  assert.equal(values[2], 'prog-750');            // program_id
  assert.equal(values[3], '2026-01-15');          // release date = food bill event date
  assert.equal(values[4], 'D');                   // shift from the message clock
  assert.equal(values[5], 750);                   // amount preserved
  assert.equal(values[6], 5);                     // estimated days
  assert.equal(values[7], '2026-01-10');          // estimated start
  // conveyance is a literal NULL in the SQL: the backward path never invents one
  assert.match(sql, /calc_start, conveyance, match_status/);
  assert.equal(values[8], 'MATCHED');
  assert.equal(values[9], 'medium');
  assert.match(sql, /ON CONFLICT DO NOTHING/);
});

test('3b. an explicit stated release date wins over the message date', async () => {
  const client = fakeClient();
  const h = hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7', explicitReleaseDate: '2026-01-14'});
  await persistBackwardMatches(client, [{hint: h, match: backwardSearch(h, ROSTER)}], {enabled: true});
  assert.equal(client.inserts[0].values[3], '2026-01-14');
});

// ── 4 ────────────────────────────────────────────────────────────────────────
test('4. the same message never creates or applies a second candidate', async () => {
  const client = fakeClient();
  const h = hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7'});
  const batch = [{hint: h, match: backwardSearch(h, ROSTER)}];
  assert.equal((await persistBackwardMatches(client, batch, {enabled: true})).inserted, 1);
  assert.equal((await persistBackwardMatches(client, batch, {enabled: true})).inserted, 0);
  assert.equal(client.inserts.length, 2, 'the second attempt reached the database but was a no-op');
});

test('4b. the path is off unless explicitly enabled', async () => {
  assert.equal(backwardSearchEnabled({}), false);
  assert.equal(backwardSearchEnabled({ALRIFAI_RELEASE_FOOD_BILL_SEARCH: '1'}), true);
  assert.equal(backwardSearchEnabled({ALRIFAI_RELEASE_FOOD_BILL_SEARCH: 'on'}), true);
  const client = fakeClient();
  const result = await persistBackwardMatches(client, [{hint: hint({escortMobile: P1}), match: backwardSearch(hint({escortMobile: P1}), ROSTER)}], {enabled: false});
  assert.deepEqual(result, {inserted: 0, blocked: 0, skipped: true});
  assert.equal(client.inserts.length, 0);
});

// ── 5 ────────────────────────────────────────────────────────────────────────
test('5. a missing conveyance never blocks the release', async () => {
  const client = fakeClient();
  const h = hint({escortName: 'Md. Karim', lighterVessel: 'Fardin-7'});
  const result = await persistBackwardMatches(client, [{hint: h, match: backwardSearch(h, ROSTER)}], {enabled: true});
  assert.equal(result.inserted, 1);
  // conveyance stays empty (literal NULL) and the candidate is still MATCHED
  assert.match(client.inserts[0].sql, /calc_start, conveyance, match_status/);
  assert.equal(client.inserts[0].values[8], 'MATCHED');
});

// ── 6 ────────────────────────────────────────────────────────────────────────
test('6. available conveyance is attached and still does not block the release', () => {
  // The phone-bearing path attaches conveyance through the evidence bundle.
  const text = [`ID: ${P1} Md. Karim ${P2}(B) 750/- food bill`, 'গাড়ি ভাড়া 500/-'].join('\n');
  const [bundle] = analyseReleaseBundle(
    [{text, timestamp: '2026-01-15T09:00:00Z', messageId: 'MSG-C'}],
    {status: 'MATCHED', programId: 'prog-750', confidence: 'high', lighterVessel: 'Fardin-7', programStartDate: '2026-01-10'},
  );
  assert.equal(bundle.additionalAmount, 500);
  assert.equal(bundle.conveyanceStatus, 'VERIFIED');
  assert.equal(bundle.conveyanceMonth, '2026-01');
  assert.equal(bundle.classification, 'VERIFIED_CONVEYANCE');
  assert.equal(bundle.releaseEligible, true);
  assert.equal(bundle.cashPosting, false);
});

// ── 7 ────────────────────────────────────────────────────────────────────────
test('7. equally plausible Programs stay for manual review', async () => {
  const twinA = program({id: 'twin-a', escortPhone: '01700000021'});
  const twinB = program({id: 'twin-b', escortPhone: '01700000022'});
  const h = hint({lighterVessel: 'Fardin-7', motherVessel: 'Union-Odyssey'});
  const match = backwardSearch(h, [twinA, twinB]);
  assert.equal(match.status, 'PENDING_REVIEW');
  assert.equal(match.programId, null);
  assert.deepEqual([...match.candidateIds].sort(), ['twin-a', 'twin-b']);
  assert.ok(match.reasons.includes('MULTIPLE_EQUAL_CANDIDATES'));

  const client = fakeClient();
  await persistBackwardMatches(client, [{hint: h, match}], {enabled: true});
  assert.equal(client.inserts[0].values[8], 'PENDING_REVIEW'); // never applied
  assert.equal(client.inserts[0].values[2], null);             // no Program invented
});

// ── 8 ────────────────────────────────────────────────────────────────────────
test('8. the new path cannot apply, post Cash or bypass the atomic gate', async () => {
  const source = readFileSync(new URL('../lib/food-bill-match.ts', import.meta.url), 'utf8');
  for (const forbidden of ['alrifai_vessel_program_release', 'apply_release_candidate', 'recalculate_program_pay', 'cash_', '/db/', 'INSERT', 'UPDATE ']) {
    assert.equal(source.includes(forbidden), false, `food-bill-match must not reference ${forbidden}`);
  }
  const scan = readFileSync(new URL('../lib/release-scan.ts', import.meta.url), 'utf8');
  const block = scan.slice(scan.indexOf('export async function persistBackwardMatches'));
  assert.equal(/apply_release_candidate|alrifai_vessel_program_release|recalculate_program_pay|cash_/.test(block), false);
  assert.match(block, /confidence/); // 'medium' only
});

// extraction: the existing parser keeps priority, amounts and Bengali digits work
test('extraction defers to the existing parser and reads the Owner example', () => {
  // A message with a mobile is the existing parser's responsibility.
  assert.equal(extractFoodBillHint(`ID: ${P1} Karim ${P2}(B) 750/- food bill`, '2026-01-15T09:00:00Z', 'M1'), null);

  const h = extractFoodBillHint('Taka 750 খাবার বিল', '2026-01-15T09:00:00Z', 'M2');
  assert.equal(h.amountBdt, 750);
  assert.equal(h.estimatedDays, 5);
  assert.equal(h.estimatedStart, '2026-01-10');
  assert.equal(h.messageDate, '2026-01-15');
  assert.equal(h.shift, 'D');

  // Bengali digits are read.
  assert.equal(foodBillAmountBdt('খাবার বিল ৭৫০ টাকা'), 750);
  assert.equal(extractFoodBillHint('Food bill 90', '2026-01-15T09:00:00Z', 'M3'), null); // below BDT 150
});
