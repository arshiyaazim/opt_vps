import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {StoredHistoryMcp} from '../candidates/identity-review/stored-history-mcp.ts';

const binding={
 accountId:'wa-01',
 streamId:'00000000-0000-4000-8000-000000000001',
 pairedJid:'archive-owner@s.whatsapp.net',
 pairedLid:'archive-owner@lid',
};
const chatJid='120363426895117693@g.us';
const message={
 accountId:'wa-01',chatJid,id:'fixture-message-1',sender:'fixture-sender@lid',
 sourceTimestamp:'2026-10-15T06:03:41.123456+06:00',text:'fixture text',
 direction:'INCOMING',deletedAt:null,messageType:'text',quotedMessageId:null,media:null,
};
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`
 :value&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
 :JSON.stringify(value);
const page={
 version:'archive-history-page-v1',accountId:'wa-01',nativeScope:binding,chatJid,
 previousAfter:'0',nextAfter:'1',complete:true,
 records:[{rowid:'1',messageId:message.id,state:'VISIBLE',deletedAt:null,
  sourceHash:createHash('sha256').update(canonical(message)).digest('hex'),message}],
};

test('reads and validates a bounded archive page through the archive tool contract',async()=>{
 const calls=[];
 const client=new StoredHistoryMcp(async(...args)=>{calls.push(args);return page;},{'wa-01':binding});
 const result=await client.readArchivePage('wa-01',chatJid,'0');
 assert.equal(result.version,'archive-history-page-v1');
 assert.equal(result.records[0].message.sourceTimestamp,message.sourceTimestamp);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'wa-01');
 assert.equal(calls[0][1],'list_archive_messages');
 assert.deepEqual(calls[0][2],{chat_jid:chatJid,after_rowid:'0',limit:10});
});

test('rejects an unbound account or malformed cursor before calling the source',async()=>{
 let calls=0;
 const client=new StoredHistoryMcp(async()=>{calls++;return page;},{'wa-01':binding});
 await assert.rejects(client.readArchivePage('wa-02',chatJid,'0'),/HISTORY_NATIVE_SCOPE_MISMATCH/);
 await assert.rejects(client.readArchivePage('wa-01',chatJid,'00'),/ARCHIVE_CURSOR_INVALID/);
 assert.equal(calls,0);
});

test('fails closed when archive page provenance does not match the configured binding',async()=>{
 const client=new StoredHistoryMcp(async()=>({...page,nativeScope:{...binding,pairedJid:'other@s.whatsapp.net'}}),{'wa-01':binding});
 await assert.rejects(client.readArchivePage('wa-01',chatJid,'0'),/ARCHIVE_PAGE_CONTRACT_INVALID/);
});

test('maps source failures to an explicit unavailable error',async()=>{
 const client=new StoredHistoryMcp(async()=>{throw Error('fixture transport failure');},{'wa-01':binding});
 await assert.rejects(client.readArchivePage('wa-01',chatJid,'0'),/ARCHIVE_READER_UNAVAILABLE/);
});
