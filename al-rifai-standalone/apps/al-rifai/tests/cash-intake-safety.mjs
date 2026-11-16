import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLivePaymentBlocks,employeeNameMatches,employeeReviewReasons,liveSourceIdentity,isLiveCashOwnerOutgoing} from '../candidates/identity-review/live-cash.ts';
import {cashSourceEligibility} from '../lib/cash-source-eligibility.ts';
import {publishCashBlock} from '../lib/cash-publish.ts';
import {cashScopeWhere,CASH_SCOPE_ACCOUNT,CASH_SCOPE_CHAT,CASH_SCOPE_CHAT_LID,CASH_SCOPE_NAME,isCashScopeAccountant,isCashScopeChat,isCashScopeOwner} from '../lib/cash-scope.ts';

test('cash parser keeps Employee ID and payout distinct and stores exact minor units',()=>{
 const rows=parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 01712345678 (B) 1,250/- food');
 assert.equal(rows.length,1);
 assert.equal(rows[0].fields.employeeId,'01312345678');
 assert.equal(rows[0].fields.employeeMobile,'+8801312345678');
 assert.equal(rows[0].fields.payoutNumber,'01712345678');
 assert.equal(rows[0].fields.payoutMobile,'+8801712345678');
 assert.equal(rows[0].fields.methodMarker,'B');
 assert.equal(rows[0].fields.amount,'1,250');
 assert.equal(rows[0].fields.amountMinor,'125000');
});

