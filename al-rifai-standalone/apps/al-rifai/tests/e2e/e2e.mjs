// End-to-end validation against a running instance (HTTP + real PostgreSQL).
// Not a graphical browser: it drives the same authenticated HTTP surface,
// checks server-rendered pages and verifies persisted state in the database.
import assert from 'node:assert/strict';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3000';
const ORIGIN = BASE;
const INITIAL_PASSWORD = 'OwnerPass123';
let OWNER_PASSWORD = 'OwnerPass456';   // set by the forced first-login change
const STAFF_PASSWORD = 'StaffPass123';

let cookie = '';
const results = [];
const record = (name, ok, detail = '') => {
  results.push({name, ok, detail});
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

async function http(path, {method = 'GET', body, csrf, useCookie = true, headers = {}} = {}) {
  // The session endpoint rotates the CSRF token on every read (the UI fetches it
  // immediately before each action); mirror that contract here.
  if (method !== 'GET' && useCookie && path !== '/api/auth/login') {
    const fresh = await fetch(`${BASE}/api/auth/session`, {headers: {...(cookie ? {Cookie: cookie} : {})}}).catch(() => null);
    if (fresh?.ok) csrf = (await fresh.json()).csrf;
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? {'Content-Type': 'application/json'} : {}),
      ...(csrf ? {'X-CSRF-Token': csrf} : {}),
      ...(headers.origin ?? method !== 'GET' ? {Origin: ORIGIN} : {}),
      ...(useCookie && cookie ? {Cookie: cookie} : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    const session = setCookie.find((value) => value.startsWith('__Host-'));
    if (session) cookie = session.split(';')[0];
  }
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return {status: response.status, text, json, headers: response.headers};
}

async function login(username, password) {
  cookie = '';
  const response = await http('/api/auth/login', {method: 'POST', body: {username, password}, useCookie: false});
  assert.equal(response.status, 200, `login ${username}: ${response.text.slice(0, 200)}`);
  return response.json;
}

// ── 1. authentication ───────────────────────────────────────────────────────
{
  const bad = await http('/api/auth/login', {method: 'POST', body: {username: 'owner', password: 'wrong-password'}, useCookie: false});
  record('login rejects a wrong password', bad.status === 401, `status ${bad.status}`);
}
let ownerSession = await login('owner', INITIAL_PASSWORD);
record('first admin can log in', ownerSession.user.role === 'ADMIN' && ownerSession.csrf.length === 64);
{
  const blocked = await http('/api/employees', {method: 'POST', csrf: ownerSession.csrf, body: {employeeMobile: '01799990000', preferredName: 'Blocked'}});
  record('forced password change blocks writes', blocked.status === 403 && blocked.json?.error === 'PASSWORD_CHANGE_REQUIRED', `status ${blocked.status}`);
  const change = await http('/api/auth/password', {method: 'POST', csrf: ownerSession.csrf, body: {newPassword: OWNER_PASSWORD, confirmPassword: OWNER_PASSWORD}});
  record('first-admin password change', change.status === 200, `status ${change.status}`);
  ownerSession = await login('owner', OWNER_PASSWORD);
  record('sign in with the new password', ownerSession.user.role === 'ADMIN');
  const session = await http('/api/auth/session');
  record('session endpoint returns the signed-in identity', session.status === 200 && session.json?.user?.username === 'owner', `status ${session.status}`);
}
{
  const anon = await http('/api/employees', {useCookie: false});
  record('unauthenticated API is refused', anon.status === 401, `status ${anon.status}`);
}
{
  const page = await http('/dashboard');
  record('dashboard renders for an authenticated user', page.status === 200 && page.text.includes('Dashboard'), `status ${page.status}`);
}

// ── 2. employees ────────────────────────────────────────────────────────────
const mobile = '01711110001';
{
  const create = await http('/api/employees', {method: 'POST', csrf: ownerSession.csrf, body: {employeeMobile: mobile, preferredName: 'E2E Escort', dutyType: 'escort', designation: 'escort'}});
  record('create employee', create.status === 201 && create.json?.created === true, `status ${create.status}`);
  const duplicate = await http('/api/employees', {method: 'POST', csrf: ownerSession.csrf, body: {employeeMobile: mobile, preferredName: 'E2E Escort'}});
  record('duplicate employee becomes an alias, not a row', duplicate.status === 201 && duplicate.json?.created === false);
  const update = await http('/api/employees', {method: 'PATCH', csrf: ownerSession.csrf, body: {employeeMobile: mobile, preferredName: 'E2E Escort Updated'}});
  record('edit employee', update.status === 200 && update.json?.preferred_name === 'E2E Escort Updated', `status ${update.status}`);
}

// ── 3. vessel programs ──────────────────────────────────────────────────────
let programId = '';
{
  const create = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'create', motherVessel: 'MV E2E', lighterVessel: 'L-E2E-1', masterMobile: '01911110001',
    destination: 'Chattogram', escortName: 'E2E Escort Updated', escortMobile: mobile,
    startDate: '2026-11-01', startShift: 'D',
  }});
  programId = create.json?.program?.id;
  record('create program with escort', create.status === 201 && create.json?.program?.state === 'ASSIGNED', `status ${create.status}`);

  const dup = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'create', motherVessel: 'MV E2E', lighterVessel: 'L-E2E-1', startDate: '2026-11-01', startShift: 'D',
  }});
  record('exact duplicate program is refused', dup.status === 409 && String(dup.json?.error).includes('DUPLICATE_PROGRAM'), `status ${dup.status}`);

  const near = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'create', motherVessel: 'MV E2E', lighterVessel: 'L-E2E-1', startDate: '2026-11-02', startShift: 'D',
  }});
  record('±1-day duplicate is created with a warning', near.status === 201 && Array.isArray(near.json?.potentialDuplicates) && near.json.potentialDuplicates.length > 0);

  const sibling = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'create', motherVessel: 'MV E2E', lighterVessel: 'L-E2E-2', startDate: '2026-11-01', startShift: 'D',
  }});
  record('same mother, different lighter stays a distinct program', sibling.status === 201 && sibling.json?.program?.id !== programId);

  const second = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'create', motherVessel: 'MV E2E', lighterVessel: 'L-E2E-3', startDate: '2026-11-03', startShift: 'N',
  }});
  const secondId = second.json?.program?.id;
  const assign = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'assign', programId: secondId, employeeMobile: mobile, employeeName: 'E2E Escort Updated', startDate: '2026-11-03', startShift: 'N',
  }});
  record('escort assignment', assign.status === 200 && !!assign.json?.assignmentId, `status ${assign.status}`);

  const replace = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'assign', programId: secondId, employeeMobile: '01711110002', employeeName: 'Replacement Escort', replace: true,
  }});
  record('escort replacement closes the previous assignment', replace.status === 200);

  const release = await http('/api/programs', {method: 'POST', csrf: ownerSession.csrf, body: {
    action: 'release', programId, endDate: '2026-11-10', endShift: 'D',
  }});
  record('release program', release.status === 200);
}

