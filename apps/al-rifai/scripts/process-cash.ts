import {createPool} from "../db/postgres.mjs";
import {parseLivePaymentBlocks} from "../candidates/identity-review/live-cash.ts";
import {CASH_SCOPE_ACCOUNT,CASH_SCOPE_CHATS} from "../lib/cash-scope.ts";
import {cashSourceEligibility} from "../lib/cash-source-eligibility.ts";

const BATCH_SIZE=50;
const scopeChats=new Set<string>(CASH_SCOPE_CHATS);
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const pool=createPool({readOnly:false,user:"ir_review_runtime"});
const failureCode=(error:unknown):string=>{
  if(error&&typeof error==="object"&&"code" in error){
    const code=(error as {code?:unknown}).code;
    if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))return `SQLSTATE_${code}`;
  }
  return error instanceof Error&&/^[A-Z][A-Z0-9_:-]{1,100}$/.test(error.message)?error.message:"CASH_PROCESSING_FAILED";
};

type PendingRow={
  id:number;
  original_id:number;
  wa_account:string;
  chat_jid:string;
  chat_type:string;
  message_id:string;
  direction:string;
  sender_jid:string|null;
  receiver_jid:string|null;
  timestamp:Date|string;
  text_content:string|null;
  raw_content:Record<string,unknown>;
};

function classify(row:PendingRow):Record<string,unknown>{
  if(row.wa_account!==CASH_SCOPE_ACCOUNT||!scopeChats.has(row.chat_jid)){
    return {classification:"NOT_CASH_SCOPE",reviewStatus:"NOT_REQUIRED",financialAction:"NONE"};
  }
  const eligibility=cashSourceEligibility({
    accountId:row.wa_account,chatJid:row.chat_jid,direct:row.chat_type==="individual",
    direction:row.direction==="outgoing"?"OUTGOING":row.direction.toUpperCase(),
    senderJid:row.sender_jid,recipientJid:row.receiver_jid??row.chat_jid,
  });
  if(eligibility!=="ELIGIBLE"){
    const review=eligibility==="OWNER_IDENTITY_UNRESOLVED"
      ||eligibility==="CASH_RECIPIENT_IDENTITY_UNRESOLVED"
      ||eligibility==="SOURCE_PROVENANCE_UNRESOLVED";
    return {classification:eligibility,reviewStatus:review?"REVIEW":"NOT_REQUIRED",financialAction:"NONE"};
  }
  if(!row.text_content){
    return {classification:"OWNER_MESSAGE_WITHOUT_TEXT",reviewStatus:"REVIEW",financialAction:"NONE"};
  }
  const blocks=parseLivePaymentBlocks(row.text_content);
  if(!blocks.length){
    return {classification:"NO_PAYMENT_BLOCK_PARSED",reviewStatus:"REVIEW",financialAction:"NONE"};
  }
  return {
    classification:"PAYMENT_INSTRUCTION_CANDIDATE",
    reviewStatus:"REVIEW",
    approvalRequired:true,
    financialAction:"NONE",
    source:{accountId:row.wa_account,chatJid:row.chat_jid,messageId:row.message_id},
    sourceTimestamp:new Date(row.timestamp).toISOString(),
    candidates:blocks,
  };
}

async function processBatch():Promise<number>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const rows=(await client.query(
      `SELECT p.id,p.original_id,o.wa_account,o.chat_jid,o.chat_type,o.message_id,o.direction,
              o.sender_jid,o.receiver_jid,o."timestamp",o.text_content,o.raw_content
       FROM public.whatsapp_messages_processing p
       JOIN public.whatsapp_messages_original o ON o.id=p.original_id
       WHERE p.domain='cash' AND p.status='pending' AND o.wa_account='wa-01'
       ORDER BY p.id
       LIMIT $1
       FOR UPDATE OF p SKIP LOCKED`,
      [BATCH_SIZE],
    )).rows as PendingRow[];
    for(const row of rows){
      try{
        const result=classify(row);
        await client.query(
          `UPDATE public.whatsapp_messages_processing
           SET status='processed',processed_content=$2::jsonb,processing_errors=NULL,processed_at=now()
           WHERE id=$1 AND status='pending'`,
          [row.id,JSON.stringify({version:"cash-review-classification-v1",...result})],
        );
      }catch(error){
        await client.query(
          `UPDATE public.whatsapp_messages_processing
           SET status='error',processing_errors=$2::jsonb,processed_at=now()
           WHERE id=$1 AND status='pending'`,
          [row.id,JSON.stringify({code:failureCode(error)})],
        );
      }
    }
    await client.query("COMMIT");
    return rows.length;
  }catch(error){
    try{await client.query("ROLLBACK");}
    catch(rollbackError){throw new AggregateError([error,rollbackError],"Cash processing transaction and rollback both failed.");}
    throw error;
  }finally{
    client.release();
  }
}

async function main():Promise<void>{
  if(process.env.ALRIFAI_LIVE_CASH_SYNC!=="1"
    ||process.env.ALRIFAI_LIVE_CASH_INTENT_CAPTURE!=="APPROVED_REVIEW_ONLY"){
    throw new Error("CASH_REVIEW_ONLY_MODE_REQUIRED");
  }
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
  console.error(`Cash review processor stopped (${failureCode(error)}).`);
  process.exitCode=1;
});
