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
import {ActionButtonDisabled,LoadingLines,StatusBadge,Unavailable,useApi} from '@/app/platform/ui';
import {payCells,type PayCell} from '@/lib/vessel-pay';

type Program={
  id:string;motherVessel:string;lighterVessel:string;masterMobile?:string;destination?:string;
  escortName?:string;escortMobile?:string;startDate?:string;endDate?:string;shift?:string;
  status?:string;source?:string;notes?:string;details?:Record<string,unknown>;
  payState?:'CALCULATED'|'UNRESOLVED'|null;payReason?:string|null;halfDayUnits?:number|null;
  salaryMinor?:string|null;conveyanceMinor?:string|null;totalMinor?:string|null;
};
type ProgramDetail={available:boolean;program?:Program&{revision?:number};history?:{events?:HistoryEvent[]}};
type HistoryEvent={action?:string;key?:string;at?:string;actor?:string;note?:string;reason?:string;employeeMobile?:string;endDate?:string;endShift?:string;releasePoint?:string;patch?:Record<string,unknown>};
type CommandResponse={ok?:boolean;error?:string;available?:boolean;programId?:string;revision?:number;idempotent?:boolean;reviewState?:string};
type SourceResponse={available:boolean;source?:{message_id:string;chat_jid:string;direction:string;sender_jid?:string;sender_phone?:string;source_time?:string;text_content?:string}|null;error?:string};

