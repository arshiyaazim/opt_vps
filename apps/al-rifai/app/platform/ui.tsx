'use client';
import {useEffect,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {AlertTriangle,Banknote,CircleAlert,Inbox,Info,Users} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {
  Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle,SheetTrigger,
} from '@/components/ui/sheet';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';

export const bdt=new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:2});
export const fmtBDT=(amountCents:number)=>bdt.format(amountCents/100);
export const fmtInt=new Intl.NumberFormat('en-BD');
const EMPLOYEE_REQUEST_PAGE_SIZE=100;

export function money(cents:number){return fmtBDT(cents);}

/** JSON fetch with loading/error/unavailable handling. Never mutates. */
export function useApi<T>(url:string|null){
  const [state,setState]=useState<{data:T|null;error:string|null;loading:boolean}>({data:null,error:null,loading:!!url});
  useEffect(()=>{
    if(!url)return;
    const controller=new AbortController();
    void (async()=>{
      // State updates run after an await boundary so the effect body stays
      // free of synchronous setState (react-compiler rule).
      await Promise.resolve();
      setState({data:null,error:null,loading:true});
      try{
        const r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
        const v=await r.json().catch(()=>null);
        if(!r.ok)throw new Error((v&&v.error)||r.statusText||'Request failed');
        setState({data:v as T,error:null,loading:false});
      }catch(e:unknown){
        if(!controller.signal.aborted)setState({data:null,error:e instanceof Error?e.message:'Load failed',loading:false});
      }
    })();
    return()=>controller.abort();
  },[url]);
  return state;
}

export function LoadingLines(){return <LoadingSkeleton rows={3}/>;}

export function Unavailable({reason,title='Not available from verified data',compact=false}:{reason:string;title?:string;compact?:boolean}){
  return (
    <div className={compact?'flex items-start gap-2 text-xs text-muted-foreground':'flex flex-col gap-1 rounded-md border border-dashed p-3 text-sm'}>
      {compact?<Info className="mt-0.5 size-3.5 shrink-0" aria-hidden/>:<span className="flex items-center gap-2 font-medium text-foreground"><Info className="size-4" aria-hidden/>{title}</span>}
      {!compact&&<p className="text-muted-foreground">{reason}</p>}
      {compact&&<p>{reason}</p>}
    </div>
  );
}

export function KpiCard({
  label,labelBn,value,valueText,hint,tone,href,
  state='ok',
}:{label:string;labelBn?:string;value?:number;valueText?:string;hint?:string;tone?:'default'|'cash'|'workforce'|'risk'|'ok';href?:string;state?:'ok'|'unavailable'}){
  const display=valueText??(value===undefined?null:fmtInt.format(value));
  const body=(
    <div className="wx-kpi" data-tone={tone??'default'} data-state={state}>
      <span className="wx-kpi-label">
        {tone==='cash'&&<Banknote className="size-3.5" aria-hidden/>}
        {tone==='workforce'&&<Users className="size-3.5" aria-hidden/>}
        {tone==='risk'&&<CircleAlert className="size-3.5" aria-hidden/>}
        <span className="truncate">{label}</span>
        {labelBn&&<span className="text-[10px] opacity-70">{labelBn}</span>}
      </span>
      <strong className="wx-kpi-value">
        {state==='unavailable'||display===null?'Unavailable':display}
      </strong>
      {hint&&<span className="wx-kpi-hint">{hint}</span>}
    </div>
  );
  return href?(
    <Link href={href} className="block no-underline transition-transform hover:-translate-y-px">{body}</Link>
  ):body;
}

export function KpiGrid({children}:{children:ReactNode}){return <div className="wx-kpis">{children}</div>;}

/* ---------------- Page scaffold ---------------- */

export function PageHeader({title,description,actions,eyebrow,meta}:{
  title:string;description?:string;actions?:ReactNode;eyebrow?:string;meta?:ReactNode;
}){
  return (
    <header className="wx-header">
      <div className="wx-header-main">
        {eyebrow&&<span className="wx-eyebrow">{eyebrow}</span>}
        <h1 className="wx-title">{title}</h1>
        {description&&<p className="wx-subtitle">{description}</p>}
        {meta&&<div className="wx-meta">{meta}</div>}
      </div>
      {actions&&<div className="wx-header-actions">{actions}</div>}
    </header>
  );
}

