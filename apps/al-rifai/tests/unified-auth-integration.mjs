// Unified authentication wiring and Owner-preservation assertions.
//
// These tests read the shipped source and migration candidate. They exist to
// stop a future change from silently:
//   * removing the working legacy credential or the Cash login path,
//   * replacing the deployed session cookie or identity store,
//   * auto-creating, renaming, disabling or re-hashing the Owner account,
//   * letting a client-supplied role reach an authorization decision,
//   * weakening the fail-closed entry proxy.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {isPathAllowed} from '../release/entry-rules.mjs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const proxy = source('proxy.ts');
const cashPortal = source('lib/cash-portal.ts');
const cashRoute = source('app/api/cash/[...path]/route.ts');
const unifiedPolicy = source('lib/unified-auth-policy.ts');
const unifiedDb = source('lib/unified-auth-db.ts');
const unified = source('lib/unified-auth.ts');
const authRoute = source('app/api/auth/[...path]/route.ts');
const chatgptAuth = source('app/chatgpt-auth.ts');
const platformProtected = source('app/platform/protected.tsx');
const nav = source('app/platform/nav.ts');
const adminPage = source('app/admin/page.tsx');
const loginPage = source('app/login/page.tsx');
const migration = source('db/migration-candidates/0033_unified_auth_sessions.sql');

test('the legacy Basic credential remains the first and always-accepted check', () => {
  const basic = proxy.indexOf('validationIdentity(request.headers.get("authorization"))');
  const disabled = proxy.indexOf('if(mode==="off")return unauthorized();');
  const session = proxy.indexOf('await sessionIdentityFromCookieHeader');
  assert.ok(basic > -1 && disabled > -1 && session > -1);
  assert.ok(basic < disabled, 'Basic is evaluated before the unified mode branch');
  assert.ok(disabled < session, 'mode off returns before any session lookup');
  assert.match(proxy, /WWW-Authenticate/);
});

test('the proxy only trusts a database-validated session and only in on mode', () => {
  assert.match(proxy, /if\(mode==="on"\)\{[\s\S]*await sessionIdentityFromCookieHeader/);
  assert.match(proxy, /if\(prefersDocumentNavigation\(request\.headers\)\)/);
  assert.match(proxy, /url\.pathname="\/login"/);
  assert.match(proxy, /sanitizeReturnTo\(/);
  // The sign-in redirect must live inside the `on` branch: in shadow the legacy
  // 401 challenge is what lets the browser offer the only credential that can
  // open the workspace (2026-10-28 click-through dead end).
  const onBranch = proxy.indexOf('if(mode==="on"){');
  const redirect = proxy.indexOf('if(prefersDocumentNavigation(request.headers))');
  const fallback = proxy.lastIndexOf('return unauthorized();');
  assert.ok(onBranch > -1 && redirect > -1 && fallback > -1);
  assert.ok(onBranch < redirect, 'document redirects are inside the on-mode branch');
  assert.ok(redirect < fallback, 'the fail-closed challenge is the final fallback');
  // The Cash portal stays exempt and keeps its own boundary.
  assert.match(proxy, /isCashPortalPath\(pathname\)/);
  assert.match(proxy, /pathname===HEALTH_PATH/);
});

test('the Cash session cookie, hashing and session rules are unchanged', () => {
  assert.match(cashPortal, /const COOKIE="__Host-alrifai_cash"/);
  assert.match(cashPortal, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(cashPortal, /pbkdf2-sha256:600000/);
  assert.match(cashPortal, /timingSafeEqual/);
  assert.match(cashPortal, /const SESSION_MS=8\*60\*60\*1000/);
  assert.match(cashPortal, /const IDLE_MS=30\*60\*1000/);
  assert.match(cashPortal, /cash_portal_sessions/);
  // Storage is a hash of the opaque token, never the token itself.
  assert.match(cashPortal, /hashToken\(token\)/);
});

test('the unified layer adds no second identity store and no automatic credential write', () => {
  for (const text of [unified, unifiedDb, authRoute]) {
    assert.doesNotMatch(text, /CREATE TABLE/i);
    assert.doesNotMatch(text, /INSERT INTO public\.cash_portal_users/i);
    assert.doesNotMatch(text, /DELETE FROM public\.cash_portal_users/i);
  }
  // Credential writes exist only inside explicit, password-confirmed actions.
  const passwordUpdate = unified.match(/UPDATE public\.cash_portal_users SET password_hash/g) || [];
  const usernameUpdate = unified.match(/UPDATE public\.cash_portal_users SET username=/g) || [];
  assert.equal(passwordUpdate.length, 1);
  assert.equal(usernameUpdate.length, 1);
  assert.match(unified, /async function changeOwnPassword[\s\S]*verifyPassword\(current,row\.password_hash\)|changeOwnPassword[\s\S]*verifyPassword/);
  assert.match(unified, /verifyPassword\(current, row\.password_hash\)/);
  assert.equal((unified.match(/verifyPassword\(current, row\.password_hash\)/g) || []).length, 2);
});

test('login reuses the stored Cash credential verification path', () => {
  assert.match(unified, /findUser\(username\)/);
  assert.match(unified, /verifyPassword\(password, row\.password_hash\)/);
  assert.match(unified, /createSession\(request, row\)/);
  assert.match(unified, /requireUnifiedOrigin\(request\)/);
  // Login throttling was removed by policy (single-owner system); see login-rate-limit-removed.mjs.
  assert.doesNotMatch(unified, /loginRateLimited|noteLoginFailure|clearLoginFailures/);
  assert.match(authRoute, /Set-Cookie/);
  assert.match(authRoute, /cookieHeader\(result\.token\)/);
  assert.match(authRoute, /sanitizeReturnTo/);
  // No password is ever logged or echoed back.
  assert.doesNotMatch(authRoute, /console\.(log|error)\([^)]*password/iu);
  assert.doesNotMatch(unified, /console\.(log|error)\([^)]*password/iu);
});

test('the session loader fails closed and refuses inactive or expired rows', () => {
  assert.match(unifiedDb, /if \(!row \|\| !row\.active\) return null/);
  assert.match(unifiedDb, /now >= new Date\(row\.expires_at\)\.getTime\(\)\) return null/);
  assert.match(unifiedDb, /IDLE_MS\) return null/);
  assert.match(unifiedDb, /catch \{\s*return null;\s*\}/);
  assert.match(unifiedDb, /cash_portal_sessions/);
  assert.match(unifiedDb, /resolveCapabilities\(row\.role, row\.capabilities\)/);
  assert.match(unifiedDb, /isCashSuperAdmin/);
});

test('authorization is derived server-side and never from a client-supplied role', () => {
  assert.match(chatgptAuth, /role:identity\.role/);
  assert.match(chatgptAuth, /superAdmin:identity\.superAdmin/);
  assert.doesNotMatch(chatgptAuth, /searchParams|body\.role|headers\(\)\.get\("x-role"\)/);
  assert.match(platformProtected, /user\.superAdmin===true/);
  assert.match(adminPage, /user\.superAdmin !== true \|\| user\.role !== 'ADMIN'\) redirect\('\/dashboard'\)/);
  assert.match(adminPage, /redirect\('\/login\?next=%2Fadmin'\)/);
  // The Admin Panel nav entry is restricted and hidden from non-super users.
  assert.match(nav, /href:"\/admin"[\s\S]*restricted:true/);
  const shell = source('app/platform/app-shell.tsx');
  assert.match(shell, /!item\.restricted\|\|user\.superAdmin===true/);
});