const commandKey=()=>`ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

// A resolved amount renders plainly. A missing one renders in a highlighted chip
// whose tooltip explains why — and never shows the internal reason code.
function PayValue({cell}:{cell:PayCell}){
  if(!cell.note)return <span className="vr-pay">{cell.value}</span>;
  return <span className="vr-pay-missing" data-tip={cell.note} tabIndex={0} aria-label={`${cell.value} — ${cell.note}`}>{cell.value}</span>;
}
function PayCells({program}:{program:Program}){
  const c=payCells(program);
  return <><TableCell className="vr-num"><PayValue cell={c.days}/></TableCell><TableCell className="vr-num"><PayValue cell={c.salary}/></TableCell><TableCell className="vr-num"><PayValue cell={c.conveyance}/></TableCell><TableCell className="vr-num"><PayValue cell={c.total}/></TableCell></>;
}

export default function VesselRegisterView(){
  const register=useApi<{rows:Program[];total:number}>('/api/register?export=1');
  const [q,setQ]=useState('');
  const [detail,setDetail]=useState<{program:Program;data:ProgramDetail}|null>(null);
  const [source,setSource]=useState<SourceResponse|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [available,setAvailable]=useState<boolean|null>(null);
  const [drawer,setDrawer]=useState<'add'|'edit'|'release'|'assign'|'void'|null>(null);
  const [form,setForm]=useState<Record<string,string>>({});
  const [replace,setReplace]=useState(false);

  const rows=useMemo(()=>{
    const list=register.data?.rows??[];
    const term=q.toLowerCase();
    return term?list.filter(row=>[row.motherVessel,row.lighterVessel,row.escortName,row.escortMobile,row.id,row.status].join(' ').toLowerCase().includes(term)):list;
  },[register.data,q]);

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
      const programId=String(data.programId??body.programId??detail?.program.id??'');
      setDrawer(null);setDetail(null);
      if(programId)await openDetail({id:programId,motherVessel:String(body.motherVessel??detail?.program.motherVessel??''),lighterVessel:String(body.lighterVessel??detail?.program.lighterVessel??'')});
    }catch(cause){setError(cause instanceof Error?cause.message:'Command failed');}
    finally{setBusy(false);}
  };

  const canWrite=available===true;

  return <div className="flex flex-col gap-3">
    {register.error&&<Unavailable title="Register unavailable" reason={register.error}/>}
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold">Programs <span className="font-normal text-muted-foreground">({rows.length} shown)</span></h2>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={()=>void refreshAvailability()}>Check command layer</Button>
        <Button size="sm" disabled={!canWrite} onClick={()=>{setForm({});setDrawer('add');}}>+ Add program</Button>
        {!canWrite&&<ActionButtonDisabled label="Commands locked" reason="Vessel command functions (migration 0032) are prepared and rehearsed but not applied. The register stays read-only."/>}
      </div>
    </div>
    {available===false&&<Unavailable title="Command layer awaiting approval" reason="Migration 0032 is prepared and rehearsed in isolation but not applied in this deployment. All program views remain available; Add/Edit/Release/Assign/Void stay disabled."/>}
    {error&&<p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{error}</p>}
    {notice&&<p role="status" className="rounded-md border bg-muted/40 p-2 text-sm">{notice}</p>}

    <div className="max-w-sm"><Input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search vessel, escort, ID, status…" aria-label="Search programs"/></div>
    {register.loading&&<LoadingLines/>}
    {register.data&&<div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader><TableRow><TableHead>Mother</TableHead><TableHead>Lighter</TableHead><TableHead>Escort</TableHead><TableHead>Start</TableHead><TableHead>Shift</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-right">Conv.</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{rows.slice(0,200).map(program=><TableRow key={program.id}>
          <TableCell>{program.motherVessel}</TableCell>
          <TableCell>{program.lighterVessel}</TableCell>
          <TableCell>{program.escortName||'—'}</TableCell>
          <TableCell className="whitespace-nowrap">{program.startDate||'—'}</TableCell>
          <TableCell>{program.shift||'—'}</TableCell>
          <PayCells program={program}/>
          <TableCell><StatusBadge status={program.status||'RECORDED'}/></TableCell>
          <TableCell><span className="flex gap-1"><Button size="sm" variant="ghost" onClick={()=>void openDetail(program)}>Details</Button></span></TableCell>
        </TableRow>)}
        {!rows.length&&<TableRow><TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">No programs match.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <p className="p-2 text-[11px] text-muted-foreground">Read-only register retained · first {Math.min(200,rows.length)} rows · write commands require the approved command layer.</p>
    </div>}

    <Sheet open={!!detail} onOpenChange={open=>{if(!open){setDetail(null);setSource(null);}}}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.program.motherVessel} / {detail?.program.lighterVessel}</SheetTitle>
          <SheetDescription>Read-only detail with append-only command history. Status {detail?.program.status||'—'} · revision {detail?.data.program?.revision??'—'}.</SheetDescription>
        </SheetHeader>
        {detail&&<div className="grid gap-3 px-4 pb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {[['Mother',detail.program.motherVessel],['Lighter',detail.program.lighterVessel],['Master',detail.program.masterMobile||'—'],['Destination',detail.program.destination||'—'],['Escort',detail.program.escortName||'—'],['Escort mobile',detail.program.escortMobile||'—'],['Start',detail.program.startDate||'—'],['Release',detail.program.endDate||'—'],['Shift',detail.program.shift||'—'],['Status',detail.program.status||'—']].map(([label,value])=>
              <div key={label} className="rounded border p-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-medium">{String(value)}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" disabled={!canWrite} onClick={()=>{setForm({destination:detail.program.destination??'',masterMobile:detail.program.masterMobile??'',escortName:detail.program.escortName??'',escortMobile:detail.program.escortMobile??'',notes:detail.program.notes??''});setDrawer('edit');}}>Edit</Button>
            <Button size="sm" variant="outline" disabled={!canWrite} onClick={()=>{setForm({endDate:detail.program.endDate??'',endShift:detail.program.shift??'D',releasePoint:''});setDrawer('release');}}>Release</Button>
            <Button size="sm" variant="outline" disabled={!canWrite} onClick={()=>{setReplace(Boolean(detail.program.escortMobile));setForm({employeeMobile:'',startDate:detail.program.startDate??'',startShift:detail.program.shift??'D',note:''});setDrawer('assign');}}>{detail.program.escortMobile?'Replace escort':'Assign escort'}</Button>
            <Button size="sm" variant="outline" disabled={!canWrite||detail.program.status==='Voided'} onClick={()=>{setForm({reason:''});setDrawer('void');}}>Void</Button>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Source &amp; audit</p>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={()=>void openSource(String((detail.program.details as Record<string,unknown>|undefined)?.sourceMessageId??(detail.program.details as Record<string,unknown>|undefined)?.confirmationMessageId??''))}>WhatsApp source</Button>
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
          <SheetFooter className="flex-row justify-end"><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></SheetFooter>
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