export function SectionCard({title,description,actions,children,footer,flush=false}:{
  title?:string;description?:string;actions?:ReactNode;children:ReactNode;footer?:ReactNode;flush?:boolean;
}){
  return (
    <section className="wx-card">
      {(title||actions)&&(
        <div className="wx-card-head">
          <div className="min-w-0">
            {title&&<h2>{title}</h2>}
            {description&&<p>{description}</p>}
          </div>
          {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush?'wx-card-body flush':'wx-card-body'}>{children}</div>
      {footer&&<div className="wx-card-foot">{footer}</div>}
    </section>
  );
}

/** Wraps a native table in the responsive scroll/stack container. */
export function TableShell({children,label,stackable=true}:{children:ReactNode;label?:string;stackable?:boolean}){
  return (
    <div className={'wx-table-wrap'+(stackable?' stackable':'')} role="region" aria-label={label??'Data table'} tabIndex={0}>
      {children}
    </div>
  );
}

export function EmptyState({title,description,icon}:{title:string;description?:string;icon?:ReactNode}){
  return (
    <div className="wx-state">
      {icon??<Inbox className="size-7" aria-hidden/>}
      <strong>{title}</strong>
      {description&&<p>{description}</p>}
    </div>
  );
}

export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){
  return (
    <div className="wx-error" role="alert">
      <CircleAlert className="size-4 shrink-0" aria-hidden/>
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry&&<Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function LoadingSkeleton({rows=3}:{rows?:number}){
  return <div className="wx-skeleton" role="status" aria-label="Loading">{[...Array(rows)].map((_,i)=><span key={i}/>)}</div>;
}

const PILL_TONES:[RegExp,'ok'|'warn'|'danger'|'brand'|'neutral'][]=[
  [/CONFIRMED|POSTED|APPROVED|VERIFIED|ACTIVE|OK|PAID/i,'ok'],
  [/REVIEW|PENDING|DRAFT|INCOMPLETE|PARTIAL|UNVERIFIED/i,'warn'],
  [/REJECT|FAIL|ERROR|INVALID|UNMATCHED|DISABLED|BLOCKED/i,'danger'],
  [/ADMIN|SUPER|OWNER|SESSION|UNIFIED/i,'brand'],
];

/** Semantic status pill; falls back to neutral for unknown states. */
export function StatusPill({status,label}:{status:string;label?:string}){
  const text=label??status??'UNKNOWN';
  const tone=PILL_TONES.find(([re])=>re.test(status??''))?.[1]??'neutral';
  return <span className="wx-pill" data-tone={tone}>{text}</span>;
}

export function StatusBadge({status}:{status:string}){
  const s=status||'UNKNOWN';
  const variant=/REVIEW|PENDING|DRAFT/i.test(s)?'secondary':/CONFIRMED|POSTED|APPROVED|VERIFIED/i.test(s)?'default':/REJECT|FAIL|INCOMPLETE|UNMATCHED/i.test(s)?'destructive':'outline';
  return <Badge variant={variant as 'secondary'|'default'|'destructive'|'outline'}>{s}</Badge>;
}

export function PageNotice({notice,sourceLabel,checkedAt}:{notice?:string;sourceLabel?:string;checkedAt?:string}){
  if(!notice&&!sourceLabel)return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden/>
      <span className="font-medium">{sourceLabel??'Source note'}:</span>
      <span className="min-w-0 flex-1 text-muted-foreground">{notice}</span>
      {checkedAt&&<span className="shrink-0 text-muted-foreground">checked {checkedAt.slice(0,16).replace('T',' ')}</span>}
    </div>
  );
}

/* ---------------- Authenticated, review-only submission drawers ---------------- */

type SubmissionResponse={id:string;state:string;duplicate?:boolean;employeeActivated?:boolean;postingAuthorized?:boolean};
type CashSubmissionRow={id:string;employee_name:string;employee_mobile:string|null;amount_minor:number;review_state:string;transaction_date:string};
type EmployeeSubmissionRow={id:string;employeeName:string;employeeMobile:string;proposedAssignment:string;requestedJoiningDate:string|null;createdAt:string;state:string;decisionNote:string|null;decidedAt:string|null;decidedByUsername:string|null;activatedAt:string|null;activatedByUsername:string|null;submittedByUsername:string|null;canDecide:boolean};

async function cashJson<T>(path:string,init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers);
  headers.set('Accept','application/json');
  const response=await fetch(path,{...init,headers,cache:'no-store'});
  const body=await response.json().catch(()=>({})) as {error?:string;reasons?:string[];migration?:string};
  if(!response.ok){
    const reason=response.status===503
      ?`${body.error??'Storage unavailable'}${body.migration?` (${body.migration})`:''}`
      :[body.error??response.statusText,...(body.reasons??[])].join(' — ');
    throw new Error(reason);
  }
  return body as T;
}

async function cashPost<T>(path:string,payload:unknown):Promise<T>{
  const session=await cashJson<{csrf:string}>('/api/cash/me');
  return cashJson<T>(path,{
    method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},
    body:JSON.stringify(payload),
  });
}