test('admin actions keep server-side policy guards in the Cash API', () => {
  assert.match(cashRoute, /requireCashSuperAdmin\(result\.user\);\s*\n\s*const limit=Math\.max\(1,Math\.min\(200,Number\(request\.nextUrl\.searchParams\.get\("limit"\)\)\|\|100\)\)/);
  assert.match(cashRoute, /assertNotRemovingLastSuperAdmin/);
  assert.match(cashRoute, /validateCapabilityRequest/);
  assert.match(cashRoute, /assertCanManageUser/);
  assert.match(cashRoute, /assertCanCreateUser/);
  assert.match(cashRoute, /assertCanResetPassword/);
  // Capability storage that has not been migrated reports the dependency.
  assert.match(cashRoute, /CAPABILITIES_MIGRATION_REQUIRED/);
  assert.match(cashRoute, /AUDIT_READ_MIGRATION_REQUIRED/);
  // The existing Cash login is untouched.
  assert.match(cashRoute, /action==="login"/);
  assert.match(cashRoute, /verifyPassword\(password,row\.password_hash\)/);
});

test('audit history is read-only in the application', () => {
  assert.match(cashRoute, /SELECT a\.id,a\.actor_id,a\.target_id,a\.action,a\.details,a\.created_at/);
  assert.match(cashRoute, /readOnly:true/);
  assert.doesNotMatch(cashRoute, /UPDATE public\.cash_portal_audit/);
  assert.doesNotMatch(cashRoute, /DELETE FROM public\.cash_portal_audit/);
});

test('the prepared migration is additive and protects the final administrator', () => {
  assert.match(migration, /PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION/);
  assert.match(migration, /^BEGIN;/m);
  assert.match(migration, /^COMMIT;/m);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS capabilities jsonb/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS username_changed_at timestamptz/);
  assert.match(migration, /GRANT SELECT ON public\.cash_portal_audit TO ir_review_runtime/);
  assert.match(migration, /RAISE EXCEPTION 'LAST_ADMIN_PROTECTED'/);
  assert.match(migration, /CREATE TRIGGER cash_portal_users_guard/);
  // No data mutation of any kind.
  assert.doesNotMatch(migration, /INSERT INTO/i);
  assert.doesNotMatch(migration, /^\s*UPDATE /m);
  assert.doesNotMatch(migration, /^\s*DELETE FROM/m);
  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.doesNotMatch(migration, /password_hash\s*=/);
  assert.doesNotMatch(migration, /ALTER COLUMN/i);
});

