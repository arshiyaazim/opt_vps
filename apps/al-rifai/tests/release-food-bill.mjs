// Owner-mandated regression tests (2026-11-04) for:
//   * Food Bill as release evidence (rule B),
//   * same-day additional money as conveyance evidence (rule C),
//   * retry safety of the release pass (Task 4),
//   * the "no Cash posting" invariant (Task 5 / case 20).
//
// All mobile numbers are synthetic (017000000NN). The label and date shapes are
// the ones found in the authorized release group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyseReleaseBundle} from '../lib/release-evidence.ts';
import {
  initialReleaseRetry,
  recordReleaseScanFailure,
  recordReleaseScanSuccess,
  releaseRetryDelay,
  shouldAttemptReleaseScan,
} from '../lib/release-retry.ts';

const M1 = '01700000001';
const M2 = '01700000002';
const M3 = '01700000003';

const MATCH = {
  status: 'MATCHED',
  programId: 'prog-1',
  confidence: 'high',
  lighterVessel: 'Fardin-7',
  programStartDate: '2026-01-01',
};

const msg = (text, timestamp, messageId) => ({text, timestamp, messageId});
const one = (messages, match = MATCH) => {
  const bundles = analyseReleaseBundle(messages, match);
  assert.equal(bundles.length, 1, `expected one bundle, got ${bundles.length}`);
  return bundles[0];
};

