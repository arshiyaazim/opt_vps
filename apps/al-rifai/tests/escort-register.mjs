import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CASH_SCOPE_CHATS} from '../lib/cash-scope.ts';
import {classifyBusinessSource,deriveEscortRegisterOps,OWNER_ESCORT_CLIENTS,scopePhoneAliases} from '../lib/escort-register.mjs';

const account={accountId:'wa-01'};
const contacts=[{id:OWNER_ESCORT_CLIENTS[0].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[0].phone,active:true}];
const orderText=`Mother Vessel: MV. Alpha Unity
Lighter Vessel: MV. Light One
Master Mobile: 01829-984145
Booking DT: 03/10/26
Destination: O/A To Local`;
const assignmentText=`Mother Vessel: M.V. Alpha Unity
Lighter Vessel: M.V. Light One
Master Mobile: 01829-984145
Escort Name: Md. Osman Goni
Escort mobile: 01754-334400
03/10/26 (N)`;
const message=(id,text,direction='INCOMING',chatJid='8801670535255@s.whatsapp.net')=>({
 accountId:'wa-01',id,chatJid,text,direction,sourceTime:direction==='INCOMING'?'2026-10-03T13:24:13+00:00':'2026-10-03T19:27:20+00:00',
 nativeSenderJid:direction==='INCOMING'?'8801670535255':'8801880446111',senderPhoneTransport:direction==='INCOMING'?'8801670535255':'8801880446111',
});

test('Owner outgoing assignment remains a separate reviewable fact and preserves provenance',()=>{
 const ops=deriveEscortRegisterOps(account,[message('order-1',orderText),message('assignment-1',assignmentText,'OUTGOING')],contacts,[]);
 assert.deepEqual(ops.map(op=>op.kind),['DRAFT','REVIEW']);
 assert.notEqual(ops[1].row.id,ops[0].row.id);
 assert.equal(ops[1].row.status,'REVIEW');
 assert.deepEqual(ops[1].row.reasons,['ASSIGNMENT_MATCH_CANDIDATE_REQUIRES_REVIEW']);
 assert.equal(ops[1].event.payload.ownerRule,'ASSIGNMENT_DOES_NOT_CONFIRM_OR_START_DUTY');
 assert.deepEqual(ops[1].row.parsed.candidateDraftIds,[ops[0].row.id]);
 assert.equal(ops[1].event.payload.source.direction,'OUTGOING');
 assert.equal(ops[1].event.payload.source.senderJid,'8801880446111');
 assert.equal(ops[0].event.payload.source.messageId,'order-1');
});

test('incoming order alone remains a draft',()=>{
 const ops=deriveEscortRegisterOps(account,[message('order-only',orderText)],contacts,[]);
 assert.equal(ops.length,1);assert.equal(ops[0].kind,'DRAFT');assert.equal(ops[0].row.status,'DRAFT');
});

test('source routing is exclusive and fails closed on identity mismatch or conflicts',()=>{
 const approved=message('source-approved',orderText);
 assert.deepEqual(classifyBusinessSource(account,approved,contacts,{},[],CASH_SCOPE_CHATS),{
  domain:'vessel',outcome:'VESSEL_SOURCE',
 });

 const mismatched=message('source-mismatch',orderText);
 mismatched.nativeSenderJid='8801836743754@s.whatsapp.net';
 mismatched.senderPhoneTransport='8801836743754';
 assert.deepEqual(classifyBusinessSource(account,mismatched,contacts,{},[],CASH_SCOPE_CHATS),{
  domain:null,outcome:'UNAPPROVED_SOURCE',
 });

 const cash=message('cash-source',orderText,'OUTGOING',CASH_SCOPE_CHATS[0]);
 assert.deepEqual(classifyBusinessSource(account,cash,contacts,{},[],CASH_SCOPE_CHATS),{
  domain:'cash',outcome:'CASH_SOURCE',
 });

 const conflictingChat=CASH_SCOPE_CHATS[1];
 const conflicted=message('conflicting-source',orderText,'INCOMING',conflictingChat);
 conflicted.nativeSenderJid=conflictingChat;
 conflicted.senderPhoneTransport=null;
 const cashAlias={[conflictingChat.split('@')[0]]:contacts[0].phone};
 assert.deepEqual(classifyBusinessSource(account,conflicted,contacts,cashAlias,[],CASH_SCOPE_CHATS),{
  domain:null,outcome:'SOURCE_CONFLICT',
 });
});

