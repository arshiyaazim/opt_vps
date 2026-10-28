import {NextRequest} from "next/server";
import {auth,audit,bodyOptional,bodyString,CashPortalError,clearCookie,createSession,cookieHeader,database,findUser,hashPassword,hashToken,json,noStoreHeaders,publicUser,refreshCsrf,requireOrigin,requireCashSuperAdmin,verifyPassword,userById,isCashSuperAdmin,revokeOtherSessions} from "@/lib/cash-portal";
import {assertCanCreateUser,assertCanManageUser,assertCanResetPassword,CashUserPolicyError} from "@/lib/cash-user-policy";
import {assertNotRemovingLastSuperAdmin,UnifiedAuthError,validateCapabilityRequest} from "@/lib/unified-auth-policy";
import {validateSubmission} from "@/lib/cash-submission";
import {assertCanDecide,ApprovalError,SUBMISSION_SCHEMA_DEPENDENCY} from "@/lib/cash-approval";
import {CASH_SCOPE_ACCOUNT,CASH_SCOPE_CHATS,cashScopedWhere} from "@/lib/cash-scope";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Row=Record<string,unknown>;
function reply(data:unknown,status=200,headers:HeadersInit={}){return json(data,status,{...noStoreHeaders(),...headers});}
async function readBody(request:Request){try{const value=await request.json();return value&&typeof value==="object"?value as Row:{};}catch{throw new CashPortalError("INVALID_JSON",400);}}
function requireAdmin(user:{role:string}){if(user.role!=="ADMIN")throw new CashPortalError("ADMIN_REQUIRED",403);}
/** Runs a pure policy guard and maps its denial into the portal error contract. */
function policy(guard:()=>void){try{guard();}catch(e){if(e instanceof CashUserPolicyError||e instanceof UnifiedAuthError)throw new CashPortalError(e.code,e.status);throw e;}}
async function activeAdminCount(){const row=await database().query<{n:number}>("SELECT count(*)::int AS n FROM public.cash_portal_users WHERE role='ADMIN' AND active=true");return Number(row.rows[0]?.n??0);}
async function activeConfiguredAdminCount(){const ids=(process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS??'').split(',').map(value=>value.trim()).filter(value=>/^[a-f0-9]{64}$/.test(value));if(!ids.length)return 0;const row=await database().query<{n:number}>("SELECT count(*)::int AS n FROM public.cash_portal_users WHERE id=ANY($1::text[]) AND role='ADMIN' AND active=true",[ids]);return Number(row.rows[0]?.n??0);}
const capabilitiesMigration='db/migration-candidates/0033_unified_auth_sessions.sql';
function forced(user:{mustChangePassword:boolean}){if(user.mustChangePassword)throw new CashPortalError("PASSWORD_CHANGE_REQUIRED",403);}
function cleanUsername(value:unknown){const username=bodyString(value,80);return username&&/^[A-Za-z0-9._-]+$/.test(username)?username:undefined;}
function cleanId(value:unknown){return typeof value==="string"&&/^[a-f0-9]{64}$/.test(value)?value:undefined;}
const schemaUnavailable=(error:unknown)=>!!error&&typeof error==="object"&&(error as {code?:string}).code==="42P01";
const schemaReply=()=>reply({error:SUBMISSION_SCHEMA_DEPENDENCY,available:false,migration:"db/migration-candidates/0031_cash_submissions_and_reviews.sql"},503);
const cashMobile=(value:string)=>value.startsWith("0")?"+880"+value.slice(1):value;
function approvalReply(error:ApprovalError){throw new CashPortalError(error.code,403);}
async function handle(request:NextRequest,segments:string[]){
 const action=segments[0]||"";
 if(request.method==="POST"&&action==="login"){
  requireOrigin(request);
  const body=await readBody(request),username=cleanUsername(body.username),password=typeof body.password==="string"?body.password:"";
  if(!username||!password)return reply({error:"CREDENTIALS_REQUIRED"},400);
  const row=await findUser(username);if(!row||!(await verifyPassword(password,row.password_hash))){return reply({error:"INVALID_CREDENTIALS"},401);}
  const session=await createSession(request,row);await audit(row.id,row.id,"LOGIN",{});
  return reply({user:session.user,csrf:session.csrf},200,{"Set-Cookie":cookieHeader(session.token)});
 }
 if(action==="me"&&request.method==="GET"){try{const result=await auth(request);return reply({user:result.user,csrf:await refreshCsrf(result.token)});}catch(e){return reply({error:e instanceof CashPortalError?e.code:"AUTHENTICATION_REQUIRED"},401);}}
 const result=await auth(request,request.method!=="GET");
 if(action==="logout"&&request.method==="POST"){await database().query("DELETE FROM public.cash_portal_sessions WHERE id=$1",[hashToken(result.token)]);await audit(result.user.id,result.user.id,"LOGOUT",{});return reply({ok:true},200,{"Set-Cookie":clearCookie()});}
 // ---- Cash submissions: submission is not approval and never posts. ----
 if(action==="submissions"&&request.method==="POST"){
  forced(result.user);
  const body=await readBody(request),validation=validateSubmission(body);
  if(!validation.ok)return reply({error:"SUBMISSION_INVALID",reasons:validation.reasons},400);
  const payload=validation.payload,id=hashToken(`cash-submission:${payload.payloadHash}`);
  try{
   const inserted=await database().query<{id:string}>(
    `INSERT INTO public.cash_submissions
     (id,scope_account,submitted_by_user_ref,submitted_by_role,employee_name,employee_mobile,payout_mobile,method,amount_minor,purpose,transaction_date,note,evidence_ref,payload,payload_hash)
     VALUES($1,'wa-01',$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,$13::jsonb,$14)
     ON CONFLICT (payload_hash) DO NOTHING RETURNING id`,
    [id,result.user.id,result.user.role,payload.employeeName,cashMobile(payload.employeeMobile),cashMobile(payload.payoutMobile),payload.method,payload.amountMinor,payload.purpose,payload.date,payload.note,payload.evidenceRef,JSON.stringify({...payload,state:undefined,payloadHash:undefined}),payload.payloadHash]);
   const duplicate=!inserted.rows.length;
   const submissionId=duplicate?(await database().query<{id:string}>("SELECT id FROM public.cash_submissions WHERE payload_hash=$1",[payload.payloadHash])).rows[0]?.id??id:id;
   await audit(result.user.id,submissionId,"SUBMISSION_CREATED",{scopeAccount:"wa-01",payloadHash:payload.payloadHash,duplicate});
   return reply({ok:true,id:submissionId,state:"PENDING_REVIEW",duplicate,postingAuthorized:false},duplicate?200:201);
  }catch(error){if(schemaUnavailable(error))return schemaReply();throw error;}
 }
 if(action==="submissions"&&request.method==="GET"){
  forced(result.user);
  const id=cleanId(request.nextUrl.searchParams.get("id"));
  try{
   const rows=await database().query<Row>(
    `SELECT submission_id AS id,scope_account,submitted_by_user_ref,employee_name,employee_mobile,payout_mobile,method,amount_minor,purpose,transaction_date,created_at,review_state,decision,decided_by,decided_at
     FROM public.cash_submission_review_state
     WHERE ($1::boolean OR submitted_by_user_ref=$2)
     ORDER BY created_at DESC LIMIT 200`,
    [result.user.role==="ADMIN",result.user.id]);
   const visible=id?rows.rows.filter(row=>row.id===id):rows.rows;
   if(id&&!visible.length)return reply({error:"SUBMISSION_NOT_FOUND"},404);
   const decisions=id?await database().query<Row>(
    "SELECT id,decision,actor_user_ref,note,decided_at FROM public.cash_submission_reviews WHERE submission_id=$1 ORDER BY decided_at,id",[id]):{rows:[]};
   return reply({available:true,rows:visible,decisions:decisions.rows,scope:"self"});
  }catch(error){if(schemaUnavailable(error))return schemaReply();throw error;}
 }
 if(action==="submissions"&&segments[1]&&segments[2]==="decision"&&request.method==="POST"){
  forced(result.user);requireAdmin(result.user);
  const submissionId=cleanId(segments[1]);if(!submissionId)return reply({error:"SUBMISSION_ID_INVALID"},400);
  const body=await readBody(request);
  try{
   const submission=(await database().query<Row>("SELECT id,submitted_by_user_ref FROM public.cash_submissions WHERE id=$1",[submissionId])).rows[0];
   if(!submission)return reply({error:"SUBMISSION_NOT_FOUND"},404);
   const prior=await database().query<Row>("SELECT actor_user_ref,decision FROM public.cash_submission_reviews WHERE submission_id=$1",[submissionId]);
   let decision;
   try{
    decision=assertCanDecide({actor:result.user,submission:{id:String(submission.id),submittedByUserRef:String(submission.submitted_by_user_ref)},decision:String(body.decision??''),note:typeof body.note==='string'?body.note:'',priorDecisions:prior.rows.map((row)=>({actorUserRef:String(row.actor_user_ref),decision:String(row.decision)}))});
   }catch(error){if(error instanceof ApprovalError)approvalReply(error);throw error;}
   const decisionId=hashToken(`cash-decision:${submissionId}:${result.user.id}:${decision.decision}:${prior.rows.length}`);
   await database().query(
    `INSERT INTO public.cash_submission_reviews(id,submission_id,decision,actor_user_ref,actor_role,submitted_by_user_ref,note,payload_hash)
     VALUES($1,$2,$3,$4,'ADMIN',$5,$6,$7)`,
    [decisionId,submissionId,decision.decision,result.user.id,String(submission.submitted_by_user_ref),decision.note,hashToken(`decision-payload:${submissionId}:${decisionId}`)]);
   await audit(result.user.id,submissionId,"SUBMISSION_DECISION",{decision:decision.decision,postingAuthorized:false});
   const projected=(await database().query<Row>("SELECT review_state,decision,decided_at FROM public.cash_submission_review_state WHERE submission_id=$1",[submissionId])).rows[0];
   return reply({ok:true,id:decisionId,reviewState:projected?.review_state??null,postingAuthorized:false},201);
  }catch(error){if(schemaUnavailable(error))return schemaReply();throw error;}
 }
 if(result.user.mustChangePassword&&!['password','summary','profile','logout'].includes(action))forced(result.user);
 if(action==="profile"&&request.method==="PATCH"){
  const body=await readBody(request),displayName=bodyOptional(body.displayName,150),email=bodyOptional(body.email,320),mobile=bodyOptional(body.mobile,50),whatsapp=bodyOptional(body.whatsappNumber,50);
  if(displayName===null||email===null||mobile===null||whatsapp===null)return reply({error:"PROFILE_FIELD_INVALID"},400);
  const row=await userById(result.user.id);if(!row)return reply({error:"USER_NOT_FOUND"},404);
  await database().query<Row>("UPDATE public.cash_portal_users SET display_name=$2,email=$3,mobile=$4,whatsapp_number=$5,version=version+1 WHERE id=$1 RETURNING *",[row.id,displayName===undefined?row.display_name:displayName,email===undefined?row.email:email,mobile===undefined?row.mobile:mobile,whatsapp===undefined?row.whatsapp_number:whatsapp]);
  await audit(row.id,row.id,"PROFILE_UPDATED",{});return reply({user:publicUser((await userById(row.id))!)});
 }
 if(action==="password"&&request.method==="POST"){
  const body=await readBody(request),current=typeof body.currentPassword==="string"?body.currentPassword:"",next=typeof body.newPassword==="string"?body.newPassword:"",confirm=typeof body.confirmPassword==="string"?body.confirmPassword:"";
  const row=await userById(result.user.id);if(!row||!(await verifyPassword(current,row.password_hash)))return reply({error:"CURRENT_PASSWORD_INVALID"},400);
  if(next.length<12||Buffer.byteLength(next)>256)return reply({error:"PASSWORD_POLICY"},400);
  if(next!==confirm)return reply({error:"PASSWORD_CONFIRMATION_MISMATCH"},400);
  const encoded=await hashPassword(next);await database().query("UPDATE public.cash_portal_users SET password_hash=$2,must_change_password=false,password_changed_at=now(),version=version+1 WHERE id=$1",[row.id,encoded]);
  // Same revocation implementation as the unified/Admin path: every other session
  // for this account is removed, the caller's own session stays valid, and the
  // count is recorded in the audit row.
  const otherSessionsRevoked=await revokeOtherSessions(row.id,result.token);
  await audit(row.id,row.id,"PASSWORD_CHANGED",{surface:"cash",otherSessionsRevoked});
  const fresh=await userById(row.id);return reply({user:publicUser(fresh!),otherSessionsRevoked});
 }
 if(action==="users"&&request.method==="GET"){requireAdmin(result.user);const rows=await database().query<Row>("SELECT id,username,role,display_name AS \"displayName\",email,mobile,whatsapp_number AS \"whatsappNumber\",must_change_password AS \"mustChangePassword\",active,last_seen_at AS \"lastSeenAt\",created_at AS \"createdAt\",to_jsonb(u)->'capabilities' AS capabilities FROM public.cash_portal_users u ORDER BY lower(username)");return reply({users:rows.rows});}
 if(action==="users"&&request.method==="POST"){requireAdmin(result.user);const body=await readBody(request),username=cleanUsername(body.username),password=typeof body.password==="string"?body.password:"",displayName=bodyString(body.displayName,150);if(!username||!displayName||password.length<12||Buffer.byteLength(password)>256)return reply({error:"USER_FIELDS_INVALID"},400);const requestedRole=body.role==="ADMIN"?"ADMIN":"USER";policy(()=>assertCanCreateUser(result.user,requestedRole,isCashSuperAdmin(result.user)));const id=hashToken(`cash-user:${username.toLowerCase()}`);const encoded=await hashPassword(password);try{await database().query("INSERT INTO public.cash_portal_users(id,username,password_hash,role,display_name,email,mobile,whatsapp_number,must_change_password,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)",[id,username,encoded,requestedRole,displayName,bodyOptional(body.email,320),bodyOptional(body.mobile,50),bodyOptional(body.whatsappNumber,50),result.user.id]);}catch(e){if((e as {code?:string}).code==="23505")return reply({error:"USERNAME_EXISTS"},409);throw e;}await audit(result.user.id,id,"USER_CREATED",{role:requestedRole});return reply({ok:true,id},201);}
 if(action==="users"&&segments[1]&&segments[2]==="password"&&request.method==="POST"){requireAdmin(result.user);const id=cleanId(segments[1]);const body=await readBody(request),next=typeof body.newPassword==="string"?body.newPassword:"";if(!id||next.length<12||Buffer.byteLength(next)>256)return reply({error:"PASSWORD_POLICY"},400);const target=await userById(id);if(!target)return reply({error:"USER_NOT_FOUND"},404);policy(()=>assertCanResetPassword(result.user,{id:target.id,role:target.role,active:target.active},isCashSuperAdmin(result.user)));await database().query("UPDATE public.cash_portal_users SET password_hash=$2,must_change_password=true,password_changed_at=NULL,version=version+1 WHERE id=$1",[id,await hashPassword(next)]);await database().query("DELETE FROM public.cash_portal_sessions WHERE user_id=$1",[id]);await audit(result.user.id,id,"PASSWORD_RESET",{targetRole:target.role});return reply({ok:true});}
 if(action==="users"&&segments[1]&&request.method==="PATCH"){requireAdmin(result.user);const id=cleanId(segments[1]);if(!id)return reply({error:"USER_ID_INVALID"},400);const target=await userById(id);if(!target)return reply({error:"USER_NOT_FOUND"},404);const body=await readBody(request);const displayName=bodyOptional(body.displayName,150),email=bodyOptional(body.email,320),mobile=bodyOptional(body.mobile,50),whatsapp=bodyOptional(body.whatsappNumber,50);if(displayName===null||email===null||mobile===null||whatsapp===null)return reply({error:"PROFILE_FIELD_INVALID"},400);const nextRole=body.role==="ADMIN"||body.role==="USER"?body.role:target.role;const nextActive=typeof body.active==="boolean"?body.active:target.active;const activeAdmins=await activeAdminCount();policy(()=>assertCanManageUser({actor:result.user,target:{id:target.id,role:target.role,active:target.active},nextRole,nextActive,activeAdmins,superAdmin:isCashSuperAdmin(result.user)}));
  // Configured Super Admin identity is protected beyond the last-ADMIN rule.
  const configuredAdmins=await activeConfiguredAdminCount();
  policy(()=>assertNotRemovingLastSuperAdmin({targetId:target.id,targetRole:target.role,targetActive:target.active,nextRole,nextActive,configuredIds:process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS,activeConfiguredAdmins:configuredAdmins}));
  // Capability grants are Super-Admin-only and additive to the stored role.
  let capabilities: string[] | null = null;
  if(body.capabilities!==undefined)policy(()=>{capabilities=validateCapabilityRequest({role:result.user.role,superAdmin:isCashSuperAdmin(result.user)},target.role,body.capabilities);});
  if(capabilities){
   // The capability column is created by prepared migration 0033. Until it is
   // applied the request reports the dependency instead of failing opaquely.
   try{
    await database().query("UPDATE public.cash_portal_users SET display_name=$2,email=$3,mobile=$4,whatsapp_number=$5,active=$6,role=$7,capabilities=$8::jsonb,version=version+1 WHERE id=$1",[id,displayName??target.display_name,email===undefined?target.email:email,mobile===undefined?target.mobile:mobile,whatsapp===undefined?target.whatsapp_number:whatsapp,nextActive,nextRole,JSON.stringify(capabilities)]);
   }catch(error){
    if((error as {code?:string}).code==="42703"||schemaUnavailable(error))return reply({error:"CAPABILITIES_MIGRATION_REQUIRED",available:false,migration:capabilitiesMigration},503);
    throw error;
   }
  }else{
   await database().query("UPDATE public.cash_portal_users SET display_name=$2,email=$3,mobile=$4,whatsapp_number=$5,active=$6,role=$7,version=version+1 WHERE id=$1",[id,displayName??target.display_name,email===undefined?target.email:email,mobile===undefined?target.mobile:mobile,whatsapp===undefined?target.whatsapp_number:whatsapp,nextActive,nextRole]);
  }
  await audit(result.user.id,id,"USER_UPDATED",{roleBefore:target.role,roleAfter:nextRole,activeBefore:target.active,activeAfter:nextActive,capabilities});return reply({ok:true});}
 if(action==="audit"&&request.method==="GET"){
  requireCashSuperAdmin(result.user);
  const limit=Math.max(1,Math.min(200,Number(request.nextUrl.searchParams.get("limit"))||100));
  try{
   const rows=await database().query<Row>("SELECT a.id,a.actor_id,a.target_id,a.action,a.details,a.created_at,actor.username AS actor_username,target.username AS target_username FROM public.cash_portal_audit a LEFT JOIN public.cash_portal_users actor ON actor.id=a.actor_id LEFT JOIN public.cash_portal_users target ON target.id=a.target_id ORDER BY a.created_at DESC,a.id DESC LIMIT $1",[limit]);
   return reply({rows:rows.rows,limit,readOnly:true});
  }catch(error){
   if(schemaUnavailable(error)||(error as {code?:string}).code==="42501")return reply({error:"AUDIT_READ_MIGRATION_REQUIRED",available:false,migration:capabilitiesMigration},503);
   throw error;
  }
 }
 if(action==="summary"&&request.method==="GET"){
  requireCashSuperAdmin(result.user);
  const q=request.nextUrl.searchParams,term=bodyString(q.get("q"),150),method=bodyString(q.get("method"),20),from=bodyString(q.get("from"),10),to=bodyString(q.get("to"),10);
  // Current and Archive are disjoint epochs. Default remains Current so no
  // pre-transition record can appear in a Current total, filter or export.
  const scope: 'CURRENT'|'ARCHIVE' = q.get("scope")==="archive"?'ARCHIVE':'CURRENT';
  const clauses=cashScopedWhere('i',scope);const args:string[]=[];
  if(term){args.push(`%${term.toLowerCase()}%`);clauses.push(`lower(concat_ws(' ',i.employee_name,i.employee_mobile,i.payout_mobile,i.purpose,i.id)) LIKE $${args.length}`);}
  if(method){args.push(method);clauses.push(`i.method=$${args.length}`);}
  if(from){args.push(from);clauses.push(`(i.source_time AT TIME ZONE 'Asia/Dhaka')::date >= $${args.length}::date`);}
  if(to){args.push(to);clauses.push(`(i.source_time AT TIME ZONE 'Asia/Dhaka')::date <= $${args.length}::date`);}
  const where=clauses.join(' AND ');
  const counts=await database().query<Row>(`SELECT (SELECT count(*) FROM public.cash_instructions i WHERE ${where})::int AS instructions,(SELECT count(*) FROM public.cash_instructions i WHERE ${where} AND i.state='REVIEW')::int AS review,(SELECT count(*) FROM public.cash_postings p JOIN public.cash_instructions i ON i.id=p.instruction_id AND i.scope_account=p.scope_account WHERE ${where})::int AS postings,(SELECT coalesce(sum(i.amount_minor),0) FROM public.cash_instructions i WHERE ${where} AND i.amount_minor>0)::bigint AS instruction_minor,(SELECT coalesce(sum(p.amount_minor),0) FROM public.cash_postings p JOIN public.cash_instructions i ON i.id=p.instruction_id AND i.scope_account=p.scope_account WHERE ${where} AND p.amount_minor>0)::bigint AS posted_minor,(SELECT coalesce(sum(p.amount_minor),0) FROM public.cash_postings p JOIN public.cash_instructions i ON i.id=p.instruction_id AND i.scope_account=p.scope_account WHERE ${where} AND p.amount_minor>0)::bigint AS total_minor,(SELECT count(DISTINCT i.employee_mobile) FROM public.cash_instructions i WHERE ${where} AND i.employee_mobile IS NOT NULL AND btrim(i.employee_mobile)<>'')::int AS employees,(SELECT count(DISTINCT i.payout_mobile) FROM public.cash_instructions i WHERE ${where} AND i.payout_mobile IS NOT NULL AND btrim(i.payout_mobile)<>'')::int AS payouts,(SELECT count(*) FROM public.cash_instructions i WHERE ${where} AND btrim(i.employee_name)<>'' AND i.employee_mobile IS NOT NULL AND btrim(i.employee_mobile)<>'' AND i.payout_mobile IS NOT NULL AND btrim(i.payout_mobile)<>'' AND i.amount_minor>0 AND btrim(i.method)<>'' AND btrim(i.purpose)<>'')::int AS complete,(SELECT count(*) FROM public.cash_instructions i WHERE ${where} AND jsonb_array_length(i.reasons)>0)::int AS notes`,args);
  // Bounded paging so Archive can page independently without loading the table.
  const limit=Math.max(1,Math.min(200,Number(q.get("limit"))||100)),offset=Math.max(0,Math.min(1000000,Number(q.get("offset"))||0));
  const rows=await database().query<Row>(`SELECT i.id,i.scope_account,i.source_ref,i.command_id,i.source_time,i.employee_name,i.employee_mobile,i.payout_mobile,i.method,i.amount_minor,i.purpose,i.state,i.reasons,p.id AS posting_id,p.created_at AS posted_at,s.chat_jid,s.message_id,s.original_sender_ref,s.submitted_by_ref,s.origin_state,s.visibility_state FROM public.cash_instructions i LEFT JOIN public.cash_postings p ON p.scope_account=i.scope_account AND p.instruction_id=i.id LEFT JOIN public.source_refs s ON s.scope_account=i.scope_account AND s.id=i.source_ref WHERE ${where} ORDER BY i.source_time DESC,i.id DESC LIMIT ${limit} OFFSET ${offset}`,args);
  return reply({scope,counts:counts.rows[0],rows:rows.rows,total:counts.rows[0]?.instructions??0,limit,offset,filters:{q:term??'',method:method??'',from:from??'',to:to??''}});
 }
 if(action==="messages"&&request.method==="GET"){
  requireCashSuperAdmin(result.user);
  const rows=await database().query<Row>(
   `SELECT o.id,o.wa_account,o.chat_jid,o.chat_type,o.message_id,o.direction,
           o.sender_jid,o.sender_phone,o.sender_push_name,o.receiver_jid,o.group_name,
           o."timestamp" AS source_time,o.message_type,o.text_content,
           p.status AS processing_status,p.processed_content,p.processing_errors
    FROM public.whatsapp_messages_original o
    LEFT JOIN public.whatsapp_messages_processing p
      ON p.original_id=o.id AND p.domain='cash'
    WHERE o.wa_account=$1 AND o.chat_jid=ANY($2::text[])
    ORDER BY o."timestamp" DESC,o.id DESC
    LIMIT 100`,
   [CASH_SCOPE_ACCOUNT,CASH_SCOPE_CHATS],
  );
  return reply({rows:rows.rows,source:"WhatsApp original archive",readOnly:true,financialAction:"NONE"});
 }
 throw new CashPortalError("NOT_FOUND",404);
}
export async function GET(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){try{return await handle(request,(await params).path||[]);}catch(e){return reply({error:e instanceof CashPortalError?e.code:"CASH_PORTAL_ERROR"},e instanceof CashPortalError?e.status:500);}}
export async function POST(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){try{return await handle(request,(await params).path||[]);}catch(e){return reply({error:e instanceof CashPortalError?e.code:"CASH_PORTAL_ERROR"},e instanceof CashPortalError?e.status:500);}}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){try{return await handle(request,(await params).path||[]);}catch(e){return reply({error:e instanceof CashPortalError?e.code:"CASH_PORTAL_ERROR"},e instanceof CashPortalError?e.status:500);}}
