// Session-revocation parity on the Cash Portal password endpoint, and the
// 2026-11-03 Owner direction that a self-service change no longer asks for the
// current password.
//
// The three behavioural cases (3 sessions → other 2 rejected; a change with no
// current-password field succeeds; admin/unified path unchanged) are executed
// against a real server in the isolated release harness. This file pins the
// source invariants that make those behaviours hold, so a refactor cannot
// silently remove the protection that remains.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const cashRoute = source('app/api/cash/[...path]/route.ts');
const portal = source('lib/cash-portal.ts');
const unified = source('lib/unified-auth.ts');
const policy = source('lib/password-policy.ts');

const passwordBlock = (() => {
  const start = cashRoute.indexOf('if(action==="password"&&request.method==="POST")');
  assert.ok(start > -1, 'cash password handler present');
  return cashRoute.slice(start, cashRoute.indexOf('if(action==="users"', start));
})();

test('one revocation implementation is shared by both password paths', () => {
  // The SQL lives only in the session store, not duplicated per route.
  const sqlCount = (portal.match(/DELETE FROM public\.cash_portal_sessions/g) || []).length;
  assert.equal(sqlCount, 1);
  assert.doesNotMatch(unified, /DELETE FROM public\.cash_portal_sessions/);
  // The admin reset path may delete every session for its target, but the
  // self-service handler must not carry its own copy of the "except caller" SQL.
  assert.doesNotMatch(passwordBlock, /DELETE FROM public\.cash_portal_sessions/);
  assert.match(unified, /revokeOtherSessions\(row\.id, currentToken\)/);
  assert.match(passwordBlock, /revokeOtherSessions\(row\.id,result\.token\)/);
});

test('a successful change revokes other sessions and keeps the caller signed in', () => {
  // The caller's own token is the one excluded from the delete.
  assert.match(portal, /user_id=\$1 AND \(\$2='' OR id<>\$2\)/);
  assert.match(portal, /return Number\(revoked\.rows\[0\]\?\.n\?\?0\)/);
  assert.ok(passwordBlock.indexOf('revokeOtherSessions') > passwordBlock.indexOf('UPDATE public.cash_portal_users'));
  // The audit row records how many sessions were removed.
  assert.match(passwordBlock, /audit\(row\.id,row\.id,"PASSWORD_CHANGED",\{surface:"cash",otherSessionsRevoked\}\)/);
  assert.match(passwordBlock, /otherSessionsRevoked\}/);
});

test('a self-service change requires the session, not a re-typed old password', () => {
  // Owner direction 2026-11-03: the current-password prompt is gone from the
  // Cash Portal form and from the unified/Admin form.
  assert.doesNotMatch(passwordBlock, /CURRENT_PASSWORD_INVALID/);
  assert.doesNotMatch(passwordBlock, /verifyPassword/);
  assert.doesNotMatch(passwordBlock, /currentPassword/);
  assert.doesNotMatch(unified, /async function changeOwnPassword[\s\S]{0,600}CURRENT_PASSWORD_INVALID/);

  // The session boundary is still enforced: the shared auth() helper validates
  // the cookie and the CSRF token for every mutation before this block runs.
  assert.match(cashRoute, /await auth\(request,request\.method!=="GET"\)/);
  assert.match(passwordBlock, /const row=await userById\(result\.user\.id\)/);
  assert.match(passwordBlock, /if\(!row\)return reply\(\{error:"AUTHENTICATION_REQUIRED"\},401\)/);

  // Renaming the login identity is a different operation and still asks for the
  // password; removing that was never part of the instruction.
  assert.match(unified, /async function changeOwnUsername[\s\S]*verifyPassword\(current, row\.password_hash\)/);
});

test('the new credential is still hashed, confirmed and length-checked', () => {
  // No plaintext can reach the column: the hash call is the only write source.
  assert.match(passwordBlock, /const encoded=await hashPassword\(next\)/);
  assert.match(passwordBlock, /PASSWORD_CONFIRMATION_MISMATCH/);
  // Length and byte cap come from one shared rule, not a literal in the route.
  assert.match(passwordBlock, /isAcceptablePassword\(next\)/);
  assert.match(portal, /if\(!isAcceptablePassword\(password\)\)throw new Error\("PASSWORD_POLICY"\)/);
  assert.match(unified, /if \(!isAcceptablePassword\(next\)\) throw new UnifiedAuthError\('PASSWORD_POLICY', 400\)/);
  assert.match(policy, /export const MIN_PASSWORD_LENGTH = 8;/);
  assert.match(policy, /value\.length >= MIN_PASSWORD_LENGTH/);
  // No surface may reintroduce a 12-character literal.
  for (const [name, text] of [['cash route', cashRoute], ['unified', unified], ['portal', portal]]) {
    assert.doesNotMatch(text, /length\s*<\s*12/, `${name} carries no 12-character literal`);
  }
});

test('the existing guards, policy and cookie attributes are untouched', () => {
  assert.match(portal, /__Host-alrifai_cash/);
  assert.match(portal, /HttpOnly; Secure; SameSite=Strict/);
  // CSRF is enforced by the shared auth() helper the route calls for mutations.
  assert.match(portal, /x-csrf-token/);
  assert.match(cashRoute, /function requireOrigin|requireOrigin\(request\)/);
  assert.match(passwordBlock, /PASSWORD_POLICY/);
  assert.match(passwordBlock, /PASSWORD_CONFIRMATION_MISMATCH/);
  // The admin reset path still removes every session for the target.
  assert.match(cashRoute, /DELETE FROM public\.cash_portal_sessions WHERE user_id=\$1/);
});
