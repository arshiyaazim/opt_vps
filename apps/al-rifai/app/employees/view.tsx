'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {
  AddEmployeeDrawer,EmptyState,ErrorState,LoadingSkeleton,PageHeader,PageNotice,SectionCard,StatusPill,TableShell,Unavailable,fmtBDT,useApi,fmtInt,
} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';
import {csv,saveCsv} from '@/lib/register';
import {portalActivatedEmployees,employeePage,type PortalEmployeeRequestRow} from '@/lib/employee-directory-view';
import {ChevronLeft,ChevronRight} from 'lucide-react';

export interface StatementRow{
  identity:string;employeePhone:string|null;name:string;aliases:number;
  payments:number;amountCents:number;lastDate:string;needsReview:number;
}

function PortalActivatedEmployees({paymentRows}:{paymentRows:StatementRow[]}){
  const [requests,setRequests]=useState<PortalEmployeeRequestRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    void fetch('/api/cash/employee-submissions',{cache:'no-store',credentials:'same-origin'})
      .then(async response=>{
        const body=await response.json() as {rows?:PortalEmployeeRequestRow[];error?:string};
        if(!response.ok)throw new Error(body.error||`HTTP_${response.status}`);
        if(active)setRequests(Array.isArray(body.rows)?body.rows:[]);
      })
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Portal directory could not be loaded.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);

  const employees=useMemo(()=>portalActivatedEmployees(requests,paymentRows),[requests,paymentRows]);
  return (
    <SectionCard title="Portal Activated Employees" description="Separate portal source. Activation status does not establish payment or Vessel assignment. Mobile matches are shown as collisions; records are never automatically merged." flush>
      {loading&&<LoadingSkeleton rows={3}/>}
      {error&&<p role="alert" className="px-4 py-3 text-sm text-destructive">Portal directory unavailable: {error}</p>}
      {!loading&&!error&&!employees.length&&<EmptyState title="No portal employees activated" description="Activated portal records in your authorized scope will appear here separately from payment-derived Employee statements."/>}
      {employees.length>0&&<TableShell label="Portal activated employees">
        <table className="wx-table stackable">
          <thead><tr><th>Employee</th><th>Employee ID</th><th>Source</th><th>Status</th><th>Activated</th></tr></thead>
          <tbody>{employees.map(row=><tr key={row.id}>
            <td data-label="Employee">{row.employeeName}</td>
            <td data-label="Employee ID" className="num" style={{textAlign:'left'}}>{row.employeeMobile}
              {row.paymentIdentityCollision&&<span className="muted" style={{display:'block'}}>Mobile collision with payment-derived identity · kept separate</span>}
            </td>
            <td data-label="Source">Portal activation</td>
            <td data-label="Status"><StatusPill status="ACTIVE" label="Portal ACTIVE"/></td>
            <td data-label="Activated">{row.activatedAt?row.activatedAt.slice(0,10):'—'}</td>
          </tr>)}</tbody>
        </table>
      </TableShell>}
    </SectionCard>
  );
}

