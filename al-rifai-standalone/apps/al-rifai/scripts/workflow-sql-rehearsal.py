"""Prepare/check a reviewed rollback-only rehearsal; execution needs Owner approval.
Imports, --prepare-only and --check-only never connect to PostgreSQL or Docker.
The applied migration and runtime privileges are not changed by this generator.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path('/opt/vps/apps/al-rifai')
RUNNER = 'scripts/workflow-sql-rehearsal.py'
SQL = 'data/workflow-rehearsal.sql'
MANIFEST = 'data/workflow-release.json'
MANIFEST_CHECKSUM = 'data/workflow-release.sha256'


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def constraint_checkpoint(operation):
    # Validate the complete operation (posting plus both legs), then restore
    # deferral before the next operation. No constraint/trigger is disabled.
    return (f"-- Constraint checkpoint: {operation}\n"
            "SET CONSTRAINTS ALL IMMEDIATE;\n"
            "SET CONSTRAINTS ALL DEFERRED;\n")


def build_sql(migration):
    owner='contact-f21ef3f53013469cc523'
    h=lambda s:hashlib.sha256(('workflow-rollback-only:'+s).encode()).hexdigest()
    i,c,ph=h('instruction'),h('command'),h('payload')
    reversal_checks='';
    for n in [1,2]:
     ri,rc,rh,ro=h('reversal-i'+str(n)),h('reversal-c'+str(n)),h('reversal-h'+str(n)),h('reversal-o'+str(n))
     reversal_checks+=f"""
    INSERT INTO public.business_commands(id,scope_account,operation_key,payload_hash,action,actor_ref,auth_epoch,expected_resource_version,confirmation_basis,result_ref,result_hash,committed_at) SELECT '{rc}','wa-01','workflow-rehearsal:reverse:{n}','{rh}','CASH_POST','{owner}',(payload->>'epoch')::bigint,1,'ADMIN_DIRECT','{ri}','{rh}',now() FROM identity_review_candidate.records WHERE collection='meta' AND id='epoch';
    INSERT INTO public.cash_instructions(id,operation_id,scope_account,command_id,source_time,block_order,employee_mobile,employee_name,purpose,method,amount_minor,state,reasons,payload_hash,cash_account,reverses_id) VALUES('{ri}','{ro}','wa-01','{rc}',now(),0,'+8801700000000','SYNTHETIC ROLLBACK ONLY','SYNTHETIC REVERSAL','cash',10001,'MANUAL_READY','[]','{rh}','REHEARSAL_CASH','{c}');
    """
     if n==1:reversal_checks+=f"SELECT public.alrifai_post_cash('{ri}','{rh}','{rc}','REHEARSAL_CASH','{c}');\n"+constraint_checkpoint('completed reversal')
     else:reversal_checks+=f"DO $$$$ BEGIN BEGIN PERFORM public.alrifai_post_cash('{ri}','{rh}','{rc}','REHEARSAL_CASH','{c}');RAISE EXCEPTION 'SECOND_REVERSAL_ACCEPTED';EXCEPTION WHEN unique_violation THEN NULL;END;IF EXISTS(SELECT 1 FROM public.cash_postings WHERE instruction_id='{ri}') THEN RAISE EXCEPTION 'FAILED_REVERSAL_PARTIAL_WRITE';END IF; END $$$$;\n".replace('$$$$','$$')+constraint_checkpoint('rejected second reversal')
    checks=f"""
    DO $$ BEGIN
     IF EXISTS(SELECT 1 FROM public.cash_instructions WHERE id='{i}') THEN RAISE EXCEPTION 'REHEARSAL_COLLISION'; END IF;
    END $$;
    INSERT INTO identity_review_candidate.records(collection,id,payload) VALUES('registry','workflow-rehearsal-cash-grant',jsonb_build_object('id','workflow-rehearsal-cash-grant','kind','grant','status','VERIFIED','version',1,'data',jsonb_build_object('id','workflow-rehearsal-cash-grant','personId','{owner}','channel','STAFF','capability','cash.post','scope',jsonb_build_object('accountId','wa-01','domain','ACCOUNTS','chatJid',NULL,'resourceId',NULL),'evidenceRefs',jsonb_build_array('SYNTHETIC_ROLLBACK_ONLY'))));
    INSERT INTO identity_review_candidate.records(collection,id,payload) SELECT collection,'workflow-rehearsal-reverse-grant',jsonb_set(jsonb_set(payload,'{{data,capability}}','"cash.reverse"'),'{{id}}','"workflow-rehearsal-reverse-grant"') FROM identity_review_candidate.records WHERE collection='registry' AND id='workflow-rehearsal-cash-grant';
    SET LOCAL ROLE ir_review_runtime;
    INSERT INTO public.business_commands(id,scope_account,operation_key,payload_hash,action,actor_ref,auth_epoch,expected_resource_version,confirmation_basis,result_ref,result_hash,committed_at)
    SELECT '{c}','wa-01','workflow-rehearsal:post','{ph}','CASH_POST','{owner}',(payload->>'epoch')::bigint,1,'ADMIN_DIRECT','{i}','{ph}',now() FROM identity_review_candidate.records WHERE collection='meta' AND id='epoch';
    INSERT INTO public.cash_instructions(id,operation_id,scope_account,command_id,source_time,block_order,employee_mobile,employee_name,payout_mobile,purpose,method,amount_minor,state,reasons,payload_hash,cash_account)
    VALUES('{i}','{h('operation')}','wa-01','{c}',now(),0,'+8801700000000','SYNTHETIC ROLLBACK ONLY',NULL,'SYNTHETIC ROLLBACK ONLY','cash',10001,'MANUAL_READY','[]','{ph}','REHEARSAL_CASH');
    SELECT public.alrifai_post_cash('{i}','{ph}','{c}','REHEARSAL_CASH');
    {constraint_checkpoint('completed original posting')}
    DO $$ DECLARE first_id text; replay_id text; BEGIN
     SELECT id INTO first_id FROM public.cash_postings WHERE instruction_id='{i}';
     SELECT public.alrifai_post_cash('{i}','{ph}','{c}','REHEARSAL_CASH') INTO replay_id;
     IF first_id IS NULL OR first_id<>replay_id OR (SELECT count(*) FROM public.cash_movements WHERE posting_id=first_id)<>2 OR (SELECT sum(amount_minor) FROM public.cash_movements WHERE posting_id=first_id)<>0 THEN RAISE EXCEPTION 'BALANCE_OR_REPLAY_FAILED'; END IF;
     BEGIN PERFORM public.alrifai_post_cash('{i}',NULL,'{c}','REHEARSAL_CASH');RAISE EXCEPTION 'NULL_HASH_ACCEPTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CASH_EXACT_INSTRUCTION_REQUIRED' THEN RAISE; END IF; END;
    END $$;
    {constraint_checkpoint('completed exact replay and rejected null hash')}
    -- Runtime permission denial: the unprivileged role must fail before the trigger.
    DO $$ BEGIN
     IF current_user<>'ir_review_runtime' OR has_table_privilege(current_user,'public.cash_instructions','UPDATE') THEN
      RAISE EXCEPTION 'RUNTIME_PERMISSION_TEST_CONTEXT_INVALID';
     END IF;
     BEGIN
      UPDATE public.cash_instructions SET amount_minor=1 WHERE id='{i}';
      RAISE EXCEPTION 'RUNTIME_UPDATE_ACCEPTED';
     EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
     END;
     IF (SELECT amount_minor FROM public.cash_instructions WHERE id='{i}') IS DISTINCT FROM 10001::bigint THEN
      RAISE EXCEPTION 'RUNTIME_PERMISSION_DENIAL_CHANGED_ROW';
     END IF;
    END $$;
    -- Registry RLS is a separate zero-row denial, not an UPDATE privilege denial.
    DO $$ DECLARE changed integer; BEGIN
     UPDATE identity_review_candidate.records SET payload=payload WHERE collection='registry' AND id='workflow-rehearsal-cash-grant';
     GET DIAGNOSTICS changed=ROW_COUNT;
     IF changed<>0 THEN RAISE EXCEPTION 'REGISTRY_RLS_BYPASS'; END IF;
    END $$;
    RESET ROLE;
    -- Privileged trigger denial: exercise the real append-only trigger with UPDATE authority.
    DO $$ BEGIN
     IF current_user='ir_review_runtime' OR NOT has_table_privilege(current_user,'public.cash_instructions','UPDATE') THEN
      RAISE EXCEPTION 'APPEND_ONLY_TEST_CONTEXT_INVALID';
     END IF;
     BEGIN
      UPDATE public.cash_instructions SET amount_minor=1 WHERE id='{i}';
      RAISE EXCEPTION 'PRIVILEGED_MUTATION_ACCEPTED';
     EXCEPTION WHEN SQLSTATE '55000' THEN
      IF SQLERRM<>'foundation facts are append-only' THEN RAISE; END IF;
     END;
     IF (SELECT amount_minor FROM public.cash_instructions WHERE id='{i}') IS DISTINCT FROM 10001::bigint THEN
      RAISE EXCEPTION 'APPEND_ONLY_DENIAL_CHANGED_ROW';
     END IF;
    END $$;
    SET LOCAL ROLE ir_review_runtime;
    {reversal_checks}
    RESET ROLE;
    UPDATE identity_review_candidate.records SET payload=jsonb_set(payload,'{{status}}','"REVOKED"') WHERE collection='registry' AND id='workflow-rehearsal-cash-grant';
    SET LOCAL ROLE ir_review_runtime;
    DO $$ BEGIN
     BEGIN PERFORM public.alrifai_post_cash('{i}','{ph}','{c}','REHEARSAL_CASH'); RAISE EXCEPTION 'REVOKED_GRANT_ACCEPTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CASH_CURRENT_AUTHORITY_REQUIRED' THEN RAISE; END IF; END;
    END $$;
    {constraint_checkpoint('rejected revoked-grant replay')}
    RESET ROLE;
    SELECT json_build_object('status','ROLLBACK_REHEARSAL_PASS','syntheticOnly',true,'checks',json_build_array('migration bodies compile','actual runtime RLS','exact-money balanced legs','exact replay','null hash denial','runtime UPDATE permission denial (42501)','privileged append-only trigger denial (55000)','current grant revocation','linked reversal uniqueness','failed reversal atomic rollback'),'concurrentSessions','NOT_RUN','realFinancialPosting',false);
    ROLLBACK;
    """
    return "BEGIN;SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='5s';\n"+migration+"\nSET CONSTRAINTS ALL DEFERRED;\n"+checks

def check_release(root, reviewed_sha256):
    manifest_bytes = (root / MANIFEST).read_bytes()
    checksum = (root / MANIFEST_CHECKSUM).read_text().split()
    if len(checksum) != 2 or checksum[1] != Path(MANIFEST).name or sha256(manifest_bytes) != checksum[0]:
        raise ValueError('REVIEWED_MANIFEST_CHANGED')
    manifest = json.loads(manifest_bytes)
    migration = (root / manifest['migration']['path']).read_bytes()
    if sha256(migration) != reviewed_sha256 or manifest['migration']['sha256'] != reviewed_sha256:
        raise ValueError('REVIEWED_MIGRATION_CHANGED')
    runner_hash = sha256((root / RUNNER).read_bytes())
    source_entry = next(x for x in manifest['sourceChanges'] if x['path'] == 'apps/al-rifai/' + RUNNER)
    if runner_hash != source_entry['sha256'] or runner_hash != manifest['rehearsal']['runnerSha256']:
        raise ValueError('REVIEWED_RUNNER_CHANGED')
    sql = (root / SQL).read_bytes()
    if sha256(sql) != manifest['artifacts'][Path(SQL).name] or sha256(sql) != manifest['rehearsal']['sqlSha256']:
        raise ValueError('REVIEWED_SQL_CHANGED')
    if sql != build_sql(migration.decode()).encode():
        raise ValueError('REVIEWED_SQL_GENERATOR_MISMATCH')
    return sql, manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare-only', action='store_true', help='Generate SQL locally; never execute SQL.')
    mode.add_argument('--check-only', action='store_true', help='Verify reviewed files/checksums locally; never execute SQL.')
    parser.add_argument('--reviewed-sha256', help='Exact reviewed migration SHA256; required for check/execution.')
    args = parser.parse_args(argv)
    if args.prepare_only:
        migration = (ROOT / 'db/migrations/0012_business_workflows.sql').read_bytes()
        if args.reviewed_sha256 and sha256(migration) != args.reviewed_sha256:
            raise ValueError('REVIEWED_MIGRATION_CHANGED')
        sql = build_sql(migration.decode()).encode()
        (ROOT / SQL).write_bytes(sql)
        print(json.dumps({'status': 'PREPARED_NOT_EXECUTED', 'sqlSha256': sha256(sql)}))
        return
    if not args.reviewed_sha256:
        parser.error('--reviewed-sha256 is required for check/execution')
    sql, manifest = check_release(ROOT, args.reviewed_sha256)
    if args.check_only:
        print(json.dumps({'status': 'OFFLINE_CHECKSUMS_PASS_NOT_EXECUTED',
                          'migrationSha256': args.reviewed_sha256,
                          'sqlSha256': sha256(sql),
                          'runnerSha256': manifest['rehearsal']['runnerSha256'],
                          'manifestSha256': sha256((ROOT / MANIFEST).read_bytes())}))
        return
    # Execute the reviewed artifact bytes, after verifying generator parity.
    result = subprocess.run(
        ['docker', 'exec', '-i', 'vps-infra-postgres-1', 'sh', '-c',
         'exec psql -U "$POSTGRES_USER" -d alrifai -X -qAt -v ON_ERROR_STOP=1'],
        input=sql.decode(), text=True, capture_output=True)
    if result.returncode:
        print('ROLLBACK_REHEARSAL_FAILED: transaction closed without COMMIT; private SQL diagnostics withheld.')
        raise SystemExit(result.returncode)
    lines = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
    if not lines or lines[-1].get('status') != 'ROLLBACK_REHEARSAL_PASS':
        raise ValueError('REHEARSAL_RESULT_MISSING')
    (ROOT / 'data/workflow-sql-rehearsal.json').write_text(json.dumps(lines[-1], indent=2) + '\n')
    print(json.dumps(lines[-1]))


if __name__ == '__main__':
    main()
