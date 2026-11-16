// Cash submission validation + prepared-migration safety regressions.
// No database is touched; the migration is inspected as source only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSubmission, submissionHash} from '../lib/cash-submission.ts';

const valid = {
  employeeName: 'Md. Osman Goni',
  employeeMobile: '01754334400',
  payoutMobile: '01754334400',
  method: 'bkash',
  amount: '450',
  purpose: 'Escort duty 03 Oct',
  date: '2026-10-03',
  evidenceRef: 'wamid-123',
};

test('a valid submission is PENDING_REVIEW with no posting authorization', () => {
  const result = validateSubmission(valid);
  assert.equal(result.ok, true);
  assert.equal(result.state, 'PENDING_REVIEW');
  assert.equal(result.payload.postingAuthorized, false);
  assert.equal(result.payload.amountMinor, 45_000);
  assert.equal(result.payload.state, 'PENDING_REVIEW');
  assert.match(result.payload.payloadHash, /^[a-f0-9]{64}$/);
  assert.match(result.payload.instruction, /^ID: 01754334400 Md\. Osman Goni/);
});

test('employee identity and payout destination stay separate', () => {
  const differentPayout = validateSubmission({...valid, payoutMobile: '01811111111'});
  assert.equal(differentPayout.ok, true);
  assert.equal(differentPayout.payload.employeeMobile, '01754334400');
  assert.equal(differentPayout.payload.payoutMobile, '01811111111');
});

test('invalid submissions fail closed with explicit reasons', () => {
  assert.equal(validateSubmission({...valid, employeeMobile: '0175433440'}).ok, false);
  assert.equal(validateSubmission({...valid, payoutMobile: '12345'}).ok, false);
  assert.equal(validateSubmission({...valid, amount: '0'}).ok, false);
  assert.equal(validateSubmission({...valid, amount: '450.999'}).ok, false);
  assert.equal(validateSubmission({...valid, method: 'cheque'}).ok, false);
  assert.equal(validateSubmission({...valid, date: '2026-02-31'}).ok, false);
  assert.equal(validateSubmission({...valid, purpose: ''}).ok, false);
  assert.equal(validateSubmission({...valid, note: 'x'.repeat(501)}).ok, false);
});

test('payload hash is deterministic for identical content and changes with material fields', () => {
  const first = validateSubmission(valid);
  const second = validateSubmission({...valid});
  assert.equal(first.payload.payloadHash, second.payload.payloadHash);
  const changed = validateSubmission({...valid, amount: '451'});
  assert.notEqual(first.payload.payloadHash, changed.payload.payloadHash);
  assert.equal(submissionHash({...first.payload, payloadHash: undefined, state: undefined, postingAuthorized: undefined}), first.payload.payloadHash);
});

test('prepared migration keeps financial facts append-only and unposted', () => {
  const sql = readFileSync(new URL('../db/migration-candidates/0031_cash_submissions_and_reviews.sql', import.meta.url), 'utf8');
  assert.match(sql, /PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION/);
  assert.match(sql, /cash_submission_reviews_append_only/);
  assert.match(sql, /cash_submissions_append_only/);
  assert.match(sql, /alrifai_foundation_append_only/);
  assert.doesNotMatch(sql, /GRANT[^;]*\bUPDATE\b/i, 'no UPDATE grant may be prepared');
  assert.doesNotMatch(sql, /GRANT[^;]*\bDELETE\b/i, 'no DELETE grant may be prepared');
  assert.doesNotMatch(sql, /INSERT INTO public\.cash_postings/i, 'approval must never insert postings');
  assert.doesNotMatch(sql, /INSERT INTO public\.cash_movements/i, 'approval must never insert movements');
  assert.match(sql, /REVOKE ALL ON public\.cash_submissions, public\.cash_submission_reviews FROM PUBLIC/);
  assert.match(sql, /decision text NOT NULL CHECK \(decision IN \('APPROVED','REJECTED','CORRECTION_REQUESTED'\)\)/);
  assert.match(sql, /reviewer_not_submitter/, 'a reviewer cannot approve their own submission');
});
