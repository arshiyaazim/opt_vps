// Cash review navigation and queue display.
//
// Static invariants always run. The live checks run only when BOTH
// ALRIFAI_LIFECYCLE_BASE is set AND ALRIFAI_LIFECYCLE_ALLOW_WRITES is exactly
// "isolated-harness-only", and never against a production host. The canonical
// suite therefore never writes to production.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const nav = source('app/platform/nav.ts');
const shell = source('app/platform/app-shell.tsx');
const cashPage = source('app/cash/page.tsx');
const queuePage = source('app/cash/submissions/page.tsx');
const route = source('app/api/cash/[...path]/route.ts');
const portal = source('lib/cash-portal.ts');
const dashboard = source('app/dashboard/view.tsx');
const workspaceCss = source('app/workspace.css');
const sourcesReviewView = source('app/sources-review/view.tsx');
const sourcesReviewPage = source('app/sources-review/page.tsx');

test('static: dashboard is a landing page, not a sidebar item, and navigation has coherent groups', () => {
  assert.doesNotMatch(nav, /href:"\/dashboard",label:"Dashboard"/);
  assert.match(nav, /\{label:"Cash",items:/);
  assert.match(nav, /\{label:"Vessel Operations",items:/);
  assert.match(nav, /href:"\/cash",label:"Cash"/);
  assert.match(nav, /href:"\/vessel",label:"Programs & Assignments"/);
  assert.match(shell, /NAV_GROUPS\.map/);
  assert.doesNotMatch(shell, /Consolidated tools|LegacyLinks/);
  assert.match(shell, /href="\/dashboard">Dashboard<\/Link>/);
});

test('static: Cash Submissions is visible in the Cash group for each signed-in role', () => {
  const entries = nav.split('\n').filter((line) => line.includes('href:"/cash/'));
  assert.equal(entries.length, 1, 'exactly one Cash navigation entry');
  assert.match(entries[0], /href:"\/cash\/submissions"/);
  assert.match(entries[0], /label:"Cash Submissions"/);
  assert.doesNotMatch(entries[0], /adminOnly:true/);
  assert.doesNotMatch(entries[0], /restricted:true/);
});

test('static: role and super-admin presentation guards remain distinct', () => {
  // `restricted` keys off superAdmin, which is undefined under the legacy
  // validation credential, so a restricted Cash entry would vanish in shadow mode.
  assert.match(shell, /\(!item\.restricted\|\|user\.superAdmin===true\)/);
  assert.match(shell, /\(!item\.adminOnly\|\|user\.admin===true\)/);
  // The Admin Panel entry keeps its original guard and its original test.
  assert.match(nav, /href:"\/admin"[^\n]*restricted:true/);
});

test('static: dashboard module cards link to eight existing workspace destinations', () => {
  const paths = [...dashboard.matchAll(/\{href:'([^']+)',title:/g)].map((match) => match[1]);
  assert.deepEqual(paths, [
    '/cash',
    '/vessel-register',
    '/employees',
    '/sources-review',
    '/assistant',
    '/transactions',
    '/cash/submissions',
    '/income-expenditure',
  ]);
  assert.equal(new Set(paths).size, 8, 'module destinations are unique');
  for (const path of paths) {
    assert.ok(nav.includes(`href:"${path}"`), `${path} is also reachable in platform navigation`);
  }
  assert.match(dashboard, /className="wx-module-card"/);
  assert.match(dashboard, /title="Platform modules"/);
});

test('static: module cards use responsive equal-grid styling and visible keyboard focus', () => {
  assert.match(workspaceCss, /\.wx-module-grid\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)[^}]*grid-auto-rows: minmax\(12rem, 1fr\)/s);
  assert.match(workspaceCss, /@media \(max-width: 900px\)[\s\S]*?\.wx-module-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(workspaceCss, /@media \(max-width: 420px\)[\s\S]*?\.wx-module-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(workspaceCss, /\.wx-module-card:focus-visible\s*\{[^}]*outline: 2px solid var\(--wx-brand\)/s);
});

test('static: /sources-review is named Review Queue and remains separate from Cash submissions', () => {
  assert.match(nav, /\{href:"\/sources-review",label:"Review Queue"/);
  assert.match(nav, /description:"Vessel and WhatsApp source review; Cash submissions stay separate"/);
  assert.match(sourcesReviewPage, /label="Review Queue"/);
  assert.match(sourcesReviewPage, /title:'Review Queue/);
  assert.match(sourcesReviewView, /\/api\/escort-register/);
  assert.doesNotMatch(sourcesReviewView, /cash_submissions/);
});

test('static: the Cash sidebar link is renamed and stays available to every signed-in role', () => {
  assert.match(cashPage, /<a className="cash-nav-link" href="\/cash\/submissions"><ShieldCheck size=\{17\}\/>Cash Submissions &amp; Review<\/a>/);
  // USER accounts must keep their route to their own submissions.
  assert.doesNotMatch(cashPage, /user\.role==="ADMIN"&&<a[^>]*href="\/cash\/submissions"/);
});

test('static: submission read returns the submitter username and purpose without widening scope', () => {
  assert.match(route, /u\.username AS submitted_by_username/);
  assert.match(route, /LEFT JOIN public\.cash_portal_users u ON u\.id=v\.submitted_by_user_ref/);
  assert.match(route, /WHERE \(\$1::boolean OR v\.submitted_by_user_ref=\$2\)/);
  assert.match(route, /ORDER BY v\.created_at DESC\s+LIMIT \$\{limit\} OFFSET \$\{offset\}/);
  assert.match(route, /SELECT count\(\*\)::int AS count FROM public\.cash_submission_review_state v/);
  assert.match(route, /rows:visible,decisions:decisions\.rows,total:total\.rows\[0\]\?\.count\?\?0,limit,offset/);
  assert.match(queuePage, /submissions\?limit=\$\{SUBMISSION_PAGE_SIZE\}&offset=\$\{pageOffset\}/);
  assert.match(queuePage, /Showing \{total\?offset\+1:0\}–\{Math\.min\(offset\+rows\.length,total\)\} of \{total\}/);
  // Role still comes from the stored session row, bound server-side.
  assert.match(route, /\[result\.user\.role==="ADMIN",result\.user\.id\]/);
});

test('static: forced-change and Admin-only decision guards are unchanged', () => {
  assert.match(route, /if\(action==="submissions"&&request\.method==="GET"\)\{\s*forced\(result\.user\);/);
  assert.match(route, /decision"&&request\.method==="POST"\)\{\s*forced\(result\.user\);requireAdmin\(result\.user\);/);
});

test('static: the submission-create branch is path-scoped so the decision handler is reachable', () => {
  // Without the !segments[1] guard the create branch captures
  // POST /api/cash/submissions/<id>/decision, validateSubmission rejects the
  // decision body with 400 SUBMISSION_INVALID, and the decision handler on the
  // later branch is dead code. This guard is what keeps that branch reachable.
  assert.match(route, /if\(action==="submissions"&&!segments\[1\]&&request\.method==="POST"\)\{/);
  const create = route.indexOf('if(action==="submissions"&&!segments[1]&&request.method==="POST")');
  const decide = route.indexOf('if(action==="submissions"&&segments[1]&&segments[2]==="decision"&&request.method==="POST")');
  assert.ok(create >= 0, 'path-scoped create branch present');
  assert.ok(decide > 0, 'decision branch present');
  assert.ok(create < decide, 'create branch is declared before the decision branch it must not shadow');
});

test('static: the review queue renders Submitter and Purpose', () => {
  assert.match(queuePage, /submitted_by_username:string\|null/);
  assert.match(queuePage, /purpose:string/);
  assert.match(queuePage, /<th>Submitter<\/th>/);
  assert.match(queuePage, /<th>Purpose<\/th>/);
  assert.match(queuePage, /<td>\{row\.submitted_by_username\?\?'—'\}<\/td>/);
  assert.match(queuePage, /<td>\{row\.purpose\}<\/td>/);
  assert.match(queuePage, /colSpan=\{8\}/);
  // The heading still distinguishes the Admin queue from a USER's own list.
  assert.match(queuePage, /user\.role==='ADMIN'\?'Review queue':'My submissions'/);
});

test('static: /sources-review keeps its escort and WhatsApp data sources', () => {
  assert.match(sourcesReviewView, /\/api\/escort-register/);
  assert.match(sourcesReviewView, /\/api\/operations\?view=reviews&scope=archive/);
  assert.doesNotMatch(sourcesReviewView, /cash_submissions/);
});

test('static: session cookie attributes and Admin-only summary are unchanged', () => {
  assert.match(portal, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(route, /action==="summary"&&request\.method==="GET"\)\{\s*requireCashSuperAdmin\(result\.user\)/);
});

const BASE = process.env.ALRIFAI_LIFECYCLE_BASE || '';
const ORIGIN = process.env.ALRIFAI_LIFECYCLE_ORIGIN || '';
const ARMED = process.env.ALRIFAI_LIFECYCLE_ALLOW_WRITES === 'isolated-harness-only';
const live = BASE && ARMED ? test : test.skip;

function refuseProduction(base) {
  const host = new URL(base).hostname;
  if (/(^|\.)iamazim\.com$/.test(host)) throw new Error(`refusing live review checks against ${host}`);
}

async function call(method, path, {body, cookie, csrf} = {}) {
  const headers = {origin: ORIGIN};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = `__Host-alrifai_cash=${cookie}`;
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(`${BASE}${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  const json = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie') || '';
  return {status: res.status, json, cookie: (setCookie.match(/__Host-alrifai_cash=([a-f0-9]{64})/) || [])[1] || null};
}
const login = (username, password) => call('POST', '/api/cash/login', {body: {username, password}});

live('live: Admin sees pending submissions with submitter and purpose; USER scope and decisions stay closed', async () => {
  refuseProduction(BASE);
  const adminUser = process.env.ALRIFAI_LIFECYCLE_ADMIN_USER;
  const adminPass = process.env.ALRIFAI_LIFECYCLE_ADMIN_PASS;
  assert.ok(adminUser && adminPass, 'admin credentials are required for the live review checks');

  // Anonymous access stays closed while the page shell itself remains reachable.
  const anon = await call('GET', '/api/cash/submissions');
  assert.equal(anon.status, 401);
  assert.equal(anon.json.error, 'AUTHENTICATION_REQUIRED');
  const shellHtml = await (await fetch(`${BASE}/cash/submissions`)).text();
  assert.doesNotMatch(shellHtml, /PENDING_REVIEW/);

  const admin = await login(adminUser, adminPass);
  assert.equal(admin.status, 200);
  assert.equal(admin.json.user.role, 'ADMIN');

  const queue = await call('GET', '/api/cash/submissions', {cookie: admin.cookie});
  assert.equal(queue.status, 200);
  assert.equal(queue.json.available, true);
  assert.ok(queue.json.rows.length >= 1, 'the Admin queue is not empty');
  for (const row of queue.json.rows) {
    assert.equal(typeof row.submitted_by_username, 'string', 'submitter username is resolved');
    assert.notEqual(row.submitted_by_username, null);
    assert.equal(typeof row.purpose, 'string');
    assert.ok(['PENDING_REVIEW', 'ACTIVE_REVIEWED', 'REJECTED', 'CORRECTION_REQUESTED'].includes(row.review_state));
  }
  const pending = queue.json.rows.filter((row) => row.review_state === 'PENDING_REVIEW');
  assert.ok(pending.length >= 1, 'a PENDING_REVIEW row is visible to the Admin');

  // A fresh USER sees only their own submissions and cannot decide.
  const username = `navcheck${Date.now().toString(36)}`;
  let userId = null;
  try {
    const created = await call('POST', '/api/cash/users', {
      body: {username, password: 'TempPass123456', displayName: 'Nav Check', role: 'USER'},
      cookie: admin.cookie, csrf: admin.json.csrf,
    });
    assert.equal(created.status, 201);
    userId = created.json.id;

    const user = await login(username, 'TempPass123456');
    assert.equal(user.status, 200);
    assert.equal(user.json.user.role, 'USER');
    const me = await call('GET', '/api/cash/me', {cookie: user.cookie});
    const changed = await call('POST', '/api/cash/password', {
      body: {currentPassword: 'TempPass123456', newPassword: 'ChosenPass123456', confirmPassword: 'ChosenPass123456'},
      cookie: user.cookie, csrf: me.json.csrf,
    });
    assert.equal(changed.status, 200);

    const own = await call('GET', '/api/cash/submissions', {cookie: user.cookie});
    assert.equal(own.status, 200);
    assert.equal(own.json.scope, 'self');
    assert.ok(own.json.rows.every((row) => row.submitted_by_username === username));
    assert.equal(own.json.rows.length, 0, 'a new USER sees no other account\'s rows');

    const denied = await call('POST', `/api/cash/submissions/${pending[0].id}/decision`, {
      body: {decision: 'APPROVED', note: ''}, cookie: user.cookie, csrf: me.json.csrf,
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.json.error, 'ADMIN_REQUIRED');
  } finally {
    // No account delete endpoint exists, so the probe account is deactivated.
    if (userId) {
      await call('PATCH', `/api/cash/users/${userId}`, {body: {active: false}, cookie: admin.cookie, csrf: admin.json.csrf});
    }
  }

  // Admin decision end-to-end: approved isolated-clone write that proves the
  // decision handler is reachable and records exactly one append-only review.
  const target = pending[0].id;
  const decided = await call('POST', `/api/cash/submissions/${target}/decision`, {
    body: {decision: 'APPROVED', note: ''}, cookie: admin.cookie, csrf: admin.json.csrf,
  });
  assert.equal(decided.status, 201);
  assert.equal(decided.json.reviewState, 'ACTIVE_REVIEWED');
  assert.equal(decided.json.postingAuthorized, false);

  const after = await call('GET', `/api/cash/submissions?id=${target}`, {cookie: admin.cookie});
  assert.equal(after.status, 200);
  assert.equal(after.json.rows.length, 1);
  assert.equal(after.json.rows[0].review_state, 'ACTIVE_REVIEWED');
  assert.equal(typeof after.json.rows[0].submitted_by_username, 'string');
  assert.equal(typeof after.json.rows[0].purpose, 'string');
  assert.equal(after.json.decisions.length, 1, 'exactly one decision record');
  assert.equal(after.json.decisions[0].decision, 'APPROVED');

  // Nothing above may have changed the ledger.
  const summary = await call('GET', '/api/cash/summary?limit=1', {cookie: admin.cookie});
  assert.equal(summary.status, 200);
  assert.equal(summary.json.counts.postings, 0, 'Cash Freeze intact: no current postings');
});
