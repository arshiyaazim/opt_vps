// Isolated tests for the deterministic release/conveyance evidence rules.
// Ten Owner-required cases plus the idempotency and audit invariants they rely on.
//
// Every mobile number here is synthetic (017000000NN); the date/label shapes are
// the ones found in the authorized release group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyReleaseEvent,
  conveyanceMonthOf,
  evidenceKey,
  extractReleaseFacts,
  isSameEvidence,
  mergeEvidence,
} from '../lib/release-evidence.ts';

const M = '01700000001';
const MATCHED = {status: 'MATCHED', programId: 'program-1', confidence: 'high'};

const fact = (text, timestamp, messageId = 'MSG1') => {
  const facts = extractReleaseFacts({text, timestamp, messageId});
  assert.equal(facts.length, 1, `expected one escort in: ${text}`);
  return facts[0];
};

test('1. release date present, conveyance date missing → PARTIAL, no month', () => {
  const f = fact(`ID: ${M} Name ${M}(B) 900/- food bill`, '2026-10-10T08:00:00Z');
  assert.equal(f.releaseDate, '2026-10-10');
  assert.equal(f.releaseDateSource, 'MESSAGE_TIMESTAMP');
  assert.equal(f.dutyDays, 6);
  assert.equal(f.conveyanceAmountBdt, null);
  assert.equal(f.extractionStatus, 'PARTIAL');
  assert.equal(conveyanceMonthOf(f), null);

  const decision = classifyReleaseEvent(f, MATCHED);
  assert.equal(decision.classification, 'PARTIAL_INFORMATION');
  assert.equal(decision.releaseEligible, true); // a missing conveyance never blocks the release
  assert.equal(decision.conveyance.status, 'NONE');
});

test('2. release and conveyance in separate messages are linked by escort', () => {
  const release = fact(`ID: ${M} Name ${M}(B) 900/- food bill`, '2026-10-10T08:00:00Z', 'MSG-A');
  const conveyance = fact(`${M} Name ${M}(B) 500/- গাড়ি ভাড়া`, '2026-10-12T08:00:00Z', 'MSG-B');

  const {fact: merged, reasons} = mergeEvidence(release, conveyance, 'FOLLOW_UP');
  assert.deepEqual(reasons, []);
  assert.equal(merged.releaseDate, '2026-10-10'); // unchanged by the later message
  assert.equal(merged.conveyanceAmountBdt, 500);
  assert.equal(merged.conveyanceDate, null);
  assert.equal(merged.extractionStatus, 'UNRESOLVED_CONVEYANCE');
  assert.deepEqual(merged.sourceMessageIds, ['MSG-A', 'MSG-B']);
  assert.ok(merged.ruleTrace.includes('R-FOLLOW_UP'));
  assert.equal(conveyanceMonthOf(merged), null);
});

test('3. released in January, office return in February → allocated to February', () => {
  const text = [
    `ID: ${M} Name ${M}(B) 900/- food bill`,
    'End date:-28-01-26-(D)',
    'Office return date:-02-02-26 গাড়ি ভাড়া 500/-',
  ].join('\n');
  const f = fact(text, '2026-01-28T09:00:00Z');

  assert.equal(f.releaseDate, '2026-01-28');
  assert.equal(f.releaseDateSource, 'STATED_END_DATE');
  assert.equal(f.releaseShift, 'D');
  assert.equal(f.officeReturnDate, '2026-02-02');
  assert.equal(f.conveyanceAmountBdt, 500);
  assert.equal(f.extractionStatus, 'COMPLETE');
  assert.equal(conveyanceMonthOf(f), '2026-02'); // never January

  const decision = classifyReleaseEvent(f, MATCHED);
  assert.equal(decision.classification, 'VERIFIED_CONVEYANCE');
  assert.deepEqual(decision.conveyance, {amountBdt: 500, month: '2026-02', status: 'ALLOCATED'});
});

