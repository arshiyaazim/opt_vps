import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVesselNames,
  matchConfirmation,
  isConfirmable,
  programIdFor,
  vesselKey,
  masterKey,
  orderIdentity,
} from '../lib/vessel-match.ts';
import { analyzeMobile, oneDigitApart } from '../lib/mobile-identity.mjs';

const chat = '8801670535255@s.whatsapp.net';
const order = (over = {}) => ({
  id: 'order-1', messageId: 'order-msg-1', chatJid: chat, mother: 'Poavosa-Wisdom',
  lighter: 'Jafnun-Julfa-1', masterRaw: '01754334400', sourceTime: '2026-10-01T10:00:00Z',
  contactId: 'client-1', ...over,
});
const confirmation = (over = {}) => ({
  messageId: 'conf-msg-1', chatJid: chat, mother: 'Poavosa-Wisdom', lighter: 'Jafnun-Julfa-1',
  masterRaw: '01754334400', sourceTime: '2026-10-02T10:00:00Z', contactId: 'client-1', ...over,
});

test('MV prefix never decides the role and spelling variants stay comparable', () => {
  assert.equal(vesselKey('M.V. Europe-1'), vesselKey('Europe 1'));
  assert.equal(compareVesselNames('Europe-1', 'Eurupe 1'), 'VARIANT');
  assert.equal(compareVesselNames('MV Wisdom', 'Wisdom'), 'SAME');
  assert.equal(compareVesselNames('Alpha', 'Beta'), 'DIFFERENT');
});

test('master mobile digit analysis never repairs a number', () => {
  assert.equal(analyzeMobile('01754-334400').kind, 'VALID');
  assert.equal(analyzeMobile('0175433440').kind, 'SHORT');
  assert.equal(analyzeMobile('017543344001').kind, 'LONG');
  assert.equal(oneDigitApart('01754334400', '0175433440'), true);
  assert.equal(oneDigitApart('01754334400', '017543344001'), true);
  assert.equal(oneDigitApart('01754334400', '01754334401'), false, 'substitution is not a digit typo');
  assert.equal(oneDigitApart('01754334400', '01854334400'), false, 'same-length substitution is a different number');
  assert.equal(masterKey('+8801754334400'), '01754334400');
});

test('exact order and confirmation create one confirmable match', () => {
  const result = matchConfirmation([order()], confirmation());
  assert.equal(result.state, 'EXACT');
  assert.equal(result.orderId, 'order-1');
  assert.equal(result.orderMessageId, 'order-msg-1');
  assert.equal(isConfirmable(result.state), true);
});

test('spelling variant with the same master is a confirmable variant', () => {
  const result = matchConfirmation([order({ mother: 'Europe-1', lighter: 'Eurupe 1' })],
    confirmation({ mother: 'Europe-1', lighter: 'Europe 1' }));
  assert.equal(result.state, 'VARIANT');
  assert.equal(isConfirmable(result.state), true);
  assert.ok(result.reasons.includes('VESSEL_SPELLING_VARIANT'));
});

test('a different vessel is not matched even when the master is equal', () => {
  const result = matchConfirmation([order({ lighter: 'Horda' })], confirmation({ lighter: 'Jamuna' }));
  assert.equal(result.state, 'UNMATCHED');
});

test('one-digit master discrepancy is evidence, not silent repair', () => {
  const corrections = new Map([[`${chat}|${vesselKey('Jafnun-Julfa-1')}`, '01754334400']]);
  const result = matchConfirmation([order({ masterRaw: '01754334400' })],
    confirmation({ masterRaw: '0175433440' }), { corrections });
  assert.equal(result.state, 'CORRECTED');
  assert.equal(result.mobileEvidence, 'CORRECTED');
  assert.equal(isConfirmable(result.state), true);
  const withoutCorrection = matchConfirmation([order()], confirmation({ masterRaw: '017543344001' }));
  assert.equal(withoutCorrection.state, 'CORRECTED');
  assert.ok(withoutCorrection.reasons.includes('CORRECTION_MESSAGE_NOT_FOUND'));
});

test('missing master mobile requires review, never confirmation', () => {
  const result = matchConfirmation([order({ masterRaw: '' })], confirmation({ masterRaw: '' }));
  assert.equal(result.state, 'WEAK_EVIDENCE');
  assert.equal(isConfirmable(result.state), false);
});

test('confirmation in a different client chat is rejected', () => {
  const result = matchConfirmation([order()], confirmation({ chatJid: '8801836743754@s.whatsapp.net' }));
  assert.equal(result.state, 'UNMATCHED');
});

test('two plausible orders stay ambiguous', () => {
  // Genuine competition: the same Lighter on two different days is two duties.
  const result = matchConfirmation([
    order({ id: 'a', sourceTime: '2026-09-28T10:00:00Z' }),
    order({ id: 'b', messageId: 'order-msg-2', sourceTime: '2026-10-01T10:00:00Z' }),
  ], confirmation());
  assert.equal(result.state, 'AMBIGUOUS');
  assert.equal(isConfirmable(result.state), false);
  assert.deepEqual(result.candidateIds.sort(), ['a', 'b']);
});