export function AddTransactionDrawer(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [rows,setRows]=useState<CashSubmissionRow[]>([]);
  const [form,setForm]=useState({employeeName:'',employeeMobile:'',payoutMobile:'',method:'bkash',amount:'',purpose:'',date:'',note:'',evidenceRef:''});
  const refresh=async()=>{
    const result=await cashJson<{rows:CashSubmissionRow[]}>('/api/cash/submissions');
    setRows(result.rows??[]);
  };
  const changeOpen=async(next:boolean)=>{
    setOpen(next);
    if(next){
      setError('');
      try{await refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Submissions could not be loaded.');}
    }
  };
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const saved=await cashPost<SubmissionResponse>('/api/cash/submissions',form);
      setNotice(saved.duplicate
        ?`This identical record is already pending review (${saved.id.slice(0,12)}…).`
        :`Saved for review (${saved.id.slice(0,12)}…). It is not posted to Cash.`);
      setForm({employeeName:'',employeeMobile:'',payoutMobile:'',method:'bkash',amount:'',purpose:'',date:'',note:'',evidenceRef:''});
      try{await refresh();}catch(cause){setError(`Saved, but the list could not refresh: ${cause instanceof Error?cause.message:'refresh failed'}`);}
    }catch(cause){setError(cause instanceof Error?cause.message:'Submission failed.');}
    finally{setBusy(false);}
  };
  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild><Button size="sm">+ Add transaction</Button></SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Submit a Cash record</SheetTitle>
          <SheetDescription>This creates a review-only submission. It does not create or post a Cash ledger transaction.</SheetDescription>
        </SheetHeader>
        <form className="grid gap-3 px-4 pb-4" onSubmit={submit}>
          {error&&<p role="alert" className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">{error}</p>}
          {notice&&<p role="status" aria-live="polite" className="rounded-md border p-2 text-sm">{notice}</p>}
          <div className="grid gap-1"><Label htmlFor="tx-name">Employee name</Label><Input id="tx-name" autoComplete="off" maxLength={150} required value={form.employeeName} onChange={e=>setForm({...form,employeeName:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="tx-employee-mobile">Employee ID / mobile</Label><Input id="tx-employee-mobile" type="tel" autoComplete="off" required value={form.employeeMobile} onChange={e=>setForm({...form,employeeMobile:e.target.value})}/><p className="text-xs text-muted-foreground">Employee identity is separate from the payout number.</p></div>
          <div className="grid gap-1"><Label htmlFor="tx-payout-mobile">Payout mobile</Label><Input id="tx-payout-mobile" type="tel" autoComplete="off" required value={form.payoutMobile} onChange={e=>setForm({...form,payoutMobile:e.target.value})}/></div>
          <div className="grid gap-1">
            <Label htmlFor="tx-method">Payment method</Label>
            <Select value={form.method} onValueChange={method=>setForm({...form,method})}><SelectTrigger id="tx-method"><SelectValue/></SelectTrigger>
              <SelectContent>{['bkash','nagad','cash','rocket','bank'].map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1"><Label htmlFor="tx-amount">Amount (BDT)</Label><Input id="tx-amount" inputMode="decimal" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="tx-purpose">Purpose</Label><Input id="tx-purpose" maxLength={500} required value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="tx-date">Transaction date</Label><Input id="tx-date" type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="tx-evidence">Evidence reference (optional)</Label><Input id="tx-evidence" maxLength={300} value={form.evidenceRef} onChange={e=>setForm({...form,evidenceRef:e.target.value})}/><p className="text-xs text-muted-foreground">File uploads are not enabled; do not attach sensitive files here.</p></div>
          <div className="grid gap-1"><Label htmlFor="tx-notes">Review note (optional)</Label><Textarea id="tx-notes" rows={3} maxLength={500} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Close</Button>
            <Button type="submit" disabled={busy}>{busy?'Submitting…':'Submit for review'}</Button>
          </SheetFooter>
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold">Recent submissions</h3>
            {!rows.length&&<p className="mt-1 text-xs text-muted-foreground">No saved submissions in your authorized scope.</p>}
            <ul className="mt-2 grid gap-2 text-xs">
              {rows.slice(0,10).map(row=><li key={row.id} className="flex flex-wrap justify-between gap-2 border-b pb-2"><span>{row.transaction_date} · {row.employee_name} · {fmtBDT(Number(row.amount_minor))}</span><StatusPill status="PENDING_REVIEW" label={row.review_state}/></li>)}
            </ul>
            <Link href="/cash/submissions" className="mt-3 inline-block text-xs underline">Open Cash review queue</Link>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function AddEmployeeDrawer(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [rows,setRows]=useState<EmployeeSubmissionRow[]>([]);
  const [total,setTotal]=useState(0);
  const [offset,setOffset]=useState(0);
  const [canDecide,setCanDecide]=useState(false);
  const [canActivate,setCanActivate]=useState(false);
  const [busyRequest,setBusyRequest]=useState('');
  const [form,setForm]=useState({employeeName:'',employeeMobile:'',proposedAssignment:'',requestedJoiningDate:'',note:''});
  const refresh=async(pageOffset=offset)=>{
    const result=await cashJson<{rows:EmployeeSubmissionRow[];total:number;canDecide:boolean;canActivate:boolean}>(
      `/api/cash/employee-submissions?limit=${EMPLOYEE_REQUEST_PAGE_SIZE}&offset=${pageOffset}`,
    );
    setRows(result.rows??[]);
    setTotal(result.total??0);
    setCanDecide(result.canDecide===true);
    setCanActivate(result.canActivate===true);
  };
  const goPage=async(pageOffset:number)=>{
    setOffset(pageOffset);
    try{await refresh(pageOffset);}catch(cause){setError(cause instanceof Error?cause.message:'Employee requests could not be loaded.');}
  };
  const changeOpen=async(next:boolean)=>{
    setOpen(next);
    if(next){
      setError('');
      try{await refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Employee requests could not be loaded.');}
    }
  };
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const saved=await cashPost<SubmissionResponse>('/api/cash/employee-submissions',form);
      setNotice(saved.duplicate
        ?`This identical request is already pending Admin review (${saved.id.slice(0,12)}…).`
        :`Saved for Admin review (${saved.id.slice(0,12)}…). No employee or Vessel program was activated.`);
      setForm({employeeName:'',employeeMobile:'',proposedAssignment:'',requestedJoiningDate:'',note:''});
      try{await refresh();}catch(cause){setError(`Saved, but the list could not refresh: ${cause instanceof Error?cause.message:'refresh failed'}`);}
    }catch(cause){setError(cause instanceof Error?cause.message:'Employee request failed.');}
    finally{setBusy(false);}
  };
  const decide=async(row:EmployeeSubmissionRow,decision:'APPROVED'|'REJECTED')=>{
    const action=decision==='APPROVED'?'approve':'reject';
    const note=decision==='REJECTED'?window.prompt(`Reason required to reject ${row.employeeName}'s request.`):'';
    if(note===null)return;
    if(decision==='REJECTED'&&!note.trim()){
      setError('A rejection reason is required.');
      return;
    }
    if(!window.confirm(`${action[0].toUpperCase()+action.slice(1)} ${row.employeeName}'s request? This does not activate the employee.`))return;
    setBusyRequest(row.id);setError('');setNotice('');
    try{
      await cashPost(`/api/cash/employee-submissions/${row.id}/decision`,{decision,note});
      setNotice(`Request ${decision.toLowerCase()}. No employee was activated.`);
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Employee decision failed.');}
    finally{setBusyRequest('');}
  };
  const activate=async(row:EmployeeSubmissionRow)=>{
    if(!window.confirm(`Activate ${row.employeeName} in the Employee directory? This is separate from approval and does not create Cash postings or Vessel programs.`))return;
    setBusyRequest(row.id);setError('');setNotice('');
    try{
      await cashPost(`/api/cash/employee-submissions/${row.id}/activate`,{confirmation:'ACTIVATE_EMPLOYEE'});
      setNotice(`${row.employeeName} was activated in the Employee directory.`);
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Employee activation failed.');}
    finally{setBusyRequest('');}
  };
  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild><Button size="sm">+ Add employee</Button></SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Request an employee record</SheetTitle>
          <SheetDescription>Requests remain PENDING_APPROVAL. Submission does not activate an employee or create a Vessel assignment.</SheetDescription>
        </SheetHeader>
        <form className="grid gap-3 px-4 pb-4" onSubmit={submit}>
          {error&&<p role="alert" className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">{error}</p>}
          {notice&&<p role="status" aria-live="polite" className="rounded-md border p-2 text-sm">{notice}</p>}
          <div className="grid gap-1"><Label htmlFor="emp-name">Employee name</Label><Input id="emp-name" autoComplete="off" maxLength={150} required value={form.employeeName} onChange={e=>setForm({...form,employeeName:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="emp-mobile">Employee ID / mobile</Label><Input id="emp-mobile" type="tel" autoComplete="off" required value={form.employeeMobile} onChange={e=>setForm({...form,employeeMobile:e.target.value})}/><p className="text-xs text-muted-foreground">The normalized employee mobile is the identity reference; names do not merge identities.</p></div>
          <div className="grid gap-1"><Label htmlFor="emp-assignment">Requested assignment reference (optional)</Label><Input id="emp-assignment" maxLength={200} value={form.proposedAssignment} onChange={e=>setForm({...form,proposedAssignment:e.target.value})}/><p className="text-xs text-muted-foreground">Text only; this does not create or change a Vessel program.</p></div>
          <div className="grid gap-1"><Label htmlFor="emp-joining-date">Requested joining date (optional)</Label><Input id="emp-joining-date" type="date" value={form.requestedJoiningDate} onChange={e=>setForm({...form,requestedJoiningDate:e.target.value})}/><p className="text-xs text-muted-foreground">A requested date is not verified employment history.</p></div>
          <div className="grid gap-1"><Label htmlFor="emp-notes">Review note (optional)</Label><Textarea id="emp-notes" rows={3} maxLength={500} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
          <p className="rounded-md border p-2 text-xs text-muted-foreground">NID, salary and emergency-contact details are not collected because no protected HR storage workflow is available.</p>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Close</Button>
            <Button type="submit" disabled={busy}>{busy?'Submitting…':'Submit for approval'}</Button>
          </SheetFooter>
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold">Recent requests{rows.length&&rows[0].submittedByUsername?` · ${rows[0].submittedByUsername}`:''}</h3>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Showing {total?offset+1:0}–{Math.min(offset+rows.length,total)} of {total}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy||offset===0} onClick={()=>void goPage(Math.max(0,offset-EMPLOYEE_REQUEST_PAGE_SIZE))}>Previous</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy||offset+EMPLOYEE_REQUEST_PAGE_SIZE>=total} onClick={()=>void goPage(offset+EMPLOYEE_REQUEST_PAGE_SIZE)}>Next</Button>
              </div>
            </div>
            {!rows.length&&<p className="mt-1 text-xs text-muted-foreground">No employee requests in your authorized scope.</p>}
            <ul className="mt-2 grid gap-2 text-xs">
              {rows.map(row=><li key={row.id} className="grid gap-2 border-b pb-2">
                <div className="flex flex-wrap justify-between gap-2"><span>{row.employeeName} · {row.employeeMobile}</span><StatusPill status={row.state} label={row.state}/></div>
                {(row.decidedByUsername||row.activatedByUsername)&&<p className="text-muted-foreground">
                  {row.decidedByUsername&&`Decision by ${row.decidedByUsername}${row.decidedAt?` · ${row.decidedAt.slice(0,10)}`:''}`}
                  {row.activatedByUsername&&` · Activated by ${row.activatedByUsername}${row.activatedAt?` · ${row.activatedAt.slice(0,10)}`:''}`}
                </p>}
                <div className="flex flex-wrap gap-2">
                  {canDecide&&row.canDecide&&row.state==='PENDING_APPROVAL'&&<>
                    <Button type="button" size="sm" variant="outline" disabled={busyRequest===row.id} onClick={()=>void decide(row,'APPROVED')}>Approve</Button>
                    <Button type="button" size="sm" variant="outline" disabled={busyRequest===row.id} onClick={()=>void decide(row,'REJECTED')}>Reject</Button>
                  </>}
                  {canActivate&&row.state==='APPROVED'&&
                    <Button type="button" size="sm" disabled={busyRequest===row.id} onClick={()=>void activate(row)}>Activate employee</Button>}
                </div>
              </li>)}
            </ul>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ActionButtonDisabled({label,reason}: {label:string;reason:string}){
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button size="sm" variant="outline" disabled aria-disabled="true">{label}</Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-[11px]">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
