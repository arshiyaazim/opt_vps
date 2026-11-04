// Regression tests for the historical Vessel Order parsing corrections.
//
//   A. old client format "02. HADIZ, CAPACITY: 1,000 M/T, PHONE: 01863191301"
//   B. an incoming Order may carry a loading/booking date and still be a Draft
//   C. one Mother Vessel at message level applies to every Lighter
//   D. Master Mobile evidence is never repaired; a conflict goes to review
//
// The real client/contact identities below are the ones compiled into
// lib/escort-register.mjs (the authorized Hridoy / Rezaul conversations), so the
// source gate is exercised exactly as in production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {deriveEscortRegisterOps} from '../lib/escort-register.mjs';
import {isCashScopeOwner} from '../lib/cash-scope.ts';
import {programIdFor} from '../lib/vessel-match.ts';

const HRIDOY = {chat: '8801670535255@s.whatsapp.net', contact: 'escort-client-hridoy-wa01', phone: '+8801670535255'};
const REZAUL = {chat: '8801836743754@s.whatsapp.net', contact: 'escort-client-rezaul-karim-wa01', phone: '+8801836743754'};
const CONTACTS = [
  {id: HRIDOY.contact, account_id: 'wa-01', display_name: 'Escort Hridoy', phone: HRIDOY.phone, source: 'OWNER_PROVIDED', active: true},
  {id: REZAUL.contact, account_id: 'wa-01', display_name: 'Escort REZAUL KARIM', phone: REZAUL.phone, source: 'OWNER_PROVIDED', active: true},
];
const ALIASES = {[HRIDOY.phone.slice(1)]: HRIDOY.phone, [REZAUL.phone.slice(1)]: REZAUL.phone};
const CASH = [];

const OLD_ORDER = [
  'MV WAN MING 1,',
  'A/C: ARMAN FEEDS & FISHERIES,',
  'LOADING POINT: O/A,',
  '02. NEW SRIJON-1, CAPACITY: 1,000 M/T, PHONE: 01712602871',
  '03. HADIZ, CAPACITY: 1,000 M/T, PHONE: 01863191301',
  '04. ARISH AHMED-1, CAPACITY: 1,000 M/T, PHONE: 01795550445',
  'DESTINATION: RUPSHI,',
].join('\n');

const DATE_ORDER = [
  'Dear sir',
  'MV MEGNA SUN',
  'Loading place- Outer',
  '(41)MV. Z.L-1',
  'Master: 01735240504',
  'Capacity : 1300 M/T',
  '03/09/2026',
].join('\n');

const CONFIRMATION = (over = {}) => [
  `Mother Vessel: MV WAN MING 1`,
  `Lighter Vessel: HADIZ`,
  `Master Mobile: ${over.master ?? '01863191301'}`,
  `Escort Name: Sajibul Islam`,
  `Escort Mobile: 01900000000`,
  `Start Date: ${over.date ?? '13.07.2026'}`,
  `Shift: ${over.shift ?? 'Day'}`,
].join('\n');

let seq = 0;
const message = (chat, text, direction, timestamp) => ({
  accountId: 'wa-01', id: `MSG-${++seq}`, chatJid: chat, text,
  sourceTime: timestamp,
  direction,
  sender: direction === 'OUTGOING' ? '8801880446111@s.whatsapp.net' : chat,
  nativeSenderJid: direction === 'OUTGOING' ? '8801880446111@s.whatsapp.net' : chat,
  senderPhoneTransport: null, deletedAt: null,
});

const isVerifiedAdmin = (candidate) => candidate.direction === 'OUTGOING' && isCashScopeOwner(String(candidate.nativeSenderJid ?? ''));

/** Replays a conversation the way the live processor does (verified-admin gate on). */
function run(messages) {
  const rows = [];
  const ops = [];
  for (const m of messages) {
    const produced = deriveEscortRegisterOps(
      {accountId: 'wa-01'}, [m], CONTACTS, rows, ALIASES, [], CASH,
      {epoch: 'CANONICAL_BACKFILL_20261026', requireVerifiedAdmin: true, isVerifiedAdmin, windowDays: 30},
    );
    for (const op of produced) {
      ops.push(op);
      rows.push({...op.row, account_id: op.row.accountId, client_contact_id: op.row.clientContactId,
        client_phone: op.row.clientPhone, chat_jid: op.row.chatJid, source_time: op.row.sourceTime,
        dataset_epoch: 'CANONICAL_BACKFILL_20261026'});
    }
  }
  return {ops, rows};
}

// ── 1 ────────────────────────────────────────────────────────────────────────
test('1. old format: Lighter, Capacity and Phone are separated correctly', () => {
  const blocks = parseEscortOrder(OLD_ORDER, {messageDate: '2026-07-13'});
  assert.equal(blocks.length, 3);
  const hadiz = blocks.find((b) => b.fields.lighterVessel === 'HADIZ');
  assert.ok(hadiz, 'HADIZ must be its own Lighter');
  assert.equal(hadiz.fields.motherVessel, 'WAN MING 1');
  assert.equal(hadiz.masterMobile, '+8801863191301');
  assert.equal(hadiz.fields.capacity, '1,000 M/T');
  assert.equal(hadiz.fields.destination, 'RUPSHI');
  assert.equal(hadiz.fields.lighterVessel.includes('CAPACITY'), false);
  assert.equal(hadiz.fields.lighterVessel.includes('PHONE'), false);
});

