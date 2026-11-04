// Target 01 release-readiness — over-merging and stability verification.
//
// The logical order identity must merge only fragments of ONE business order.
// Two genuine independent duties must never be merged, and the decision must not
// depend on the order the messages happen to arrive in.
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveEscortRegisterOps, OWNER_ESCORT_CLIENTS} from '../lib/escort-register.mjs';
import {
  groupLogicalOrders,
  motherCompatible,
  orderBusinessDay,
  orderIdentity,
  programIdFor,
} from '../lib/vessel-match.ts';

const account = {accountId: 'wa-01'};
const lid = '166082241384593@lid';
const aliases = {166082241384593: OWNER_ESCORT_CLIENTS[0].phone};
const contacts = [{id: OWNER_ESCORT_CLIENTS[0].id, account_id: 'wa-01', phone: OWNER_ESCORT_CLIENTS[0].phone, active: true}];

const msg = (id, text, sourceTime, direction = 'INCOMING') => ({
  accountId: 'wa-01', id, chatJid: lid, text, direction, sourceTime,
  nativeSenderJid: direction === 'INCOMING' ? '166082241384593' : '93282931581172',
  senderPhoneTransport: direction === 'INCOMING' ? '166082241384593' : '93282931581172',
});

const orderBlock = (mother, lighter = 'Borkot Jidan 2', master = '01943352375') =>
  `${mother}\n5.${lighter}-${master}/1000 m.t`;

const confirmation = (mother, lighter, master, startShift = '(D)') => `Mother Vessel: ${mother}
Importer
Lighter Vessel:M.V. ${lighter}
Master Mobile:-${master}
Destination:
Escort Name: Nazmul Hossain
Escort mobile:-01321-706844
${startShift === '(D)' ? '03/11/26' : '04/11/26'} (${startShift})

Al-Rifa'i Integrated Services`;

const identify = (mother, sourceTime, shift = '') =>
  orderIdentity({lighter: 'Borkot Jidan 2', masterRaw: '01943352375', shift, mother});

// ── identity primitives ──────────────────────────────────────────────────────

test('identity is stable under spelling normalization', () => {
  const spellings = ['Borkot Jidan 2', 'M.V. Borkot Jidan 2', 'borkot  jidan-2', 'BORKOT JIDAN 2'];
  const ids = new Set(spellings.map((lighter) => orderIdentity({lighter, masterRaw: '01943352375'})));
  assert.equal(ids.size, 1, [...ids].join(' / '));
  // Master formatting never changes the identity either.
  assert.equal(orderIdentity({lighter: 'X', masterRaw: '01943352375'}),
    orderIdentity({lighter: 'X', masterRaw: '+8801943352375'}));
  assert.equal(orderIdentity({lighter: 'X', masterRaw: '01943-352375'}),
    orderIdentity({lighter: 'X', masterRaw: '01943352375'}));
});

test('identity does not depend on message arrival order', () => {
  const rows = [
    {id: 'a', mother: 'Union Udyssy', sourceTime: '2026-11-03T05:38:58Z'},
    {id: 'b', mother: 'Union Udyssy', sourceTime: '2026-11-03T05:39:37Z'},
    {id: 'c', mother: 'Union odyssey', sourceTime: '2026-11-03T06:36:01Z'},
  ];
  const identityOf = (r) => identify(r.mother, r.sourceTime);
  const dayOf = (r) => orderBusinessDay(r);
  const timeOf = (r) => r.sourceTime;
  const compatible = (left, right) => motherCompatible(left.mother, right.mother);
  const forward = groupLogicalOrders(rows, identityOf, dayOf, timeOf, compatible);
  const backward = groupLogicalOrders([...rows].reverse(), identityOf, dayOf, timeOf, compatible);
  assert.equal(forward.length, 1);
  assert.equal(backward.length, 1);
  assert.deepEqual(forward[0].members.map((r) => r.id), ['a', 'b', 'c']);
  assert.deepEqual(backward[0].members.map((r) => r.id), ['a', 'b', 'c'],
    'the earliest message stays the representative in both directions');
});

