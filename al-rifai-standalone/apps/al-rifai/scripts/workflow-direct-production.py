"""Direct-chat-first release. Default is read-only preflight, never deployment.

--apply requires the owner's separate exact migration/app recreation approval.
Does not change WhatsApp, registry, credentials, environment or socket layout.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,time

ROOT=Path('/opt/vps/apps/al-rifai')
MIGRATION='0012_business_workflows.sql'
SQL_HASH='f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8'
OLD_APP='sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2'
NEW_APP='sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097'
NAMES=['al-rifai-app-1','vps-infra-postgres-1','vps-whatsapp-wa-01-cap4-20261011','vps-whatsapp-wa-02-cap4-20261011']
TABLES=['cash_instructions','employee_mobile_evidence','roster_source_links','program_assignments','cash_postings','cash_movements']

def run(argv,**kwargs):
    result=subprocess.run(argv,text=True,capture_output=True,timeout=kwargs.pop('timeout',60),**kwargs)
    if result.returncode:raise RuntimeError('COMMAND_FAILED: '+argv[0]+' '+result.stderr[-1200:])
    return result.stdout

def pg(sql):
    return run(['docker','exec','-i','vps-infra-postgres-1','psql','-X','-qAt','-U','vps_pg_admin','-d','alrifai','-v','ON_ERROR_STOP=1'],input=sql)

def runtime():
    result={}
    for name in NAMES:
        d=json.loads(run(['docker','inspect',name]))[0]
        result[name]={'id':d['Id'],'image':d['Image'],'started':d['State']['StartedAt'],'running':d['State']['Running'],'health':d['State'].get('Health',{}).get('Status')}
        if name==NAMES[0]:
            result[name]['postingEnabled']=any(v=='ALRIFAI_CASH_POSTING_ENABLED=APPROVED_MANUAL_V1' for v in d['Config']['Env'])
    return result

def preflight():
    m=json.loads((ROOT/'data/workflow-release.json').read_text())
    assert m['migration']['sha256']==SQL_HASH and m['images']['app']==NEW_APP,'RELEASE_CHANGED'
    sql=(ROOT/'db/migrations'/MIGRATION).read_text()
    assert hashlib.sha256(sql.encode()).hexdigest()==SQL_HASH,'MIGRATION_CHANGED'
    assert not re.search(r'^\s*(?:BEGIN|COMMIT|ROLLBACK)\s*;',sql,re.M),'MIGRATION_TRANSACTION_CONTROL'
    for file,status in [('workflow-sql-rehearsal.json','ROLLBACK_REHEARSAL_PASS'),('workflow-rehearsal-state-comparison.json','ROLLBACK_AND_STATE_UNCHANGED_PASS')]:
        p=ROOT/'data'/file
        assert hashlib.sha256(p.read_bytes()).hexdigest()==m['artifacts'][file],'ACCEPTANCE_EVIDENCE_CHANGED'
        assert json.loads(p.read_text())['status']==status,'ACCEPTANCE_NOT_PASS'
    assert m['financialFlag']=='OFF' and not m['financialRegistryGrantsAdded'],'FINANCIAL_SCOPE_CHANGED'
    before=runtime();assert all(v['running'] for v in before.values()),'RUNTIME_NOT_RUNNING'
    assert before[NAMES[0]]['image']==OLD_APP and not before[NAMES[0]]['postingEnabled'],'APP_BASELINE_CHANGED'
    compose=(ROOT/'compose.yaml').read_text()
    assert compose.count('image: '+OLD_APP)==1,'COMPOSE_BASELINE_CHANGED'
    run(['docker','image','inspect',NEW_APP])
    query="BEGIN READ ONLY;SELECT count(*) FROM public.alrifai_schema_migrations;SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY(ARRAY['"+"','".join(TABLES)+"']);SELECT count(*) FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='grant' AND payload->>'status'='VERIFIED' AND payload->'data'->>'capability' IN ('cash.post','cash.reverse');ROLLBACK;"
    assert pg(query).strip().splitlines()==['12','0','0'],'DATABASE_BASELINE_CHANGED'
    return {'status':'PREFLIGHT_PASS_NOT_EXECUTED','migration':MIGRATION,'migrationSha256':SQL_HASH,'newAppImage':NEW_APP,'scope':'DIRECT_CHAT_SOURCE_LINKED_INTENTS_AND_ROSTER','financialPosting':'OFF','wa01Changes':False,'wa02Changes':False,'runtime':before,'pending':['Owner exact migration/grants and app-only recreation approval','Live direct-chat business/browser acceptance','Concurrent-session writer acceptance before financial activation','Separate group/socket release']}

def up():
    run(['docker','compose','-p','al-rifai','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','app'],timeout=120)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    state=preflight()
    if not args.apply:print(json.dumps(state));return
    # CLI switch is not authorization. Operator must have exact owner approval.
    original=(ROOT/'compose.yaml').read_text();backup=ROOT/'data/workflow-direct-compose-before.yaml'
    assert not backup.exists(),'PRIOR_ATTEMPT_REQUIRES_REVIEW'
    backup.write_text(original)
    (ROOT/'data/workflow-direct-before.json').write_text(json.dumps(state,indent=2))
    migration=(ROOT/'db/migrations'/MIGRATION).read_text()
    receipt="INSERT INTO public.alrifai_schema_migrations(id,sha256) VALUES('"+MIGRATION+"','"+SQL_HASH+"');"
    pg("BEGIN;SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='15s';\n"+migration+'\n'+receipt+'\nCOMMIT;')
    try:
        (ROOT/'compose.yaml').write_text(original.replace('image: '+OLD_APP,'image: '+NEW_APP,1));up()
        for attempt in range(25):
            live=runtime()
            if live[NAMES[0]]['health']=='healthy':break
            time.sleep(2)
        else:raise RuntimeError('NEW_APP_NOT_HEALTHY')
        assert live[NAMES[0]]['image']==NEW_APP and not live[NAMES[0]]['postingEnabled'],'NEW_APP_CONTRACT'
        for n in NAMES[1:]:assert live[n]==state['runtime'][n],'UNRELATED_SERVICE_CHANGED'
        outcome={'status':'DIRECT_DEPLOYED_PENDING_LIVE_ACCEPTANCE','financialPosting':'OFF','migrationSha256':SQL_HASH,'runtime':live,'sourceImportRun':False}
    except Exception:
        (ROOT/'compose.yaml').write_text(original);up()
        (ROOT/'data/workflow-direct-result.json').write_text(json.dumps({'status':'APP_ROLLBACK_REQUESTED_SCHEMA_RETAINED','migrationCommitted':True,'financialPosting':'OFF'},indent=2))
        raise
    (ROOT/'data/workflow-direct-result.json').write_text(json.dumps(outcome,indent=2));print(json.dumps(outcome))

if __name__=='__main__':main()
