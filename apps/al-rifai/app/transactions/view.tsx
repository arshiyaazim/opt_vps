'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {EmployeeTypeahead} from '@/app/platform/employee-typeahead';
import {normalizeSearchText,type EmployeeSuggestion} from '@/lib/employee-suggest';
import {
  ActionButtonDisabled,AddTransactionDrawer,EmptyState,ErrorState,LoadingSkeleton,PageHeader,PageNotice,SectionCard,StatusPill,TableShell,Unavailable,fmtBDT,useApi,fmtInt,
} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';
import {methodAbbreviation,sourceAbbreviation} from '@/lib/transaction-format';
import {csv,saveCsv} from '@/lib/register';
import type {CashRow} from '@/lib/operations';

const METHODS=['','bkash','nagad','cash','rocket','bank','unknown'];
const SOURCES=[
  {value:'all',label:'All sources'},
  {value:'chat',label:'Identity-verified WhatsApp'},
  {value:'review',label:'Legacy extraction (identity unverified)'},
  {value:'excel',label:'Excel Cashbook (archive)'},
];

export default function TransactionsView(){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const rows=useMemo(()=>ops.data?.rows??[],[ops.data?.rows]);
  const [f,setF]=useState({from:'',to:'',status:'all',method:'all',source:'all'});

  // Two distinct values, deliberately kept apart:
  //   text          what the input displays (may be a chosen "Name · phone")
  //   selectedPhone the committed employee filter, null while typing freely
  const [text,setText]=useState('');
  const [selectedPhone,setSelectedPhone]=useState<string|null>(null);

  const statusOptions=useMemo(()=>[...new Set(rows.map(r=>r.status).filter(Boolean))],[rows]);

  // Per-employee lifetime total across the FULL dataset, not the filtered view.
  // Computed once from the raw rows so filtering never changes the column.
  const totalByPhone=useMemo(()=>{
    const totals=new Map<string,number>();
    for(const row of rows){
      const key=row.employeePhone||'';
      totals.set(key,(totals.get(key)??0)+row.amountCents);
    }
    return totals;
  },[rows]);

  const filtered=useMemo(()=>{
    const term=normalizeSearchText(selectedPhone?'':text);
    return rows.filter(r=>
      (!selectedPhone||r.employeePhone===selectedPhone)&&
      (!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&
      (!f.method||f.method==='all'||r.method===f.method)&&
      (f.source==='all'||(f.source==='chat'&&r.identityVerified===true&&r.source!=='Excel Cashbook')||(f.source==='review'&&r.identityVerified!==true&&r.source==='WhatsApp archive')||(f.source==='excel'&&r.source==='Excel Cashbook'))&&
      (f.status==='all'||r.status===f.status)&&
      (!term||normalizeSearchText([r.id,r.name,r.employeePhone,r.payoutPhone,r.purpose,r.sourceId].join(' ')).includes(term)));
  },[rows,f,text,selectedPhone]);

  const [detail,setDetail]=useState<CashRow|null>(null);

  const filteredTotal=useMemo(()=>filtered.reduce((n,r)=>n+r.amountCents,0),[filtered]);
  const allTotal=useMemo(()=>rows.reduce((n,r)=>n+r.amountCents,0),[rows]);

  // The typeahead component owns debounce, open state and keyboard navigation;
  // the parent owns the committed filter and the display text.
  const chooseEmployee=(suggestion:EmployeeSuggestion)=>{
    setSelectedPhone(suggestion.phone);
    setText(suggestion.display);
  };

  const changeSearch=(value:string)=>{
    setText(value);
    setSelectedPhone(null);
  };

  const exportCsv=()=>{
    const contents=csv(['ID','Date','Time','Employee','Employee ID','Payout','Method','Amount','Total','Source','Status','Purpose','Issues'],
      filtered.map(r=>[r.id,r.date,r.time,r.name,r.employeePhone,r.payoutPhone,r.method,(r.amountCents/100).toFixed(2),((totalByPhone.get(r.employeePhone||'')??0)/100).toFixed(2),r.source,r.status??'',r.purpose,r.issues?.join('; ')??'']));
    saveCsv(contents,'al-rifai-transactions.csv');
  };

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Accounts"
        title="Transactions"
        description="Source-linked Cash instructions in the Current scope. Every amount is an Admin instruction amount — never a confirmed payment or a posted ledger entry."
        actions={<><AddTransactionDrawer employees={rows}/><Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>Export filtered</Button></>}
        meta={ops.data?<><StatusPill status="ACTIVE" label="Current scope"/><span className="text-xs text-muted-foreground">{fmtInt.format(rows.length)} rows</span></>:null}
      />

      {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}
      {ops.error&&<ErrorState message={`Transactions could not be loaded: ${ops.error}`}/>}

      <SectionCard title="Filters" description="Filters apply to the table and to the filtered total.">
        <div className="wx-filters">
          <div className="wx-field">
            <Label htmlFor="t-q">Search</Label>
            <EmployeeTypeahead
              id="t-q"
              value={text}
              candidates={rows}
              onValueChange={changeSearch}
              onSelect={chooseEmployee}
              suppressSuggestions={selectedPhone!==null}
              listLabel="Employee suggestions"
              placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
            />
            <span className="wx-help">Name or mobile picks an employee · any other text searches record, purpose and source IDs.</span>
          </div>
          <div className="wx-field"><Label htmlFor="t-from">From</Label><Input id="t-from" type="date" value={f.from} onChange={e=>setF(p=>({...p,from:e.target.value}))}/></div>
          <div className="wx-field"><Label htmlFor="t-to">To</Label><Input id="t-to" type="date" value={f.to} onChange={e=>setF(p=>({...p,to:e.target.value}))}/></div>
          <div className="wx-field">
            <Label htmlFor="t-status">Status</Label>
            <Select value={f.status} onValueChange={v=>setF(p=>({...p,status:v}))}>
              <SelectTrigger id="t-status"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map(s=><SelectItem key={s} value={s}>{s||'(none)'}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="wx-field">
            <Label htmlFor="t-method">Method</Label>
            <Select value={f.method} onValueChange={v=>setF(p=>({...p,method:v}))}>
              <SelectTrigger id="t-method"><SelectValue/></SelectTrigger>
              <SelectContent>{METHODS.map(m=><SelectItem key={m} value={m||'all'}>{m||'All methods'}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="wx-field">
            <Label htmlFor="t-source">Source</Label>
            <Select value={f.source} onValueChange={v=>setF(p=>({...p,source:v}))}>
              <SelectTrigger id="t-source"><SelectValue/></SelectTrigger>
              <SelectContent>{SOURCES.map(s=><SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="wx-field">
            <Label>Filtered total</Label>
            <strong className="text-base tabular-nums">{fmtBDT(filteredTotal)}</strong>
            <span className="wx-help">{fmtInt.format(filtered.length)} of {fmtInt.format(rows.length)} rows · all rows {fmtBDT(allTotal)}</span>
          </div>
        </div>
        <div className="mt-3">
          <Unavailable compact reason="Vessel filter: Cash instruction rows carry no vessel reference — vessel-scoped filtering lives in the Vessel Register."/>
        </div>
      </SectionCard>

      <SectionCard
        title="Instruction ledger"
        description="Newest first. Select a row for source evidence."
        actions={<span className="text-xs text-muted-foreground">Showing {Math.min(200,filtered.length)} of {fmtInt.format(filtered.length)}</span>}
        flush
      >
        {(ops.loading&&!ops.data)&&<LoadingSkeleton rows={6}/>}
        {ops.data&&filtered.length===0&&<EmptyState title="No rows match these filters" description="Clear the search or widen the date range to see instructions."/>}
        {filtered.length>0&&(
          <TableShell label="Cash instruction ledger">
            <table className="wx-table stackable">
              <thead>
                <tr><th>Date</th><th>Employee</th><th style={{width:'40px'}}>Method</th><th className="num">Amount</th><th className="num">Total</th><th style={{width:'50px'}}>Source</th><th>Status</th><th><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody>
                {filtered.slice(0,200).map(r=>(
                  <tr key={r.id}>
                    <td data-label="Date"><span className="strong">{r.date}</span><span className="muted" style={{display:'block'}}>{r.time}</span></td>
                    <td data-label="Employee">
                      <span className="strong">{r.name||'(name pending)'}</span>
                      <span className="muted" style={{display:'block'}}>{r.employeePhone||'No employee ID'} · payout {r.payoutPhone||'not provided'}</span>
                    </td>
                    <td data-label="Method" style={{width:'40px'}} title={r.method||undefined}><span className="strong">{methodAbbreviation(r.method)}</span></td>
                    <td data-label="Amount" className="num strong">{fmtBDT(r.amountCents)}</td>
                    <td data-label="Total" className="num" title="All instructions for this employee, every date and method">{fmtBDT(totalByPhone.get(r.employeePhone||'')??0)}</td>
                    <td data-label="Source" style={{width:'50px'}} title={r.source||undefined}><span className="muted">{sourceAbbreviation(r.source)}</span></td>
                    <td data-label="Status">
                      {r.issues?.length?<StatusPill status="REVIEW" label="Review"/>:<StatusPill status={r.identityVerified===true?'CONFIRMED':'UNVERIFIED'} label={r.identityVerified===true?'Identity verified':'Unverified'}/>}
                    </td>
                    <td data-label="Detail"><Button size="sm" variant="ghost" onClick={()=>setDetail(r)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          Instruction amounts are not postings. Editing and approval stay in the Owner-authorized Cash portal.
        </div>
      </SectionCard>

      <Sheet open={!!detail} onOpenChange={(o)=>!o&&setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Instruction {detail?.id.slice(0,12)}…</SheetTitle>
            <SheetDescription>Read-only record. Amounts are Admin instruction amounts — not verified receipts.</SheetDescription>
          </SheetHeader>
          {detail&&<div className="grid gap-3 px-4 pb-4 text-sm">
            <div className="wx-card">
              <div className="wx-card-body grid gap-2">
                {([
                  ['Date',`${detail.date} ${detail.time}`],['Employee',detail.name||'—'],['Employee ID',detail.employeePhone||'—'],
                  ['Payout number',detail.payoutPhone||'not provided'],['Method',detail.method],['Amount',fmtBDT(detail.amountCents)],
                  ['Source',detail.source],['Instruction source ID',detail.sourceId||'—'],
                  ['Category',detail.category],['Status',detail.status||'—'],['Identity verified',detail.identityVerified===true?'Yes':'No'],
                  ['Identity rule',detail.identityRule||'—'],['Sender',detail.sender||'—'],['Purpose',detail.purpose||'—'],
                ] as [string,string][]).map(([k,v])=>(
                  <div key={k} className="flex flex-wrap justify-between gap-2 border-b pb-1.5 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{k}</span><span className="text-right font-medium" style={{overflowWrap:'anywhere'}}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            {detail.issues?.length>0&&(
              <div className="wx-card"><div className="wx-card-body">
                <p className="mb-1 font-semibold">Review notes</p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">{detail.issues.map((i,idx)=><li key={idx}>{i}</li>)}</ul>
              </div></div>
            )}
            <details className="wx-card"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Original message (evidence)</summary>
              <div className="px-4 pb-4"><p className="rounded border bg-muted/40 p-2 text-xs whitespace-pre-wrap" style={{overflowWrap:'anywhere'}}>{detail.sourceText}</p></div>
            </details>
            <SheetFooter className="flex-row flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={()=>setDetail(null)}>Close</Button>
              <ActionButtonDisabled label="Attach evidence" reason="Evidence attachments require backend storage authorization."/>
              <ActionButtonDisabled label="Approve" reason="Approval is an Owner-authorized Cash-portal action performed by the Admin role only."/>
            </SheetFooter>
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
