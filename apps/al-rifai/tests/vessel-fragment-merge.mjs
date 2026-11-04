// Target 01 — logical Vessel order identity.
//
// Real November 3 traffic showed that one business order can arrive as several
// message fragments. Each fragment used to become its own Draft, so the later
// Admin Confirmation matched 2–3 candidates and was refused as AMBIGUOUS.
//
// These fixtures use the exact message texts and timestamps recorded in the
// production audit. They assert logical merging without losing source evidence,
// and that genuine competition still fails closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveEscortRegisterOps, OWNER_ESCORT_CLIENTS} from '../lib/escort-register.mjs';

const account = {accountId: 'wa-01'};
const lidChat = '166082241384593@lid';
const adminLid = '93282931581172@lid';
const clientLid = '166082241384593@lid';
const contacts = [{id: OWNER_ESCORT_CLIENTS[0].id, account_id: 'wa-01', phone: OWNER_ESCORT_CLIENTS[0].phone, active: true}];
// Approved PN/LID alias, exactly as conversation_scope records it.
const aliases = {166082241384593: OWNER_ESCORT_CLIENTS[0].phone};

const message = (id, text, sourceTime, direction = 'INCOMING', over = {}) => ({
  accountId: 'wa-01', id, chatJid: direction === 'INCOMING' ? lidChat : lidChat, text, direction, sourceTime,
  nativeSenderJid: direction === 'INCOMING' ? clientLid : adminLid,
  senderPhoneTransport: direction === 'INCOMING' ? clientLid : adminLid,
  ...over,
});

// 2026-11-03, Hridoy's LID chat — three overlapping order fragments.
const FRAGMENT_A = `Mv.Union Udyssy
3.Liberty -01833258225/1000 m.t
4.Rahman asif-01819327176 /1000 m.t
5.borkot jidan 2-01943352375/1000 m.t
6.Fardin 7-01911428354/900 m.t
7.monjura-01975196024 /1000 m.t
8.Mottakin 2-01821327347/1800 m.t`;
const FRAGMENT_B = `Mv.Union Udyssy
3.Liberty -01833258225/1000 m.t
4.Rahman asif-01819327176 /1000 m.t
5.borkot jidan 2-01943352375/1000 m.t`;
const FRAGMENT_C = `Mv.Union odyssey /soyabean ext/Nabil feed mills | Destination kacpur
5.borkot jidan 2-01943352375/1000 m.t
6.Fardin 7-01911428354/900 m.t`;

