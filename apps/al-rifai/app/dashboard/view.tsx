'use client';
import {useMemo} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Banknote,ChartLine,ClipboardCheck,ClipboardList,Ship,Sparkles,Users,Wallet} from 'lucide-react';
import {
  EmptyState,ErrorState,KpiCard,KpiGrid,LoadingSkeleton,PageHeader,PageNotice,SectionCard,StatusPill,TableShell,
  fmtBDT,useApi,
} from '@/app/platform/ui';
import {opUrl,instructionBuckets,type OperationsSnapshot,ESCORT_SUMMARY_URL} from '@/app/platform/ops-client';
import type {EscortSummaryResponse} from '@/app/sources-review/view';

const RECENT_LIMIT=8;

const MODULE_CARDS=[
  {href:'/cash',title:'Cash',description:'Open Cash Portal and review authorized Cash activity.',icon:Wallet},
  {href:'/vessel-register',title:'Vessel Register',description:'Review vessel programs, assignments and audit history.',icon:Ship},
  {href:'/employees',title:'Employees',description:'Open employee records and payment statements.',icon:Users},
  {href:'/sources-review',title:'Review Queue',description:'Review Vessel and WhatsApp source items; decisions remain separately authorized.',icon:ClipboardCheck},
  {href:'/assistant',title:'Assistant',description:'Ask questions about verified records.',icon:Sparkles},
  {href:'/transactions',title:'Transactions',description:'View source-linked Cash instructions and payment evidence.',icon:Banknote},
  {href:'/cash/submissions',title:'Cash Submissions',description:'Submit and track your Cash items or open the reviewer queue.',icon:ClipboardList},
  {href:'/income-expenditure',title:'Income & Expenditure',description:'Explore financial analysis from verified data.',icon:ChartLine},
] as const;

