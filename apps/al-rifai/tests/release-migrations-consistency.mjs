// Consistency guard between the release-evidence code and the candidate
// migrations. It reads the SQL files, so a rename or a missing enum value fails
// here instead of in production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RELEASE_EVIDENCE_COLUMNS} from '../lib/release-scan.ts';

const root = new URL('..', import.meta.url).pathname;
const applied = readdirSync(join(root, 'db/migrations')).filter((f) => f.endsWith('.sql')).sort();
const candidates = readdirSync(join(root, 'db/migration-candidates')).filter((f) => f.endsWith('.sql')).sort();
const read = (name) => readFileSync(join(root, 'db/migration-candidates', name), 'utf8');

const M = {
  alias: read('0073_destination_alias_kachpur.sql'),
  payroll: read('0072_vessel_conveyance_and_payroll_monthly.sql'),
  evidence: read('0074_release_evidence_fields.sql'),
  foodBill: read('0075_food_bill_and_additional_payment.sql'),
  apply: read('0071_release_apply_atomic.sql'),
};
const all = Object.values(M).join('\n');
// Comments carry rollback instructions ("DROP VIEW …"), so destructive-statement
// checks run on SQL with line comments removed.
const stripComments = (sql) => sql.replace(/--[^\n]*/g, '');

test('candidate numbering is unique and never collides with an applied migration', () => {
  assert.equal(new Set(candidates).size, candidates.length);
  for (const name of candidates) {
    assert.equal(applied.includes(name), false, `${name} already applied`);
  }
  const numbers = candidates.map((name) => name.slice(0, 4));
  assert.equal(new Set(numbers).size, numbers.length, 'duplicate candidate number');
  // The old candidates (0006…0036) are historical. Anything in the current
  // series must sit above the highest applied migration (0070).
  const highestApplied = Math.max(...applied.map((name) => Number(name.slice(0, 4))));
  const current = numbers.filter((n) => Number(n) >= 71);
  assert.deepEqual(current, ['0071', '0072', '0073', '0074', '0075']);
  assert.ok(current.every((n) => Number(n) > highestApplied), 'candidates must follow the applied ledger');
});

test('every column the writer needs is created by a candidate migration', () => {
  for (const column of RELEASE_EVIDENCE_COLUMNS) {
    assert.ok(all.includes(column), `no migration creates ${column}`);
  }
});

test('every enum value the code can write is accepted by a CHECK constraint', () => {
  for (const value of ['STATED_END_DATE', 'FOOD_BILL_EVENT', 'MESSAGE_TIMESTAMP']) {
    assert.ok(M.evidence.includes(`'${value}'`), `release_date_source misses ${value}`);
  }
  for (const value of ['VERIFIED', 'CANDIDATE', 'UNRESOLVED', 'NONE']) {
    assert.ok(M.foodBill.includes(`'${value}'`), `conveyance_status misses ${value}`);
  }
  for (const value of ['OFFICE_RETURN_CONVEYANCE', 'GHAT_DUTY_CONVEYANCE', 'OTHER_VERIFIED_TRANSPORT', 'UNKNOWN_CONVEYANCE_PURPOSE']) {
    assert.ok(M.foodBill.includes(`'${value}'`), `conveyance_purpose misses ${value}`);
  }
  for (const value of ['EXPLICIT_TRAVEL_DATE', 'SAME_DAY_ESTABLISHED']) {
    assert.ok(M.foodBill.includes(`'${value}'`), `travel_date_source misses ${value}`);
  }
  for (const value of ['ID_LABEL', 'ESCORT_LABEL', 'FIRST_MOBILE']) {
    assert.ok(M.foodBill.includes(`'${value}'`), `employee_identity_source misses ${value}`);
  }
  for (const value of ['COMPLETE', 'PARTIAL', 'UNRESOLVED_CONVEYANCE', 'INVALID_DATES', 'NO_EVIDENCE']) {
    assert.ok(M.evidence.includes(`'${value}'`), `extraction_status misses ${value}`);
  }
});

test('the apply function is atomic by construction', () => {
  // One function body must contain the release command, the pay recalc, the
  // candidate update and the audit insert, and the sequence must be granted.
  const body = M.apply.slice(M.apply.indexOf('CREATE OR REPLACE FUNCTION'));
  for (const step of ['alrifai_vessel_program_release', 'recalculate_program_pay', 'UPDATE public.release_candidates', 'INSERT INTO public.release_auto_apply_log']) {
    assert.ok(body.includes(step), `apply function misses ${step}`);
  }
  assert.ok(/GRANT USAGE, SELECT ON SEQUENCE public\.release_auto_apply_log_id_seq/.test(M.apply));
  assert.ok(M.apply.includes('release_auto_apply_log_candidate_uk'), 'one audit row per candidate is not enforced');
  assert.ok(M.apply.includes('alrifai_vessel_actor_verified'), 'actor is not re-checked');
});

test('the event table allows exactly one event per candidate', () => {
  const body = M.evidence;
  assert.ok(/CREATE UNIQUE INDEX IF NOT EXISTS vessel_conveyance_event_candidate_uk/.test(body));
  assert.ok(/WHERE candidate_id IS NOT NULL/.test(body));
});

test('migrations are idempotent and additive', () => {
  for (const [name, sql] of Object.entries(M)) {
    if (!/CREATE TABLE/.test(sql)) continue;
    assert.ok(/IF NOT EXISTS/.test(sql), `${name} creates a table without IF NOT EXISTS`);
  }
  for (const sql of [M.evidence, M.foodBill]) {
    const adds = sql.match(/ADD COLUMN/g) ?? [];
    const guards = sql.match(/ADD COLUMN IF NOT EXISTS/g) ?? [];
    assert.equal(adds.length, guards.length, 'every ADD COLUMN needs IF NOT EXISTS');
  }
  assert.equal(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i.test(stripComments(all)), false, 'candidates must not drop or delete data');
});