test('unknown, Cash, and WA-02 messages never produce Vessel operations',()=>{
 const cash=message('cash-is-not-vessel',orderText,'OUTGOING',CASH_SCOPE_CHATS[0]);
 const unknown=message('unknown-is-not-vessel',orderText,'INCOMING','unknown@s.whatsapp.net');
 const wa02={...message('wa02-is-not-vessel',orderText),accountId:'wa-02'};
 assert.deepEqual(deriveEscortRegisterOps(
  account,[cash,unknown],contacts,[],{},[],CASH_SCOPE_CHATS,
 ),[]);
 assert.deepEqual(deriveEscortRegisterOps(
  {accountId:'wa-02'},[wa02],contacts,[],{},[],CASH_SCOPE_CHATS,
 ),[]);
});

test('ambiguous matching drafts remain assignment review instead of confirmation',()=>{
 // Genuine competition: two drafts for the same Lighter on different duty dates.
 const base={account_id:'wa-01',client_contact_id:OWNER_ESCORT_CLIENTS[0].id,chat_jid:'8801670535255@s.whatsapp.net',master_mobile:'+8801829984145',mother_vessel:'Alpha Unity',lighter_vessel:'Light One',booking_date:'2026-10-03',status:'DRAFT'};
 const ops=deriveEscortRegisterOps(account,[message('assignment-ambiguous',assignmentText,'OUTGOING')],contacts,[
  {...base,id:'draft-a',duty_date:'2026-10-03'},
  {...base,id:'draft-b',duty_date:'2026-10-10'},
 ]);
 assert.equal(ops.length,1);assert.equal(ops[0].kind,'REVIEW');assert.deepEqual(ops[0].row.reasons,['ASSIGNMENT_MATCH_AMBIGUOUS']);
});

test('group history is not treated as client authority',()=>{
 const ops=deriveEscortRegisterOps(account,[message('group-order',orderText,'INCOMING','120363426895117693@g.us'),message('group-assignment',assignmentText,'OUTGOING','120363426895117693@g.us')],contacts,[]);
 assert.deepEqual(ops,[]);
});

test('group intake is evidence only and never originates an order draft',()=>{
 const groupJid='120363426895117693@g.us';
 const groupMessage=message('authorized-group-order',orderText,'INCOMING',groupJid);
 groupMessage.nativeSenderJid='participant-stable@lid';
 const authorization={
  account_id:'wa-01',group_jid:groupJid,participant_jid:groupMessage.nativeSenderJid,
  client_contact_id:OWNER_ESCORT_CLIENTS[0].id,active:true,authorization_ref:'synthetic-owner-approval',
 };
 // Only the three verified clients may originate orders; a group order stays
 // evidence and produces no DRAFT.
 assert.deepEqual(deriveEscortRegisterOps(account,[groupMessage],contacts,[],{},[authorization]),[]);
 // The named escort must be the author for an incoming group assignment.
 const groupAssignment=message('authorized-group-assignment',assignmentText.replace('01754-334400','01670-535255'),'INCOMING',groupJid);
 groupAssignment.nativeSenderJid='participant-stable@lid';
 const allowed=deriveEscortRegisterOps(account,[groupAssignment],contacts,[],{},[authorization]);
 assert.equal(allowed.length,1);
 assert.equal(allowed[0].row.status,'REVIEW');
 assert.equal(allowed[0].event.payload.source.chatType,'group');
 assert.equal(allowed[0].row.parsed.evidenceOnly,true);
 assert.equal(allowed[0].row.confirmationMessageId,null);
 assert.deepEqual(deriveEscortRegisterOps(account,[groupMessage],contacts,[],{},[
  {...authorization,participant_jid:'unverified@lid'},
 ]),[]);
 assert.deepEqual(deriveEscortRegisterOps(account,[groupMessage],contacts,[],{},[
  {...authorization,group_jid:'120363428977781821@g.us'},
 ]),[]);
});

test('WA-02 never produces a Vessel register operation',()=>{
 const wa02={accountId:'wa-02'};
 const wa02Contacts=[{...contacts[0],account_id:'wa-02'}];
 assert.deepEqual(deriveEscortRegisterOps(wa02,[
  {...message('wa02-order',orderText),accountId:'wa-02'},
 ],wa02Contacts,[]),[]);
});