test('name-only and incomplete payment text never creates a cash block',()=>{
 assert.deepEqual(parseLivePaymentBlocks('Rahim Uddin (B) 1,250/- food'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin (B) 1,250/- food'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 01712345678 1,250/-'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 1,250/-'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 01712345678(B) 1,2,50/-'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 01712345678(C) 1,250/-'),[]);
 assert.deepEqual(parseLivePaymentBlocks('ID: 01312345678 Rahim Uddin 01712345678(B) -200/-'),[]);
});

const ownerSamples=[
 'ID: 01839882307 Ali Khan 01923100237(B) 200/-',
 'ID: 01752149074 Sahedul Islam 01605263994(B) 500/-',
 'ID: 01540564651 Mirajul Islam 01540564651(B) 200/-',
 'ID: 01883192831 Yanat Alam 01883192831(B) 200/-',
 'ID: 01939987667 Elahe Molla 01939987667(B) 200/-',
 'ID: 01896087511 Mohammed Sihab 01952406074(B) 1500/-',
 'ID: 01321706844 Md.Nazmul Hossain 01321706844(B) 500/-',
 'ID: 01896087511 Mohammed Sihab 01896087511(N) 1000/-',
 'ID: 01405516576 Md.Jahidul Islam 01405516576(N) 2000/-',
 'ID 01937539700 Joy Samadder 01755627557(B) 300/-',
 'ID: 01405516576 Md.Jahidul Islam 01405516576(N) 200/-',
];

test('all eleven Owner samples parse without merging repeated Employee IDs',()=>{
 const blocks=ownerSamples.map(text=>parseLivePaymentBlocks(text)[0]);
 assert.equal(blocks.filter(Boolean).length,11);
 assert.equal(new Set(blocks.map(block=>block.fields.employeeId)).size,9);
 assert.equal(blocks.reduce((sum,block)=>sum+BigInt(block.fields.amountMinor),0n),680000n);
 assert.equal(blocks.filter(block=>block.fields.method==='bkash').length,8);
 assert.equal(blocks.filter(block=>block.fields.method==='nagad').length,3);
 assert.equal(blocks[6].fields.employeeName,'Md.Nazmul Hossain');
 assert.equal(blocks[8].fields.employeeName,'Md.Jahidul Islam');
 assert.equal(blocks[9].fields.employeeId,'01937539700');
 assert.equal(blocks[9].fields.payoutNumber,'01755627557');
 assert.equal(blocks[5].fields.payoutNumber,'01952406074');
 assert.equal(blocks[7].fields.employeeId,blocks[5].fields.employeeId);
 assert.notEqual(blocks[7].fields.payoutNumber,blocks[5].fields.payoutNumber);
 assert.notEqual(blocks[8].fields.amountMinor,blocks[10].fields.amountMinor);
});

test('same source message and block have stable idempotency identity',()=>{
 assert.equal(liveSourceIdentity('message-1','payment-block-0'),liveSourceIdentity('message-1','payment-block-0'));
 assert.notEqual(liveSourceIdentity('message-1','payment-block-0'),liveSourceIdentity('message-1','payment-block-1'));
 assert.notEqual(liveSourceIdentity('message-1','payment-block-0'),liveSourceIdentity('message-2','payment-block-0'));
 assert.notEqual(liveSourceIdentity('message-text-copy-1','payment-block-0'),liveSourceIdentity('message-text-copy-2','payment-block-0'));
 // PN and LID are one logical Accountant conversation: the source identity must
 // collapse to a single record so a replayed message cannot post twice.
 assert.equal(liveSourceIdentity('message-1','payment-block-0',CASH_SCOPE_CHAT),liveSourceIdentity('message-1','payment-block-0',CASH_SCOPE_CHAT_LID));
 assert.throws(()=>liveSourceIdentity('','payment-block-0'),/LIVE_CASH_SOURCE_IDENTITY_UNRESOLVED/);
 assert.throws(()=>liveSourceIdentity('message-1',''),/LIVE_CASH_SOURCE_IDENTITY_UNRESOLVED/);
});

test('publisher is idempotent by source identity but keeps identical text from distinct messages',async()=>{
 const stored=[];
 let pendingSource=null;
 const pool={connect:async()=>({
  query:async(sql,values=[])=>{
   if(sql.includes('SELECT ci.employee_mobile'))return {rows:stored.filter(row=>
    row.account===values[0]&&row.messageId===values[1]&&row.blockKey===values[2]
     &&values[3].includes(row.chatJid))};
   if(sql.includes('INSERT INTO public.source_refs')){
    pendingSource={account:values[1],chatJid:values[3],messageId:values[4],blockKey:values[6]};
   }
   if(sql.includes('INSERT INTO public.cash_instructions')){
    stored.push({...pendingSource,employee_mobile:values[7],employee_name:values[8],
     payout_mobile:values[9],purpose:values[10],method:values[11],amount_minor:values[12]});
   }
   return {rows:[]};
  },
  release(){},
 })};
 const input=(messageId,amountMinor='20000')=>({
  account:CASH_SCOPE_ACCOUNT,chatJid:CASH_SCOPE_CHAT,messageId,sender:'verified-admin',
  sourceTime:'2026-11-03T00:00:00.000Z',sourceHash:'a'.repeat(64),cashAccount:'Cash Payment',
  epoch:'CANONICAL_BACKFILL_20261026',
  block:{blockKey:'payment-block-0',blockOrder:0,fields:{
   employeeId:'01839882307',employeeMobile:'+8801839882307',employeeName:'Ali Khan',
   payoutNumber:'01923100237',payoutMobile:'+8801923100237',methodMarker:'B',
   method:'bkash',amount:amountMinor==='20000'?'200':'250',amountMinor,purpose:'Owner direct payment instruction',
  }},
 });
 assert.equal(await publishCashBlock(pool,input('source-message-a')),'written');
 stored[0].purpose='';
 assert.equal(await publishCashBlock(pool,input('source-message-a')),'duplicate');
 assert.equal(await publishCashBlock(pool,input('source-message-b')),'written');
 await assert.rejects(publishCashBlock(pool,input('source-message-a','25000')),/LIVE_SOURCE_REPLAY_CONFLICT/);
 assert.equal(stored.length,2);
});

test('employee association uses the canonical Employee ID and conflicting names stay in review',()=>{
 assert.equal(employeeNameMatches('Md.Nazmul Hossain',['Md. Nazmul Hossain']),true);
 assert.equal(employeeNameMatches('Md.Jahidul Islam',['Md. Jahidul Islam']),true);
 assert.equal(employeeNameMatches('Different Person',['Md. Jahidul Islam']),false);
 assert.equal(employeeNameMatches('Any Name',null),false);
 assert.deepEqual(employeeReviewReasons(undefined,'Ali Khan'),['EMPLOYEE_ID_UNMATCHED']);
 assert.deepEqual(employeeReviewReasons({state:'REVIEW',preferred_name:'Ali Khan',name_aliases:[]},'Ali Khan'),['EMPLOYEE_ID_NOT_CONFIRMED']);
 assert.deepEqual(employeeReviewReasons({state:'CONFIRMED',preferred_name:'Ali Khan',name_aliases:[]},'Different Person'),['EMPLOYEE_ID_NAME_CONFLICT']);
 assert.deepEqual(employeeReviewReasons({state:'CONFIRMED',preferred_name:'Ali Khan',name_aliases:[]},'Ali Khan'),[]);
});

test('Accountant PN and native LID remain one explicitly scoped Cash chat',()=>{
 assert.equal(isCashScopeChat(CASH_SCOPE_CHAT),true);
 assert.equal(isCashScopeChat(CASH_SCOPE_CHAT_LID),true);
 assert.equal(isCashScopeOwner('8801880446111@s.whatsapp.net'),true);
 assert.equal(isCashScopeOwner('93282931581172:27@lid'),true);
 assert.equal(isCashScopeOwner('93282931581172@lid'),true);
 assert.equal(isCashScopeOwner('8801880446111'),false);
 assert.equal(isCashScopeOwner('93282931581172@evil.example'),false);
 assert.equal(isCashScopeAccountant('19460614262828:3@lid'),true);
 assert.equal(isCashScopeAccountant('8801844836824@g.us'),false);
 assert.equal(isCashScopeChat('120363428977781821@g.us'),false);
});

test('only the verified Admin outgoing direct message to the designated Accountant is eligible',()=>{
 const good={accountId:'wa-01',chatJid:CASH_SCOPE_CHAT,direct:true,direction:'OUTGOING',senderJid:'8801880446111:2@s.whatsapp.net',recipientJid:CASH_SCOPE_CHAT};
 assert.equal(cashSourceEligibility(good),'ELIGIBLE');
 assert.equal(cashSourceEligibility({...good,direction:'INCOMING'}),'NOT_OWNER_OUTGOING');
 assert.equal(cashSourceEligibility({...good,recipientJid:'8801999999999@s.whatsapp.net'}),'CASH_RECIPIENT_IDENTITY_UNRESOLVED');
 assert.equal(cashSourceEligibility({...good,recipientJid:undefined}),'CASH_RECIPIENT_IDENTITY_UNRESOLVED');
 assert.equal(cashSourceEligibility({...good,chatJid:'120363408741101070@g.us'}),'NOT_CASH_SCOPE');
 assert.equal(cashSourceEligibility({...good,chatJid:'120363428977781821@g.us'}),'NOT_CASH_SCOPE');
 assert.equal(cashSourceEligibility({...good,chatJid:'8801777777777@s.whatsapp.net'}),'NOT_CASH_SCOPE');
 assert.equal(cashSourceEligibility({...good,accountId:'wa-02'}),'NOT_CASH_SCOPE');
 assert.equal(cashSourceEligibility({...good,senderJid:'8801844836824@s.whatsapp.net'}),'OWNER_IDENTITY_UNRESOLVED');
 assert.equal(cashSourceEligibility({...good,senderJid:'8801880446111@c.us'}),'OWNER_IDENTITY_UNRESOLVED');
});

test('native live gate accepts forwarded and quoted messages but rejects ambiguous or unauthorized sources',()=>{
 // The live reader now yields native records: eligibility is decided on the
 // bridge envelope, never on a caller-supplied message object.
 const envelope={version:'native-message-envelope-v1',provider:'WHATSAPP',accountId:'wa-01',nativeMessageId:'m',chatJid:CASH_SCOPE_CHAT_LID,chatType:'direct',senderJid:'93282931581172:27@lid',senderPhone:null,senderLid:null,direction:'OUTGOING',sourceTimestamp:'2026-10-17T06:57:48.000Z',observedAt:'2026-10-17T06:57:49.000Z',eventType:'TEXT',payload:{text:'',sha256:'a'.repeat(64)},quotedMessageId:null,forwarded:false,media:[],groupDisplayName:null,membershipEvidence:null};
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope}),true);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,direction:'INCOMING'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,senderJid:'8801844836824@s.whatsapp.net'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,chatJid:'120363428977781821@g.us'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,chatType:'group'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,accountId:'wa-02'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,forwarded:true}}),true);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,forwarded:null}}),true);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,quotedMessageId:'quoted'}}),true);
 assert.equal(isLiveCashOwnerOutgoing({status:'CONTENT',envelope:{...envelope,senderJid:'93282931581172@unknown'}}),false);
 assert.equal(isLiveCashOwnerOutgoing({status:'NON_CONTENT',envelope:null}),false);
});

