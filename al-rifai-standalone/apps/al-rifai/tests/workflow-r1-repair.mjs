import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../candidates/identity-review/repository.ts';
import {hash} from '../candidates/identity-review/contracts.ts';
import {readBusinessRegister} from '../candidates/identity-review/business-register.ts';
import {readHistoryExtractions} from '../candidates/identity-review/history-extractions.ts';
import {conversationSubjects} from '../candidates/identity-review/conversation-subjects.ts';
import {calculateSourceDuty} from '../lib/duty-calculation.mjs';

const now=Date.parse('2026-10-15T00:00:00Z'),chat='120363426895117693@g.us';
function fixture(domain='OFFICE'){
 const s=emptyState(),record=(kind,id,data)=>({kind,id,status:'VERIFIED',version:1,data:{id,evidenceRefs:['unit'],...data}});
 s.registry.owner=record('person','owner',{id:'owner',displayName:'Unit owner',aliases:[],employeeReferences:[],evidenceRefs:['unit']});
 s.registry.role=record('relationship','role',{personId:'owner',kind:'SUPER_ADMIN'});
 s.registry.group=record('group','group',{accountIds:['wa-01'],nativeJid:chat,domain,workflowScope:'REVIEW_ONLY',displayName:'Unit group',evidenceRefs:['unit']});
 for(const [i,cap,d] of [[1,'intake.read','IDENTITY'],[2,'evidence.read',domain],[3,'review.read',domain],[4,'workspace.read','ESCORT'],[5,'identity.read','IDENTITY']])s.registry['grant'+i]=record('grant','grant'+i,{personId:'owner',channel:'STAFF',capability:cap,scope:{accountId:'wa-01',domain:d,chatJid:null,resourceId:null}});
 const token='a'.repeat(64);s.staff.staff={id:'staff',username:'unit',personId:'owner',active:true,version:1};s.sessions[hash(token)]={id:hash(token),accountId:'staff',accountVersion:1,personId:'owner',csrfHash:hash('b'.repeat(64)),createdAt:now,lastSeen:now,expiresAt:now+100000};
 return {s,credentials:{token},clock:()=>now};
}
test('canonical draft keeps the historical-authority warning in source-aware rows',async()=>{
 const {s,credentials,clock}=fixture('ESCORT'),ref={sourceRef:'source',accountId:'wa-01',chatJid:chat,messageId:'message',payloadHash:'c'.repeat(64)};
 const client={query:async sql=>({rows:sql.includes('SELECT p.*')?[{id:'program',status:'Draft',revision:1,ledger:{programCommand:{scope:{accountId:'wa-01',chatJid:chat},allocation:{sourceTimestamp:new Date(now).toISOString()},events:[]}},references:['source'],sourceReasons:['HISTORICAL_ROLE_NOT_ESTABLISHED']}]:sql.startsWith('SELECT id AS "sourceRef"')?[ref]:[]})};
 const out=await readBusinessRegister(s,credentials,{accountId:'wa-01',view:'roster'},clock,client,async()=>({source:{visibility:'VISIBLE',payloadHash:ref.payloadHash}}));
 assert.equal(out.rows.length,1);assert.deepEqual(out.rows[0].reasons,['HISTORICAL_ROLE_NOT_ESTABLISHED']);assert.equal(out.rows[0].status,'Draft');
});
for(const domain of ['OFFICE','RELEASE'])test(domain+' release projection and final source row admission agree',async()=>{
 const {s,credentials,clock}=fixture(domain);let sqlKind;
 const assertion={version:'history-extraction-v2',parserVersion:'stored-history-extraction-v2',kind:'RELEASE',fields:{releaseDate:'2026-10-15'},reasons:['RELEASE_AUTHORITY_REVIEW'],senderLabel:'Unit sender',direction:'INCOMING',subjectRef:'group',authority:'REVIEW_ONLY',rawBodyCopied:false,posted:false,operationId:'d'.repeat(64),blockOrder:0,admission:{role:'PARTICIPANT',actorRef:null,bindingRefs:[],historical:false}};
 const row={id:'e'.repeat(64),assertion,source_ref:'ref',payload_hash:'f'.repeat(64),chat_jid:chat,message_id:'message',source_time:new Date(now).toISOString()};
 const client={query:async(sql,values)=>{sqlKind=values;return {rows:[row]};}};
 const out=await readHistoryExtractions(s,credentials,{accountId:'wa-01'},clock,client,async()=>({ref:{visibility:'VISIBLE',payloadHash:row.payload_hash}}));
 assert.ok(sqlKind.includes('RELEASE'));assert.equal(out.rows[0].kind,'RELEASE');assert.equal(out.rows[0].authority,'REVIEW_ONLY');
});
const inputs=()=>({assignment:{employeeMobile:'+8801712345678',actualStart:'2026-10-15',releaseDate:'2026-10-15'},attendance:[{employeeMobile:'+8801712345678',date:'2026-10-15',shift:'D',verified:true,sourceRef:'attendance'}],rates:[{employeeMobile:'+8801712345678',validFrom:'2026-10-01',validTo:null,halfDayMinor:'15000',verified:true,sourceRef:'rate',version:'rate-1'}],policy:{verified:true,version:'unit-policy',unit:'HALF_DAY',rounding:'EXACT_MINOR'},conveyanceMinor:'20000'});
test('duty calculation refuses malformed effective periods and inexact monetary inputs',()=>{
 for(const patch of [{validFrom:'2026-10-00'},{validTo:'2026-09-01'},{validTo:undefined},{halfDayMinor:15000},{halfDayMinor:'9007199254740992'},{verified:'yes'}]){
  const i=inputs();Object.assign(i.rates[0],patch);assert.equal(calculateSourceDuty(i).state,'UNRESOLVED');
 }
 const i=inputs();i.conveyanceMinor='1e3';assert.equal(calculateSourceDuty(i).payableMinor,null);
});
test('duty evidence pins only the rates actually used, and refuses overlapping verified rates',()=>{
 const i=inputs();i.rates.push({...i.rates[0],employeeMobile:'+8801812345678',sourceRef:'unrelated',version:'unrelated'});
 const out=calculateSourceDuty(i);assert.equal(out.payableMinor,'35000');assert.deepEqual(out.rateVersions,['rate-1']);assert.deepEqual(out.sourceRefs,['attendance','rate']);
 i.rates.push({...i.rates[0],sourceRef:'overlap'});assert.equal(calculateSourceDuty(i).state,'UNRESOLVED');
});
test('permitted subject choices disclose missing native saved/unregistered inventory',()=>{
 const {s,credentials}=fixture();const out=conversationSubjects(s,credentials,'wa-01',now);
 assert.deepEqual(out.subjects,[]);assert.equal(out.coverage.completeContactDirectory,false);assert.equal(out.coverage.unregisteredContacts,'UNKNOWN');assert.equal(out.coverage.nativeChatInventory,'NOT_CONFIGURED');
 delete s.registry.grant5;assert.throws(()=>conversationSubjects(s,credentials,'wa-01',now),/CAPABILITY_DENIED/);
});