test('same complete business tuple from two contacts shares one canonical review and preserves both sources',()=>{
 const second={id:OWNER_ESCORT_CLIENTS[1].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[1].phone,active:true};
 const bothContacts=[...contacts,second];
 const first=message('assignment-first',assignmentText,'OUTGOING');
 const secondMessage=message('assignment-second',assignmentText,'OUTGOING','8801836743754@s.whatsapp.net');
 const ops=deriveEscortRegisterOps(account,[first,secondMessage],bothContacts,[]);
 assert.equal(ops.length,2);
 assert.equal(ops[0].row.businessKey.length,64);
 assert.equal(ops[0].row.id,ops[1].row.id);
 assert.notEqual(ops[0].row.sourceHash,ops[1].row.sourceHash);
 assert.equal(ops[1].row.reasons[0],'BUSINESS_DUPLICATE_SOURCE_LINKED');
 assert.equal(ops[0].event.payload.source.messageId,'assignment-first');
 assert.equal(ops[1].event.payload.source.messageId,'assignment-second');
});

test('exact duplicate source input is emitted once and replay remains idempotent',()=>{
 const source=message('exact-assignment',assignmentText,'OUTGOING');
 const first=deriveEscortRegisterOps(account,[source,source],contacts,[]);
 assert.equal(first.length,1);
 assert.equal(first[0].kind,'REVIEW');
 const replay=deriveEscortRegisterOps(account,[source],contacts,first.map(op=>op.row));
 assert.deepEqual(replay,[]);
});

test('same-date same-shift inputs reuse the existing canonical ID',()=>{
 const second={id:OWNER_ESCORT_CLIENTS[1].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[1].phone,active:true};
 const first=message('same-shift-first',assignmentText,'OUTGOING');
 const repeated=message('same-shift-second',assignmentText,'OUTGOING','8801836743754@s.whatsapp.net');
 const ops=deriveEscortRegisterOps(account,[first,repeated],[...contacts,second],[]);
 assert.equal(ops.length,2);
 assert.equal(ops[1].row.id,ops[0].row.id);
 assert.equal(ops[1].row.businessKey,ops[0].row.businessKey);
 assert.equal(ops[1].row.reasons[0],'BUSINESS_DUPLICATE_SOURCE_LINKED');
 assert.equal(ops[1].event.payload.source.messageId,'same-shift-second');
});

test('same vessels within one day with different shifts link as a potential duplicate for review',()=>{
 const second={id:OWNER_ESCORT_CLIENTS[1].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[1].phone,active:true};
 const first=message('night-assignment',assignmentText,'OUTGOING');
 const dayAssignment=message('day-assignment',assignmentText.replace('(N)','(D)'),'OUTGOING','8801836743754@s.whatsapp.net');
 const ops=deriveEscortRegisterOps(account,[first,dayAssignment],[...contacts,second],[]);
 assert.equal(ops.length,2);
 assert.equal(ops[0].row.id,ops[1].row.id);
 assert.equal(ops[1].row.businessKey,ops[0].row.businessKey);
 assert.deepEqual(ops[1].row.reasons,['POTENTIAL_DUPLICATE_WITHIN_ONE_DAY_REQUIRES_REVIEW']);
 assert.equal(ops[1].row.parsed.businessDuplicateOrderId,ops[0].row.id);
});

test('one-day potential duplicate preserves existing canonical IDs and unrelated records',()=>{
 const first=message('canonical-night',assignmentText,'OUTGOING');
 const canonical=deriveEscortRegisterOps(account,[first],contacts,[])[0].row;
 const existing={...canonical,id:'preserved-canonical-id',account_id:'wa-01'};
 const unrelated={...canonical,id:'unrelated-record',account_id:'wa-02',shift:'D'};
 const sameShift=message('canonical-night-duplicate',assignmentText,'OUTGOING');
 const day=message('uncertain-day',assignmentText.replace('(N)','(D)'),'OUTGOING');
 const ops=deriveEscortRegisterOps(account,[sameShift,day],contacts,[existing,unrelated]);
 assert.equal(ops.length,2);
 assert.equal(ops[0].row.id,existing.id);
 assert.equal(ops[0].row.reasons[0],'BUSINESS_DUPLICATE_SOURCE_LINKED');
 assert.equal(ops[1].row.id,existing.id);
 assert.equal(ops[1].row.businessKey,existing.businessKey);
 assert.deepEqual(ops[1].row.reasons,['POTENTIAL_DUPLICATE_WITHIN_ONE_DAY_REQUIRES_REVIEW']);
 assert.deepEqual(ops[1].row.parsed.potentialDuplicateOrderIds,[existing.id]);
});

