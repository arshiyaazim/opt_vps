// Target 02 · P2 — the register row must close when its Program is created.
//
// `persistConfirmedProgram` is called inside the processor's transaction. This
// test drives it with a recording client so the statement shape, the schema
// compatibility and the idempotency guard are all asserted without a database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {persistConfirmedProgram} from '../lib/vessel-ops.ts';
import {programIdFor} from '../lib/vessel-match.ts';

const MIGRATIONS = new URL('../db/migrations/', import.meta.url);

function recordingClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({sql, params});
      if (/INSERT INTO public\.programs/.test(sql)) return {rows: [{id: params[0]}], rowCount: 1};
      return {rows: [], rowCount: 1};
    },
  };
}

const input = {
  account: 'wa-01',
  clientChat: '8801670535255@s.whatsapp.net',
  mother: 'M.V. Beltokyo',
  lighter: 'M.V. Ritaj',
  masterMobile: '01921-155548',
  destination: '',
  escortName: 'Payel Hossain',
  escortMobile: '+8801784297908',
  startDate: '2026-11-04',
  shift: 'N',
  orderId: 'a'.repeat(64),
  orderMessageId: 'ORDER-MSG',
  confirmationMessageId: 'CONF-MSG',
  confirmationSourceHash: 'b'.repeat(64),
  reviewRowId: 'c'.repeat(64),
  matchState: 'EXACT',
  mobileEvidence: 'EXACT',
  employeeLink: {state: 'UNRESOLVED', employeeId: '+8801784297908', name: null},
};

const registerUpdate = (calls) => calls.filter((c) => /UPDATE public\.escort_order_register/.test(c.sql));
const programInsert = (calls) => calls.filter((c) => /INSERT INTO public\.programs/.test(c.sql));
const assignmentInsert = (calls) => calls.filter((c) => /INSERT INTO public\.program_assignments/.test(c.sql));

test('Program creation closes the register row in the same transaction', async () => {
  const client = recordingClient();
  await persistConfirmedProgram(client, input);
  const [update] = registerUpdate(client.calls);
  assert.ok(update, 'register row is updated');
  assert.match(update.sql, /SET status='CONFIRMED'/);
  assert.match(update.sql, /parsed=parsed\|\|\$2::jsonb/);
  assert.deepEqual(update.params[0], input.reviewRowId);
  assert.deepEqual(JSON.parse(update.params[1]).programId, programIdFor(input));
});

test('the transition is one statement, not a second write path', async () => {
  const client = recordingClient();
  await persistConfirmedProgram(client, input);
  assert.equal(registerUpdate(client.calls).length, 1);
  // Ordering: program, assignment, then the register close — all on one client,
  // so the caller's transaction covers them.
  const order = client.calls.map((c) => (/INSERT INTO public\.programs/.test(c.sql) ? 'program'
    : /INSERT INTO public\.program_assignments/.test(c.sql) ? 'assignment'
    : /UPDATE public\.escort_order_register/.test(c.sql) ? 'register' : 'other'));
  assert.deepEqual(order.filter((k) => k !== 'other'), ['program', 'assignment', 'register']);
});

test('the close is idempotent and never overwrites the first timestamp', async () => {
  const client = recordingClient();
  await persistConfirmedProgram(client, input);
  await persistConfirmedProgram(client, input);
  for (const update of registerUpdate(client.calls)) {
    assert.match(update.sql, /CASE WHEN parsed \? 'programCreatedAt' THEN '\{\}'::jsonb/,
      'programCreatedAt is written only once');
  }
  // Both calls use the same deterministic Program id and the same conflict guard.
  const ids = new Set(programInsert(client.calls).map((c) => c.params[0]));
  assert.equal(ids.size, 1);
  for (const insert of programInsert(client.calls)) assert.match(insert.sql, /ON CONFLICT \(id\) DO NOTHING/);
  for (const insert of assignmentInsert(client.calls)) assert.match(insert.sql, /ON CONFLICT \(id\) DO NOTHING/);
});

test('the register guard is scoped to the row, account and canonical epoch', async () => {
  const client = recordingClient();
  await persistConfirmedProgram(client, input);
  const [update] = registerUpdate(client.calls);
  assert.match(update.sql, /WHERE id=\$1 AND account_id=\$3 AND dataset_epoch='CANONICAL_BACKFILL_20261026'/);
  assert.equal(update.params[2], 'wa-01');
});

test('CONFIRMED is a status the schema already allows — no migration needed', () => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
  const ddl = files.map((f) => readFileSync(new URL(f, MIGRATIONS), 'utf8')).join('\n');
  const match = ddl.match(/status text NOT NULL DEFAULT 'DRAFT' CHECK \(status IN \(([^)]*)\)\)/);
  assert.ok(match, 'escort_order_register status CHECK found');
  const allowed = match[1].split(',').map((v) => v.trim().replace(/'/g, ''));
  assert.deepEqual(allowed.sort(), ['CONFIRMED', 'DRAFT', 'REVIEW']);
  assert.ok(allowed.includes('CONFIRMED'));
});

test('no new status is invented by the write path', () => {
  const source = readFileSync(new URL('../lib/vessel-ops.ts', import.meta.url), 'utf8');
  const statusWrite = source.match(/SET status='([A-Z_]+)'/);
  assert.ok(statusWrite, 'the status write is explicit');
  assert.equal(statusWrite[1], 'CONFIRMED');
  assert.doesNotMatch(source, /SET status='(MATCHED|RESOLVED|CLOSED|DONE)'/);
});

test('the provenance of the original draft is preserved', async () => {
  const client = recordingClient();
  await persistConfirmedProgram(client, input);
  const [update] = registerUpdate(client.calls);
  // Evidence is merged, never replaced: no assignment of parsed= or reasons=,
  // and the source columns are not touched.
  assert.match(update.sql, /parsed=parsed\|\|/);
  assert.doesNotMatch(update.sql, /reasons\s*=/);
  assert.doesNotMatch(update.sql, /source_text\s*=/);
  assert.doesNotMatch(update.sql, /DELETE FROM/);
});

test('the API already counts CONFIRMED separately from REVIEW', () => {
  const route = readFileSync(new URL('../app/api/escort-register/route.ts', import.meta.url), 'utf8');
  assert.match(route, /count\(\*\) FILTER \(WHERE status='CONFIRMED'\)/);
  assert.match(route, /count\(\*\) FILTER \(WHERE status='REVIEW'\)/);
});