test('4. explicit amount without a travel date stays unresolved and unallocated', () => {
  const f = fact(`ID: ${M} Name ${M}(B) 400/- স্যার অফিসে আসার গাড়ি ভাড়া`, '2026-10-26T06:32:29Z');
  assert.equal(f.conveyanceAmountBdt, 400);
  assert.equal(f.conveyanceDate, null);
  assert.equal(f.officeReturnDate, null);
  assert.equal(f.extractionStatus, 'UNRESOLVED_CONVEYANCE');
  assert.equal(conveyanceMonthOf(f), null);

  const decision = classifyReleaseEvent(f, MATCHED);
  assert.equal(decision.classification, 'UNRESOLVED_CONVEYANCE');
  assert.deepEqual(decision.conveyance, {amountBdt: 400, month: null, status: 'UNRESOLVED'});
});

test('5. Bengali and English date forms resolve to the same ISO date', () => {
  const english = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-01-26-(N)`, '2026-01-28T09:00:00Z');
  const bengali = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-২৮-০১-২৬-(N)`, '2026-01-28T09:00:00Z');
  assert.equal(english.releaseDate, '2026-01-28');
  assert.equal(bengali.releaseDate, '2026-01-28');
  assert.equal(english.releaseShift, 'N');
  assert.equal(bengali.releaseShift, 'N');

  // Bengali digits in a return date too.
  const bengaliReturn = fact(
    `ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-01-26-(D)\nফেরত তারিখ ০২/০২/২৬ গাড়ি ভাড়া 500/-`,
    '2026-01-28T09:00:00Z',
  );
  assert.equal(bengaliReturn.officeReturnDate, '2026-02-02');
  assert.equal(conveyanceMonthOf(bengaliReturn), '2026-02');
});

test('6. the same message received twice produces identical evidence', () => {
  const text = `ID: ${M} Name ${M}(B) 500/- গাড়ি ভাড়া`;
  const first = fact(text, '2026-10-12T08:00:00Z', 'SAME');
  const second = fact(text, '2026-10-12T08:00:00Z', 'SAME');
  assert.deepEqual(first, second);
  assert.equal(evidenceKey(first), evidenceKey(second));
  assert.equal(isSameEvidence(first, second), true);

  // A different message id is different evidence.
  const other = fact(text, '2026-10-12T08:00:00Z', 'OTHER');
  assert.equal(isSameEvidence(first, other), false);
});

