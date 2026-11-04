// Parser corrections P1-A–C, pinned to the Owner's real message shapes.
//
// Every order test uses synthetic master mobiles (017000000NN) so no real
// contact number is committed. The vessel names, labels, capacities and
// destinations are the Owner's own examples, verbatim where the rule names them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';

const M1 = '01700000001';
const M2 = '01700000002';
const M3 = '01700000003';

test('Example A: one Mother Vessel, three Lighter drafts, one mobile each', () => {
  const text = [
    'Mv.Union Udyssy',
    `3.Liberty -${M1}/1000 m.t`,
    `4.Rahman asif-${M2} /1000 m.t`,
    `5.borkot jidan 2-${M3}/1000 m.t`,
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-11-03'});
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map((b) => b.fields.lighterVessel), ['Liberty', 'Rahman asif', 'borkot jidan 2']);
  assert.deepEqual(blocks.map((b) => b.fields.motherVessel), ['Union Udyssy', 'Union Udyssy', 'Union Udyssy']);
  assert.deepEqual(blocks.map((b) => b.masterMobile), ['+8801700000001', '+8801700000002', '+8801700000003']);
  assert.deepEqual(blocks.map((b) => b.fields.capacity), ['1000 m.t', '1000 m.t', '1000 m.t']);
  // No destination was supplied, so none may be produced — and never "/".
  for (const block of blocks) {
    assert.equal(block.fields.destination ?? '', '');
    const lines = block.fieldEvidence ?? {};
    assert.equal(lines.destination, undefined);
  }
});

test('Example B: whitespace destination label is preserved, "/" never becomes a destination', () => {
  const text = [
    'Mv.Union odyssey',
    'Destination kacpur',
    `5.borkot jidan 2-${M1}/1000 m.t`,
    `6.Fardin 7-${M2}/900 m.t`,
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-11-03'});
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map((b) => b.fields.lighterVessel), ['borkot jidan 2', 'Fardin 7']);
  assert.deepEqual(blocks.map((b) => b.fields.destination), ['kacpur', 'kacpur']);
  assert.deepEqual(blocks.map((b) => b.fields.capacity), ['1000 m.t', '900 m.t']);
  assert.deepEqual(blocks.map((b) => b.masterMobile), ['+8801700000001', '+8801700000002']);
});

