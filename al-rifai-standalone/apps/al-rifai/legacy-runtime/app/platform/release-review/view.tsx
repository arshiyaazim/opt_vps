'use client';
import {useEffect,useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {EmptyState,ErrorState,LoadingSkeleton,PageHeader,SectionCard,StatusPill,TableShell,fmtInt} from '@/app/platform/ui';

type Candidate={
  id:string;escort_phone:string;escort_name:string|null;program_id:string|null;
  program_start:string|null;mother_vessel:string|null;lighter_vessel:string|null;
  end_date:string;end_shift:string|null;amount_bdt:number|null;duty_days:number|null;
  calc_start:string|null;match_status:string;match_pass:number|null;
  mismatch_kind:string|null;confidence:string|null;notes:string|null;
  source_msg_id:string|null;source_date:string|null;source_text:string|null;
};
type Payload={rows:Candidate[];total:number;summary:Array<{match_status:string;confidence:string;count:number}>};

type Tab='medium'|'mismatch'|'all';

const money=(v:number|null)=>v===null||v===undefined?'—':`৳${(v/100).toFixed(2)}`;

export default function ReleaseReviewView(){
  const [data,setData]=useState<Payload|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [reload,setReload]=useState(0);
  const [tab,setTab]=useState<Tab>('medium');
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [detail,setDetail]=useState<Candidate|null>(null);
  const [confirm,setConfirm]=useState<{action:'apply'|'reject';ids:string[]}|null>(null);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      setLoading(true);setError('');
      try{
        const r=await fetch('/api/release-candidates?applied=false&limit=500',{headers:{Accept:'application/json'},signal:controller.signal});
        const v=await r.json();
        if(!r.ok)throw new Error(v?.error??'Could not load candidates');
        if(!controller.signal.aborted)setData(v as Payload);
      }catch(e){
        if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Load failed');
      }finally{
        if(!controller.signal.aborted)setLoading(false);
      }
    })();
    return ()=>controller.abort();
  },[reload]);

  const rows=useMemo(()=>data?.rows??[],[data?.rows]);
  const medium=useMemo(()=>rows.filter(r=>r.match_status==='MATCHED'&&r.confidence==='medium'),[rows]);
  const mismatches=useMemo(()=>rows.filter(r=>r.match_status==='ROSTER_MISMATCH'),[rows]);
  const visible=tab==='medium'?medium:tab==='mismatch'?mismatches:rows;

  const toggle=(id:string)=>setSelected(prev=>{
    const next=new Set(prev);
    if(next.has(id))next.delete(id);else next.add(id);
    return next;
  });
  const allSelected=visible.length>0&&visible.every(r=>selected.has(r.id));

  const run=async(action:'apply'|'reject',ids:string[])=>{
    setBusy(true);setNotice('');
    let ok=0;const failed:string[]=[];
    for(const id of ids){
      try{
        const r=await fetch(`/api/release-candidates/${id}/${action}`,{method:'POST',headers:{Accept:'application/json'}});
        const v=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(v?.error??'failed');
        ok+=1;
      }catch(e){failed.push(`${id}: ${e instanceof Error?e.message:'failed'}`);}
    }
    setBusy(false);
    setSelected(new Set());
    setNotice(`${action==='apply'?'Applied':'Rejected'} ${ok} of ${ids.length}${failed.length?` · ${failed.length} failed`:''}`);
    setReload(n=>n+1);
  };

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Vessel"
        title="Release review"
        description="Release candidates parsed from the Escort Release Slip group. Nothing is a release until it is applied here; applying goes through the vessel command layer."
        meta={data?<><StatusPill status="ACTIVE" label="Review queue"/><span className="text-xs text-muted-foreground">{fmtInt.format(rows.length)} open</span></>:null}
      />

      {notice&&<div className="wx-card"><div className="wx-card-body text-sm">{notice}</div></div>}
      {error&&<ErrorState message={error}/>}
      {loading&&!data&&<LoadingSkeleton rows={6}/>}

      <SectionCard title="Candidates" description="Medium-confidence lump sums need verification; mismatches usually mean a missing program." flush>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          {([['medium',`Medium (${medium.length})`],['mismatch',`Mismatches (${mismatches.length})`],['all',`All (${rows.length})`]] as [Tab,string][]).map(([k,label])=>
            <Button key={k} size="sm" variant={tab===k?'default':'outline'} onClick={()=>setTab(k)}>{label}</Button>)}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy||!selected.size} onClick={()=>setConfirm({action:'apply',ids:[...selected]})}>Apply selected</Button>
            <Button size="sm" variant="outline" disabled={busy||!selected.size} onClick={()=>setConfirm({action:'reject',ids:[...selected]})}>Reject selected</Button>
          </div>
        </div>

        {!loading&&!visible.length&&<EmptyState title="Nothing to review" description="No candidates match this tab."/>}

        {visible.length>0&&(
          <TableShell label="Release candidates">
            <table className="wx-table stackable">
              <thead>
                <tr>
                  <th style={{width:'36px'}}>
                    <Checkbox checked={allSelected} aria-label="Select all"
                      onCheckedChange={()=>setSelected(allSelected?new Set():new Set(visible.map(r=>r.id)))}/>
                  </th>
                  <th>Escort</th><th>Program start</th><th>Candidate end</th><th>Shift</th>
                  <th className="num">Amount</th><th className="num">Days</th><th>Calc start</th>
                  <th>Step</th><th>Notes</th><th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r=>(
                  <tr key={r.id}>
                    <td><Checkbox checked={selected.has(r.id)} aria-label={`Select ${r.escort_phone}`} onCheckedChange={()=>toggle(r.id)}/></td>
                    <td data-label="Escort"><span className="strong">{r.escort_name||'—'}</span><span className="muted" style={{display:'block'}}>{r.escort_phone}</span></td>
                    <td data-label="Program start">{r.program_start??'—'}</td>
                    <td data-label="Candidate end"><span className="strong">{r.end_date}</span></td>
                    <td data-label="Shift">{r.end_shift??'—'}</td>
                    <td data-label="Amount" className="num">{money(r.amount_bdt)}</td>
                    <td data-label="Days" className="num">{r.duty_days??'—'}</td>
                    <td data-label="Calc start">{r.calc_start??'—'}</td>
                    <td data-label="Step">{r.match_pass?`A/C${r.match_pass===2?'-win':''}`:r.confidence==='medium'?'D':'—'}</td>
                    <td data-label="Notes"><span className="muted" style={{display:'block',maxWidth:'22rem'}}>{r.notes??r.mismatch_kind??'—'}</span></td>
                    <td data-label="Actions">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={()=>setDetail(r)}>Message</Button>
                        <Button size="sm" variant="outline" disabled={busy||r.match_status!=='MATCHED'||!r.program_id} onClick={()=>setConfirm({action:'apply',ids:[r.id]})}>Apply</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={()=>setConfirm({action:'reject',ids:[r.id]})}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </SectionCard>

      <AlertDialog open={!!confirm} onOpenChange={open=>{if(!open)setConfirm(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action==='apply'?'Apply these releases?':'Reject these candidates?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action==='apply'
                ?`${confirm?.ids.length??0} release(s) will be written through the vessel command layer, the program marked released and its pay recalculated. Each change is appended to the audit history.`
                :`${confirm?.ids.length??0} candidate(s) will be marked rejected. Programs are not touched.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={()=>{const c=confirm;setConfirm(null);if(c)void run(c.action,c.ids);}}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!detail} onOpenChange={open=>{if(!open)setDetail(null);}}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Source message</SheetTitle>
            <SheetDescription>
              {detail?.escort_name||detail?.escort_phone} · {detail?.source_date??'—'} · message {detail?.source_msg_id??'—'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 text-sm">
            <p className="mb-2 text-muted-foreground">
              {detail?.mother_vessel??'—'} / {detail?.lighter_vessel??'—'} · end {detail?.end_date} ({detail?.end_shift??'—'})
            </p>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-3 text-xs">{detail?.source_text||'No text body stored for this message.'}</pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Parsed: amount {money(detail?.amount_bdt??null)} · {detail?.duty_days??'—'} days · calc start {detail?.calc_start??'—'}
              {detail?.notes?` · ${detail.notes}`:''}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