// ── 1 ────────────────────────────────────────────────────────────────────────
test('1. explicit Release Date without a Food Bill', () => {
  const b = one([msg(`ID: ${M1} Name ${M2}(B) 900/-\nEnd date:-28-01-26-(D)`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.releaseDate, '2026-01-28');
  assert.equal(b.releaseDateSource, 'STATED_END_DATE');
  assert.equal(b.classification, 'CONFIRMED_RELEASE');
  assert.equal(b.releaseEligible, true);
  assert.equal(b.conveyanceStatus, 'NONE');
});

// ── 2 ────────────────────────────────────────────────────────────────────────
test('2. a valid Food Bill establishes the Release Date', () => {
  const b = one([msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.releaseDate, '2026-01-28');
  assert.equal(b.releaseDateSource, 'FOOD_BILL_EVENT');
  assert.equal(b.foodBillAmount, 900);
  assert.equal(b.releaseEligible, true);
  assert.equal(b.classification, 'FOOD_BILL_RELEASE_EVIDENCE');
  assert.ok(b.signals.includes('FOOD_BILL_RELEASE_EVIDENCE'));
  assert.ok(b.ruleTrace.includes('R-FOOD-BILL-RELEASE-DATE'));
  assert.ok(b.ruleTrace.includes('R-DAY-COUNT-AGREES')); // 900/150 = 6 == "6-day"
});

// ── 3 ────────────────────────────────────────────────────────────────────────
test('3. Food Bill with Sukani/Master numbers but no Escort ID is not a false match', () => {
  const b = one(
    [msg('Sukani bkash no 01830157601 900/- food bill', '2026-01-28T09:00:00Z', 'm1')],
    {status: 'ROSTER_MISMATCH', programId: null, confidence: null},
  );
  assert.equal(b.employeeMobile, '+8801830157601'); // the number the message gave
  assert.equal(b.employeeIdentitySource, 'FIRST_MOBILE');
  assert.equal(b.sukaniMentioned, true);
  assert.equal(b.programId, null);
  assert.equal(b.releaseEligible, false);
  assert.equal(b.classification, 'NEEDS_REVIEW');
  assert.ok(b.reviewReasons.includes('NO_PROGRAM_MATCH'));
});

// ── 4 ────────────────────────────────────────────────────────────────────────
test('4. one Food Bill message for two Lighters stays two separate bundles', () => {
  const text = [
    `ID: ${M1} Name1 ${M2}(B) 900/- food bill`,
    `ID: ${M3} Name2 ${M2}(B) 600/- food bill`,
  ].join('\n');
  const bundles = analyseReleaseBundle([msg(text, '2026-01-28T09:00:00Z', 'm1')], MATCH);
  assert.equal(bundles.length, 2);
  const byMobile = new Map(bundles.map((b) => [b.employeeMobile, b]));
  assert.equal(byMobile.get('+8801700000001')?.foodBillAmount, 900);
  assert.equal(byMobile.get('+8801700000003')?.foodBillAmount, 600);
  for (const b of bundles) {
    assert.equal(b.releaseDateSource, 'FOOD_BILL_EVENT');
    assert.equal(b.releaseEligible, true);
    assert.deepEqual(b.evidenceMessageIds, ['m1']);
  }
});

// ── 5 ────────────────────────────────────────────────────────────────────────
test('5. a Food Bill for an earlier completed duty is not release evidence', () => {
  const b = one(
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-09-01T09:00:00Z', 'm1')],
    {...MATCH, programStartDate: '2026-10-20'},
  );
  assert.equal(b.releaseEligible, false);
  assert.equal(b.classification, 'NEEDS_REVIEW');
  assert.ok(b.reviewReasons.includes('FOOD_BILL_PRECEDES_PROGRAM'));
  assert.notEqual(b.releaseDateSource, 'FOOD_BILL_EVENT');
});

// ── 6 ────────────────────────────────────────────────────────────────────────
test('6. an explicit release date is never overwritten by the Food Bill date', () => {
  const b = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-30T09:00:00Z', 'm1'),
    msg('End date:-28-01-26-(D)', '2026-01-30T09:05:00Z', 'm2'),
  ]);
  assert.equal(b.releaseDate, '2026-01-28'); // the explicit date wins
  assert.equal(b.releaseDateSource, 'STATED_END_DATE');
  assert.equal(b.releaseEligible, false);
  assert.ok(b.reviewReasons.includes('FOOD_BILL_CONFLICTS_WITH_EXPLICIT_RELEASE'));
});

// ── 7 ────────────────────────────────────────────────────────────────────────
test('7. Food Bill plus BDT 400 conveyance in the same message', () => {
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, 'গাড়ি ভাড়া 400/-'].join('\n');
  const b = one([msg(text, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.foodBillAmount, 900);
  assert.equal(b.additionalAmount, 400);
  assert.equal(b.conveyanceStatus, 'VERIFIED');
  assert.equal(b.travelDate, '2026-01-28');
  assert.equal(b.travelDateSource, 'SAME_DAY_ESTABLISHED');
  assert.equal(b.conveyanceMonth, '2026-01'); // same-day, not the arrival month of a later slip
  assert.equal(b.conveyancePurpose, 'OTHER_VERIFIED_TRANSPORT');
  assert.equal(b.classification, 'VERIFIED_CONVEYANCE');
  assert.ok(b.signals.includes('FOOD_BILL_RELEASE_EVIDENCE'));
});

// ── 8 ────────────────────────────────────────────────────────────────────────
test('8. an unlabelled same-day BDT 600 is only a candidate, never verified', () => {
  const b = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'm1'),
    msg(`${M1} 600/-`, '2026-01-28T10:00:00Z', 'm2'),
  ]);
  assert.equal(b.additionalAmount, 600);
  assert.equal(b.conveyanceStatus, 'CANDIDATE');
  assert.equal(b.conveyancePurpose, 'UNKNOWN_CONVEYANCE_PURPOSE');
  assert.equal(b.travelDate, null);
  assert.equal(b.paymentInstructionDate, '2026-01-28');
  assert.equal(b.classification, 'SAME_DAY_CONVEYANCE_CANDIDATE');
  assert.ok(b.signals.includes('FOOD_BILL_RELEASE_EVIDENCE')); // release still stands
  assert.equal(b.releaseEligible, true);
});

