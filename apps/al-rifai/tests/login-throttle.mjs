import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const throttle=source('lib/login-throttle.ts');
const migration=source('db/migration-candidates/0036_login_throttle.sql');

test('throttle schema stores only hashed state and grants the runtime role',()=>{
  const definition=migration.slice(migration.indexOf('CREATE TABLE public.login_throttle_state'),migration.indexOf('\n);')+3);
  assert.match(migration,/PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION/);
  assert.match(migration,/CREATE TABLE public\.login_throttle_state/);
  assert.match(migration,/REVOKE ALL ON public\.login_throttle_state FROM PUBLIC/);
  assert.match(migration,/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.login_throttle_state TO ir_review_runtime/);
  assert.doesNotMatch(definition,/username|email|password|client_ip/i);
});

test('throttle hashes normalized usernames, caps delay, and prunes aged rows',()=>{
  assert.match(throttle,/createHash\("sha256"\)/);
  assert.match(throttle,/value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(throttle,/FREE_FAILURES=5/);
  assert.match(throttle,/WINDOW_MS=15\*60_000/);
  assert.match(throttle,/MAX_DELAY_MS=30_000/);
  assert.match(throttle,/loginThrottleDelayMs/);
  assert.match(throttle,/Math\.min\(row!\.failures\+1,10_000\)/);
  assert.match(throttle,/Math\.min\(1_000\*2\*\*\(failures-FREE_FAILURES-1\),MAX_DELAY_MS\)/);
  assert.match(throttle,/RETENTION_MS=24\*60\*60_000/);
  assert.match(throttle,/updated_at < now\(\) - make_interval/);
  assert.doesNotMatch(throttle,/x-forwarded-for|clientAddress/);
});

test('the throttle is integrated into unified and Cash Portal login routes, not duplicated in the auth route',()=>{
  const auth=source('lib/unified-auth.ts');
  assert.match(auth,/checkLoginThrottle/);
  assert.match(auth,/recordLoginFailure/);
  assert.match(auth,/recordLoginSuccess/);
  const cash=source('app/api/cash/[...path]/route.ts');
  assert.match(cash,/checkLoginThrottle/);
  assert.match(cash,/recordLoginFailure/);
  assert.match(cash,/recordLoginSuccess/);
  assert.doesNotMatch(source('app/api/auth/[...path]/route.ts'),/checkLoginThrottle|recordLoginFailure|recordLoginSuccess/);
});
