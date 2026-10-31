import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createIngestionDbPool} from "./ingestion-db.ts";
import {McpStdioClient} from "./message-ingestion.ts";
import {CASH_SCOPE_CHATS} from "../lib/cash-scope.ts";
import {OWNER_ESCORT_CLIENTS} from "../lib/escort-register.mjs";
import {loadConversationScope,loadConversationScopeWithShadow,type ConversationScope} from "../lib/conversation-scope.ts";
import {NativeLiveReader,advanceNativeCursor,ensureNativeCursor,recordNativeError} from "../lib/native-live-reader.ts";
import {ingestNativePage} from "../lib/native-ingest.ts";
import type {ArchivePool,CompatibilityMessage} from "../lib/whatsapp-archive.ts";

type JsonObject=Record<string,unknown>;
type Account="wa-01"|"wa-02";

const MAX_PAGES_PER_CHAT_PER_CYCLE=5;
// Conversation scope is Owner-approved data in public.conversation_scope.
// No chat identifier is compiled into this worker: an empty scope fails closed.
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const object=(value:unknown):JsonObject=>{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new Error("MCP returned an invalid object.");
  return value as JsonObject;
};
const optionalString=(value:unknown):string|null=>typeof value==="string"&&value.length?value:null;
const requiredEnv=(key:string):string=>{
  const value=process.env[key]?.trim();
  if(!value)throw new Error(`${key} is required.`);
  return value;
};
const phoneFromJid=(jid:string|null):string|null=>{
  const match=jid?/^([0-9]{1,30})(?::[0-9]+)?@s\.whatsapp\.net$/.exec(jid):null;
  return match?.[1]??null;
};
const timestamp=(value:unknown):string=>{
  if(typeof value==="string"&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();
  const numeric=typeof value==="number"?value:typeof value==="string"&&/^\d{10,13}$/.test(value)?Number(value):NaN;
  if(!Number.isSafeInteger(numeric))throw new Error("Source message has no valid timestamp.");
  const milliseconds=numeric>=1_000_000_000_000?numeric:numeric>=1_000_000_000?numeric*1000:NaN;
  if(!Number.isSafeInteger(milliseconds)||!Number.isFinite(new Date(milliseconds).getTime())){
    throw new Error("Source message has no valid timestamp.");
  }
  return new Date(milliseconds).toISOString();
};
const accountConfig=(account:Account)=>account==="wa-01"
  ?{socket:requiredEnv("WHATSAPP_WA01_MCP_SOCKET"),token:requiredEnv("WHATSAPP_WA01_READER_TOKEN_FILE")}
  :{socket:requiredEnv("WHATSAPP_WA02_MCP_SOCKET"),token:requiredEnv("WHATSAPP_WA02_READER_TOKEN_FILE")};

export function compatibilityRecord(
  account:Account,
  chatJid:string,
  value:unknown,
  pairedJid:string|null=null,
):CompatibilityMessage{
  const raw=object(value);
  const messageId=optionalString(raw.id)??optionalString(raw.message_id);
  const sourceChat=optionalString(raw.chat_jid)??chatJid;
  const senderJid=optionalString(raw.sender_jid)??optionalString(raw.sender);
  const receiverJid=optionalString(raw.receiver_jid)??optionalString(raw.recipient_jid);
  const fromMe=raw.is_from_me??raw.from_me;
  const transportDirection=fromMe===true||fromMe===1?"OUTGOING"
    :fromMe===false||fromMe===0?"INCOMING":null;
  const declaredDirection=raw.direction==="OUTGOING"||raw.direction==="INCOMING"?raw.direction:null;
  if(transportDirection&&declaredDirection&&transportDirection!==declaredDirection){
    throw new Error("WhatsApp message direction fields conflict.");
  }
  const direction=declaredDirection??transportDirection;
  const content=typeof raw.content==="string"?raw.content:typeof raw.text==="string"?raw.text:null;
  if(!messageId||sourceChat!==chatJid||!direction)throw new Error("WhatsApp message identity or direction is unavailable.");
  const senderPhone=optionalString(raw.sender_phone)??phoneFromJid(senderJid);
  const type=optionalString(raw.message_type)??optionalString(raw.media_type)
    ??optionalString(raw.type)??(content!==null?"text":"unknown");
  const media=objectOrNull(raw.media);
  const mediaRef=optionalString(raw.media_ref)??optionalString(raw.stored_file_ref)
    ??optionalString(media?.stored_file_ref)??null;
  const group=chatJid.endsWith("@g.us");
  const fallbackReceiverJid=group?null:direction==="OUTGOING"?chatJid:pairedJid;
  const actualReceiverJid=receiverJid??fallbackReceiverJid;
  return {
    accountId:account,chatJid,messageId,senderJid,senderPhone,
    senderPushName:optionalString(raw.sender_push_name)??optionalString(raw.push_name),
    receiverJid:actualReceiverJid,
    receiverPhone:optionalString(raw.receiver_phone)??phoneFromJid(actualReceiverJid),
    contactName:optionalString(raw.contact_name)
      ??(!group&&direction==="INCOMING"?optionalString(raw.chat_name):null),
    groupName:group?optionalString(raw.group_name)??optionalString(raw.chat_name):null,
    sourceTimestamp:timestamp(raw.timestamp??raw.source_timestamp),
    direction,messageType:type,text:content,mediaRef,
    rawContent:{provider:"whatsapp-mcp",tool:"list_messages",accountId:account,chatJid,message:raw},
  };
}

export function pairedJidFromScope(account:Account,value:unknown):string{
  const scope=object(value);
  const jid=optionalString(scope.pairedJid);
  if(scope.accountId!==account||!jid||!/^([0-9]{1,30})(?::[0-9]+)?@s\.whatsapp\.net$/.test(jid)){
    throw new Error("Verified WhatsApp account JID is unavailable.");
  }
  return jid;
}

export function pairedJidFromIdentity(account:Account,value:unknown):string{
  const identity=object(value);
  if(identity.version!=="native-account-v1"||identity.accountId!==account
    ||!["LIVE_NATIVE","PERSISTED_NATIVE"].includes(String(identity.evidenceState))){
    throw new Error("WhatsApp native identity does not match the account.");
  }
  return pairedJidFromScope(account,identity.nativeScope);
}

function objectOrNull(value:unknown):JsonObject|null{
  return typeof value==="object"&&value!==null&&!Array.isArray(value)?value as JsonObject:null;
}

function safeError(error:unknown):string{
  if(error&&typeof error==="object"&&"code" in error){
    const code=(error as {code?:unknown}).code;
    if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))return `SQLSTATE_${code}`;
  }
  const message=error instanceof Error?error.message:"INGESTION_FAILED";
  return /^[A-Z][A-Z0-9_:-]{1,100}$/.test(message)?message:"INGESTION_FAILED";
}