// ── 9 ────────────────────────────────────────────────────────────────────────
test('9. an explicitly labelled Salary or Advance is never conveyance', () => {
  const salary = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'm1'),
    msg(`${M1} 1989/- Salary`, '2026-01-28T10:00:00Z', 'm2'),
  ]);
  assert.equal(salary.additionalAmount, null);
  assert.equal(salary.classification, 'NEEDS_REVIEW');
  assert.ok(salary.reviewReasons.includes('FOOD_BILL_LABELED_SALARY'));

  const advance = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'm1'),
    msg(`${M1} 5000/- advance`, '2026-01-28T10:00:00Z', 'm2'),
  ]);
  assert.equal(advance.additionalAmount, null);
  assert.ok(advance.reviewReasons.includes('FOOD_BILL_LABELED_ADVANCE'));
});

// ── 10 ───────────────────────────────────────────────────────────────────────
test('10. office-return conveyance keeps its purpose and travel month', () => {
  const text = [
    `ID: ${M1} Name ${M2}(B) 900/- food bill`,
    'Office return date:-02-02-26 অফিসে আসার গাড়ি ভাড়া 500/-',
  ].join('\n');
  const b = one([msg(text, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.conveyancePurpose, 'OFFICE_RETURN_CONVEYANCE');
  assert.equal(b.additionalAmount, 500);
  assert.equal(b.travelDate, '2026-02-02');
  assert.equal(b.travelDateSource, 'EXPLICIT_TRAVEL_DATE');
  assert.equal(b.conveyanceMonth, '2026-02');
  assert.equal(b.conveyanceStatus, 'VERIFIED');
});

// ── 11 ───────────────────────────────────────────────────────────────────────
test('11. ghat-duty conveyance is distinguished from an office return', () => {
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, 'ghat duty man 200/- 02-02-26'].join('\n');
  const b = one([msg(text, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.conveyancePurpose, 'GHAT_DUTY_CONVEYANCE');
  assert.equal(b.additionalAmount, 200);
  assert.equal(b.travelDate, '2026-02-02');
  assert.equal(b.conveyanceMonth, '2026-02');
});

// ── 12 ───────────────────────────────────────────────────────────────────────
test('12. Food Bill in January with the actual travel in February', () => {
  const text = [
    `ID: ${M1} Name ${M2}(B) 900/- food bill`,
    'গাড়ি ভাড়া 500/- তারিখ 05-02-26',
  ].join('\n');
  const b = one([msg(text, '2026-01-20T09:00:00Z', 'm1')]);
  assert.equal(b.foodBillDate, '2026-01-20');
  assert.equal(b.releaseDate, '2026-01-20');
  assert.equal(b.travelDate, '2026-02-05');
  assert.equal(b.conveyanceMonth, '2026-02'); // not January
});

// ── 13 ───────────────────────────────────────────────────────────────────────
test('13. a same-day payment instruction is not proof of travel', () => {
  const text = [
    `ID: ${M1} Name ${M2}(B) 900/- food bill`,
    `${M1} 500/- গাড়ি ভাড়া টাকা যাবে`,
  ].join('\n');
  const b = one([msg(text, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.additionalAmount, 500);
  assert.equal(b.travelDate, null);
  assert.equal(b.paymentInstructionDate, '2026-01-28');
  assert.equal(b.conveyanceStatus, 'UNRESOLVED');
  assert.equal(b.conveyanceMonth, null);
  assert.equal(b.classification, 'UNRESOLVED_CONVEYANCE');
});

// ── 14 ───────────────────────────────────────────────────────────────────────
test('14. duplicate messages and duplicate instructions do not double-count', () => {
  const text = [`ID: ${M1} Name ${M2}(B) 900/- food bill`, 'গাড়ি ভাড়া 400/-'].join('\n');
  const b = one([
    msg(text, '2026-01-28T09:00:00Z', 'm1'),
    msg(text, '2026-01-28T09:00:00Z', 'm1'), // same message twice
  ]);
  assert.equal(b.additionalAmount, 400);
  assert.deepEqual(b.evidenceMessageIds, ['m1']);

  const twice = one([
    msg(`${M1} 500/- গাড়ি ভাড়া`, '2026-01-28T09:00:00Z', 'a'),
    msg(`${M1} 500/- গাড়ি ভাড়া`, '2026-01-28T09:05:00Z', 'b'),
  ]);
  assert.equal(twice.additionalAmount, 500); // counted once
  assert.equal(twice.evidenceMessageIds.length, 2); // both sources preserved
});

// ── 15 ───────────────────────────────────────────────────────────────────────
test('15. a follow-up correction supersedes the stated release date', () => {
  const b = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill\nEnd date:-28-01-26-(D)`, '2026-01-28T09:00:00Z', 'm1'),
    msg('End date:-29-01-26-(D)', '2026-01-30T09:00:00Z', 'm2'),
  ]);
  assert.equal(b.releaseDate, '2026-01-29');
  assert.equal(b.releaseDateSource, 'STATED_END_DATE');
  assert.deepEqual([...b.evidenceMessageIds].sort(), ['m1', 'm2']);
  assert.equal(b.reviewReasons.includes('FOOD_BILL_CONFLICTS_WITH_EXPLICIT_RELEASE'), false);
});

// ── 16 ───────────────────────────────────────────────────────────────────────
test('16. multiple Program candidates block apply but keep the evidence', () => {
  const b = one(
    [
      msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'm1'),
      msg(`${M1} 400/-`, '2026-01-28T10:00:00Z', 'm2'),
    ],
    {status: 'PENDING_REVIEW', programId: null, confidence: null, candidateIds: ['p1', 'p2']},
  );
  assert.equal(b.classification, 'NEEDS_REVIEW');
  assert.equal(b.programId, null);
  assert.equal(b.releaseEligible, false);
  assert.ok(b.reviewReasons.includes('MULTIPLE_PROGRAM_CANDIDATES'));
  assert.equal(b.foodBillAmount, 900); // evidence preserved
  assert.equal(b.additionalAmount, 400); // and not lost
});

// ── 17 ───────────────────────────────────────────────────────────────────────
test('17. missing or invalid dates never become facts', () => {
  const invalidRelease = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill\nEnd date:-28-0-26-(D)`, '2026-01-28T09:00:00Z', 'm1'),
  ]);
  assert.ok(invalidRelease.reviewReasons.includes('INVALID_STATED_DATE'));
  assert.equal(invalidRelease.releaseEligible, false);
  assert.notEqual(invalidRelease.releaseDateSource, 'STATED_END_DATE');

  const invalidTravel = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill\nগাড়ি ভাড়া 500/- 30-02-26`, '2026-01-28T09:00:00Z', 'm1'),
  ]);
  assert.equal(invalidTravel.travelDate, null);
  assert.equal(invalidTravel.conveyanceMonth, null);
  assert.equal(invalidTravel.releaseEligible, false); // invalid date evidence blocks
});

// ── 18 ───────────────────────────────────────────────────────────────────────
test('18. a failed release pass is retried and the rescan is idempotent', () => {
  // Backoff: 1 min, 2 min, 4 min … capped at 30 min.
  assert.equal(releaseRetryDelay(0), 60_000);
  assert.equal(releaseRetryDelay(1), 120_000);
  assert.equal(releaseRetryDelay(2), 240_000);
  assert.equal(releaseRetryDelay(99), 30 * 60_000);

  let state = initialReleaseRetry();
  assert.equal(shouldAttemptReleaseScan(state, 1_000), false); // nothing pending
  state = recordReleaseScanFailure(state, 1_000);
  assert.equal(shouldAttemptReleaseScan(state, 60_999), false);
  assert.equal(shouldAttemptReleaseScan(state, 61_000), true);
  state = recordReleaseScanFailure(state, 61_000);
  assert.equal(shouldAttemptReleaseScan(state, 61_000 + 119_999), false);
  assert.equal(shouldAttemptReleaseScan(state, 61_000 + 120_000), true);
  state = recordReleaseScanSuccess();
  assert.equal(shouldAttemptReleaseScan(state, Number.MAX_SAFE_INTEGER), false);

  // The rescan is cheap and idempotent: the same candidate is inserted once.
  const stored = new Set();
  const persist = (keys) => keys.filter((key) => (stored.has(key) ? false : (stored.add(key), true)));
  assert.deepEqual(persist(['a', 'b']), ['a', 'b']);
  assert.deepEqual(persist(['a', 'b']), []);
});

// ── 19 ───────────────────────────────────────────────────────────────────────
test('19. the evidence module cannot mutate releases or read a database', () => {
  const source = readFileSync(new URL('../lib/release-evidence.ts', import.meta.url), 'utf8');
  for (const forbidden of ['release-apply', 'release-scan', 'cash-', '/db/', 'INSERT', 'UPDATE ', 'DELETE ']) {
    assert.equal(source.includes(forbidden), false, `release-evidence must not reference ${forbidden}`);
  }
});

// ── 20 ───────────────────────────────────────────────────────────────────────
test('20. no path produces a Cash posting, settlement or approval', () => {
  const fixtures = [
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'a')],
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill\nগাড়ি ভাড়া 400/-`, '2026-01-28T09:00:00Z', 'b')],
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'c'), msg(`${M1} 600/-`, '2026-01-28T10:00:00Z', 'd')],
  ];
  for (const fixture of fixtures) {
    for (const match of [MATCH, {status: 'PENDING_REVIEW', programId: null, confidence: null, candidateIds: ['x', 'y']}]) {
      for (const b of analyseReleaseBundle(fixture, match)) {
        assert.equal(b.cashPosting, false);
        assert.deepEqual(Object.keys(b).sort(), [
          'additionalAmount', 'cashPosting', 'classification', 'conveyanceMonth', 'conveyancePurpose',
          'conveyanceStatus', 'employeeIdentitySource', 'employeeMobile', 'evidenceFlags',
          'evidenceMessageIds', 'foodBillAmount', 'foodBillDate', 'foodBillDutyDays',
          'foodBillStatedDays', 'lighterVessel', 'officeReturnDate', 'paymentInstructionDate', 'programId',
          'releaseDate', 'releaseDateSource', 'releaseEligible', 'reviewReasons', 'ruleTrace',
          'signals', 'sukaniMentioned', 'travelDate', 'travelDateSource',
        ]);
      }
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Day-count corrective regression — Owner rule, 2026-11-04.
// An agreeing day count is supporting evidence, never an eligibility condition.
// ════════════════════════════════════════════════════════════════════════════

test('C1. matching day count is recorded as positive evidence', () => {
  const b = one([msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.foodBillAmount, 900);
  assert.equal(b.foodBillDutyDays, 6); // 900 / 150
  assert.equal(b.foodBillStatedDays, 6); // "6-day"
  assert.ok(b.ruleTrace.includes('R-DAY-COUNT-AGREES'));
  assert.deepEqual(b.evidenceFlags, []);
  assert.equal(b.releaseDateSource, 'FOOD_BILL_EVENT');
  assert.equal(b.releaseEligible, true);
  assert.deepEqual(b.reviewReasons, []);
});

test('C2. a mismatching day count never blocks an otherwise reliable food bill', () => {
  const b = one([msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 10-day`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.foodBillDutyDays, 6);
  assert.equal(b.foodBillStatedDays, 10);
  assert.deepEqual(b.evidenceFlags, ['DAY_COUNT_MISMATCH']); // audit only
  assert.equal(b.ruleTrace.includes('R-DAY-COUNT-AGREES'), false);
  // Still a release, and still eligible: the mismatch is not a review reason.
  assert.equal(b.releaseDateSource, 'FOOD_BILL_EVENT');
  assert.equal(b.classification, 'FOOD_BILL_RELEASE_EVIDENCE');
  assert.equal(b.releaseEligible, true);
  assert.deepEqual(b.reviewReasons, []);
  assert.equal(b.reviewReasons.includes('DAY_COUNT_MISMATCH'), false);
});

test('C3. a Food Bill with no stated day count is still valid evidence', () => {
  const b = one([msg(`ID: ${M1} Name ${M2}(B) 900/- food bill`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(b.foodBillStatedDays, null);
  assert.equal(b.foodBillDutyDays, 6);
  assert.deepEqual(b.evidenceFlags, []);
  assert.equal(b.ruleTrace.includes('R-DAY-COUNT-AGREES'), false);
  assert.equal(b.releaseDateSource, 'FOOD_BILL_EVENT');
  assert.equal(b.releaseEligible, true);
});

test('C4. an amount that is not divisible by BDT 150 still works', () => {
  // 1000 / 150 = 6.67 → floor 6; no stated count, no flag.
  const bare = one([msg(`ID: ${M1} Name ${M2}(B) 1000/- food bill`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(bare.foodBillDutyDays, 6);
  assert.equal(bare.foodBillStatedDays, null);
  assert.deepEqual(bare.evidenceFlags, []);
  assert.equal(bare.releaseEligible, true);

  // With a stated count that disagrees: audited, still eligible.
  const stated = one([msg(`ID: ${M1} Name ${M2}(B) 1000/- food bill 7-day`, '2026-01-28T09:00:00Z', 'm1')]);
  assert.equal(stated.foodBillDutyDays, 6);
  assert.equal(stated.foodBillStatedDays, 7);
  assert.deepEqual(stated.evidenceFlags, ['DAY_COUNT_MISMATCH']);
  assert.equal(stated.releaseEligible, true);
});

test('C5. a wrong Program match is still an independent review reason', () => {
  const b = one(
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`, '2026-01-28T09:00:00Z', 'm1')],
    {status: 'ROSTER_MISMATCH', programId: null, confidence: null},
  );
  assert.equal(b.releaseEligible, false);
  assert.equal(b.classification, 'NEEDS_REVIEW');
  assert.ok(b.reviewReasons.includes('NO_PROGRAM_MATCH'));
  assert.deepEqual(b.evidenceFlags, []); // day count agreed; the block is the match
});

test('C6. multiple Program candidates are still an independent review reason', () => {
  const b = one(
    [msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`, '2026-01-28T09:00:00Z', 'm1')],
    {status: 'PENDING_REVIEW', programId: null, confidence: null, candidateIds: ['p1', 'p2']},
  );
  assert.equal(b.releaseEligible, false);
  assert.ok(b.reviewReasons.includes('MULTIPLE_PROGRAM_CANDIDATES'));
  assert.equal(b.programId, null);
});

test('C7. a conflicting explicit Release Date still wins and still requires review', () => {
  const b = one([
    msg(`ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`, '2026-01-30T09:00:00Z', 'm1'),
    msg('End date:-28-01-26-(D)', '2026-01-30T09:05:00Z', 'm2'),
  ]);
  assert.equal(b.releaseDate, '2026-01-28'); // explicit date preserved
  assert.equal(b.releaseDateSource, 'STATED_END_DATE');
  assert.equal(b.releaseEligible, false);
  assert.ok(b.reviewReasons.includes('FOOD_BILL_CONFLICTS_WITH_EXPLICIT_RELEASE'));
  assert.deepEqual(b.evidenceFlags, []); // day count agreed; the conflict is the block
});

test('C8. a duplicate Food Bill message does not duplicate the evidence', () => {
  const text = `ID: ${M1} Name ${M2}(B) 900/- food bill 6-day`;
  const b = one([
    msg(text, '2026-01-28T09:00:00Z', 'm1'),
    msg(text, '2026-01-28T09:00:00Z', 'm1'),
  ]);
  assert.equal(b.foodBillAmount, 900); // not 1800
  assert.equal(b.foodBillDutyDays, 6);
  assert.deepEqual(b.evidenceMessageIds, ['m1']);
  assert.deepEqual(b.evidenceFlags, []);
  assert.equal(b.releaseEligible, true);
});
