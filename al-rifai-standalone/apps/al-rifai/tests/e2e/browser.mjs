// Graphical browser verification (Playwright + Chromium headless).
// Exercises real UI forms, client components, navigation and persistence.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3212';
const OWNER = {username: 'owner', password: process.env.OWNER_PASSWORD ?? 'DemoPass123'};
const STAFF = {username: 'staffadmin', password: 'StaffPass123'};

const results = [];
const record = (name, ok, detail = '') => {
  results.push({name, ok});
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

async function login(page, {username, password}) {
  await page.goto(`${BASE}/login`, {waitUntil: 'domcontentloaded'});
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL('**/dashboard', {timeout: 15000}),
    page.click('button[type="submit"]'),
  ]);
}

const browser = await chromium.launch();
try {
  const owner = await browser.newContext({baseURL: BASE, ignoreHTTPSErrors: true});
  const page = await owner.newPage();

  // 1. login + navigation
  await login(page, OWNER);
  record('login lands on the dashboard', page.url().endsWith('/dashboard'));
  for (const href of ['/employees', '/vessel', '/attendance', '/cash', '/payroll', '/review', '/reports', '/settings']) {
    await page.click(`nav a[href="${href}"]`);
    await page.waitForURL(`**${href}`);
    const heading = await page.locator('h1').first().innerText();
    record(`navigate ${href}`, heading.length > 0, heading);
  }

  // 2. employee creation through the form
  await page.goto(`${BASE}/employees`);
  await page.fill('input[name="employeeMobile"]', '01711112222');
  await page.fill('input[name="preferredName"]', 'Browser Escort');
  await page.selectOption('select[name="dutyType"]', 'escort');
  await page.click('button:has-text("Create employee")');
  await page.waitForSelector('td:has-text("Browser Escort")', {timeout: 15000});
  record('employee form persists and refreshes the table', true);
  const employeeDetail = await page.locator('a:has-text("Browser Escort")').first().getAttribute('href');
  await page.goto(`${BASE}${employeeDetail}`);
  record('employee detail page opens', (await page.locator('h1').innerText()).includes('Browser Escort'));

  // 3. vessel program creation
  await page.goto(`${BASE}/vessel`);
  await page.fill('input[name="motherVessel"]', 'MV Browser');
  await page.fill('input[name="lighterVessel"]', 'L-B1');
  await page.fill('input[name="masterMobile"]', '01911112222');
  await page.fill('input[name="destination"]', 'Chattogram');
  await page.fill('input[name="escortName"]', 'Browser Escort');
  await page.fill('input[name="escortMobile"]', '01711112222');
  await page.fill('input[name="startDate"]', '2026-11-01');
  await page.selectOption('select[name="startShift"]', 'D');
  await page.click('button:has-text("Create program")');
  await page.waitForSelector('td:has-text("MV Browser")', {timeout: 15000});
  const programId = (await page.locator('td:has-text("MV Browser") div.muted').first().innerText()).trim();
  record('program form persists', programId.startsWith('prog_'), programId);

  // duplicate attempt surfaces the API error in the form
  await page.fill('input[name="motherVessel"]', 'MV Browser');
  await page.fill('input[name="lighterVessel"]', 'L-B1');
  await page.fill('input[name="startDate"]', '2026-11-01');
  await page.click('button:has-text("Create program")');
  await page.waitForSelector('p.error', {timeout: 15000});
  record('duplicate program shows a form error', (await page.locator('p.error').first().innerText()).includes('DUPLICATE_PROGRAM'));

  // 4. release through the form (uses the full program id shown in the table)
  await page.fill('input[name="programId"] >> nth=1', programId);
  await page.fill('input[name="endDate"] >> nth=1', '2026-11-10');
  await page.selectOption('select[name="endShift"] >> nth=1', 'D');
  await page.click('button:has-text("Release")');
  await page.waitForSelector('span.pill:has-text("RELEASED")', {timeout: 15000});
  record('release action updates the row', true);

  // 5. attendance
  await page.goto(`${BASE}/attendance`);
  await page.selectOption('select[name="employeeMobile"]', '+8801711112222');
  await page.fill('input[name="dutyDate"]', '2026-11-06');
  await page.click('button:has-text("Record")');
  await page.waitForSelector('td:has-text("Browser Escort")', {timeout: 15000});
  record('attendance form persists', true);

  // 6. income entry + balance
  await page.goto(`${BASE}/cash`);
  const balanceBefore = await page.locator('.stat:has-text("CASH") .value').first().innerText();
  await page.selectOption('select[name="accountId"] >> nth=1', 'acc-cash');
  await page.fill('input[name="entryDate"]', '2026-11-06');
  await page.selectOption('select[name="direction"]', 'CREDIT');
  await page.locator('input[name="amount"]').nth(1).fill('2500.00');
  await page.fill('input[name="category"]', 'browser income');
  await page.click('button:has-text("Post entry")');
  await page.waitForTimeout(1500);
  const formErrors = await page.locator('p.error').allInnerTexts();
  if (formErrors.length) console.log('   ledger form error:', formErrors.join(' | '));
  await page.reload();
  const ledgerRow = await page.locator('td:has-text("browser income")').count();
  const balanceAfter = await page.locator('.stat:has-text("CASH") .value').first().innerText();
  record('ledger entry persists and changes the balance', ledgerRow > 0 && balanceBefore !== balanceAfter,
    `row=${ledgerRow} ${balanceBefore} → ${balanceAfter}`);

  // 7. staff creates an instruction, owner approves and posts it in the UI
  const staff = await browser.newContext({baseURL: BASE, ignoreHTTPSErrors: true});
  const staffPage = await staff.newPage();
  await login(staffPage, STAFF);
  await staffPage.goto(`${BASE}/cash`);
  await staffPage.fill('input[name="employeeName"]', 'Browser Escort');
  await staffPage.fill('input[name="employeeMobile"]', '01711112222');
  await staffPage.selectOption('select[name="method"]', 'bkash');
  await staffPage.fill('input[name="amount"]', '1200.00');
  await staffPage.selectOption('select[name="accountId"]', 'acc-cash');
  await staffPage.click('button:has-text("Create (review)")');
  await staffPage.waitForSelector('span.pill:has-text("REVIEW")', {timeout: 15000});
  record('staff instruction appears as REVIEW', true);

  await page.goto(`${BASE}/cash`);
  await page.reload();
  await page.locator('tr:has-text("Browser Escort"):has-text("REVIEW") button:has-text("Approve")').first().click();
  await page.waitForSelector('tr:has-text("Browser Escort"):has-text("APPROVED")', {timeout: 15000});
  record('owner approves from the UI', true);
  await page.locator('tr:has-text("Browser Escort"):has-text("APPROVED") button:has-text("Post")').first().click();
  await page.waitForSelector('tr:has-text("Browser Escort"):has-text("POSTED")', {timeout: 15000});
  record('owner posts to the ledger from the UI', true);
  const pendingButtons = await page.locator('tr:has-text("Browser Escort"):has-text("POSTED") button').count();
  record('posted row has no further actions', pendingButtons === 0, `${pendingButtons} buttons`);
  await page.reload();
  const finalBalance = await page.locator('.stat:has-text("CASH") .value').first().innerText();
  record('balance reflects income minus posted payment', finalBalance.replace(/[^0-9.]/g, '') === '1300.00', finalBalance);

  // 8. payroll rate + calculation
  await page.goto(`${BASE}/payroll`);
  await page.fill('input[name="destinationKey"]', 'default');
  await page.fill('input[name="destinationLabel"]', 'Default');
  await page.fill('input[name="shiftRateMinor"]', '20000');
  await page.fill('input[name="conveyanceMinor"]', '0');
  await page.click('button:has-text("Save rate")');
  await page.waitForSelector('td:has-text("Default")', {timeout: 15000});
  await page.reload();
  const payText = await page.locator('body').innerText();
  record('payroll page shows a configured rate and computed pay', payText.includes('Default') && /৳[\d,]+\.\d{2}/.test(payText));

  // 9. reports export, fetched with the browser session (headless download
  //    event handling is unreliable; the response and its headers are asserted)
  await page.goto(`${BASE}/reports`);
  const csv = await page.request.get(`${BASE}/api/reports?type=employees`);
  const csvBody = await csv.text();
  record('CSV export returns a download',
    csv.status() === 200 &&
    (csv.headers()['content-disposition'] ?? '').includes('attachment') &&
    csvBody.split('\n')[0].includes('employee_mobile'),
    `status ${csv.status()}`);

  // 10. logout
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('**/login', {timeout: 15000});
  record('logout returns to the login page', true);

  await staff.close();
  await owner.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nBROWSER SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '));
  process.exitCode = 1;
}
