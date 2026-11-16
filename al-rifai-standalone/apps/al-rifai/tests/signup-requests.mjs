import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const authRoute = source('app/api/auth/[...path]/route.ts');
const cashRoute = source('app/api/cash/[...path]/route.ts');
const migration = source('db/migration-candidates/0034_signup_requests.sql');
const signupPage = source('app/signup/page.tsx');
const signupForm = source('app/signup/request-form.tsx');
const adminView = source('app/admin/view.tsx');

test('public signup validates minimal details and never creates an active account', () => {
  const signup = authRoute.slice(authRoute.indexOf('action === "signup"'), authRoute.indexOf('// Sign in with the existing Cash Portal credential'));
  assert.match(signup, /requireUnifiedOrigin\(request\)/);
  assert.match(authRoute, /size > 4096/);
  assert.match(signup, /readSignupBody\(request\)/);
  assert.match(signup, /displayName\.length < 2/);
  assert.match(signup, /email\.length > 320/);
  assert.match(signup, /INSERT INTO public\.account_signup_requests/);
  assert.match(signup, /ON CONFLICT \(email_normalized\) DO NOTHING/);
  assert.match(signup, /return reply\(\{ok: true, status: "PENDING_REVIEW"\}, 202\)/);
  assert.doesNotMatch(signup, /INSERT INTO public\.cash_portal_users/);
  assert.doesNotMatch(signup, /INSERT INTO public\.cash_portal_sessions/);
  assert.match(signupForm, /The request could not be submitted/);
  assert.match(signupForm, /does not create an account/);
  assert.match(signupPage, /SignupRequestForm/);
});

test('prepared schema is append-only, deduplicates email and records one decision per request', () => {
  assert.match(migration, /PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION/);
  assert.match(migration, /email_normalized text GENERATED ALWAYS AS \(lower\(btrim\(email\)\)\) STORED/);
  assert.match(migration, /UNIQUE \(email_normalized\)/);
  assert.match(migration, /request_id text NOT NULL UNIQUE/);
  assert.match(migration, /actor_user_ref text NOT NULL REFERENCES public\.cash_portal_users\(id\)/);
  assert.match(migration, /CREATE TRIGGER account_signup_requests_append_only/);
  assert.match(migration, /CREATE TRIGGER account_signup_request_decisions_append_only/);
  assert.match(migration, /GRANT SELECT, INSERT ON public\.account_signup_requests/);
  assert.match(migration, /GRANT SELECT ON public\.account_signup_request_state/);
  assert.doesNotMatch(migration, /INSERT INTO public\.cash_portal_users/i);
  assert.doesNotMatch(migration, /UPDATE public\.cash_portal_users/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.cash_portal_users/i);
});

test('only the configured Super Admin can read or decide requests; decisions cannot replay', () => {
  const list = cashRoute.slice(cashRoute.indexOf('if(action==="signup-requests"&&request.method==="GET")'), cashRoute.indexOf('// ---- Cash submissions'));
  assert.match(list, /forced\(result\.user\);requireCashSuperAdmin\(result\.user\)/);
  assert.match(list, /public\.account_signup_request_state/);
  assert.match(list, /LIMIT \$\{limit\} OFFSET \$\{offset\}/);
  assert.match(list, /SELECT count\(\*\)::int AS count FROM public\.account_signup_request_state/);
  assert.match(list, /rows:rows\.rows,total:total\.rows\[0\]\?\.count\?\?0,limit,offset/);
  assert.match(list, /if\(action==="signup-requests"&&segments\[1\]&&segments\[2\]\s*===\s*"decision"\s*&&\s*request\.method\s*===\s*"POST"\)/);
  assert.match(list, /INSERT INTO public\.account_signup_request_decisions/);
  assert.match(list, /ON CONFLICT \(request_id\) DO NOTHING/);
  assert.match(list, /SIGNUP_ALREADY_DECIDED/);
  assert.match(cashRoute, /const result=await auth\(request,request\.method!=="GET"\)/);
  assert.match(list, /accountCreated:false/);
});

test('Admin approval remains separate from explicit account creation', () => {
  assert.match(adminView, /Signup Requests/);
  assert.match(adminView, /decision: 'APPROVED'/);
  assert.match(adminView, /decision: 'REJECTED'/);
  assert.match(adminView, /Prepare account/);
  assert.match(adminView, /setCreated\(value => \(\{\.\.\.value, displayName: request\.displayName, email: request\.email, role: 'USER'\}\)\)/);
  assert.match(adminView, /api\/cash\/users/);
  assert.match(adminView, /account creation remains a separate, explicit Admin action/i);
  assert.match(adminView, /signup-requests\?limit=\$\{SIGNUP_REQUEST_PAGE_SIZE\}&offset=\$\{signupOffset\}/);
  assert.match(adminView, /signupTotal/);
});
