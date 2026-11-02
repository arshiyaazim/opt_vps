'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  EmptyState,ErrorState,LoadingSkeleton,PageHeader,SectionCard,StatusPill,TableShell,useApi,fmtInt,
} from '@/app/platform/ui';
import {PayValue} from '@/app/platform/pay-value';
import {payCells,payAmount,shiftStamp} from '@/lib/vessel-pay';
import {DataToolbar,applyFilters,sortRows,defaultFilters,type ToolbarFilters,type FacetDef,type SortDef} from '@/app/platform/data-toolbar';
import {csv,saveCsv} from '@/lib/register';

const PAGE_SIZE=20;

type Program={
  id:string;motherVessel:string;lighterVessel:string;escortName?:string;escortMobile?:string;
  destination?:string;startDate?:string;endDate?:string;shift?:string;endShift?:string|null;status?:string;
  payState?:'CALCULATED'|'UNRESOLVED'|null;payReason?:string|null;halfDayUnits?:number|null;
  salaryMinor?:string|null;conveyanceMinor?:string|null;totalMinor?:string|null;
};
type Payload={rows:Program[];total:number};

/**
 * One escort's vessel program history.
 *
 * All money arrives from program_pay as integer minor units (paisa) and is
 * rendered in Taka by lib/vessel-pay — never as a raw minor-unit number.
 */