test('a different Mother Vessel stays a different order', () => {
  assert.equal(motherCompatible('M.V. Union-Odyssey', 'M.V. Union Udyssy'), true);
  assert.equal(motherCompatible('M.V. Union-Odyssey', 'M.V. Meghna Sun'), false);
  assert.equal(motherCompatible('M.V. Poavosa-Wisdom', 'M.V. Poavosa-Brave'), false);
  assert.equal(motherCompatible('M.V. Union-Odyssey', 'M.V. Union-Brave'), false);

  const ops = deriveEscortRegisterOps(account, [
    msg('m-union', orderBlock('Mv.Union Udyssy'), '2026-11-03T05:38:58Z'),
    msg('m-meghna', orderBlock('Mv.Meghna Sun'), '2026-11-03T05:40:00Z'),
    msg('conf', confirmation('M.V. Union-Odyssey', 'Borkot Jidan', '01943-352375'), '2026-11-03T09:38:50Z', 'OUTGOING'),
  ], contacts, [], aliases);
  const ids = ops.filter((op) => op.kind === 'DRAFT').map((op) => op.row.parsed.logicalOrderId);
  assert.equal(new Set(ids).size, 2, 'two fleets are two candidate orders');
  const match = ops.find((op) => op.kind === 'REVIEW').row.parsed.confirmationMatch;
  // The Union confirmation can only target the Union order; the Meghna order is
  // a different fleet and is never a candidate.
  assert.ok(['EXACT', 'VARIANT'].includes(match.state), match.state);
  assert.equal(match.orderMessageId, 'm-union');
});

test('a different Start Date stays a different order, even one day apart', () => {
  const ops = deriveEscortRegisterOps(account, [
    msg('d-03', orderBlock('Mv.Union Udyssy'), '2026-11-03T05:38:58Z'),
    msg('d-04', orderBlock('Mv.Union Udyssy'), '2026-11-04T05:38:58Z'),
    msg('conf', confirmation('M.V. Union-Odyssey', 'Borkot Jidan', '01943-352375'), '2026-11-04T09:38:50Z', 'OUTGOING'),
  ], contacts, [], aliases);
  const drafts = ops.filter((op) => op.kind === 'DRAFT');
  assert.equal(drafts.length, 2);
  assert.equal(new Set(drafts.map((op) => op.row.parsed.logicalOrderId)).size, 2);
  const match = ops.find((op) => op.kind === 'REVIEW').row.parsed.confirmationMatch;
  assert.equal(match.state, 'AMBIGUOUS', 'two duty days stay two candidates');
});

test('a different Shift stays a different order', () => {
  const ops = deriveEscortRegisterOps(account, [
    msg('d', orderBlock('Mv.Union Udyssy') + '\n03/11/26 (D)', '2026-11-03T05:38:58Z'),
    msg('n', orderBlock('Mv.Union Udyssy') + '\n03/11/26 (N)', '2026-11-03T05:39:30Z'),
    msg('conf', confirmation('M.V. Union-Odyssey', 'Borkot Jidan', '01943-352375', 'N'), '2026-11-03T09:38:50Z', 'OUTGOING'),
  ], contacts, [], aliases);
  const drafts = ops.filter((op) => op.kind === 'DRAFT');
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts.map((op) => op.row.shift).sort(), ['D', 'N']);
  const match = ops.find((op) => op.kind === 'REVIEW').row.parsed.confirmationMatch;
  assert.ok(['EXACT', 'VARIANT'].includes(match.state), match.state);
  assert.equal(match.orderMessageId, 'n', 'the N reply targets the N order');
});

test('fragments in the same Dhaka day merge; a genuine next-day order does not', () => {
  const sameDay = groupLogicalOrders(
    [
      {id: 'late', mother: 'Union Udyssy', sourceTime: '2026-11-03T18:30:00Z'},
      {id: 'later', mother: 'Union Udyssy', sourceTime: '2026-11-03T19:30:00Z'},
    ],
    (r) => identify(r.mother, r.sourceTime),
    (r) => orderBusinessDay(r),
    (r) => r.sourceTime,
    (a, b) => motherCompatible(a.mother, b.mother),
  );
  assert.equal(sameDay.length, 1, '00:30 and 01:30 Dhaka are the same business day');

  const acrossMidnight = groupLogicalOrders(
    [
      {id: 'before', mother: 'Union Udyssy', sourceTime: '2026-11-03T16:00:00Z'}, // 22:00 Dhaka 11-03
      {id: 'after', mother: 'Union Udyssy', sourceTime: '2026-11-03T19:00:00Z'},  // 01:00 Dhaka 11-04
    ],
    (r) => identify(r.mother, r.sourceTime),
    (r) => orderBusinessDay(r),
    (r) => r.sourceTime,
    (a, b) => motherCompatible(a.mother, b.mother),
  );
  assert.equal(acrossMidnight.length, 2, 'a different business day fails closed, it never merges');
});