// ── 2 ────────────────────────────────────────────────────────────────────────
test('2. multi-Lighter message shares one Mother Vessel and one Destination', () => {
  const blocks = parseEscortOrder(OLD_ORDER, {messageDate: '2026-07-13'});
  assert.deepEqual(blocks.map((b) => b.fields.lighterVessel), ['NEW SRIJON-1', 'HADIZ', 'ARISH AHMED-1']);
  for (const block of blocks) {
    assert.equal(block.fields.motherVessel, 'WAN MING 1');
    assert.equal(block.fields.destination, 'RUPSHI');
  }
  // Each Lighter keeps its own master mobile.
  assert.deepEqual(blocks.map((b) => b.masterMobile), ['+8801712602871', '+8801863191301', '+8801795550445']);
});

test('2b. a per-Lighter destination is never overridden by the message-level one', () => {
  const text = [
    'MV WAN MING 1,',
    '02. NEW SRIJON-1, CAPACITY: 1,000 M/T, PHONE: 01712602871',
    '03. HADIZ, CAPACITY: 1,000 M/T, PHONE: 01863191301 N.GONJ',
    'DESTINATION: RUPSHI,',
  ].join('\n');
  const blocks = parseEscortOrder(text, {messageDate: '2026-07-13'});
  assert.equal(blocks[0].fields.destination, 'RUPSHI');
  assert.equal(blocks[1].fields.destination, 'N.GONJ');
});

// ── 3 ────────────────────────────────────────────────────────────────────────
test('3. a loading/booking date does not block Draft creation', () => {
  const {ops} = run([message(HRIDOY.chat, DATE_ORDER, 'INCOMING', '2026-09-04T10:00:00Z')]);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].kind, 'DRAFT');
  assert.equal(ops[0].row.lighterVessel, 'Z.L-1');
  assert.equal(ops[0].row.masterMobile, '+8801735240504');
  // The date is preserved as a hint, never as a confirmed assignment.
  assert.equal(ops[0].row.dutyDate, '2026-09-03');
  assert.equal(ops[0].row.escortName, '');
});

