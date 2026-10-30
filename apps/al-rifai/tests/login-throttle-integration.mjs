import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const auth=source('lib/unified-auth.ts');
const login=auth.slice(
  auth.indexOf('export async function loginWithCashCredential'),
  auth.indexOf('export async function logoutCurrent'),
);

test('unified login checks the throttle before user lookup',()=>{
  assert.match(auth,/import \{checkLoginThrottle, recordLoginFailure, recordLoginSuccess\} from ["']@\/lib\/login-throttle["']/);
  assert.ok(login.indexOf('if (!username || !password)')<login.indexOf('checkLoginThrottle(username)'));
  assert.ok(login.indexOf('checkLoginThrottle(username)')<login.indexOf('findUser(username)'));
  assert.match(login,/if \(throttle\.waitMs > 0\) throw new UnifiedAuthError\(['"]LOGIN_THROTTLED['"], 429\)/);
});

test('both unknown users and wrong passwords record a failure before the same denial',()=>{
  assert.match(login,/if \(!row \|\| !\(await verifyPassword\(password, row\.password_hash\)\)\) \{\s*await recordLoginFailure\(username\);\s*throw new UnifiedAuthError\(['"]INVALID_CREDENTIALS['"], 401\);/);
});

test('successful session creation clears throttle state before returning',()=>{
  assert.ok(login.indexOf('createSession(request, row)')<login.indexOf('recordLoginSuccess(username)'));
  assert.ok(login.indexOf('recordLoginSuccess(username)')<login.indexOf('return {'));
});

test('Cash Portal login checks the throttle after validating credentials and returns 429 when delayed',()=>{
  const legacyCash=source('app/api/cash/[...path]/route.ts');
  const legacyLogin=legacyCash.slice(legacyCash.indexOf('if(request.method==="POST"&&action==="login")'),legacyCash.indexOf('if(action==="me"'));
  assert.ok(legacyLogin.indexOf('if(!username||!password)')<legacyLogin.indexOf('checkLoginThrottle(username)'));
  assert.ok(legacyLogin.indexOf('checkLoginThrottle(username)')<legacyLogin.indexOf('findUser(username)'));
  assert.match(legacyLogin,/if\(throttle\.waitMs>0\)return reply\(\{error:"LOGIN_THROTTLED"\},429\)/);
});

test('Cash Portal login records failed credentials before returning the same denial',()=>{
  const legacyCash=source('app/api/cash/[...path]/route.ts');
  const legacyLogin=legacyCash.slice(legacyCash.indexOf('if(request.method==="POST"&&action==="login")'),legacyCash.indexOf('if(action==="me"'));
  assert.match(legacyLogin,/if\(!row\|\|!\(await verifyPassword\(password,row\.password_hash\)\)\)\{await recordLoginFailure\(username\);return reply\(\{error:"INVALID_CREDENTIALS"\},401\);\}/);
});

test('Cash Portal login clears throttle state after session creation and audit',()=>{
  const legacyCash=source('app/api/cash/[...path]/route.ts');
  const legacyLogin=legacyCash.slice(legacyCash.indexOf('if(request.method==="POST"&&action==="login")'),legacyCash.indexOf('if(action==="me"'));
  assert.ok(legacyLogin.indexOf('createSession(request,row)')<legacyLogin.indexOf('await audit('));
  assert.ok(legacyLogin.indexOf('await audit(')<legacyLogin.indexOf('recordLoginSuccess(username)'));
  assert.ok(legacyLogin.indexOf('recordLoginSuccess(username)')<legacyLogin.indexOf('return reply({user:session.user'));
});

test('Cash login adds no Retry-After header and the unified auth route does not duplicate throttle calls',()=>{
  const legacyCash=source('app/api/cash/[...path]/route.ts');
  const authRoute=source('app/api/auth/[...path]/route.ts');
  assert.doesNotMatch(legacyCash,/Retry-After/);
  assert.doesNotMatch(authRoute,/checkLoginThrottle|recordLoginFailure|recordLoginSuccess|Retry-After/);
});
