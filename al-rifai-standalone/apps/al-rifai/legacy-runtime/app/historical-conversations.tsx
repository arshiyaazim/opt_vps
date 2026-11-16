"use client";
import {useEffect,useState} from "react";
type Message={id:string;source:string;sender:string;messageDate:string;time:string;body:string};
type ArchiveConversation={accountId:string;chatJid:string;isGroup:boolean;displayName:string|null;firstSeenAt:string;lastSeenAt:string};
type ArchivedMessage={archiveId:string;messageId:string;senderId:string|null;direction:string|null;deletedAt:string|null;sourceTimestamp:string|null;messageType:string|null;body:string|null;visibilityState:string;media:{type:string|null;filename:string|null;contentHash:string|null;byteLength:number|null;storedFileRef:string|null}[]};
export default function HistoricalConversations(){
 const [q,setQ]=useState(""),[page,setPage]=useState(1),[data,setData]=useState<{rows:Message[];total:number;pages:number}|null>(null),[error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();const timer=setTimeout(()=>{fetch("/api/conversations?"+new URLSearchParams({mode:"historical",q,page:String(page)}),{cache:"no-store",signal:c.signal}).then(async r=>{const v=await r.json();if(!r.ok)throw new Error(v.error || "Historical conversations unavailable");return v;}).then(v=>{setData(v);setError("");}).catch(e=>{if(e.name!=="AbortError")setError("Historical conversations could not be loaded.");});},200);return()=>{clearTimeout(timer);c.abort();};},[q,page]);
 return <section className="vr-panel vc-context"><div className="vr-card-heading"><h2>Historical conversations</h2><span>Private source evidence · read-only</span></div><div className="vc-evidence"><label>Search historical messages <input aria-label="Search historical messages" value={q} maxLength={150} onChange={e=>{setQ(e.target.value);setPage(1);}}/></label>{error&&<p role="alert">{error}</p>}{data&&<><p>{data.total} source messages · page {page} of {data.pages}</p><div className="vc-history">{data.rows.map(m=><article key={m.id}><div><strong>{m.sender}</strong><small>{m.messageDate} {m.time} · {m.id}</small></div><p>{m.body}</p><small>{m.source}</small></article>)}</div><button className="vr-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="vr-button" disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Next</button></>}</div></section>;
}

export function WhatsAppArchivePanel(){
 const [conversations,setConversations]=useState<ArchiveConversation[]>([]);
 const [conversationPage,setConversationPage]=useState(1);
 const [conversationPages,setConversationPages]=useState(1);
 const [selected,setSelected]=useState<ArchiveConversation|null>(null);
 const [messages,setMessages]=useState<ArchivedMessage[]>([]);
 const [after,setAfter]=useState("0");
 const [previous,setPrevious]=useState<string[]>([]);
 const [nextAfter,setNextAfter]=useState("0");
 const [hasMore,setHasMore]=useState(false);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/conversations?"+new URLSearchParams({mode:"archive",page:String(conversationPage),limit:"25"}),{cache:"no-store",signal:controller.signal})
   .then(async r=>{const v=await r.json();if(!r.ok)throw new Error(v.error||"Archive unavailable");return v as {conversations:ArchiveConversation[];pages:number};})
   .then(v=>{setConversations(v.conversations);setConversationPages(v.pages);setError("");})
   .catch(e=>{if(e.name!=="AbortError")setError(e instanceof Error?e.message:"Archive unavailable.");});
  return()=>controller.abort();
 },[conversationPage]);
 useEffect(()=>{
  if(!selected)return;
  const controller=new AbortController();
  const timer=window.setTimeout(()=>{
   setLoading(true);
   void fetch("/api/conversations?"+new URLSearchParams({
    mode:"archive",account:selected.accountId,chat_jid:selected.chatJid,
    after_rowid:after,limit:"25",
   }),{cache:"no-store",signal:controller.signal})
    .then(async r=>{const v=await r.json();if(!r.ok)throw new Error(v.error||"Archive page unavailable");return v as {rows:ArchivedMessage[];nextAfter:string;hasMore:boolean};})
    .then(v=>{setMessages(v.rows);setNextAfter(v.nextAfter);setHasMore(v.hasMore);setError("");})
    .catch(e=>{if(e.name!=="AbortError")setError(e instanceof Error?e.message:"Archive page unavailable.");})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  },0);
  return()=>{window.clearTimeout(timer);controller.abort();};
 },[selected,after]);
 const choose=(conversation:ArchiveConversation)=>{setSelected(conversation);setMessages([]);setAfter("0");setPrevious([]);setError("");};
 const next=()=>{setPrevious(v=>[...v,after]);setAfter(nextAfter);};
 const back=()=>{const last=previous.at(-1);if(last===undefined)return;setPrevious(v=>v.slice(0,-1));setAfter(last);};
 return <section className="vr-panel vc-context">
  <div className="vr-card-heading"><h2>WhatsApp conversation archive</h2><span>Stored copy · read-only · no live fetch</span></div>
  <div className="vc-evidence">
   {error&&<p role="alert">{error}</p>}
   {!selected&&<><p>{conversations.length} stored conversations on this page. The archive is not populated by this view.</p>
    {!conversations.length&&!error&&<p>No archived conversations are available.</p>}
    <div className="vc-history">{conversations.map(c=><article key={c.accountId+":"+c.chatJid}>
     <div><strong>{c.displayName||`${c.isGroup?"Group":"Direct"} · ${c.accountId}`}</strong><small>{c.chatJid}</small></div>
     <button className="vr-button" onClick={()=>choose(c)}>Open stored conversation</button>
    </article>)}</div>
    {conversationPages>1&&<><button className="vr-button" disabled={conversationPage<=1} onClick={()=>setConversationPage(p=>p-1)}>Previous conversations</button>
     <span>Page {conversationPage} of {conversationPages}</span>
     <button className="vr-button" disabled={conversationPage>=conversationPages} onClick={()=>setConversationPage(p=>p+1)}>Next conversations</button></>}
   </>}
   {selected&&<><button className="vr-button" onClick={()=>{setSelected(null);setMessages([]);setError("");}}>All conversations</button>
    <p>{selected.accountId} · {selected.chatJid}{loading?" · Loading…":""}</p>
    <div className="vc-history">{messages.map(m=><article key={m.archiveId+":"+m.messageId}>
     <div><strong>{m.senderId||"Sender unavailable"} · {m.direction||"Direction unavailable"}</strong><small>{m.sourceTimestamp||"Timestamp unavailable"} · {m.messageId}</small></div>
     <p>{m.visibilityState==="VISIBLE"?(m.body||"No text body"):"Content withheld · "+m.visibilityState}{m.deletedAt?` · Source deletion time ${m.deletedAt}`:""}</p>
     {m.media.map((media,index)=><small key={index}>
      {media.type||"Media"}{media.filename?` · ${media.filename}`:""}
      {media.contentHash?` · SHA-256 ${media.contentHash}`:""}
      {media.byteLength!==null?` · ${media.byteLength} bytes`:""}
      {media.storedFileRef?" · Archived file reference available":" · Original bytes not archived"}
     </small>)}
    </article>)}</div>
    <button className="vr-button" disabled={!previous.length||loading} onClick={back}>Previous</button>
    <button className="vr-button" disabled={!hasMore||loading} onClick={next}>Next</button>
   </>}
  </div>
 </section>;
}
