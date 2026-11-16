import {importedMessages} from "@/lib/conversation-snapshot";
import {accountsMessages} from "@/lib/accounts-snapshot";
import {integrationConfig as env} from "@/lib/integrations";
import {getChatGPTUser} from '@/app/chatgpt-auth';
import policy from '@/data/conversation-policy.json';
import {ConversationReadError,conversationConnection,conversationQuery,readConversation,type ConversationConfig} from '@/lib/conversation-read';
import {database} from '@/db/raw';
export const dynamic='force-dynamic';
const archiveError=()=>Response.json(
 {error:'Conversation archive is unavailable. Its schema or read access may not be active.'},
 {status:503,headers:{'Cache-Control':'private, no-store'}},
);
async function readArchive(q:URLSearchParams){
 const allowed=new Set(['mode','account','chat_jid','after_rowid','page','limit']);
 if([...q.keys()].some(k=>!allowed.has(k))||[...allowed].some(k=>q.getAll(k).length>1))
  return Response.json({error:'Use the supported archive filters once each.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
 const account=q.get('account')??'',chat=q.get('chat_jid')??'';
 const pageText=q.get('page')??'1',limitText=q.get('limit')??'25',after=q.get('after_rowid')??'0';
 if((account&&!['wa-01','wa-02'].includes(account))
  ||(chat&&(!account||!/@(?:s\.whatsapp\.net|lid|g\.us)$/.test(chat)||chat.length>200))
  ||!/^[1-9]\d{0,5}$/.test(pageText)||!/^\d{1,3}$/.test(limitText)
  ||Number(pageText)>10000||Number(limitText)<1||Number(limitText)>100
  ||!/^(0|[1-9]\d{0,18})$/.test(after)||BigInt(after)>9223372036854775807n)
  return Response.json({error:'Use a valid account, exact chat identifier, bounded page, and row cursor.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
 try{
  const db=database(),limit=Number(limitText),headers={'Cache-Control':'private, no-store'};
  if(!chat){
   const offset=(Number(pageText)-1)*limit;
   const [{results:rows},total]=await Promise.all([
    db.all<{accountId:string;chatJid:string;isGroup:boolean;displayName:string|null;firstSeenAt:string;lastSeenAt:string}>(
     `SELECT account_id AS "accountId",chat_jid AS "chatJid",bool_or(is_group) AS "isGroup",
       max(display_name) AS "displayName",min(first_seen_at) AS "firstSeenAt",
       max(last_seen_at) AS "lastSeenAt"
      FROM (
       SELECT c.account_id,c.chat_jid,c.is_group,c.display_name,c.first_seen_at,c.last_seen_at
       FROM public.whatsapp_archive_conversations c
       UNION ALL
       SELECT o.wa_account,o.chat_jid,o.chat_type='group',NULL::text,
              min(o."timestamp"),max(o."timestamp")
       FROM public.whatsapp_messages_original o
       GROUP BY o.wa_account,o.chat_jid,o.chat_type
      ) conversations
      WHERE ($1='' OR account_id=$1)
      GROUP BY account_id,chat_jid
      ORDER BY account_id,chat_jid LIMIT $2 OFFSET $3`,
     [account,limit,offset],
    ),
    db.first<{total:string}>(
     `SELECT count(*)::text AS total FROM (
       SELECT account_id,chat_jid FROM public.whatsapp_archive_conversations
       UNION
       SELECT wa_account,chat_jid FROM public.whatsapp_messages_original
      ) conversations
      WHERE ($1='' OR account_id=$1)`,
     [account],
    ),
   ]);
   const count=Number(total?.total??0);
   return Response.json({conversations:rows,total:count,page:Number(pageText),
    pages:Math.max(1,Math.ceil(count/limit)),read_only:true,source:'Central AL-RIFA’I WhatsApp archive'},
    {headers});
  }
  const {results:result}=await db.all<{
   archiveId:string;messageId:string;senderId:string|null;direction:string|null;
   deletedAt:string|null;sourceTimestamp:string|null;messageType:string|null;body:string|null;
   visibilityState:string;rawContent:unknown;mediaRef:string|null;
  }>(
   `SELECT o.id::text AS "archiveId",o.message_id AS "messageId",o.sender_jid AS "senderId",
     upper(o.direction) AS direction,o."timestamp"::text AS "sourceTimestamp",
     COALESCE(e.raw_content->>'deletedAt',e.raw_content->'message'->>'deletedAt',
       o.raw_content->>'deletedAt',o.raw_content->'message'->>'deletedAt') AS "deletedAt",
     o.message_type AS "messageType",
     CASE WHEN COALESCE(e.source_event,o.raw_content->>'state') IN ('REVOKED','SUPPRESSED','UNKNOWN')
       THEN NULL ELSE o.text_content END AS body,
     CASE WHEN e.source_event='MESSAGE' THEN 'VISIBLE'
       ELSE COALESCE(e.source_event,o.raw_content->>'state','VISIBLE') END AS "visibilityState",
     o.raw_content AS "rawContent",o.media_ref AS "mediaRef"
    FROM public.whatsapp_messages_original o
    LEFT JOIN LATERAL (
      SELECT source_event,raw_content FROM public.whatsapp_message_source_events
      WHERE wa_account=o.wa_account AND chat_jid=o.chat_jid AND message_id=o.message_id
      ORDER BY observed_at DESC,id DESC LIMIT 1
    ) e ON true
    WHERE o.wa_account=$1 AND o.chat_jid=$2 AND o.id::bigint>$3::bigint
    ORDER BY o.id LIMIT $4`,
   [account,chat,after,limit+1],
  );
  const hasMore=result.length>limit,rows=result.slice(0,limit).map(row=>{
   const root=typeof row.rawContent==='object'&&row.rawContent!==null?row.rawContent as Record<string,unknown>:{};
   const nested=typeof root.message==='object'&&root.message!==null?root.message as Record<string,unknown>:{};
   const mediaValue=nested.media;
   const mediaItems=Array.isArray(mediaValue)?mediaValue:mediaValue&&typeof mediaValue==='object'?[mediaValue]:[];
   const media=mediaItems.map(value=>{
    const item=typeof value==='object'&&value!==null?value as Record<string,unknown>:{};
    return {type:typeof item.type==='string'?item.type:row.messageType,
     filename:typeof item.filename==='string'?item.filename:null,
     contentHash:typeof item.contentHash==='string'?item.contentHash:null,
     byteLength:typeof item.byteLength==='number'?item.byteLength:null,
     storedFileRef:typeof item.storedFileRef==='string'?item.storedFileRef:row.mediaRef};
   });
   if(!media.length&&row.mediaRef)media.push({type:row.messageType,filename:null,contentHash:null,byteLength:null,storedFileRef:row.mediaRef});
   return {...row,media,rawContent:undefined};
  });
  return Response.json({rows,total:null,nextAfter:rows.at(-1)?.archiveId??after,
   hasMore,read_only:true,source:'Central AL-RIFA’I WhatsApp archive'},
   {headers});
 }catch{return archiveError();}
}
export async function GET(request:Request){
 const scope=new URL(request.url).searchParams.get('scope')==='archive'?'archive':'current';
  if(!await getChatGPTUser())return Response.json({error:'Sign in to inspect conversations.'},{status:401});
  const config=env as unknown as ConversationConfig,q=new URL(request.url).searchParams;
  const headers={'Cache-Control':'private, no-store'};
  if(q.get('mode')==='archive')return readArchive(q);
  if(q.get('mode')==='historical'){
   const page=Math.max(1,Math.floor(Number(q.get('page'))||1)),search=(q.get('q')??'').toLowerCase().slice(0,150);
   const rows=[...await importedMessages(false),...(scope==='archive'?accountsMessages():[])].filter(m=>!m.sensitiveExcluded&&(!search||[m.body,m.sender,m.source].join(' ').toLowerCase().includes(search)));
   return Response.json({rows:rows.slice((page-1)*25,page*25),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/25)),read_only:true,source:'Preserved historical exports; live feeds disabled'},{headers});
  }
  if(!q.size||q.get('mode')==='policy')return Response.json({...policy,connection:conversationConnection(config),source:'Core policy reference · bundled for offline review',read_only:true},{headers});
  try{return Response.json(await readConversation(config,conversationQuery(q)),{headers});}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Conversation read failed.'},{status:error instanceof ConversationReadError?error.status:503,headers});}
}
const denied=()=>Response.json({error:'Conversation inspection permits reads only.'},{status:405});
export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;
