"use client";
import "../cash.css";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,BookOpen,Download,RefreshCw,Search} from "lucide-react";

// Archive Records for Cash.
// Reads only dataset_epoch = LEGACY_PRE_TRANSITION_20261026 through the
// server-owned Cash scope. It cannot widen the conversation scope and it never
// writes. Current totals are unaffected because /api/cash/summary defaults to
// the Current epoch.

type ArchiveRow={
 id:string;source_time:string;employee_name:string;employee_mobile:string|null;
 payout_mobile:string|null;method:string;amount_minor:string;purpose:string;
 state:string;posting_id:string|null;message_id:string|null;chat_jid:string|null;
};
type Summary={counts:{instructions:number;review:number;postings:number;instruction_minor:string;posted_minor:string;total_minor:string};rows:ArchiveRow[];total:number;limit:number;offset:number};

const PAGE_SIZE=100;
const money=(minor:string|number)=>{const n=Number(minor);return Number.isFinite(n)?(n/100).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';};
const day=(value:string)=>new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'});

export default function CashArchivePage(){
 const [filters,setFilters]=useState({q:'',method:'',from:'',to:''});
 const [page,setPage]=useState(1);
 const [data,setData]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);

 useEffect(()=>{
  let alive=true;
  fetch('/api/cash/me',{cache:'no-store'})
   .then(r=>{if(alive)setAuthenticated(r.ok);})
   .catch(()=>{if(alive)setAuthenticated(false);});
  return()=>{alive=false;};
 },[]);

 const query=useCallback((extra:Record<string,string>={})=>{
  const p=new URLSearchParams({scope:'archive',limit:String(PAGE_SIZE),offset:String((page-1)*PAGE_SIZE),...extra});
  for(const [k,v] of Object.entries(filters))if(v)p.set(k,v);
  return p.toString();
 },[filters,page]);

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/cash/summary?'+query(),{cache:'no-store'});
   if(r.status===401){setAuthenticated(false);return;}
   const body=await r.json() as Summary&{error?:string};
   if(!r.ok)throw new Error(body.error??'Archive could not be loaded.');
   setData(body);
  }catch(e){setError(e instanceof Error?e.message:'Archive could not be loaded.');}
  finally{setLoading(false);}
 },[query]);

 useEffect(()=>{if(!authenticated)return;const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[authenticated,load]);

 const pages=useMemo(()=>data?Math.max(1,Math.ceil(Number(data.total)/PAGE_SIZE)):1,[data]);
 const exportCsv=async()=>{
  const all:ArchiveRow[]=[];
  for(let p=1;p<=pages;p++){
   const r=await fetch('/api/cash/summary?'+query({limit:'200',offset:String((p-1)*200)}),{cache:'no-store'});
   if(!r.ok)break;
   const body=await r.json() as Summary;
   all.push(...body.rows);
   if(all.length>=Number(body.total))break;
  }
  const header=['Date','Employee','Employee ID','Payout number','Method','Amount','Purpose','State','Source message'];
  const lines=[header,...all.map(r=>[day(r.source_time),r.employee_name,r.employee_mobile??'',r.payout_mobile??'',r.method,money(r.amount_minor),r.purpose,r.posting_id?'Posted':r.state,r.message_id??''])];
  const csv=lines.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='al-rifai-cash-archive.csv';a.click();URL.revokeObjectURL(url);
 };

 if(authenticated===false)return <main className="cash-shell"><section className="cash-card"><h1>Archive Records for Cash</h1><p>এই archive দেখতে Accounts portal-এ লগইন করুন।</p><Link href="/cash">Accounts portal-এ যান</Link></section></main>;

 return <main className="cash-shell" style={{display:'block',padding:'24px'}}>
  <header style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',marginBottom:'16px'}}>
   <Link href="/cash"><ArrowLeft size={16}/> Accounts</Link>
   <h1 style={{margin:0,fontSize:'20px'}}><BookOpen size={18}/> Archive Records for Cash</h1>
   <span style={{marginLeft:'auto',fontSize:'12px',opacity:.75}}>Pre-transition · read-only · excluded from Current totals</span>
  </header>
  <section className="cash-card" style={{marginBottom:'12px'}}>
   <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'end'}}>
    <label>Search<input value={filters.q} placeholder="Employee, purpose, number…" onChange={e=>{setPage(1);setFilters(f=>({...f,q:e.target.value}));}}/></label>
    <label>Method<select value={filters.method} onChange={e=>{setPage(1);setFilters(f=>({...f,method:e.target.value}));}}><option value="">All</option><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="bank">Bank</option></select></label>
    <label>From<input type="date" value={filters.from} onChange={e=>{setPage(1);setFilters(f=>({...f,from:e.target.value}));}}/></label>
    <label>To<input type="date" value={filters.to} onChange={e=>{setPage(1);setFilters(f=>({...f,to:e.target.value}));}}/></label>
    <button onClick={()=>void load()} disabled={loading}>{loading?<RefreshCw size={14}/>:<Search size={14}/>}Apply</button>
    <button onClick={()=>void exportCsv()} disabled={!data}><Download size={14}/>CSV archive</button>
   </div>
  </section>
  {error&&<p role="alert" style={{color:'#b00'}}>{error}</p>}
  {data&&<section className="cash-card">
   <div style={{display:'flex',gap:'18px',flexWrap:'wrap',marginBottom:'10px',fontSize:'13px'}}>
    <span>Archive instructions: <strong>{Number(data.total).toLocaleString()}</strong></span>
    <span>In review: <strong>{data.counts.review.toLocaleString()}</strong></span>
    <span>Posted: <strong>{data.counts.postings.toLocaleString()}</strong></span>
    <span>Recorded amount: <strong>{money(data.counts.instruction_minor)}</strong></span>
   </div>
   <div className="cash-table-wrap">
    <table>
     <thead><tr><th>Date</th><th>Employee</th><th>Employee ID</th><th>Payout</th><th>Method</th><th>Amount</th><th>State</th><th>Source</th></tr></thead>
     <tbody>{data.rows.map(r=><tr key={r.id}><td>{day(r.source_time)}</td><td><strong>{r.employee_name}</strong><small>{r.purpose}</small></td><td>{r.employee_mobile||'—'}</td><td>{r.payout_mobile||'—'}</td><td>{r.method}</td><td><strong>{money(r.amount_minor)}</strong></td><td>{r.posting_id?'Posted':r.state}</td><td><small>{r.message_id||r.id.slice(0,12)}</small></td></tr>)}</tbody>
    </table>
   </div>
   {!data.rows.length&&!loading&&<p>এই filter-এ কোনো archive record নেই।</p>}
   <footer style={{display:'flex',gap:'12px',alignItems:'center',marginTop:'10px'}}>
    <button disabled={page<=1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button>
    <span style={{fontSize:'13px'}}>Page {page} of {pages}</span>
    <button disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)}>Next</button>
   </footer>
  </section>}
 </main>;
}