export default function EmployeeProgramsView({phone}:{phone:string}){
  const api=useApi<Payload>(`/api/register?export=1&employee=${encodeURIComponent(phone)}`);
  const rows=useMemo(()=>api.data?.rows??[],[api.data?.rows]);
  const [page,setPage]=useState(1);

  const [filters,setFilters]=useState<ToolbarFilters>(defaultFilters('start_desc'));
  const decorated=useMemo(()=>rows.map(r=>({...r,statusLabel:r.status||'Recorded'})),[rows]);
  const filtered=useMemo(()=>applyFilters(decorated,filters,
    {searchFields:['motherVessel','lighterVessel','escortName','escortMobile','masterMobile','destination'],dateField:'startDate'},
  ),[decorated,filters]);
  const sorted=useMemo(()=>sortRows(filtered,filters.sort),[filtered,filters.sort]);
  const statusOptions=useMemo(()=>[...new Set(decorated.map(r=>String(r.statusLabel)))].sort(),[decorated]);
  const facets=useMemo<FacetDef[]>(()=>[{key:'statusLabel',label:'Status',values:statusOptions}],[statusOptions]);
  const sorts=useMemo<SortDef[]>(()=>[
    {key:'start_desc',label:'Start date (newest first)'},
    {key:'start_asc',label:'Start date (oldest first)'},
    {key:'mother_asc',label:'Mother vessel A-Z'},
    {key:'escort_asc',label:'Escort name A-Z'},
    {key:'total_desc',label:'Total pay (highest first)'},
  ],[]);

  const totals=useMemo(()=>{
    let units=0,salary=0,conveyance=0,total=0;
    for(const r of sorted){
      units+=Number(r.halfDayUnits??0);
      salary+=Number(r.salaryMinor??0);
      conveyance+=Number(r.conveyanceMinor??0);
      total+=Number(r.totalMinor??0);
    }
    return {units,salary,conveyance,total};
  },[sorted]);

  const pages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
  const current=Math.min(page,pages);
  const first=(current-1)*PAGE_SIZE;
  const visible=sorted.slice(first,first+PAGE_SIZE);

  const escortName=sorted.find(r=>r.escortName)?.escortName??'';
  const escortMobile=sorted.find(r=>r.escortMobile)?.escortMobile??phone;

  const exportCsv=()=>{
    const content=csv(
      ['Mother vessel','Lighter vessel','Escort','Escort mobile','Destination','Start','End','Days','Salary (BDT)','Conveyance (BDT)','Total (BDT)','Status'],
      sorted.map(r=>{
        const c=payCells(r);
        const plain=(minor:string|null|undefined)=>minor==null||minor===''?'':(Number(minor)/100).toFixed(2);
        return [r.motherVessel,r.lighterVessel,r.escortName??'',r.escortMobile??'',r.destination??'',
          shiftStamp(r.startDate,r.shift),shiftStamp(r.endDate,r.endShift),c.days.value,
          plain(r.salaryMinor),plain(r.conveyanceMinor),plain(r.totalMinor),r.status??''];
      }));
    saveCsv(content,`al-rifai-programs-${escortMobile.replace(/[^0-9]/g,'')}.csv`);
  };

  return (
    <div className="wx-page">
      <style>{`@media print{.wx-shell>aside,.wx-shell header,.no-print{display:none!important}.wx-shell,.wx-page{display:block!important}.wx-table{font-size:11px}.wx-table th,.wx-table td{padding:4px 6px}}`}</style>

      <PageHeader
        eyebrow="Vessel"
        title={escortName||'Employee programs'}
        description="Every vessel program recorded for this escort in the Current scope. Amounts are derived from the Owner rate schedule — never a posting or a payment."
        actions={<span className="no-print flex flex-wrap items-center gap-1">
          <Button asChild size="sm" variant="outline"><Link href="/vessel-register">Back to register</Link></Button>
          <Button size="sm" variant="outline" onClick={()=>window.print()} disabled={!sorted.length}>Print</Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sorted.length}>Export CSV</Button>
        </span>}
        meta={api.data?<><StatusPill status="ACTIVE" label="Current scope"/><span className="text-xs text-muted-foreground">{fmtInt.format(sorted.length)} programs</span></>:null}
      />

      {api.error&&<ErrorState message={`Programs could not be loaded: ${api.error}`}/>}
      {api.loading&&!api.data&&<LoadingSkeleton rows={6}/>}

      {api.data&&!sorted.length&&(
        <SectionCard title="No programs found" flush>
          <EmptyState
            title="This employee has no vessel programs"
            description={`No row in the Current scope matches escort mobile ${escortMobile}. The number may be mistyped, or the escort may only appear in the Archive scope.`}
          />
          <div className="flex justify-center px-4 pb-4">
            <Button asChild size="sm" variant="outline"><Link href="/vessel-register">Back to register</Link></Button>
          </div>
        </SectionCard>
      )}

      {sorted.length>0&&(
        <SectionCard
          title="Program history"
          description={`Escort mobile ${escortMobile} · newest first · ${PAGE_SIZE} rows per page`}
          actions={<span className="text-xs text-muted-foreground">{fmtInt.format(sorted.length)} rows</span>}
          flush
        >
          <DataToolbar
            filters={filters}
            onChange={setFilters}
            facets={facets}
            sorts={sorts}
            urlKeys
            resultLabel={`Showing ${sorted.length} of ${rows.length} programs`}
          />
          <div className="grid gap-3 border-b px-4 py-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escort</p>
              <p className="truncate font-medium">{escortName||'(name pending)'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Programs · days</p>
              <p className="tabular-nums">{fmtInt.format(sorted.length)} · {payCells({halfDayUnits:totals.units}).days.value}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Salary + conveyance</p>
              <p className="tabular-nums">{payAmount(String(totals.salary))} + {payAmount(String(totals.conveyance))}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-base font-semibold tabular-nums">{payAmount(String(totals.total))}</p>
            </div>
          </div>

          <TableShell label={`Vessel programs for ${escortName||escortMobile}`}>
            <table className="wx-table stackable">
              <thead>
                <tr>
                  <th>Mother vessel</th><th>Lighter</th><th>Escort</th>
                  <th>Start</th><th>End</th>
                  <th className="num">Days</th><th className="num">Salary</th>
                  <th className="num">Conv.</th><th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r=>{
                  const c=payCells(r);
                  return <tr key={r.id}>
                    <td data-label="Mother vessel"><span className="strong">{r.motherVessel||'—'}</span><span className="muted" style={{display:'block'}}>{r.destination||'No destination'}</span></td>
                    <td data-label="Lighter">{r.lighterVessel||'—'}</td>
                    <td data-label="Escort"><span className="strong">{r.escortName||'—'}</span><span className="muted" style={{display:'block'}}>{r.escortMobile||'—'}</span></td>
                    <td data-label="Start"><span className="strong">{shiftStamp(r.startDate,r.shift)}</span></td>
                    <td data-label="End"><span className="strong">{shiftStamp(r.endDate,r.endShift)}</span></td>
                    <td data-label="Days" className="num"><PayValue cell={c.days}/></td>
                    <td data-label="Salary" className="num"><PayValue cell={c.salary}/></td>
                    <td data-label="Conv." className="num"><PayValue cell={c.conveyance}/></td>
                    <td data-label="Total" className="num"><PayValue cell={c.total}/></td>
                    <td data-label="Status"><StatusPill status={(r.status||'RECORDED').toUpperCase()} label={r.status||'Recorded'}/></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </TableShell>

          {pages>1&&(
            <div className="no-print flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <Button size="sm" variant="outline" onClick={()=>setPage(Math.max(1,current-1))} disabled={current<=1}>Previous</Button>
              <span className="text-xs text-muted-foreground">
                Page {current} of {pages} · showing {fmtInt.format(first+1)}–{fmtInt.format(Math.min(first+PAGE_SIZE,sorted.length))} of {fmtInt.format(sorted.length)}
              </span>
              <Button size="sm" variant="outline" onClick={()=>setPage(Math.min(pages,current+1))} disabled={current>=pages}>Next</Button>
            </div>
          )}

          <div className="px-4 pb-3 text-xs text-muted-foreground">
            Derived from the Owner rate schedule · not a posting or a payment.
          </div>
        </SectionCard>
      )}
    </div>
  );
}
