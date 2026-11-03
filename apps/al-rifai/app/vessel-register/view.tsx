'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Checkbox} from '@/components/ui/checkbox';
import {ActionButtonDisabled,LoadingLines,Unavailable,useApi} from '@/app/platform/ui';
import {payCells,shiftStamp} from '@/lib/vessel-pay';
import {PayValue} from '@/app/platform/pay-value';
import {DataToolbar} from '@/app/platform/data-toolbar';
import {applyFilters,sortRows,defaultFilters,type ToolbarFilters,type FacetDef,type SortDef} from '@/app/platform/toolbar-logic';
import {useRouter} from 'next/navigation';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Toaster,toast} from 'sonner';

type Program={
  id:string;motherVessel:string;lighterVessel:string;masterMobile?:string;destination?:string;
  escortName?:string;escortMobile?:string;startDate?:string;endDate?:string;shift?:string;
  status?:string;source?:string;notes?:string;details?:Record<string,unknown>;
  employeeId?:string|null;
  endShift?:string|null;
  revision?:number;
  payState?:'CALCULATED'|'UNRESOLVED'|null;payReason?:string|null;halfDayUnits?:number|null;
  salaryMinor?:string|null;conveyanceMinor?:string|null;totalMinor?:string|null;
};
type ProgramDetail={available:boolean;program?:Program&{revision?:number};history?:{events?:HistoryEvent[]}};
type HistoryEvent={action?:string;key?:string;at?:string;actor?:string;note?:string;reason?:string;employeeMobile?:string;endDate?:string;endShift?:string;releasePoint?:string;patch?:Record<string,unknown>};
type CommandResponse={ok?:boolean;error?:string;available?:boolean;programId?:string;revision?:number;idempotent?:boolean;reviewState?:string;
  employeeAction?:'created'|'exists'|'alias_added';employeeCreated?:boolean;employeeName?:string};
type SourceResponse={available:boolean;source?:{message_id:string;chat_jid:string;direction:string;sender_jid?:string;sender_phone?:string;source_time?:string;text_content?:string}|null;error?:string};

