"""R1 repair for the already migrated canonical database. Default: read only.

Only the exact Owner-approved column grants/receipt and SAME candidate app image.
The flag is not approval. Never call the first-rollout runner from this script.
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, subprocess, time

ROOT=Path('/opt/vps/apps/al-rifai')
MIGRATION='0013_program_command_permissions.sql'
SQL_HASH='ca9044bd197808d1141b8fcc7cbdf86b9dbcaeb6aecafa987e213d2fc144ef65'
OLD_APP='sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2'
CANDIDATE='sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097'
HASH0012='f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8'
NAMES=['al-rifai-app-1','vps-infra-postgres-1','vps-whatsapp-wa-01-cap4-20261011','vps-whatsapp-wa-02-cap4-20261011']

def run(argv,**kwargs):
    p=subprocess.run(argv,text=True,capture_output=True,timeout=kwargs.pop('timeout',60),**kwargs)
    if p.returncode: raise RuntimeError('COMMAND_FAILED: '+argv[0]+' '+p.stderr[-1000:])
    return p.stdout

def pg(sql):
    return run(['docker','exec','-i',NAMES[1],'psql','-X','-qAt','-U','vps_pg_admin','-d','alrifai','-v','ON_ERROR_STOP=1'],input=sql)

def runtime():
    rows=json.loads(run(['docker','inspect',*NAMES]))
    return {v['Name'].lstrip('/'):{'id':v['Id'],'image':v['Image'],'started':v['State']['StartedAt'],'running':v['State']['Running'],'health':v['State'].get('Health',{}).get('Status'),'restarts':v['RestartCount'],**({'financialOff':not any(x=='ALRIFAI_CASH_POSTING_ENABLED=APPROVED_MANUAL_V1' for x in v['Config']['Env'])} if v['Name'].lstrip('/')==NAMES[0] else {})} for v in rows}

def database_state():
    return json.loads(pg("""BEGIN READ ONLY;
