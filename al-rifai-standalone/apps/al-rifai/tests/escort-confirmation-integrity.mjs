// Vessel confirmation integrity regressions:
//  * only the verified Admin identity can act as a confirmation sender;
//  * Shift is supporting evidence and a conflict routes to review;
//  * the single-confirmation rule and authorized-client scope are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {CASH_SCOPE_CHATS} from '../lib/cash-scope.ts';
import {deriveEscortRegisterOps,OWNER_ESCORT_CLIENTS} from '../lib/escort-register.mjs';

const account={accountId:'wa-01'};
const contacts=[{id:OWNER_ESCORT_CLIENTS[0].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[0].phone,active:true}];
const clientChat='8801670535255@s.whatsapp.net';
const orderText=`Mother Vessel: MV. Alpha Unity
Lighter Vessel: MV. Light One
Master Mobile: 01829-984145
Booking DT: 03/10/26
Destination: O/A To Local`;
const assignment=(shift='N')=>`Mother Vessel: M.V. Alpha Unity
Lighter Vessel: M.V. Light One
Master Mobile: 01829-984145
Escort Name: Md. Osman Goni
Escort mobile: 01754-334400
03/10/26 (${shift})`;
const message=(id,text,direction='INCOMING',sender='8801670535255',time='2026-10-03T19:27:20+00:00')=>({
  accountId:'wa-01',id,chatJid:clientChat,text,direction,sourceTime:time,
  nativeSenderJid:sender,senderPhoneTransport:sender,
});
const verifiedAdmin=(candidate)=>
  candidate.direction==='OUTGOING'
  &&(String(candidate.sender??'')==='8801880446111'||String(candidate.nativeSenderJid??'')==='8801880446111');
const gate={epoch:'CANONICAL_BACKFILL_20261026',requireVerifiedAdmin:true,isVerifiedAdmin:verifiedAdmin};

test('verified Admin outgoing reply still produces a reviewable confirmation candidate', () => {
  const ops=deriveEscortRegisterOps(account,[
    message('order-2',orderText,'INCOMING'),
    message('assign-2',assignment('N'),'OUTGOING','8801880446111'),
  ],contacts,[],{},[],CASH_SCOPE_CHATS,gate);
  assert.deepEqual(ops.map(op=>op.kind),['DRAFT','REVIEW']);
  assert.equal(ops[1].row.parsed.confirmationMatch.state,'EXACT');
  // The order draft carries no shift; the reply's shift is unverified (not a conflict).
  assert.equal(ops[1].row.parsed.confirmationMatch.shiftEvidence,'UNVERIFIED');
  assert.equal(ops[1].row.confirmationMessageId,'assign-2');
});

test('an unrelated outgoing sender can never become a confirmation', () => {
  const ops=deriveEscortRegisterOps(account,[
    message('order-3',orderText,'INCOMING'),
    message('assign-3',assignment('N'),'OUTGOING','8801999999999'),
  ],contacts,[],{},[],CASH_SCOPE_CHATS,gate);
  // The client order is still captured; the foreign outgoing row is ignored.
  assert.deepEqual(ops.map(op=>op.kind),['DRAFT']);
  assert.equal(ops[0].row.status,'DRAFT');
});

test('without the gate the legacy derivation behaviour is preserved', () => {
  const ops=deriveEscortRegisterOps(account,[
    message('order-4',orderText,'INCOMING'),
    message('assign-4',assignment('N'),'OUTGOING','8801999999999'),
  ],contacts,[],{},[],CASH_SCOPE_CHATS,{epoch:'CANONICAL_BACKFILL_20261026'});
  assert.deepEqual(ops.map(op=>op.kind),['DRAFT','REVIEW']);
});

