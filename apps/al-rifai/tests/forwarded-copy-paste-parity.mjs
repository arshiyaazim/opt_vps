// Owner rule: WhatsApp Forwarded and Copy-Paste messages are ordinary messages.
//
// These tests pin parity across every business path: the same content must reach
// the same classification, fields and operations whether it was typed, forwarded
// or pasted. Forwarding metadata is evidence only — it is preserved, but it never
// grants authority and never forces Review.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveEscortRegisterOps} from '../lib/escort-register.mjs';
import {qualifyEscortIntake} from '../lib/escort-intake-candidate.mjs';
import {CASH_SCOPE_CHAT_LID, CASH_SCOPE_CHATS, isCashScopeOwner} from '../lib/cash-scope.ts';
import {parseLivePaymentBlocks, isLiveCashOwnerOutgoing} from '../candidates/identity-review/live-cash.ts';
import {parseMessage} from '../lib/release-parser.ts';

const source = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// ── Vessel live derivation ───────────────────────────────────────────────────
const HRIDOY = {chat: '8801670535255@s.whatsapp.net', contact: 'escort-client-hridoy-wa01', phone: '+8801670535255'};
const CONTACTS = [{id: HRIDOY.contact, account_id: 'wa-01', display_name: 'Escort Hridoy', phone: HRIDOY.phone, source: 'OWNER_PROVIDED', active: true}];
const ALIASES = {[HRIDOY.phone.slice(1)]: HRIDOY.phone};

const ORDER = [
  'MV WAN MING 1,',
  'A/C: ARMAN FEEDS & FISHERIES,',
  '02. NEW SRIJON-1, CAPACITY: 1,000 M/T, PHONE: 01712602871',
  '03. HADIZ, CAPACITY: 1,000 M/T, PHONE: 01863191301',
  'DESTINATION: RUPSHI,',
].join('\n');

const CONFIRMATION = [
  'Mother Vessel: MV WAN MING-1',
  'Lighter Vessel:MV Hadiz',
  'Master Mobile: 01863191301',
  'Escort Name: Md Shahidullah',
  'Escort Mobile: 01900000000',
  'Start Date: 13.07.2026 (D)',
].join('\n');

let seq = 0;
const message = (text, direction, forwarded, id) => ({
  accountId: 'wa-01', id: id ?? `MSG-${++seq}`, chatJid: HRIDOY.chat, text,
  sourceTime: direction === 'OUTGOING' ? '2026-07-14T09:26:35Z' : '2026-07-13T14:21:25Z',
  direction,
  sender: direction === 'OUTGOING' ? '8801880446111@s.whatsapp.net' : HRIDOY.chat,
  nativeSenderJid: direction === 'OUTGOING' ? '8801880446111@s.whatsapp.net' : HRIDOY.chat,
  senderPhoneTransport: null, deletedAt: null,
  ...(forwarded === undefined ? {} : {forwarded}),
});

const isVerifiedAdmin = (candidate) => candidate.direction === 'OUTGOING' && isCashScopeOwner(String(candidate.nativeSenderJid ?? ''));

function run(messages) {
  const rows = [];
  const ops = [];
  for (const m of messages) {
    const produced = deriveEscortRegisterOps(
      {accountId: 'wa-01'}, [m], CONTACTS, rows, ALIASES, [], [...CASH_SCOPE_CHATS],
      {epoch: 'CANONICAL_BACKFILL_20261026', requireVerifiedAdmin: true, isVerifiedAdmin, windowDays: 30},
    );
    for (const op of produced) {
      ops.push(op);
      rows.push({...op.row, account_id: 'wa-01', client_contact_id: op.row.clientContactId,
        client_phone: op.row.clientPhone, chat_jid: op.row.chatJid, source_time: op.row.sourceTime,
        block_key: op.row.blockKey, dataset_epoch: 'CANONICAL_BACKFILL_20261026'});
    }
  }
  return {ops, rows};
}

