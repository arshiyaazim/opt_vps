import {lazyEvidence} from "@/lib/evidence";
import type {ChatArchive} from "@/lib/evidence-types";
import {getChatGPTUser} from '@/app/chatgpt-auth';
const archive=lazyEvidence<ChatArchive>("chat-archive.json");
import {importedMessages} from '@/lib/conversation-snapshot';
import {loadSnapshot,enrichRecord,RegisterError,connectionState} from '@/lib/vessel-source';
import {queryFilters,filterRows,summarize,options} from '@/lib/vessel-data';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 if(!await getChatGPTUser())return reply({error:'Sign in to open your private register.'},401);
 try{const q=new URL(request.url).searchParams;if(q.has('messages')){const id=q.get('id'),search=(q.get('q')??'').toLowerCase().slice(0,150),category=q.get('category')??'',from=q.get('from')??'',to=q.get('to')??'',offset=Math.max(0,Math.floor(Number(q.get('offset'))||0));const evidence=await importedMessages();const messages=(id?[...evidence,...archive.messages]:evidence).filter(m=>!m.sensitiveExcluded&&(!id||m.id===id)&&(!search||[m.body,m.sender,m.source,m.id].join(' ').toLowerCase().includes(search))&&(!category||m.category===category)&&(!from||m.messageDate>=from)&&(!to||m.messageDate<=to));return reply({messages:messages.slice(offset,offset+25),total:messages.length});}const f=queryFilters(q),snapshot=await loadSnapshot(q.get('source')??'historical');const {rows:all,...metadata}=snapshot,rows=filterRows(all,f),page=Math.max(1,Math.min(10000,Math.floor(Number(q.get('page'))||1)));const id=q.get('id');
 if(id){const record=all.find(r=>r.id===id||r.aliases?.includes(id));return record?reply({record:enrichRecord(record),...metadata}):reply({error:'This record is not in the available data.'},404);}
 rows.sort((a,b)=>q.get('sort')==='oldest'?a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id):q.get('sort')==='lighter'?a.lighterVessel.localeCompare(b.lighterVessel)||a.id.localeCompare(b.id):b.startDate.localeCompare(a.startDate)||a.id.localeCompare(b.id));
 return reply({...metadata,rows:(q.get('export')==='1'?rows:rows.slice((page-1)*40,page*40)).map(enrichRecord),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/40)),summary:summarize(rows),options:options(all),filters:f,connection:connectionState()});
 }catch(e){return reply({error:e instanceof RegisterError?e.message:'The register could not be loaded. Check the filters and try again.'},e instanceof RegisterError?e.status:400);}
}
const denied=()=>reply({error:'This register is read-only. Operational changes are not supported.'},405);
export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;