test('the entry allowlists expose only the new sign-in and admin surfaces', () => {
  for (const host of ['main', 'cash']) {
    assert.equal(isPathAllowed('/login', host), true, `${host} allows /login`);
    assert.equal(isPathAllowed('/api/auth/login', host), true, `${host} allows /api/auth/login`);
    assert.equal(isPathAllowed('/admin', host), true, `${host} allows /admin`);
    assert.equal(isPathAllowed('/dashboard', host), true, `${host} allows /dashboard`);
  }
  for (const hostile of ['/loginx', '/adminx', '/logins/../etc']) {
    assert.equal(isPathAllowed(hostile, 'main'), false, `main rejects ${hostile}`);
    assert.equal(isPathAllowed(hostile, 'cash'), false, `cash rejects ${hostile}`);
  }
  // The main host already exposes /api/ broadly (pre-existing); the cash host
  // must stay restricted to the /api/auth/ prefix.
  assert.equal(isPathAllowed('/api/authz', 'cash'), false);
  assert.equal(isPathAllowed('/api/cash/summary', 'cash'), true);
  // Previously exposed surfaces stay as they were.
  assert.equal(isPathAllowed('/review', 'main'), true);
  assert.equal(isPathAllowed('/cash', 'cash'), true);
  assert.equal(isPathAllowed('/review', 'cash'), false);
});

test('the sign-in page cannot render while unified auth is off, and cannot loop', () => {
  assert.match(loginPage, /if \(mode === 'off'\) redirect\('\/'\)/);
  assert.match(loginPage, /const identity = await currentIdentity\(\);/);
  // The 2026-10-28 regression: forwarding any signed-in visitor to a protected
  // page looped in shadow mode (/login 307 -> /dashboard 302 -> /login ...).
  assert.doesNotMatch(loginPage, /if \(identity\) redirect\(next\)/);
  assert.match(loginPage, /const target = signedInRedirectTarget\(mode, next\);/);
  assert.match(loginPage, /if \(identity && target\) redirect\(target\);/);
  assert.match(loginPage, /sanitizeReturnTo\(raw\)/);
  assert.doesNotMatch(loginPage, /type=["']password["']|name=["']password["']/);
});

test('shadow sign-in reports verification instead of navigating to a protected page', () => {
  const view = source('app/login/view.tsx');
  assert.match(loginPage, /verifiedName=\{mode === 'shadow'/);
  assert.match(view, /if \(mode === 'shadow'\) \{[\s\S]*?setVerified\(/);
  // The shadow branch returns before any navigation call.
  const shadowBranch = view.slice(view.indexOf("if (mode === 'shadow') {"), view.indexOf("window.location.assign(result.redirect || next)"));
  assert.match(shadowBranch, /return;/);
  assert.doesNotMatch(shadowBranch, /window\.location/);
  // The confirmation panel renders no credential, CSRF value or token.
  const panel = view.slice(
    view.indexOf("step === 'credentials' && verified ? ("),
    view.indexOf(") : step === 'credentials' ? (")
  );
  assert.ok(panel.length > 0, 'confirmation panel is present');
  for (const forbidden of ['login.password', '{csrf}', '{target}', 'password_hash', '__Host-']) {
    assert.ok(!panel.includes(forbidden), `confirmation panel renders no ${forbidden}`);
  }
  assert.match(panel, /Your username, password and Cash sessions are unchanged/);
  assert.match(panel, /Open workspace/);
});

test('no secret material or hardcoded credential appears in the new surface', () => {
  for (const [name, text] of [
    ['lib/unified-auth.ts', unified],
    ['lib/unified-auth-db.ts', unifiedDb],
    ['lib/unified-auth-policy.ts', unifiedPolicy],
    ['app/api/auth route', authRoute],
  ]) {
    assert.doesNotMatch(text, /pbkdf2-sha256:[0-9]+:[a-f0-9]{32}:[a-f0-9]{64}/, `${name} embeds no hash`);
    assert.doesNotMatch(text, /readFileSync\(['"][^'"]*(password|token)/i, `${name} reads no secret file`);
    assert.doesNotMatch(text, /Basic\s+[A-Za-z0-9+/=]{8,}/, `${name} embeds no credentials`);
  }
});

test('the default deployment posture is unchanged (feature off)', () => {
  // No env file, compose file or app config enables the feature by default.
  const compose = source('compose.yaml');
  assert.doesNotMatch(compose, /ALRIFAI_UNIFIED_AUTH_MODE/);
  const envExample = source('.env.example');
  assert.doesNotMatch(envExample, /ALRIFAI_UNIFIED_AUTH_MODE=(shadow|on)/);
  // The fallback in code is `off` for anything unrecognised.
  assert.match(unifiedPolicy, /return \(UNIFIED_AUTH_MODES as readonly string\[\]\)\.includes\(mode\) \? \(mode as UnifiedAuthMode\) : 'off'/);
});
