import {createPool} from "../db/postgres.mjs";
import {parseEscortOrder} from "../lib/escort-intake-candidate.mjs";
import {
  classifyBusinessSource,
  deriveEscortRegisterOps,
  OWNER_ESCORT_CLIENTS,
  scopePhoneAliases,
} from "../lib/escort-register.mjs";
import {CASH_SCOPE_CHATS,isCashScopeOwner} from "../lib/cash-scope.ts";
import {persistConfirmedProgram,persistOperationIfNew} from "../lib/vessel-ops.ts";
import {analyzeMobile} from "../lib/mobile-identity.mjs";

const BATCH_SIZE=50;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const pool=createPool({readOnly:false,user:"ir_review_runtime"});
const failureCode=(error:unknown):string=>{
  if(error&&typeof error==="object"&&"code" in error){
    const code=(error as {code?:unknown}).code;
    if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))return `SQLSTATE_${code}`;
  }
  return error instanceof Error&&/^[A-Z][A-Z0-9_:-]{1,100}$/.test(error.message)?error.message:"VESSEL_PROCESSING_FAILED";
};

type PendingRow={
  id:number;
  original_id:number;
  wa_account:"wa-01"|"wa-02";
  chat_jid:string;
  message_id:string;
  direction:"incoming"|"outgoing";
  sender_jid:string|null;
  sender_phone:string|null;
  timestamp:Date|string;
  text_content:string|null;
  raw_content:Record<string,unknown>;
};
type EscortOrderRow={
  id:string;accountId:string;clientContactId:string;clientPhone:string;chatJid:string;
  sourceMessageId:string;sourceHash:string;blockKey:string;sourceTime:string;
  motherVessel:string;lighterVessel:string;masterMobile:string;cargo:string;capacity:string;
  importer:string;destination:string;bookingDate:string|null;escortName:string;escortMobile:string;
  dutyDate:string|null;shift:string;releasePoint:string;status:"DRAFT"|"REVIEW";
  reasons:string[];parsed:Record<string,unknown>;sourceText:string;businessKey:string|null;
};
type EscortOperation={
  kind:"DRAFT"|"REVIEW";
  row:EscortOrderRow;
  event:{
    id:string;orderId:string;eventType:"DRAFT_CREATED"|"CONFIRMATION_REVIEW"|"ASSIGNMENT_REVIEW";
    sourceMessageId:string;sourceHash:string;payload:Record<string,unknown>;
  };
};

function rawMessageDetails(raw:Record<string,unknown>):Record<string,unknown>{
  const nested=raw.message;
  return typeof nested==="object"&&nested!==null&&!Array.isArray(nested)
    ?nested as Record<string,unknown>:raw;
}

function sourceDeleted(raw:Record<string,unknown>):boolean{
  const details=rawMessageDetails(raw);
  return raw.state==="REVOKED"||details.deletedAt!==null&&details.deletedAt!==undefined
    ||details.is_deleted===true||details.deleted===true;
}

function sourceTime(value:Date|string):string{
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw new Error("SOURCE_TIMESTAMP_INVALID");
  return date.toISOString();
}

function approvedContacts(rows:Record<string,unknown>[]):Record<string,unknown>[]{
  const approved=new Map(OWNER_ESCORT_CLIENTS.map(contact=>[contact.id,contact.phone]));
  return rows.filter(contact=>contact.account_id==="wa-01"&&contact.active===true
    &&approved.get(String(contact.id))===contact.phone);
}

function uniquePhoneAliases(rows:Record<string,unknown>[]):Record<string,string>{
  const candidates=new Map<string,Set<string>>();
  for(const row of rows){
    if(typeof row.jid!=="string"||typeof row.phone_number!=="string")continue;
    const key=row.jid.split("@")[0];
    if(!key)continue;
    const values=candidates.get(key)??new Set<string>();
    values.add(row.phone_number);
    candidates.set(key,values);
  }
  return Object.fromEntries([...candidates]
    .filter(([,phones])=>phones.size===1)
    .map(([key,phones])=>[key,[...phones][0]]));
}

