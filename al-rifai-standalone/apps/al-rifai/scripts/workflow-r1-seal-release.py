"""Seal current repair evidence locally, retaining historical candidate receipts.
No Docker, database, activation, import or build is invoked by this script.
"""
from pathlib import Path
from datetime import datetime,timezone
import difflib,hashlib,json,tarfile

root=Path('/opt/vps');app=root/'apps/al-rifai';data=app/'data'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
historical=data/'workflow-r1-pre-repair-release.json'
old=json.loads(historical.read_text());m=json.loads(historical.read_text())
execution=json.loads((data/'workflow-r1-repair-result.json').read_text())
state=json.loads((data/'workflow-r1-current-state.json').read_text())
browser=json.loads((data/'workflow-r1-live-acceptance.json').read_text())
client=json.loads((data/'workflow-r1-live-client.json').read_text())
boundary=json.loads((data/'workflow-r1-runtime-boundary.json').read_text())
reader=json.loads((data/'workflow-r1-reader-contract.json').read_text())
review=json.loads((data/'workflow-r1-repair-review.json').read_text())
assert execution['status']=='REPAIR_ACTIVE_NOT_ACCEPTED' and len(state['database']['ledger'])==14
assert all(state['invariants'].values()) and state['confirmedPrograms']==state['historicallyAuthorizedConfirmations']==0
assert browser['browserStatus']=='LIVE_DESKTOP_MOBILE_LAYOUT_PASS' and browser['mockedApi'] is False
assert boundary['status']=='RUNTIME_BOUNDARY_PASS' and reader['status']=='CONTRACT_PASS'
assert client['replay']['result']['extracted']==0
assert (app/'db/migrations/0013_program_command_permissions.sql').read_bytes()==(data/'R1_PROGRAM_PERMISSION_CORRECTION.sql').read_bytes()
assert sha((app/'db/migrations/0013_program_command_permissions.sql').read_bytes())==review['sha256']
assert sha((data/'workflow-r1-repair-transaction.sql').read_bytes())==review['transactionSha256']
for name,digest in old['artifacts'].items():
 assert sha((data/name).read_bytes())==digest, 'HISTORICAL_ARTIFACT_CHANGED: '+name
for name,count in [('workflow-r1-followup-tests.tap',6),('workflow-r1-followup-business-tests.tap',12)]:
 log=(data/name).read_text();assert '# pass '+str(count)+'\n' in log and '# fail 0\n' in log
assert (data/'workflow-r1-followup-typecheck.log').stat().st_size==0

before={}
for archive in ['workflow-r1-repair-docs-before.tar.gz','workflow-r1-followup-source-before.tar.gz']:
 with tarfile.open(data/archive) as t:
  for member in t.getmembers():
   if member.isfile():before[member.name]=t.extractfile(member).read()
new_files=[app/'db/migrations/0013_program_command_permissions.sql',*app.joinpath('scripts').glob('workflow-r1-*.py'),app/'scripts/workflow-repair-production.py',app/'tests/workflow-r1-repair.mjs']
repair_paths=set(before)|{str(p.relative_to(root)) for p in new_files}
patch=[];repair_changes=[]
for name in sorted(repair_paths):
 raw=(root/name).read_bytes();previous=before.get(name,b'')
 if raw==previous:continue
 repair_changes.append({'path':name,'beforeSha256':sha(previous) if name in before else None,'sha256':sha(raw),'bytes':len(raw)})
 patch.extend(difflib.unified_diff(previous.decode().splitlines(True),raw.decode().splitlines(True),fromfile='before-repair/'+name,tofile='current/'+name))