test('one-day vessel duplicates retain source evidence while two-day and different-vessel records stay separate',()=>{
 const second={id:OWNER_ESCORT_CLIENTS[1].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[1].phone,active:true};
 const first=message('assignment-day-1',assignmentText,'OUTGOING');
 const nextDay=message('assignment-day-2',assignmentText
  .replace('03/10/26','04/10/26')
  .replace('01754-334400','01811-223344'),'OUTGOING','8801836743754@s.whatsapp.net');
 const twoDays=message('assignment-day-3',assignmentText
  .replace('03/10/26','05/10/26'),'OUTGOING','8801836743754@s.whatsapp.net');
 const differentLighter=message('assignment-different-lighter',assignmentText
  .replace('Light One','Light Two'),'OUTGOING','8801836743754@s.whatsapp.net');
 const ops=deriveEscortRegisterOps(account,[first,nextDay,twoDays,differentLighter],[...contacts,second],[]);
 assert.equal(ops.length,4);
 assert.equal(ops[1].row.id,ops[0].row.id);
 assert.deepEqual(ops[1].row.reasons,['POTENTIAL_DUPLICATE_WITHIN_ONE_DAY_REQUIRES_REVIEW']);
 assert.equal(ops[1].event.payload.source.messageId,'assignment-day-2');
 assert.notEqual(ops[2].row.id,ops[0].row.id);
 assert.notEqual(ops[3].row.id,ops[0].row.id);
 assert.equal(ops[3].row.lighterVessel,'Light Two');
});

test('ambiguous one-day vessel matches remain visible as review instead of being merged',()=>{
 const first=deriveEscortRegisterOps(account,[message('ambiguous-first',assignmentText,'OUTGOING')],contacts,[])[0].row;
 const second={...first,id:'another-canonical-order',dutyDate:'2026-10-04',duty_date:'2026-10-04',businessKey:'b'.repeat(64),business_key:'b'.repeat(64)};
 const current=message('ambiguous-current',assignmentText,'OUTGOING');
 const ops=deriveEscortRegisterOps(account,[current],contacts,[first,second]);
 assert.equal(ops.length,1);
 assert.notEqual(ops[0].row.id,first.id);
 assert.equal(ops[0].row.businessKey,null);
 assert.deepEqual(ops[0].row.reasons,['POTENTIAL_DUPLICATE_AMBIGUOUS_REQUIRES_REVIEW']);
 assert.deepEqual(ops[0].row.parsed.potentialDuplicateOrderIds,[first.id,second.id].sort());
});

test('reconciliation replay emits no duplicate rows after persisted outputs',()=>{
 const second={id:OWNER_ESCORT_CLIENTS[1].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[1].phone,active:true};
 const messages=[
  message('reconcile-night',assignmentText,'OUTGOING'),
  message('reconcile-day',assignmentText.replace('(N)','(D)'),'OUTGOING','8801836743754@s.whatsapp.net'),
 ];
 const first=deriveEscortRegisterOps(account,messages,[...contacts,second],[]);
 const replay=deriveEscortRegisterOps(account,messages,[...contacts,second],first.map(op=>op.row));
 assert.equal(first.length,2);
 assert.deepEqual(replay,[]);
});