function classifyWithoutOperation(row:PendingRow,parsedCount:number,reason:string):Record<string,unknown>{
  return {
    version:"vessel-review-classification-v1",
    classification:parsedCount?"REVIEW":"NOT_VESSEL_INTENT",
    reviewStatus:parsedCount?"REVIEW":"NOT_REQUIRED",
    reasons:parsedCount?[reason]:[],
    source:{accountId:row.wa_account,chatJid:row.chat_jid,messageId:row.message_id},
    sourceTimestamp:sourceTime(row.timestamp),
  };
}

async function processBatch():Promise<number>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const rows=(await client.query(
      `SELECT p.id,p.original_id,o.wa_account,o.chat_jid,o.message_id,o.direction,o.sender_jid,
              o.sender_phone,o."timestamp",o.text_content,o.raw_content
       FROM public.whatsapp_messages_processing p
       JOIN public.whatsapp_messages_original o ON o.id=p.original_id
       WHERE p.domain='vessel' AND p.status='pending' AND o.wa_account='wa-01'
       ORDER BY p.id
       LIMIT $1
       FOR UPDATE OF p SKIP LOCKED`,
      [BATCH_SIZE],
    )).rows as PendingRow[];
    if(!rows.length){
      await client.query("COMMIT");
      return 0;
    }
    const contactsResult=await client.query(
      "SELECT * FROM public.escort_client_contacts WHERE active=true AND account_id='wa-01'",
    );
    const aliasesResult=await client.query(
      "SELECT phone_number,jid FROM public.whatsapp_wa01_contact_aliases",
    );
    const scopeResult=await client.query(
      "SELECT canonical_chat_jid,alias_chat_jids FROM public.conversation_scope WHERE account_id='wa-01' AND domain='VESSEL' AND active=true",
    );
    const existingResult=await client.query(
      "SELECT * FROM public.escort_order_register WHERE account_id='wa-01'",
    );
    const groupAuthorizationsResult=await client.query(
      "SELECT * FROM public.escort_client_group_authorizations WHERE active=true AND account_id='wa-01'",
    );
    const contacts=approvedContacts(contactsResult.rows??[]);
    const aliases={...uniquePhoneAliases(aliasesResult.rows??[]),...scopePhoneAliases(scopeResult.rows??[])};
    const chatAliases:Record<string,string>={};
    for(const scopeRow of scopeResult.rows??[]){
      const canonical=String(scopeRow.canonical_chat_jid);
      chatAliases[canonical]=canonical;
      for(const alias of scopeRow.alias_chat_jids??[])chatAliases[String(alias)]=canonical;
    }
    const employees=(await client.query(
      "SELECT employee_mobile,preferred_name,state FROM public.employee_master WHERE scope_account='wa-01'",
    )).rows??[];
    const employeeByMobile=new Map<string,{name:string|null;state:string}>();
    for(const employee of employees){
      const digits=analyzeMobile(employee.employee_mobile).digits;
      if(digits)employeeByMobile.set(digits,{name:employee.preferred_name??null,state:employee.state});
    }
    const existing=existingResult.rows??[];
    const groupAuthorizations=groupAuthorizationsResult.rows??[];
    const accountRows=existing.filter(value=>value.account_id==="wa-01");
    for(const row of rows){
      try{
        const sourceAt=sourceTime(row.timestamp);
        const account={accountId:row.wa_account};
        const message={
          accountId:row.wa_account,id:row.message_id,chatJid:row.chat_jid,
          text:row.text_content??"",sourceTime:sourceAt,
          direction:row.direction==="outgoing"?"OUTGOING":"INCOMING",
          sender:row.sender_jid??"",nativeSenderJid:row.sender_jid,
          senderPhoneTransport:row.sender_phone,
          deletedAt:null,
        };
        const source=classifyBusinessSource(
          account,message,contacts,aliases,groupAuthorizations,[...CASH_SCOPE_CHATS],
        );
        if(source.domain!=="vessel"){
          await client.query(
            `UPDATE public.whatsapp_messages_processing SET status='processed',
             processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
             WHERE id=$1 AND status='pending'`,
            [row.id,JSON.stringify({
              version:"vessel-review-classification-v1",
              classification:"NOT_VESSEL_SOURCE",reviewStatus:"NOT_REQUIRED",
              sourceRouting:source.outcome,
              source:{accountId:row.wa_account,chatJid:row.chat_jid,messageId:row.message_id},
              sourceTimestamp:sourceAt,
            })],
          );
          continue;
        }
        if(sourceDeleted(row.raw_content)){
          await client.query(
            `UPDATE public.whatsapp_messages_processing SET status='processed',
             processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
             WHERE id=$1 AND status='pending'`,
            [row.id,JSON.stringify({version:"vessel-review-classification-v1",
              classification:"SOURCE_REPORTED_DELETED",reviewStatus:"NOT_REQUIRED",
              source:{accountId:row.wa_account,chatJid:row.chat_jid,messageId:row.message_id}})],
          );
          continue;
        }
        if(!row.text_content){
          const result=classifyWithoutOperation(row,0,"SOURCE_TEXT_UNAVAILABLE");
          await client.query(
            `UPDATE public.whatsapp_messages_processing SET status='processed',
             processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
             WHERE id=$1 AND status='pending'`,
            [row.id,JSON.stringify(result)],
          );
          continue;
        }
        const parsed=parseEscortOrder(row.text_content,{
          messageDate:new Date(Date.parse(sourceAt)+6*60*60*1000).toISOString().slice(0,10),
        });
        const operations=deriveEscortRegisterOps(
          account,[message],contacts,accountRows,aliases,groupAuthorizations,[...CASH_SCOPE_CHATS],
          {
            epoch:"CANONICAL_BACKFILL_20261026",chatAliases,
            // Only the verified Admin identity (the paired Owner account behind
            // WA-01) may act as the confirmation sender. Any other outgoing row
            // in a client chat is ignored instead of being treated as Admin.
            requireVerifiedAdmin:true,
            // Disabled by default; Owner-enabled shadow evidence only.
            duplicateShadow:process.env.ALRIFAI_DUPLICATE_CLASSIFIER==='SHADOW',
            isVerifiedAdmin:(candidate:{sender?:string;nativeSenderJid?:string;direction?:string})=>
              candidate.direction==="OUTGOING"
              &&(isCashScopeOwner(String(candidate.sender??""))||isCashScopeOwner(String(candidate.nativeSenderJid??""))),
          },
        ) as EscortOperation[];
        if(!operations.length){
          const reason=!row.chat_jid.endsWith("@g.us")&&!contacts.some(contact=>
            contact.account_id===row.wa_account&&contact.active!==false
            &&(contact.phone===row.sender_phone||contact.phone===`+${row.chat_jid.split("@")[0]}`))
            ?"IDENTITY_UNRESOLVED":row.chat_jid.endsWith("@g.us")
              ?"GROUP_SOURCE_REQUIRES_AUTHORIZED_REVIEW":"PARSER_OR_CLASSIFICATION_REQUIRES_REVIEW";
          const result=classifyWithoutOperation(row,parsed.length,reason);
          await client.query(
            `UPDATE public.whatsapp_messages_processing SET status='processed',
             processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
             WHERE id=$1 AND status='pending'`,
            [row.id,JSON.stringify(result)],
          );
          continue;
        }
        for(const operation of operations){
          // Same business/block identity guard as the historical backfill: a
          // re-delivered or already-registered block is never written twice, and
          // two writers of the same key serialize on the transaction-scoped lock.
          const persisted=await persistOperationIfNew(client,operation);
          if(persisted==="skipped_duplicate")continue;
          accountRows.push({
            ...operation.row,account_id:operation.row.accountId,
            client_contact_id:operation.row.clientContactId,client_phone:operation.row.clientPhone,
            chat_jid:operation.row.chatJid,source_time:operation.row.sourceTime,
          });
          if(operation.kind==="REVIEW"){
            const parsed=(operation.row.parsed??{}) as {confirmationMatch?:{state?:string;mobileEvidence?:string;orderId?:string|null;orderMessageId?:string|null}};
            const match=parsed.confirmationMatch;
            const confirmable=match&&["EXACT","VARIANT","CORRECTED"].includes(String(match.state));
            const escortMobile=operation.row.escortMobile;
            const startDate=operation.row.dutyDate;
            const shift=operation.row.shift;
            if(confirmable&&escortMobile&&startDate&&(shift==="D"||shift==="N")){
              const digits=analyzeMobile(escortMobile).digits;
              const employee=employeeByMobile.get(digits);
              await persistConfirmedProgram(client,{
                account:operation.row.accountId,
                clientChat:chatAliases[operation.row.chatJid]??operation.row.chatJid,
                mother:operation.row.motherVessel,
                lighter:operation.row.lighterVessel,
                masterMobile:operation.row.masterMobile,
                destination:operation.row.destination,
                escortName:operation.row.escortName,
                escortMobile,
                startDate,
                shift,
                orderId:String(match.orderId??""),
                orderMessageId:String(match.orderMessageId??""),
                confirmationMessageId:operation.row.sourceMessageId,
                confirmationSourceHash:operation.row.sourceHash,
                reviewRowId:operation.row.id,
                matchState:match.state as "EXACT"|"VARIANT"|"CORRECTED",
                mobileEvidence:String(match.mobileEvidence??"EXACT"),
                employeeLink:employee?{state:"RESOLVED",employeeId:escortMobile,name:employee.name}:{state:"UNRESOLVED",employeeId:escortMobile,name:null},
              });
            }
          }
        }
        await client.query(
          `UPDATE public.whatsapp_messages_processing SET status='processed',
           processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
           WHERE id=$1 AND status='pending'`,
          [row.id,JSON.stringify({
            version:"vessel-review-classification-v1",
            classification:operations.some(operation=>operation.kind==="DRAFT")?"ORDER_DRAFT_CREATED":"ASSIGNMENT_REVIEW",
            reviewStatus:operations.some(operation=>operation.kind==="REVIEW")?"REVIEW":"DRAFT",
            source:{accountId:row.wa_account,chatJid:row.chat_jid,messageId:row.message_id},
            sourceTimestamp:sourceAt,
            operations:operations.map(operation=>({kind:operation.kind,id:operation.row.id,
              reasons:operation.row.reasons,eventType:operation.event.eventType})),
          })],
        );
      }catch(error){
        await client.query(
          `UPDATE public.whatsapp_messages_processing SET status='error',
           processing_errors=$2::jsonb,processed_at=now() WHERE id=$1 AND status='pending'`,
          [row.id,JSON.stringify({code:failureCode(error)})],
        );
      }
    }
    await client.query("COMMIT");
    return rows.length;
  }catch(error){
    try{await client.query("ROLLBACK");}
    catch(rollbackError){throw new AggregateError([error,rollbackError],"Vessel processing transaction and rollback both failed.");}
    throw error;
  }finally{
    client.release();
  }
}

async function main():Promise<void>{
  if(process.env.ALRIFAI_VESSEL_PROCESSING_ENABLED!=="1")throw new Error("VESSEL_PROCESSING_DISABLED");
  try{
    while(true){
      const processed=await processBatch();
      if(!processed)await sleep(5000);
    }
  }finally{
    await pool.end();
  }
}

main().catch((error:unknown)=>{
  console.error(`Vessel processor stopped (${failureCode(error)}).`);
  process.exitCode=1;
});
