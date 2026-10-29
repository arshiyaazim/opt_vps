// Cash Portal USER lifecycle.
//
// Static invariants always run. The live lifecycle runs only when BOTH
// ALRIFAI_LIFECYCLE_BASE is set AND ALRIFAI_LIFECYCLE_ALLOW_WRITES is exactly
// "isolated-harness-only", and never against a production host. The canonical
// suite therefore never writes to production.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const route = source('app/api/cash/[...path]/route.ts');
const portal = source('lib/cash-portal.ts');

test('static: USER lifecycle guards are present in the Cash route and portal', () => {
  assert.match(route, /if\(action==="users"&&request\.method==="POST"\)\{requireAdmin\(result\.user\)/);
  assert.match(route, /if\(result\.user\.mustChangePassword&&!\['password','summary','profile','logout'\]\.includes\(action\)\)forced\(result\.user\);/);
  assert.match(route, /action==="summary"&&request\.method==="GET"\)\{\s*requireCashSuperAdmin\(result\.user\)/);
  assert.match(route, /const otherSessionsRevoked=await revokeOtherSessions\(row\.id,result\.token\);/);
  assert.match(route, /state:"PENDING_REVIEW",duplicate,postingAuthorized:false/);
  assert.match(route, /SUBMISSION_SCHEMA_DEPENDENCY/);
  assert.match(portal, /"SUPER_ADMIN_REQUIRED",403/);
  assert.match(portal, /HttpOnly; Secure; SameSite=Strict/);
});

const BASE = process.env.ALRIFAI_LIFECYCLE_BASE || '';
const ORIGIN = process.env.ALRIFAI_LIFECYCLE_ORIGIN || '';
const ARMED = process.env.ALRIFAI_LIFECYCLE_ALLOW_WRITES === 'isolated-harness-only';
const live = BASE && ARMED ? test : test.skip;

function refuseProduction(base) {
  const host = new URL(base).hostname;
  if (/(^|\.)iamazim\.com$/.test(host)) throw new Error(`refusing lifecycle writes against ${host}`);
}

async function call(method, path, {body, cookie, csrf} = {}) {
  const headers = {origin: ORIGIN};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = `__Host-alrifai_cash=${cookie}`;
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(`${BASE}${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  const json = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie') || '';
  return {status: res.status, json, setCookie, cookie: (setCookie.match(/__Host-alrifai_cash=([a-f0-9]{64})/) || [])[1] || null};
}
const login = (username, password) => call('POST', '/api/cash/login', {body: {username, password}});

live('USER lifecycle: create, login, scope, forced change, submission, revocation, cleanup', async () => {
  refuseProduction(BASE);
  const adminUser = process.env.ALRIFAI_LIFECYCLE_ADMIN_USER;
  const adminPass = process.env.ALRIFAI_LIFECYCLE_ADMIN_PASS;
  assert.ok(adminUser && adminPass, 'admin credentials are required for the live lifecycle');

  const admin = await login(adminUser, adminPass);
  assert.equal(admin.status, 200);

  const username = `lifecycle${Date.now().toString(36)}`;
  const tempPassword = 'TempPass123456';
  const chosen = 'ChosenPass123456';
  let userId = null;
  try {
    // a. create USER, forced-change flag reported
    const created = await call('POST', '/api/cash/users', {
      body: {username, password: tempPassword, displayName: 'Lifecycle Test', role: 'USER'},
      cookie: admin.cookie, csrf: admin.json.csrf,
    });
    assert.equal(created.status, 201);
    userId = created.json.id;
    const listed = await call('GET', '/api/cash/users', {cookie: admin.cookie});
    assert.equal(listed.json.users.find((u) => u.username === username)?.mustChangePassword, true);

    // b. login, session cookie attributes
    const s1 = await login(username, tempPassword);
    assert.equal(s1.status, 200);
    assert.equal(s1.json.user.role, 'USER');
    assert.match(s1.setCookie, /^__Host-alrifai_cash=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict/);

    // c. USER identity; Owner-only data refused
    const me = await call('GET', '/api/cash/me', {cookie: s1.cookie});
    assert.equal(me.status, 200);
    assert.equal(me.json.user.role, 'USER');
    const summary = await call('GET', '/api/cash/summary', {cookie: s1.cookie});
    assert.equal(summary.status, 403);
    assert.equal(summary.json.error, 'SUPER_ADMIN_REQUIRED');

    // d. forced change blocks submissions until the password is changed
    const blocked = await call('POST', '/api/cash/submissions', {body: {}, cookie: s1.cookie, csrf: me.json.csrf});
    assert.equal(blocked.json.error, 'PASSWORD_CHANGE_REQUIRED');
    const changed = await call('POST', '/api/cash/password', {
      body: {currentPassword: tempPassword, newPassword: chosen, confirmPassword: chosen},
      cookie: s1.cookie, csrf: me.json.csrf,
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.json.otherSessionsRevoked, 0);
    const me2 = await call('GET', '/api/cash/me', {cookie: s1.cookie});
    assert.equal(me2.json.user.mustChangePassword, false);

    // e. submission: 201 PENDING_REVIEW when 0031 is applied, explicit 503 when it is not
    const sub = await call('POST', '/api/cash/submissions', {
      body: {employeeName: 'Lifecycle Employee', employeeMobile: '01712345678', payoutMobile: '01812345678',
        method: 'bkash', amount: '100', purpose: 'LIFECYCLE TEST', date: '2026-10-29'},
      cookie: s1.cookie, csrf: me2.json.csrf,
    });
    if (sub.status === 503) {
      assert.equal(sub.json.error, 'MIGRATION_0031_CASH_SUBMISSIONS_NOT_APPLIED');
    } else {
      assert.equal(sub.status, 201);
      assert.equal(sub.json.state, 'PENDING_REVIEW');
      assert.equal(sub.json.postingAuthorized, false);
    }

    // f. a password change revokes every other session of this account
    const a = await login(username, chosen);
    const b = await login(username, chosen);
    const c = await login(username, chosen);
    const cMe = await call('GET', '/api/cash/me', {cookie: c.cookie});
    const rev = await call('POST', '/api/cash/password', {
      body: {currentPassword: chosen, newPassword: 'FinalPass123456', confirmPassword: 'FinalPass123456'},
      cookie: c.cookie, csrf: cMe.json.csrf,
    });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.otherSessionsRevoked, 3);
    for (const dead of [s1, a, b]) assert.equal((await call('GET', '/api/cash/me', {cookie: dead.cookie})).status, 401);
    assert.equal((await call('GET', '/api/cash/me', {cookie: c.cookie})).status, 200);

    // Admin is unaffected
    assert.equal((await call('GET', '/api/cash/summary?limit=1', {cookie: admin.cookie})).status, 200);
    assert.equal((await call('GET', '/api/cash/users', {cookie: admin.cookie})).status, 200);
  } finally {
    // Cleanup: the app has no delete endpoint for accounts, so the test user is deactivated.
    if (userId) {
      await call('PATCH', `/api/cash/users/${userId}`, {body: {active: false}, cookie: admin.cookie, csrf: admin.json.csrf});
    }
  }
});