SELECT jsonb_build_object('database',current_database(),'ledger',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,sha256 FROM public.alrifai_schema_migrations ORDER BY id) x),'guard',md5(pg_get_functiondef('public.alrifai_foundation_verified_actor()'::regprocedure)),'historyTrigger',md5(pg_get_functiondef('identity_review_candidate.protect_program_command_history()'::regprocedure)),'historyTriggerEnabled',(SELECT tgenabled='O' FROM pg_trigger WHERE tgrelid='public.programs'::regclass AND tgname='program_command_history'),'programColumns',(SELECT jsonb_agg(jsonb_build_object('column',a.attname,'insert',has_column_privilege('ir_review_runtime',a.attrelid,a.attnum,'INSERT'),'update',has_column_privilege('ir_review_runtime',a.attrelid,a.attnum,'UPDATE')) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid='public.programs'::regclass AND a.attnum>0 AND NOT a.attisdropped),'counts',jsonb_build_object('cash',(SELECT count(*) FROM public.cash_instructions),'programs',(SELECT count(*) FROM public.programs),'links',(SELECT count(*) FROM public.roster_source_links),'postings',(SELECT count(*) FROM public.cash_postings),'movements',(SELECT count(*) FROM public.cash_movements)),'cashDigest',(SELECT md5(string_agg(md5(to_jsonb(c)::text),'' ORDER BY id)) FROM public.cash_instructions c),'financialGrants',(SELECT count(*) FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='grant' AND payload->>'status'='VERIFIED' AND payload->'data'->>'capability' IN ('cash.post','cash.reverse')));
ROLLBACK;"""))

def preflight():
    sql=(ROOT/'db/migrations'/MIGRATION).read_bytes()
    assert hashlib.sha256(sql).hexdigest()==SQL_HASH,'EXACT_APPROVED_CORRECTION_CHANGED'
    assert sql==(ROOT/'data/R1_PROGRAM_PERMISSION_CORRECTION.sql').read_bytes()
    assert hashlib.sha256((ROOT/'db/migrations/0012_business_workflows.sql').read_bytes()).hexdigest()==HASH0012
    before=runtime(); db=database_state()
    assert db['database']=='alrifai' and len(db['ledger'])==13 and db['ledger'][-1]=={'id':'0012_business_workflows.sql','sha256':HASH0012},'FRESH_LEDGER_REQUIRED'
    assert all(hashlib.sha256((ROOT/'db/migrations'/x['id']).read_bytes()).hexdigest()==x['sha256'] for x in db['ledger'])
    assert db['counts']=={'cash':24,'programs':0,'links':0,'postings':0,'movements':0} and db['financialGrants']==0
    assert db['historyTriggerEnabled'] and all(not c['insert'] and not c['update'] for c in db['programColumns'])
    assert before[NAMES[0]]['image']==OLD_APP and before[NAMES[0]]['financialOff'] and all(x['running'] for x in before.values())
    original=(ROOT/'compose.yaml').read_text(); assert original.count('image: '+OLD_APP)==1
    run(['docker','image','inspect',CANDIDATE])
    compatibility=json.loads((ROOT/'data/workflow-r1-reader-contract.json').read_text())
    assert compatibility['status']=='CONTRACT_PASS' and compatibility['runtimeRole']=='ir_review_runtime' and compatibility['candidateImage']==CANDIDATE
    return {'status':'REPAIR_PREFLIGHT_PASS_NOT_APPLIED','migration':MIGRATION,'migrationSha256':SQL_HASH,'preserved0012Sha256':HASH0012,'candidateImage':CANDIDATE,'financialPosting':'OFF','runtime':before,'database':db,'rollback':{'schema':'ADDITIVE_GRANTS_AND_RECEIPT_RETAINED','compatibleReaderImage':CANDIDATE,'incompatibleOldImage':OLD_APP,'oldImageLimitation':'Emergency login only; retained-v2 reader fails. Never classify it as compatible operational rollback.'}}

def up():
    run(['docker','compose','-p','al-rifai','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','app'],timeout=120)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    state=preflight()
    if not args.apply: print(json.dumps(state));return
    # Owner explicitly approved this exact prepared correction and same-image
    # reactivation in the active session. The flag itself is not authorization.
    receipt=ROOT/'data/workflow-r1-repair-result.json'
    with receipt.open('x') as f: json.dump({'status':'REPAIR_STARTED_NOT_ACCEPTED','before':state},f,indent=2)
    original=(ROOT/'compose.yaml').read_text()
    (ROOT/'data/workflow-r1-repair-compose-before.yaml').write_text(original)
    migration=(ROOT/'db/migrations'/MIGRATION).read_text()
    transaction=("BEGIN;SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='15s';LOCK TABLE public.alrifai_schema_migrations IN SHARE ROW EXCLUSIVE MODE;\nDO $$ BEGIN IF (SELECT count(*) FROM public.alrifai_schema_migrations)<>13 OR NOT EXISTS(SELECT 1 FROM public.alrifai_schema_migrations WHERE id='0012_business_workflows.sql' AND sha256='"+HASH0012+"') OR EXISTS(SELECT 1 FROM public.alrifai_schema_migrations WHERE id>='0013') THEN RAISE EXCEPTION 'REPAIR_LEDGER_CHANGED';END IF;END $$;\n"+migration+"\nINSERT INTO public.alrifai_schema_migrations(id,sha256) VALUES('"+MIGRATION+"','"+SQL_HASH+"');COMMIT;")
    assert transaction==(ROOT/'data/workflow-r1-repair-transaction.sql').read_text(), 'REVIEWED_TRANSACTION_CHANGED'
    review=json.loads((ROOT/'data/workflow-r1-repair-review.json').read_text())
    assert hashlib.sha256(transaction.encode()).hexdigest()==review['transactionSha256']
    pg(transaction)
    outcome={'status':'REPAIR_MIGRATED_NOT_ACCEPTED','before':state,'migrationCommitted':True,'financialPosting':'OFF'}
    receipt.write_text(json.dumps(outcome,indent=2)+'\n')
    try:
        (ROOT/'compose.yaml').write_text(original.replace('image: '+OLD_APP,'image: '+CANDIDATE,1));up()
        for _ in range(30):
            live=runtime()
            if live[NAMES[0]]['health']=='healthy':break
            time.sleep(2)
        else:raise RuntimeError('CANDIDATE_HEALTH_FAILED')
        assert live[NAMES[0]]['image']==CANDIDATE and live[NAMES[0]]['financialOff']
        assert all(live[n]==state['runtime'][n] for n in NAMES[1:]),'UNRELATED_SERVICE_CHANGED'
        db=database_state()
        assert len(db['ledger'])==14 and db['ledger'][-1]=={'id':MIGRATION,'sha256':SQL_HASH}
        assert db['cashDigest']==state['database']['cashDigest'] and db['counts']==state['database']['counts']
        assert db['guard']==state['database']['guard'] and db['historyTrigger']==state['database']['historyTrigger'] and db['historyTriggerEnabled']
        outcome.update(status='REPAIR_ACTIVE_NOT_ACCEPTED',runtime=live,database=db)
    except Exception:
        (ROOT/'compose.yaml').write_text(original);up()
        outcome.update(status='EMERGENCY_OLD_APP_RESTORED_NOT_ACCEPTED',readerCompatibility='RETAINED_V2_UNSUPPORTED',schemaRollback=False)
        receipt.write_text(json.dumps(outcome,indent=2)+'\n');raise
    receipt.write_text(json.dumps(outcome,indent=2)+'\n');print(json.dumps({'status':outcome['status'],'ledger':14,'migrationSha256':SQL_HASH,'candidateImage':CANDIDATE,'financialPosting':'OFF','postgresAndWhatsAppUnchanged':True}))

if __name__=='__main__':main()