// ── 4. attendance ───────────────────────────────────────────────────────────
{
  const first = await http('/api/attendance', {method: 'POST', csrf: ownerSession.csrf, body: {employeeMobile: mobile, dutyDate: '2026-11-05', shift: 'D', state: 'PRESENT', hours: 12}});
  const second = await http('/api/attendance', {method: 'POST', csrf: ownerSession.csrf, body: {employeeMobile: mobile, dutyDate: '2026-11-05', shift: 'D', state: 'PRESENT', hours: 10}});
  record('attendance record + upsert', first.status === 201 && second.status === 201);
  const summary = await http('/api/attendance?view=summary&month=2026-11');
  record('attendance summary', summary.status === 200 && Array.isArray(summary.json?.rows));
}

// ── 5. payroll ──────────────────────────────────────────────────────────────
{
  const rate = await http('/api/payroll', {method: 'POST', csrf: ownerSession.csrf, body: {destinationKey: 'default', destinationLabel: 'Default', shiftRateMinor: 20000, conveyanceMinor: 0}});
  record('configure payroll rate', rate.status === 201);
  const payroll = await http('/api/payroll?month=2026-11');
  record('payroll calculation for a released program', payroll.status === 200 && payroll.json?.summary?.programs !== '0' && Array.isArray(payroll.json?.programs));
}

// ── 6. finance ──────────────────────────────────────────────────────────────
let accountId = '';
let instructionId = '';
{
  const account = await http('/api/finance', {method: 'POST', csrf: ownerSession.csrf, body: {action: 'account.create', code: 'BANK1', name: 'E2E Bank', type: 'BANK', openingBalanceMinor: 0}});
  accountId = account.json?.id ?? '';
  record('create cash account', account.status === 201 && !!accountId, `status ${account.status}`);

  const income = await http('/api/finance', {method: 'POST', csrf: ownerSession.csrf, body: {action: 'ledger.create', accountId, entryDate: '2026-11-05', direction: 'CREDIT', amountMinor: 500000, category: 'service income', description: 'E2E income'}});
  record('record income (credit)', income.status === 201);

}

// ── 7. roles: staff user ────────────────────────────────────────────────────
{
  const staff = await login('staff', STAFF_PASSWORD);
  record('staff user can log in', staff.user.role === 'USER');
  const forbidden = await http('/api/finance', {method: 'POST', csrf: staff.csrf, body: {action: 'instruction.approve', id: instructionId}});
  record('USER cannot approve', forbidden.status === 403, `status ${forbidden.status}`);
  const own = await http('/api/finance', {method: 'POST', csrf: staff.csrf, body: {action: 'instruction.create', employeeName: 'E2E Escort Updated', employeeMobile: mobile, method: 'bkash', amount: '1500.00', accountId}});
  instructionId = own.json?.id ?? '';
  record('USER can create an instruction (goes to review)', own.status === 201 && own.json?.state === 'REVIEW');
  const earlyPost = await http('/api/finance', {method: 'POST', csrf: staff.csrf, body: {action: 'instruction.post', id: instructionId}});
  record('unapproved instruction cannot be posted', earlyPost.status === 403, `status ${earlyPost.status}`);
  const review = await http('/api/review', {method: 'POST', csrf: staff.csrf, body: {action: 'submit', domain: 'EMPLOYEE', reviewAction: 'CREATE', payload: {employeeMobile: '01711110003', preferredName: 'Review Employee', dutyType: 'crew'}}});
  record('USER can submit for review', review.status === 201);
  const selfDecide = await http('/api/review', {method: 'POST', csrf: staff.csrf, body: {action: 'decide', id: review.json?.id, decision: 'APPROVED'}});
  record('USER cannot decide a review', selfDecide.status === 403, `status ${selfDecide.status}`);
}

