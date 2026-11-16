import {lazyEvidence} from "@/lib/evidence";
import type {OperationsArchive} from "@/lib/evidence-types";
import {database} from '@/db/raw';
import {getChatGPTUser} from '@/app/chatgpt-auth';
const sources=lazyEvidence<OperationsArchive>("operations.json");
import {accountsImportSummary as importSummary,accountsReviews,accountsMessages} from '@/lib/accounts-snapshot';
import {loadCashSnapshot,loadCashArchiveSnapshot} from '@/lib/cash-source';
import {queryCashFilters,filterCash,cashSummary,cashDaily,employeeStatements} from '@/lib/cash-data';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const writer=()=>false;
async function openDatabase(){return database();}
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Sign in to open operations.'},401);
 try{
 const db=await openDatabase(),q=new URL(request.url).searchParams,view=q.get('view')??'cash';
 // Provenance scope: the old application Accounts dataset is Archive History
 // only; Current never mixes it into the canonical view.
 const scope=q.get('scope')==='archive'||view==='archive'?'archive':'current';
 if(['reviews','summaries'].includes(view)&&scope!=='archive'){return reply({rows:[],total:0,scope,notice:'Old application Accounts messages are available in Archive History only.'});}
 if(['reviews','summaries'].includes(view)){try{queryCashFilters(new URLSearchParams({q:q.get('q')??'',from:q.get('from')??'',to:q.get('to')??''}));}catch{return reply({error:'Choose valid message search filters and dates.'},400);}}
 const notes=await db.all('SELECT * FROM site_operation_notes');const noteMap=new Map(notes.results.map(n=>[String(n.id),n]));
 if(view==='overview')return reply({analysis:sources.analysis,billCount:sources.bills.length,canWrite:writer(),programs:(await db.first("SELECT count(*)::integer AS n FROM programs WHERE \"duplicateOf\" IS NULL AND dataset_epoch='CANONICAL_BACKFILL_20261026'"))?.n,drafts:(await db.first('SELECT count(*)::integer AS n FROM site_payment_drafts'))?.n});
 if(view==='reviews'){
  const query=(q.get('q')??'').toLowerCase(),status=q.get('status')??'pending';
  const rows=(await accountsReviews()).map(r=>({...r,status:noteMap.get(r.id)?.status??'pending',note:noteMap.get(r.id)?.note??''})).filter(r=>(status==='all'||r.status===status)&&(!query||r.body.toLowerCase().includes(query))&&(!q.get('from')||r.date>=q.get('from')!)&&(!q.get('to')||r.date<=q.get('to')!));
  rows.sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||a.id.localeCompare(b.id));const page=Math.max(1,Number(q.get('page'))||1);return reply({rows:rows.slice((page-1)*40,page*40),total:rows.length,canWrite:writer()});
 }
 if(view==='summaries'){
  const notes=(accountsMessages()).filter(m=>m.sender==='Mamun Vai Bkash Nagod').map(m=>({...m,date:m.messageDate,accountingDate:m.messageDate}));const rows=notes.filter(r=>(!q.get('from')||r.accountingDate>=q.get('from')!)&&(!q.get('to')||r.accountingDate<=q.get('to')!)&&(!q.get('q')||r.body.toLowerCase().includes(q.get('q')!.toLowerCase()))).reverse();const page=Math.max(1,Number(q.get('page'))||1);return reply({rows:rows.slice((page-1)*40,page*40),total:rows.length});
 }
 if(view==='bills')return reply({rows:sources.bills});
 if(view==='settlements')return reply({rows:(await db.all('SELECT * FROM site_settlement_drafts ORDER BY "createdAt" DESC LIMIT 200')).results.map(r=>({...JSON.parse(String(r.details)),id:r.id,createdAt:r.createdAt})),canWrite:writer()});
 if(view==='drafts')return reply({rows:(await db.all('SELECT * FROM site_payment_drafts ORDER BY "createdAt" DESC LIMIT 200')).results.map(r=>({...JSON.parse(String(r.details)),id:r.id,createdAt:r.createdAt})),canWrite:writer()});
 const snapshot=scope==='archive'?await loadCashArchiveSnapshot():await loadCashSnapshot();
 if(q.get('id')){const r=snapshot.rows.find(r=>r.id===q.get('id'));return r?reply({...r,checkedAt:snapshot.checkedAt,notice:snapshot.notice}):reply({error:'Record not found.'},404);}
 let filters;try{filters=queryCashFilters(q);}catch{return reply({error:'Choose valid accounts filters and dates.'},400);}
 const rows=filterCash(snapshot.rows,filters),summary=cashSummary(rows),page=Math.max(1,Number(q.get('page'))||1),limit=q.get('export')==='1'?Number.MAX_SAFE_INTEGER:40;
 const statements=view==='employees'?employeeStatements(rows):null,total=statements?statements.length:rows.length,pages=Math.max(1,Math.ceil(total/40));
 return reply({view,rows:(statements??rows).slice(q.get('export')==='1'?0:(page-1)*40,q.get('export')==='1'?limit:page*40),summary,daily:cashDaily(rows),total,page,pages,filters,checkedAt:snapshot.checkedAt,notice:snapshot.notice,sourceLabel:filters.source==='chat'?'Identity-qualified Accounts Ledger':filters.source==='review'?'Legacy extraction · identity unverified':'Excel Cashbook · unverified archive',importSummary,canWrite:false});
 }catch(e){console.error('Operations read failed',e);return reply({error:'Records could not be loaded. Retry; saved records are preserved.'},503);}
}
export async function POST(){return reply({error:'Operational writes are disabled. This Site is read-only.'},405);}

export const PUT=POST;export const PATCH=POST;export const DELETE=POST;