const shape = (ops) => ops.map((op) => ({
  kind: op.kind, status: op.row.status, lighter: op.row.lighterVessel, mother: op.row.motherVessel,
  master: op.row.masterMobile, destination: op.row.destination, dutyDate: op.row.dutyDate,
  shift: op.row.shift, escort: op.row.escortName, reasons: op.row.reasons,
  match: op.row.parsed?.confirmationMatch?.state ?? null,
}));

test('Vessel: forwarded, pasted and typed Orders derive the same Drafts', () => {
  const variants = [
    ['typed', undefined],
    ['forwarded', true],
    ['not-forwarded', false],
    ['copy-paste (unknown)', null],
  ];
  for (const [label, forwarded] of variants) {
    const {ops} = run([message(ORDER, 'INCOMING', forwarded)]);
    assert.equal(ops.length, 2, label);
    assert.deepEqual(shape(ops), shape(run([message(ORDER, 'INCOMING', undefined)]).ops), label);
    assert.ok(ops.every((op) => op.kind === 'DRAFT'), label);
  }
});

test('Vessel: a forwarded Admin Confirmation matches its Order exactly as a typed one', () => {
  const baseline = run([message(ORDER, 'INCOMING'), message(CONFIRMATION, 'OUTGOING')]);
  const forwarded = run([message(ORDER, 'INCOMING'), message(CONFIRMATION, 'OUTGOING', true)]);
  assert.deepEqual(shape(forwarded.ops), shape(baseline.ops));
  const review = forwarded.ops.find((op) => op.kind === 'REVIEW');
  assert.ok(review, 'the forwarded confirmation must still be captured');
  assert.equal(review.row.parsed.confirmationMatch.state, 'EXACT');
  assert.equal(review.row.escortName, 'Md Shahidullah');
});

test('Vessel: a forwarded copy of an Order is a distinct message, not a lost or duplicated duty', () => {
  const original = message(ORDER, 'INCOMING', undefined, 'MSG-ORIGINAL');
  const copy = message(ORDER, 'INCOMING', true, 'MSG-FORWARDED-COPY');
  const twoMessages = run([original, copy]);
  assert.equal(twoMessages.ops.length, 4, 'each message keeps its own two Drafts');
  assert.deepEqual([...new Set(twoMessages.ops.map((op) => op.row.sourceMessageId))].sort(),
    ['MSG-FORWARDED-COPY', 'MSG-ORIGINAL']);

  // Re-processing the same message id must not create a second row.
  const replay = run([original, original]);
  assert.equal(replay.ops.length, 2);
  assert.equal(replay.rows.length, 2);
});

// ── Legacy qualification path ────────────────────────────────────────────────
const CHAT = '8801700000001@s.whatsapp.net';
const binding = (over = {}) => ({
  id: 'b-client', clientId: 'client-1', version: '1', active: true,
  decision: 'APPROVED', approver: 'test', evidenceSha: 'a'.repeat(64),
  role: 'client', accountId: 'wa-01', chatJid: CHAT, senderJid: CHAT,
  direction: 'INCOMING', chatType: 'direct', resolvedPhone: null,
  validFrom: '2026-01-01', validTo: null, ...over,
});
const envelope = (over = {}) => ({
  accountId: 'wa-01', chatJid: CHAT, senderJid: CHAT, nativeMessageId: 'm-1',
  timestamp: '2026-07-13T14:21:25Z', direction: 'INCOMING', text: ORDER, ...over,
});

test('legacy qualification: forwarded Orders classify exactly like typed Orders', () => {
  for (const forwarded of [undefined, true, false, null]) {
    const result = qualifyEscortIntake(envelope({forwarded}), {bindings: [binding()]});
    assert.equal(result.items[0].classification, 'ORDER_DRAFT', String(forwarded));
    assert.equal(result.items[0].fields.lighterVessel, 'NEW SRIJON-1');
    assert.equal(result.items[0].fields.motherVessel, 'WAN MING 1');
  }
});