const CONFIRM_RAHMAN = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. Rahman Asif
Master mobile:-01819-327176
Destination:
Escort Name:Monirul Alam
Escort mobile:-01858-898790
03/11/26 ((D)

Al-Rifa'i Integrated Services`;
const CONFIRM_FARDIN = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. Fardin-7
Master mobile:-01911-428354
Destination:
Escort Name: Mejbaul Hossain-Chodury
Escort mobile:-01921-388992
03/11/26 ((D)

Al-Rifa'i Integrated Services`;
const CONFIRM_BORKOT = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. Borkot Jidan
Master mobile:-01943-352375
Destination:
Escort Name: Nazmul Hossain
Escort mobile:-01321-706844
03/11/26 ((D)

Al-Rifa'i Integrated Services`;

const fragments = () => [
  message('ACE19FFE8A46D47C3A1D814FA3793DD4', FRAGMENT_A, '2026-11-03T05:38:58+00:00'),
  message('AC7F43D1C88E43F497AC02D6EB4AE649', FRAGMENT_B, '2026-11-03T05:39:37+00:00'),
  message('ACCCC05B0B8F4213FADECC3E6F26F810', FRAGMENT_C, '2026-11-03T06:36:01+00:00'),
];

const derive = (messages, existing = []) => deriveEscortRegisterOps(account, messages, contacts, existing, aliases, [], [], {});
const draftsFor = (ops, lighter) => ops.filter((op) => op.kind === 'DRAFT'
  && String(op.row.lighterVessel).toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(lighter));

test('three fragments of Borkot Jidan keep every row but share one logical order', () => {
  const ops = derive(fragments());
  const drafts = draftsFor(ops, 'borkotjidan');
  assert.equal(drafts.length, 3, 'no evidence row is dropped');
  assert.deepEqual(
    drafts.map((op) => op.row.sourceMessageId).sort(),
    ['AC7F43D1C88E43F497AC02D6EB4AE649', 'ACCCC05B0B8F4213FADECC3E6F26F810', 'ACE19FFE8A46D47C3A1D814FA3793DD4'],
    'every fragment keeps its own source message id',
  );
  const identities = new Set(drafts.map((op) => op.row.parsed.logicalOrderId));
  assert.equal(identities.size, 1, 'one logical order');
  assert.ok([...identities][0], 'logical identity is recorded');
});

test('the Borkot Jidan confirmation matches the single logical order', () => {
  const ops = derive([...fragments(), message('AC6F45BFA938F018AD67AE2E7F3D87F5', CONFIRM_BORKOT, '2026-11-03T09:38:50+00:00', 'OUTGOING')]);
  const review = ops.find((op) => op.kind === 'REVIEW');
  assert.ok(review, 'confirmation produces a review row');
  const match = review.row.parsed.confirmationMatch;
  assert.notEqual(match.state, 'AMBIGUOUS');
  assert.ok(['EXACT', 'VARIANT'].includes(match.state), `confirmable state, got ${match.state}`);
  assert.equal(match.orderMessageId, 'ACE19FFE8A46D47C3A1D814FA3793DD4');
  assert.equal(review.row.confirmationMessageId, 'AC6F45BFA938F018AD67AE2E7F3D87F5');
  assert.notDeepEqual(review.row.reasons, ['ASSIGNMENT_MATCH_AMBIGUOUS']);
});

test('Fardin-7 and Rahman Asif each resolve to one logical order across fragments', () => {
  const ops = derive(fragments());
  for (const lighter of ['fardin', 'rahmanasif', 'liberty', 'borkotjidan']) {
    const rows = draftsFor(ops, lighter);
    assert.equal(new Set(rows.map((op) => op.row.parsed.logicalOrderId)).size, 1, `${lighter}: one logical order`);
  }
  // Fragment A has six lighters; B repeats three and C repeats two. Every row is
  // still recorded as source evidence.
  assert.equal(ops.filter((op) => op.kind === 'DRAFT').length, 11);
});

test('every November 3 confirmation now resolves to its own order', () => {
  const ops = derive([
    ...fragments(),
    message('3EB0D87626204A4FEB76D7', CONFIRM_RAHMAN, '2026-11-03T07:30:50+00:00', 'OUTGOING'),
    message('3EB013A908DCCF228E298E', CONFIRM_FARDIN, '2026-11-03T07:53:29+00:00', 'OUTGOING'),
    message('AC6F45BFA938F018AD67AE2E7F3D87F5', CONFIRM_BORKOT, '2026-11-03T09:38:50+00:00', 'OUTGOING'),
  ]);
  const reviews = ops.filter((op) => op.kind === 'REVIEW');
  assert.equal(reviews.length, 3);
  for (const review of reviews) {
    const match = review.row.parsed.confirmationMatch;
    assert.ok(['EXACT', 'VARIANT'].includes(match.state), `${review.row.lighterVessel}: ${match.state}`);
    assert.ok(match.orderId, `${review.row.lighterVessel}: has a target draft`);
  }
  assert.equal(new Set(reviews.map((r) => r.row.parsed.confirmationMatch.orderId)).size, 3,
    'three confirmations, three distinct drafts');
});

test('a repeated fragment delivered again creates nothing new (idempotent)', () => {
  const first = derive(fragments());
  const existing = first
    .filter((op) => op.kind === 'DRAFT')
    .map((op) => ({
      id: op.row.id, status: 'DRAFT', account_id: 'wa-01', chat_jid: lidChat,
      source_message_id: op.row.sourceMessageId, source_hash: op.row.sourceHash,
      block_key: op.row.blockKey, source_time: op.row.sourceTime,
      mother_vessel: op.row.motherVessel, lighter_vessel: op.row.lighterVessel,
      master_mobile: op.row.masterMobile, shift: op.row.shift, duty_date: op.row.dutyDate,
      parsed: {fields: {masterMobile: op.row.masterMobile}},
    }));
  const second = derive(fragments(), existing);
  assert.equal(second.filter((op) => op.kind === 'DRAFT').length, 0, 'no draft is written twice');
});

test('genuinely competing orders stay ambiguous', () => {
  // Same Lighter, same Master, two different duty days, both before the reply.
  const ops = derive([
    message('day-one', FRAGMENT_B, '2026-10-28T05:39:37+00:00'),
    message('day-two', FRAGMENT_B, '2026-11-03T05:39:37+00:00'),
    message('AC6F45BFA938F018AD67AE2E7F3D87F5', CONFIRM_BORKOT, '2026-11-03T09:38:50+00:00', 'OUTGOING'),
  ]);
  assert.equal(ops.filter((op) => op.kind === 'DRAFT').length, 6, 'each day is its own order');
  const review = ops.find((op) => op.kind === 'REVIEW');
  assert.equal(review.row.parsed.confirmationMatch.state, 'AMBIGUOUS');
});

test('a fragment with a conflicting Master Mobile is never merged', () => {
  const variant = FRAGMENT_B.replace('01943352375', '01943352399');
  const ops = derive([
    message('master-a', FRAGMENT_B, '2026-11-03T05:39:37+00:00'),
    message('master-b', variant, '2026-11-03T05:45:00+00:00'),
    message('AC6F45BFA938F018AD67AE2E7F3D87F5', CONFIRM_BORKOT, '2026-11-03T09:38:50+00:00', 'OUTGOING'),
  ]);
  assert.equal(draftsFor(ops, 'borkotjidan').length, 2, 'two different Master numbers are two orders');
  const review = ops.find((op) => op.kind === 'REVIEW');
  // The matching Master still confirms; the conflicting number is evidence only.
  assert.ok(['EXACT', 'VARIANT'].includes(review.row.parsed.confirmationMatch.state));
  assert.equal(review.row.parsed.confirmationMatch.orderMessageId, 'master-a');
});

test('the same Escort on two Lighters the same day stays two distinct duties', () => {
  const order = `Mv.Union Odyssey /soyabean ext/Nabil feed
1.Othoi 1-01711978247 n.gonj,1800 m.t
2.At tanjil 3-01625674124 n.gonj,1800 m.t`;
  const confirmOthoi = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. Othoi-1
Master Mobile:-01711-978247
Destination:
Escort Name:Nurun Nabi
Escort mobile:-01920-547773
02/11/26 ((N)

Al-Rifa'i Integrated Services`;
  const confirmTanjil = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. AT-Tanjil-3
Master Mobile:-01625-674124
Destination:
Escort Name: Monirul Alam
Escort mobile:-01858-898790
02/11/26 ((N)

Al-Rifa'i Integrated Services`;
  const ops = derive([
    message('AC4B5C017ADB826E3C76E8C58B559BEB', order, '2026-11-02T11:55:47+00:00'),
    message('AC6B756007635DE9B627241DCF54785B', confirmTanjil, '2026-11-02T17:06:17+00:00', 'OUTGOING'),
    message('AC26F33C22CE3A5FFBC49056ECB1B3B5', confirmOthoi, '2026-11-02T17:06:17+00:00', 'OUTGOING'),
  ]);
  assert.equal(ops.filter((op) => op.kind === 'DRAFT').length, 2, 'two lighters, two drafts');
  const reviews = ops.filter((op) => op.kind === 'REVIEW');
  assert.equal(reviews.length, 2);
  const targets = reviews.map((r) => r.row.parsed.confirmationMatch.orderId);
  assert.equal(new Set(targets).size, 2, 'each confirmation targets its own lighter');
  for (const review of reviews) assert.ok(['EXACT', 'VARIANT'].includes(review.row.parsed.confirmationMatch.state));
});

test('the November 2 control case is unchanged', () => {
  const order = `Mv.Union Odyssey /soyabean ext/Nabil feed
1.Othoi 1-01711978247 n.gonj,1800 m.t
2.At tanjil 3-01625674124 n.gonj,1800 m.t`;
  const confirm = `Mother Vessel: M.V. Union-Odyssey
Importer
Lighter Vessel:M.V. AT-Tanjil-3
Master Mobile:-01625-674124
Destination:
Escort Name: Monirul Alam
Escort mobile:-01858-898790
02/11/26 ((N)

Al-Rifa'i Integrated Services`;
  const ops = derive([
    message('order-nov2', order, '2026-11-02T11:55:47+00:00'),
    message('confirm-nov2', confirm, '2026-11-02T17:06:17+00:00', 'OUTGOING'),
  ]);
  const review = ops.find((op) => op.kind === 'REVIEW');
  assert.ok(['EXACT', 'VARIANT'].includes(review.row.parsed.confirmationMatch.state));
  assert.equal(review.row.reasons.join(','), 'ASSIGNMENT_MATCH_CANDIDATE_REQUIRES_REVIEW');
});

test('a forwarded copy of a fragment keeps its own row and still confirms', () => {
  const forwarded = message('forwarded-fragment', FRAGMENT_C, '2026-11-03T06:40:00+00:00', 'INCOMING', {forwarded: true});
  const ops = derive([...fragments(), forwarded]);
  assert.equal(draftsFor(ops, 'borkotjidan').length, 4, 'the forwarded message is evidence, not a lost duty');
  const review = derive([
    ...fragments(), forwarded,
    message('AC6F45BFA938F018AD67AE2E7F3D87F5', CONFIRM_BORKOT, '2026-11-03T09:38:50+00:00', 'OUTGOING'),
  ]).find((op) => op.kind === 'REVIEW');
  assert.ok(['EXACT', 'VARIANT'].includes(review.row.parsed.confirmationMatch.state));
});

test('the same content sent twice in one chat is one logical order, two evidence rows', () => {
  const ops = derive([
    message('dup-1', FRAGMENT_B, '2026-11-03T05:39:37+00:00'),
    message('dup-2', FRAGMENT_B, '2026-11-03T05:41:00+00:00'),
  ]);
  assert.equal(ops.filter((op) => op.kind === 'DRAFT').length, 6, 'three lighters, two messages');
  const rows = draftsFor(ops, 'borkotjidan');
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((op) => op.row.parsed.logicalOrderId)).size, 1);
});