const commandKey=()=>`ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

// Phase 3: a vessel command reports whether the escort it names was filed as a new
// employee, or gained a new spelling as an alias. The program itself saves either
// way — this is only the visible confirmation that the employee master changed.
function notifyEmployee(data:CommandResponse){
  if(data.employeeCreated)toast.success(`New employee created: ${data.employeeName??'unnamed'}`);
  else if(data.employeeAction==='alias_added')toast.info(`New name recorded for an existing employee: ${data.employeeName??'unnamed'}`);
}

function PayCells({program}:{program:Program}){
  const c=payCells(program);
  // F12: money columns are plain text — no chip, no border. The explanation stays
  // available as a native tooltip.
  return <><TableCell className="vr-num"><PayValue cell={c.days} plain/></TableCell><TableCell className="vr-num"><PayValue cell={c.salary} plain/></TableCell><TableCell className="vr-num"><PayValue cell={c.conveyance} plain/></TableCell><TableCell className="vr-num"><PayValue cell={c.total} plain/></TableCell></>;
}

export default function VesselRegisterView(){
  const register=useApi<{rows:Program[];total:number}>('/api/register?export=1');
  const [detail,setDetail]=useState<{program:Program;data:ProgramDetail}|null>(null);
  const [source,setSource]=useState<SourceResponse|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [available,setAvailable]=useState<boolean|null>(null);
  const [drawer,setDrawer]=useState<'add'|'edit'|'release'|'assign'|'void'|null>(null);
  const router=useRouter();
  const [cancelTarget,setCancelTarget]=useState<Program|null>(null);
  const [fleeTarget,setFleeTarget]=useState<Program|null>(null);
  const [fleeReason,setFleeReason]=useState('');
  // Local echo of the status just written, so the row updates without refetching
  // the whole register. The database remains the source of truth.
  const [statusPatch,setStatusPatch]=useState<Record<string,string>>({});
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState<Record<string,string>>({});
  const [form,setForm]=useState<Record<string,string>>({});
  const [replace,setReplace]=useState(false);

  const rows=useMemo(()=>register.data?.rows??[],[register.data?.rows]);

  // F13: display-only label mapping. The database values are never renamed.
  //   Confirmed -> Running (or Released once an end date exists)
  //   Voided    -> Cancel
  //   fled      -> Fleed A
  //   escort_changed -> E. Chng
  // "Released" is a state derived from the release window, not a stored status:
  // the release command sets endDate and leaves status Confirmed.
  const statusLabel=(p:Program):string=>{
    const st=(statusPatch[p.id]??p.status??'').trim().toLowerCase();
    if(st==='voided')return 'Cancel';
    if(st==='fled')return 'Fleed A';
    if(st==='escort_changed')return 'E. Chng';
    if(st==='draft')return 'Draft';
    if(st==='confirmed')return p.endDate?'Released':'Running';
    return p.status||'—';
  };
  // Toolbar state. Filtering happens before pagination (§C9).
  const PAGE_SIZE=20;
  const [filters,setFilters]=useState<ToolbarFilters>(defaultFilters('start_desc'));
  const [page,setPage]=useState(1);
  // statusLabel is derived from statusPatch, which is the real dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const decorated=useMemo(()=>rows.map(r=>({...r,statusLabel:statusLabel(r)})),[rows,statusPatch]);
  const filtered=useMemo(()=>applyFilters(decorated,filters,
    {searchFields:['motherVessel','lighterVessel','escortName','escortMobile','masterMobile'],dateField:'startDate'},
  ),[decorated,filters]);
  const sorted=useMemo(()=>sortRows(filtered,filters.sort),[filtered,filters.sort]);
  const pages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
  // Clamp rather than reset in an effect: a shrinking result set must never blank
  // the table, and setState-in-effect is rejected by this project's lint rules.
  const current=Math.min(page,pages);
  const visible=sorted.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
  const motherOptions=useMemo(()=>[...new Set(rows.map(r=>r.motherVessel).filter(Boolean))].sort(),[rows]);
  const statusOptions=useMemo(()=>[...new Set(decorated.map(r=>String(r.statusLabel)))].sort(),[decorated]);
  const facets=useMemo<FacetDef[]>(()=>[
    {key:'motherVessel',label:'Mother',values:motherOptions},
    {key:'statusLabel',label:'Status',values:statusOptions},
  ],[motherOptions,statusOptions]);
  const sorts=useMemo<SortDef[]>(()=>[
    {key:'start_desc',label:'Start date (newest first)'},
    {key:'start_asc',label:'Start date (oldest first)'},
    {key:'mother_asc',label:'Mother vessel A-Z'},
    {key:'mother_desc',label:'Mother vessel Z-A'},
    {key:'escort_asc',label:'Escort name A-Z'},
    {key:'total_desc',label:'Total pay (highest first)'},
  ],[]);

  const refreshAvailability=async()=>{
    const response=await fetch('/api/vessel-programs',{headers:{Accept:'application/json'}});
    const data=await response.json() as {available?:boolean};
    if(response.ok)setAvailable(data.available===true);
  };

  const openDetail=async(program:Program)=>{
    setError('');setNotice('');setSource(null);setBusy(true);
    try{
      const response=await fetch(`/api/vessel-programs?programId=${encodeURIComponent(program.id)}`);
      const data=await response.json() as ProgramDetail&{error?:string};
      if(!response.ok){if(response.status===503)setAvailable(false);throw new Error(data.error??'Details unavailable');}
      setAvailable(data.available);setDetail({program:data.program??program,data});
    }catch(cause){setError(cause instanceof Error?cause.message:'Details unavailable');}
    finally{setBusy(false);}
  };

  const openSource=async(messageId?:string)=>{
    if(!messageId)return;
    const response=await fetch(`/api/vessel-programs?messageId=${encodeURIComponent(messageId)}`);
    const data=await response.json() as SourceResponse&{error?:string};
    if(!response.ok){setError(data.error??'Source unavailable');return;}
    setSource(data);
  };

  const send=async(body:Record<string,unknown>)=>{
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/vessel-programs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,commandKey:commandKey()})});
      const data=await response.json() as CommandResponse;
      if(response.status===503){setAvailable(false);throw new Error('Command layer is prepared but not applied (migration 0032).');}
      if(!response.ok)throw new Error(data.error??'Command failed');
      setNotice(data.idempotent?'Command already applied — no changes recorded.':`Saved. Program revision ${data.revision??'—'} recorded in the append-only audit history.`);
      notifyEmployee(data);
      const programId=String(data.programId??body.programId??detail?.program.id??'');
      setDrawer(null);setDetail(null);
      if(programId)await openDetail({id:programId,motherVessel:String(body.motherVessel??detail?.program.motherVessel??''),lighterVessel:String(body.lighterVessel??detail?.program.lighterVessel??'')});
    }catch(cause){setError(cause instanceof Error?cause.message:'Command failed');}
    finally{setBusy(false);}
  };

  const canWrite=available===true;
  // Row-level availability, per Owner decision 2026-11-02:
  //   View/History  any status; Edit: Confirmed + Draft; Cancel: Confirmed only.
  // Voided programs are terminal — void() itself rejects a second void.
  const rowStatus=(p:Program)=>(p.status??'').trim().toLowerCase();
  const rowEditable=(p:Program)=>['confirmed','draft'].includes(rowStatus(p));
  const rowCancellable=(p:Program)=>rowStatus(p)==='confirmed';

  const changeStatus=async(p:Program,next:string)=>{
    if(next===statusLabel(p))return;
    if(next==='Running')return;                      // already active
    if(next==='Released'){await openRowDrawer(p,'release');return;}
    if(next==='Cancel'){setCancelTarget(p);return;}
    if(next==='E. Chng'){await openRowDrawer(p,'assign');return;}
    if(next==='Fleed A'){setFleeTarget(p);setFleeReason('');return;}
  };
  const sendFled=async()=>{
    const target=fleeTarget;
    if(!target)return;
    if(fleeReason.trim().length<3){setError('Enter a reason (at least 3 characters).');return;}
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/vessel-programs',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'fled',programId:target.id,expectedRevision:Number(target.revision??0),reason:fleeReason.trim(),commandKey:commandKey()})});
      const data=await response.json() as CommandResponse;
      if(response.status===503){setAvailable(false);throw new Error('Command layer is prepared but not applied.');}
      if(!response.ok)throw new Error(data.error??'Command failed');
      setStatusPatch(prev=>({...prev,[target.id]:'fled'}));
      setNotice('Program marked Fleed A. The reason is recorded in the append-only audit history.');
      setFleeTarget(null);setFleeReason('');
      if(detail?.program.id===target.id)await openDetail(target);
    }catch(cause){setError(cause instanceof Error?cause.message:'Command failed');}
    finally{setBusy(false);}
  };
  // `??` would not fall through an empty string, and the 5 archive-epoch rows
  // carry an empty escortMobile. Trim, then fall back to employeeId.
  const rowMobile=(p:Program)=>((p.escortMobile??'').trim()||(p.employeeId??'').trim());
  const programsHref=(p:Program)=>`/employee/${encodeURIComponent(rowMobile(p))}/programs`;
  // Edit and Cancel need the current revision, which only the detail fetch carries,
  // so both go through openDetail() first rather than issuing a blind command.
  const openRowDrawer=async(p:Program,next:'edit'|'void'|'release'|'assign')=>{await openDetail(p);setDrawer(next);};

  const EDITABLE=['motherVessel','lighterVessel','masterMobile','destination','escortName','escortMobile','startDate','shift','notes'] as const;
  const startEdit=()=>{
    if(!detail)return;
    const source=detail.program as unknown as Record<string,unknown>;
    setEditForm(Object.fromEntries(EDITABLE.map(k=>[k,String(source[k]??'')])));
    setEditing(true);setError('');setNotice('');
  };
  const cancelEdit=()=>{setEditing(false);setEditForm({});setError('');};

  // Save stays inside the panel: it posts the existing edit command, then refreshes
  // the detail (new revision + history) without closing the sidebar.
  const saveEdit=async()=>{
    if(!detail)return;
    const current=detail.program as unknown as Record<string,unknown>;
    const patch:Record<string,string>={};
    for(const k of EDITABLE){
      const next=(editForm[k]??'').trim();
      const before=String(current[k]??'').trim();
      if(next!==before)patch[k]=next;
    }
    if(!Object.keys(patch).length){setEditing(false);return;}
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/vessel-programs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'edit',programId:detail.program.id,expectedRevision:Number(detail.data.program?.revision??0),patch,commandKey:commandKey()})});
      const data=await response.json() as CommandResponse;
      if(response.status===503){setAvailable(false);throw new Error('Command layer is prepared but not applied (migration 0032).');}
      if(!response.ok)throw new Error(data.error??'Command failed');
      setNotice(data.idempotent?'Command already applied — no changes recorded.':`Saved. Revision ${data.revision??'—'} recorded in the append-only audit history.`);
      notifyEmployee(data);
      setEditing(false);setEditForm({});
      await openDetail(detail.program);
    }catch(cause){setError(cause instanceof Error?cause.message:'Command failed');}
    finally{setBusy(false);}
  };

  return <div className="register-legacy-skin flex flex-col gap-3">
    <Toaster position="top-center" richColors/>
    {register.error&&<Unavailable title="Register unavailable" reason={register.error}/>}
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold">Programs <span className="font-normal text-muted-foreground">({sorted.length} shown)</span></h2>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={()=>void refreshAvailability()}>Check command layer</Button>
        <Button size="sm" disabled={!canWrite} onClick={()=>{setForm({});setDrawer('add');}}>+ Add program</Button>
        {!canWrite&&<ActionButtonDisabled label="Commands locked" reason="Vessel command functions (migration 0032) are prepared and rehearsed but not applied. The register stays read-only."/>}
      </div>
    </div>
    {available===false&&<Unavailable title="Command layer awaiting approval" reason="Migration 0032 is prepared and rehearsed in isolation but not applied in this deployment. All program views remain available; Add/Edit/Release/Assign/Void stay disabled."/>}
    {error&&<p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{error}</p>}
    {notice&&<p role="status" className="rounded-md border bg-muted/40 p-2 text-sm">{notice}</p>}

    <DataToolbar
      filters={filters}
      onChange={setFilters}
      facets={facets}
      sorts={sorts}
      resultLabel={`Showing ${sorted.length} of ${rows.length} programs`}
    />
    {register.loading&&<LoadingLines/>}
    {register.data&&<div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader><TableRow><TableHead>Mother Vessel</TableHead><TableHead>Lighter Vessel</TableHead><TableHead>Escort Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-right">Conv.</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
        <TableBody>{visible.map(program=><TableRow key={program.id}>
          <TableCell className="w-[139px] max-w-[139px] truncate" title={program.motherVessel||undefined}>{program.motherVessel||'—'}</TableCell>
          <TableCell className="w-[139px] max-w-[139px]">
            <span className="block truncate" title={program.lighterVessel||undefined}>{program.lighterVessel||'—'}</span>
            <span className="block truncate text-[11px] text-muted-foreground" title={program.masterMobile||undefined}>{program.masterMobile||'—'}</span>
          </TableCell>
          <TableCell className="w-[158px] max-w-[158px]">
            <span className="block truncate" title={program.escortName||undefined}>{program.escortName||'—'}</span>
            <span className="block truncate text-[11px] text-muted-foreground" title={program.escortMobile||undefined}>{program.escortMobile||'—'}</span>
          </TableCell>
          <TableCell className="whitespace-nowrap">{shiftStamp(program.startDate,program.shift)}</TableCell>
          <TableCell className="whitespace-nowrap">{shiftStamp(program.endDate,program.endShift)}</TableCell>
          <PayCells program={program}/>
          <TableCell className="w-[132px]">
            <Select
              value={statusLabel(program)}
              onValueChange={v=>void changeStatus(program,v)}
              disabled={!canWrite||((statusPatch[program.id]??program.status??'').toLowerCase()!=='confirmed')}
            >
              <SelectTrigger className="h-8 w-[120px]" aria-label={`Status for ${program.lighterVessel||program.id.slice(0,12)}`}><SelectValue/></SelectTrigger>
              <SelectContent>
                {['Running','Released','Cancel','E. Chng','Fleed A'].map(option=>
                  <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Button size="icon-sm" variant="ghost" aria-label={`Open ${program.motherVessel||'program'} ${program.lighterVessel||''}`} onClick={()=>void openDetail(program)}>⋮</Button>
          </TableCell>
        </TableRow>)}
        {!sorted.length&&<TableRow><TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">No programs match.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 text-[11px] text-muted-foreground">
        <span>Showing {sorted.length?`${(current-1)*PAGE_SIZE+1}-${Math.min(current*PAGE_SIZE,sorted.length)} of ${sorted.length}`:'0'} filtered ({rows.length} total)</span>
        <span className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={current<=1} onClick={()=>setPage(Math.max(1,current-1))}>Previous</Button>
          <span>Page {current} of {pages}</span>
          <Button size="sm" variant="outline" disabled={current>=pages} onClick={()=>setPage(Math.min(pages,current+1))}>Next</Button>
        </span>
      </div>
      <p className="p-2 text-[11px] text-muted-foreground">Read-only register retained · write commands require the approved command layer.</p>
    </div>}

    <AlertDialog open={!!fleeTarget} onOpenChange={open=>{if(!open){setFleeTarget(null);setFleeReason('');}}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this program as Fleed A?</AlertDialogTitle>
          <AlertDialogDescription>
            {fleeTarget?`${fleeTarget.motherVessel||'Unknown mother vessel'} / ${fleeTarget.lighterVessel||'unknown lighter'}`:'This program'} will be recorded as <strong>fled</strong> — the escort left the vessel without a release. Nothing is deleted; the reason is appended to the audit history. A reason is required.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 py-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Reason</span>
            <Input value={fleeReason} onChange={e=>setFleeReason(e.target.value)} placeholder="Why the escort fled"/>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy||fleeReason.trim().length<3} onClick={()=>void sendFled()}>Mark Fleed A</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!cancelTarget} onOpenChange={open=>{if(!open)setCancelTarget(null);}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this program?</AlertDialogTitle>
          <AlertDialogDescription>
            {cancelTarget?`${cancelTarget.motherVessel||'Unknown mother vessel'} / ${cancelTarget.lighterVessel||'unknown lighter'}`:'This program'} will be marked <strong>Voided</strong>. Nothing is deleted: the row is retained and the change is appended to the audit history. A reason is required in the next step.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep program</AlertDialogCancel>
          <AlertDialogAction onClick={()=>{const target=cancelTarget;setCancelTarget(null);if(target)void openRowDrawer(target,'void');}}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Sheet open={!!detail} onOpenChange={open=>{if(!open){setDetail(null);setSource(null);setEditing(false);setEditForm({});}}}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.program.motherVessel} / {detail?.program.lighterVessel}</SheetTitle>
          <SheetDescription>
            {editing?'Editing — changes are written through the program command layer and appended to the audit history.':'Read-only detail with append-only command history.'}
            {' '}Status {detail?.program.status||'—'} · revision {detail?.data.program?.revision??'—'}.
          </SheetDescription>
        </SheetHeader>
        {detail&&<div className="grid gap-3 px-4 pb-4 text-sm">

          {!editing&&(
            <div className="grid grid-cols-2 gap-2">
              {([
                ['Mother',detail.program.motherVessel],['Lighter',detail.program.lighterVessel],
                ['Master',detail.program.masterMobile||'—'],['Destination',detail.program.destination||'—'],
                ['Escort',detail.program.escortName||'—'],['Escort mobile',detail.program.escortMobile||'—'],
                ['Start',shiftStamp(detail.program.startDate,detail.program.shift)],
                ['End',shiftStamp(detail.program.endDate,detail.program.endShift)],
                ['Status',detail.program.status||'—'],
                ['Days',payCells(detail.program).days.value],
                ['Salary',payCells(detail.program).salary.value],
                ['Total',payCells(detail.program).total.value],
              ] as [string,string][]).map(([label,value])=>
                <div key={label} className="rounded border p-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-medium">{String(value)}</p></div>)}
            </div>
          )}

          {editing&&(
            <div className="grid gap-2">
              {([
                ['motherVessel','Mother vessel','text'],['lighterVessel','Lighter vessel','text'],
                ['masterMobile','Master mobile','text'],['destination','Destination','text'],
                ['escortName','Escort name','text'],['escortMobile','Escort mobile','text'],
                ['startDate','Start date','date'],['notes','Notes','text'],
              ] as [keyof typeof editForm,string,string][]).map(([field,label,type])=>
                <label key={field} className="grid gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                  <Input type={type} value={editForm[field]??''} onChange={e=>setEditForm(prev=>({...prev,[field]:e.target.value}))}/>
                </label>)}
              <label className="grid gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Shift</span>
                <Select value={editForm.shift??''} onValueChange={v=>setEditForm(prev=>({...prev,shift:v}))}>
                  <SelectTrigger><SelectValue placeholder="Choose shift"/></SelectTrigger>
                  <SelectContent><SelectItem value="D">D · Day</SelectItem><SelectItem value="N">N · Night</SelectItem></SelectContent>
                </Select>
              </label>
              <p className="text-[11px] text-muted-foreground">End date and end shift are set by the Release command, not by Edit.</p>
            </div>
          )}

          <div className="grid gap-1">
            {!editing&&<Button className="w-full" variant="outline" disabled={!canWrite||!rowEditable(detail.program)} onClick={startEdit}>Edit</Button>}
            {!editing&&<Button className="w-full" variant="outline" disabled={!canWrite||!rowCancellable(detail.program)} onClick={()=>{setForm({reason:''});setCancelTarget(detail.program);}}>Cancel program</Button>}
            {!editing&&<Button className="w-full" variant="outline" disabled={!rowMobile(detail.program)} onClick={()=>router.push(programsHref(detail.program))}>History</Button>}
            {editing&&<Button className="w-full" disabled={busy} onClick={()=>void saveEdit()}>{busy?'Saving…':'Save'}</Button>}
            {editing&&<Button className="w-full" variant="outline" disabled={busy} onClick={cancelEdit}>Cancel</Button>}
            <Button className="w-full" variant="ghost" onClick={()=>setDetail(null)}>Close</Button>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium">Source &amp; audit</p>
            <div className="grid gap-1">
              <Button className="w-full" size="sm" variant="ghost" onClick={()=>void openSource(String((detail.program.details as Record<string,unknown>|undefined)?.sourceMessageId??(detail.program.details as Record<string,unknown>|undefined)?.confirmationMessageId??''))}>WhatsApp source</Button>
            </div>
            {source&&<div className="mt-2 rounded border p-2 text-xs"><p className="text-muted-foreground">{source.source?`${source.source.direction} · ${source.source.sender_phone??source.source.sender_jid??'unknown'} · ${String(source.source.source_time??'').slice(0,16).replace('T',' ')}`:'No archived source message is linked to this program.'}</p>{source.source?.text_content&&<pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2">{source.source.text_content}</pre>}</div>}
            <ul className="mt-2 grid gap-1 text-xs">
              {(detail.data.history?.events??[]).slice().reverse().map((event,index)=><li key={String(event.key??index)} className="rounded border p-2">
                <strong>{event.action}</strong> · {String(event.at??'').slice(0,16).replace('T',' ')}
                {event.note&&<span className="text-muted-foreground"> — {event.note}</span>}
                {event.reason&&<span className="text-muted-foreground"> — {event.reason}</span>}
              </li>)}
              {!(detail.data.history?.events??[]).length&&<li className="text-muted-foreground">No command events recorded yet.</li>}
            </ul>
          </div>
        </div>}
      </SheetContent>
    </Sheet>

    <Sheet open={!!drawer&&drawer!=='add'} onOpenChange={open=>!open&&setDrawer(null)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{drawer==='add'?'Add program':drawer==='edit'?'Edit program':drawer==='release'?'Update release':drawer==='assign'?(replace?'Replace escort':'Assign escort'):'Void program'}</SheetTitle>
          <SheetDescription>Submitted commands are validated and recorded in the append-only command ledger. Nothing is claimed saved until the server confirms.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 pb-4">
          {drawer==='add'&&<>
            {[['motherVessel','Mother vessel'],['lighterVessel','Lighter vessel'],['masterMobile','Master mobile'],['destination','Destination'],['escortName','Escort name'],['escortMobile','Escort mobile']].map(([key,label])=><div key={key} className="grid gap-1"><Label htmlFor={`add-${key}`}>{label}</Label><Input id={`add-${key}`} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}
            <div className="grid gap-1"><Label htmlFor="add-start">Start date</Label><Input id="add-start" type="date" value={form.startDate??''} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
            <div className="grid gap-1"><Label htmlFor="add-shift">Shift</Label><Select value={form.shift??'D'} onValueChange={value=>setForm({...form,shift:value})}><SelectTrigger id="add-shift"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="D">Day (D)</SelectItem><SelectItem value="N">Night (N)</SelectItem></SelectContent></Select></div>
          </>}
          {drawer==='edit'&&<>
            {[['motherVessel','Mother vessel'],['lighterVessel','Lighter vessel'],['masterMobile','Master mobile'],['destination','Destination'],['escortName','Escort name'],['escortMobile','Escort mobile'],['notes','Notes']].map(([key,label])=><div key={key} className="grid gap-1"><Label htmlFor={`edit-${key}`}>{label}</Label>{key==='notes'?<Textarea id={`edit-${key}`} rows={2} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<Input id={`edit-${key}`} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</div>)}
          </>}
          {drawer==='release'&&<>
            <div className="grid gap-1"><Label htmlFor="rel-date">Release date</Label><Input id="rel-date" type="date" value={form.endDate??''} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
            <div className="grid gap-1"><Label htmlFor="rel-shift">End shift</Label><Select value={form.endShift??'D'} onValueChange={value=>setForm({...form,endShift:value})}><SelectTrigger id="rel-shift"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="D">Day (D)</SelectItem><SelectItem value="N">Night (N)</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1"><Label htmlFor="rel-point">Release point</Label><Input id="rel-point" value={form.releasePoint??''} onChange={e=>setForm({...form,releasePoint:e.target.value})}/></div>
          </>}
          {drawer==='assign'&&<>
            <div className="grid gap-1"><Label htmlFor="as-mobile">Employee mobile (01…)</Label><Input id="as-mobile" value={form.employeeMobile??''} onChange={e=>setForm({...form,employeeMobile:e.target.value})}/></div>
            <div className="grid gap-1"><Label htmlFor="as-date">Duty start date</Label><Input id="as-date" type="date" value={form.startDate??''} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
            <div className="grid gap-1"><Label htmlFor="as-shift">Start shift</Label><Select value={form.startShift??'D'} onValueChange={value=>setForm({...form,startShift:value})}><SelectTrigger id="as-shift"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="D">Day (D)</SelectItem><SelectItem value="N">Night (N)</SelectItem></SelectContent></Select></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={replace} onCheckedChange={value=>setReplace(value===true)}/> Replace existing assignment</label>
          </>}
          {drawer==='void'&&<div className="grid gap-1"><Label htmlFor="void-reason">Void reason (audited; nothing is deleted)</Label><Textarea id="void-reason" rows={3} value={form.reason??''} onChange={e=>setForm({...form,reason:e.target.value})}/></div>}
          <p className="text-[11px] text-muted-foreground">Revision check: {String(detail?.data.program?.revision??'—')} · optimistic conflict protection is enforced by the command function.</p>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={()=>setDrawer(null)} disabled={busy}>Cancel</Button>
            <Button disabled={busy||!canWrite} onClick={()=>{
              if(!detail)return;
              const revision=Number(detail.data.program?.revision??0);
              if(drawer==='edit')void send({action:'edit',programId:detail.program.id,expectedRevision:revision,patch:Object.fromEntries(Object.entries(form).filter(([,value])=>String(value).trim()!==''))});
              if(drawer==='release')void send({action:'release',programId:detail.program.id,expectedRevision:revision,endDate:form.endDate,endShift:form.endShift,releasePoint:form.releasePoint??''});
              if(drawer==='assign')void send({action:'assign',programId:detail.program.id,expectedRevision:revision,employeeMobile:form.employeeMobile,startDate:form.startDate,startShift:form.startShift,replace,note:form.note??''});
              if(drawer==='void')void send({action:'void',programId:detail.program.id,expectedRevision:revision,reason:form.reason});
            }}>{busy?'Saving…':'Save command'}</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>

    <Sheet open={drawer==='add'} onOpenChange={open=>!open&&setDrawer(null)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Add program</SheetTitle><SheetDescription>New programs are created as Draft and recorded with one audit event.</SheetDescription></SheetHeader>
        <div className="grid gap-3 px-4 pb-4">
          {[['motherVessel','Mother vessel'],['lighterVessel','Lighter vessel'],['masterMobile','Master mobile'],['destination','Destination'],['escortName','Escort name'],['escortMobile','Escort mobile']].map(([key,label])=><div key={key} className="grid gap-1"><Label htmlFor={`new-${key}`}>{label}</Label><Input id={`new-${key}`} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}
          <div className="grid gap-1"><Label htmlFor="new-start">Start date</Label><Input id="new-start" type="date" value={form.startDate??''} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
          <div className="grid gap-1"><Label htmlFor="new-shift">Shift</Label><Select value={form.shift??'D'} onValueChange={value=>setForm({...form,shift:value})}><SelectTrigger id="new-shift"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="D">Day (D)</SelectItem><SelectItem value="N">Night (N)</SelectItem></SelectContent></Select></div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={()=>setDrawer(null)} disabled={busy}>Cancel</Button>
            <Button disabled={busy||!canWrite} onClick={()=>void send({action:'add',programId:undefined,motherVessel:form.motherVessel,lighterVessel:form.lighterVessel,masterMobile:form.masterMobile,destination:form.destination,escortName:form.escortName,escortMobile:form.escortMobile,startDate:form.startDate,shift:form.shift??'D'})}>{busy?'Saving…':'Add program'}</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  </div>;
}
