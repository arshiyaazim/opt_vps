/** Browser-only synthetic regression harness. No route, credentials or live connections. */
import {createRoot} from 'react-dom/client';
import {SourceDialog} from '../app/register-views';
import AssistantPopup from '../app/assistant-popup';
import ConversationTools from '../candidates/identity-review/ui/ConversationTools';
import OwnerDataTables from '../candidates/identity-review/ui/OwnerDataTables';
import OwnerRecordsWorkspace from '../candidates/identity-review/ui/OwnerRecordsWorkspace';
import CashEntry from '../candidates/identity-review/ui/CashEntry';
import {emptyRegisterFilters} from '../lib/vessel-data';
import {emptyCashFilters} from '../lib/cash-data';
const root=createRoot(document.getElementById('root')!);
const pending:Array<{url:string;body:string;signal:AbortSignal|null;resolve:(response:Response)=>void}>=[];
let expired=0,initialUsed=0,closed=0;
window.fetch=((url,options={})=>new Promise<Response>(resolve=>pending.push({url:String(url),body:String(options.body??''),signal:options.signal??null,resolve}))) as typeof fetch;
const expire=()=>{expired++;};
Object.assign(window,{
 EventSource:class extends EventTarget{close(){}},
 renderFixture(kind:string,scope='wa-01',initialQuestion=''){
  const props={apiBase:'/synthetic',account:scope,csrf:'synthetic-only',onSessionExpired:expire};
  root.render(kind==='records'?<OwnerRecordsWorkspace apiBase={props.apiBase} csrf={props.csrf} kind={scope==='cash'?'cash':'programs'}/>:kind==='source'?<SourceDialog id={scope} onClose={()=>{closed++;root.render(null);}}/>:kind==='request'?<ConversationTools {...props}/>:kind==='tables'?<OwnerDataTables apiBase={props.apiBase} account={scope}/>:kind==='cash'?<CashEntry {...props}/>:kind==='assistant'?<AssistantPopup open onClose={()=>{closed++;root.render(null);}} source={scope} context="register" filters={emptyRegisterFilters} cashFilters={emptyCashFilters} initialQuestion={initialQuestion} onInitialUsed={()=>{initialUsed++;}} aiConfigured={false} openReference={()=>{}}/>:null);
 },
 requests:()=>pending.map(p=>({url:p.url,body:p.body,aborted:p.signal?.aborted??false})),
 reply:(index:number,body:unknown,status=200)=>pending[index].resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})),
 counters:()=>({expired,initialUsed,closed}),
});
