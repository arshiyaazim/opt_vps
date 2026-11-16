'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Line,LineChart,Bar,BarChart,Pie,PieChart,Cell,XAxis,YAxis} from 'recharts';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {ChartContainer,ChartLegend,ChartLegendContent,ChartTooltip,ChartTooltipContent,type ChartConfig} from '@/components/ui/chart';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {fmtBDT,KpiCard,KpiGrid,LoadingLines,PageNotice,Unavailable,useApi,bdt} from '@/app/platform/ui';
import {vesselReport,reportCsv} from '@/lib/vessel-reports';
import {saveCsv} from '@/lib/register';
import {opUrl,rangeCutoff,type OperationsSnapshot,ESCORT_SUMMARY_URL,monthlyTotals} from '@/app/platform/ops-client';
import type {EscortSummaryResponse} from '@/app/sources-review/view';

const paymentConfig={
  amount:{label:'Instruction amount (BDT)',color:'var(--chart-1)'},
  count:{label:'Instructions',color:'var(--chart-2)'},
} satisfies ChartConfig;
const statusConfig={
  draft:{label:'Draft',color:'var(--chart-3)'},
  confirmed:{label:'Confirmed',color:'var(--chart-1)'},
  review:{label:'Review',color:'var(--chart-4)'},
} satisfies ChartConfig;
const monthConfig={
  amountCents:{label:'Amount (BDT)',color:'var(--chart-1)'},
} satisfies ChartConfig;

