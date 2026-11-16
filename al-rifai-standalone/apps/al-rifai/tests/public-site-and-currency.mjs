// Public site routing and the 100× currency-display regression (2026-10-28).
//
// Two defects are pinned here:
//   1. The public homepage must stay reachable without a credential, while every
//      operational route keeps its guard.
//   2. Amounts are stored in minor units (paisa). Rendering them with the plain
//      currency formatter inflated a BDT 40,306.00 instruction total to
//      "BDT 4,030,600" — the exact figure reported for employee 01880089543.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {isPathAllowed} from '../release/entry-rules.mjs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const proxy = source('proxy.ts');
const entry = source('release/private-entry.mjs');

function walkTsx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkTsx(full, out);
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(full);
  }
  return out;
}

test('the canonical homepage enters unified sign-in and signup only requests access', () => {
  const home = source('app/page.tsx');
  assert.match(home, /unifiedMode\(\) !== 'off'\) redirect\('\/login'\)/);
  assert.match(home, /Sign-in is not enabled/);

  const signup = source('app/signup/page.tsx');
  assert.match(signup, /does not create an account|does not grant access/i);
  assert.match(signup, /SignupRequestForm/);
  assert.doesNotMatch(signup, /createUser|cash_portal_users|INSERT/);

  const form = source('app/signup/request-form.tsx');
  assert.match(form, /fetch\('\/api\/auth\/signup'/);
  assert.match(form, /name="name"/);
  assert.match(form, /name="email"/);
  assert.match(form, /does not create an account/);
});

test('only the public marketing paths bypass the guard', () => {
  assert.match(proxy, /PUBLIC_SITE_PATHS=new Set\(\["\/","\/signup"\]\)/);
  const publicIdx = proxy.indexOf('PUBLIC_SITE_PATHS.has(pathname)');
  const basicIdx = proxy.indexOf('validationIdentity(request.headers.get("authorization"))');
  const fallbackIdx = proxy.lastIndexOf('return unauthorized();');
  assert.ok(publicIdx > -1 && publicIdx < basicIdx && basicIdx < fallbackIdx);
  // No operational route is public.
  for (const guarded of ['/dashboard', '/cash', '/admin', '/review', '/employees']) {
    assert.equal(Object.prototype.hasOwnProperty.call({}, guarded), false);
  }
  assert.equal(isPathAllowed('/', 'main'), true);
  assert.equal(isPathAllowed('/', 'cash'), true);
  assert.equal(isPathAllowed('/signup', 'main'), true);
  assert.equal(isPathAllowed('/signup', 'cash'), true);
});

test('the entry proxy no longer redirects the root to a private screen', () => {
  assert.doesNotMatch(entry, /req\.url==='\/'&&!cashHost/);
  assert.doesNotMatch(entry, /req\.url==='\/'&&cashHost/);
  assert.doesNotMatch(entry, /Location:'\/review'/);
  assert.doesNotMatch(entry, /Location:'\/cash'/);
});

test('no view renders a minor-unit amount with the major-unit formatter', () => {
  const offenders = [];
  for (const file of walkTsx(new URL('../app', import.meta.url).pathname)) {
    const text = readFileSync(file, 'utf8');
    // bdt.format() expects taka. It may only receive an explicit /100 conversion.
    for (const match of text.matchAll(/bdt\.format\(([^)]*\)?[^)]*)\)/g)) {
      const arg = match[1];
      if (!/\/\s*100/.test(arg) && !/fmtBDT/.test(arg)) offenders.push(`${file}: bdt.format(${arg})`);
    }
  }
  assert.deepEqual(offenders, [], `minor units must use fmtBDT(): ${offenders.join(' | ')}`);
});

test('the employee instruction total is rendered through fmtBDT', () => {
  const employees = source('app/employees/view.tsx');
  assert.match(employees, /fmtBDT\(r\.amountCents\)/);
  assert.match(employees, /fmtBDT\(detail\.amountCents\)/);
  assert.doesNotMatch(employees, /bdt\.format\(r\.amountCents\)/);
  const dashboard = source('app/dashboard/view.tsx');
  assert.match(dashboard, /fmtBDT\(ops\.data\.summary\.amountCents\)/);
});

test('password changes revoke the other sessions but keep the caller signed in', () => {
  const auth = source('lib/unified-auth.ts');
  const portal = source('lib/cash-portal.ts');
  // One revocation implementation, shared by every password-change path.
  assert.match(portal, /export async function revokeOtherSessions/);
  assert.match(portal, /DELETE FROM public\.cash_portal_sessions[\s\S]*?id<>\$2/);
  assert.match(portal, /keepToken\?hashToken\(keepToken\):''/);
  assert.match(auth, /revokeOtherSessions\(row\.id, currentToken\)/);
  assert.match(auth, /otherSessionsRevoked/);
  assert.match(auth, /PASSWORD_UNCHANGED/);
  assert.doesNotMatch(auth, /DELETE FROM public\.cash_portal_sessions/, 'no duplicated SQL');
  const route = source('app/api/auth/[...path]/route.ts');
  assert.match(route, /changeOwnPassword\(identity, body, token\)/);
});