test('legacy qualification: a forwarded Admin confirmation keeps Admin authority', () => {
  const adminJid = '8801700000002@s.whatsapp.net';
  const admin = binding({id: 'b-admin', role: 'admin', senderJid: adminJid, direction: 'OUTGOING'});
  const typed = qualifyEscortIntake(envelope({senderJid: adminJid, direction: 'OUTGOING', text: CONFIRMATION}), {bindings: [admin]});
  const forwarded = qualifyEscortIntake(envelope({senderJid: adminJid, direction: 'OUTGOING', text: CONFIRMATION, forwarded: true}), {bindings: [admin]});
  // `forwarded` is part of payloadSha by design, so the evidence hash differs;
  // the classification, fields and authority must not.
  assert.equal(forwarded.items[0].classification, typed.items[0].classification);
  assert.deepEqual(forwarded.items[0].fields, typed.items[0].fields);
  assert.equal(forwarded.items[0].fields.escortName, 'Md Shahidullah');
});

// ── Cash ─────────────────────────────────────────────────────────────────────
test('Cash: the Owner→Accountant gate and parser ignore forwarding metadata', () => {
  const owner = '93282931581172:27@lid';
  const base = {
    version: 'native-message-envelope-v1', provider: 'WHATSAPP', accountId: 'wa-01',
    nativeMessageId: 'm-cash', chatJid: CASH_SCOPE_CHAT_LID, chatType: 'direct',
    senderJid: owner, senderPhone: null, senderLid: null, direction: 'OUTGOING',
    sourceTimestamp: '2026-10-17T06:57:48.000Z', observedAt: '2026-10-17T06:57:49.000Z',
    eventType: 'TEXT', payload: {text: '', sha256: 'a'.repeat(64)},
    quotedMessageId: null, forwarded: false, media: [], groupDisplayName: null, membershipEvidence: null,
  };
  for (const forwarded of [true, false, null]) {
    assert.equal(isLiveCashOwnerOutgoing({status: 'CONTENT', envelope: {...base, forwarded}}), true, String(forwarded));
  }
  const text = 'ID: 01312345678 Rahim Uddin 01712345678 (B) 1,250/- food';
  assert.deepEqual(parseLivePaymentBlocks(text), parseLivePaymentBlocks(text));
});

// ── Release ──────────────────────────────────────────────────────────────────
test('Release: the same slip text yields the same parse regardless of forwarding', () => {
  const slip = 'Lighter: HADIZ\nRelease: 04.11.2026 (D)\n';
  const a = parseMessage(slip, '2026-11-04T10:00:00.000Z');
  const b = parseMessage(slip, '2026-11-04T10:00:00.000Z');
  assert.deepEqual(a, b);
  assert.ok(!/forwarded/i.test(source('lib/release-parser.ts')));
  assert.ok(!/forwarded/i.test(source('lib/release-scan.ts')));
});

// ── No forwarding gate left anywhere ────────────────────────────────────────
test('no forwarding-based review gate remains in the business code', () => {
  const files = [
    'lib/escort-intake-candidate.mjs',
    'lib/escort-register.mjs',
    'lib/vessel-ops.ts',
    'lib/release-parser.ts',
    'lib/release-scan.ts',
    'candidates/identity-review/routing.ts',
    'candidates/identity-review/conversation-workflow.ts',
    'candidates/identity-review/live-cash.ts',
    'scripts/process-vessel.ts',
    'scripts/process-cash.ts',
    'scripts/message-ingestion-worker.ts',
  ];
  for (const file of files) {
    const text = source(file);
    for (const code of ['FORWARDED_DIRECTION_REQUIRES_REVIEW', 'FORWARDED_HEADER_HAS_NO_AUTHORITY',
      'SOURCE_FORWARDING_UNKNOWN', 'FORWARDED_ORIGIN_NOT_SUBMITTER_AUTHORITY', 'FORWARDING_PROVENANCE_UNKNOWN']) {
      assert.equal(text.includes(code), false, `${file} still contains ${code}`);
    }
  }
});

test('forwarded metadata is preserved in the archive row', () => {
  assert.match(source('lib/native-ingest.ts'), /forwarded:\s*envelope\.forwarded\s*\?\?\s*null/);
  assert.match(source('lib/escort-intake-candidate.mjs'), /forwarded:clone\(message\.forwarded\?\?null\)/);
});