// ── cancelled Program, then a new Program ────────────────────────────────────

test('a new duty after a cancellation is a distinct order and a distinct Program', () => {
  // The cancelled duty keeps its Program identity; the replacement starts later.
  const cancelled = programIdFor({
    account: 'wa-01', clientChat: '8801670535255@s.whatsapp.net',
    mother: 'Union-Odyssey', lighter: 'Borkot Jidan', startDate: '2026-11-03', shift: 'D',
  });
  const replacement = programIdFor({
    account: 'wa-01', clientChat: '8801670535255@s.whatsapp.net',
    mother: 'Union-Odyssey', lighter: 'Borkot Jidan', startDate: '2026-11-06', shift: 'D',
  });
  assert.notEqual(cancelled, replacement);

  const ops = deriveEscortRegisterOps(account, [
    msg('old', orderBlock('Mv.Union Udyssy'), '2026-11-03T05:38:58Z'),
    msg('new', orderBlock('Mv.Union Udyssy'), '2026-11-06T05:38:58Z'),
  ], contacts, [], aliases);
  const drafts = ops.filter((op) => op.kind === 'DRAFT');
  assert.equal(drafts.length, 2);
  assert.equal(new Set(drafts.map((op) => op.row.parsed.logicalOrderId)).size, 2);
});

test('one Program per logical order: the same confirmation can never create two', () => {
  const base = {
    account: 'wa-01', clientChat: '8801670535255@s.whatsapp.net',
    mother: 'Union-Odyssey', lighter: 'Borkot Jidan', startDate: '2026-11-03', shift: 'D',
  };
  assert.equal(programIdFor(base), programIdFor({...base}));
  // The M.V. prefix never changes the Program identity.
  assert.equal(programIdFor(base), programIdFor({...base, mother: 'M.V. Union-Odyssey', lighter: 'M.V. Borkot Jidan'}));
  // A different start date or shift is a different Program, never the same one.
  assert.notEqual(programIdFor(base), programIdFor({...base, startDate: '2026-11-04'}));
  assert.notEqual(programIdFor(base), programIdFor({...base, shift: 'N'}));
  // "Borkot Jidan" and "Borkot Jidan 2" are different Lighter strings. The Program
  // takes the spelling of the Admin Confirmation, which is the authoritative one.
  assert.notEqual(programIdFor(base), programIdFor({...base, lighter: 'Borkot Jidan 2'}));
  // KNOWN LIMITATION (pre-existing, not introduced here): programIdFor keeps the
  // full normalized Mother spelling, so "Union-Odyssey" and "Union Udyssy" would
  // be two different Programs for one duty. The Confirmation text is the single
  // authoritative spelling, and the recovery manifest uses exactly that text.
  assert.notEqual(programIdFor(base), programIdFor({...base, mother: 'Union Udyssy'}));
});

// ── the real November 3 fragments still merge ────────────────────────────────

test('the real November 3 fragments still form one logical order', () => {
  const ops = deriveEscortRegisterOps(account, [
    msg('A', 'Mv.Union Udyssy\n3.Liberty -01833258225/1000 m.t\n4.Rahman asif-01819327176 /1000 m.t\n5.borkot jidan 2-01943352375/1000 m.t\n6.Fardin 7-01911428354/900 m.t', '2026-11-03T05:38:58Z'),
    msg('B', 'Mv.Union Udyssy\n3.Liberty -01833258225/1000 m.t\n5.borkot jidan 2-01943352375/1000 m.t', '2026-11-03T05:39:37Z'),
    msg('C', 'Mv.Union odyssey /soyabean ext/Nabil feed mills | Destination kacpur\n5.borkot jidan 2-01943352375/1000 m.t', '2026-11-03T06:36:01Z'),
    msg('conf', confirmation('M.V. Union-Odyssey', 'Borkot Jidan', '01943-352375'), '2026-11-03T09:38:50Z', 'OUTGOING'),
  ], contacts, [], aliases);
  const match = ops.find((op) => op.kind === 'REVIEW').row.parsed.confirmationMatch;
  assert.ok(['EXACT', 'VARIANT'].includes(match.state), match.state);
  assert.equal(match.orderMessageId, 'A');
});