test('7. a follow-up correction supersedes a stated date and keeps provenance', () => {
  const release = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-01-26-(D)`, '2026-01-28T09:00:00Z', 'MSG-1');
  const correction = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-29-01-26-(D)\nগাড়ি ভাড়া 550/-`, '2026-01-30T09:00:00Z', 'MSG-2');

  const {fact: corrected, reasons} = mergeEvidence(release, correction, 'CORRECTION');
  assert.deepEqual(reasons, []);
  assert.equal(corrected.releaseDate, '2026-01-29');
  assert.equal(corrected.conveyanceAmountBdt, 550);
  assert.deepEqual(corrected.sourceMessageIds, ['MSG-1', 'MSG-2']);
  assert.ok(corrected.ruleTrace.includes('R-CORRECTION'));

  // A follow-up may not silently rewrite a conflicting stated date.
  const conflicting = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-05-02-26-(D)`, '2026-02-05T09:00:00Z', 'MSG-3');
  const kept = mergeEvidence(release, conflicting, 'FOLLOW_UP');
  assert.ok(kept.reasons.includes('CONFLICTING_STATED_DATES'));
  assert.equal(kept.fact.releaseDate, '2026-01-28');
});

test('8. several Program candidates are never auto-applied', () => {
  const f = fact(`ID: ${M} Name ${M}(B) 900/- food bill`, '2026-10-10T08:00:00Z');
  const decision = classifyReleaseEvent(f, {
    status: 'PENDING_REVIEW', programId: null, confidence: null, candidateIds: ['p1', 'p2'],
  });
  assert.equal(decision.classification, 'NEEDS_REVIEW');
  assert.equal(decision.releaseEligible, false);
  assert.equal(decision.programId, null);
  assert.ok(decision.reasons.includes('MULTIPLE_PROGRAM_CANDIDATES'));

  const none = classifyReleaseEvent(f, {status: 'ROSTER_MISMATCH', programId: null, confidence: null});
  assert.equal(none.releaseEligible, false);
  assert.ok(none.reasons.includes('NO_PROGRAM_MATCH'));
});

test('9. invalid and conflicting dates are held for review, never applied', () => {
  // "28-0-26" looks like a date but is not one.
  const invalid = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-0-26-(D)`, '2026-01-28T09:00:00Z');
  assert.equal(invalid.extractionStatus, 'INVALID_DATES');
  assert.ok(invalid.ruleTrace.includes('R-INVALID-STATED-DATE'));
  const invalidDecision = classifyReleaseEvent(invalid, MATCHED);
  assert.equal(invalidDecision.classification, 'NEEDS_REVIEW');
  assert.equal(invalidDecision.releaseEligible, false);
  assert.ok(invalidDecision.reasons.includes('DATE_EVIDENCE_INVALID'));

  // Conveyance dated before the release.
  const conflict = fact(
    `ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-01-26-(D)\nগাড়ি ভাড়া 500/- তারিখ 20-01-26`,
    '2026-01-28T09:00:00Z',
  );
  const conflictDecision = classifyReleaseEvent(conflict, MATCHED);
  assert.ok(conflictDecision.reasons.includes('DATE_CONFLICT_CONVEYANCE_BEFORE_RELEASE'));
  assert.equal(conflictDecision.releaseEligible, false);
  assert.equal(conflictDecision.classification, 'NEEDS_REVIEW');

  // A stated release date after the slip's own arrival is not established.
  const future = fact(`ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-05-02-26-(D)`, '2026-01-28T09:00:00Z');
  const futureDecision = classifyReleaseEvent(future, MATCHED);
  assert.ok(futureDecision.reasons.includes('RELEASE_DATE_AFTER_MESSAGE'));
  assert.equal(futureDecision.releaseEligible, false);
});

test('10. no path produces a Cash posting or a second approval', () => {
  const texts = [
    `ID: ${M} Name ${M}(B) 900/- food bill`,
    `ID: ${M} Name ${M}(B) 500/- গাড়ি ভাড়া`,
    `ID: ${M} Name ${M}(B) 900/- food bill\nEnd date:-28-01-26-(D)\nOffice return date:-02-02-26 গাড়ি ভাড়া 500/-`,
  ];
  for (const text of texts) {
    const f = fact(text, '2026-01-28T09:00:00Z');
    for (const match of [MATCHED, {status: 'PENDING_REVIEW', programId: null, confidence: null, candidateIds: ['a', 'b']}]) {
      const decision = classifyReleaseEvent(f, match);
      assert.equal(decision.cashPosting, false);
      assert.equal('posting' in decision, false);
      assert.equal('settlement' in decision, false);
      assert.deepEqual(Object.keys(decision).sort(), ['cashPosting', 'classification', 'conveyance', 'programId', 'reasons', 'releaseEligible']);
    }
  }
});

test('extraction is pure and refuses incomplete input', () => {
  assert.deepEqual(extractReleaseFacts({text: '', timestamp: '2026-01-01T00:00:00Z', messageId: 'X'}), []);
  assert.deepEqual(extractReleaseFacts({text: 'hello', timestamp: '', messageId: 'X'}), []);
  assert.deepEqual(extractReleaseFacts({text: 'hello', timestamp: '2026-01-01T00:00:00Z', messageId: ''}), []);
});

test('message arrival is never used as the travel date', () => {
  const f = fact(`ID: ${M} Name ${M}(B) 500/- গাড়ি ভাড়া`, '2026-03-15T09:00:00Z');
  assert.equal(f.conveyanceDate, null);
  assert.equal(f.officeReturnDate, null);
  assert.equal(conveyanceMonthOf(f), null); // not 2026-03
});