test('fragments of one business order collapse to a single logical order', () => {
  const fragments = [
    order({ id: 'frag-a', messageId: 'msg-a', sourceTime: '2026-10-01T05:38:58Z' }),
    order({ id: 'frag-b', messageId: 'msg-b', sourceTime: '2026-10-01T05:39:37Z' }),
    order({ id: 'frag-c', messageId: 'msg-c', sourceTime: '2026-10-01T06:36:01Z', mother: 'Poavosa Wisdom' }),
  ];
  const result = matchConfirmation(fragments, confirmation());
  assert.equal(result.state, 'EXACT');
  assert.equal(isConfirmable(result.state), true);
  // The earliest fragment keeps the original Order Message ID.
  assert.equal(result.orderId, 'frag-a');
  assert.equal(result.orderMessageId, 'msg-a');
  assert.deepEqual(result.candidateIds, ['frag-a']);
});

test('a fragment sent after midnight still belongs to the same order', () => {
  const before = order({ id: 'late-a', sourceTime: '2026-10-01T18:30:00Z' });
  const after = order({ id: 'late-b', sourceTime: '2026-10-01T19:30:00Z' }); // 01:30 Dhaka next day
  const result = matchConfirmation([before, after], confirmation({ sourceTime: '2026-10-02T10:00:00Z' }));
  assert.equal(result.state, 'EXACT');
  assert.equal(result.orderId, 'late-a');
});

test('a different Lighter, Master or shift never collapses', () => {
  const base = { sourceTime: '2026-10-01T10:00:00Z' };
  assert.equal(matchConfirmation([
    order({ ...base, id: 'l1' }), order({ ...base, id: 'l2', lighter: 'Other-Lighter' }),
  ], confirmation({ lighter: 'Jafnun-Julfa-1' })).state, 'EXACT');
  assert.equal(orderIdentity({ lighter: 'L 1', masterRaw: '01754334400' }),
    orderIdentity({ lighter: 'L-1', masterRaw: '01754334400' }));
  assert.notEqual(orderIdentity({ lighter: 'L 1', masterRaw: '01754334400' }),
    orderIdentity({ lighter: 'L 1', masterRaw: '01754334401' }));
  assert.notEqual(orderIdentity({ lighter: 'L 1', shift: 'D' }), orderIdentity({ lighter: 'L 1', shift: 'N' }));
  assert.equal(orderIdentity({ lighter: '' }), '');
});

test('confirmation before the order is rejected', () => {
  const result = matchConfirmation([order({ sourceTime: '2026-10-05T10:00:00Z' })], confirmation());
  assert.equal(result.state, 'UNMATCHED');
});

test('one program per lighter, stable on replay', () => {
  const base = { account: 'wa-01', clientChat: chat, mother: 'Poavosa-Wisdom', startDate: '2026-10-02', shift: 'N' };
  const first = programIdFor({ ...base, lighter: 'Europe-1' });
  const second = programIdFor({ ...base, lighter: 'Deowan-Jobayer-1' });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(first, programIdFor({ ...base, lighter: 'M.V. Europe-1' }));
});

test('same escort and date on different lighters stays distinct', () => {
  const base = { account: 'wa-01', clientChat: chat, mother: 'M', startDate: '2026-10-02', shift: 'D' };
  assert.notEqual(programIdFor({ ...base, lighter: 'L1' }), programIdFor({ ...base, lighter: 'L2' }));
});

test('shift agreement corroborates but never creates a match', () => {
  const result = matchConfirmation([order({shift: 'N'})], confirmation({shift: 'N'}));
  assert.equal(result.state, 'EXACT');
  assert.equal(result.shiftEvidence, 'AGREE');
  assert.equal(isConfirmable(result.state), true);
});

test('shift conflict downgrades an otherwise exact match to review', () => {
  const result = matchConfirmation([order({shift: 'N'})], confirmation({shift: 'D'}));
  assert.equal(result.state, 'AMBIGUOUS');
  assert.equal(result.shiftEvidence, 'CONFLICT');
  assert.equal(result.orderId, null);
  assert.ok(result.reasons.includes('SHIFT_CONFLICT'));
  assert.equal(isConfirmable(result.state), false);
});

test('shift breaks a tie between two legitimate same-vessel orders', () => {
  const day = order({id: 'order-day', shift: 'D', sourceTime: '2026-10-01T05:00:00Z'});
  const night = order({id: 'order-night', shift: 'N', sourceTime: '2026-10-01T12:00:00Z'});
  const result = matchConfirmation([day, night], confirmation({shift: 'N'}));
  assert.equal(result.state, 'EXACT');
  assert.equal(result.orderId, 'order-night');
  assert.equal(result.shiftEvidence, 'AGREE');
});

test('missing shift stays unverified and keeps legacy confirmation behaviour', () => {
  const result = matchConfirmation([order()], confirmation());
  assert.equal(result.state, 'EXACT');
  assert.equal(result.shiftEvidence, 'UNVERIFIED');
  assert.ok(result.reasons.includes('SHIFT_UNVERIFIED'));
});
