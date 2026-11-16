import assert from 'node:assert/strict';
import {createPool} from '../db/postgres.mjs';
import {migrate,importEvidence,verifyEvidence,expectedSnapshots} from '../scripts/database.mjs';
const pool=createPool({readOnly:false}),client=await pool.connect();
const schema='alrifai_phase1_validation_'+Date.now();
try{
 await client.query('BEGIN');
 await client.query('CREATE SCHEMA '+schema);
 await client.query('SET LOCAL search_path TO '+schema);
 await migrate(client);await migrate(client);
 const tables=(await client.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[schema])).rows.map(r=>r.tablename).sort();
 assert.deepEqual(tables,['alrifai_schema_migrations','datasets','programs','reviews','site_cash_archive','site_operation_notes','site_payment_drafts','site_settlement_drafts','site_source_snapshots'].sort());
 assert.equal(await importEvidence(client),54);assert.equal(await importEvidence(client),54);assert.equal(await verifyEvidence(client),54);
 const rows=(await client.query('SELECT * FROM site_source_snapshots')).rows;
 assert.equal(rows.length,54);for(const e of expectedSnapshots())assert.deepEqual(rows.find(r=>r.id===e.id),e);
 const triggers=(await client.query("SELECT tgname FROM pg_trigger WHERE tgrelid='site_source_snapshots'::regclass AND NOT tgisinternal")).rows.map(r=>r.tgname);assert.equal(triggers.length,2);
 // Insert-only round-trip of legacy program semantics in the rolled-back schema.
 await client.query('INSERT INTO programs (id,"createdAt",details,revision,"masterMobile") VALUES ($1,$2,$3,$4,$5)',['phase1-test','test-date','{"source":"synthetic"}',3,'001234']);
 const program=(await client.query('SELECT * FROM programs WHERE id=$1',['phase1-test'])).rows[0];assert.equal(program.revision,3);assert.equal(program.masterMobile,'001234');assert.equal(program.details,'{"source":"synthetic"}');
 await client.query('ROLLBACK');
 assert.equal((await client.query('SELECT count(*)::integer AS n FROM pg_namespace WHERE nspname=$1',[schema])).rows[0].n,0);
 console.log('PostgreSQL migration replay, 54 exact immutable snapshots, idempotent import and rollback isolation passed. No test schema remains.');
}catch{await client.query('ROLLBACK');console.error('Database validation failed; rolled back; sensitive values suppressed');process.exitCode=1;}finally{client.release();await pool.end();}
