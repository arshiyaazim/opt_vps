// Vessel command input/policy regressions (no database).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCommand} from '../lib/vessel-commands.ts';
import {
  assertCanCommandVessel, assertCanReadVessel, canReadVessel, canCommandVessel, commandActorFromEnv, mapCommandError,
  MIGRATION_DEPENDENCY, VesselCommandError,
} from '../lib/vessel-command-policy.ts';

const commandRoute = readFileSync(new URL('../app/api/vessel-programs/route.ts', import.meta.url), 'utf8');
const base = {commandKey: 'cmd-key-0001'};
const invalid = (input) => { try { parseCommand(input); return null; } catch (error) { return error; } };

test('add requires deterministic identity fields and rejects extra input', () => {
  assert.ok(invalid({...base, action: 'add', motherVessel: 'A', lighterVessel: 'B'}));
  assert.ok(invalid({...base, action: 'add', motherVessel: 'A', lighterVessel: 'B', startDate: '2026-10-03', shift: 'X'}));
  assert.ok(invalid({...base, action: 'add', motherVessel: 'A', lighterVessel: 'B', startDate: '2026-10-03', shift: 'D', actor: 'person-1'}));
  const ok = parseCommand({...base, action: 'add', motherVessel: 'A', lighterVessel: 'B', startDate: '2026-10-03', shift: 'D'});
  assert.equal(ok.action, 'add');
});

test('edit/assign/void validate revisions, mobiles, shifts and reasons', () => {
  assert.ok(invalid({...base, action: 'edit', programId: 'p1', expectedRevision: -1, patch: {destination: 'X'}}));
  assert.ok(invalid({...base, action: 'edit', programId: 'p1', expectedRevision: 0, patch: {}}));
  assert.ok(invalid({...base, action: 'edit', programId: 'p1', expectedRevision: 0, patch: {secret: 'x'}}));
  assert.ok(!invalid({...base, action: 'edit', programId: 'p1', expectedRevision: 0, patch: {destination: 'X'}}));
  assert.ok(invalid({...base, action: 'assign', programId: 'p1', expectedRevision: 0, employeeMobile: '0175433440', startDate: '2026-10-03', startShift: 'D'}));
  assert.ok(!invalid({...base, action: 'assign', programId: 'p1', expectedRevision: 0, employeeMobile: '01754334400', startDate: '2026-10-03', startShift: 'D'}));
  assert.ok(invalid({...base, action: 'void', programId: 'p1', expectedRevision: 0, reason: 'no'}));
  assert.ok(!invalid({...base, action: 'void', programId: 'p1', expectedRevision: 0, reason: 'duplicate confirmed'}));
});

test('command keys must be present and well formed', () => {
  assert.ok(invalid({action: 'void', programId: 'p1', expectedRevision: 0, reason: 'duplicate confirmed'}));
  assert.ok(invalid({...base, commandKey: 'x', action: 'void', programId: 'p1', expectedRevision: 0, reason: 'duplicate confirmed'}));
  assert.ok(invalid({...base, commandKey: 'bad key with spaces', action: 'void', programId: 'p1', expectedRevision: 0, reason: 'duplicate confirmed'}));
});

test('only the Owner/admin validation identity may command', () => {
  assert.equal(canCommandVessel({userId: 'local-validator'}), true);
  assert.equal(canCommandVessel({userId: 'someone-else'}), false);
  assert.equal(canCommandVessel(null), false);
  assert.throws(() => assertCanCommandVessel(null), (error) => error instanceof VesselCommandError && error.code === 'AUTHENTICATION_REQUIRED');
  assert.throws(() => assertCanCommandVessel({userId: 'x'}), (error) => error instanceof VesselCommandError && error.code === 'VESSEL_COMMAND_FORBIDDEN');
});

test('Vessel detail reads require the verified vessel.read capability; command access stays separate', () => {
  const reader = {userId: 'user-1', role: 'USER', capabilities: ['cash.read', 'vessel.read']};
  assert.equal(canReadVessel(reader), true);
  assert.equal(canReadVessel({userId: 'admin-1', role: 'ADMIN', capabilities: ['vessel.read']}), true);
  assert.equal(canReadVessel({userId: 'user-2', role: 'USER', capabilities: ['cash.read']}), false);
  assert.equal(canReadVessel({userId: 'user-3', role: 'USER', capabilities: []}), false);
  assert.equal(canReadVessel({userId: 'local-validator'}), true);
  assert.throws(() => assertCanReadVessel(null), (error) => error instanceof VesselCommandError && error.status === 401);
  assert.throws(() => assertCanReadVessel({userId: 'user-2', role: 'USER', capabilities: []}),
    (error) => error instanceof VesselCommandError && error.code === 'VESSEL_READ_FORBIDDEN' && error.status === 403);
  assert.equal(canCommandVessel(reader), false, 'read permission does not grant Vessel commands');
});

test('Vessel API keeps capability-checked reads separate from Owner-only commands', () => {
  const get = commandRoute.slice(commandRoute.indexOf('export async function GET'), commandRoute.indexOf('export async function POST'));
  const post = commandRoute.slice(commandRoute.indexOf('export async function POST'));
  assert.match(get, /assertCanReadVessel\(user\)/);
  assert.doesNotMatch(get, /assertCanCommandVessel/);
  assert.match(post, /assertCanCommandVessel\(user\)/);
  assert.doesNotMatch(post, /assertCanReadVessel/);
  assert.doesNotMatch(post, /INSERT INTO public\.cash_(?:postings|ledger)/i);
});

test('actor identity comes from server configuration only', () => {
  assert.deepEqual(commandActorFromEnv({ALRIFAI_VESSEL_COMMAND_ACTOR: 'person-1'}), {ref: 'person-1'});
  assert.deepEqual(commandActorFromEnv({ALRIFAI_CASH_OWNER_PERSON_REF: 'contact-1'}), {ref: 'contact-1'});
  assert.throws(() => commandActorFromEnv({}), (error) => error instanceof VesselCommandError && error.code === 'VESSEL_COMMAND_ACTOR_NOT_CONFIGURED');
});

test('database errors map to safe statuses without leaking details', () => {
  assert.equal(mapCommandError({code: '42P01'}).code, MIGRATION_DEPENDENCY);
  assert.equal(mapCommandError(new Error('REVISION_CONFLICT')).status, 409);
  assert.equal(mapCommandError(new Error('PROGRAM_NOT_FOUND')).status, 404);
  assert.equal(mapCommandError(new Error('ASSIGNMENT_EXISTS_USE_REPLACE')).status, 409);
  assert.equal(mapCommandError(new Error('VERIFIED_ACTOR_REQUIRED')).status, 400);
  assert.equal(mapCommandError(new Error('relation "x" does not exist')).code, 'VESSEL_COMMAND_FAILED');
  assert.equal(mapCommandError({code: '42501'}).status, 403);
});
