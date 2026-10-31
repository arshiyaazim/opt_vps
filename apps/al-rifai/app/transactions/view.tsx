'use client';
import {useEffect,useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {
  ActionButtonDisabled,AddTransactionDrawer,EmptyState,ErrorState,LoadingSkeleton,PageHeader,PageNotice,SectionCard,StatusPill,TableShell,Unavailable,fmtBDT,useApi,fmtInt,
} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';
import {csv,saveCsv} from '@/lib/register';
import type {CashRow} from '@/lib/operations';

const METHODS=['','bkash','nagad','cash','rocket','bank','unknown'];
const SOURCES=[
  {value:'all',label:'All sources'},
  {value:'chat',label:'Identity-verified WhatsApp'},
  {value:'review',label:'Legacy extraction (identity unverified)'},
  {value:'excel',label:'Excel Cashbook (archive)'},
];
const SUGGESTION_DEBOUNCE_MS=300;
const SUGGESTION_LIMIT=10;

export type EmployeeSuggestion={phone:string;name:string;display:string};

// BEGIN buildSuggestions — extracted verbatim by scripts/verify-transaction-suggestions.mjs
// A suggestion is an identity surface: it carries name + employee mobile only.
// payoutPhone, sourceText, amountCents, sender and receiverIdentity must never
// enter this type or the dropdown render path.
type SuggestionSource={name:string;employeePhone:string;date:string};

function normalizeSearchText(value:string):string{
  return value.toLowerCase().replace(/\s+/g,' ').trim();
}

export function buildSuggestions(
  rows:readonly SuggestionSource[],
  query:string,
  max:number=SUGGESTION_LIMIT,
):EmployeeSuggestion[]{
  const q=normalizeSearchText(query);
  if(!q)return [];

  // Rows arrive newest-first (the API orders by source_time DESC), so the first
  // name seen for a phone is the most recent one. No separate date sort needed.
  const byPhone=new Map<string,string>();
  for(const row of rows){
    const phone=(row.employeePhone??'').trim();
    if(!phone)continue;
    if(!byPhone.has(phone))byPhone.set(phone,(row.name??'').trim()||'Name unknown');
  }

  // Bucket order: exact phone, phone starts-with, name starts-with, name contains.
  const ranked:Array<{bucket:number;suggestion:EmployeeSuggestion}>=[];
  for(const [phone,name] of byPhone){
    const normalizedPhone=phone.toLowerCase();
    const normalizedName=normalizeSearchText(name);
    let bucket=-1;
    if(normalizedPhone===q)bucket=0;
    else if(normalizedPhone.startsWith(q))bucket=1;
    else if(normalizedName.startsWith(q))bucket=2;
    else if(normalizedName.includes(q))bucket=3;
    if(bucket<0)continue;
    ranked.push({bucket,suggestion:{phone,name,display:`${name} · ${phone}`}});
  }

  ranked.sort((a,b)=>
    a.bucket-b.bucket
    || a.suggestion.name.localeCompare(b.suggestion.name)
    || a.suggestion.phone.localeCompare(b.suggestion.phone));

  return ranked.slice(0,Math.max(1,max)).map(entry=>entry.suggestion);
}
// END buildSuggestions

export default function TransactionsView(){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const rows=useMemo(()=>ops.data?.rows??[],[ops.data?.rows]);
  const [f,setF]=useState({from:'',to:'',status:'all',method:'all',source:'all'});

  // Three distinct values, deliberately kept apart:
  //   text          what the input displays (may be a chosen "Name · phone")
  //   selectedPhone the committed employee filter, null while typing freely
  //   effective q   '' when an employee is selected, otherwise the typed text
  const [text,setText]=useState('');
  const [selectedPhone,setSelectedPhone]=useState<string|null>(null);
  const [debounced,setDebounced]=useState('');
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(-1);

  useEffect(()=>{
    const timer=setTimeout(()=>setDebounced(text),SUGGESTION_DEBOUNCE_MS);
    return ()=>clearTimeout(timer);
  },[text]);

  const statusOptions=useMemo(()=>[...new Set(rows.map(r=>r.status).filter(Boolean))],[rows]);

  const suggestions=useMemo(
    ()=>selectedPhone?[]:buildSuggestions(rows,debounced,SUGGESTION_LIMIT),
    [rows,debounced,selectedPhone],
  );
  const showSuggestions=open&&!selectedPhone&&suggestions.length>0;

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

  const choose=(suggestion:EmployeeSuggestion)=>{
    setSelectedPhone(suggestion.phone);
    setText(suggestion.display);
    setOpen(false);
    setActive(-1);
  };

  const changeSearch=(value:string)=>{
    setText(value);
    setSelectedPhone(null);
    setActive(-1);
    setOpen(value.trim().length>0);
  };

  const onSearchKeyDown=(event:React.KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==='Escape'){setOpen(false);setActive(-1);return;}
    if(!showSuggestions)return;
    if(event.key==='ArrowDown'){event.preventDefault();setActive(i=>Math.min(i+1,suggestions.length-1));return;}
    if(event.key==='ArrowUp'){event.preventDefault();setActive(i=>Math.max(i-1,0));return;}
    if(event.key==='Enter'&&active>=0&&suggestions[active]){event.preventDefault();choose(suggestions[active]);}
  };

  const exportCsv=()=>{
    const contents=csv(['ID','Date','Time','Employee','Employee ID','Payout','Method','Amount','Source','Status','Purpose','Issues'],
      filtered.map(r=>[r.id,r.date,r.time,r.name,r.employeePhone,r.payoutPhone,r.method,(r.amountCents/100).toFixed(2),r.source,r.status??'',r.purpose,r.issues?.join('; ')??'']));
    saveCsv(contents,'al-rifai-transactions.csv');
  };

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Accounts"
        title="Transactions"
        description="Source-linked Cash instructions in the Current scope. Every amount is an Admin instruction amount — never a confirmed payment or a posted ledger entry."
        actions={<><AddTransactionDrawer/><Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>Export filtered</Button></>}
        meta={ops.data?<><StatusPill status="ACTIVE" label="Current scope"/><span className="text-xs text-muted-foreground">{fmtInt.format(rows.length)} rows</span></>:null}
      />

      {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}
      {ops.error&&<ErrorState message={`Transactions could not be loaded: ${ops.error}`}/>}

      <SectionCard title="Filters" description="Filters apply to the table and to the filtered total.">
        <div className="wx-filters">
          <div className="wx-field">
            <Label htmlFor="t-q">Search</Label>
            <div className="relative">
              <Input
                id="t-q"
                type="search"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="t-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={showSuggestions&&active>=0?`t-option-${active}`:undefined}
                autoComplete="off"
                value={text}
                onChange={e=>changeSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={()=>{if(!selectedPhone&&text.trim().length>0)setOpen(true);}}
                onBlur={()=>setOpen(false)}
                placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
              />
              {showSuggestions&&(
                <ul
                  id="t-suggestions"
                  role="listbox"
                  aria-label="Employee suggestions"
                  className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  onMouseDown={e=>e.preventDefault()}
                >
                  {suggestions.map((suggestion,index)=>(
                    <li
                      key={suggestion.phone}
                      id={`t-option-${index}`}
                      role="option"
                      aria-selected={index===active}
                      className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${index===active?'bg-accent text-accent-foreground':''}`}
                      onMouseEnter={()=>setActive(index)}
                      onClick={()=>choose(suggestion)}
                    >
                      {suggestion.name} · {suggestion.phone}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
                <tr><th>Date</th><th>Employee</th><th>Method</th><th className="num">Amount</th><th>Source</th><th>Status</th><th><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody>
                {filtered.slice(0,200).map(r=>(
                  <tr key={r.id}>
                    <td data-label="Date"><span className="strong">{r.date}</span><span className="muted" style={{display:'block'}}>{r.time}</span></td>
                    <td data-label="Employee">
                      <span className="strong">{r.name||'(name pending)'}</span>
                      <span className="muted" style={{display:'block'}}>{r.employeePhone||'No employee ID'} · payout {r.payoutPhone||'not provided'}</span>
                    </td>
                    <td data-label="Method" style={{textTransform:'capitalize'}}>{r.method||'—'}</td>
                    <td data-label="Amount" className="num strong">{fmtBDT(r.amountCents)}</td>
                    <td data-label="Source"><span className="muted">{r.source}</span></td>
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
