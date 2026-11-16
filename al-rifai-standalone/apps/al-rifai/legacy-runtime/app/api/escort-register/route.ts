import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 if(!await getChatGPTUser())return reply({error:'Sign in to open the private escort intake register.'},401);
 try{
  const db=database();
  // Provenance scope: Current (canonical) by default; Archive on request. The
  // epoch is fixed server-side so a browser cannot widen what it reads.
  const archive=new URL(request.url).searchParams.get('scope')==='archive';
  const epoch=archive?'LEGACY_PRE_TRANSITION_20261026':'CANONICAL_BACKFILL_20261026';
  const tables=await db.first<{present:boolean}>("SELECT to_regclass('public.escort_order_register') IS NOT NULL AS present");
  if(!tables?.present)return reply({error:'Escort intake schema is not installed yet.'},503);
  // Lightweight read-only summary for dashboard headers: no source text, no
  // row bodies, no events. Same server-owned epoch scope.
  if(new URL(request.url).searchParams.get('summary')==='1'){
   const result=await db.first<Record<string,unknown>>(
    `SELECT count(*) FILTER (WHERE status='DRAFT')::int AS draft,
            count(*) FILTER (WHERE status='CONFIRMED')::int AS confirmed,
            count(*) FILTER (WHERE status='REVIEW')::int AS review,
            count(*) FILTER (WHERE status='REVIEW' AND parsed ? 'programId')::int AS confirmed_evidence,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId'))::int AS actionable,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId') AND reasons::text LIKE '%ASSIGNMENT_EVIDENCE_INCOMPLETE%')::int AS incomplete,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId') AND NOT (reasons::text LIKE '%ASSIGNMENT_EVIDENCE_INCOMPLETE%') AND reasons::text LIKE '%POTENTIAL_DUPLICATE%')::int AS duplicate_review,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId') AND NOT (reasons::text LIKE '%ASSIGNMENT_EVIDENCE_INCOMPLETE%') AND NOT (reasons::text LIKE '%POTENTIAL_DUPLICATE%') AND parsed->'confirmationMatch'->>'state'='UNMATCHED')::int AS unmatched,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId') AND (source_time AT TIME ZONE 'Asia/Dhaka')::date >= '2026-07-27')::int AS recent_review,
            count(*) FILTER (WHERE status='REVIEW' AND NOT (parsed ? 'programId') AND (source_time AT TIME ZONE 'Asia/Dhaka')::date < '2026-07-27')::int AS unverified_legacy,
            max(source_time) AS latest_source_time
       FROM public.escort_order_register WHERE account_id='wa-01' AND dataset_epoch=$1`,[epoch]);
   const row=result??{};
   return reply({scope:archive?'archive':'current',summary:{
    draft:Number(row.draft??0),confirmed:Number(row.confirmed??0),review:Number(row.review??0),
    confirmedEvidence:Number(row.confirmed_evidence??0),actionableReview:Number(row.actionable??0),
    recentReview:Number(row.recent_review??0),unverifiedLegacy:Number(row.unverified_legacy??0),
    dateUnverified:Math.max(0,Number(row.actionable??0)-Number(row.recent_review??0)-Number(row.unverified_legacy??0)),
    unmatched:Number(row.unmatched??0),incomplete:Number(row.incomplete??0),duplicateReview:Number(row.duplicate_review??0),
   },latestSourceTime:row.latest_source_time??null,checkedAt:new Date().toISOString()});
  }
  const [contacts,rows,events,messageReviews]=await Promise.all([
   db.all('SELECT id,account_id AS "accountId",display_name AS "displayName",username,phone,source,active FROM public.escort_client_contacts WHERE active=true AND account_id=\'wa-01\' ORDER BY display_name'),
   db.all('SELECT r.id,r.account_id AS "accountId",r.client_contact_id AS "clientContactId",c.display_name AS "clientName",c.username,r.client_phone AS "clientPhone",r.chat_jid AS "chatJid",r.source_message_id AS "sourceMessageId",r.source_hash AS "sourceHash",r.source_time AS "sourceTime",r.mother_vessel AS "motherVessel",r.lighter_vessel AS "lighterVessel",r.master_mobile AS "masterMobile",r.cargo,r.capacity,r.importer,r.destination,r.booking_date AS "bookingDate",r.escort_name AS "escortName",r.escort_mobile AS "escortMobile",r.duty_date AS "dutyDate",r.shift,r.release_point AS "releasePoint",r.status,r.confirmation_message_id AS "confirmationMessageId",r.reasons,r.parsed,r.source_text AS "sourceText",r.created_at AS "createdAt",r.updated_at AS "updatedAt" FROM public.escort_order_register r JOIN public.escort_client_contacts c ON c.id=r.client_contact_id WHERE r.account_id=\'wa-01\' AND r.dataset_epoch=$1 ORDER BY r.source_time DESC,r.created_at DESC',[epoch]),
   db.all('SELECT e.order_id AS "orderId",e.event_type AS "eventType",e.source_message_id AS "sourceMessageId",e.source_hash AS "sourceHash",e.payload,e.created_at AS "createdAt" FROM public.escort_order_events e JOIN public.escort_order_register r ON r.id=e.order_id WHERE r.account_id=\'wa-01\' AND r.dataset_epoch=$1 ORDER BY e.created_at DESC LIMIT 500',[epoch]),
   db.all(`SELECT o.wa_account AS "accountId",o.chat_jid AS "chatJid",o.message_id AS "messageId",
     o."timestamp" AS "sourceTime",o.direction,o.sender_jid AS "senderJid",o.sender_phone AS "senderPhone",
     left(o.text_content,4000) AS "sourceText",length(o.text_content)>4000 AS "sourceTextTruncated",
     p.status AS "processingStatus",p.processed_content AS "processedContent",
     p.processing_errors AS "processingErrors"
    FROM public.whatsapp_messages_original o
    JOIN public.whatsapp_messages_processing p ON p.original_id=o.id AND p.domain='vessel'
    WHERE o.wa_account='wa-01' AND
     (p.status IN ('pending','error') OR p.processed_content->>'reviewStatus'='REVIEW')
    ORDER BY o."timestamp" DESC,o.id DESC LIMIT 200`),
  ]);
  const values=rows.results as Array<Record<string,unknown>>;
  // Review classification is derived for presentation only. A register row is
  // intake evidence; a REVIEW row linked to a confirmed program is not an
  // actionable item. No status is rewritten.
  const reviewClass=(row:Record<string,unknown>)=>{
   if(row.status!=='REVIEW')return null;
   const parsed=(row.parsed??{}) as {programId?:unknown;confirmationMatch?:{state?:unknown}};
   if(parsed.programId)return 'CONFIRMED_EVIDENCE';
   const reasons=Array.isArray(row.reasons)?(row.reasons as unknown[]).map(String):[];
   if(reasons.some(reason=>reason.startsWith('ASSIGNMENT_EVIDENCE_INCOMPLETE')))return 'INCOMPLETE';
   if(reasons.some(reason=>reason.includes('POTENTIAL_DUPLICATE')))return 'DUPLICATE_REVIEW';
   if(parsed.confirmationMatch?.state==='UNMATCHED')return 'UNMATCHED';
   return 'REVIEW';
  };
  // Review age uses the original WhatsApp source timestamp (Dhaka date), never
  // the row/backfill creation time. Older unresolved cases stay accessible.
  const reviewCut='2026-07-27';
  const reviewAge=(row:Record<string,unknown>)=>{
   const raw=row.sourceTime??row.source_time??row.dutyDate??row.duty_date;
   if(typeof raw!=='string'||!Number.isFinite(Date.parse(raw)))return 'DATE_UNVERIFIED';
   const day=new Date(Date.parse(raw)+6*3600*1000).toISOString().slice(0,10);
   return day>=reviewCut?'RECENT_REVIEW':'UNVERIFIED_LEGACY';
  };
  const classified:Array<Record<string,unknown>&{reviewClass:string|null;reviewAge:string|null}>=values.map(row=>({
   ...row,reviewClass:reviewClass(row),reviewAge:row.status==='REVIEW'?reviewAge(row):null,
  }));
  const reviews=classified.filter(row=>row.status==='REVIEW');
  const confirmedEvidence=reviews.filter(row=>row.reviewClass==='CONFIRMED_EVIDENCE').length;
  const actionable=reviews.filter(row=>row.reviewClass!=='CONFIRMED_EVIDENCE');
  return reply({contacts:contacts.results,rows:classified,events:events.results,messageReviews:messageReviews.results,summary:{draft:values.filter(r=>r.status==='DRAFT').length,confirmed:values.filter(r=>r.status==='CONFIRMED').length,review:reviews.length,confirmedEvidence,actionableReview:actionable.length,recentReview:actionable.filter(row=>row.reviewAge==='RECENT_REVIEW').length,unverifiedLegacy:actionable.filter(row=>row.reviewAge==='UNVERIFIED_LEGACY').length,dateUnverified:actionable.filter(row=>row.reviewAge==='DATE_UNVERIFIED').length,unmatched:reviews.filter(row=>row.reviewClass==='UNMATCHED').length,incomplete:reviews.filter(row=>row.reviewClass==='INCOMPLETE').length,duplicateReview:reviews.filter(row=>row.reviewClass==='DUPLICATE_REVIEW').length},scope:archive?'archive':'current',source:archive?'Archive · pre-transition escort records (read-only)':'WhatsApp message archive · read-only reconciliation',readOnly:true,checkedAt:new Date().toISOString()});
 }catch(error){return reply({error:error instanceof Error?error.message:'Escort intake register could not be loaded.'},503);}
}
const denied=()=>reply({error:'Escort intake is reconciled from the read-only WhatsApp bridge; direct browser writes are disabled.'},405);
export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;
