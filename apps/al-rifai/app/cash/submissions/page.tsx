"use client";
import "../cash.css";
import "../cash-dashboard.css";
import {useCallback,useEffect,useState} from "react";

type User={id:string;username:string;role:"ADMIN"|"USER";displayName:string;mustChangePassword:boolean};
type Submission={id:string;submitted_by_user_ref:string;submitted_by_username:string|null;employee_name:string;employee_mobile:string|null;payout_mobile:string|null;method:string;amount_minor:number;purpose:string;transaction_date:string;review_state:string;decided_at?:string|null};
type Decision={id:string;decision:string;actor_user_ref:string;note:string;decided_at:string};
type ApiError={error?:string;reasons?:string[];migration?:string;available?:boolean};

const money=(minor:number)=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:2}).format(minor/100);
const emptyForm={employeeName:'',employeeMobile:'',payoutMobile:'',method:'bkash',amount:'',purpose:'',date:'',note:'',evidenceRef:''};

export default function CashSubmissionsPage(){
 const [user,setUser]=useState<User|null>(null);
 const [csrf,setCsrf]=useState('');
 const [booted,setBooted]=useState(false);
 const [login,setLogin]=useState({username:'',password:''});
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [rows,setRows]=useState<Submission[]>([]);
 const [available,setAvailable]=useState(true);
 const [migration,setMigration]=useState('');
 const [form,setForm]=useState({...emptyForm});
 const [busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<{submission:Submission;decisions:Decision[]}|null>(null);

 const loadSubmissions=useCallback(async()=>{
  const response=await fetch('/api/cash/submissions',{headers:{Accept:'application/json'}});
  const data=await response.json() as ApiError&{rows?:Submission[]};
  if(response.status===503){setAvailable(false);setMigration(data.migration??'');setRows([]);return;}
  if(!response.ok){setError(data.error??'Submissions could not be loaded.');return;}
  setAvailable(true);setRows(data.rows??[]);
 },[]);

 const loadSession=useCallback(async()=>{
  const response=await fetch('/api/cash/me',{headers:{Accept:'application/json'}});
  if(!response.ok){setUser(null);setBooted(true);return;}
  const data=await response.json() as {user:User;csrf:string};
  setUser(data.user);setCsrf(data.csrf);setBooted(true);
  await loadSubmissions();
 },[loadSubmissions]);

 useEffect(()=>{
  void (async()=>{
    // State updates happen after an await boundary (react-compiler rule).
    await Promise.resolve();
    await loadSession();
  })();
 },[loadSession]);

 const submitLogin=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');setBusy(true);
  try{
   const response=await fetch('/api/cash/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(login)});
   const data=await response.json() as ApiError&{user?:User;csrf?:string};
   if(!response.ok)throw new Error(data.error??'Login failed');
   setUser(data.user??null);setCsrf(data.csrf??'');
   await loadSubmissions();
  }catch(cause){setError(cause instanceof Error?cause.message:'Login failed');}
  finally{setBusy(false);}
 };

 const submitRecord=async(event:React.FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/cash/submissions',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf},body:JSON.stringify(form)});
   const data=await response.json() as ApiError&{id?:string;duplicate?:boolean};
   if(response.status===503){setAvailable(false);setMigration(data.migration??'');throw new Error('Submission storage is not applied yet (migration 0031).');}
   if(!response.ok)throw new Error([data.error??'Submission failed',...(data.reasons??[])].join(' — '));
   setNotice(data.duplicate?`Identical submission already pending (${data.id?.slice(0,12)}…).`:`Submitted for review (${data.id?.slice(0,12)}…). No posting occurred.`);
   setForm({...emptyForm});
   await loadSubmissions();
  }catch(cause){setError(cause instanceof Error?cause.message:'Submission failed');}
  finally{setBusy(false);}
 };

 const openDetail=async(submission:Submission)=>{
  setError('');
  const response=await fetch(`/api/cash/submissions?id=${submission.id}`,{headers:{Accept:'application/json'}});
  const data=await response.json() as ApiError&{decisions?:Decision[]};
  if(!response.ok){setError(data.error??'Detail unavailable');return;}
  setSelected({submission,decisions:data.decisions??[]});
 };

 const decide=async(submission:Submission,decision:string)=>{
  const prompt=decision==='APPROVED'?null:window.prompt('Reason for '+decision.toLowerCase()+' (required):','');
  if(decision!=='APPROVED'&&!prompt)return;
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch(`/api/cash/submissions/${submission.id}/decision`,{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf},body:JSON.stringify({decision,note:prompt??''})});
   const data=await response.json() as ApiError&{reviewState?:string};
   if(response.status===503){setAvailable(false);setMigration(data.migration??'');throw new Error('Review storage is not applied yet (migration 0031).');}
   if(!response.ok)throw new Error(data.error??'Decision failed');
   setNotice(`Decision recorded: ${data.reviewState??decision}. No financial posting occurred.`);
   await loadSubmissions();
  }catch(cause){setError(cause instanceof Error?cause.message:'Decision failed');}
  finally{setBusy(false);}
 };

 if(!booted)return <main className="cash-app"><section className="cash-workspace"><p className="cash-muted">Loading secure session…</p></section></main>;
 if(!user)return <main className="cash-app"><section className="cash-workspace"><div className="cash-main"><h1>Cash Portal sign in</h1>{error&&<p role="alert" className="cash-error">{error}</p>}<form className="cash-card" onSubmit={submitLogin}><label>Username<input value={login.username} onChange={e=>setLogin({...login,username:e.target.value})} required/></label><label>Password<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label><button disabled={busy}>Sign in</button></form><p className="cash-muted"><a href="/cash">← Back to Accounts</a></p></div></section></main>;

 return <main className="cash-app"><section className="cash-workspace"><div className="cash-main">
  <header className="cash-page-head"><div><p className="cash-eyebrow">CASH PORTAL · REVIEW WORKFLOW</p><h1>Submissions &amp; review</h1><p>Submission is not approval; approval is not financial posting. Nothing on this page writes to the Cash Ledger.</p></div><div className="cash-head-actions"><a className="cash-clear" href="/cash">← Accounts</a>{user.role==='ADMIN'&&<span className="cash-muted">Admin review queue</span>}</div></header>
  {error&&<div className="cash-error" role="alert">{error}</div>}
  {notice&&<div className="cash-notice" role="status">{notice}</div>}
  {!available&&<div className="cash-error" role="status">Submission storage is prepared but not applied in this deployment. Migration dependency: {migration||'0031_cash_submissions_and_reviews.sql'}. No records can be read or written until the Owner approves and applies it.</div>}

  {available&&<section className="cash-card">
   <h2>Submit a cash record</h2>
   <p className="cash-muted">The record becomes PENDING_REVIEW. Employee ID and payout number stay separate. Saving never posts to the ledger.</p>
   <form onSubmit={submitRecord} className="cash-admin-form">
    <input placeholder="Employee name" required value={form.employeeName} onChange={e=>setForm({...form,employeeName:e.target.value})}/>
    <input placeholder="Employee mobile (01…)" required value={form.employeeMobile} onChange={e=>setForm({...form,employeeMobile:e.target.value})}/>
    <input placeholder="Payout mobile (01…)" required value={form.payoutMobile} onChange={e=>setForm({...form,payoutMobile:e.target.value})}/>
    <select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}>{['bkash','nagad','cash','rocket','bank'].map(method=><option key={method} value={method}>{method}</option>)}</select>
    <input placeholder="Amount (BDT)" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
    <input placeholder="Purpose" required value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/>
    <input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
    <input placeholder="Evidence reference (optional)" value={form.evidenceRef} onChange={e=>setForm({...form,evidenceRef:e.target.value})}/>
    <input placeholder="Note (optional)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
    <button disabled={busy}>Submit for review</button>
   </form>
  </section>}

  {available&&<section className="cash-table-card">
   <div className="cash-card-head"><div><h2>{user.role==='ADMIN'?'Review queue':'My submissions'}</h2><p>Latest decision per submission · append-only history retained.</p></div><button onClick={()=>void loadSubmissions()} disabled={busy}>Refresh</button></div>
   <div className="cash-table-wrap"><table><thead><tr><th>Date</th><th>Submitter</th><th>Employee</th><th>Amount</th><th>Method</th><th>Purpose</th><th>State</th><th>Actions</th></tr></thead><tbody>
    {rows.map(row=><tr key={row.id}><td>{row.transaction_date}</td><td>{row.submitted_by_username??'—'}</td><td><strong>{row.employee_name}</strong><small>{row.employee_mobile??'—'}</small></td><td>{money(Number(row.amount_minor))}</td><td>{row.method}</td><td>{row.purpose}</td><td>{row.review_state}</td><td><span style={{display:'flex',gap:6,flexWrap:'wrap'}}><button onClick={()=>void openDetail(row)}>History</button>{user.role==='ADMIN'&&row.review_state==='PENDING_REVIEW'&&<><button onClick={()=>void decide(row,'APPROVED')} disabled={busy||row.submitted_by_user_ref===user.id}>Approve</button><button onClick={()=>void decide(row,'REJECTED')} disabled={busy||row.submitted_by_user_ref===user.id}>Reject</button><button onClick={()=>void decide(row,'CORRECTION_REQUESTED')} disabled={busy||row.submitted_by_user_ref===user.id}>Correction</button></>}</span></td></tr>)}
    {!rows.length&&<tr><td colSpan={8} className="cash-empty">No submissions in scope.</td></tr>}
   </tbody></table></div>
  </section>}

  {selected&&<section className="cash-card">
   <h2>Audit history — {selected.submission.employee_name}</h2>
   <p className="cash-muted">Submission {selected.submission.id.slice(0,12)}… · current state {selected.submission.review_state}</p>
   <ul>{selected.decisions.map(decision=><li key={decision.id}><strong>{decision.decision}</strong> · {new Date(decision.decided_at).toLocaleString('en-GB')} · {decision.actor_user_ref.slice(0,8)}…<br/><small>{decision.note||'No note'}</small></li>)}
    {!selected.decisions.length&&<li className="cash-muted">No decisions recorded yet.</li>}</ul>
   <button className="cash-clear" onClick={()=>setSelected(null)}>Close</button>
  </section>}
 </div></section></main>;
}
