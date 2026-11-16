import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {ingestArchivePage,ingestCompatibilityPage} from '../lib/whatsapp-archive.ts';
import {CASH_SCOPE_CHATS} from '../lib/cash-scope.ts';
import {OWNER_ESCORT_CLIENTS} from '../lib/escort-register.mjs';
import {parseLivePaymentBlocks} from '../candidates/identity-review/live-cash.ts';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {compatibilityRecord,pairedJidFromIdentity,pairedJidFromScope} from '../scripts/message-ingestion-worker.ts';

function fixture({failOriginal=false,seededProcessing=[],contacts=[
 {id:OWNER_ESCORT_CLIENTS[0].id,account_id:'wa-01',phone:OWNER_ESCORT_CLIENTS[0].phone,active:true},
],aliases=[],groupAuthorizations=[]}={}){
 const calls=[],originals=new Map(),originalValues=new Map(),events=new Set();
 const processing=new Map(seededProcessing.map(row=>[
  `${row.originalId}|${row.domain}`,{...row},
 ]));
 let pageNumber=0,nextId=1,afterRowid='0';
 const client={
  async query(sql,values=[]){
   const query=String(sql).replace(/\s+/g,' ').trim();
   calls.push({query,values});
   if(query==='BEGIN'||query==='COMMIT'||query==='ROLLBACK')return {rows:[],rowCount:0};
   if(query.includes("SELECT to_regclass('public.escort_client_contacts')"))return {rows:[{
    escort_contacts:true,whatsapp_contacts:true,group_authorizations:true,
   }],rowCount:1};
   if(query.includes('SELECT id,account_id,phone,active FROM public.escort_client_contacts'))return {rows:contacts,rowCount:contacts.length};
   if(query.includes('SELECT phone_number,jid FROM public.whatsapp_contacts'))return {rows:aliases,rowCount:aliases.length};
   if(query.includes('SELECT account_id,group_jid,participant_jid,client_contact_id,active FROM public.escort_client_group_authorizations'))return {rows:groupAuthorizations,rowCount:groupAuthorizations.length};
   if(query.includes('SELECT page_number FROM public.whatsapp_ingestion_cursors'))return {rows:[{page_number:pageNumber}],rowCount:1};
   if(query.includes('SELECT after_rowid::text AS after_rowid FROM public.whatsapp_archive_sync_state'))return {rows:[{after_rowid:afterRowid}],rowCount:1};
   if(query.includes('INSERT INTO public.whatsapp_message_source_events')){
    const key=values.slice(0,5).join('|');
    const before=events.size;events.add(key);
    return {rows:[],rowCount:Number(events.size>before)};
   }
   if(query.includes('INSERT INTO public.whatsapp_messages_original')){
    if(failOriginal)throw new Error('INJECTED_ORIGINAL_INSERT_FAILURE');
    const key=[values[0],values[1],values[3]].join('|');
    if(originals.has(key))return {rows:[],rowCount:0};
    const id=nextId++;originals.set(key,id);originalValues.set(key,values.slice());
    return {rows:[{id}],rowCount:1};
   }
   if(query.includes('SELECT id FROM public.whatsapp_messages_original')){
    const key=values.join('|');
    const id=originals.get(key);
    return {rows:id===undefined?[]:[{id}],rowCount:id===undefined?0:1};
   }
   if(query.includes('INSERT INTO public.whatsapp_messages_processing')){
    const domains=[...query.matchAll(/\(\$1,'(archive|cash|vessel)'/g)].map(match=>match[1]);
    if(query.includes("VALUES ($1,$2,'pending'")&&['cash','vessel'].includes(values[1]))domains.push(values[1]);
    let inserted=0;
    for(const domain of domains){
     const key=`${values[0]}|${domain}`;
     if(!processing.has(key)){
      processing.set(key,{originalId:values[0],domain,status:domain==='archive'?'processed':'pending'});
      inserted++;
     }
    }
    return {rows:[],rowCount:inserted};
   }
   if(query.includes('UPDATE public.whatsapp_ingestion_cursors')){
    pageNumber=values[3];
    return {rows:[],rowCount:1};
   }
   if(query.includes('INSERT INTO public.whatsapp_archive_sync_state')
     &&query.includes('GREATEST(whatsapp_archive_sync_state.after_rowid')){
    if(BigInt(values[2])>BigInt(afterRowid))afterRowid=values[2];
    return {rows:[],rowCount:1};
   }
   return {rows:[],rowCount:1};
  },
  release(){},
 };
 return {
  pool:{connect:async()=>client},calls,originals,originalValues,events,processing,
  get pageNumber(){return pageNumber;},
 };
}

const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`
 :value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
 :JSON.stringify(value);
function archivePage(accountId,chatJid,messageId){
 const nativeScope={accountId,pairedJid:'8801880446111@s.whatsapp.net'};
 const message={
  accountId,chatJid,id:messageId,sender:'8801670535255@s.whatsapp.net',
  sourceTimestamp:'2026-10-20T08:00:00.000Z',text:'Synthetic archive fixture',
  direction:'INCOMING',deletedAt:null,messageType:'text',quotedMessageId:null,media:null,
 };
 const sourceHash=createHash('sha256').update(stable(message)).digest('hex');
 return {
  version:'archive-history-page-v1',accountId,nativeScope,chatJid,
  previousAfter:'0',nextAfter:'1',complete:true,
  records:[{rowid:'1',messageId,state:'VISIBLE',deletedAt:null,sourceHash,message}],
 };
}

const sourceRecord={
 accountId:'wa-02',chatJid:'8801670535255@s.whatsapp.net',messageId:'native-message-1',
 senderJid:'8801670535255@s.whatsapp.net',senderPhone:null,senderPushName:'Source push name',
 receiverJid:null,receiverPhone:null,
 contactName:null,groupName:null,sourceTimestamp:'2026-10-20T08:00:00.000Z',
 direction:'INCOMING',messageType:'text',text:'Source message body',mediaRef:null,
 rawContent:{provider:'whatsapp-mcp',tool:'list_messages',message:{
  id:'native-message-1',chat_jid:'8801670535255@s.whatsapp.net',
  sender_jid:'8801670535255@s.whatsapp.net',content:'Source message body',
  timestamp:'2026-10-20T08:00:00.000Z',is_from_me:false,push_name:'Source push name',
 }},
};

function referenceExportBodies(path){
 const messages=[];
 let current=null;
 for(const line of readFileSync(path,'utf8').split(/\r?\n/)){
  const separator=line.indexOf(' - ');
  if(separator>=0&&/^\d{1,2}\/\d{1,2}\/\d{2,4},\s/.test(line.slice(0,separator))){
   const content=line.slice(separator+3);
   const senderSeparator=content.indexOf(': ');
   current=senderSeparator<0?null:content.slice(senderSeparator+2);
   if(current!==null)messages.push(current);
  }else if(current!==null){
   messages[messages.length-1]+=`\n${line}`;
  }
 }
 return messages;
}

test('uploaded WhatsApp exports remain read-only parser reference fixtures',t=>{
 const escortPath=new URL('../../../import/whatsapp-reference/WhatsApp Chat with Escort Hridoy (2).txt',import.meta.url);
 const cashPath=new URL('../../../import/whatsapp-reference/WhatsApp Chat with Mamun Vai Bkash Nagod (3).txt',import.meta.url);
 if(!existsSync(escortPath)||!existsSync(cashPath)){
  t.skip('Owner-supplied reference exports are not present in this checkout.');
  return;
 }
 const escortBodies=referenceExportBodies(escortPath);
 const cashBodies=referenceExportBodies(cashPath);
 assert.ok(escortBodies.length>0,'Escort export should contain parseable message records.');
 assert.ok(cashBodies.length>0,'Cash export should contain parseable message records.');
 const escortCandidates=escortBodies.flatMap(text=>parseEscortOrder(text));
 const cashCandidates=cashBodies.flatMap(text=>parseLivePaymentBlocks(text));
 assert.ok(escortCandidates.length>0,'Escort reference should exercise the existing order parser.');
 assert.ok(cashCandidates.length>0,'Cash reference should exercise the existing payment parser.');
});

test('compatibility mapping preserves direction and verified account identities',async()=>{
 const group='120363426895117693@g.us';
 const incoming=compatibilityRecord('wa-02',group,{
  id:'native-group-message',chat_jid:group,sender_jid:'93282931581172:27@lid',
  sender_phone:null,sender_name:'Source sender name',sender_display:'Source sender name (hidden)',
  sender_push_name:'Actual source push name',contact_name:'Source contact name',
  timestamp:'2026-10-20T08:00:00.000Z',is_from_me:0,content:'Source text',
  media_type:null,chat_name:'Source group name',
 },'8801880446111@s.whatsapp.net');
 assert.equal(incoming.direction,'INCOMING');
 assert.equal(incoming.senderPhone,null);
 assert.equal(incoming.contactName,'Source contact name');
 assert.equal(incoming.senderPushName,'Actual source push name');
 assert.equal(incoming.groupName,'Source group name');
 assert.equal(incoming.receiverJid,null);
 const incomingDirect=compatibilityRecord('wa-02',sourceRecord.chatJid,{
  id:'native-incoming-direct',chat_jid:sourceRecord.chatJid,
  sender_jid:'8801670535255@s.whatsapp.net',timestamp:'2026-10-20T08:00:00.000Z',
  is_from_me:0,content:'Source text',
 },'8801880446111@s.whatsapp.net');
 assert.equal(incomingDirect.receiverJid,'8801880446111@s.whatsapp.net');
 assert.equal(incomingDirect.receiverPhone,'8801880446111');
 const receiverFixture=fixture();
 await ingestCompatibilityPage(receiverFixture.pool,{
  accountId:'wa-02',chatJid:sourceRecord.chatJid,pageNumber:0,pageSize:100,
  hasMore:false,records:[incomingDirect],
 });
 const originalInsert=receiverFixture.calls.find(call=>call.query.includes('INSERT INTO public.whatsapp_messages_original'));
 assert.deepEqual(originalInsert.values.slice(8,10),[
  '8801880446111@s.whatsapp.net','8801880446111',
 ]);
 const outgoing=compatibilityRecord('wa-02',sourceRecord.chatJid,{
  id:'native-direct-message',chat_jid:sourceRecord.chatJid,
  sender_jid:'93282931581172:27@lid',timestamp:'2026-10-20T08:00:00.000Z',
  is_from_me:1,content:'Source text',
 });
 assert.equal(outgoing.direction,'OUTGOING');
 assert.equal(outgoing.receiverJid,sourceRecord.chatJid);
 assert.equal(outgoing.receiverPhone,'8801670535255');
 assert.throws(()=>compatibilityRecord('wa-02',group,{
  id:'conflicting-direction',chat_jid:group,is_from_me:1,direction:'INCOMING',
  timestamp:'2026-10-20T08:00:00.000Z',
 }),/direction fields conflict/);
});

test('paired account identity is accepted only for its matching account',()=>{
 const scope={accountId:'wa-02',pairedJid:'8801880446111@s.whatsapp.net'};
 assert.equal(pairedJidFromScope('wa-02',scope),scope.pairedJid);
 assert.throws(()=>pairedJidFromScope('wa-01',scope),/JID is unavailable/);
 assert.throws(()=>pairedJidFromScope('wa-02',{...scope,pairedJid:'unknown'}),/JID is unavailable/);
 assert.equal(pairedJidFromIdentity('wa-02',{
  version:'native-account-v1',accountId:'wa-02',evidenceState:'LIVE_NATIVE',nativeScope:scope,
 }),scope.pairedJid);
 assert.throws(()=>pairedJidFromIdentity('wa-01',{
  version:'native-account-v1',accountId:'wa-02',evidenceState:'LIVE_NATIVE',nativeScope:scope,
 }),/does not match/);
 assert.throws(()=>pairedJidFromIdentity('wa-02',{
  version:'native-account-v1',accountId:'wa-02',evidenceState:'SIMULATED_NATIVE',nativeScope:scope,
 }),/does not match/);
 assert.equal(pairedJidFromIdentity('wa-02',{
  version:'native-account-v1',accountId:'wa-02',evidenceState:'PERSISTED_NATIVE',nativeScope:scope,
 }),scope.pairedJid);
});

test('WA-02 compatibility ingestion creates archive-only markers and is idempotent',async()=>{
 const unrelated=[
  {originalId:'unrelated-original',domain:'cash',status:'review'},
  {originalId:'unrelated-original',domain:'vessel',status:'review'},
 ];
 const f=fixture({seededProcessing:unrelated});
 const input={accountId:'wa-02',chatJid:sourceRecord.chatJid,pageNumber:0,pageSize:100,hasMore:false,records:[sourceRecord]};
 const first=await ingestCompatibilityPage(f.pool,input);
 const originalId=f.originals.get(['wa-02',sourceRecord.chatJid,sourceRecord.messageId].join('|'));
 const replay=await ingestCompatibilityPage(f.pool,input);
 assert.deepEqual(first,{stored:1,nextPage:0});
 assert.deepEqual(replay,{stored:0,nextPage:0});
 assert.equal(f.originals.size,1);
 assert.equal(f.events.size,1);
 assert.equal(f.pageNumber,0);
 assert.deepEqual([...f.processing.values()].filter(row=>row.originalId===originalId),[
  {originalId,domain:'archive',status:'processed'},
 ]);
 assert.deepEqual([...f.processing.values()].filter(row=>row.originalId==='unrelated-original'),unrelated);
 assert.deepEqual(f.originalValues.get(['wa-02',sourceRecord.chatJid,sourceRecord.messageId].join('|'))[13],JSON.stringify(sourceRecord.rawContent));
 assert.equal(f.calls.some(call=>/UPDATE public\.whatsapp_messages_original/.test(call.query)),false);
 assert.equal(f.calls.filter(call=>call.query==='COMMIT').length,2);
});

test('approved WA-01 direct source receives only its Vessel marker',async()=>{
 const f=fixture();
 const message=compatibilityRecord(
  'wa-01',sourceRecord.chatJid,sourceRecord.rawContent.message,'8801880446111@s.whatsapp.net',
 );
 const result=await ingestCompatibilityPage(f.pool,{
  accountId:'wa-01',chatJid:message.chatJid,pageNumber:0,pageSize:100,hasMore:false,records:[message],
 });
 const originalId=f.originals.get(['wa-01',message.chatJid,message.messageId].join('|'));
 assert.deepEqual(result,{stored:1,nextPage:0});
 assert.deepEqual([...f.processing.values()].filter(row=>row.originalId===originalId),[
  {originalId,domain:'archive',status:'processed'},
  {originalId,domain:'vessel',status:'pending'},
 ]);
 const beforeReplay=[...f.processing.values()];
 await ingestCompatibilityPage(f.pool,{
  accountId:'wa-01',chatJid:message.chatJid,pageNumber:0,pageSize:100,hasMore:false,records:[message],
 });
 assert.deepEqual([...f.processing.values()],beforeReplay);
});

test('unknown WA-01 group input stays archive-only without creating authority',async()=>{
 const group='120363426895117693@g.us';
 const message=compatibilityRecord('wa-01',group,{
  id:'unknown-group-message',chat_jid:group,sender_jid:'93282931581172:27@lid',
  timestamp:'2026-10-20T08:00:00.000Z',is_from_me:0,content:'Synthetic group fixture',
 });
 const f=fixture();
 await ingestCompatibilityPage(f.pool,{
  accountId:'wa-01',chatJid:group,pageNumber:0,pageSize:100,hasMore:false,records:[message],
 });
 const originalId=f.originals.get(['wa-01',group,message.messageId].join('|'));
 assert.deepEqual([...f.processing.values()].filter(row=>row.originalId===originalId),[
  {originalId,domain:'archive',status:'processed'},
 ]);
 assert.equal(f.calls.some(call=>/INSERT INTO public\.escort_client_group_authorizations|identity_review_candidate/.test(call.query)),false);
});

test('approved Cash source receives no Vessel marker',async()=>{
 const chatJid=CASH_SCOPE_CHATS[0];
 const f=fixture();
 const message=compatibilityRecord('wa-01',chatJid,{
  id:'synthetic-cash-message',chat_jid:chatJid,
  sender_jid:'8801880446111@s.whatsapp.net',timestamp:'2026-10-20T08:00:00.000Z',
  is_from_me:1,content:'Synthetic Cash route fixture',
 });
 await ingestCompatibilityPage(f.pool,{
  accountId:'wa-01',chatJid,pageNumber:0,pageSize:100,hasMore:false,records:[message],
 });
 const originalId=f.originals.get(['wa-01',chatJid,message.messageId].join('|'));
 assert.deepEqual([...f.processing.values()].filter(row=>row.originalId===originalId),[
  {originalId,domain:'archive',status:'processed'},
  {originalId,domain:'cash',status:'pending'},
 ]);
});

test('WA-02 archive ingestion creates no domain markers while WA-01 remains eligible',async()=>{
 const unrelated=[
  {originalId:'unrelated-original',domain:'cash',status:'review'},
  {originalId:'unrelated-original',domain:'vessel',status:'review'},
 ];
 const wa02=fixture({seededProcessing:unrelated});
 const wa02Page=archivePage('wa-02',sourceRecord.chatJid,'native-archive-message');
 const wa02Expected={
  accountId:'wa-02',chatJid:sourceRecord.chatJid,nativeScope:wa02Page.nativeScope,
 };
 await ingestArchivePage(wa02.pool,wa02Page,wa02Expected,'2026-10-20T08:01:00.000Z');
 const wa02OriginalId=wa02.originals.get(['wa-02',sourceRecord.chatJid,'native-archive-message'].join('|'));
 const beforeReplay=[...wa02.processing.values()];
 await ingestArchivePage(wa02.pool,wa02Page,wa02Expected,'2026-10-20T08:02:00.000Z');
 assert.deepEqual([...wa02.processing.values()].filter(row=>row.originalId===wa02OriginalId),[
  {originalId:wa02OriginalId,domain:'archive',status:'processed'},
 ]);
 assert.deepEqual([...wa02.processing.values()].filter(row=>row.originalId==='unrelated-original'),unrelated);
 assert.equal(wa02.originals.size,1);
 assert.equal(wa02.events.size,1);
 assert.deepEqual([...wa02.processing.values()],beforeReplay);
 assert.equal(wa02.calls.some(call=>/VALUES \(\$1,'cash'|VALUES \(\$1,'vessel'/.test(call.query)),false);

 const wa01=fixture();
 const wa01Page=archivePage('wa-01',sourceRecord.chatJid,'native-wa01-message');
 await ingestArchivePage(wa01.pool,wa01Page,{
  accountId:'wa-01',chatJid:sourceRecord.chatJid,nativeScope:wa01Page.nativeScope,
 },'2026-10-20T08:01:00.000Z');
 const wa01OriginalId=wa01.originals.get(['wa-01',sourceRecord.chatJid,'native-wa01-message'].join('|'));
 assert.deepEqual([...wa01.processing.values()].filter(row=>row.originalId===wa01OriginalId),[
  {originalId:wa01OriginalId,domain:'archive',status:'processed'},
  {originalId:wa01OriginalId,domain:'vessel',status:'pending'},
 ]);
});

test('a failed source-page insert rolls back without moving its cursor',async()=>{
 const f=fixture({failOriginal:true});
 await assert.rejects(
  ingestCompatibilityPage(f.pool,{
   accountId:'wa-02',chatJid:sourceRecord.chatJid,pageNumber:0,pageSize:100,hasMore:true,records:[sourceRecord],
  }),
  /INJECTED_ORIGINAL_INSERT_FAILURE/,
 );
 assert.equal(f.pageNumber,0);
 assert.equal(f.calls.at(-1).query,'ROLLBACK');
 assert.equal(f.calls.some(call=>call.query==='COMMIT'),false);
 assert.equal(f.calls.some(call=>call.query.includes('UPDATE public.whatsapp_ingestion_cursors')),false);
});

test('WA-02 archive rows remain unconsumed by Cash or Vessel business processors',()=>{
 const worker=readFileSync(new URL('../scripts/message-ingestion-worker.ts',import.meta.url),'utf8');
 const cash=readFileSync(new URL('../scripts/process-cash.ts',import.meta.url),'utf8');
 const vessel=readFileSync(new URL('../scripts/process-vessel.ts',import.meta.url),'utf8');
 const reconciliation=readFileSync(new URL('../scripts/reconcile-ingest.mjs',import.meta.url),'utf8');
 const historicalSeed=worker.slice(
  worker.indexOf('async function ensureHistoricalProcessing'),
  worker.indexOf('async function runNativeChat'),
 );
 assert.match(historicalSeed,/WHERE original\.wa_account='wa-01'[\s\S]*?ON CONFLICT \(original_id,domain\) DO NOTHING/);
 assert.match(cash,/p\.domain='cash' AND p\.status='pending' AND o\.wa_account='wa-01'/);
 assert.match(vessel,/p\.domain='vessel' AND p\.status='pending' AND o\.wa_account='wa-01'/);
 assert.match(reconciliation,/account\.accountId!=='wa-01'&&\(pass==='ACCOUNTS'\|\|pass==='ESCORT'\)/);
 const runAccount=worker.slice(worker.indexOf('async function runAccount'),worker.indexOf('async function main'));
 const wa02Branch=runAccount.slice(runAccount.indexOf('if(account==="wa-02")'),runAccount.indexOf('let failed=false'));
 assert.match(wa02Branch,/get_native_account_identity/);
 assert.doesNotMatch(wa02Branch,/list_messages|list_archive_messages|runCompatibilityChat|runArchiveChat/);
});