test('cash API scope is server-owned and traceable',()=>{
 const clauses=cashScopeWhere('i').join(' AND ');
 assert.match(clauses,/i\.scope_account = 'wa-01'/);
 assert.match(clauses,/i\.cash_account = 'Cash Payment'/);
 assert.equal(CASH_SCOPE_ACCOUNT,'wa-01');
 assert.match(CASH_SCOPE_CHAT,/@s\.whatsapp\.net$/);
 assert.equal(CASH_SCOPE_NAME,'Cash Payment');
 const route=readFileSync(new URL('../app/api/cash/[...path]/route.ts',import.meta.url),'utf8');
 for(const field of ['i.source_ref','i.command_id','i.state','i.reasons','s.chat_jid','s.message_id','s.original_sender_ref','AS review','AS posted_minor'])assert.match(route,new RegExp(field.replaceAll('.','\\.')));
});

test('live intake remains review-only and has no financial posting path',()=>{
 const source=readFileSync(new URL('../candidates/identity-review/live-cash.ts',import.meta.url),'utf8');
 const publisher=readFileSync(new URL('../lib/cash-publish.ts',import.meta.url),'utf8');
 const processor=readFileSync(new URL('../scripts/process-cash.ts',import.meta.url),'utf8');
 assert.match(source,/mode!=='APPROVED_REVIEW_ONLY'/);
 assert.match(publisher,/FINANCIAL_POSTING_REQUIRES_SEPARATE_APPROVAL/);
 assert.match(publisher,/,\s*'REVIEW'/);
 assert.doesNotMatch(source,/APPROVED_AUTO_POST|alrifai_post_owner_accountant_cash/);
 assert.doesNotMatch(publisher,/APPROVED_AUTO_POST|alrifai_post_owner_accountant_cash/);
 assert.match(source,/LIVE_CASH_ACCOUNTANT_BINDING_REQUIRED/);
 assert.match(processor,/o\.chat_type,o\.message_id,o\.direction/);
 assert.match(processor,/o\.sender_jid,o\.receiver_jid/);
 assert.doesNotMatch(processor,/forwarded|quotedMessageId/);
 assert.match(processor,/financialAction:"NONE"/);
 assert.match(publisher,/message_id=\$2/);
 assert.doesNotMatch(publisher,/INSERT INTO public\.employee_master/);
});

