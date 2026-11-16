/** Offline only: consumes a separately read-only collected catalog; never opens a DB. */
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {assertChecksum,assertSchema,buildManifest,canonical,sha,occurrence,identityGroups,validDate,VERSION,extractEscortMessages,reconcileEscortIdentities,programWindowCandidates,priorAssignmentClosureReviews,releaseCandidate,ghatDutyCandidates,normalizeEscortMobile,reconcileEmployeeMobileRecords,classifyProgramLifecycle,lifecycleEventTypes,verifiedRoleEvidence,verifiedMessageRole} from '../lib/employee-program-validation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
export function reconcileBusinessRules(documents,spec,occurrences,asOf,mediaInventory=[],policy=null){
 const snapshot=documents['conversation-snapshot.json'],messages=[],accountMessages=[];
 const exportMeta=new Map(snapshot.summary.files.map(f=>[f.key,f]));
 snapshot.chunks.forEach((chunk,i)=>{
  if(!['messages','accountMessages'].includes(chunk.kind))return;
  assertChecksum(chunk.payload,chunk.contentHash);
  JSON.parse(chunk.payload).forEach((m,j)=>{
   const meta=exportMeta.get(m.chatKey);
   const o=occurrence('conversation-snapshot.json',spec.sources['conversation-snapshot.json'].sha256,'/chunks/'+i+'/payload','/'+j,m,sha(chunk.payload));
   const reference={occurrenceId:o.id,messageId:m.id,file:o.file,fileSha:o.fileSha,documentPointer:o.documentPointer,decodedPointer:o.decodedPointer,payloadSha:o.payloadSha,recordSha:o.recordSha,evidenceHref:spec.sources[o.file].path,sourceExportFile:meta?.file??null,sourceExportSha:meta?.sha256??null,libraryFileId:meta?.libraryFileId??null,sourceLine:m.line,messageDate:m.messageDate,messageTime:m.time,mediaNames:[...m.mediaNames],nativeHref:null};
   (chunk.kind==='messages'?messages:accountMessages).push({...m,reference});
  });
 });
 for(const [selector,expected] of Object.entries(spec.ownerBusinessRules.contextCounts))if((selector==='messages'?messages:accountMessages).length!==expected)throw Error('MESSAGE_CONTEXT_COUNT_CHANGED');
 const allMessages=new Map([...messages,...accountMessages].map(m=>[m.id,m]));
 if(allMessages.size!==messages.length+accountMessages.length)throw Error('MESSAGE_REFERENCE_COLLISION');
 const roleBindings=spec.ownerBusinessRules.messageRoleBindings;
 if(!Array.isArray(roleBindings))throw Error('MESSAGE_ROLE_BINDINGS_REQUIRED');
 const events=extractEscortMessages(messages,{roleBindings,asOf});
 for(const e of events){
  const assertions=occurrences.filter(o=>o.selector==='programEvidence'&&o.raw.details?.sourceMessageId===e.messageId&&normalizeEscortMobile(o.raw.escortMobile)===e.escortKey).map(o=>({occurrenceId:o.id,sourceId:o.sourceId,status:o.raw.status}));
  e.historicalStatusAssertions=assertions;
  const statuses=[...new Set(assertions.map(a=>a.status))];e.historicalStatus=statuses.length===1?statuses[0]:null;
  if(statuses.length>1)e.reasons.push('HISTORICAL_STATUS_ASSERTIONS_REVIEW');
 }
 const cash=occurrences.filter(o=>o.selector==='accountsCash');
 const proof=documents['accounts-snapshot.json'].summary.identityProof;
 const sourceRoleEstablished=proof.confirmed===true&&proof.accountantContactConfirmed===true&&proof.conversationType==='direct'&&proof.sourceSha256===exportMeta.get('mamun')?.sha256;
 if(!sourceRoleEstablished)throw Error('EMPLOYEE_LEDGER_SOURCE_ROLE_ATTESTATION');
 const ledgerRecords=cash.map(o=>({id:o.sourceId,sourceOccurrenceId:o.id,employee_id:o.raw.employeePhone,employee_name:o.raw.name,sourceRole:'ledger_employee_mobile',sourceRoleEstablished:['single_number_after_name','two_number_explicit_id','two_number_before_name','cash_missing_employee_id'].includes(o.raw.identityRule)&&o.raw.identityVerified===true&&allMessages.get(o.raw.sourceId)?.chatKey==='mamun',reference:{occurrenceId:o.id,file:o.file,fileSha:o.fileSha,documentPointer:o.documentPointer,decodedPointer:o.decodedPointer,recordSha:o.recordSha,originalEmployeeField:'employeePhone',originalEmployeeValue:o.raw.employeePhone,identityRule:o.raw.identityRule,sourceLine:o.raw.sourceLine,message:allMessages.get(o.raw.sourceId)?.reference??null}}));
 if(ledgerRecords.some(r=>!r.reference.message))throw Error('EMPLOYEE_ORIGINAL_MESSAGE_REFERENCE_MISSING');
 const ledgerIdentity=reconcileEmployeeMobileRecords(ledgerRecords);
 const identity=reconcileEscortIdentities(events,{ledgerEmployees:ledgerIdentity.employees}),pairs=programWindowCandidates(events),closures=priorAssignmentClosureReviews(events);
 const releaseMessages=messages.map(m=>releaseCandidate({...m,role:verifiedMessageRole(m,roleBindings),roleEvidence:verifiedRoleEvidence(m,roleBindings)},{mediaAvailable:m.mediaNames.some(name=>mediaInventory.some(item=>item.name===name))})).filter(Boolean);
 const payments=cash.map(o=>({...o.raw,role:'owner_payment_instruction_sender',roleEvidence:{authority:'owner-confirmed source export',sourceExportSha:proof.sourceSha256,identityRules:o.raw.identityRule,employeeFieldRole:'ledger_employee_mobile',originalSender:allMessages.get(o.raw.sourceId)?.sender??null,receiverRole:'owner-confirmed designated accountant',transferVerified:false},reference:{occurrenceId:o.id,file:o.file,fileSha:o.fileSha,documentPointer:o.documentPointer,decodedPointer:o.decodedPointer,recordSha:o.recordSha,sourceLine:o.raw.sourceLine,message:allMessages.get(o.raw.sourceId)?.reference??null}}));
 if(payments.some(p=>!p.reference.message))throw Error('PAYMENT_SOURCE_REFERENCE_MISSING');
 const lifecycle=classifyProgramLifecycle(messages,{roleBindings,asOf});
 const ghat=ghatDutyCandidates(payments,{currencyContext:'BDT',asOf,priorEvents:lifecycle.events});
 if(policy&&(canonical(policy.eventTypeAdapter)!==canonical(lifecycleEventTypes)||spec.ownerBusinessRules.lifecycleRuleIds.some(id=>!policy.rules.some(r=>r.id===id&&r.status==='ACTIVE'))))throw Error('LIFECYCLE_POLICY_EVENT_ADAPTER');
 const baseGroups=identityGroups(cash.map(o=>o.raw));
 const classificationCounts={DRAFT:0,ADMIN_CONFIRMATION_CANDIDATE:0,REVIEW:0};for(const e of events)classificationCounts[e.classification]++;
 const reasonPairs={};for(const p of pairs)for(const reason of p.reasons)reasonPairs[reason]=(reasonPairs[reason]??0)+1;
 return {version:VERSION,rulesSha:sha(canonical(spec.ownerBusinessRules)),lifecycle,ledgerIdentity,identity,programEvents:events,programPairs:pairs,closureReviews:closures,releaseReviews:releaseMessages,ghat,summary:{messageContextCount:messages.length+accountMessages.length,maritimeMessageCount:messages.length,accountsMessageCount:accountMessages.length,explicitFieldEventCount:events.length,validEscortFieldEvents:events.filter(e=>e.escortKey&&e.fieldEvidence.escortMobile&&!e.reasons.includes('REPEATED_FIELD_REQUIRES_REVIEW')).length,completeConfirmationFieldEvents:events.filter(e=>e.complete).length,programClassifications:classificationCounts,operationalMatchingKeyGroups:identity.identities.length,nameAliasGroups:identity.sameMobileMultipleNameAliasGroups,sameNameDifferentMobileGroups:identity.sameNameMultipleMobileGroups,ownershipReviewGroups:identity.ownershipReviewGroups,legacyPaymentLabelGroups:{...baseGroups,multiNameReclassified:'SAME_EMPLOYEE_MOBILE_NAME_ALIASES',multiPhoneReclassified:'SEPARATE_EMPLOYEE_MOBILES_UNLESS_OWNER_APPROVED_LINK',ledgerMobileClassification:ledgerIdentity.summary,optionalEscortGroupsMatchedToLedger:identity.identities.filter(i=>ledgerIdentity.employees.some(e=>e.internalId===i.internalId)).length,explicitEscortFieldAccountsRows:payments.filter(p=>/^\s*Escort Mobile\s*:/im.test(allMessages.get(p.sourceId)?.body??'')).length},programCandidatePairCount:pairs.length,programPairReasonCounts:reasonPairs,priorAssignmentClosureReviews:closures.length,releaseCandidateMessages:releaseMessages.length,releaseVerified:releaseMessages.filter(r=>r.classification==='RELEASED_CANDIDATE').length,availableSourceMediaBytes:mediaInventory.reduce((n,item)=>n+item.bytes,0),nativeWhatsAppMessageLinks:0,localArchivedMessageReferences:allMessages.size,BDT200EvidenceRows:ghat.evidence.length,ghatCandidateLabelGroups:ghat.candidates.length,highPriorityGhatLabelGroups:ghat.candidates.filter(c=>c.classification==='HIGH_PRIORITY_GHAT_REVIEW').length,ghatVerifiedTransfers:ghat.evidence.filter(e=>e.evidenceType==='VERIFIED_TRANSFER').length,automaticBusinessWrites:0}};
}
export function dryRun({catalogFrames,evidenceDirectory='/var/lib/vps/al-rifai/evidence',asOf,approvals=[]}={}){
 if(!validDate(asOf))throw Error('EXPLICIT_AS_OF_REQUIRED');
 if(approvals.length)throw Error('EXTERNAL_APPROVAL_INGESTION_NOT_ENABLED');
 const baseline=read('docs/employee-program-baseline.json'),spec=read('docs/employee-program-mapping-v1.json'),checks=read('docs/evidence-checksums.json');
 if(spec.version!==VERSION)throw Error('MAPPING_VERSION');
 const policyBytes=readFileSync(join(root,spec.ownerRuleRegister.path));assertChecksum(policyBytes,spec.ownerRuleRegister.sha256);
 const policy=JSON.parse(policyBytes);if(policy.version!==VERSION||policy.productionExecutionAuthorized!==false||policy.rules.filter(r=>r.status==='ACTIVE'&&/^EMP-00[1-6]$/.test(r.id)).length!==6)throw Error('OWNER_RULE_REGISTER_MISMATCH');
 if(!Array.isArray(catalogFrames))throw Error('LIVE_CATALOG_REQUIRED');
 const byLabel=new Map(catalogFrames.map(f=>[f.label,f.rows]));
 if(byLabel.size!==catalogFrames.length)throw Error('CATALOG_DUPLICATE_FRAME');
 const id=byLabel.get('identity')?.[0];
 if(id?.database!=='alrifai'||id?.readOnly!=='on'||id?.cluster!==baseline.identity.cluster)throw Error('CATALOG_IDENTITY');
 const catalog=Object.fromEntries(Object.keys(baseline.catalog).map(k=>[k,byLabel.get('catalog:'+k)]));assertSchema(catalog,baseline.catalogSha256);
 const migrations=byLabel.get('table:alrifai_schema_migrations');
 if(canonical(migrations)!==canonical(baseline.migrations))throw Error('MIGRATION_LEDGER_MISMATCH');
 for(const r of migrations)assertChecksum(readFileSync(join(root,'db/migrations',r.id)),r.sha256);
 for(const [table,count] of Object.entries(baseline.counts))if(byLabel.get('table:'+table)?.length!==count)throw Error('TARGET_STATE_DRIFT');
 const snapshots=byLabel.get('table:site_source_snapshots');
 if(sha(canonical(snapshots))!==baseline.snapshotSha256)throw Error('SNAPSHOT_FINGERPRINT_MISMATCH');
 const documents={},sourceChecksums={};
 for(const [name,c] of Object.entries(checks)){const bytes=readFileSync(join(evidenceDirectory,name));assertChecksum(bytes,c.sha256);if(bytes.length!==c.bytes)throw Error('SOURCE_SIZE_MISMATCH');sourceChecksums[name]=c.sha256;if(name.endsWith('.json'))documents[name]=JSON.parse(bytes);}
 const occurrences=[],accounts=[];
 for(const [file,s] of Object.entries(spec.sources)){
  const doc=documents[file];
  for(const [selector,selection] of Object.entries(s.selectors)){
   const add=(r,documentPointer,decodedPointer,payloadSha)=>{
    const domain=selector==='accountsCash'?'employee':['links','conflicts','programEvidence'].includes(selector)||r?.details?.recordKind==='Vessel reference'?'reference':'program';
    occurrences.push({...occurrence(file,s.sha256,documentPointer,decodedPointer,r,payloadSha),domain,selector});if(selector==='accountsCash')accounts.push(r);
   };
   if(doc.chunks){doc.chunks.forEach((c,i)=>{if(c.kind!==selector)return;assertChecksum(c.payload,c.contentHash);const records=JSON.parse(c.payload);if(!Array.isArray(records))throw Error('SOURCE_ARRAY');records.forEach((r,j)=>add(r,'/chunks/'+i+'/payload','/'+j,sha(c.payload)));});}
   else{const records=Array.isArray(doc)?doc:doc[selector];if(!Array.isArray(records))throw Error('SOURCE_ARRAY');records.forEach((r,i)=>add(r,Array.isArray(doc)?'/'+i:'/'+selector+'/'+i,null,null));}
   if(occurrences.filter(o=>o.file===file&&o.selector===selector).length!==selection.count)throw Error('SOURCE_COUNT_CHANGED');
  }
 }
 const referencedMedia=new Set(documents['conversation-snapshot.json'].chunks.filter(c=>['messages','accountMessages'].includes(c.kind)).flatMap(c=>JSON.parse(c.payload).flatMap(m=>m.mediaNames)));
 const mediaInventory=readdirSync(evidenceDirectory).filter(name=>referencedMedia.has(name)).flatMap(name=>{const stat=lstatSync(join(evidenceDirectory,name));return stat.isFile()?[{name,bytes:stat.size}]:[];});
 const businessRules=reconcileBusinessRules(documents,spec,occurrences,asOf,mediaInventory,policy);
 const manifest=buildManifest(occurrences,{spec,asOf,approvals,registry:{},schemaSha:baseline.catalogSha256,mappingSha:sha(canonical(spec)),sourceChecksums,employeeMobileResult:businessRules.ledgerIdentity});
 const current=occurrences.filter(o=>o.file==='conversation-snapshot.json'&&o.selector==='programs');
 const links=occurrences.filter(o=>o.selector==='links');const currentIds=new Set(current.map(o=>o.sourceId));
 const report={...manifest,businessRules,observations:{employeeCandidates:accounts.length,...identityGroups(accounts),currentPrograms:current.length,currentConflictedPrograms:current.filter(o=>o.raw.conflicts.length).length,aliasEdges:links.length,orphanAliasTargets:links.filter(o=>!currentIds.has(o.raw.id)).length,olderOccurrences:occurrences.filter(o=>['chat-archive.json','operations.json','recovered-programs.json'].includes(o.file)).length,financialPromotion:0,sourceOccurrenceCount:occurrences.length,missingTargetTables:['ep_employees','ep_employee_history','ep_vessels','ep_vessel_aliases','ep_programs','ep_program_vessels','ep_assignment_events','ep_source_occurrences','ep_review_decisions','ep_source_bindings','ep_import_batches'],missingTargetTableCount:11},writes:0,liveConnection:false};
 return {...report,manifestSha:sha(canonical({...report,manifestSha:undefined}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--catalog'||args[2]!=='--as-of')throw Error('USAGE: --catalog PRIVATE_READ_ONLY_FRAMES --as-of YYYY-MM-DD');const catalogFrames=readFileSync(args[1],'utf8').trim().split('\n').map(JSON.parse);console.log(canonical(dryRun({catalogFrames,asOf:args[3]})));}
 catch(e){console.error(JSON.stringify({status:'BLOCKED',reason:e.message}));process.exitCode=1;}
}
