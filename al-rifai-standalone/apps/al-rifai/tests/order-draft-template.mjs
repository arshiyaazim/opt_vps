// Owner draft layout (decision F) rendered from parsed fields, with the approved
// Bangladesh shift boundary (D5). No sending, no delivery.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_DRAFT_FOOTER,
  draftDateDisplay,
  isOwnerDraft,
  masterMobileDisplay,
  renderOwnerDraft,
  vesselDisplayName,
} from '../lib/order-draft-template.ts';

// The Owner's own example, verbatim. 03/11/26 18:30 Dhaka = 12:30Z is Day.
const OWNER_EXAMPLE = [
  'Mother Vessel: M.V. Union-Odyssey',
  'Importer',
  'Lighter Vessel:M.V. Fardin-7',
  'Master mobile:-01911-428354',
  'Destination:',
  'Escort Name:',
  'Escort mobile:',
  '03/11/26 ((D))',
  '',
  "Al-Rifa'i Integrated Services",
].join('\n');

test('renders the Owner template exactly, line for line', () => {
  const text = renderOwnerDraft({
    motherVessel: 'Union-Odyssey',
    lighterVessel: 'Fardin-7',
    masterMobile: '+8801911428354',
    destination: '',
    timestamp: '2026-11-03T06:30:00Z', // 12:30 Asia/Dhaka
  });
  assert.equal(text, OWNER_EXAMPLE);
  assert.equal(text.split('\n').length, 10);
  assert.ok(isOwnerDraft(text));
});

test('the M.V. prefix is added once and never duplicated', () => {
  assert.equal(vesselDisplayName('Union-Odyssey'), 'M.V. Union-Odyssey');
  assert.equal(vesselDisplayName('M.V. Union-Odyssey'), 'M.V. Union-Odyssey');
  assert.equal(vesselDisplayName('MV.Union-Odyssey'), 'M.V. Union-Odyssey');
  assert.equal(vesselDisplayName('Mv Union-Odyssey'), 'M.V. Union-Odyssey');
  assert.equal(vesselDisplayName(''), '');
  const text = renderOwnerDraft({
    motherVessel: 'M.V. Union-Odyssey',
    lighterVessel: 'M.V. Fardin-7',
    masterMobile: '01911428354',
    timestamp: '2026-11-03T06:30:00Z',
  });
  assert.match(text, /^Mother Vessel: M\.V\. Union-Odyssey$/m);
  assert.match(text, /^Lighter Vessel:M\.V\. Fardin-7$/m);
});

test('master mobile is rendered in the client dash form from any accepted spelling', () => {
  assert.equal(masterMobileDisplay('+8801911428354'), '01911-428354');
  assert.equal(masterMobileDisplay('01911428354'), '01911-428354');
  assert.equal(masterMobileDisplay('01911-428354'), '01911-428354');
  assert.equal(masterMobileDisplay('৮৮০ ১৯১১-৪২৮৩৫৪'), '01911-428354');
  assert.equal(masterMobileDisplay('12345'), '');
});

test('draft date uses dd/mm/yy', () => {
  assert.equal(draftDateDisplay('2026-11-03'), '03/11/26');
  assert.equal(draftDateDisplay('2027-01-09'), '09/01/27');
  assert.equal(draftDateDisplay('2026-11-3'), '');
});

test('shift comes from the arrival timestamp with the approved 06:00/18:00 boundary', () => {
  const base = {motherVessel: 'Union-Odyssey', lighterVessel: 'Fardin-7', masterMobile: '01911428354'};
  const shiftLine = (timestamp) => renderOwnerDraft({...base, timestamp}).split('\n')[7];

  assert.equal(shiftLine('2026-11-03T00:00:00Z'), '03/11/26 ((D))'); // 06:00 exactly → Day
  assert.equal(shiftLine('2026-11-03T11:59:59Z'), '03/11/26 ((D))'); // 17:59:59
  assert.equal(shiftLine('2026-11-03T12:00:00Z'), '03/11/26 ((N))'); // 18:00 exactly → Night
  assert.equal(shiftLine('2026-11-03T23:59:59Z'), '04/11/26 ((N))'); // 05:59:59 next day
  assert.equal(shiftLine('2026-11-03T18:30:00Z'), '04/11/26 ((N))'); // 00:30 next day
});

test('a known destination is rendered, an absent one stays blank — never invented', () => {
  const withDestination = renderOwnerDraft({
    motherVessel: 'Union odyssey',
    lighterVessel: 'Fardin 7',
    masterMobile: '01911428354',
    destination: 'kacpur',
    timestamp: '2026-11-03T06:30:00Z',
  });
  assert.match(withDestination, /^Destination: kacpur$/m);

  for (const destination of ['', '   ', null, undefined]) {
    const text = renderOwnerDraft({
      motherVessel: 'Union odyssey', lighterVessel: 'Fardin 7', masterMobile: '01911428354',
      destination, timestamp: '2026-11-03T06:30:00Z',
    });
    assert.match(text, /^Destination:$/m);
  }
});

test('required fields are refused, not rendered blank', () => {
  const good = {motherVessel: 'A', lighterVessel: 'B', masterMobile: '01911428354', timestamp: '2026-11-03T06:30:00Z'};
  assert.throws(() => renderOwnerDraft({...good, motherVessel: ''}), /DRAFT_FIELDS_REQUIRED:motherVessel/);
  assert.throws(() => renderOwnerDraft({...good, lighterVessel: ''}), /DRAFT_FIELDS_REQUIRED:lighterVessel/);
  assert.throws(() => renderOwnerDraft({...good, masterMobile: ''}), /DRAFT_FIELDS_REQUIRED:masterMobile/);
  assert.throws(() => renderOwnerDraft({...good, masterMobile: '123'}), /DRAFT_FIELDS_REQUIRED:masterMobile/);
  assert.throws(() => renderOwnerDraft({...good, timestamp: 'nope'}), /DRAFT_FIELDS_REQUIRED:timestamp/);
});

test('the escort fields are always blank — the Admin reply is the confirmation', () => {
  const text = renderOwnerDraft({
    motherVessel: 'Union-Odyssey', lighterVessel: 'Fardin-7', masterMobile: '01911428354',
    timestamp: '2026-11-03T06:30:00Z',
  });
  assert.match(text, /^Escort Name:$/m);
  assert.match(text, /^Escort mobile:$/m);
  assert.ok(text.trimEnd().endsWith(OWNER_DRAFT_FOOTER));
  assert.equal(text.split('\n')[8], '');
});
