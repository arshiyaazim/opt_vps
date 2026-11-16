/** Offline qualification using the Owner's private, source-pinned messages. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEscortOrder,parseEscortDate,qualifyEscortIntake,buildEscortAdminDraft,selectEscortDraftMatch,qualifyEscortSendOutcome} from '../lib/escort-intake-candidate.mjs';
import {sha,canonical,normalizeEmployeeMobile} from '../lib/employee-program-validation.mjs';

const path=process.env.ALRIFAI_ESCORT_FIXTURES;
if(!path)throw Error('Set ALRIFAI_ESCORT_FIXTURES to the private Owner fixture JSON; no synthetic business examples are substituted.');
const fixtures=JSON.parse(readFileSync(path,'utf8'));
for(const [name,fixture] of Object.entries(fixtures))if(fixture.bodySha&&sha(fixture.message.body)!==fixture.bodySha)throw Error('SOURCE_FIXTURE_HASH_MISMATCH: '+name);
const body=name=>fixtures[name].message.body;
const nativePath=process.env.ALRIFAI_ESCORT_NATIVE_FIXTURES;
if(!nativePath)throw Error('Set ALRIFAI_ESCORT_NATIVE_FIXTURES to the read-only source-matched native records.');
const nativeFixtures=JSON.parse(readFileSync(nativePath,'utf8'));
for(const [name,rows] of Object.entries(nativeFixtures))for(const row of rows)assert.equal(sha(row.text),fixtures[name].bodySha,'Native body must match the unchanged Owner fixture: '+name);
const nativeDirect=(name,direction)=>structuredClone(nativeFixtures[name].find(m=>m.chatJid.endsWith('@s.whatsapp.net')&&m.direction===direction));
const nativeOrder=nativeDirect('owner-original-order','INCOMING');
const nativeConfirmation=nativeDirect('owner-original-confirmation','OUTGOING');
// These are explicitly artificial authority/envelope controls for offline tests.
// They do not designate actual contacts or grant application access.
const envelope=(name,overrides={})=>({accountId:'offline-account',chatJid:'offline-client@lid',senderJid:'offline-client@lid',nativeMessageId:name,timestamp:'2026-10-03T13:24:13Z',direction:'INCOMING',text:body(name),...overrides});
const client={id:'fixture-client-binding',clientId:'offline-client',resolvedPhone:normalizeEmployeeMobile(nativeOrder.senderJid),version:'1',active:true,decision:'APPROVED',approver:'offline-test-only',evidenceSha:sha('offline-binding-control'),role:'client',accountId:'offline-account',chatJid:'offline-client@lid',senderJid:'offline-client@lid',direction:'INCOMING',chatType:'direct',validFrom:'2026-10-01',validTo:null};
const admin={...client,id:'fixture-admin-binding',role:'admin',resolvedPhone:normalizeEmployeeMobile(nativeConfirmation.senderJid),senderJid:'offline-admin@lid',direction:'OUTGOING'};
const incoming=(name='owner-original-order',overrides={},bindings=[client])=>qualifyEscortIntake(envelope(name,overrides),{bindings});
const confirm=()=>envelope('owner-original-confirmation',{senderJid:admin.senderJid,direction:'OUTGOING',timestamp:'2026-10-03T19:27:20Z'});
const alias={left:'Harvest Unity',right:'Harvest-Uinity',decision:'APPROVED',approver:'offline-test-only',evidenceSha:sha('offline-vessel-alias-control')};
const suite=process.env.ALRIFAI_ESCORT_SUITE??'baseline';
if(!['baseline','regression'].includes(suite))throw Error('Unknown offline suite');

if(suite==='baseline'){
test('Owner original order retains vessel, raw capacity/cargo/importer/destination and blank assignment',()=>{
 const r=incoming(),d=r.items[0];assert.equal(r.items.length,1);assert.equal(d.classification,'ORDER_DRAFT');
 assert.equal(d.fields.motherVessel,'HARVEST UNITY');assert.equal(d.fields.lighterVessel,'HABIBULLAH');
 assert.match(d.masterMobile,/^\+880.*4145$/);assert.equal(d.fields.capacity,'2000M/ton.');
 assert.equal(d.fields.cargo,'Soyabean Ext. In Bulk');assert.equal(d.fields.importer,'Nahar poultry Ltd');
 assert.equal(d.fields.destination,'O/A To Local.');assert.equal(d.bookingDate,'2026-10-03');
 assert.equal(d.employeeMobile,null);assert.equal(d.assignmentDate,null);assert.equal(d.shift,null);
 assert.equal(d.evidence.text,body('owner-original-order'));assert.ok(d.fieldEvidence.cargo.bodyLine);
});
test('pasted order keeps exact destination and makes a blank Admin preview',()=>{
 const d=incoming('owner-pasted-order').items[0],preview=buildEscortAdminDraft(d);
 assert.equal(d.fields.destination,'O/A To Local');assert.equal(d.fields.capacity,'2000 M/ton');
 assert.match(preview,/^Escort Name:\s*$/m);assert.match(preview,/^Escort Mobile:\s*$/m);assert.match(preview,/^Shift:\s*$/m);
});
test('actual two-lighter order produces distinct source-linked drafts',()=>{
 const r=incoming('Fahima-Sultana-and-Prince-Arafin');assert.equal(r.items.length,2);
 assert.deepEqual(r.items.map(d=>d.fields.lighterVessel),['Fahima Sultana','Prince Arafin']);
 assert.ok(r.items.every(d=>d.classification==='ORDER_DRAFT'));assert.notEqual(r.items[0].id,r.items[1].id);
 assert.notEqual(r.items[0].masterMobile,r.items[1].masterMobile);
});
test('all seven actual named lighters remain extractable',()=>{
 for(const [name,expected] of [['Sagor-Bodhu-4','sagor'],['Onisha-1','onisha'],['Oboni-4','oboni'],['Jobayer-Abdullah-6','jobayer'],['Red-Ocean-4','red ocean']]){
  const blocks=parseEscortOrder(body(name),{messageDate:'2026-10-05'});assert.equal(blocks.length,1,name);
  assert.ok(blocks[0].fields.lighterVessel.toLowerCase().includes(expected),name);assert.ok(blocks[0].masterMobile,name);
 }
});
test('empty bindings and unknown sender stay Review',()=>{
 assert.ok(incoming('owner-original-order',{},[]).items.every(d=>d.classification==='REVIEW'));
 assert.ok(incoming('owner-original-order',{senderJid:'unknown@lid'}).items.every(d=>d.reasons.includes('SOURCE_ROLE_UNVERIFIED')));
});
test('known name without exact native identity grants no role',()=>{
 const r=incoming('owner-original-order',{senderJid:'unknown@lid',displayName:'Escort Hridoy'});
 assert.equal(r.evidence.binding,null);
});
test('Mother Vessel label cannot override a grouped mobile',()=>{
 const text=body('owner-pasted-order').replace(/^(Mother Vessel:.*)$/m,'$1\n'+body('owner-pasted-order').match(/^Master Mobile:.*$/m)[0]);
 const r=incoming('owner-pasted-order',{text});assert.equal(r.items[0].classification,'REVIEW');
 assert.ok(r.items[0].reasons.includes('MOTHER_VESSEL_HAS_GROUPED_MOBILE'));
});
test('group evidence cannot become direct client or Admin authority',()=>{
 const message=envelope('owner-original-order',{chatJid:'offline-group@g.us'});
 const b={...client,chatJid:message.chatJid,chatType:'group',role:'group_evidence'};
 const r=qualifyEscortIntake(message,{bindings:[b]});assert.equal(r.items[0].classification,'REVIEW');
 assert.ok(r.items[0].reasons.includes('GROUP_SUPPORTING_EVIDENCE_ONLY'));
});
test('forwarded context is ordinary context; group release/finance discussion still needs review',()=>{
 // Owner rule: a forwarded or pasted Order is an Order. Forwarding metadata is
 // preserved in the evidence but never downgrades the classification.
 const typed=incoming('owner-original-order');
 const r=incoming('owner-original-order',{forwarded:{isForwarded:true}});
 assert.equal(r.items[0].classification,'ORDER_DRAFT');assert.deepEqual(r.items[0].fields,typed.items[0].fields);
 assert.equal(r.evidence.forwarded.isForwarded,true);
 const review=incoming('owner-original-order',{text:'Release Slip\nFood bill discussion\n'+body('owner-original-order')});
 assert.equal(review.items[0].classification,'REVIEW');assert.equal(review.operationalWrites,false);assert.equal(review.sendAuthorized,false);
});
test('forwarded Admin header cannot replace the actual sender identity',()=>{
 const r=incoming('owner-original-order',{senderJid:'unknown@lid',text:'Forwarded from Admin\n'+body('owner-original-order')});assert.equal(r.evidence.binding,null);
});
test('missing Master remains reviewable without stealing Escort mobile',()=>{
 const text=body('owner-pasted-order').replace(/^Master Mobile:.*\n/m,'');
 const r=incoming('owner-pasted-order',{text});assert.equal(r.items[0].masterMobile,null);assert.ok(r.items[0].reasons.includes('MISSING_masterMobile'));
 const c=qualifyEscortIntake({...confirm(),text:body('owner-original-confirmation').replace(/^Master Mobile:.*\n/m,'')},{bindings:[admin]});
 assert.equal(c.items[0].masterMobile,null);assert.equal(c.items[0].classification,'REVIEW');
});
test('original formatted confirmation has one lighter, full name, employee mobile and separate duty date',()=>{
 const r=qualifyEscortIntake(confirm(),{bindings:[admin]});const d=r.items[0];
 assert.equal(r.items.length,1);assert.equal(d.fields.escortName,'Md.Osman- Goni');assert.match(d.employeeMobile,/^\+880.*4400$/);
 assert.equal(d.assignmentDate,'2026-10-03');assert.equal(d.shift,'N');assert.equal(d.evidence.messageDate,'2026-10-04');
 assert.equal(d.evidence.timezone,'Asia/Dhaka');assert.equal(d.classification,'REVIEW');
});
test('pasted Assignment label and two-digit date preserve N',()=>{
 const blocks=parseEscortOrder(body('owner-pasted-confirmation'),{messageDate:'2026-10-04'});
 assert.equal(blocks.length,1);assert.equal(blocks[0].assignmentDate,'2026-10-03');assert.equal(blocks[0].shift,'N');assert.equal(blocks[0].fields.escortName,'Md. Osman Goni');
});
test('spelling variation needs an explicit approved alias before linking',()=>{
 const drafts=incoming().items;
 assert.equal(qualifyEscortIntake(confirm(),{bindings:[admin],existingDrafts:drafts}).items[0].linkedDraftId,null);
 const linked=qualifyEscortIntake(confirm(),{bindings:[admin],existingDrafts:drafts,approvedVesselAliases:[alias]}).items[0];
 assert.equal(linked.classification,'ADMIN_ASSIGNMENT_LINK_CANDIDATE');assert.equal(linked.linkedDraftId,drafts[0].id);
});
test('two same-detail native orders make matching ambiguous, never silently collapse',()=>{
 const first=incoming().items,second=incoming('owner-original-order',{nativeMessageId:'distinct-occurrence'}).items;
 assert.notEqual(first[0].id,second[0].id);
 const r=qualifyEscortIntake(confirm(),{bindings:[admin],existingDrafts:[...first,...second],approvedVesselAliases:[alias]});
 assert.ok(r.items[0].reasons.includes('DRAFT_MATCH_AMBIGUOUS'));assert.equal(r.items[0].linkedDraftId,null);
});
test('lighter and Master both belong to the matching key',()=>{
 const drafts=incoming().items;
 for(const change of [{fields:{...drafts[0].fields,lighterVessel:'unmatched-source-vessel'}},{masterMobile:null}]){
  const r=qualifyEscortIntake(confirm(),{bindings:[admin],existingDrafts:[{...drafts[0],...change}],approvedVesselAliases:[alias]});assert.equal(r.items[0].linkedDraftId,null);
 }
});
test('wrong direction or account cannot authorize assignment',()=>{
 for(const change of [{direction:'INCOMING'},{accountId:'other-account'}]){
  const r=qualifyEscortIntake({...confirm(),...change},{bindings:[admin],existingDrafts:incoming().items,approvedVesselAliases:[alias]});assert.equal(r.items[0].classification,'REVIEW');
 }
});
test('exact native replay is recognized and changed replay rejected',()=>{
 const first=incoming(),existingOccurrences=[first.evidence];
 const repeat=qualifyEscortIntake(envelope('owner-original-order'),{bindings:[client],existingOccurrences});assert.equal(repeat.replay,true);assert.equal(repeat.items.length,0);
 assert.throws(()=>qualifyEscortIntake(envelope('owner-original-order',{text:body('owner-original-order')+'\nchanged'}),{bindings:[client],existingOccurrences}),/SOURCE_OCCURRENCE_CONFLICT/);
});
test('invalid and missing timestamps cannot fabricate a message or assignment date',()=>{
 for(const timestamp of [null,'2026-02-30T13:24:13Z','2026-10-03T25:24:13Z'])assert.ok(incoming('owner-original-order',{timestamp}).items[0].reasons.includes('SOURCE_TIMESTAMP_UNVERIFIED'));
 assert.equal(parseEscortDate('03/10/26',null).date,null);assert.equal(parseEscortDate('03/10/99','2026-10-03').date,null);
});
test('missing native source identity is rejected',()=>assert.throws(()=>incoming('owner-original-order',{nativeMessageId:''}),/NATIVE_SOURCE_ENVELOPE_REQUIRED/));
test('unavailable image/audio evidence stays reviewable',()=>{
 const r=incoming('owner-original-order',{media:[{type:'image',extraction:null},{type:'audio',extraction:null}]});assert.ok(r.items[0].reasons.includes('MEDIA_EXTRACTION_REQUIRES_REVIEW'));assert.equal(r.items[0].classification,'REVIEW');
});
test('expiry/deactivation and later binding edits preserve earlier identity snapshot',()=>{
 const b=structuredClone(client),r=incoming('owner-original-order',{},[b]),original=JSON.stringify(r.evidence.binding);
 b.active=false;b.version='2';assert.equal(JSON.stringify(r.evidence.binding),original);assert.equal(incoming('owner-original-order',{},[b]).evidence.binding,null);
 assert.equal(incoming('owner-original-order',{},[{...client,validTo:'2026-10-03'}]).evidence.binding,null);
});
test('real departure/boarding/unassigned discussions remain review items',()=>{
 for(const name of ['boarding-departure-context','master-departing-context','unassigned-question']){
  const r=incoming(name);assert.ok(r.items.every(d=>d.classification==='REVIEW'),name);assert.equal(r.evidence.text,body(name));
 }
});
test('qualification and link proposals never mutate their inputs or grant sending',()=>{
 const m=confirm(),drafts=incoming().items,options={bindings:[admin],existingDrafts:drafts,approvedVesselAliases:[alias]},before=JSON.stringify({m,options});
 const r=qualifyEscortIntake(m,options);assert.equal(JSON.stringify({m,options}),before);assert.equal(r.operationalWrites,false);assert.equal(r.sendAuthorized,false);
});
test('candidate dependency graph contains only the pinned pure helper and crypto',()=>{
 const candidate=readFileSync(new URL('../lib/escort-intake-candidate.mjs',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../lib/employee-program-validation.mjs',import.meta.url),'utf8');
 assert.deepEqual([...candidate.matchAll(/^import .* from '([^']+)';/gm)].map(m=>m[1]),['./employee-program-validation.mjs']);
 assert.deepEqual([...helper.matchAll(/^import .* from '([^']+)';/gm)].map(m=>m[1]),['node:crypto']);
 for(const code of [candidate,helper])assert.doesNotMatch(code,/createPool|database\.mjs|child_process|\bfetch\s*\(|\.query\s*\(|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b/);
});
}

if(suite==='regression'){
 // Envelopes here are retained native records. Binding decisions, Program IDs,
 // authorization and transport call results below are explicit unit controls;
 // they neither establish live identity grants nor prove any historical send.
 const binding=(m,role)=>({...client,id:'native-context-control-'+role,role,accountId:m.accountId,chatJid:m.chatJid,senderJid:m.senderJid,direction:m.direction,chatType:m.chatJid.endsWith('@g.us')?'group':'direct',resolvedPhone:normalizeEmployeeMobile(m.senderJid)});
 const cb=binding(nativeOrder,'client'),ab=binding(nativeConfirmation,'admin');
 const order=(opts={})=>qualifyEscortIntake(nativeOrder,{bindings:[cb],...opts});
 const assignment=(opts={})=>qualifyEscortIntake(nativeConfirmation,{bindings:[ab],existingDrafts:order().items,approvedVesselAliases:[alias],...opts});

 test('C1 native unknown identity with empty allowlist fails closed',()=>{
  const r=order({bindings:[]});assert.equal(r.items[0].classification,'REVIEW');assert.equal(r.evidence.binding,null);assert.equal(r.sendAuthorized,false);
 });
 test('C1 Client binding needs logical Client ID and verified phone resolution',()=>{
  for(const bad of [{...cb,clientId:''},{...cb,resolvedPhone:ab.resolvedPhone},{...cb,resolvedPhone:'unresolved-lid'}]){
   assert.equal(qualifyEscortIntake(nativeOrder,{bindings:[bad]}).evidence.binding,null);
  }
 });
 test('C1 same Client supports multiple independently scoped phone bindings',()=>{
  // Two observed phones used solely as registry controls; this does not assert
  // the Admin phone actually belongs to Hridoy or authorize either live actor.
  const second={...binding(nativeConfirmation,'client'),id:'second-phone-control'};
  assert.notEqual(cb.resolvedPhone,second.resolvedPhone);assert.equal(cb.clientId,second.clientId);
  assert.equal(order({bindings:[cb,second]}).evidence.binding.id,cb.id);
  assert.equal(qualifyEscortIntake(nativeConfirmation,{bindings:[cb,second]}).evidence.binding.id,second.id);
  assert.equal(qualifyEscortIntake(nativeConfirmation,{bindings:[cb,second]}).items[0].classification,'REVIEW');
 });
 test('C1 native identity evidence retained exactly without resolving display names',()=>{
  const e=order().evidence;
  for(const k of ['accountId','chatJid','senderJid','nativeMessageId','direction','text'])assert.equal(e[k],nativeOrder[k]);
  assert.equal(e.chatType,'direct');assert.equal(e.groupJid,null);
  assert.equal(e.sourceTimestamp,nativeOrder.timestamp);
  assert.equal(order({bindings:[{...cb,senderJid:'Escort Hridoy'}]}).evidence.binding,null);
 });
 test('C2 native HARVEST UNITY / HABIBULLAH creates one blank draft',()=>{
  const r=order(),d=r.items[0];assert.equal(r.items.length,1);assert.equal(d.classification,'ORDER_DRAFT');
  assert.equal(d.fields.motherVessel,'HARVEST UNITY');assert.equal(d.fields.lighterVessel,'HABIBULLAH');
  assert.equal(d.employeeMobile,null);assert.equal(d.assignmentState,'UNASSIGNED');assert.equal(d.clientDeliveryState,'NOT_SENT');
  const preview=buildEscortAdminDraft(d);assert.match(preview,/^Escort Name:\s*$/m);assert.match(preview,/^Escort Mobile:\s*$/m);assert.equal(r.operationalWrites,false);
 });
 test('C2 native multiple Lighters produce two separate unassigned drafts',()=>{
  const m=nativeDirect('Fahima-Sultana-and-Prince-Arafin','INCOMING');
  const r=qualifyEscortIntake(m,{bindings:[cb]});assert.equal(r.items.length,2);assert.equal(new Set(r.items.map(d=>d.id)).size,2);
  assert.ok(r.items.every(d=>d.classification==='ORDER_DRAFT'&&d.employeeMobile===null&&d.clientDeliveryState==='NOT_SENT'));
 });
 test('C2 missing Master and ambiguous Mother remain Review (derived negative text)',()=>{
  for(const text of [body('owner-pasted-order').replace(/^Master Mobile:.*\n/m,''),body('owner-pasted-order')+'\n'+body('Jobayer-Abdullah-6')]){
   const r=qualifyEscortIntake({...nativeOrder,text},{bindings:[cb]});assert.ok(r.items.every(d=>d.classification==='REVIEW'));
  }
 });
 test('C2 order occurrence replay cannot duplicate drafts',()=>{
  const first=order();const repeat=order({existingOccurrences:[first.evidence]});assert.equal(repeat.replay,true);assert.deepEqual(repeat.items,[]);
 });
 test('C3 unchanged pasted Assignment 03/10/26 (N) preserves full name and raw phone',()=>{
  const d=parseEscortOrder(body('owner-pasted-confirmation'),{messageDate:'2026-10-04'})[0];
  assert.equal(d.fields.escortName,'Md. Osman Goni');assert.equal(d.assignmentDate,'2026-10-03');assert.equal(d.shift,'N');
  assert.equal(d.fieldEvidence.escortMobile.raw,body('owner-pasted-confirmation').match(/^Escort Mobile:\s*(.*)$/m)[1]);assert.match(d.employeeMobile,/^\+880.*4400$/);
 });
 test('C3 unchanged native dotted/hyphenated name and explicit date survive linking',()=>{
  const d=assignment().items[0];assert.equal(d.fields.escortName,'Md.Osman- Goni');assert.equal(d.fields.motherVessel,'Harvest-Uinity');
  assert.equal(d.assignmentDate,'2026-10-03');assert.equal(d.evidence.messageDate,'2026-10-04');assert.equal(d.shift,'N');
  assert.equal(d.classification,'ADMIN_ASSIGNMENT_LINK_CANDIDATE');assert.equal(d.evidence.text,nativeConfirmation.text);
 });
 test('C3 D/N and invalid dates never use message time as duty date',()=>{
  assert.deepEqual(parseEscortDate('03/10/26 (D)','2026-10-04'),{date:'2026-10-03',shift:'D'});
  for(const raw of ['31/02/26 (N)','03/10/26 (N) unrelated','03/10/99 (N)'])assert.equal(parseEscortDate(raw,'2026-10-04').date,null);
  const text=nativeConfirmation.text.replace(/^03\/10\/26 \(N\)$/m,'');
  const r=qualifyEscortIntake({...nativeConfirmation,text},{bindings:[ab]});assert.equal(r.items[0].assignmentDate,null);assert.equal(r.items[0].classification,'REVIEW');
 });
 test('C3 Client cannot assign duty date or shift (derived negative text)',()=>{
  const r=qualifyEscortIntake({...nativeOrder,text:nativeOrder.text+'\nAssignment: 03/10/26 (N)'},{bindings:[cb]});assert.equal(r.items[0].classification,'REVIEW');
 });
 test('C4 original native direct order routes to draft; all group copies to Review',()=>{
  assert.equal(order().items[0].classification,'ORDER_DRAFT');
  for(const m of nativeFixtures['owner-original-order'].filter(m=>m.chatJid.endsWith('@g.us'))){
   const r=qualifyEscortIntake(m,{bindings:[binding(m,'group_evidence')]});assert.ok(r.items.every(d=>d.classification==='REVIEW'));
   assert.equal(r.evidence.groupJid,m.chatJid);assert.equal(r.evidence.senderJid,m.senderJid);assert.equal(r.cashPostingAuthorized,false);
  }
 });
 test('C4 direction, account, chat and sender mismatches cannot inherit authority',()=>{
  for(const b of [{...cb,direction:'OUTGOING'},{...cb,accountId:'wa-02'},{...cb,chatJid:nativeFixtures['owner-original-order'].find(m=>m.chatJid.endsWith('@g.us')).chatJid},{...cb,senderJid:ab.senderJid}])assert.equal(order({bindings:[b]}).items[0].classification,'REVIEW');
  assert.throws(()=>qualifyEscortIntake({...nativeOrder,direction:null},{bindings:[cb]}),/NATIVE_SOURCE_ENVELOPE_REQUIRED/);
 });
 test('C4 actual unresolved group sender remains supporting evidence',()=>{
  const m=nativeFixtures['owner-original-order'].find(m=>m.accountId==='wa-02');assert.equal(normalizeEmployeeMobile(m.senderJid),null);
  const r=qualifyEscortIntake(m,{bindings:[binding(m,'client')]});assert.equal(r.evidence.binding,null);assert.equal(r.items[0].classification,'REVIEW');
 });
 test('C4 forwarded headers and financial discussion cannot authorize new orders',()=>{
  const r=qualifyEscortIntake({...nativeOrder,text:'Forwarded from Admin\nRelease Slip\nFood and conveyance bill\n'+nativeOrder.text},{bindings:[]});
  assert.equal(r.items[0].classification,'REVIEW');assert.deepEqual(r.items[0].reviewDomains,['OPERATIONS','ACCOUNTS','RELEASE']);assert.equal(r.cashPostingAuthorized,false);
 });
 test('C4 all real departure, boarding and unassigned discussions remain Review',()=>{
  for(const name of ['boarding-departure-context','master-departing-context','unassigned-question'])for(const m of nativeFixtures[name]){
   const r=qualifyEscortIntake(m,{bindings:[]});assert.ok(r.items.every(d=>d.classification==='REVIEW'));assert.equal(r.evidence.text,body(name));
  }
 });
 test('C5 equal-score Programs explicitly return AMBIGUOUS — ADMIN REVIEW REQUIRED',()=>{
  const r=selectEscortDraftMatch([{id:'program-control-one',confidence:100},{id:'program-control-two',confidence:100}]);
  assert.equal(r.state,'AMBIGUOUS — ADMIN REVIEW REQUIRED');assert.equal(r.linkedDraftId,null);
 });
 test('C5 real confirmation with two matching draft controls cannot choose first',()=>{
  const d=order().items[0];const r=assignment({existingDrafts:[d,{...d,id:sha('second-program-control')}]});
  assert.equal(r.items[0].matchState,'AMBIGUOUS — ADMIN REVIEW REQUIRED');assert.equal(r.items[0].linkedDraftId,null);assert.equal(r.items[0].assignmentProposal,null);
 });
 test('C5 identical draft references collapse but conflicting same-ID records do not',()=>{
  const d=order().items[0];assert.equal(assignment({existingDrafts:[d,structuredClone(d)]}).items[0].linkedDraftId,d.id);
  assert.equal(selectEscortDraftMatch([{id:d.id,confidence:1},{id:d.id,confidence:2}]).state,'AMBIGUOUS — ADMIN REVIEW REQUIRED');
 });
 test('C5 repeated assignment produces no duplicate Program or Assignment proposal',()=>{
  const first=assignment().items[0],p=first.assignmentProposal;assert.ok(p);assert.equal(p.linkedDraftId,order().items[0].id);
  const r=assignment({existingAssignments:[p]});assert.equal(r.items[0].classification,'ADMIN_ASSIGNMENT_REPLAY');assert.equal(r.items[0].assignmentProposal,null);assert.equal(r.items[0].clientDeliveryState,'NOT_SENT');assert.equal(r.operationalWrites,false);
 });
 test('C5 assignment conflicts including inconsistent operation ID require Review',()=>{
  const p=assignment().items[0].assignmentProposal;
  for(const change of [{shift:'D'},{assignmentOperationId:sha('different-operation')}]){
   const r=assignment({existingAssignments:[{...p,...change}]});assert.equal(r.items[0].classification,'REVIEW');assert.equal(r.items[0].assignmentProposal,null);
  }
 });
 test('C5 repeated confirmation blocks in one envelope produce only one assignment proposal',()=>{
  const r=qualifyEscortIntake({...nativeConfirmation,text:nativeConfirmation.text+'\n'+nativeConfirmation.text},{bindings:[ab],existingDrafts:order().items,approvedVesselAliases:[alias]});
  assert.equal(r.items.length,2);assert.equal(r.items.filter(d=>d.assignmentProposal).length,1);assert.equal(r.items[1].classification,'ADMIN_ASSIGNMENT_REPLAY');assert.equal(r.items[1].assignmentState,'ALREADY_PROPOSED');
 });
 const intent={assignmentOperationId:assignment().items[0].assignmentProposal.assignmentOperationId,accountId:nativeConfirmation.accountId,chatJid:nativeConfirmation.chatJid,senderJid:nativeConfirmation.senderJid,callId:'offline-transport-call-control',payloadSha:sha(nativeConfirmation.text)};
 const authorization={...ab,...intent,capability:'messages.send',purpose:'escort-client-confirmation'};
 const accepted={httpStatus:200,body:{success:true},evidence:{...intent,source:'whatsapp_transport_call_result',authoritative:true,direction:'OUTGOING',nativeMessageId:nativeConfirmation.nativeMessageId,timestamp:nativeConfirmation.timestamp}};
 const send=(outcome=accepted,auth=authorization)=>qualifyEscortSendOutcome(intent,outcome,{authorization:auth});
 test('C6 HTTP 200 with success:false is rejected, never confirmed sent',()=>{
  const r=send({...accepted,body:{success:false}});assert.equal(r.confirmedSent,false);assert.equal(r.clientDeliveryState,'SEND_REJECTED');
 });
 test('C6 HTTP 200 alone and success:true without evidence remain unconfirmed',()=>{
  for(const outcome of [{httpStatus:200},{httpStatus:200,body:{success:true}},{...accepted,evidence:{...accepted.evidence,source:'native_history'}}])assert.equal(send(outcome).confirmedSent,false);
 });
 test('C6 timeout, rejection and non-200 response cannot confirm sending',()=>{
  for(const outcome of [{...accepted,timeout:true},{...accepted,error:'offline-timeout'},{...accepted,rejected:true},{...accepted,httpStatus:403}])assert.equal(send(outcome).confirmedSent,false);
 });
 test('C6 send evidence needs exact request, recipient, account and assignment correlation',()=>{
  for(const [k,v] of Object.entries({callId:'wrong-call',chatJid:nativeFixtures['owner-original-order'].find(m=>m.chatJid.endsWith('@g.us')).chatJid,accountId:'wa-02',senderJid:cb.senderJid,assignmentOperationId:sha('wrong-assignment'),payloadSha:sha('wrong-body'),direction:'INCOMING',nativeMessageId:'',timestamp:null,authoritative:false}))assert.equal(send({...accepted,evidence:{...accepted.evidence,[k]:v}}).confirmedSent,false,k);
  assert.equal(send({...accepted,evidence:{...accepted.evidence,nativeMessageId:'bridge1:recipient'}}).confirmedSent,false);
 });
 test('C6 send acceptance requires separately scoped authorization',()=>{
  for(const auth of [null,{...authorization,active:false},{...authorization,role:'client'},{...authorization,validTo:'2026-10-04'},{...authorization,purpose:'cash-posting'},{...authorization,payloadSha:sha('other-text')}])assert.equal(send(accepted,auth).confirmedSent,false);
 });
 test('C6 valid mocked transport contract accepts send without proving receipt or changing assignment',()=>{
  const before=canonical({intent,accepted,authorization});const r=send();assert.equal(r.confirmedSent,true);assert.equal(r.clientDeliveryState,'SEND_ACCEPTED');assert.equal(r.recipientDeliveryVerified,false);
  assert.equal(r.operationalWrites,false);assert.equal(r.sendAuthorized,false);assert.equal(canonical({intent,accepted,authorization}),before);assert.equal(assignment().items[0].clientDeliveryState,'NOT_SENT');
 });
}
