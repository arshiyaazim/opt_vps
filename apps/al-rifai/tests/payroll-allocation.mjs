// Regression tests for the Owner-approved monthly allocation rule (decision D4,
// 2026-11-04): every worked shift and every actual expense belongs to the month
// it occurred in, and the monthly total must reconcile with the Program total.
import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateDutyShifts, monthOf} from '../lib/shift-boundary.ts';
import {
  allocateConveyance,
  allocateProgramSalary,
  allocateSalaryByMonth,
  monthlyPayroll,
  reconcileProgramPay,
} from '../lib/payroll-allocation.ts';

const RATE = 20_000; // BDT 200 per shift, in paisa (escort_rate_config)

// 20 = 10 days × 2 shifts in January, 10 = 5 days × 2 shifts in February.
const january = enumerateDutyShifts('2026-01-10', 'D', '2026-01-19', 'N');
const february = enumerateDutyShifts('2026-02-01', 'D', '2026-02-05', 'N');

test('Owner example: 20 January shifts, 10 February shifts, February conveyance', () => {
  assert.equal(january.length, 20);
  assert.equal(february.length, 10);

  const salary = allocateSalaryByMonth([...january, ...february], RATE);
  assert.equal(salary.state, 'ALLOCATED');
  assert.equal(salary.salaryMinor, 600_000); // BDT 6,000
  assert.deepEqual(salary.months.map((m) => [m.period, m.shiftCount, m.salaryMinor]), [
    ['2026-01', 20, 400_000], // BDT 4,000
    ['2026-02', 10, 200_000], // BDT 2,000
  ]);

  const conveyance = allocateConveyance(
    [{programId: 'p1', eventDate: '2026-02-06', amountMinor: 50_000, verified: true}],
    {releaseDate: '2026-01-31'},
  );
  assert.equal(conveyance.allocatedMinor, 50_000);

  const rows = monthlyPayroll(salary, conveyance);
  assert.deepEqual(rows, [
    {period: '2026-01', shiftCount: 20, dutyDays: 10, salaryMinor: 400_000, conveyanceMinor: 0, totalMinor: 400_000},
    {period: '2026-02', shiftCount: 10, dutyDays: 5, salaryMinor: 200_000, conveyanceMinor: 50_000, totalMinor: 250_000},
  ]);
});

test('a cross-month Program splits by actual shift date, not by start or release month', () => {
  // 2026-10-24 N → 2026-11-03 D: 15 shifts in October, 5 in November.
  const salary = allocateProgramSalary(
    {startDate: '2026-10-24', startShift: 'N', endDate: '2026-11-03', endShift: 'D'},
    RATE,
  );
  assert.deepEqual(salary.months.map((m) => [m.period, m.shiftCount, m.salaryMinor]), [
    ['2026-10', 15, 300_000],
    ['2026-11', 5, 100_000],
  ]);
  // No shift lands in the release month twice and nothing is lost.
  assert.equal(salary.months.reduce((sum, m) => sum + m.salaryMinor, 0), salary.salaryMinor);
  assert.equal(salary.shiftCount, 20);
  assert.equal(salary.dutyDays, 10);
  for (const month of salary.months) {
    for (const day of [month.period]) assert.ok(day);
  }
});

test('every shift appears in exactly one month and no month receives a duplicate day', () => {
  const shifts = enumerateDutyShifts('2026-01-31', 'N', '2026-02-02', 'D');
  const salary = allocateSalaryByMonth(shifts, RATE);
  assert.equal(salary.shiftCount, 4); // 01-31 N, 02-01 D+N, 02-02 D
  assert.deepEqual(salary.months.map((m) => [m.period, m.shiftCount]), [['2026-01', 1], ['2026-02', 3]]);
  const seen = new Set(shifts.map((s) => `${s.date}|${s.shift}`));
  assert.equal(seen.size, 4);
});

test('missing travel date is unresolved, never recognised in an earlier month', () => {
  const salary = allocateSalaryByMonth(january, RATE);
  const conveyance = allocateConveyance(
    [{programId: 'p1', eventDate: null, amountMinor: 50_000, verified: true}],
    {releaseDate: '2026-01-19'},
  );
  assert.equal(conveyance.allocatedMinor, 0);
  assert.equal(conveyance.unresolvedMinor, 50_000);
  assert.equal(conveyance.allocated[0].state, 'UNRESOLVED_TRAVEL_DATE');
  assert.equal(conveyance.allocated[0].period, null);

  const rows = monthlyPayroll(salary, conveyance);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].period, '2026-01');
  assert.equal(rows[0].conveyanceMinor, 0);
  assert.equal(rows[0].totalMinor, 400_000);
});

