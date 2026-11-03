// Password policy and change-flow shape (Owner direction 2026-11-03).
//
// Two rules are pinned here:
//   1. One minimum length, eight characters, defined once and imported by the
//      server routes, the hashing function and all three client forms.
//   2. A self-service password change is authorised by the session and CSRF
//      token, not by re-typing the old password. Renaming the login identity is
//      a different operation and still requires it.
//
// Everything else about the flow — the session check, CSRF, hashing, the
// confirmation field and the other-session revocation — must survive.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const policy = source('lib/password-policy.ts');
const admin = source('app/admin/view.tsx');
const login = source('app/login/view.tsx');
const cashPage = source('app/cash/page.tsx');
const unified = source('lib/unified-auth.ts');
const cashRoute = source('app/api/cash/[...path]/route.ts');
const portal = source('lib/cash-portal.ts');

test('the minimum length is eight characters, defined exactly once', () => {
  assert.match(policy, /export const MIN_PASSWORD_LENGTH = 8;/);
  assert.equal((policy.match(/MIN_PASSWORD_LENGTH = \d+/g) || []).length, 1);

  // Every surface that sets a credential imports the constant.
  for (const [name, text] of [['admin view', admin], ['login view', login], ['cash page', cashPage]]) {
    assert.match(text, /from '@\/lib\/password-policy'|from "@\/lib\/password-policy"/, `${name} imports the policy`);
    assert.match(text, /MIN_PASSWORD_LENGTH/, `${name} uses the constant`);
  }
  for (const [name, text] of [['cash portal', portal], ['unified auth', unified], ['cash route', cashRoute]]) {
    assert.match(text, /isAcceptablePassword/, `${name} enforces the shared rule`);
  }
});

test('no surface still asks for a twelve-character password', () => {
  for (const [name, text] of [['admin view', admin], ['login view', login], ['cash page', cashPage]]) {
    assert.doesNotMatch(text, /minLength=\{12\}/, `${name} has no 12 minimum`);
    assert.doesNotMatch(text, /at least 12|12\+ characters|১২ অক্ষর/, `${name} has no 12-character copy`);
  }
  for (const [name, text] of [['cash route', cashRoute], ['unified auth', unified], ['cash portal', portal]]) {
    assert.doesNotMatch(text, /length\s*<\s*12/, `${name} has no 12-character literal`);
  }
  // The user-visible policy message names the real minimum.
  assert.match(admin, /PASSWORD_POLICY: 'The new password must be at least 8 characters\.'/);
  assert.match(login, /PASSWORD_POLICY: 'The new password must be at least 8 characters\.'/);
  assert.match(cashPage, /PASSWORD_POLICY:"নতুন password কমপক্ষে ৮ অক্ষরের হতে হবে।"/);
});

test('the three change-password forms ask for the new password only', () => {
  // Admin console.
  assert.doesNotMatch(admin, /selfPassword\.currentPassword/);
  assert.doesNotMatch(admin, /<Label htmlFor="currentPassword">Current password<\/Label>\s*<Input id="currentPassword"[\s\S]{0,200}selfPassword/);
  assert.match(admin, /id="newPassword"[\s\S]{0,220}selfPassword\.newPassword/);
  assert.match(admin, /id="confirmPassword"[\s\S]{0,220}selfPassword\.confirmPassword/);

  // Forced first-login change.
  assert.doesNotMatch(login, /needsCurrentPassword/);
  assert.doesNotMatch(login, /change\.currentPassword/);
  assert.match(login, /useState\(\{newPassword: '', confirmPassword: ''\}\)/);

  // Cash Portal.
  assert.doesNotMatch(cashPage, /password\.currentPassword/);
  assert.match(cashPage, /password\.newPassword/);
  assert.match(cashPage, /password\.confirmPassword/);
});

test('the server keeps the session boundary, CSRF, hashing and confirmation', () => {
  const passwordBlock = (() => {
    const start = cashRoute.indexOf('if(action==="password"&&request.method==="POST")');
    assert.ok(start > -1);
    return cashRoute.slice(start, cashRoute.indexOf('if(action==="users"', start));
  })();
  // Session + CSRF come from the shared helper that runs before the handler.
  assert.match(cashRoute, /await auth\(request,request\.method!=="GET"\)/);
  assert.match(passwordBlock, /const row=await userById\(result\.user\.id\)/);
  assert.match(passwordBlock, /AUTHENTICATION_REQUIRED/);
  // No old-password verification anywhere in the change path.
  assert.doesNotMatch(passwordBlock, /verifyPassword/);
  // The new credential is derived, not stored in clear, and must be confirmed.
  assert.match(passwordBlock, /const encoded=await hashPassword\(next\)/);
  assert.match(passwordBlock, /PASSWORD_CONFIRMATION_MISMATCH/);
  assert.match(portal, /pbkdf2-sha256:600000:/);
  assert.match(portal, /timingSafeEqual/);
  // The unified path behaves the same way and still revokes other sessions.
  assert.match(unified, /revokeOtherSessions\(row\.id, currentToken\)/);
  assert.match(unified, /audit\(row\.id, row\.id, 'PASSWORD_CHANGED'/);
  // No bcrypt anywhere: the deployment uses PBKDF2-SHA256.
  assert.doesNotMatch(unified + cashRoute + portal, /bcrypt/i);
});

test('admin reset and account creation share the same minimum', () => {
  assert.match(cashRoute, /!displayName\|\|!isAcceptablePassword\(password\)/);
  assert.match(cashRoute, /if\(!id\|\|!isAcceptablePassword\(next\)\)return reply\(\{error:"PASSWORD_POLICY"\},400\)/);
  // A reset still signs the target out of every session.
  assert.match(cashRoute, /DELETE FROM public\.cash_portal_sessions WHERE user_id=\$1/);
});

test('renaming the login identity still requires the current password', () => {
  // Documented exception: /admin "Change username" was not part of the
  // instruction, and dropping the check there would let any live session
  // rename the account.
  assert.match(admin, /rename\.currentPassword/);
  assert.match(unified, /async function changeOwnUsername[\s\S]*?verifyPassword\(current, row\.password_hash\)/);
});