test('Example C: AT-O/A makes the trailing MV line the Mother Vessel', () => {
  const text = [
    'MV.KASHFUL-2',
    'CAPACITY = 1800 MT',
    `MASTER = ${M1}`,
    'DESTINATION SHAH',
    'A/C=NOURISH',
    '',
    'AT-O/A',
    'MV.BULK BEQUIA',
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-10-27'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.lighterVessel, 'KASHFUL-2');
  assert.equal(blocks[0].fields.motherVessel, 'BULK BEQUIA');
  assert.equal(blocks[0].masterMobile, `+8801700000001`);
  assert.equal(blocks[0].fields.capacity, '1800 MT');
  assert.equal(blocks[0].fields.destination, 'SHAH');
  assert.equal(blocks[0].fields.importer, 'NOURISH');
  assert.deepEqual(blocks[0].reasons, []);
});

test('AT-O/A: a vessel line before the marker is a Lighter, never the Mother', () => {
  const text = [
    'MV.ALPHA-ONE',
    `MASTER = ${M1}`,
    'MV.BETA-TWO',
    `MASTER = ${M2}`,
    'AT-O/A',
    'MV.MOTHER STAR',
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-10-27'});
  assert.ok(blocks.length >= 1);
  for (const block of blocks) assert.equal(block.fields.motherVessel, 'MOTHER STAR');
});

test('AT-O/A with no Mother Vessel after the marker fails closed with a reason', () => {
  const text = [
    'MV.KASHFUL-2',
    'CAPACITY = 1800 MT',
    `MASTER = ${M1}`,
    'AT-O/A',
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-10-27'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.motherVessel, '');
  assert.ok(blocks[0].reasons.includes('AT_OA_MOTHER_MISSING'));
});

test('"DESTINATION SHAH" works with or without ":" and "="', () => {
  for (const line of ['DESTINATION SHAH', 'Destination : SHAH', 'destination=SHAH', 'DESTINATION - SHAH']) {
    const text = ['MV.ALPHA', `MASTER = ${M1}`, line].join('\n');
    const blocks = parseEscortOrder(text, {messageDate: '2026-10-27'});
    assert.equal(blocks[0]?.fields.destination, 'SHAH', line);
  }
});

test('a separator-only inline tail is never stored as a destination', () => {
  for (const separator of ['/', '-', '|', '//']) {
    const text = ['Mv.Union Udyssy', `3.Liberty -${M1}${separator}1000 m.t`].join('\n');
    const blocks = parseEscortOrder(text, {messageDate: '2026-11-03'});
    assert.equal(blocks[0]?.fields.lighterVessel, 'Liberty', separator);
    assert.equal(blocks[0]?.fields.destination ?? '', '', separator);
    assert.equal(blocks[0]?.fields.capacity, '1000 m.t', separator);
  }
});

test('Bengali labels, Bengali digits, clock suffix and a leading comma', () => {
  // Sanitised regression of the real authorized message AC77A457 (2026-09-17):
  // same labels and shapes, synthetic mobile number.
  const text = [
    'Mv, Kohinur-1',
    `মাস্টার:${M1}`,
    'ক্যাপাসিটি:১৭০০ mts',
    'মাদার ভেসেল:Mv,Belforte',
    '১২/০৯/২৬(৯:৪০AM)',
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-10-27'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.lighterVessel, 'Kohinur-1');
  assert.equal(blocks[0].fields.motherVessel, 'Belforte');
  assert.equal(blocks[0].masterMobile, '+8801700000001');
  assert.equal(blocks[0].fields.capacity, '1700 mts'); // Bengali digits normalised
  assert.equal(blocks[0].assignmentDate, '2026-09-12'); // "(9:40AM)" is a clock, not a shift
  assert.equal(blocks[0].shift, null);
});

test('existing verified formats are unchanged (confirmation layout, labels, shift)', () => {
  const text = [
    'Mother Vessel: M.V. Union-Odyssey',
    'Importer',
    'Lighter Vessel:M.V. Fardin-7',
    `Master mobile:-01911-428354`,
    'Destination:',
    'Escort Name:Nurun Nabi',
    'Escort mobile:-01920547773',
    '03/11/26 ((N))',
    '',
    "Al-Rifa'i Integrated Services",
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-11-03'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.motherVessel, 'Union-Odyssey');
  assert.equal(blocks[0].fields.lighterVessel, 'Fardin-7');
  assert.equal(blocks[0].masterMobile, '+8801911428354');
  assert.equal(blocks[0].fields.escortName, 'Nurun Nabi');
  assert.equal(blocks[0].employeeMobile, '+8801920547773');
  assert.equal(blocks[0].assignmentDate, '2026-11-03');
  assert.equal(blocks[0].shift, 'N');
  assert.equal(blocks[0].fields.destination ?? '', '');
});

test('the Admin confirmation with Start date + Time still parses to a shift', () => {
  const text = [
    'Mother Vessel: M.V.Belyamato At O/A',
    'Lighter Vessel: M.V.Kalam Ahona-3',
    `Master Mobile: ${M1}`,
    'Escort Name: Abul Hasem',
    `Escort Mobile: ${M2}`,
    'Start date: 08-09-2026',
    'Time: Day',
  ].join('\n');

  const blocks = parseEscortOrder(text, {messageDate: '2026-09-21'});
  assert.equal(blocks[0].assignmentDate, '2026-09-08');
  assert.equal(blocks[0].shift, 'D');
  assert.equal(blocks[0].fields.escortName, 'Abul Hasem');
});
