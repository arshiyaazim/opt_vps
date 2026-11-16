// Cash approval policy regressions (no database, no posting).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanDecide,
  assertCanViewSubmission,
  canViewSubmission,
  projectReviewState,
  ApprovalError,
} from '../lib/cash-approval.ts';

const ADMIN = {id: 'a'.repeat(64), role: 'ADMIN'};
const OTHER_ADMIN = {id: 'b'.repeat(64), role: 'ADMIN'};
const USER = {id: 'c'.repeat(64), role: 'USER'};
const submission = {id: 's1', submittedByUserRef: USER.id};

const denied = (code) => (error) => error instanceof ApprovalError && error.code === code;

test('role-scoped access: admins see all, users see only their own submissions', () => {
  assert.equal(canViewSubmission(ADMIN, submission), true);
  assert.equal(canViewSubmission(USER, submission), true);
  assert.equal(canViewSubmission(USER, {id: 's2', submittedByUserRef: 'x'.repeat(64)}), false);
  assert.throws(() => assertCanViewSubmission(USER, {id: 's2', submittedByUserRef: 'x'.repeat(64)}), denied('SUBMISSION_NOT_VISIBLE'));
});

test('only an admin may decide and a reviewer cannot decide their own submission', () => {
  assert.throws(() => assertCanDecide({actor: USER, submission, decision: 'APPROVED'}), denied('ADMIN_REQUIRED'));
  assert.throws(() => assertCanDecide({actor: USER, submission, decision: 'APPROVED'}), denied('ADMIN_REQUIRED'));
  const selfAdmin = {id: USER.id, role: 'ADMIN'};
  assert.throws(() => assertCanDecide({actor: selfAdmin, submission, decision: 'APPROVED'}), denied('REVIEWER_IS_SUBMITTER'));
});

test('decision values and required reasons are validated', () => {
  assert.throws(() => assertCanDecide({actor: ADMIN, submission, decision: 'PAID'}), denied('DECISION_INVALID'));
  assert.throws(() => assertCanDecide({actor: ADMIN, submission, decision: 'REJECTED'}), denied('REASON_REQUIRED'));
  assert.throws(() => assertCanDecide({actor: ADMIN, submission, decision: 'CORRECTION_REQUESTED', note: '  '}), denied('REASON_REQUIRED'));
  assert.doesNotThrow(() => assertCanDecide({actor: ADMIN, submission, decision: 'APPROVED'}));
  assert.deepEqual(assertCanDecide({actor: ADMIN, submission, decision: 'REJECTED', note: 'Duplicate'}), {decision: 'REJECTED', note: 'Duplicate'});
  assert.throws(() => assertCanDecide({actor: ADMIN, submission, decision: 'APPROVED', note: 'x'.repeat(1001)}), denied('NOTE_TOO_LONG'));
});

test('the same reviewer cannot repeat the same decision (idempotency)', () => {
  assert.throws(() => assertCanDecide({
    actor: ADMIN, submission, decision: 'APPROVED',
    priorDecisions: [{actorUserRef: ADMIN.id, decision: 'APPROVED'}],
  }), denied('DECISION_ALREADY_RECORDED'));
  // A different admin may still record the same decision (append-only history).
  assert.doesNotThrow(() => assertCanDecide({
    actor: OTHER_ADMIN, submission, decision: 'APPROVED',
    priorDecisions: [{actorUserRef: ADMIN.id, decision: 'APPROVED'}],
  }));
});

test('review state projection matches latest-decision semantics', () => {
  assert.equal(projectReviewState([]), 'PENDING_REVIEW');
  assert.equal(projectReviewState([{decision: 'APPROVED', decidedAt: '2026-10-03T10:00:00Z', id: '1'}]), 'ACTIVE_REVIEWED');
  assert.equal(projectReviewState([
    {decision: 'APPROVED', decidedAt: '2026-10-03T10:00:00Z', id: '1'},
    {decision: 'REJECTED', decidedAt: '2026-10-03T11:00:00Z', id: '2'},
  ]), 'REJECTED');
  assert.equal(projectReviewState([
    {decision: 'APPROVED', decidedAt: '2026-10-03T10:00:00Z', id: '1'},
    {decision: 'CORRECTION_REQUESTED', decidedAt: '2026-10-03T11:00:00Z', id: '2'},
  ]), 'CORRECTION_REQUESTED');
});

test('approval never authorizes posting', async () => {
  const {assertCanDecide: decide} = await import('../lib/cash-approval.ts');
  const result = decide({actor: ADMIN, submission, decision: 'APPROVED'});
  assert.equal('postingAuthorized' in result, false);
});