async function recordCursorFailure(
  pool:ReturnType<typeof createIngestionDbPool>,account:Account,chatJid:string,mode:"archive"|"compatibility"|"native",error:unknown,
):Promise<void>{
  await pool.query(
    `INSERT INTO public.whatsapp_ingestion_cursors
     (account_id,chat_jid,source_mode,page_number,after_rowid,last_observed_at,last_error)
     VALUES ($1,$2,$3,0,0,now(),$4)
     ON CONFLICT (account_id,chat_jid,source_mode) DO UPDATE SET
      last_observed_at=EXCLUDED.last_observed_at,last_error=EXCLUDED.last_error`,
    [account,chatJid,mode,safeError(error)],
  );
}

async function ensureHistoricalProcessing(pool:ArchivePool):Promise<void>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public.whatsapp_messages_processing
       (original_id,domain,status,processed_content,processed_at)
       SELECT original.id,'archive','processed',
        jsonb_build_object('version','immutable-original-archive-v1','sourceMode','historical-seed'),
        original.ingested_at
       FROM public.whatsapp_messages_original original
       ON CONFLICT (original_id,domain) DO NOTHING`,
    );
    await client.query(
      `UPDATE public.whatsapp_messages_processing processing SET
        status='processed',
        processed_content=jsonb_build_object(
          'version','immutable-original-archive-v1','sourceMode','historical-seed'
        ),
        processed_at=COALESCE(processing.processed_at,original.ingested_at)
       FROM public.whatsapp_messages_original original
       WHERE processing.original_id=original.id
        AND processing.domain='archive' AND processing.status='pending'`,
    );
    await client.query(
      `INSERT INTO public.whatsapp_messages_processing (original_id,domain,status)
       SELECT original.id,domain.name,'pending'
       FROM public.whatsapp_messages_original original
       CROSS JOIN (VALUES ('cash')) AS domain(name)
       WHERE original.wa_account='wa-01'
        AND original.chat_jid=ANY($1::text[])
        AND NOT EXISTS (
         SELECT 1 FROM public.escort_client_contacts contact
         WHERE contact.account_id='wa-01' AND contact.active=true
          AND contact.id=ANY($2::text[])
          AND contact.phone=ANY($3::text[])
          AND original.chat_jid=regexp_replace(contact.phone,'^\\+','')||'@s.whatsapp.net'
        )
       ON CONFLICT (original_id,domain) DO NOTHING`,
      [[...CASH_SCOPE_CHATS],OWNER_ESCORT_CLIENTS.map(contact=>contact.id),OWNER_ESCORT_CLIENTS.map(contact=>contact.phone)],
    );
    await client.query(
      `INSERT INTO public.whatsapp_messages_processing (original_id,domain,status)
       SELECT original.id,'vessel','pending'
       FROM public.whatsapp_messages_original original
       WHERE original.wa_account='wa-01'
        AND original.chat_jid=ANY($1::text[])
        AND NOT original.chat_jid=ANY($2::text[])
        AND EXISTS (
         SELECT 1 FROM public.escort_client_contacts contact
         WHERE contact.account_id='wa-01' AND contact.active=true
          AND contact.id=ANY($3::text[]) AND contact.phone=ANY($4::text[])
          AND original.chat_jid=regexp_replace(contact.phone,'^\\+','')||'@s.whatsapp.net'
          AND (
           original.direction='outgoing'
           OR (original.direction='incoming' AND (
            original.sender_jid=original.chat_jid
            OR original.sender_phone IN (
             contact.phone,regexp_replace(contact.phone,'^\\+','')
            )
           ))
          )
        )
       ON CONFLICT (original_id,domain) DO NOTHING`,
      [
        OWNER_ESCORT_CLIENTS.map(contact=>`${contact.phone.replace(/^\+/,"")}@s.whatsapp.net`),
        [...CASH_SCOPE_CHATS],OWNER_ESCORT_CLIENTS.map(contact=>contact.id),
        OWNER_ESCORT_CLIENTS.map(contact=>contact.phone),
      ],
    );
    const groupTable=await client.query(
      "SELECT to_regclass('public.escort_client_group_authorizations') IS NOT NULL AS present",
    );
    if(groupTable.rows?.[0]?.present===true){
      await client.query(
        `INSERT INTO public.whatsapp_messages_processing (original_id,domain,status)
         SELECT original.id,'vessel','pending'
         FROM public.whatsapp_messages_original original
         JOIN public.escort_client_group_authorizations authz
          ON authz.account_id='wa-01'
          AND authz.group_jid=original.chat_jid
          AND authz.participant_jid=original.sender_jid
          AND authz.active=true
         JOIN public.escort_client_contacts contact
          ON contact.id=authz.client_contact_id
          AND contact.account_id='wa-01' AND contact.active=true
         WHERE original.wa_account='wa-01' AND original.chat_type='group'
          AND original.direction='incoming'
          AND NOT original.chat_jid=ANY($1::text[])
          AND (contact.id=ANY($2::text[]) OR contact.source=$3)
         ON CONFLICT (original_id,domain) DO NOTHING`,
        [[...CASH_SCOPE_CHATS],OWNER_ESCORT_CLIENTS.map(contact=>contact.id),'OWNER_APPROVED_GROUP_20261026'],
      );
    }
    await client.query(
      `INSERT INTO public.whatsapp_contacts
       (wa_account,phone_number,jid,name_source,name_confidence,last_synced_at)
       SELECT DISTINCT o.wa_account,
        regexp_replace(split_part(o.sender_jid,'@',1),':.*$',''),o.sender_jid,
        'TRANSPORT_JID','TRANSPORT_JID',now()
       FROM public.whatsapp_messages_original o
       WHERE o.sender_jid ~ '^[0-9]+(:[0-9]+)?@s\\.whatsapp\\.net$'
       ON CONFLICT (wa_account,phone_number) DO UPDATE SET
        jid=EXCLUDED.jid,
        name_source=COALESCE(whatsapp_contacts.name_source,EXCLUDED.name_source),
        name_confidence=COALESCE(whatsapp_contacts.name_confidence,EXCLUDED.name_confidence),
        last_synced_at=GREATEST(whatsapp_contacts.last_synced_at,EXCLUDED.last_synced_at)`,
    );
    await client.query("COMMIT");
  }catch(error){
    try{await client.query("ROLLBACK");}
    catch(rollbackError){throw new AggregateError([error,rollbackError],"Historical processing seed and rollback both failed.");}
    throw error;
  }finally{
    client.release();
  }
}

// Live continuation for an approved conversation. The bridge no longer exposes
// list_messages / list_archive_messages / list_stored_messages, so the only
// available reader is list_native_messages (limit <= 10, activation cursor, then
// CONTENT pages). History is supplied once by the approved staging backfill.
async function runNativeChat(
  client:McpStdioClient,
  pool:ReturnType<typeof createIngestionDbPool>,
  scope:ConversationScope,
  chatJid:string,
):Promise<void>{
  const reader=new NativeLiveReader({callTool:async(name,args)=>await client.callTool(name,args) as Record<string,unknown>});
  const db={query:(sql:string,values?:unknown[])=>pool.query(sql,values) as Promise<{rows:Array<Record<string,unknown>>}>};
  let cursor=await ensureNativeCursor(db,"wa-01",chatJid,reader);
  for(let pageNumber=0;pageNumber<MAX_PAGES_PER_CHAT_PER_CYCLE;pageNumber++){
    const page=await reader.page("wa-01",chatJid,cursor);
    await ingestNativePage(pool as unknown as Parameters<typeof ingestNativePage>[0],scope,"wa-01",page);
    cursor=page.nextCursor;
    await advanceNativeCursor(db,"wa-01",chatJid,page);
    if(page.complete||!page.records.length)break;
  }
}

async function runAccount(account:Account,pool:ReturnType<typeof createIngestionDbPool>,nativeScopeScope:ConversationScope,chatJids:readonly string[]):Promise<boolean>{
  const config=accountConfig(account);
  const client=new McpStdioClient(config.socket,config.token);
  try{
    await client.initialize();
    const tools=await client.request("tools/list",{});
    const available=Array.isArray(tools.tools)?tools.tools.map(item=>object(item).name):[];
    if(account==="wa-02"){
      if(!available.includes("get_native_account_identity")){
        console.error("WA-02 identity tool unavailable; no messages were read.");
        return true;
      }
      const identity=await client.callTool("get_native_account_identity",{});
      pairedJidFromIdentity(account,identity);
      return false;
    }
    if(!available.includes("list_native_messages"))throw new Error("NATIVE_MESSAGE_READER_UNAVAILABLE");
    let failed=false;
    const readable:string[]=[];
    const denied:string[]=[];
    for(const jid of chatJids){
      try{
        await runNativeChat(client,pool,nativeScopeScope,jid);
        readable.push(jid);
      }catch(error){
        failed=true;
        const code=safeError(error);
        await recordCursorFailure(pool,account,jid,"native",error);
        await recordNativeError({query:(sql:string,values?:unknown[])=>pool.query(sql,values) as Promise<{rows:Array<Record<string,unknown>>}>},"wa-01",jid,code);
        if(code==="INGESTION_FAILED")denied.push(jid);
        console.error(`WA-01 approved chat ingestion failed; cursor retained (${code}).`);
      }
    }
    if(denied.length){
      console.error(`WA-01 native reader denied ${denied.length} of ${chatJids.length} approved chats (bridge content scope).`);
    }
    return failed;
  }finally{
    await client.close();
  }
}

async function main():Promise<void>{
  const manifestPath=requiredEnv("ALRIFAI_NATIVE_MANIFEST_FILE");
  const manifest=object(JSON.parse(readFileSync(manifestPath,"utf8")) as unknown);
  const accounts=object(manifest.accounts);
  const wa01=object(accounts["wa-01"]);
  const nativeScope=object(wa01.binding);
  if(nativeScope.accountId!=="wa-01")throw new Error("WA-01 native binding does not match the manifest.");
  const pool=createIngestionDbPool();
  let delay=1000;
  try{
    const dbClient = {query:(sql:string,values?:unknown[])=>pool.query(sql,values) as Promise<{rows:Array<Record<string,unknown>>}>};
    const staticScope:ConversationScope|undefined = process.env.ALRIFAI_ROSTER_SOURCE?.toUpperCase() === 'SHADOW' ? await loadConversationScope(dbClient) : undefined;
    const scope:ConversationScope = process.env.ALRIFAI_ROSTER_SOURCE?.toUpperCase() === 'SHADOW' 
      ? await loadConversationScopeWithShadow(dbClient, staticScope)
      : process.env.ALRIFAI_ROSTER_SOURCE?.toUpperCase() === 'DB'
        ? await loadConversationScope(dbClient)
        : await loadConversationScope(dbClient);
    const chatJids=scope.ingestionChats();
    if(!chatJids.length)throw new Error("APPROVED_SCOPE_EMPTY");
    console.error(`Approved scope loaded: ${chatJids.length} chat addresses across ${scope.conversations.length} conversations.`);
    await ensureHistoricalProcessing(pool);
    while(true){
      let failed=false;
      try{failed=(await runAccount("wa-01",pool,scope,chatJids))||failed;}
      catch(error){
        failed=true;
        console.error(`WA-01 ingestion unavailable; cursors retained (${safeError(error)}).`);
      }
      try{failed=(await runAccount("wa-02",pool,scope,[]))||failed;}
      catch(error){
        failed=true;
        console.error(`WA-02 ingestion unavailable; cursors retained (${safeError(error)}).`);
      }
      delay=failed?Math.min(delay*2,60000):1000;
      await sleep(failed?delay:15000);
    }
  }finally{
    await pool.end();
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch((error:unknown)=>{
    console.error(`WhatsApp ingestion worker stopped (${safeError(error)}).`);
    process.exitCode=1;
  });
}
