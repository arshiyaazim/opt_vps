"""Read-only actual-runtime-role contracts for retained v1/v2 audit facts."""
from pathlib import Path
import hashlib,json,subprocess,tarfile
r=Path('/opt/vps/apps/al-rifai');path='apps/al-rifai/candidates/identity-review/history-extractions.ts'
with tarfile.open(r/'data/workflow-before.tar.gz') as t: old=t.extractfile(path).read().decode()
new=(Path('/opt/vps')/path).read_text()
# Follow-up source edits are not the deployed immutable candidate.
if hashlib.sha256(new.encode()).hexdigest()!='a8f1ed39143f54fcf6d97ab17b3eb622695289f68e16c24f60b8feecc1525d62':
    with tarfile.open(r/'data/workflow-r1-followup-source-before.tar.gz') as t:new=t.extractfile(path).read().decode()
assert hashlib.sha256(new.encode()).hexdigest()=='a8f1ed39143f54fcf6d97ab17b3eb622695289f68e16c24f60b8feecc1525d62'
def declaration(source):
    return source[source.index('const date='):source.index('export type HistorySourceReference')].replace('export const','const')+'\nreturn assertion;'
script="""const fs=require('fs'),pg=require('pg'),{z}=require('zod');
(async()=>{
const config=JSON.parse(fs.readFileSync('/etc/vps/apps/al-rifai/review-host.json','utf8'));
const client=new pg.Client({host:config.databaseHost,database:'alrifai',user:'ir_review_runtime',password:fs.readFileSync('/etc/vps/apps/al-rifai/auth/pg-password','utf8').trim(),options:'-c statement_timeout=5000 -c search_path=public'});
await client.connect();try{
await client.query('BEGIN READ ONLY');
const role=(await client.query('SELECT current_user AS role')).rows[0].role;
if(role!=='ir_review_runtime')throw Error('WRONG_RUNTIME_ROLE');
const oldParser=new Function('z',OLD_DECLARATION)(z),newParser=new Function('z',NEW_DECLARATION)(z);
const rows=(await client.query("SELECT assertion FROM public.domain_events WHERE resource_kind='WHATSAPP_EXTRACTION' AND event_type='MESSAGE_EXTRACTED'")).rows;
const counts={v1:0,v2:0,legacyMixedRejected:0,candidateAccepted:0};
for(const {assertion:a} of rows){
if(a.version==='history-extraction-v1'){counts.v1++;if(!oldParser.safeParse(a).success)throw Error('LEGACY_V1_FAILURE');}
else if(a.version==='history-extraction-v2'){counts.v2++;if(oldParser.safeParse(a).success)throw Error('LEGACY_UNEXPECTED_V2_ADMISSION');counts.legacyMixedRejected++;}
else throw Error('UNKNOWN_STORED_VERSION');
if(!newParser.safeParse(a).success)throw Error('CANDIDATE_CONTRACT_FAILURE');counts.candidateAccepted++;
if(newParser.safeParse({...a,posted:true}).success)throw Error('INVALID_POSTED_FACT_ACCEPTED');
}
if(!counts.v1||!counts.v2)throw Error('BOTH_RETAINED_VERSIONS_REQUIRED');
const legacyProjection=(await client.query("SELECT assertion FROM public.domain_events WHERE resource_kind='WHATSAPP_EXTRACTION' AND event_type='MESSAGE_EXTRACTED' AND assertion->>'version'='history-extraction-v1'")).rows;
if(!legacyProjection.every(r=>oldParser.safeParse(r.assertion).success))throw Error('VERSIONED_PROJECTION_FAILURE');
console.log(JSON.stringify({status:'CONTRACT_PASS',runtimeRole:role,counts,legacyVersionConstrainedProjection:legacyProjection.length,invalidPostedFactRejected:true,databaseWrites:false,candidateImage:'sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097',oldImageMixedReader:'INCOMPATIBLE_DO_NOT_USE_AS_OPERATIONAL_ROLLBACK',compatibleRecoveryImage:'sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097'}));
}finally{await client.query('ROLLBACK');await client.end();}
})().catch(e=>{console.error(e.message);process.exit(1)});
""".replace('OLD_DECLARATION',json.dumps(declaration(old))).replace('NEW_DECLARATION',json.dumps(declaration(new)))
p=subprocess.run(['docker','exec','-i','-w','/app','al-rifai-app-1','node'],input=script,text=True,capture_output=True,check=True)
result=json.loads(p.stdout);result['legacyReaderSha256']=hashlib.sha256(old.encode()).hexdigest();result['candidateReaderSha256']=hashlib.sha256(new.encode()).hexdigest()
(r/'data/workflow-r1-reader-contract.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