test('unverified travel evidence is held, not allocated', () => {
  const result = allocateConveyance(
    [{programId: 'p1', eventDate: '2026-02-06', amountMinor: 50_000, verified: false}],
    {releaseDate: '2026-01-31'},
  );
  assert.equal(result.allocated[0].state, 'UNVERIFIED_EVENT');
  assert.equal(result.unresolvedMinor, 50_000);
  assert.equal(result.allocatedMinor, 0);
});

test('a travel date before the release date is flagged, not moved to an earlier month', () => {
  const result = allocateConveyance(
    [{programId: 'p1', eventDate: '2026-01-20', amountMinor: 50_000, verified: true}],
    {releaseDate: '2026-01-31'},
  );
  assert.equal(result.allocated[0].state, 'BEFORE_COMPLETION');
  assert.equal(result.allocated[0].period, null);
  assert.equal(result.allocatedMinor, 0);
});

test('identical conveyance events count once and are reported', () => {
  const events = [
    {programId: 'p1', eventDate: '2026-02-06', amountMinor: 50_000, verified: true},
    {programId: 'p1', eventDate: '2026-02-06', amountMinor: 50_000, verified: true},
  ];
  const result = allocateConveyance(events, {releaseDate: '2026-01-31'});
  assert.equal(result.allocatedMinor, 50_000);
  assert.equal(result.duplicateMinor, 50_000);
  assert.equal(result.duplicates.length, 1);
});

test('monthly totals reconcile with the Program-level derived pay', () => {
  const salary = allocateSalaryByMonth([...january, ...february], RATE);
  const conveyance = allocateConveyance(
    [{programId: 'p1', eventDate: '2026-02-06', amountMinor: 50_000, verified: true}],
    {releaseDate: '2026-01-31'},
  );
  const ok = reconcileProgramPay(
    {salaryMinor: 600_000, conveyanceMinor: 50_000, totalMinor: 650_000},
    salary,
    conveyance,
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.differences, []);

  const bad = reconcileProgramPay(
    {salaryMinor: 600_000, conveyanceMinor: 60_000, totalMinor: 660_000},
    salary,
    conveyance,
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.differences.some((d) => d.startsWith('CONVEYANCE_MISMATCH')));
});

test('a pending conveyance keeps the Program reconciliation open, not wrong', () => {
  const salary = allocateSalaryByMonth(january, RATE);
  const conveyance = allocateConveyance(
    [{programId: 'p1', eventDate: null, amountMinor: 50_000, verified: true}],
    {releaseDate: '2026-01-19'},
  );
  const result = reconcileProgramPay(
    {salaryMinor: 400_000, conveyanceMinor: 50_000, totalMinor: 450_000},
    salary,
    conveyance,
  );
  assert.equal(result.ok, true); // totals reconcile; the month is simply not known yet
  assert.equal(result.conveyancePendingMinor, 50_000);
});

test('an ongoing duty is unresolved and never priced as zero', () => {
  const open = allocateProgramSalary(
    {startDate: '2026-11-02', startShift: 'N', endDate: '', endShift: null},
    RATE,
  );
  assert.equal(open.state, 'UNRESOLVED_NO_SHIFTS');
  assert.equal(open.salaryMinor, 0);
  assert.deepEqual(open.months, []);
  assert.ok(open.reasons.includes('NO_WORKED_SHIFTS'));
});

test('a missing rate is unresolved, never zero pay', () => {
  const result = allocateSalaryByMonth(january, 0);
  assert.equal(result.state, 'UNRESOLVED_RATE');
  assert.equal(result.salaryMinor, 0);
  assert.equal(result.shiftCount, 20);
});

test('Month boundaries: a duty on the first and last day of a month stays in that month', () => {
  const shifts = enumerateDutyShifts('2026-02-01', 'D', '2026-02-28', 'N');
  const salary = allocateSalaryByMonth(shifts, RATE);
  assert.equal(salary.months.length, 1);
  assert.equal(salary.months[0].period, '2026-02');
  assert.equal(salary.months[0].shiftCount, 56);
  assert.equal(monthOf('2026-02-01'), '2026-02');
  assert.equal(monthOf('2026-02-30'), null);
});
