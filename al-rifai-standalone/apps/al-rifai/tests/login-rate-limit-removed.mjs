// The legacy IP-bucket limiter was removed by policy (single-owner system;
// its shared bucket locked the Owner out). A username-keyed, hashed,
// fail-open throttle is permitted in lib/login-throttle.ts.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const files = [
  'lib/cash-portal.ts',
  'lib/unified-auth.ts',
  'app/api/cash/[...path]/route.ts',
  'app/login/view.tsx',
  'app/cash/page.tsx',
];
const forbidden = /loginRateLimited|noteLoginFailure|clearLoginFailures|loginFailures|TOO_MANY_ATTEMPTS|Retry-After|clientKey/;

test('no legacy IP-bucket rate limiter remains', () => {
  for (const path of files) assert.doesNotMatch(source(path), forbidden, path);
});

test('the Cash login still verifies the stored credential and issues the session cookie', () => {
  const route = source('app/api/cash/[...path]/route.ts');
  const login = route.slice(route.indexOf('if(request.method==="POST"&&action==="login")'), route.indexOf('if(action==="me"'));
  assert.match(login, /requireOrigin\(request\)/);
  assert.match(login, /verifyPassword\(password,row\.password_hash\)/);
  assert.match(login, /INVALID_CREDENTIALS/);
  assert.ok(login.indexOf('if(!username||!password)') < login.indexOf('checkLoginThrottle(username)'));
  assert.match(login, /if\(throttle\.waitMs>0\)return reply\(\{error:"LOGIN_THROTTLED"\},429\)/);
  assert.match(login, /recordLoginFailure\(username\);return reply\(\{error:"INVALID_CREDENTIALS"\},401\)/);
  assert.match(login, /createSession\(request,row\)/);
  assert.ok(login.indexOf('await audit(') < login.indexOf('recordLoginSuccess(username)'));
  assert.ok(login.indexOf('recordLoginSuccess(username)') < login.indexOf('return reply({user:session.user'));
  assert.match(login, /Set-Cookie/);
});

test('the username-keyed throttle is integrated into the unified login path', () => {
  const auth = source('lib/unified-auth.ts');
  assert.match(auth, /checkLoginThrottle/, 'checkLoginThrottle call missing');
  assert.match(auth, /recordLoginFailure/, 'recordLoginFailure call missing');
  assert.match(auth, /recordLoginSuccess/, 'recordLoginSuccess call missing');
  assert.match(auth, /LOGIN_THROTTLED/, 'LOGIN_THROTTLED error code missing');
  const login = auth.slice(auth.indexOf('export async function loginWithCashCredential'), auth.indexOf('export async function logoutCurrent'));
  assert.ok(login.indexOf('checkLoginThrottle(username)') < login.indexOf('findUser(username)'));
  assert.match(login, /if \(!row \|\| !\(await verifyPassword[\s\S]*?recordLoginFailure\(username\)/);
  assert.ok(login.indexOf('createSession(request, row)') < login.indexOf('recordLoginSuccess(username)'));
});