test('Vessel batch processing adds review operations to same-batch match state',()=>{
 const source=readFileSync(new URL('../scripts/process-vessel.ts',import.meta.url),'utf8');
 const processBatch=source.slice(source.indexOf('async function processBatch'));
 const loop=processBatch.slice(processBatch.indexOf('for(const operation of operations)'));
 assert.ok(processBatch.indexOf('const accountRows=existing.filter')<processBatch.indexOf('for(const row of rows)'));
 assert.ok(source.indexOf('classifyBusinessSource(')<source.indexOf('parseEscortOrder('));
 assert.match(processBatch,/approvedContacts\(contactsResult\.rows\?\?\[\]\)/);
 assert.match(loop,/await persistOperationIfNew\(client,operation\)/);
 assert.match(loop,/if\(persisted==="skipped_duplicate"\)continue;/);
 assert.match(loop,/accountRows\.push\(/);
 assert.doesNotMatch(loop,/if\(operation\.kind==="DRAFT"\)/);
});

test('missing matching order remains review',()=>{
 const ops=deriveEscortRegisterOps(account,[message('assignment-missing',assignmentText,'OUTGOING')],contacts,[]);
 assert.equal(ops.length,1);assert.equal(ops[0].kind,'REVIEW');assert.deepEqual(ops[0].row.reasons,['DRAFT_MATCH_UNRESOLVED']);
});

test('malformed shift parentheses still yield the duty date and shift',()=>{
 const text='Mother Vessel: M.V. Poavosa-Wisdon\nLighter Vessel:M.V. Lamia\nMaster Mobile:01797-268475\nEscort Name: Sowrov\nEscort mobile:01771-435111\n22/10/26 ((N)';
 const ops=deriveEscortRegisterOps(account,[message('malformed-shift',text,'OUTGOING')],contacts,[]);
 assert.equal(ops.length,1);
 assert.equal(ops[0].kind,'REVIEW');
 assert.equal(ops[0].row.dutyDate,'2026-10-22');
 assert.equal(ops[0].row.shift,'N');
});

test('incomplete assignment evidence is retained for review without a duplicate key',()=>{
 const incomplete=assignmentText.replace('Escort mobile: 01754-334400\n','');
 const ops=deriveEscortRegisterOps(account,[message('incomplete-assignment',incomplete,'OUTGOING')],contacts,[]);
 assert.equal(ops.length,1);
 assert.equal(ops[0].kind,'REVIEW');
 assert.equal(ops[0].row.status,'REVIEW');
 assert.equal(ops[0].row.businessKey,null);
 assert.ok(ops[0].row.reasons.includes('ASSIGNMENT_EVIDENCE_INCOMPLETE:ESCORT_MOBILE'),ops[0].row.reasons.join(','));
 assert.equal(ops[0].event.payload.ownerRule,'ASSIGNMENT_DOES_NOT_CONFIRM_OR_START_DUTY');
});

test('group office assignment is attributed only to the participant it names',()=>{
 const groupJid='120363426895117693@g.us';
 const authorization={account_id:'wa-01',group_jid:groupJid,participant_jid:'8801670535255@s.whatsapp.net',
  client_contact_id:OWNER_ESCORT_CLIENTS[0].id,active:true,authorization_ref:'synthetic-owner-approval'};
 const unnamedEscort=deriveEscortRegisterOps(account,[message('office-assignment-unmatched',assignmentText,'OUTGOING',groupJid)],contacts,[],{},[authorization]);
 assert.deepEqual(unnamedEscort,[],'an escort who is not an authorized participant must not be invented');
 const named=assignmentText.replace('01754-334400','01670-535255');
 const matched=deriveEscortRegisterOps(account,[message('office-assignment-matched',named,'OUTGOING',groupJid)],contacts,[],{},[authorization]);
 assert.equal(matched.length,1);
 assert.equal(matched[0].row.clientContactId,OWNER_ESCORT_CLIENTS[0].id);
 assert.equal(matched[0].row.status,'REVIEW');
 assert.equal(matched[0].row.chatJid,groupJid);
});

test('an incoming participant cannot create an assignment for another escort',()=>{
 const groupJid='120363426895117693@g.us';
 const authorization={account_id:'wa-01',group_jid:groupJid,participant_jid:'8801670535255@s.whatsapp.net',
  client_contact_id:OWNER_ESCORT_CLIENTS[0].id,active:true,authorization_ref:'synthetic-owner-approval'};
 assert.deepEqual(deriveEscortRegisterOps(account,[message('author-mismatch',assignmentText,'INCOMING',groupJid)],contacts,[],{},[authorization]),[]);
});

test('verified PN/LID aliases resolve to the same approved direct conversation',()=>{
 const aliases=scopePhoneAliases([{canonical_chat_jid:'8801670535255@s.whatsapp.net',alias_chat_jids:['166082241384593@lid']}]);
 assert.equal(aliases['166082241384593'],'+8801670535255');
 const lidMessage=message('lid-assignment',assignmentText,'OUTGOING','166082241384593@lid');
 const ops=deriveEscortRegisterOps(account,[lidMessage],contacts,[],aliases);
 assert.equal(ops.length,1,'an alias-addressed office assignment must reach the same conversation');
 assert.equal(ops[0].row.clientContactId,OWNER_ESCORT_CLIENTS[0].id);
 assert.equal(ops[0].row.chatJid,'166082241384593@lid');
});