test('historical Cash backfill defaults to read-only and requires explicit go/no-go for apply',()=>{
 const backfill=readFileSync(new URL('../scripts/backfill-approved.mjs',import.meta.url),'utf8');
 assert.match(backfill,/const applyMode = args\.includes\('--apply'\)/);
 assert.match(backfill,/const loader = createPool\(\{readOnly: true, user: 'ir_review_runtime'\}\)/);
 assert.match(backfill,/const publisher = applyMode \? createPool\(\{readOnly: false, user: 'ir_review_runtime'\}\) : null/);
 assert.match(backfill,/const runWriter = applyMode \? createPool\(\{readOnly: false\}\) : null/);
 assert.match(backfill,/if \(!applyMode\)\s*\{\s*await dryRun\(\);\s*return;/);
 assert.match(backfill,/CASH_BACKFILL_APPLY !== 'APPROVED_AFTER_GO_NO_GO'/);
 assert.match(backfill,/BACKFILL_WRITE_SET_HASH_REQUIRED/);
 assert.match(backfill,/BACKFILL_WRITE_SET_APPROVAL_MISMATCH/);
 assert.match(backfill,/BACKFILL_WRITE_SET_HASH_MISMATCH/);
 assert.match(backfill,/approvedSourceBlocks/);
 assert.match(backfill,/--expected-write-set-sha256=/);
 assert.match(backfill,/const manifestKey=\(entry\)=>JSON\.stringify\(\[entry\[0\],entry\[1\],entry\[2\],entry\[3\]\]\)/);
 assert.match(backfill,/const lastCursor=JSON\.stringify\(\[row\.account_id,row\.message_id\]\)/);
 assert.doesNotMatch(backfill,/const lastCursor=`\$\{row\.account_id\}\\u0000/);
 assert.ok(backfill.indexOf('if(!priorRun&&plannedDigest!==expectedWriteSetSha256)')
  <backfill.indexOf("INSERT INTO public.wa01_backfill_runs"));
 assert.match(backfill,/BACKFILL_BATCH_ALREADY_PUBLISHED/);
 assert.match(backfill,/BACKFILL_CHECKPOINT_INVALID/);
 assert.match(backfill,/cashSourceEligibility/);
 assert.match(backfill,/sourceVerificationReview/);
 assert.doesNotMatch(backfill,/if \(ambiguousCopies\) throw new Error\('BACKFILL_SOURCE_COPY_CONFLICT'\)/);
 assert.doesNotMatch(backfill,/row\.direction !== 'outgoing' \|\| !row\.sender_bare/);
});
