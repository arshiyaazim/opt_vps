"""Actual runtime-login program privilege/history check; synthetic SQL rolls back.
This is not operational request/confirmation acceptance. No financial writes.
"""
from pathlib import Path
import subprocess,json
r=Path('/opt/vps/apps/al-rifai')
script=r"""const fs=require('fs'),pg=require('pg');
(async()=>{const config=JSON.parse(fs.readFileSync('/etc/vps/apps/al-rifai/review-host.json','utf8'));
const c=new pg.Client({host:config.databaseHost,database:'alrifai',user:'ir_review_runtime',password:fs.readFileSync('/etc/vps/apps/al-rifai/auth/pg-password','utf8').trim(),options:'-c statement_timeout=5000 -c search_path=public'});await c.connect();const checks=[];
try{await c.query('BEGIN');
const who=(await c.query('SELECT current_user AS role')).rows[0].role;if(who!=='ir_review_runtime')throw Error('WRONG_ROLE');
await c.query('SELECT id FROM public.programs WHERE false FOR UPDATE');checks.push('runtime canonical SELECT FOR UPDATE');
const permissions=(await c.query("SELECT has_table_privilege(current_user,'public.programs','DELETE') AS del,has_table_privilege(current_user,'public.programs','TRUNCATE') AS truncate,has_table_privilege(current_user,'public.cash_postings','INSERT') AS finance,has_column_privilege(current_user,'public.programs','id','UPDATE') AS id_update,has_column_privilege(current_user,'public.programs','source','UPDATE') AS source_update,has_column_privilege(current_user,'public.programs','notes','UPDATE') AS notes_update,has_column_privilege(current_user,'public.programs','duplicateOf','UPDATE') AS duplicate_update,has_column_privilege(current_user,'public.programs','createdAt','UPDATE') AS created_update,pg_has_role(current_user,'alrifai_app','MEMBER') AS owner_member")).rows[0];
if(Object.values(permissions).some(Boolean))throw Error('BOUNDARY_EXPANDED');checks.push('no forbidden columns/delete/truncate/financial INSERT/owner membership');
const id='r1_boundary_rollback_only';
if((await c.query('SELECT id FROM public.programs WHERE id=$1',[id])).rows.length)throw Error('FIXTURE_COLLISION');
const ledger={schemaVersion:'alrifai-program-command-v1',authority:'ALRIFAI_OPERATIONAL',scope:{accountId:'wa-01',chatJid:'SQL_BOUNDARY_CHECK_ONLY'},allocation:{sourceTimestamp:'2026-10-15T00:00:00.000Z'},primaryReviewId:'ROLLBACK_ONLY',events:[{id:'ROLLBACK_ONLY_1'}]};
const columns=['motherVessel','lighterVessel','masterMobile','destination','escortName','escortMobile','startDate','endDate','shift','status','details','revision'];
const values=['','','','','','','','','','Draft',JSON.stringify({programCommand:ledger}),1];
await c.query('INSERT INTO public.programs(id,'+columns.map(x=>'"'+x+'"').join(',')+',source,notes,"duplicateOf","createdAt") VALUES('+Array.from({length:17},(_,i)=>'$'+(i+1)).join(',')+') ON CONFLICT(id) DO NOTHING RETURNING *',[id,...values,'ROLLBACK_ONLY','','','2026-10-15T00:00:00.000Z']);checks.push('exact 17-column canonical INSERT');
await c.query('SAVEPOINT history_denial');
try{await c.query('UPDATE public.programs SET details=$1 WHERE id=$2',[JSON.stringify({programCommand:{...ledger,events:[]}}),id]);throw Error('HISTORY_ERASURE_ACCEPTED');}
catch(e){await c.query('ROLLBACK TO SAVEPOINT history_denial');if(e.message!=='PROGRAM_COMMAND_HISTORY_IMMUTABLE')throw e;checks.push('live history trigger rejects event erasure');}
ledger.events.push({id:'ROLLBACK_ONLY_2'});values[10]=JSON.stringify({programCommand:ledger});values[11]=2;
const result=await c.query('UPDATE public.programs SET '+columns.map((x,i)=>'"'+x+'"=$'+(i+1)).join(',')+' WHERE id=$13 AND revision=$14 RETURNING id,revision',[...values,id,1]);if(result.rows.length!==1||result.rows[0].revision!==2)throw Error('EXACT_UPDATE_FAILED');checks.push('exact 12-column UPDATE with append and revision CAS');
const replay=await c.query('UPDATE public.programs SET revision=3 WHERE id=$1 AND revision=1 RETURNING id',[id]);if(replay.rows.length)throw Error('STALE_CAS_ACCEPTED');checks.push('stale CAS writes zero rows');
await c.query('ROLLBACK');if((await c.query('SELECT id FROM public.programs WHERE id=$1',[id])).rows.length)throw Error('ROLLBACK_FAILED');checks.push('fixture absent after rollback');
console.log(JSON.stringify({status:'RUNTIME_BOUNDARY_PASS',runtimeRole:who,checks,syntheticSqlFixtureOnly:true,operationalConfirmationAcceptance:false,financialWrites:0,committedFixtures:0}));
}finally{await c.query('ROLLBACK');await c.end();}})().catch(e=>{console.error(e.message);process.exit(1)});
"""
p=subprocess.run(['docker','exec','-i','-w','/app','al-rifai-app-1','node'],input=script,text=True,capture_output=True)
if p.returncode:raise RuntimeError(p.stderr[:1000])
result=json.loads(p.stdout);(r/'data/workflow-r1-runtime-boundary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
