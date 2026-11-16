from pathlib import Path
import hashlib,json,tarfile,difflib,importlib.util
r=Path('/opt/vps');a=r/'apps/al-rifai';target=a/'data/workflow-release.json';m=json.loads(target.read_text());old={}
if (a/'data/workflow-r1-repair-result.json').exists():
 raise SystemExit('Historical candidate generator is sealed after R1 activation. Use scripts/workflow-r1-seal-release.py; do not reset the deployed ledger/acceptance status.')
spec=importlib.util.spec_from_file_location('workflow_rehearsal_generator',a/'scripts/workflow-sql-rehearsal.py')
generator=importlib.util.module_from_spec(spec);spec.loader.exec_module(generator)
migration_bytes=(a/m['migration']['path']).read_bytes()
if (a/'data/workflow-rehearsal.sql').read_bytes()!=generator.build_sql(migration_bytes.decode()).encode():
 raise ValueError('REHEARSAL_SQL_GENERATOR_MISMATCH')
with tarfile.open(a/'data/workflow-before.tar.gz') as t:
 for x in t.getmembers():
  if x.isfile():old[x.name]=t.extractfile(x).read()
for name,marker in {
 'services/whatsapp/source/README.md':'\nAL-RIFA’I workflow source update (15 October 2026)',
 'services/whatsapp/source/AGENTS.md':'\n`ALRIFAI_MCP_SOCKET_ACL=uid10001`',
 'services/whatsapp/source/.env.example':'\n# Optional dedicated AL-RIFA',
 'services/whatsapp/source/whatsapp-mcp-server/tests/test_broker_configuration.py':'\n\ndef test_app_socket_acl_reapplied_on_new_inode'
}.items():old[name]=(r/name).read_text().split(marker)[0].encode()
paths={x['path'] for x in m['sourceChanges']}|{'apps/al-rifai/scripts/workflow-manifest.py','apps/al-rifai/tests/test_workflow_rehearsal.py'};changes=[];patch=[]
for name in sorted(paths):
 raw=(r/name).read_bytes();previous=old.get(name,b'')
 if raw==previous:continue
 changes.append({'path':name,'beforeSha256':hashlib.sha256(previous).hexdigest() if name in old else None,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
 patch.extend(difflib.unified_diff(previous.decode().splitlines(True),raw.decode().splitlines(True),fromfile='a/'+name,tofile='b/'+name))
(a/'data/workflow.patch').write_text(''.join(patch));m['sourceChanges']=changes
m['migration']['sha256']=hashlib.sha256((a/m['migration']['path']).read_bytes()).hexdigest()
m['images']=json.load(open(a/'data/workflow-images.json'))['images'];m['nextApproval']['command']='python3 /opt/vps/apps/al-rifai/scripts/workflow-sql-rehearsal.py --reviewed-sha256 '+m['migration']['sha256']
m['verification']['browserImage']=m['images']['app'];m['verification']['sourceRegisterInitialFailure']='Required fixture mount absent; corrected invocation PASS in workflow-source-register.tap'
artifacts=['workflow.patch','workflow-app.compose.yaml','workflow-wa01.compose.yaml','workflow-rehearsal.sql','workflow-images.json','workflow-scope-plan.json','workflow-runtime.json','workflow-runtime-read.json','workflow-group-read.json','workflow-build.log','workflow-tests.tap','workflow-source-register.tap','workflow-python-tests.log','workflow-sql-parse.json','workflow-browser.json','workflow-desktop.png','workflow-mobile.png','workflow-rehearsal-offline-tests.log']
m['artifacts']={p:hashlib.sha256((a/'data'/p).read_bytes()).hexdigest() for p in artifacts}
m['rehearsal']={'sqlPath':'data/workflow-rehearsal.sql','sqlSha256':m['artifacts']['workflow-rehearsal.sql'],'runnerPath':'scripts/workflow-sql-rehearsal.py','runnerSha256':hashlib.sha256((a/'scripts/workflow-sql-rehearsal.py').read_bytes()).hexdigest(),'migrationSha256':m['migration']['sha256'],'manifestChecksumFile':'data/workflow-release.sha256','offlineCheckCommand':m['nextApproval']['command']+' --check-only','constraintChecks':'IMMEDIATE only after each complete operation, then DEFERRED before next operation','runtimeDenial':'ir_review_runtime UPDATE denied with SQLSTATE 42501','privilegedTriggerDenial':'RESET ROLE; existing privileged owner UPDATE denied by append-only trigger with SQLSTATE 55000','execution':'NOT_RUN'}
m['verification']['rehearsalHarness']='OFFLINE_REGRESSION_AND_CHECKSUM_VALIDATION_PASS_NOT_EXECUTED'
m['status']='BUILT_NOT_DEPLOYED_SQL_EXECUTION_UNVERIFIED'
m['verification']['sql']='REHEARSAL_EXECUTION_NOT_VERIFIED_FOR_CURRENT_BUNDLE'
m['verification']['financialConstraintsAndConcurrency']='NOT_RUN'
m['nextApproval']={'action':'ROLLBACK_ONLY_0012_CANONICAL_SQL_REHEARSAL','command':m['rehearsal']['offlineCheckCommand'].removesuffix(' --check-only'),'productionDDL':True,'commit':False,'syntheticRowsOnly':True,'ledgerWrite':False,'serviceRecreation':False}
# Retain completed rehearsal evidence only for these exact SQL/runner/migration
# bytes. A later preparation must not inherit a PASS from a different bundle.
execution_path=a/'data/workflow-rehearsal-execution.json'
comparison_path=a/'data/workflow-rehearsal-state-comparison.json'
if execution_path.exists() and comparison_path.exists():
 execution=json.loads(execution_path.read_text());comparison=json.loads(comparison_path.read_text())
 matches=(execution.get('migrationSha256')==m['migration']['sha256'] and execution.get('sqlSha256')==m['rehearsal']['sqlSha256'] and execution.get('runnerSha256')==m['rehearsal']['runnerSha256'])
 if matches:
  passed=(execution.get('attempts')==1 and execution.get('psqlExitCode')==0 and execution.get('runnerExitCode')==0 and execution.get('commitPresent') is False and comparison.get('status')=='ROLLBACK_AND_STATE_UNCHANGED_PASS' and all(comparison.get('checks',{}).values()))
  m['rehearsal']['execution']='ROLLBACK_REHEARSAL_PASS' if passed else 'EXECUTED_REVIEW_EVIDENCE'
  m['rehearsal']['executionEvidence']='data/workflow-rehearsal-execution.json'
  m['rehearsal']['stateComparison']='data/workflow-rehearsal-state-comparison.json'
  m['rehearsal']['reviewedManifestSha256']=execution['reviewedManifestSha256']
  m['rehearsal']['attempts']=execution['attempts']
  for name in ['workflow-rehearsal-execution.json','workflow-rehearsal-reviewed-manifest.json','workflow-rehearsal-before.json','workflow-rehearsal-after.json','workflow-rehearsal-state-comparison.json','workflow-sql-rehearsal.json','workflow-rehearsal-state-capture.py','workflow-rehearsal-execution-observer.py']:
   m['artifacts'][name]=hashlib.sha256((a/'data'/name).read_bytes()).hexdigest()
  if passed:
   m['status']='BUILT_NOT_DEPLOYED_ROLLBACK_REHEARSAL_PASS'
   m['verification']['sql']='CANONICAL_ROLLBACK_REHEARSAL_PASS'
   m['verification']['rehearsalHarness']='CANONICAL_EXECUTION_AND_POST_ROLLBACK_STATE_PASS'
   m['verification']['financialConstraintsAndConcurrency']='SINGLE_TRANSACTION_PASS_CONCURRENT_SESSIONS_NOT_RUN'
   m['nextApproval']={'action':'SEPARATE_PRODUCTION_ACTION_REQUIRES_EXPLICIT_APPROVAL','rehearsalAuthorizationConsumed':True,'repeatRehearsalAuthorized':False,'commitAuthorized':False,'permanentMigrationAuthorized':False,'realFinancialPostingAuthorized':False,'serviceRestartAuthorized':False}
   m['remaining']=[('Concurrent-session and live business acceptance' if x=='SQL body/constraint/atomicity/concurrency and live business acceptance' else x) for x in m['remaining']]
target.write_text(json.dumps(m,indent=2)+'\n')
manifest_sha=hashlib.sha256(target.read_bytes()).hexdigest()
(a/'data/workflow-release.sha256').write_text(manifest_sha+'  workflow-release.json\n')
print(json.dumps({'changedFiles':len(changes),'migration':m['migration'],'images':m['images'],'patchBytes':(a/'data/workflow.patch').stat().st_size}))
