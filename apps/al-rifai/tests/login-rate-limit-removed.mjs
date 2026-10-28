// Static guard: the login rate limiter was removed by policy (single-owner
// system; the shared bucket locked the Owner out). None of its code may return.
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

test('no login rate-limit function, bucket, lockout or status code remains', () => {
  for (const path of files) assert.doesNotMatch(source(path), forbidden, path);
});

test('the Cash login still verifies the stored credential and issues the session cookie', () => {
  const route = source('app/api/cash/[...path]/route.ts');
  const login = route.slice(route.indexOf('if(request.method==="POST"&&action==="login")'), route.indexOf('if(action==="me"'));
  assert.match(login, /requireOrigin\(request\)/);
  assert.match(login, /verifyPassword\(password,row\.password_hash\)/);
  assert.match(login, /INVALID_CREDENTIALS/);
  assert.match(login, /createSession\(request,row\)/);
  assert.match(login, /Set-Cookie/);
});
