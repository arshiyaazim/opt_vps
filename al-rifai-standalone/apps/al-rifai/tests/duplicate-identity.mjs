// Duplicate classification regressions. The Owner rule must hold:
// same Mother + same Lighter + start date within ±1 day => duplicate candidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyProgramDuplicate,
  classifyCandidateSet,
  autoSuppressible,
  normalizeVesselName,
  normalizeReleasePoint,
  normalizeShift,
  calendarDayDelta,
} from '../lib/duplicate-identity.ts';

const base = {
  motherVessel: 'Alpha Unity', lighterVessel: 'Light One', startDate: '2026-10-03',
  shift: 'D', masterMobile: '01829984145', escortMobile: '01754334400',
};

test('vessel normalization strips MV prefixes, serials, punctuation and Bengali digits', () => {
  assert.equal(normalizeVesselName('M.V. Light-One'), normalizeVesselName('MV Light One'));
  assert.equal(normalizeVesselName('2) M.V. Light One'), normalizeVesselName('light one'));
  assert.equal(normalizeVesselName('এমভি লাইট ১'), normalizeVesselName('এমভি লাইট 1'));
});

test('approved aliases match as aliases, never as name-only identity', () => {
  const aliasMatch = classifyProgramDuplicate(
    {...base, lighterVessel: 'Light-1'},
    {...base, lighterVessel: 'Light One'},
    {approvalAliases: ['Light-1', 'Light One']},
  );
  assert.equal(aliasMatch.evidence.vesselPair, 'ALIAS');
  assert.notEqual(aliasMatch.state, 'DISTINCT');
});

test('different lighters with the same escort and date stay distinct programs', () => {
  const result = classifyProgramDuplicate({...base, lighterVessel: 'Other Lighter'}, base);
  assert.equal(result.state, 'DISTINCT');
  assert.equal(result.evidence.vesselPair, 'DIFFERENT');
  assert.equal(autoSuppressible(result), false);
});

test('same pair different start dates beyond one day are distinct', () => {
  const result = classifyProgramDuplicate({...base, startDate: '2026-10-05'}, base);
  assert.equal(result.state, 'DISTINCT');
  assert.equal(result.evidence.date, 'OUTSIDE');
});

test('one-day boundary is a candidate, two days is not', () => {
  const within = classifyProgramDuplicate({...base, startDate: '2026-10-04'}, base);
  assert.equal(within.evidence.date, 'WITHIN_ONE_DAY');
  assert.notEqual(within.state, 'DISTINCT');
  const beyond = classifyProgramDuplicate({...base, startDate: '2026-10-06'}, base);
  assert.equal(beyond.state, 'DISTINCT');
});

test('exact replay requires same day, agreeing shift and matching personnel', () => {
  const exact = classifyProgramDuplicate(base, {...base});
  assert.equal(exact.state, 'EXACT');
  assert.equal(autoSuppressible(exact), true);
  // Same day, different shift is a review case, not a silent suppression.
  const shiftConflict = classifyProgramDuplicate({...base, shift: 'N'}, base);
  assert.equal(shiftConflict.state, 'PROBABLE');
  assert.equal(shiftConflict.evidence.shift, 'CONFLICT');
  assert.equal(autoSuppressible(shiftConflict), false);
});

test('same pair and same day without personnel evidence is ambiguous, never exact', () => {
  const ambiguous = classifyProgramDuplicate(
    {...base, masterMobile: '', escortMobile: ''},
    {...base, masterMobile: '', escortMobile: ''},
  );
  assert.equal(ambiguous.state, 'AMBIGUOUS');
  assert.equal(autoSuppressible(ambiguous), false);
});

test('matching escort mobile alone is not duplicate proof', () => {
  const result = classifyProgramDuplicate(
    {...base, masterMobile: '01711111111', lighterVessel: 'Other'},
    base,
  );
  assert.equal(result.state, 'DISTINCT');
});

test('multiple candidates aggregate to AMBIGUOUS, single exact stays EXACT', () => {
  const exact = classifyProgramDuplicate(base, base);
  const probable = classifyProgramDuplicate({...base, startDate: '2026-10-04'}, base);
  assert.equal(classifyCandidateSet([exact]), 'EXACT');
  assert.equal(classifyCandidateSet([exact, probable]), 'AMBIGUOUS');
  assert.equal(classifyCandidateSet([]), 'DISTINCT');
});

test('release points and shifts normalize for matching and reporting', () => {
  assert.equal(normalizeReleasePoint('O/A To  Local'), normalizeReleasePoint('o/a to local'));
  assert.equal(normalizeReleasePoint('  Dhaka - Sadar  '), 'dhaka sadar');
  assert.equal(normalizeShift('night'), 'N');
  assert.equal(normalizeShift('Day Shift'), 'D');
  assert.equal(calendarDayDelta('2026-10-03', '2026-10-04'), 1);
});