// ── 4 ────────────────────────────────────────────────────────────────────────
test('4. a completed Admin confirmation is extracted with all four assignment fields', () => {
  const blocks = parseEscortOrder(CONFIRMATION(), {messageDate: '2026-07-14'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.escortName, 'Sajibul Islam');
  assert.equal(blocks[0].employeeMobile, '+8801900000000');
  assert.equal(blocks[0].assignmentDate, '2026-07-13');
  assert.equal(blocks[0].shift, 'D');
  assert.equal(blocks[0].fields.motherVessel, 'WAN MING 1');
  assert.equal(blocks[0].fields.lighterVessel, 'HADIZ');
  assert.equal(blocks[0].masterMobile, '+8801863191301');
});

// ── 5 ────────────────────────────────────────────────────────────────────────
test('5. same-chat order → confirmation matches and yields one Program', () => {
  const {ops} = run([
    message(HRIDOY.chat, OLD_ORDER, 'INCOMING', '2026-07-13T10:00:00Z'),
    message(HRIDOY.chat, CONFIRMATION(), 'OUTGOING', '2026-07-14T10:00:00Z'),
  ]);
  const drafts = ops.filter((op) => op.kind === 'DRAFT');
  const reviews = ops.filter((op) => op.kind === 'REVIEW');
  assert.equal(drafts.length, 3);
  assert.equal(reviews.length, 1);

  const review = reviews[0];
  assert.equal(review.row.lighterVessel, 'HADIZ');
  assert.equal(review.row.parsed.confirmationMatch.state, 'EXACT');
  assert.equal(review.row.parsed.confirmationMatch.orderId, drafts.find((d) => d.row.lighterVessel === 'HADIZ').row.id);
  const pid = programIdFor({
    account: 'wa-01', clientChat: HRIDOY.chat, mother: review.row.motherVessel,
    lighter: review.row.lighterVessel, startDate: review.row.dutyDate, shift: review.row.shift,
  });
  assert.match(pid, /^[a-f0-9]{64}$/);
});

// ── 6 ────────────────────────────────────────────────────────────────────────
test('6. a confirmation in a different client chat never matches', () => {
  const {ops} = run([
    message(HRIDOY.chat, OLD_ORDER, 'INCOMING', '2026-07-13T10:00:00Z'),
    message(REZAUL.chat, CONFIRMATION(), 'OUTGOING', '2026-07-14T10:00:00Z'),
  ]);
  assert.equal(ops.filter((op) => op.kind === 'DRAFT').length, 3);
  // The foreign confirmation is still evidence, but it never matches this Order.
  const reviews = ops.filter((op) => op.kind === 'REVIEW');
  for (const review of reviews) {
    assert.equal(review.row.parsed.confirmationMatch.orderId, null);
    assert.notEqual(review.row.parsed.confirmationMatch.state, 'EXACT');
  }
});

test('6b. an incoming participant message is never treated as a confirmation', () => {
  const {ops} = run([
    message(HRIDOY.chat, OLD_ORDER, 'INCOMING', '2026-07-13T10:00:00Z'),
    message(HRIDOY.chat, CONFIRMATION(), 'INCOMING', '2026-07-14T10:00:00Z'),
  ]);
  assert.equal(ops.filter((op) => op.kind === 'REVIEW').length, 0);
});

// ── 7 ────────────────────────────────────────────────────────────────────────
test('7. a conflicting Master Mobile is held for review, never repaired', () => {
  const {ops} = run([
    message(HRIDOY.chat, OLD_ORDER, 'INCOMING', '2026-07-13T10:00:00Z'),
    message(HRIDOY.chat, CONFIRMATION({master: '01863191399'}), 'OUTGOING', '2026-07-14T10:00:00Z'),
  ]);
  const review = ops.find((op) => op.kind === 'REVIEW');
  assert.ok(review, 'the confirmation is still captured as evidence');
  assert.notEqual(review.row.parsed.confirmationMatch.state, 'EXACT');
  assert.equal(review.row.parsed.confirmationMatch.orderId, null);
  assert.ok(review.row.reasons.some((r) => r.startsWith('ASSIGNMENT_') || r === 'DRAFT_MATCH_UNRESOLVED'));
});

// ── 8 ────────────────────────────────────────────────────────────────────────
test('8. duplicate confirmations for the same duty derive the same Program identity', () => {
  const base = {account: 'wa-01', clientChat: HRIDOY.chat, mother: 'WAN MING 1', lighter: 'HADIZ', startDate: '2026-07-13', shift: 'D'};
  assert.equal(programIdFor(base), programIdFor({...base}));
  assert.notEqual(programIdFor(base), programIdFor({...base, shift: 'N'}));
});

// ── 9 ────────────────────────────────────────────────────────────────────────
test('9. modern formats still parse exactly as before', () => {
  const modern = [
    'Mv.Union Udyssy',
    '3.Liberty -01833258225/1000 m.t',
    '4.Rahman asif-01819327176 /1000 m.t',
  ].join('\n');
  const blocks = parseEscortOrder(modern, {messageDate: '2026-11-03'});
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map((b) => b.fields.lighterVessel), ['Liberty', 'Rahman asif']);
  assert.equal(blocks[0].fields.destination ?? '', '', 'a separator is still not a destination');

  // A food-bill line is not an Order and must not become a block.
  assert.deepEqual(parseEscortOrder(`ID: 01700000001 Name 01700000002(B) 900/- food bill`, {messageDate: '2026-10-27'}), []);
});

// ── 10 ───────────────────────────────────────────────────────────────────────
test('10. operational chatter never creates a Draft', () => {
  const messages = [
    'শাহেদ আতিক লাইটার সকালে খালি হয়েছে আমি সাইফুল ভাইকে বলছি ওরা গাড়ি ভাড়ার জন্য আসতে পারছেনা',
    'He has taken 250 Advanced on 26/07/26.',
    'Khaber bill 600 taka',
    'Food bill...',
  ];
  for (const text of messages) {
    assert.deepEqual(parseEscortOrder(text, {messageDate: '2026-09-10'}), [], text);
  }
  const {ops} = run([message(HRIDOY.chat, 'Khaber bill 600 taka', 'INCOMING', '2026-09-10T10:00:00Z')]);
  assert.equal(ops.length, 0);
});

// ── 11 ───────────────────────────────────────────────────────────────────────
test('11. "LIGHTER VESSEL:" followed by an old-format line is split too', () => {
  const text = [
    'MV MEGHNA SUN,',
    'A/C: R R P AGRO FARMS,',
    'LIGHTER VESSEL:',
    '',
    '15. NISHAD-2,    CAPACITY: 850 M/T, PHONE: 01718062853',
    'DESTINATION: NOAPARA,',
  ].join('\n');
  const blocks = parseEscortOrder(text, {messageDate: '2026-09-02'});
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].fields.lighterVessel, 'NISHAD-2');
  assert.equal(blocks[0].fields.motherVessel, 'MEGHNA SUN');
  assert.equal(blocks[0].fields.capacity, '850 M/T');
  assert.equal(blocks[0].masterMobile, '+8801718062853');
  assert.equal(blocks[0].fields.destination, 'NOAPARA');
});

test('11b. a capacity suffix like "1,000 M/T(FIXED)" still yields the phone', () => {
  const text = [
    'MV MEGHNA SUN,',
    'LIGHTER VESSEL:',
    '',
    '16. S AFROZ-1, CAPACITY: 1,000 M/T(FIXED), PHONE: 01815700370',
  ].join('\n');
  const blocks = parseEscortOrder(text, {messageDate: '2026-09-05'});
  assert.equal(blocks[0].fields.lighterVessel, 'S AFROZ-1');
  assert.equal(blocks[0].masterMobile, '+8801815700370');
});
