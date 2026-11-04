// Owner-visible identifiers (decision D6). Derived from existing stable hashes:
// Order = VO-<12 hex of escort_order_register.source_hash>
// Draft = VD-<12 hex of escort_order_register.id>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  draftIdentifiers,
  draftNumber,
  identifierMatches,
  orderNumber,
  parseIdentifier,
} from '../lib/order-identifiers.ts';

const H1 = 'a'.repeat(60) + '1234';
const H2 = 'b'.repeat(60) + '5678';
const H3 = 'c'.repeat(60) + '9abc';

test('format is VO-/VD- followed by 12 lowercase hex characters', () => {
  assert.equal(orderNumber(H1), 'VO-aaaaaaaaaaaa');
  assert.equal(draftNumber(H2), 'VD-bbbbbbbbbbbb');
  assert.match(orderNumber(H1) ?? '', /^VO-[a-f0-9]{12}$/);
  assert.match(draftNumber(H2) ?? '', /^VD-[a-f0-9]{12}$/);
});

test('replay stability: the same stored hash always yields the same identifier', () => {
  for (let i = 0; i < 5; i += 1) {
    assert.equal(orderNumber(H1), orderNumber(H1));
    assert.equal(draftNumber(H2), draftNumber(H2));
  }
});

test('input is normalised, and anything that is not a SHA-256 is refused', () => {
  assert.equal(orderNumber(H1.toUpperCase()), 'VO-aaaaaaaaaaaa');
  assert.equal(orderNumber(` ${H1} `), 'VO-aaaaaaaaaaaa');
  for (const bad of ['', 'not-a-hash', H1.slice(0, 63), `${H1}0`, null, undefined, 42]) {
    assert.equal(orderNumber(bad), null, String(bad));
    assert.equal(draftNumber(bad), null, String(bad));
  }
});

test('one multi-Lighter Order keeps ONE order number and distinct draft numbers', () => {
  const sourceHash = H1;
  const drafts = [H1, H2, H3].map((id) => draftIdentifiers(sourceHash, id));
  assert.deepEqual(drafts.map((d) => d?.order), ['VO-aaaaaaaaaaaa', 'VO-aaaaaaaaaaaa', 'VO-aaaaaaaaaaaa']);
  assert.equal(new Set(drafts.map((d) => d?.draft)).size, 3);
  assert.deepEqual(drafts.map((d) => d?.draft), ['VD-aaaaaaaaaaaa', 'VD-bbbbbbbbbbbb', 'VD-cccccccccccc']);
});

test('different Orders never share an order number under distinct hashes', () => {
  assert.notEqual(orderNumber(H1), orderNumber(H2));
});

test('a displayed identifier round-trips and matches only its own kind', () => {
  const order = orderNumber(H1);
  const draft = draftNumber(H1);
  assert.deepEqual(parseIdentifier(order), {kind: 'order', short: 'aaaaaaaaaaaa'});
  assert.deepEqual(parseIdentifier(draft), {kind: 'draft', short: 'aaaaaaaaaaaa'});
  assert.equal(identifierMatches(order, order), true);
  assert.equal(identifierMatches(order, ` ${order} `), true);
  // Same hex under the other prefix is a different identifier.
  assert.equal(identifierMatches(order, draft), false);
  assert.equal(identifierMatches(order, 'VO-zzzzzzzzzzzz'), false);
  assert.equal(identifierMatches(order, 'not an id'), false);
});

test('invalid pairs yield no identifiers instead of a partial display', () => {
  assert.equal(draftIdentifiers('bad', H1), null);
  assert.equal(draftIdentifiers(H1, ''), null);
});