test('shift disagreement between a recorded order and the reply is review-only', () => {
  const existing=[{
    id:'order-7',status:'DRAFT',account_id:'wa-01',client_contact_id:contacts[0].id,
    client_phone:contacts[0].phone,chat_jid:clientChat,mother_vessel:'Alpha Unity',
    lighter_vessel:'Light One',master_mobile:'01829984145',escort_mobile:'01754334400',duty_date:'2026-10-03',shift:'N',
    source_message_id:'order-msg-7',source_time:'2026-10-03T13:00:00+00:00',
    dataset_epoch:'CANONICAL_BACKFILL_20261026',parsed:{fields:{masterMobile:'01829-984145'}},
  }];
  const ops=deriveEscortRegisterOps(account,[
    message('assign-7',assignment('D'),'OUTGOING','8801880446111'),
  ],contacts,existing,{},[],CASH_SCOPE_CHATS,gate);
  const review=ops.find(op=>op.kind==='REVIEW');
  assert.ok(review, 'review row still records the evidence');
  assert.equal(review.row.parsed.confirmationMatch.state,'AMBIGUOUS');
  assert.equal(review.row.parsed.confirmationMatch.shiftEvidence,'CONFLICT');
  assert.ok(review.row.parsed.confirmationMatch.reasons.includes('SHIFT_CONFLICT'));
  // The live processor only creates programs for confirmable states.
  assert.notEqual(review.row.parsed.confirmationMatch.state,'EXACT');
});

test('shift is never sufficient on its own: differing vessels stay unmatched', () => {
  const differentVessels=`Mother Vessel: M.V. Other Mother
Lighter Vessel: M.V. Other Lighter
Master Mobile: 01829-984145
Escort Name: Md. Osman Goni
Escort mobile: 01754-334400
03/10/26 (N)`;
  const ops=deriveEscortRegisterOps(account,[
    message('order-6',orderText,'INCOMING'),
    message('assign-6',differentVessels,'OUTGOING','8801880446111'),
  ],contacts,[],{},[],CASH_SCOPE_CHATS,gate);
  const review=ops.find(op=>op.kind==='REVIEW');
  assert.ok(review);
  assert.equal(review.row.parsed.confirmationMatch.state,'UNMATCHED');
});

test('shadow duplicate classification records evidence without changing state', () => {
  const existing=[{
    id:'order-shadow',status:'DRAFT',account_id:'wa-01',client_contact_id:contacts[0].id,
    client_phone:contacts[0].phone,chat_jid:clientChat,mother_vessel:'Alpha Unity',
    lighter_vessel:'Light One',master_mobile:'01829984145',escort_mobile:'01754334400',duty_date:'2026-10-03',shift:'N',
    source_message_id:'order-msg-shadow',source_time:'2026-10-03T13:00:00+00:00',
    dataset_epoch:'CANONICAL_BACKFILL_20261026',parsed:{fields:{masterMobile:'01829-984145'}},
  }];
  const opsWith=deriveEscortRegisterOps(account,[
    message('order-shadow-2',orderText,'INCOMING'),
    message('assign-shadow',assignment('N'),'OUTGOING','8801880446111'),
  ],contacts,existing,{},[],CASH_SCOPE_CHATS,{...gate,duplicateShadow:true});
  const review=opsWith.find(op=>op.kind==='REVIEW');
  assert.ok(Array.isArray(review.row.parsed.duplicateClassification));
  assert.ok(review.row.parsed.duplicateClassification.length>=1);
  const first=review.row.parsed.duplicateClassification[0];
  assert.ok(['EXACT','PROBABLE','AMBIGUOUS','DISTINCT'].includes(first.state));

  const opsWithout=deriveEscortRegisterOps(account,[
    message('order-shadow-2',orderText,'INCOMING'),
    message('assign-shadow',assignment('N'),'OUTGOING','8801880446111'),
  ],contacts,existing,{},[],CASH_SCOPE_CHATS,gate);
  const plain=opsWithout.find(op=>op.kind==='REVIEW');
  assert.equal(plain.row.parsed.duplicateClassification,undefined);
});
