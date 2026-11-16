// Target 02 · P1 — free-text Vessel order parsing.
//
// The fixture is the Owner-authorized 2026-11-04 Beltokyo / Ritaj message that
// the previous parser dropped as NOT_VESSEL_INTENT. The structured-list and
// confirmation fixtures guard the existing grammar against regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {deriveEscortRegisterOps, OWNER_ESCORT_CLIENTS} from '../lib/escort-register.mjs';
import {matchConfirmation} from '../lib/vessel-match.ts';

const FREE_TEXT = `Mother vessel Mv Beltokyo, yellow corn to Amram feed
Mv Ritaj
Capacity 2000mt
K/a to rupshi

master
+880 1921-155548
driver
+880 1992-783176

Note: Gang lighter`;

const LIST = `MV.BELTOKYO
CARGO.YELLOW CORN
A/C.ARMAN FEED
LOADING FROM KUTUBDIA




3.MV.PUSPITA-3
QTY.1200 MT.
DESTINATION RUPSHI
MOB.01743932633

4.MV.BORKAT JIDAN-2
QTY.1100 MT.
DESTINATION.RUPSHI
MOB.01943352375

5.MV.MYMUNA-3
QTY.1700 MT.
DESTINATION RUPSHI
MOB.01943352375`;

const CONFIRM_RITAJ = `Mother Vessel: M.V. Beltokyo
Importer
Lighter Vessel:M.V. Ritaj
Master mobile:-01921-155548
Destination:
Escort Name: Payel Hossain
Escort mobile:-01784-297908
04/11/26 ((N)

Al-Rifa'i Integrated Services`;

const CONFIRM = `Mother Vessel: M.V. Beltokyo
Importer
Lighter Vessel:M.V. Puspita-3
Master mobile:-01743-932633
Destination:
Escort Name: Joy Samadder
Escort mobile:-01405-847642
04/11/26 ((N)

Al-Rifa'i Integrated Services`;

const parse = (text, date = '2026-11-04') => parseEscortOrder(text, {messageDate: date});

test('the real free-text Ritaj order yields exactly one valid block', () => {
  const blocks = parse(FREE_TEXT);
  assert.equal(blocks.length, 1);
  const b = blocks[0];
  assert.equal(b.fields.motherVessel, 'Beltokyo');
  assert.equal(b.fields.lighterVessel, 'Ritaj');
  assert.equal(b.masterMobile, '+8801921155548');
  assert.equal(b.masterMobileState, 'VALID');
  assert.equal(b.fields.capacity, '2000mt');
  assert.equal(b.fields.destination, 'rupshi');
  assert.deepEqual(b.reasons, []);
});

test('free text never invents a date or a shift', () => {
  const b = parse(FREE_TEXT)[0];
  assert.equal(b.assignmentDate, null);
  assert.equal(b.shift, null);
  assert.equal(b.bookingDate, null);
});

test('free-text evidence keeps the original line and raw value per field', () => {
  const b = parse(FREE_TEXT)[0];
  assert.equal(b.fieldEvidence.motherVessel.bodyLine, 1);
  assert.match(b.fieldEvidence.motherVessel.raw, /^Mv Beltokyo/);
  assert.equal(b.fieldEvidence.lighterVessel.bodyLine, 2);
  assert.equal(b.fieldEvidence.lighterVessel.raw, 'Mv Ritaj');
  assert.equal(b.fieldEvidence.masterMobile.bodyLine, 7);
  assert.equal(b.fieldEvidence.capacity.bodyLine, 3);
  assert.equal(b.fieldEvidence.destination.bodyLine, 4);
});

test('a pipe-separated free-text order parses the same way', () => {
  const oneLine = 'Mother vessel Mv Beltokyo, yellow corn to Amram feed | Mv Ritaj | Capacity 2000mt | K/a to rupshi | master | 01743932633';
  const blocks = parse(oneLine);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.motherVessel, 'Beltokyo');
  assert.equal(blocks[0].fields.lighterVessel, 'Ritaj');
  assert.equal(blocks[0].masterMobile, '+8801743932633');
  assert.equal(blocks[0].fields.destination, 'rupshi');
});

test('the structured multi-lighter list is unchanged', () => {
  const blocks = parse(LIST);
  assert.deepEqual(blocks.map(b => b.fields.lighterVessel), ['PUSPITA-3', 'BORKAT JIDAN-2', 'MYMUNA-3']);
  assert.deepEqual(blocks.map(b => b.fields.motherVessel), ['BELTOKYO', 'BELTOKYO', 'BELTOKYO']);
  assert.deepEqual(blocks.map(b => b.masterMobile), ['+8801743932633', '+8801943352375', '+8801943352375']);
  assert.deepEqual(blocks.map(b => b.fields.destination), ['RUPSHI', 'RUPSHI', 'RUPSHI']);
  for (const b of blocks) assert.deepEqual(b.reasons, []);
});

test('the Admin confirmation still parses with its shift and no invented fields', () => {
  const [b] = parse(CONFIRM);
  assert.equal(b.fields.lighterVessel, 'Puspita-3');
  assert.equal(b.fields.motherVessel, 'Beltokyo');
  assert.equal(b.masterMobile, '+8801743932633');
  assert.equal(b.shift, 'N');
  assert.equal(b.assignmentDate, '2026-11-04');
  assert.equal(b.fields.escortName, 'Joy Samadder');
});