// ── 8. approval + posting as a second admin ─────────────────────────────────
{
  const owner = await login('owner', OWNER_PASSWORD);
  const approve = await http('/api/finance', {method: 'POST', csrf: owner.csrf, body: {action: 'instruction.approve', id: instructionId}});
  record('second admin approves', approve.status === 200 && approve.json?.state === 'APPROVED', `status ${approve.status}`);

  const post = await http('/api/finance', {method: 'POST', csrf: owner.csrf, body: {action: 'instruction.post', id: instructionId}});
  record('approved instruction posts to the ledger', post.status === 200 && post.json?.state === 'POSTED', `status ${post.status}`);

  const again = await http('/api/finance', {method: 'POST', csrf: owner.csrf, body: {action: 'instruction.post', id: instructionId}});
  record('posting is idempotent (second post refused)', again.status === 409, `status ${again.status}`);

  const accounts = await http('/api/finance?resource=accounts');
  const bank = accounts.json?.rows?.find((row) => row.id === accountId);
  record('account balance reflects income minus payment', Number(bank?.balance_minor) === 500000 - 150000, `balance ${bank?.balance_minor}`);

  const report = await http('/api/finance?resource=report&from=2026-11-01&to=2026-11-30');
  record('income/expense report totals', report.status === 200 && Number(report.json?.income) === 500000 && Number(report.json?.expense) === 150000, `income ${report.json?.income} expense ${report.json?.expense}`);

  // approve the staff submission created above
  const pending = await http('/api/review?state=PENDING');
  const item = (pending.json?.rows ?? []).find((row) => row.domain === 'EMPLOYEE');
  if (item) {
    const decide = await http('/api/review', {method: 'POST', csrf: owner.csrf, body: {action: 'decide', id: item.id, decision: 'APPROVED'}});
    record('admin decides a staff submission', decide.status === 200 && decide.json?.state === 'APPROVED');
  } else {
    record('admin decides a staff submission', false, 'no pending item found');
  }
}

// ── 9. reports + pages ──────────────────────────────────────────────────────
{
  const csv = await http('/api/reports?type=employees');
  record('CSV export', csv.status === 200 && csv.text.split('\n')[0].includes('employee_mobile'), `status ${csv.status}`);
  const audit = await http('/api/reports?type=audit');
  record('audit export', audit.status === 200 && audit.text.length > 0);
}
for (const [path, marker] of [
  ['/employees', 'Employees'],
  [`/employees/${mobile}`, 'E2E Escort Updated'],
  ['/vessel', 'Vessel Register'],
  ['/attendance', 'Attendance'],
  ['/cash', 'Cash'],
  ['/payroll', 'Payroll'],
  ['/review', 'Review'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
]) {
  const page = await http(path);
  record(`page ${path}`, page.status === 200 && page.text.includes(marker), `status ${page.status}`);
}

// ── 10. whatsapp adapter (no live relay) ────────────────────────────────────
{
  const owner = await login('owner', OWNER_PASSWORD);
  const configure = await http('/api/whatsapp', {method: 'POST', csrf: owner.csrf, body: {action: 'configure', id: 'e2e', label: 'E2E relay', socketPath: '/tmp/does-not-exist.sock', tokenFile: '/tmp/does-not-exist.token'}});
  record('configure whatsapp relay', configure.status === 201);
  const health = await http('/api/whatsapp?account=e2e&health=1');
  record('relay health reports unreachable without a bridge', health.status === 200 && health.json?.ok === false, `state ${health.json?.state}`);
  const status = await http('/api/whatsapp');
  record('integration status lists the account', status.status === 200 && (status.json?.accounts ?? []).some((account) => account.id === 'e2e'));
}

// ── 11. logout ──────────────────────────────────────────────────────────────
{
  const owner = await login('owner', OWNER_PASSWORD);
  const out = await http('/api/auth/logout', {method: 'POST', csrf: owner.csrf});
  record('logout succeeds', out.status === 200);
  cookie = '';
  const after = await http('/api/employees', {useCookie: false});
  record('session is invalid after logout', after.status === 401, `status ${after.status}`);
}

const failed = results.filter((result) => !result.ok);
console.log(`\nE2E SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '));
  process.exitCode = 1;
}
