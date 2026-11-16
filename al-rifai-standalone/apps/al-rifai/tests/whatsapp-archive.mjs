import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ingestArchivePage,validateArchivePage} from '../lib/whatsapp-archive.ts';

const scope={account:'wa-01',bindingId:'fixture-binding'};
const expected={accountId:'wa-01',chatJid:'120363426895117693@g.us',nativeScope:scope};
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`
 :value&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`
 :JSON.stringify(value);
const message={
 accountId:expected.accountId,chatJid:expected.chatJid,id:'fixture-message-1',
 sender:'fixture-sender@lid',sourceTimestamp:'2026-10-15T06:03:41.123456+06:00',
 text:'fixture text',direction:'INCOMING',deletedAt:null,messageType:'text',media:null,
 quotedMessageId:'fixture-quoted-message',
};
const sourceHash=createHash('sha256').update(stable(message)).digest('hex');
const page=(patch={})=>({
 version:'archive-history-page-v1',accountId:expected.accountId,nativeScope:scope,
 chatJid:expected.chatJid,previousAfter:'0',nextAfter:'1',complete:true,
 records:[{rowid:'1',messageId:message.id,state:'VISIBLE',deletedAt:null,sourceHash,message}],
 ...patch,
});

test('validates exact source timestamps, native scope, and ordered cursor',()=>{
 const value=validateArchivePage(page(),expected);
 assert.equal(value.records[0].message.sourceTimestamp,message.sourceTimestamp);
 assert.equal(value.nextAfter,'1');
});

test('rejects a scope mismatch, malformed hash, and non-monotonic cursor',()=>{
 assert.throws(()=>validateArchivePage(page({accountId:'wa-02'}),expected),/scope or envelope/);
 assert.throws(()=>validateArchivePage(page({records:[{...page().records[0],sourceHash:'0'.repeat(64)}]}),expected),/source hash/);
 assert.throws(()=>validateArchivePage(page({nextAfter:'0'}),expected),/cursor/);
 assert.throws(()=>validateArchivePage(page({records:[{...page().records[0],rowid:'0'}]}),expected),/out of order/);
});

test('redacted records cannot carry message content or media',()=>{
 const hidden={rowid:'1',messageId:message.id,state:'SUPPRESSED',deletedAt:null,sourceHash:null,message:null};
 assert.equal(validateArchivePage(page({records:[hidden]}),expected).records[0].message,null);
 assert.throws(()=>validateArchivePage(page({
  records:[{...hidden,message}],
 }),expected),/must not expose/);
});

test('ingests a page transactionally with idempotent keys and a resumable checkpoint',async()=>{
 const calls=[];
 const pool={connect:async()=>({
  query:async(sql,values)=>{calls.push({sql,values});return {
   rows:sql.includes('SELECT after_rowid')?[{after_rowid:'0'}]
    :sql.includes('INSERT INTO public.whatsapp_messages_original')?[{id:1}]:[],
  };},
  release:()=>calls.push({release:true}),
 })};
 const result=await ingestArchivePage(pool,page(),expected,'2026-10-19T00:00:00.000Z');
 assert.deepEqual(result,{stored:1,nextAfter:'1',complete:true});
 assert.equal(calls[0].sql,'BEGIN');
 assert.match(calls.find(c=>c.sql?.includes('whatsapp_archive_messages')).sql,/ON CONFLICT \(account_id,chat_jid,message_id\)/);
 assert.equal(calls.find(c=>c.sql?.includes('whatsapp_archive_messages')).values[7],message.sourceTimestamp);
 assert.equal(JSON.parse(calls.find(c=>c.sql?.includes('whatsapp_archive_messages')).values[12]).quotedMessageId,message.quotedMessageId);
 assert.match(calls.find(c=>c.sql?.includes('INSERT INTO public.whatsapp_messages_processing')).sql,/'archive','processed'/);
 assert.match(calls.find(c=>c.sql?.includes('GREATEST(whatsapp_archive_sync_state.after_rowid')).sql,/GREATEST/);
 assert.equal(calls.at(-2).sql,'COMMIT');
 assert.deepEqual(calls.at(-1),{release:true});
});

test('rolls back all archive writes when a page write fails',async()=>{
 const calls=[];
 const pool={connect:async()=>({
  query:async(sql)=>{calls.push(sql);if(sql.includes('whatsapp_archive_messages'))throw new Error('fixture failure');return {rows:sql.includes('SELECT after_rowid')?[{after_rowid:'0'}]:[]};},
  release:()=>calls.push('RELEASE'),
 })};
 await assert.rejects(ingestArchivePage(pool,page(),expected),/fixture failure/);
 assert.equal(calls.at(-2),'ROLLBACK');
 assert.equal(calls.at(-1),'RELEASE');
});

test('rejects a page that would skip an unarchived source range',async()=>{
 const pool={connect:async()=>({
  query:async(sql)=>({rows:sql.includes('SELECT after_rowid')?[{after_rowid:'0'}]:[]}),
  release:()=>{},
 })};
 const gap=page({previousAfter:'1',nextAfter:'2',records:[{...page().records[0],rowid:'2'}]});
 await assert.rejects(ingestArchivePage(pool,gap,expected),/does not continue/);
});
