"""Opt-in disposable PostgreSQL qualification. Never opens application/prod connections."""
import argparse, subprocess, json, pathlib, hashlib, threading, time, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
DB='alrifai_qualification'; USER='qualification_admin'

def inspect(name):return json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
def preflight(container):
 if not re.fullmatch(r'alrifai-sql-qualification-[a-z0-9-]+',container):raise RuntimeError('ISOLATION_NOT_PROVEN: container name')
 t=inspect(container);p=inspect('vps-infra-postgres-1');h=t['HostConfig'];env=t['Config']['Env'];mounts=t['Mounts']
 assert t['Id']!=p['Id'] and t['Config']['Labels'].get('alrifai.qualification')=='employee-program-v4'
 assert h['NetworkMode']=='none' and not h['PortBindings'] and not h['Privileged'] and not h['PidMode'] and not h.get('Binds')
 assert set(h['Tmpfs'])=={'/var/lib/postgresql/data'} and h['RestartPolicy']['Name']=='no'
 assert len(mounts)==1 and mounts[0]['Source'].startswith('/tmp/alrifai-sql-qualification-') and mounts[0]['Destination']=='/run/qualification/password' and mounts[0]['RW'] is False
 assert not set(m['Source'] for m in mounts)&set(m['Source'] for m in p['Mounts'])
 assert 'POSTGRES_DB='+DB in env and 'POSTGRES_USER='+USER in env and not any(x.startswith(('PGHOST=','DATABASE_URL=','PGPASSWORD=')) for x in env)
 return {'container':container,'containerId':t['Id'],'productionContainerId':p['Id'],'imageId':t['Image'],'network':'none','hostPort':None,'endpoint':'container-only Unix socket /var/run/postgresql:5432','storage':h['Tmpfs'],'credentialMount':mounts[0]['Source'],'credentials':'fresh test-only password; qualification_admin in disposable instance only','database':DB,'role':USER,'productionEndpointExcluded':True,'productionVolumesMounted':False}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--container',required=True);ap.add_argument('--report',required=True);args=ap.parse_args()
 isolation=preflight(args.container);results=[];report={'isolation':isolation,'tests':results,'fixtureType':'synthetic only','productionWrites':0}
 def run(sql):
  cmd=['docker','exec','-i',args.container,'psql','-X','-qAt','-w','-h','/var/run/postgresql','-U',USER,'-d',DB,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']
  return subprocess.run(cmd,input=sql,text=True,capture_output=True,timeout=25)
 def q(sql):
  r=run(sql)
  if r.returncode:raise RuntimeError(r.stderr.strip())
  return r.stdout.strip()
 def check(name,fn):
  try:fn();results.append({'name':name,'status':'PASS'})
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)[:1600]})
 def reject(sql,state):
  r=run('BEGIN;\n'+sql+'\nROLLBACK;')
  assert r.returncode and re.search(r'ERROR:\s+'+state+r':',r.stderr),r.stderr or 'Unexpectedly accepted invalid fixture'
 def accepted(sql):q('BEGIN;\n'+sql+'\nROLLBACK;')
 # SELECT identity before any migration/fixture statements. No production credentials or records copied.
 identity=json.loads(q("SELECT json_build_object('database',current_database(),'user',current_user,'version',current_setting('server_version'),'cluster',(SELECT system_identifier::text FROM pg_control_system()),'address',inet_server_addr(),'port',inet_server_port(),'tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'productionDatabaseExists',EXISTS(SELECT FROM pg_database WHERE datname='alrifai'),'productionRoleExists',EXISTS(SELECT FROM pg_roles WHERE rolname IN ('vps_pg_admin','alrifai_app')));"))
 assert identity['database']==DB and identity['user']==USER and not identity['productionDatabaseExists'] and not identity['productionRoleExists'] and identity['tables']==0
 live=next(f['rows'][0] for f in map(json.loads,pathlib.Path('/tmp/alrifai-qualification-production-before.jsonl').read_text().splitlines()) if f['label']=='identity');assert identity['cluster']!=live['cluster']
 isolation['databaseIdentity']=identity;isolation['gate']='PASS BEFORE APPLICATION SQL'
 migrations=sorted((ROOT/'db/migrations').glob('*.sql'));assert len(migrations)==6
 sql="BEGIN; CREATE TABLE alrifai_schema_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());\n"
 report['baselineMigrations']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in migrations}
 for p in migrations:sql+=p.read_text()+"\nINSERT INTO alrifai_schema_migrations(id,sha256) VALUES ('"+p.name+"','"+report['baselineMigrations'][p.name]+"');\n"
 q(sql+'COMMIT;');report['baselineTables']=json.loads(q("SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public';"));assert len(report['baselineTables'])==9
 candidate=(ROOT/'db/migration-candidates/0006_employee_program_identity.sql').read_text();report['candidateSha256']=hashlib.sha256(candidate.encode()).hexdigest()
 check('baseline schema: nine tables, six ledger rows, no business records',lambda:assert_equal(q("SELECT (SELECT count(*) FROM alrifai_schema_migrations)||'|'||(SELECT count(*) FROM programs)||'|'||(SELECT count(*) FROM site_source_snapshots);"),'6|0|0'))
 check('candidate DDL successful but explicit rollback leaves baseline intact',lambda:(q('BEGIN;'+candidate+'ROLLBACK;'),assert_equal(q("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'ep_%';"),'0')))
 check('candidate migration failure rolls back all eleven DDL tables',lambda:(reject(candidate+'SELECT 1/0;','22012'),assert_equal(q("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'ep_%';"),'0')))
 q("BEGIN;"+candidate+"INSERT INTO alrifai_schema_migrations(id,sha256) VALUES ('0006_candidate','"+report['candidateSha256']+"'); COMMIT;")
 report['candidateCatalog']=json.loads(q("SELECT json_build_object('tables',(SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'ep_%'),'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text LIKE 'ep_%'),'checks',(SELECT count(*) FROM pg_constraint WHERE contype='c' AND conrelid::regclass::text LIKE 'ep_%'),'triggers',(SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'ep_%'),'indexes',(SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename LIKE 'ep_%'),'columns',(SELECT json_agg(json_build_object('table',table_name,'column',column_name,'type',data_type) ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name LIKE 'ep_%'));"))
 check('eleven tables and 22 immutable triggers created',lambda:(assert_equal(len(report['candidateCatalog']['tables']),11),assert_equal(report['candidateCatalog']['triggers'],22)))
 check('repeated raw candidate migration rejects without ledger/table drift',lambda:(reject(candidate,'42P07'),assert_equal(q('SELECT count(*) FROM alrifai_schema_migrations;'),'7')))
 # Fixtures are synthetic, never exported from the historical sources.
 H='a'*64; O='1'*64
 source=lambda i,pointer: f"INSERT INTO ep_source_occurrences(id,source_file,file_sha256,document_pointer,record_sha256,mapping_version,raw_record) VALUES ('{i}','SYNTHETIC_ONLY','{H}','{pointer}','{H}','employee-program-v4-lifecycle','{{\"synthetic\":true}}');"
 decision=lambda id,role='employee',status='approved',key='',assertion='{}',basis='independent_authority': f"INSERT INTO ep_review_decisions(id,occurrence_id,event_key,role,decision,approver,approved_at,evidence_sha256,evidence_basis,evidence_reference,assertion) VALUES ('{id}','{O}','{key}','{role}','{status}','synthetic-reviewer',now(),'{H}','{basis}','synthetic-evidence','{assertion}');"
 program=lambda id:f"INSERT INTO programs(id,\"createdAt\") VALUES ('{id}','SYNTHETIC');"
 fixture=source(O,'/messages/0')+decision('de',basis='owner_verified_ledger_mobile')+decision('dv1','vessel')+decision('dv2','vessel')+decision('dp','program')+decision('dr','program_vessel')+decision('da','assignment')
 fixture+="INSERT INTO ep_employees(id,employee_id,identity_basis,decision_id) VALUES ('internal-e','+8801700000001','owner_verified_ledger_mobile','de');INSERT INTO ep_vessels(id,authority_reference,decision_id) VALUES ('m','SYNTHETIC-M','dv1'),('l','SYNTHETIC-L','dv2');"
 fixture+=program('p')+"INSERT INTO ep_programs(program_id,authority_reference,start_date,shift,lifecycle,decision_id) VALUES ('p','SYNTHETIC-P','2026-01-01','D','confirmed','dp');INSERT INTO ep_program_vessels(id,program_id,mother_id,lighter_id,decision_id) VALUES ('rel','p','m','l','dr');INSERT INTO ep_assignment_events(id,relationship_id,program_id,lighter_id,employee_id,kind,valid_from,decision_id) VALUES ('a1','rel','p','l','+8801700000001','assigned','2026-01-01','da');"
 fixture+=f"INSERT INTO ep_import_batches(id,manifest_sha256,manifest,schema_sha256,mapping_version,owner_approval_reference,accepted_count,committed_at) VALUES ('batch','{'b'*64}','{{\"synthetic\":true}}','{'c'*64}','employee-program-v4-lifecycle','SYNTHETIC_TEST_ONLY',1,now());"
 binding=lambda id='b1',key='',did='de',role='employee',target="employee_id",value='+8801700000001':f"INSERT INTO ep_source_bindings(id,occurrence_id,event_key,role,decision_id,batch_id,target_sha256,{target}) VALUES ('{id}','{O}','{key}','{role}','{did}','batch','{H}','{value}');"
 fixture+=binding();q('BEGIN;'+fixture+'COMMIT;')
 check('existing programs(id) backward-compatible anchor and mobile-valued employee FK',lambda:assert_equal(q("SELECT p.id||'|'||e.employee_id FROM programs p JOIN ep_programs x ON x.program_id=p.id CROSS JOIN ep_employees e;"),'p|+8801700000001'))
 check('duplicate source occurrence rejected',lambda:reject(source('2'*64,'/messages/0'),'23505'))
 check('duplicate event-key/role binding rejected',lambda:reject(binding('duplicate'),'23505'))
 key1='e'*64;key2='f'*64
 check('one message supports two lighter/event blocks with distinct exact approval keys',lambda:accepted(decision('d1','program_event',key=key1,assertion='{"eventType":"admin_confirmation"}')+decision('d2','program_event',key=key2,assertion='{"eventType":"admin_confirmation"}')+program('p2')+"INSERT INTO ep_programs(program_id,authority_reference,start_date,shift,lifecycle,decision_id) VALUES ('p2','SYNTHETIC-P2','2026-01-01','D','confirmed','dp');"+binding('event1',key1,'d1','program_event','program_id','p')+binding('event2',key2,'d2','program_event','program_id','p2')))
 check('event-key mismatch cannot use approval for another block',lambda:reject(decision('dk','program_event',key=key1,assertion='{"eventType":"admin_confirmation"}')+binding('mismatch',key2,'dk','program_event','program_id','p'),'23503'))
 check('missing employee FK rejected',lambda:reject(binding('bad-employee',key1,'de',value='+8801800000001'),'23503'))
 check('invalid lifecycle event value rejected',lambda:reject(decision('bad-event','program_event',assertion='{"eventType":"unsupported"}'),'23514'))
 check('NULL lifecycle event must be rejected, never bypass CHECK',lambda:reject(decision('null-event','program_event',assertion='{"eventType":null}'),'23514'))
 check('invalid lifecycle state rejected',lambda:reject(program('badstate')+"INSERT INTO ep_programs(program_id,authority_reference,start_date,shift,lifecycle,decision_id) VALUES ('badstate','BAD','2026-01-01','D','paid','dp');",'23514'))
 check('confirmation requires date and shift',lambda:reject(program('missingdate')+"INSERT INTO ep_programs(program_id,authority_reference,lifecycle,decision_id) VALUES ('missingdate','MISSING','confirmed','dp');",'23514'))
 check('missing assignment predecessor rejected',lambda:reject("INSERT INTO ep_assignment_events(id,relationship_id,program_id,lighter_id,employee_id,kind,valid_from,previous_id,decision_id) VALUES ('bad-prev','rel','p','l','+8801700000001','replaced','2026-01-02','absent','da');",'23503'))
 check('assignment relationship mismatch rejected',lambda:reject("INSERT INTO ep_assignment_events(id,relationship_id,program_id,lighter_id,employee_id,kind,valid_from,decision_id) VALUES ('bad-rel','absent','p','l','+8801700000001','assigned','2026-01-02','da');",'23503'))
 check('self-assignment predecessor rejected',lambda:reject("INSERT INTO ep_assignment_events(id,relationship_id,program_id,lighter_id,employee_id,kind,valid_from,previous_id,decision_id) VALUES ('self','rel','p','l','+8801700000001','replaced','2026-01-02','self','da');",'23514'))
 check('rejected approval cannot back an employee identity',lambda:reject(decision('rejected',status='rejected',basis='owner_verified_ledger_mobile')+"INSERT INTO ep_employees(id,employee_id,identity_basis,decision_id) VALUES ('invalid','+8801800000001','owner_verified_ledger_mobile','rejected');",'23503'))
 check('conflicting decision cannot overwrite accepted binding',lambda:reject(decision('another')+binding('other-binding',did='another'),'23505'))
 check('same mobile cannot create a second operational employee',lambda:reject("INSERT INTO ep_employees(id,employee_id,identity_basis,decision_id) VALUES ('duplicate-person','+8801700000001','owner_verified_ledger_mobile','de');",'23505'))
 check('invalid mobile form rejected',lambda:reject("INSERT INTO ep_employees(id,employee_id,identity_basis,decision_id) VALUES ('invalid-mobile','01700000001','owner_verified_ledger_mobile','de');",'23514'))
 check('same alias cannot be duplicated under the same employee',lambda:reject("INSERT INTO ep_employee_history(id,employee_id,kind,value,verification,decision_id) VALUES ('n1','+8801700000001','alias','Synthetic Name','verified','de'),('n2','+8801700000001','alias','Synthetic Name','verified','de');",'23505'))
 check('immutable source UPDATE rejected',lambda:reject(f"UPDATE ep_source_occurrences SET source_file='changed' WHERE id='{O}';",'P0001'))
 check('immutable source DELETE rejected',lambda:reject(f"DELETE FROM ep_source_occurrences WHERE id='{O}';",'P0001'))
 check('immutable source TRUNCATE rejected',lambda:reject('TRUNCATE ep_source_occurrences CASCADE;','P0001'))
 check('immutable binding cannot be redirected',lambda:reject("UPDATE ep_source_bindings SET target_sha256='"+'e'*64+"' WHERE id='b1';",'P0001'))
 check('atomic failed candidate replay rolls back preceding synthetic row',lambda:(reject(source('3'*64,'/atomic')+binding('replay'),'23505'),assert_equal(q("SELECT count(*) FROM ep_source_occurrences WHERE document_pointer='/atomic';"),'0')))
 check('explicit replay on immutable scope compares existing target without new rows',lambda:assert_equal(q(f"SELECT count(*)||'|'||min(target_sha256) FROM ep_source_bindings WHERE occurrence_id='{O}' AND role='employee' AND event_key='';"),'1|'+H))
 # Two overlapping transactions, each distinct PK but identical unique source scope.
 output=[];lock=threading.Lock();barrier=threading.Barrier(2)
 def concurrent(i):
  barrier.wait();out=run('BEGIN;'+source(str(i)*64,'/concurrent')+'SELECT pg_sleep(0.5);COMMIT;')
  with lock:output.append({'exit':out.returncode,'sqlstate':'23505' if '23505' in out.stderr else None})
 threads=[threading.Thread(target=concurrent,args=(i,)) for i in [4,5]]
 for t in threads:t.start()
 for t in threads:t.join()
 report['concurrency']=output
 check('concurrent source insertion: exactly one commit, one unique rejection',lambda:(assert_equal(sorted(x['exit']==0 for x in output),[False,True]),assert_equal(q("SELECT count(*) FROM ep_source_occurrences WHERE document_pointer='/concurrent';"),'1'),assert_equal(sum(x['sqlstate']=='23505' for x in output),1)))
 report['counts']={'pass':sum(t['status']=='PASS' for t in results),'fail':sum(t['status']=='FAIL' for t in results),'skip':0};report['status']='PASS' if not report['counts']['fail'] else 'FAIL'
 pathlib.Path(args.report).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':report['status'],'counts':report['counts'],'report':args.report}));return int(report['counts']['fail']>0)
def assert_equal(a,b):assert a==b,(a,b)
if __name__=='__main__':raise SystemExit(main())
