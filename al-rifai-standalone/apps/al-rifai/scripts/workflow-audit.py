from pathlib import Path
import json,subprocess,hashlib
r=Path('/opt/vps/apps/al-rifai')
sql="""BEGIN READ ONLY;
SELECT json_build_object('at',now(),'ledger',(SELECT json_agg(x) FROM (SELECT id,sha256 FROM public.alrifai_schema_migrations ORDER BY id) x),'guard',(SELECT json_build_object('securityDefiner',prosecdef,'searchPath',proconfig,'publicExecute',has_function_privilege('public','public.alrifai_foundation_verified_actor()','execute')) FROM pg_proc WHERE oid='public.alrifai_foundation_verified_actor()'::regprocedure),'counts',json_build_object('extractions',(SELECT count(*) FROM public.domain_events WHERE resource_kind='WHATSAPP_EXTRACTION'),'canonicalPrograms',(SELECT count(*) FROM public.programs),'archiveCash',(SELECT count(*) FROM public.site_cash_archive),'sourceRefs',(SELECT count(*) FROM public.source_refs),'snapshots',(SELECT count(*) FROM public.site_source_snapshots)),'registry',(SELECT json_agg(x) FROM (SELECT payload->>'kind' AS kind,count(*) AS count FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'status'='VERIFIED' GROUP BY payload->>'kind') x));
COMMIT;
"""
p=subprocess.run(['docker','exec','-i','vps-infra-postgres-1','sh','-c','exec psql -U "$POSTGRES_USER" -d alrifai -X -qAt -v ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True,check=True)
a=json.loads(p.stdout);a['ledgerMatchesCanonicalSource']=all(hashlib.sha256((r/'db/migrations'/x['id']).read_bytes()).hexdigest()==x['sha256'] for x in a['ledger']);assert a['ledgerMatchesCanonicalSource']
names=['al-rifai-app-1','vps-whatsapp-wa-01-cap4-20261011','vps-whatsapp-wa-02-cap4-20261011','vps-infra-postgres-1']
a['services']={v['Name'].lstrip('/'):{'id':v['Id'],'image':v['Image'],'started':v['State']['StartedAt'],'running':v['State']['Running']} for v in json.loads(subprocess.check_output(['docker','inspect',*names]))}
a['migration0012Applied']=False;a['financialPostingActivation']=False
(r/'data/workflow-runtime.json').write_text(json.dumps(a,indent=2)+'\n');print(json.dumps({'ledger':len(a['ledger']),'sourceChecksumsMatch':True,'counts':a['counts'],'guard':a['guard']}))
