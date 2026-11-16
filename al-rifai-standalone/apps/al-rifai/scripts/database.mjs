import {createPool} from '../db/postgres.mjs';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function evidence(name){
 const manifest=JSON.parse(readFileSync(join(root,'docs/evidence-checksums.json'),'utf8'));
 const bytes=readFileSync(join(process.env.ALRIFAI_EVIDENCE_DIR || '/var/lib/vps/al-rifai/evidence',name));
 if(!manifest[name] || sha(bytes)!==manifest[name].sha256)throw new Error('Evidence checksum mismatch: '+name);
 return JSON.parse(bytes.toString('utf8'));
}
export async function migrate(client){
 await client.query('SELECT pg_advisory_xact_lock(716001)');
 await client.query('CREATE TABLE IF NOT EXISTS alrifai_schema_migrations (id text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of readdirSync(join(root,'db/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  const bytes=readFileSync(join(root,'db/migrations',name)),hash=sha(bytes);
  const applied=await client.query('SELECT sha256 FROM alrifai_schema_migrations WHERE id=$1',[name]);
  if(applied.rows.length){if(applied.rows[0].sha256!==hash)throw new Error('Applied migration checksum changed');continue;}
  await client.query(bytes.toString('utf8'));
  await client.query('INSERT INTO alrifai_schema_migrations (id,sha256) VALUES ($1,$2)',[name,hash]);
 }
}
export function expectedSnapshots(){
 return ['conversation-snapshot.json','accounts-snapshot.json'].flatMap(name=>{
  const snapshot=evidence(name);
  if(name==='accounts-snapshot.json'){
   const proof=snapshot.summary.identityProof;
   if(proof.confirmed!==true || proof.accountantContactConfirmed!==true || proof.conversationType!=='direct' || proof.sourceSha256!==snapshot.summary.sourceSha256)throw new Error('Accounts identity proof mismatch');
   const original=evidence('conversation-snapshot.json');
   if(original.summary.files.find(f=>f.key==='mamun')?.sha256!==snapshot.summary.sourceSha256)throw new Error('Accounts source mismatch');
  }
  return [...snapshot.chunks.map(c=>({id:c.id,datasetId:snapshot.datasetId,kind:c.kind,payload:c.payload,contentHash:c.contentHash})),{id:snapshot.datasetId+':complete',datasetId:snapshot.datasetId,kind:'manifest',payload:JSON.stringify(snapshot.summary),contentHash:String(snapshot.chunks.length)}];
 });
}
export async function importEvidence(client){
 await client.query('SELECT pg_advisory_xact_lock(716002)');
 const rows=expectedSnapshots();
 for(const row of rows){
  await client.query('INSERT INTO site_source_snapshots (id,"datasetId",kind,payload,"contentHash") VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',[row.id,row.datasetId,row.kind,row.payload,row.contentHash]);
  const actual=(await client.query('SELECT * FROM site_source_snapshots WHERE id=$1',[row.id])).rows[0];
  if(JSON.stringify(actual)!==JSON.stringify(row) && Object.keys(row).some(k=>actual[k]!==row[k]))throw new Error('Existing immutable evidence differs; no overwrite performed');
 }
 return rows.length;
}
export async function verifyEvidence(client){
 const expected=expectedSnapshots();
 for(const row of expected){const actual=(await client.query('SELECT * FROM site_source_snapshots WHERE id=$1',[row.id])).rows[0];if(!actual || Object.keys(row).some(k=>actual[k]!==row[k]))throw new Error('Stored evidence differs');}
 for(const name of ['accounts-snapshot.json','conversation-snapshot.json','chat-archive.json','operations.json','recovered-programs.json'])evidence(name);
 return expected.length;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const command=process.argv[2];if(!['migrate','import','verify'].includes(command))throw new Error('Expected migrate, import or verify');
 const pool=createPool({readOnly:command==='verify'}),client=await pool.connect();
 try{await client.query('BEGIN');if(command==='migrate')await migrate(client);if(command==='import')console.log('Verified imported snapshots:',await importEvidence(client));if(command==='verify')console.log('Verified stored snapshots:',await verifyEvidence(client));await client.query('COMMIT');console.log(command+' completed');}
 catch{await client.query('ROLLBACK');console.error(command+' failed; transaction rolled back; sensitive values suppressed');process.exitCode=1;}
 finally{client.release();await pool.end();}
}