export default function EmployeesView(){
  const ops=useApi<OperationsSnapshot>(opUrl('employees'));
  const rows=useMemo(()=>((ops.data?.rows??[]) as unknown as StatementRow[]),[ops.data?.rows]);
  const [q,setQ]=useState('');
  const [scopeVerified,setScopeVerified]=useState<'paid'|'unverified'>('paid');
  const [page,setPage]=useState(1);
  const filtered=useMemo(()=>rows.filter(r=>{
    if(scopeVerified==='paid'&&!r.employeePhone)return false;
    if(scopeVerified==='unverified'&&r.employeePhone)return false;
    return !q||[r.identity,r.name,String(r.employeePhone??'')].join(' ').toLowerCase().includes(q.toLowerCase());
  }),[rows,q,scopeVerified]);
  const pageData=useMemo(()=>employeePage(filtered,page),[filtered,page]);
  const [detail,setDetail]=useState<StatementRow|null>(null);

  // Filtered and all-record totals are shown separately so a filter is never
  // mistaken for the full ledger.
  const allTotal=useMemo(()=>rows.reduce((n,r)=>n+r.amountCents,0),[rows]);
  const filteredTotal=useMemo(()=>filtered.reduce((n,r)=>n+r.amountCents,0),[filtered]);
  const filteredPayments=useMemo(()=>filtered.reduce((n,r)=>n+r.payments,0),[filtered]);

  const exportCsv=()=>{
    saveCsv(csv(['Identity','Name','Employee phone','Payment count','Total (BDT)','Last date','Parsing notes'],
      filtered.map(r=>[r.identity,r.name,r.employeePhone??'',r.payments,(r.amountCents/100).toFixed(2),r.lastDate,r.needsReview])),'al-rifai-employee-statements.csv');
  };

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Workforce"
        title="Employees"
        description="Employee identities derived from verified payment instructions. The employee ID is the verified escort mobile; payout numbers are separate and never identify an employee."
        actions={<><AddEmployeeDrawer/><Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>Export filtered</Button></>}
        meta={ops.data?<StatusPill status="ACTIVE" label={`${fmtInt.format(rows.length)} identities`}/>:null}
      />

      {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}
      {ops.error&&<ErrorState message={`Employee data could not be loaded: ${ops.error}`}/>}

      <SectionCard title="Scope and filters" description="Filters apply to the table and to the filtered totals below.">
        <div className="wx-filters">
          <div className="wx-field">
            <Label htmlFor="e-q">Search</Label>
            <Input id="e-q" type="search" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="Name, employee ID or phone…"/>
          </div>
          <div className="wx-field">
            <Label htmlFor="e-scope">Identity scope</Label>
            <Select value={scopeVerified} onValueChange={v=>{setScopeVerified(v as 'paid'|'unverified');setPage(1);}}>
              <SelectTrigger id="e-scope"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Identity-verified (paid instructions)</SelectItem>
                <SelectItem value="unverified">Name-only (identity pending)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="wx-field">
            <Label>Filtered total</Label>
            <strong className="text-base tabular-nums">{fmtBDT(filteredTotal)}</strong>
            <span className="wx-help">{fmtInt.format(filtered.length)} identities · {fmtInt.format(filteredPayments)} instructions</span>
          </div>
          <div className="wx-field">
            <Label>All-record total</Label>
            <strong className="text-base tabular-nums">{fmtBDT(allTotal)}</strong>
            <span className="wx-help">{fmtInt.format(rows.length)} identities in the Current scope</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Unavailable compact reason="Duty/vessel assignment data lives in the Vessel Register; a joined employee–assignment API is pending."/>
          <Unavailable compact reason="NID, emergency contacts and salary are never transmitted by the verified read APIs."/>
        </div>
      </SectionCard>

      <SectionCard
        title="Payment-derived Employee master"
        description="Select a row to open the profile and instruction history."
        actions={<span className="text-xs text-muted-foreground">{fmtInt.format(filtered.length)} of {fmtInt.format(rows.length)} shown</span>}
        flush
      >
        {(ops.loading&&!ops.data)&&<LoadingSkeleton rows={5}/>}
        {ops.data&&filtered.length===0&&<EmptyState title="No identities match" description="Change the search or the identity scope to see employee statements."/>}
        {pageData.rows.length>0&&(
          <TableShell label="Employee statements">
            <table className="wx-table stackable">
              <thead>
                <tr>
                  <th>Employee</th><th>Employee ID</th><th className="num">Instructions</th><th className="num">Instruction total</th><th>Last</th><th>Parsing</th><th><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {pageData.rows.map(r=>(
                  <tr key={r.identity}>
                    <td data-label="Employee">
                      <button type="button" className="text-left font-semibold underline-offset-2 hover:underline" onClick={()=>setDetail(r)}>{r.name||'Name unknown'}</button>
                      {r.aliases>1&&<span className="muted" style={{display:'block'}}>{r.aliases} source name variants</span>}
                    </td>
                    <td data-label="Employee ID" className="num" style={{textAlign:'left'}}>{r.employeePhone??'record-only'}</td>
                    <td data-label="Instructions" className="num">{fmtInt.format(r.payments)}</td>
                    <td data-label="Instruction total" className="num strong">{fmtBDT(r.amountCents)}</td>
                    <td data-label="Last instruction">{r.lastDate||'—'}</td>
                    <td data-label="Parsing">{r.needsReview?<StatusPill status="REVIEW" label={`${r.needsReview} notes`}/>:<StatusPill status="OK" label="No notes"/>}</td>
                    <td data-label="Profile"><Button size="sm" variant="ghost" onClick={()=>setDetail(r)}>Profile</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        {filtered.length>0&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>Showing {pageData.start}–{pageData.end} of {fmtInt.format(filtered.length)} matching identities</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" aria-label="Previous employee page" disabled={pageData.page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}><ChevronLeft size={14}/>Previous</Button>
            <span>Page {pageData.page} of {pageData.pages}</span>
            <Button size="sm" variant="outline" aria-label="Next employee page" disabled={pageData.page>=pageData.pages} onClick={()=>setPage(value=>Math.min(pageData.pages,value+1))}>Next<ChevronRight size={14}/></Button>
          </div>
        </footer>}
      </SectionCard>

      <PortalActivatedEmployees paymentRows={rows}/>

      <Sheet open={!!detail} onOpenChange={o=>!o&&setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detail?.name||'Employee'}</SheetTitle>
            <SheetDescription>Derived from verified payment instructions only. Full HR master data is not published by any read API yet.</SheetDescription>
          </SheetHeader>
          {detail&&<div className="grid gap-3 px-4 pb-4 text-sm">
            <div className="wx-card">
              <div className="wx-card-body grid gap-2">
                {([
                  ['Employee ID (authoritative reference)',detail.employeePhone??'record-only'],
                  ['Alias names',detail.name],
                  ['Recorded aliases',String(detail.aliases)],
                  ['Payment instructions',fmtInt.format(detail.payments)],
                  ['Instruction total',fmtBDT(detail.amountCents)],
                  ['Most recent instruction',detail.lastDate||'—'],
                  ['Rows with parsing notes',String(detail.needsReview)],
                ] as [string,string][]).map(([k,v])=>(
                  <div key={k} className="flex flex-wrap justify-between gap-2 border-b pb-1.5 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{k}</span><span className="text-right font-medium tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Instruction total is what the Owner requested — not a confirmed payment. Payment evidence and posting status live in the Cash portal.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link href="/transactions">Open transactions</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/sources-review">Review evidence</Link></Button>
            </div>
            <SheetFooter className="flex-row flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={()=>setDetail(null)}>Close</Button>
            </SheetFooter>
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
