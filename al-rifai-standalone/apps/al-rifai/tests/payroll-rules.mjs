// Payroll engine regressions: configurable rates, shift accounting, transport
// separation, and the historical release-day convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDuty,
  shiftAccounting,
  calendarSpanDays,
  PROPOSED_EMPLOYEE_DAY_RATE_MINOR,
  HISTORICAL_CUSTOMER_CHARGE_MINOR,
  DEFAULT_PAYROLL_CONFIG,
} from '../lib/payroll-rules.ts';

const duty = (over = {}) => ({
  startDate: '2026-10-01', startShift: 'D',
  releaseDate: '2026-10-04', endShift: 'D',
  transportMinor: null, ...over,
});

test('one full duty day (two shifts) at the proposed rate is BDT 450', () => {
  // Same calendar day with a D start and N end holds both shifts.
  const result = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N'}));
  assert.equal(result.ok, true);
  assert.equal(result.totalShifts, 2);
  assert.equal(result.equivalentDutyDays, 1);
  assert.equal(result.employeePayMinor, 45_000);
});

test('historical release-day convention matches the observed billing shape', () => {
  assert.equal(shiftAccounting({startDate: '2026-10-01', startShift: 'D', releaseDate: '2026-10-04', endShift: 'D', policy: 'HALF_DAY_ENDS'}).days, 3.5);
  assert.equal(shiftAccounting({startDate: '2026-10-01', startShift: 'N', releaseDate: '2026-10-04', endShift: 'D', policy: 'HALF_DAY_ENDS'}).days, 3);
  const inclusive = shiftAccounting({startDate: '2026-10-01', startShift: 'D', releaseDate: '2026-10-04', endShift: 'D', policy: 'INCLUSIVE'});
  assert.equal(inclusive.days, 4);
  assert.equal(calendarSpanDays('2026-10-01', '2026-10-04'), 4);
});

test('transport is additive only when explicitly approved', () => {
  const base = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N'}));
  assert.equal(base.employeePayMinor, 45_000);
  assert.equal(base.transportMinor, null);
  assert.equal(base.totalPayableMinor, 45_000);
  assert.ok(base.reasons.includes('TRANSPORT_NOT_APPROVED'));

  const withTransport = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N', transportMinor: 70_000}));
  assert.equal(withTransport.totalPayableMinor, 115_000);
  assert.deepEqual(withTransport.reasons, []);
});

test('employee pay and customer charge stay separate', () => {
  const result = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N'}));
  assert.equal(result.employeePayMinor, PROPOSED_EMPLOYEE_DAY_RATE_MINOR);
  assert.equal(result.customerChargeMinor, HISTORICAL_CUSTOMER_CHARGE_MINOR);
  assert.notEqual(result.employeePayMinor, result.customerChargeMinor);
});

test('rates are configurable per calculation without touching history', () => {
  const configured = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N'}), {...DEFAULT_PAYROLL_CONFIG, employeeDayRateMinor: 50_000});
  assert.equal(configured.employeePayMinor, 50_000);
  const overridden = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-01', endShift: 'N', employeeDayRateMinor: 40_000}));
  assert.equal(overridden.employeePayMinor, 40_000);
});

test('missing release date or invalid shifts are unresolved, never guessed', () => {
  const noRelease = computeDuty(duty({releaseDate: null}));
  assert.equal(noRelease.ok, false);
  assert.equal(noRelease.status, 'UNRESOLVED');
  assert.ok(noRelease.reasons.includes('RELEASE_DATE_NOT_RECORDED'));
  assert.equal(noRelease.employeePayMinor, null);

  const badShift = computeDuty(duty({startShift: 'X'}));
  assert.equal(badShift.status, 'INVALID');

  const beforeStart = computeDuty(duty({releaseDate: '2026-09-30'}));
  assert.equal(beforeStart.status, 'INVALID');
});

test('a night shift on the final day deducts half a day only for D end shifts', () => {
  const endNight = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-03', endShift: 'N'}));
  assert.equal(endNight.equivalentDutyDays, 3);
  const endDay = computeDuty(duty({startDate: '2026-10-01', releaseDate: '2026-10-03', endShift: 'D'}));
  assert.equal(endDay.equivalentDutyDays, 2.5);
});
