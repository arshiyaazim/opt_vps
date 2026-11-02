'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  EmptyState,ErrorState,LoadingSkeleton,PageHeader,PageNotice,SectionCard,StatusPill,TableShell,useApi,fmtBDT,fmtInt,
} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';
import {methodAbbreviation,normalizeEmployeePhone,sourceAbbreviation} from '@/lib/transaction-format';
import {csv,saveCsv} from '@/lib/register';

const PAGE_SIZE=20;

/**
 * Employee-scoped slice of the Cash instruction ledger.
 *
 * Same API and same rows as /transactions (`?view=cash&export=1`), filtered by
 * the phone in the URL. Filtering client-side is deliberate: the full dataset is
 * already required by /transactions for its per-employee totals, so a second
 * endpoint would return a strict subset of data the client already has.
 */
export default function EmployeeTransactionsView({phone}:{phone:string}){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const rows=useMemo(()=>ops.data?.rows??[],[ops.data?.rows]);

  const key=normalizeEmployeePhone(phone);

  // Date descending, then time, then id, so equal dates keep a stable order the
  // way the legacy payroll page ordered (txn_date DESC, id DESC).
  const mine=useMemo(()=>rows
    .filter(r=>normalizeEmployeePhone(r.employeePhone)===key)
    .sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||b.id.localeCompare(a.id)),
  [rows,key]);

  const [page,setPage]=useState(1);

  const totalCents=useMemo(()=>mine.reduce((n,r)=>n+r.amountCents,0),[mine]);
  const pages=Math.max(1,Math.ceil(mine.length/PAGE_SIZE));
  // Clamp rather than reset in an effect: the route can be reused for another
  // employee, and a stale page number must never blank the table.
  const current=Math.min(page,pages);
  const first=(current-1)*PAGE_SIZE;
  const visible=useMemo(()=>mine.slice(first,first+PAGE_SIZE),[mine,first]);

  const name=useMemo(()=>mine.find(r=>r.name)?.name??'',[mine]);
  const employeePhone=useMemo(()=>mine.find(r=>r.employeePhone)?.employeePhone??phone,[mine,phone]);

  const exportCsv=()=>{
    const contents=csv(
      ['ID','Date','Time','Employee','Employee ID','Payout','Method','Amount','Source','Status','Purpose','Issues'],
      mine.map(r=>[r.id,r.date,r.time,r.name,r.employeePhone,r.payoutPhone,r.method,(r.amountCents/100).toFixed(2),r.source,r.status??'',r.purpose,r.issues?.join('; ')??'']));
    saveCsv(contents,`al-rifai-transactions-${key||'employee'}.csv`);
  };

  const back=<Button asChild size="sm" variant="outline"><Link href="/transactions">Back to transactions</Link></Button>;

  return (
    <div className="wx-page b2-print-root">
      {/* Print hides the application shell and this page's controls; the header
          summary and the table remain. Kept inline so the route needs no shared
          stylesheet change. */}
      <style>{`@media print{.wx-shell>aside,.wx-shell header,.b2-no-print{display:none!important}.wx-shell,.wx-page{display:block!important}.wx-table{font-size:11px}.wx-table th,.wx-table td{padding:4px 6px}}`}</style>

      <PageHeader
        eyebrow="Accounts"
        title={name||'Employee transactions'}
        description="Every Cash instruction recorded for this employee in the Current scope. Amounts are Admin instruction amounts — never confirmed payments or posted ledger entries."
        actions={<span className="b2-no-print flex flex-wrap items-center gap-1">{back}<Button size="sm" variant="outline" onClick={()=>window.print()} disabled={!mine.length}>Print</Button><Button size="sm" variant="outline" onClick={exportCsv} disabled={!mine.length}>Export CSV</Button></span>}
        meta={ops.data?<><StatusPill status="ACTIVE" label="Current scope"/><span className="text-xs text-muted-foreground">{fmtInt.format(mine.length)} transactions</span></>:null}
      />

      {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}
      {ops.error&&<ErrorState message={`Transactions could not be loaded: ${ops.error}`}/>}

      {ops.loading&&!ops.data&&<LoadingSkeleton rows={6}/>}

      {ops.data&&mine.length===0&&(
        <SectionCard title="No transactions found" flush>
          <EmptyState
            title="This employee has no Cash instructions"
            description={`No row in the Current scope matches employee ID ${employeePhone}. The number may be mistyped, or the employee may only appear in the Archive scope.`}
          />
          <div className="flex justify-center px-4 pb-4">
            <Button asChild size="sm" variant="outline"><Link href="/transactions">Back to transactions</Link></Button>
          </div>
        </SectionCard>
      )}

      {mine.length>0&&(
        <SectionCard
          title="Transaction history"
          description={`Employee ID ${employeePhone} · newest first · ${fmtInt.format(PAGE_SIZE)} rows per page`}
          actions={<span className="text-xs text-muted-foreground">{fmtInt.format(mine.length)} rows</span>}
          flush
        >
          <div className="grid gap-3 border-b px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
              <p className="strong truncate">{name||'(name pending)'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Employee ID</p>
              <p className="tabular-nums">{employeePhone||'—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total instructed</p>
              <p className="text-base font-semibold tabular-nums">{fmtBDT(totalCents)}</p>
              <p className="text-xs text-muted-foreground">{fmtInt.format(mine.length)} transactions</p>
            </div>
          </div>

          <TableShell label={`Transaction history for ${name||employeePhone}`}>
            <table className="wx-table stackable">
              <thead>
                <tr><th>Date</th><th>Employee</th><th style={{width:'40px'}}>Method</th><th className="num">Amount</th><th style={{width:'50px'}}>Source</th><th>Status</th></tr>
              </thead>
              <tbody>
                {visible.map(r=>(
                  <tr key={r.id}>
                    <td data-label="Date"><span className="strong">{r.date}</span><span className="muted" style={{display:'block'}}>{r.time}</span></td>
                    <td data-label="Employee">
                      <span className="strong">{r.name||'(name pending)'}</span>
                      <span className="muted" style={{display:'block'}}>{r.employeePhone||'No employee ID'} · payout {r.payoutPhone||'not provided'}</span>
                    </td>
                    <td data-label="Method" style={{width:'40px'}} title={r.method||undefined}><span className="strong">{methodAbbreviation(r.method)}</span></td>
                    <td data-label="Amount" className="num strong">{fmtBDT(r.amountCents)}</td>
                    <td data-label="Source" style={{width:'50px'}} title={r.source||undefined}><span className="muted">{sourceAbbreviation(r.source)}</span></td>
                    <td data-label="Status">
                      {r.issues?.length?<StatusPill status="REVIEW" label="Review"/>:<StatusPill status={r.identityVerified===true?'CONFIRMED':'UNVERIFIED'} label={r.identityVerified===true?'Identity verified':'Unverified'}/>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          {pages>1&&(
            <div className="b2-no-print flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <Button size="sm" variant="outline" onClick={()=>setPage(Math.max(1,current-1))} disabled={current<=1}>Previous</Button>
              <span className="text-xs text-muted-foreground">
                Page {current} of {pages} · showing {fmtInt.format(first+1)}–{fmtInt.format(Math.min(first+PAGE_SIZE,mine.length))} of {fmtInt.format(mine.length)}
              </span>
              <Button size="sm" variant="outline" onClick={()=>setPage(Math.min(pages,current+1))} disabled={current>=pages}>Next</Button>
            </div>
          )}

          <div className="px-4 pb-3 text-xs text-muted-foreground">
            Instruction amounts are not postings. Editing and approval stay in the Owner-authorized Cash portal.
          </div>
        </SectionCard>
      )}
    </div>
  );
}
