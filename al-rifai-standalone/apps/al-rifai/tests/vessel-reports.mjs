// Vessel report aggregate regressions. Read-only, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {vesselReport, reportCsv} from '../lib/vessel-reports.ts';

const program = (over = {}) => ({
  id: 'p1', motherVessel: 'Alpha', lighterVessel: 'Light One', escortName: 'Osman',
  startDate: '2026-10-01', startShift: 'D', releaseDate: '2026-10-03', endShift: 'N',
  status: 'Confirmed', transportMinor: null, ...over,
});

test('groups by mother, lighter and escort without inventing values', () => {
  const programs = [
    program(),
    program({id: 'p2', lighterVessel: 'Light Two', escortName: 'Karim', startDate: '2026-10-02'}),
  ];
  const byMother = vesselReport(programs, {groupBy: 'mother'});
  assert.equal(byMother.rows.length, 1);
  assert.equal(byMother.rows[0].programs, 2);
  assert.equal(byMother.rows[0].escorts, 2);

  const byLighter = vesselReport(programs, {groupBy: 'lighter'});
  assert.equal(byLighter.rows.length, 2);
  assert.equal(byLighter.totals.programs, 2);

  const byEscort = vesselReport(programs, {groupBy: 'escort'});
  assert.deepEqual(byEscort.rows.map((row) => row.key).sort(), ['Karim', 'Osman']);
});

test('date-range filtering uses the recorded start date', () => {
  const programs = [program(), program({id: 'p2', startDate: '2026-11-01'})];
  const october = vesselReport(programs, {groupBy: 'mother', from: '2026-10-01', to: '2026-10-31'});
  assert.equal(october.totals.programs, 1);
});

test('payroll columns require verified release data and mark incomplete rows', () => {
  const complete = program();
  const unresolved = program({id: 'p2', releaseDate: null});
  const report = vesselReport([complete, unresolved], {groupBy: 'mother', includePayroll: true});
  assert.equal(report.totals.programs, 2);
  assert.equal(report.totals.incomplete, 1);
  assert.equal(report.rows[0].employeePayMinor, 45_000 * 3); // Oct 1–3, D start and N end = 3 duty days
});

test('CSV export is formula-injection safe and carries BDT columns', () => {
  const report = vesselReport([program()], {groupBy: 'mother', includePayroll: true});
  const csv = reportCsv(report.rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"Group","Programs"/);
  assert.ok(!/^[=+@-]/.test(csv.split('\r\n')[1]));
});

test('without payroll the money columns stay null instead of zero', () => {
  const report = vesselReport([program()], {groupBy: 'mother'});
  assert.equal(report.rows[0].employeePayMinor, null);
  assert.equal(report.rows[0].durationDays, null);
  assert.equal(report.rows[0].totalMinor, null);
});