test('Bangla labels supported by the business rules still parse', () => {
  const bn = `মাদার ভেসেল: M.V. Beltokyo
লাইটার ভেসেল: M.V. Ritaj
মাস্টার মোবাইল: 01743932633
গন্তব্য: RUPSHI`;
  const blocks = parse(bn);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.motherVessel, 'Beltokyo');
  assert.equal(blocks[0].fields.lighterVessel, 'Ritaj');
  assert.equal(blocks[0].masterMobile, '+8801743932633');
});

test('ordinary non-vessel messages never become orders', () => {
  for (const text of [
    'Khoraki painai',
    'আর লোক আছে?',
    'ID: 01895251021 Yousuf Hossen Sumon 01895251021(B) 200/- Halishahor night duty man',
    'ভাই, প্রোগ্রাম কি আসছে?',
    'Please call me back',
    '',
  ]) {
    assert.equal(parse(text).length, 0, text);
  }
});

// ── pipeline integration (pure) ──────────────────────────────────────────────

const account = {accountId: 'wa-01'};
const contacts = [{id: OWNER_ESCORT_CLIENTS[0].id, account_id: 'wa-01', phone: OWNER_ESCORT_CLIENTS[0].phone, active: true}];
const aliases = {166082241384593: OWNER_ESCORT_CLIENTS[0].phone};
const msg = (id, text, at, direction = 'INCOMING') => ({
  accountId: 'wa-01', id, chatJid: '166082241384593@lid', text, direction, sourceTime: at,
  nativeSenderJid: direction === 'INCOMING' ? '166082241384593@lid' : '93282931581172@lid',
  senderPhoneTransport: direction === 'INCOMING' ? '166082241384593@lid' : '93282931581172@lid',
});
const derive = (messages, existing = []) => deriveEscortRegisterOps(account, messages, contacts, existing, aliases, [], [],
  {epoch: 'CANONICAL_BACKFILL_20261026', requireVerifiedAdmin: true,
   isVerifiedAdmin: m => m.direction === 'OUTGOING'});

test('the free-text order becomes one Draft with a logical order identity', () => {
  const ops = derive([msg('FREE-TEXT-1', FREE_TEXT, '2026-11-04T14:31:28+00:00')]);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].kind, 'DRAFT');
  assert.equal(ops[0].row.lighterVessel, 'Ritaj');
  assert.equal(ops[0].row.motherVessel, 'Beltokyo');
  assert.equal(ops[0].row.masterMobile, '+8801921155548');
  assert.ok(ops[0].row.parsed.logicalOrderId, 'logical identity recorded');
});

test('a repeated free-text fragment is one logical order', () => {
  const first = msg('FREE-TEXT-1', FREE_TEXT, '2026-11-04T14:31:28+00:00');
  const second = msg('FREE-TEXT-2', FREE_TEXT, '2026-11-04T14:33:10+00:00');
  const ops = derive([first, second]);
  const ids = new Set(ops.filter(o => o.kind === 'DRAFT').map(o => o.row.parsed.logicalOrderId));
  assert.equal(ids.size, 1);
});

test('the Admin confirmation links to the Draft created from the free-text order', () => {
  const order = msg('FREE-TEXT-1', FREE_TEXT, '2026-11-04T14:31:28+00:00');
  const ops = derive([order]);
  const draft = ops[0].row;
  const [b] = parse(CONFIRM_RITAJ);
  const match = matchConfirmation([{
    id: draft.id, messageId: order.id, chatJid: order.chatJid,
    mother: draft.motherVessel, lighter: draft.lighterVessel, masterRaw: draft.masterMobile,
    sourceTime: order.sourceTime, shift: '', dutyDate: '',
  }], {
    messageId: 'CONF', chatJid: order.chatJid, mother: b.fields.motherVessel,
    lighter: b.fields.lighterVessel, masterRaw: b.fields.masterMobile,
    sourceTime: '2026-11-04T17:32:40+00:00', shift: b.shift,
  });
  assert.ok(['EXACT', 'VARIANT'].includes(match.state), match.state);
  assert.equal(match.orderId, draft.id);
});

test('a confirmation without any Draft stays unmatched', () => {
  const [b] = parse(CONFIRM.replace('Puspita-3', 'Ritaj'));
  const match = matchConfirmation([], {
    messageId: 'CONF', chatJid: '166082241384593@lid', mother: b.fields.motherVessel,
    lighter: b.fields.lighterVessel, masterRaw: b.fields.masterMobile,
    sourceTime: '2026-11-04T17:32:40+00:00', shift: b.shift,
  });
  assert.equal(match.state, 'UNMATCHED');
  assert.equal(match.orderId, null);
});

test('WA-01 scope boundary: a WA-02 free-text order produces no operations', () => {
  const ops = deriveEscortRegisterOps({accountId: 'wa-02'}, [msg('WA02', FREE_TEXT, '2026-11-04T14:31:28+00:00')],
    contacts, [], aliases, [], [], {epoch: 'CANONICAL_BACKFILL_20261026'});
  assert.deepEqual(ops, []);
});

test('an unknown chat is not an authorized source', () => {
  const stranger = {...msg('STRANGER', FREE_TEXT, '2026-11-04T14:31:28+00:00'), chatJid: '999999999999@s.whatsapp.net'};
  assert.deepEqual(derive([stranger]), []);
});