export default function InsightsView(){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const escort=useApi<EscortSummaryResponse>(ESCORT_SUMMARY_URL);
  const register=useApi<{rows:Array<{id:string;motherVessel:string;lighterVessel:string;escortName?:string|null;startDate:string;status?:string|null}>} >('/api/register?export=1');
  const [range,setRange]=useState('90');
  const [from,setFrom]=useState(''),[to,setTo]=useState('');

  const rows=useMemo(()=>{
    let r=ops.data?.rows??[];
    const cutoff=rangeCutoff(range);
    if(from)r=r.filter(x=>x.date>=from);
    if(to)r=r.filter(x=>x.date<=to);
    else if(cutoff)r=r.filter(x=>x.date>=cutoff);
    return r;
  },[ops.data,from,to,range]);

  const daily=useMemo(()=>{
    const m=new Map<string,{date:string;amountCents:number;count:number}>();
    for(const r of rows){const d=m.get(r.date)??{date:r.date,amountCents:0,count:0};d.amountCents+=r.amountCents;d.count++;m.set(r.date,d);}
    return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));
  },[rows]);
  const months=useMemo(()=>monthlyTotals(rows),[rows]);
  const s=escort.data?.summary;
  const statusData=s?[{name:'draft',value:s.draft,fill:'var(--color-draft)'},{name:'confirmed',value:s.confirmed,fill:'var(--color-confirmed)'},{name:'review',value:s.review,fill:'var(--color-review)'}]:[];

  return <div className="wx-page">
    {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}

    <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="grid gap-1"><Label htmlFor="i-range">Range</Label>
        <Select value={range} onValueChange={setRange}><SelectTrigger id="i-range" className="w-40"><SelectValue/></SelectTrigger>
          <SelectContent>{[['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['all','All available data']].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-1"><Label htmlFor="i-from">From</Label><Input id="i-from" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
      <div className="grid gap-1"><Label htmlFor="i-to">To</Label><Input id="i-to" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
      <p className="text-xs text-muted-foreground">Charts aggregate Cash instruction rows (Current scope). See source note above for limits.</p>
    </div>

    <KpiGrid>
      <KpiCard label="Instruction rows" tone="cash" value={rows.length} hint="Filtered instruction rows"/>
      <KpiCard label="Instruction total" tone="cash" valueText={fmtBDT(rows.reduce((n,r)=>n+r.amountCents,0))}/>
      <KpiCard label="Employees paid" tone="workforce" value={new Set(rows.filter(r=>r.employeePhone).map(r=>r.employeePhone)).size}/>
      <KpiCard label="Pending (review)" tone="risk" value={rows.filter(r=>r.issues?.length).length}/>
      <KpiCard label="Total vessels (register)" tone="default" value={s?undefined:undefined} hint="Register rows: see Vessel Register" state="unavailable"/>
      <KpiCard label="Active vessels" hint="Active/idle vessel status cannot be reliably derived from verified data; register status counts are shown below instead." state="unavailable"/>
      <KpiCard label="Confirmed programs" tone="workforce" value={s?.confirmed}/>
      <KpiCard label="Pending assignments (review)" tone="risk" value={s?.actionableReview} href="/sources-review"/>
    </KpiGrid>
    {escort.error&&<Unavailable compact reason={`Vessel summary unavailable: ${escort.error}`}/>}

    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm">Payment trend (daily instruction amounts)</CardTitle><CardDescription>Instruction amounts, not verified receipts</CardDescription></CardHeader>
        <CardContent>
          {ops.loading?<LoadingLines/>:daily.length?
            <ChartContainer config={paymentConfig} className="h-64 w-full">
              <LineChart data={daily} margin={{left:8,right:8}}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40}/>
                <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v:number)=>String(Math.round(v/100))}/>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <ChartLegend content={<ChartLegendContent/>}/>
                <Line dataKey="amountCents" stroke="var(--color-amount)" strokeWidth={2} dot={false} name="amount"/>
                <Line dataKey="count" stroke="var(--color-count)" strokeWidth={1.5} dot={false} name="count"/>
              </LineChart>
            </ChartContainer>
            :<Unavailable reason="No dated instruction rows in the selected range."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Register status distribution</CardTitle><CardDescription>Vessel register rows (statuses, not active/idle states)</CardDescription></CardHeader>
        <CardContent className="flex justify-center">
          {escort.loading?<LoadingLines/>:statusData.length?
            <ChartContainer config={statusConfig} className="h-64 w-full max-w-sm">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <ChartLegend content={<ChartLegendContent/>}/>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {statusData.map((d)=><Cell key={d.name} fill={d.fill}/>)}
                </Pie>
              </PieChart>
            </ChartContainer>
            :<Unavailable reason="Escort register summary unavailable."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Employee growth</CardTitle><CardDescription>Monthly new-employee counts require joining dates not present in verified data.</CardDescription></CardHeader>
        <CardContent><Unavailable title="Employee trend & growth" reason="No verified employee joining-date dataset exists yet (employee_master carries no joining history in reads). Charts will appear once the HR backend is approved."/></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly instruction totals</CardTitle><CardDescription>Aggregated payment instruction amounts by month</CardDescription></CardHeader>
        <CardContent>
          {ops.loading?<LoadingLines/>:months.length?
            <ChartContainer config={monthConfig} className="h-64 w-full">
              <BarChart data={months} margin={{left:8,right:8}}>
                <XAxis dataKey="month" tickLine={false} axisLine={false}/>
                <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v:number)=>String(Math.round(v/100))}/>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <Bar dataKey="amountCents" fill="var(--color-amountCents)"/>
              </BarChart>
            </ChartContainer>
            :<Unavailable reason="No rows in range."/>}
        </CardContent>
      </Card>
    </div>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Vessel report by mother vessel</CardTitle>
        <CardDescription>Read-only aggregate of the verified register. Salary/transport columns stay empty until release data is recorded.</CardDescription>
      </CardHeader>
      <CardContent>
        {register.loading?<LoadingLines/>:register.error?<Unavailable reason={register.error}/>:(()=>{
          const report=vesselReport(register.data?.rows??[],{groupBy:'mother',from:from||undefined,to:to||undefined});
          return <div className="flex flex-col gap-2">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Mother vessel</th><th>Programs</th><th>Escorts</th><th>Duration</th><th>Pay</th></tr></thead><tbody>
              {report.rows.slice(0,10).map(row=><tr key={row.key} className="border-b last:border-0"><td className="py-1">{row.key}</td><td>{row.programs}</td><td>{row.escorts}</td><td>{row.durationDays===null?'Not recorded':row.durationDays}</td><td>{row.totalMinor===null?'Not recorded':bdt.format(row.totalMinor/100)}</td></tr>)}
              {!report.rows.length&&<tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">No programs in range.</td></tr>}
            </tbody></table></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{report.totals.programs} programs · {report.rows.length} mother vessels</span>
              <button type="button" className="underline underline-offset-2" onClick={()=>saveCsv(reportCsv(report.rows),'al-rifai-vessel-report.csv')}>Export CSV</button>
            </div>
          </div>;
        })()}
      </CardContent>
    </Card>
    <p className="text-[11px] text-muted-foreground">Drill-down: <Link href="/transactions" className="underline-offset-2 hover:underline">Transactions</Link> · <Link href="/sources-review" className="underline-offset-2 hover:underline">Sources &amp; Review</Link></p>
  </div>;
}
