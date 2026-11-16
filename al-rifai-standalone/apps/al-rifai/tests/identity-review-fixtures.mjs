import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {MemoryRepository} from '../candidates/identity-review/repository.ts';
import {IdentityReviewService} from '../candidates/identity-review/service.ts';
import {hashPassword} from '../candidates/identity-review/auth.ts';
import {digest,hash,normalizePhone,domains,GROUP_DISCOVERY} from '../candidates/identity-review/contracts.ts';
const baseline=JSON.parse(readFileSync(new URL('../candidates/identity-review/evidence-baseline.json',import.meta.url)));
for(const pin of baseline.appFiles)assert.equal(hash(readFileSync(new URL('../'+pin.path,import.meta.url))),pin.sha256,'Frozen evidence changed: '+pin.path);
const fixturesPath=process.env.ALRIFAI_ESCORT_FIXTURES,nativePath=process.env.ALRIFAI_ESCORT_NATIVE_FIXTURES;
if(!fixturesPath||!nativePath)throw Error('Private unchanged Owner and native fixture files are required');
const fixtureBytes=readFileSync(fixturesPath),nativeBytes=readFileSync(nativePath);
assert.equal(hash(fixtureBytes),baseline.ownerFixturesSha256);
assert.equal(hash(nativeBytes),baseline.nativeFixturesSha256);
export const originalFixtures=JSON.parse(fixtureBytes),nativeFixtures=JSON.parse(nativeBytes);
export const password='Offline named-account fixture only 2026';
const passwordHash=await hashPassword(password);
const now=Date.parse('2026-10-11T20:00:00Z');
export function native(name='owner-original-order',direction='INCOMING'){
 const m=nativeFixtures[name].find(m=>m.accountId==='wa-01'&&m.direction===direction&&!m.chatJid.endsWith('@g.us'));
 if(!m)throw Error('Requested native fixture is unavailable');
 // Native sender, chat, direction and ID are preserved byte-for-byte. Only
 // observation time and approval fixtures below are synthetic test controls.
 return {version:'native-message-envelope-v1',provider:'WHATSAPP',accountId:m.accountId,chatJid:m.chatJid,chatType:'direct',senderJid:m.senderJid,senderPhone:normalizePhone(m.senderJid),senderLid:null,nativeMessageId:m.nativeMessageId,direction:m.direction,sourceTimestamp:new Date(m.timestamp).toISOString(),sourceTimestampOriginal:m.timestamp,observedAt:new Date(now).toISOString(),eventType:'TEXT',payload:{text:m.text,sha256:m.sourceBodySha,reference:'private-native-fixture:'+name},quotedMessageId:m.quotedMessageId??null,forwarded:false,media:[],groupDisplayName:null,membershipEvidence:null};
}
export function derived(m,overrides={}){return {...structuredClone(m),...overrides};}
export function changedText(m,text){return derived(m,{payload:{...m.payload,text,sha256:hash(text)}});}
export function buildManifest({withAlias=true,withGroups=true}={}){
 const order=native(),confirmation=native('owner-original-confirmation','OUTGOING');
 const registry=[];
 const person=id=>({kind:'person',data:{id,displayName:'Offline fixture '+id,aliases:[],employeeReferences:[],evidenceRefs:['offline-fixture-control']}});
 for(const id of ['fixture-admin','fixture-client','fixture-operations','fixture-accountant','fixture-other-account'])registry.push(person(id));
 const relationship=(id,personId,kind,clientId=null)=>registry.push({kind:'relationship',data:{id,personId,kind,clientId,evidenceRefs:['offline-fixture-control']}});
 relationship('relationship-admin','fixture-admin','ADMIN');relationship('relationship-client','fixture-client','CLIENT','fixture-logical-client');relationship('relationship-operations','fixture-operations','OPERATIONS');relationship('relationship-accountant','fixture-accountant','ACCOUNTANT');
 const binding=(id,personId,m)=>registry.push({kind:'binding',data:{id,personId,accountId:m.accountId,chatJid:m.chatJid,senderJid:m.senderJid,direction:m.direction,purpose:m.direction==='INCOMING'?'SENDER':'ACCOUNT_OWNER',phone:normalizePhone(m.senderJid),lidMappingRef:null,validFrom:'2026-10-01T00:00:00Z',validTo:null,evidenceRefs:['offline-fixture-control']}});
 binding('binding-client','fixture-client',order);binding('binding-admin','fixture-admin',confirmation);
 let serial=0;
 const grant=(personId,channel,capability,domain,accountId='wa-01',chatJid=null)=>registry.push({kind:'grant',data:{id:'grant-'+(++serial),personId,channel,capability,scope:{accountId,domain,chatJid,resourceId:null},evidenceRefs:['offline-fixture-control']}});
 for(const accountId of ['wa-01','wa-02']){
  for(const cap of ['identity.read','identity.propose','identity.verify','identity.revoke','intake.read'])grant('fixture-admin','STAFF',cap,'IDENTITY',accountId);
  for(const domain of domains)for(const cap of ['review.read','review.update','review.draft','evidence.read'])grant('fixture-admin','STAFF',cap,domain,accountId);
  grant('fixture-admin','STAFF','knowledge.read','KNOWLEDGE',accountId);
 }
 for(const domain of ['ESCORT','ATTENDANCE','RELEASE'])for(const cap of ['review.read','review.update','evidence.read'])grant('fixture-operations','STAFF',cap,domain);
 grant('fixture-operations','STAFF','intake.read','IDENTITY');
 for(const domain of ['ACCOUNTS','PAYROLL','SETTLEMENT'])for(const cap of ['review.read','evidence.read'])grant('fixture-accountant','STAFF',cap,domain);
 grant('fixture-client','WHATSAPP','escort.order.intake','ESCORT','wa-01',order.chatJid);
 grant('fixture-admin','WHATSAPP','escort.assignment.propose','ESCORT','wa-01',confirmation.chatJid);
 grant('fixture-other-account','STAFF','identity.read','IDENTITY','wa-02');
 if(withGroups)for(const group of GROUP_DISCOVERY)registry.push({kind:'group',data:{id:group.id,nativeJid:group.nativeJid,accountIds:[...group.accountIds],displayName:group.displayName,domain:group.domain,workflowScope:'REVIEW_ONLY',evidenceRefs:['offline-group-verification-control']}});
 if(withAlias)registry.push({kind:'vesselAlias',data:{id:'fixture-vessel-alias',accountId:'wa-01',left:'Harvest Unity',right:'Harvest-Uinity',evidenceRefs:['offline-alias-control']}});
 const staff=['admin','operations','accountant','other-account'].map(name=>({id:'staff-'+name,username:name,personId:'fixture-'+name,passwordHash,active:true,version:1,approvalRef:'offline-manifest-only'}));
 return {version:'identity-review-provisioning-v1',registry,staff};
}
export async function setup({repository=new MemoryRepository(),manifest=buildManifest()}={}){
 let time=now;const approvals=new Map();
 const verifyApproval=async(proof,pin,purpose)=>approvals.get(proof.decisionId)?.pin===pin&&approvals.get(proof.decisionId)?.purpose===purpose&&proof.evidenceSha===pin&&Date.parse(proof.approvedAt)<=time;
 const approve=(payload,purpose='REGISTRY_VERIFY')=>{const pin=digest(payload),decisionId='offline-approval-'+approvals.size;approvals.set(decisionId,{pin,purpose});return {decisionId,evidenceSha:pin,approvedAt:new Date(time).toISOString()};};
 const service=new IdentityReviewService(repository,{clock:()=>time,verifyApproval,dummyPasswordHash:passwordHash});
 await service.provisionOffline(manifest,approve(manifest,'PROVISION_OFFLINE'));
 const login=async(username='admin')=>{const result=await service.login(username,password,'offline-test-peer');assert.ok(result.ok);return {token:result.token,csrf:result.csrf};};
 return {service,repository,approve,login,passwordHash,advance:ms=>{time+=ms;},time:()=>time,snapshot:()=>repository.transaction(s=>s)};
}
