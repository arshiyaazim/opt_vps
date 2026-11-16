import assert from 'node:assert/strict';
import {createPool} from '../db/postgres.mjs';
import {verifyEvidence} from './database.mjs';
import {createHash} from 'node:crypto';
const pool=createPool(),client=await pool.connect();
try{
 assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 await client.query('BEGIN READ ONLY');
 const tables=['programs','reviews','datasets','site_cash_archive','site_operation_notes','site_payment_drafts','site_settlement_drafts','site_source_snapshots','alrifai_schema_migrations'];
 const hash=createHash('sha256'),counts={};
 for(const table of tables){const rows=(await client.query('SELECT * FROM '+table+' ORDER BY id')).rows;counts[table]=rows.length;hash.update(table).update(JSON.stringify(rows));}
 assert.equal(await verifyEvidence(client),54);
 for(const table of tables.slice(0,7))assert.equal(counts[table],0);
 assert.equal(counts.alrifai_schema_migrations,6);
 await client.query('COMMIT');
 console.log(JSON.stringify({readOnly:true,counts,fingerprint:hash.digest('hex')}));
}catch{await client.query('ROLLBACK');console.error('State verification failed; sensitive values suppressed');process.exitCode=1;}finally{client.release();await pool.end();}