export default function DashboardView(){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const escort=useApi<EscortSummaryResponse>(ESCORT_SUMMARY_URL);

  const rows=useMemo(()=>ops.data?.rows??[],[ops.data]);
  const buckets=useMemo(()=>instructionBuckets(rows),[rows]);
  const pending=useMemo(()=>rows.filter(r=>r.issues?.length),[rows]);
  const recent=useMemo(
    ()=>[...rows].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0,RECENT_LIMIT),
    [rows],
  );
  const s=escort.data?.summary;

  const financial=(
    <>
      <KpiCard label="Total Instructions" labelBn="মোট নির্দেশনা" tone="cash" value={ops.data?.summary.total} hint="Identity-verified instruction rows in the Current scope" href="/transactions"/>
      <KpiCard label="Instruction Total" labelBn="মোট" tone="cash" valueText={ops.data?fmtBDT(ops.data.summary.amountCents):undefined} hint="What the Owner instructed — not a confirmed receipt" href="/transactions"/>
      <KpiCard label="Pending Amount" labelBn="অপেক্ষমাণ" tone="risk" valueText={ops.data?fmtBDT(buckets.pendingCents):undefined} hint={`${pending.length} rows carry review notes`} href="/sources-review"/>
      <KpiCard label="Posted Amount" labelBn="পোস্ট করা" tone="ok" hint="Cash Ledger postings are held behind the Cash portal's super-admin scope." state="unavailable"/>
      <KpiCard label="Today's Instructions" labelBn="আজ" tone="cash" valueText={buckets.hasToday?fmtBDT(buckets.today):undefined} state={buckets.hasToday?'ok':'unavailable'} hint={buckets.hasToday?'Instruction amounts dated today (Dhaka)':'No instruction rows dated today'}/>
      <KpiCard label="This Month" labelBn="এই মাস" tone="cash" valueText={fmtBDT(buckets.month)} hint="Current Dhaka month, instruction amounts only" href="/insights"/>
    </>
  );

  const workforce=(
    <>
      <KpiCard label="Active Employees" labelBn="কর্মচারী" tone="workforce" value={ops.data?.summary.employees} hint="Distinct employee identities in paid instructions" href="/employees"/>
      <KpiCard label="Rows With Review Notes" labelBn="যাচাই" tone="risk" value={pending.length} hint="Parsing or identity notes held for review" href="/sources-review"/>
      <KpiCard label="Duplicate Alerts" labelBn="ডুপ্লিকেট" tone="risk" value={s?.duplicateReview} state={s?'ok':'unavailable'} hint="Vessel duplicate candidates in review" href="/sources-review"/>
      <KpiCard label="Review Queue" labelBn="পর্যালোচনা" tone="risk" value={s?.actionableReview} state={s?'ok':'unavailable'} hint="Actionable vessel review rows" href="/sources-review"/>
    </>
  );

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Operations workspace"
        title="Operations overview"
        description="Instruction, workforce and review activity across the Current dataset. Every figure is traceable to its source message; instruction amounts are not payments."
        meta={ops.data?<><StatusPill status="ACTIVE" label="Snapshot live"/><span className="text-xs text-muted-foreground">checked {ops.data.checkedAt.slice(0,16).replace('T',' ')}</span></>:null}
      />

      {ops.error&&<ErrorState message={`Cash snapshot could not be loaded: ${ops.error}`}/>}

      {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}

      <SectionCard title="Platform modules" description="Open the existing Cash, Vessel, workforce and review workflows.">
        <div className="wx-module-grid">
          {MODULE_CARDS.map(({href,title,description,icon:Icon})=>(
            <Link key={href} href={href} className="wx-module-card">
              <span className="wx-module-card-heading">
                <span className="wx-module-card-icon"><Icon className="size-5" aria-hidden="true"/></span>
                <ArrowUpRight className="wx-module-card-arrow size-4" aria-hidden="true"/>
              </span>
              <span className="wx-module-card-title">{title}</span>
              <span className="wx-module-card-description">{description}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Financial overview" description="Instruction amounts describe what was requested. They are never shown as completed payments.">
        {ops.loading&&!ops.data?<LoadingSkeleton rows={2}/>:<KpiGrid>{financial}</KpiGrid>}
      </SectionCard>

      <SectionCard
        title="Recent instructions"
        description="Newest source-linked instructions in the Current scope."
        actions={<Link className="text-sm underline-offset-2 hover:underline" href="/transactions">Open transactions <ArrowRight className="inline size-3"/></Link>}
        flush
      >
        {ops.loading&&!ops.data&&<LoadingSkeleton rows={4}/>}
        {ops.data&&recent.length===0&&<EmptyState title="No instructions yet" description="The verified snapshot contains no instruction rows for the current scope."/>}
        {recent.length>0&&(
          <TableShell label="Recent cash instructions">
            <table className="wx-table stackable">
              <thead>
                <tr><th>Date</th><th>Employee</th><th>Method</th><th className="num">Amount</th><th>Status</th><th/></tr>
              </thead>
              <tbody>
                {recent.map(row=>(
                  <tr key={row.id}>
                    <td data-label="Date"><span className="strong">{row.date}</span><span className="muted" style={{display:'block'}}>{row.time}</span></td>
                    <td data-label="Employee"><span className="strong">{row.name||'Name unknown'}</span><span className="muted" style={{display:'block'}}>{row.employeePhone||'No employee ID'}</span></td>
                    <td data-label="Method">{row.method||'—'}</td>
                    <td data-label="Amount" className="num strong">{fmtBDT(row.amountCents)}</td>
                    <td data-label="Status"><StatusPill status={row.status||'INSTRUCTION'} label={row.status||'Instruction'}/></td>
                    <td data-label="Source"><Link className="text-xs underline-offset-2 hover:underline" href="/transactions">Details</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        {ops.data&&rows.length>0&&(
          <div className="px-4 pb-3 text-xs text-muted-foreground">
            Showing the newest {Math.min(RECENT_LIMIT,rows.length)} of {rows.length.toLocaleString()} instructions.
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Workforce & review" description="Identity and review load across the same scope.">
          <KpiGrid>{workforce}</KpiGrid>
        </SectionCard>
        <SectionCard title="How amounts are defined" description="The three figures are deliberately kept separate.">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold">Instruction amount</dt>
              <dd className="text-muted-foreground">What the Owner instructed for an employee. Recorded once, with its original message.</dd>
            </div>
            <div>
              <dt className="font-semibold">Verified amount</dt>
              <dd className="text-muted-foreground">Requires independent payment evidence. Not available from the current read APIs.</dd>
            </div>
            <div>
              <dt className="font-semibold">Posted amount</dt>
              <dd className="text-muted-foreground">A Cash Ledger posting after separate approval. The Cash Freeze keeps this at zero for the Current scope.</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="wx-pill" data-tone="warn" href="/sources-review"><ClipboardList className="size-3"/>Review queue</Link>
            <Link className="wx-pill" data-tone="neutral" href="/insights">Operational insights</Link>
          </div>
        </SectionCard>
      </div>

      {escort.error&&<ErrorState message={`Vessel summary unavailable: ${escort.error}`}/>}
    </div>
  );
}
