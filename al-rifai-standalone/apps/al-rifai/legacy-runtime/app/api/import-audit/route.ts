import {getChatGPTUser} from '@/app/chatgpt-auth';
import {importSummary as vesselImportSummary,ensureConversationSnapshot,importedMessages,importedPrograms,importedRows} from '@/lib/conversation-snapshot';
import {accountsImportSummary,accountsMessages} from '@/lib/accounts-snapshot';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 if(!await getChatGPTUser())return reply({error:'Sign in to inspect imported sources.'},401);
 try{const importSummary={...vesselImportSummary,...Object.fromEntries(['accountsIdentityVerified','accountsQualifiedRows','accountsIdentityPendingMessages','accountantMessagesExcluded'].map(k=>[k,accountsImportSummary[k as keyof typeof accountsImportSummary]])),accountsReviewItems:accountsImportSummary.reviewItems,accountsPossibleDuplicateGroups:accountsImportSummary.possibleDuplicateGroups};await ensureConversationSnapshot();const q=new URL(request.url).searchParams,view=q.get('view')??'summary',page=Math.max(1,Math.floor(Number(q.get('page'))||1)),search=(q.get('q')??'').toLowerCase().slice(0,150);let rows:unknown[]=[];
 if(view==='messages'){const m=q.get('chat')==='mamun'?accountsMessages():await importedMessages(false);rows=m.filter(r=>!r.sensitiveExcluded&&(!q.get('chat')||r.chatKey===q.get('chat'))&&(!q.get('id')||r.id===q.get('id'))&&(!search||[r.body,r.sender,r.source].join(' ').toLowerCase().includes(search))&&(!q.get('from')||r.messageDate>=q.get('from')!)&&(!q.get('to')||r.messageDate<=q.get('to')!));}
 else if(view==='duplicates')rows=(await importedPrograms()).filter(p=>p.evidence.length>1||p.conflicts.length).map(p=>({id:p.id,lighterVessel:p.lighterVessel,escortName:p.escortName,startDate:p.startDate,evidence:p.evidence,conflicts:p.conflicts}));
 else if(view==='reviews')rows=await importedRows('maritimeReviews');
 else if(view!=='summary')return reply({error:'Choose sources, messages, duplicate evidence or reviews.'},400);
 if(view==='messages')rows.sort((a,b)=>String((b as Record<string,unknown>).messageDate).localeCompare(String((a as Record<string,unknown>).messageDate))||String((b as Record<string,unknown>).time).localeCompare(String((a as Record<string,unknown>).time)));
 return reply({summary:importSummary,rows:rows.slice((page-1)*25,page*25),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/25)),notice:'All supplied message text is retained. Missing media, conflicting values and unverified identities remain in review; no financial completion is inferred.'});
 }catch(e){console.error('Evidence import/read failed',e);return reply({error:'The imported evidence could not be loaded. Retry; original source data is retained.'},503);}
}
const denied=()=>reply({error:'Source evidence is read-only.'},405);export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;