(data/'workflow-r1-repair.patch').write_text(''.join(patch))
pending=[name for name in before if name.endswith(('business-register.ts','history-extractions.ts','history-policy.mjs','duty-calculation.mjs','conversation-subjects.ts')) and (root/name).read_bytes()!=before[name]]
m['status']='R1_REPAIR_ACTIVE_NOT_ACCEPTED'
m['updatedAt']=datetime.now(timezone.utc).isoformat()
m['historicalCandidate']={'manifestPath':'data/'+historical.name,'manifestSha256':sha(historical.read_bytes()),'appImage':old['images']['app'],'patchPath':'data/workflow.patch','patchSha256':old['artifacts']['workflow.patch'],'sourceChanges':old['sourceChanges'],'verification':old['verification'],'scope':'Original candidate build/synthetic browser and rollback rehearsal evidence. Preserved; not current operational acceptance.'}
m['sourceChanges']=repair_changes
# check-only on the original rehearsal still needs its unchanged runner entry.
runner_entry=next(x for x in old['sourceChanges'] if x['path']=='apps/al-rifai/scripts/workflow-sql-rehearsal.py')
assert sha((root/runner_entry['path']).read_bytes())==runner_entry['sha256']
m['sourceChanges'].append(runner_entry)
m['currentSourceIsDeployedImage']=False
m['pendingSourceChanges']={'paths':pending,'status':'TESTED_NOT_BUILT_NOT_DEPLOYED','diff':'data/workflow-r1-repair.patch','typecheck':'PASS','targetedRegressions':'PASS_6','existingBusinessRegressions':'PASS_12','actualRuntimeReadQuery':'PASS_READ_ONLY','limits':'R2 media/OCR/predecessor release, R3 verified feeders/send-result/concurrency and R4 full inventory remain incomplete.'}
m['migration']['applied']=True
m['migrations']=[m['migration'],{'path':'db/migrations/0013_program_command_permissions.sql','sha256':review['sha256'],'applied':True,'ledgerEntriesAfter':14,'insertColumns':review['insertColumns'],'updateColumns':review['updateColumns'],'transactionPath':'data/workflow-r1-repair-transaction.sql','transactionSha256':review['transactionSha256']}]
m['deployedImages']={name:v['image'] for name,v in state['runtime'].items()}
m['runtimeEvidence']='workflow-r1-current-state.json'
m['verification'].update(sql='0012_AND_EXACT_COLUMN_0013_APPLIED_RECEIPTED',browser='LIVE_DESKTOP_MOBILE_LAYOUT_PASS_44',liveBusinessAcceptance='NOT_ACCEPTED_NO_HISTORICALLY_AUTHORIZED_CONFIRMATION',runtimeProgramBoundary='ACTUAL_RUNTIME_ROLE_PASS_ROLLED_BACK_SQL_FIXTURE',readerCompatibility='ACTUAL_RUNTIME_CONTRACT_51_V1_31_V2_PASS_AND_LIVE_MIXED_PAGE_PASS',physicalPhone='NOT_OBSERVED',financialConstraintsAndConcurrency='HISTORICAL_SINGLE_TRANSACTION_PASS_CONCURRENT_SESSIONS_NOT_RUN',build='HISTORICAL_CANDIDATE_PASS_FOLLOWUP_NOT_BUILT')
m['r1Repair']={'status':'ACTIVE_NOT_ACCEPTED','ownerApproval':'Exact prepared column-scoped correction/receipt and SAME candidate app reactivation explicitly approved in latest user request. CLI flag not approval.','execution':'data/workflow-r1-repair-result.json','review':'data/workflow-r1-repair-review.json','financialPosting':'OFF','counts':state['database']['counts'],'assignments':state['provenance']['assignments'],'confirmedPrograms':0,'historicallyAuthorizedConfirmations':0,'clientRange':{'uniqueMessagesScanned':30,'sourceFacts':7,'replayNewFacts':0,'coverageComplete':False},'cashPreserved':state['invariants']['allOriginalCashInstructionsUnchanged'],'browser':'data/workflow-r1-live-acceptance.json','acceptanceBlockers':['Existing dated Client/Admin authority proof reference not yet supplied; all seven admissions historical=false.','No real matching historically authorized confirmation or assignment.','Pending source warning projection correction has not been built/deployed.','Physical-phone acceptance not observed.'],'existingEvidenceReference':'OWNER_WILL_SUPPLY_NOT_YET_PROVIDED','postgresAndWhatsAppUnchanged':True,'oldImageOperationalRollbackSupported':False}
m['rollback']={'schema':'Retain additive 0012/0013 schema, grants, receipts and all source facts; no destructive rollback or fabricated revocation.','compatibleReaderImage':old['images']['app'],'oldImage':'sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2','oldImageLimitation':'Emergency login only; v1-only reader fails retained v2. Not an accepted operational rollback.','newImageRule':'Any different image requires exact source diff, pin and separate approval before deployment.','unrelatedServices':'Preserve both WhatsApp and PostgreSQL identities/start/restarts.'}
m['nextApproval']={'action':'AWAIT_EXISTING_DATED_ROLE_EVIDENCE_REFERENCE','productionActionRequested':False,'initialAndRepairActivationComplete':True,'rerunActivationScripts':False,'financialPostingAuthorized':False,'additionalGrantsAuthorized':False,'whatsAppPostgresRestartAuthorized':False}
m['remaining']=['R1 genuine source-authorized draft/confirmation acceptance and dated role evidence; no manufactured bindings','Pending source follow-up image build/review before any new deployment','R2 exact group/native/socket lifecycle plus actual media/OCR and predecessor-assignment release','R3 verified effective policy/attendance feeders and attributable Admin send-success ingestion','Explicitly approved concurrent-session financial acceptance before any financial activation','R4 permitted saved/unsaved/unregistered contact inventory and physical-device acceptance']
for path in sorted(data.glob('workflow-r1-*')):
 if path.is_file():m['artifacts'][path.name]=sha(path.read_bytes())
m['artifacts']['R1_PROGRAM_PERMISSION_CORRECTION.sql']=sha((data/'R1_PROGRAM_PERMISSION_CORRECTION.sql').read_bytes())
target=data/'workflow-release.json';target.write_text(json.dumps(m,indent=2)+'\n')
digest=sha(target.read_bytes());(data/'workflow-release.sha256').write_text(digest+'  workflow-release.json\n')
print(json.dumps({'status':m['status'],'manifestSha256':digest,'ledgerEntries':14,'repairSourceFiles':len(repair_changes),'pendingSourceFiles':len(pending),'artifacts':len(m['artifacts']),'historicalArtifactsPreserved':len(old['artifacts'])}))
