'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Bar,BarChart,Cell,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {ChartContainer,ChartLegend,ChartLegendContent,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {KpiCard,KpiGrid,LoadingLines,PageNotice,Unavailable,fmtBDT,useApi} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';
import type {CashRow} from '@/lib/operations';

const LINE_COLORS=['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)'];

export default function IncomeExpenditureView(){
  const ops=useApi<OperationsSnapshot>(opUrl('cash'));
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  const rows=useMemo(()=>((ops.data?.rows??[]) as CashRow[]).filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)),[ops.data?.rows,from,to]);

  const monthly=useMemo(()=>{
    const m=new Map<string,{month:string;income:number;expense:number}>();
    for(const r of rows){const k=r.date.slice(0,7);const s=m.get(k)??{month:k,income:0,expense:0};s.expense+=r.amountCents;m.set(k,s);}
    return [...m.values()].sort((a,b)=>a.month.localeCompare(b.month));
  },[rows]);
  const byMethod=useMemo(()=>{
    const m=new Map<string,{name:string;value:number;amountCents:number}>();
    for(const r of rows){const k=r.method||'unknown';const s=m.get(k)??{name:k,value:0,amountCents:0};s.value++;s.amountCents+=r.amountCents;m.set(k,s);}
    return [...m.values()].sort((a,b)=>b.amountCents-a.amountCents);
  },[rows]);
  const totalExpense=rows.reduce((n,r)=>n+r.amountCents,0);

  return <div className="wx-page">
    {ops.data&&<PageNotice notice={ops.data.notice} sourceLabel={ops.data.sourceLabel} checkedAt={ops.data.checkedAt}/>}
    <Unavailable title="Income and expense limits" reason="Verified data covers outgoing Cash payment instructions to employees only — no verified income dataset or confirmed expense receipts exist yet. All figures below are instruction amounts, not posted ledger values."/>

    <div className="flex items-end gap-2 rounded-md border p-2">
      <div className="grid gap-1"><Label htmlFor="ie-from">From</Label><Input id="ie-from" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
      <div className="grid gap-1"><Label htmlFor="ie-to">To</Label><Input id="ie-to" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
      <p className="text-xs text-muted-foreground">Drill-down opens the filtered Transactions screen.</p>
    </div>

    <KpiGrid>
      <KpiCard label="Total Income" tone="cash" hint="No verified income records exist in any read API." state="unavailable"/>
      <KpiCard label="Total Expenses (instructions)" tone="cash" valueText={fmtBDT(totalExpense)} hint="Instruction totals — not confirmed or posted spend" state={ops.data?'ok':'unavailable'}/>
      <KpiCard label="Net Position" tone="cash" hint="Cannot be computed without verified income; neither column is a posted ledger." state="unavailable"/>
      <KpiCard label="Expense categories" hint="Salary/Fuel/Maintenance/Food/Port/Other classification is not recorded in verified rows yet — expenses by payment method are shown instead." state="unavailable"/>
      <KpiCard label="Expenses by vessel" hint="Cash instruction rows carry no vessel reference; a joined employee–assignment dataset is a backend gap." state="unavailable"/>
      <KpiCard label="Posting status" hint="The Cash Ledger has zero postings — nothing here is a posted transaction." state="unavailable"/>
    </KpiGrid>

    {ops.loading&&<LoadingLines/>}
    {ops.data&&<div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly expenditures</CardTitle><CardDescription>Instruction amounts by month</CardDescription></CardHeader>
        <CardContent>
          {monthly.length?(
            <ChartContainer config={{expense:{label:'Expense (BDT)',color:'var(--chart-1)'},income:{label:'Income (unavailable)',color:'var(--chart-3)'}}} className="h-64 w-full">
              <BarChart data={monthly} margin={{left:8,right:8}}>
                <XAxis dataKey="month" tickLine={false} axisLine={false}/>
                <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v:number)=>String(Math.round(v/100))}/>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <ChartLegend content={<ChartLegendContent/>}/>
                <Bar dataKey="expense" fill="var(--color-expense)"/>
              </BarChart>
            </ChartContainer>
          ):<Unavailable reason="No rows in the selected range."/>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Expenses by payment method</CardTitle><CardDescription>Method distribution of instruction amounts</CardDescription></CardHeader>
        <CardContent className="flex justify-center">
          {byMethod.length?(
            <ChartContainer config={{amountCents:{label:'Amount (BDT)'}}} className="h-64 w-full max-w-sm">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <ChartLegend content={<ChartLegendContent nameKey="name"/>}/>
                <Pie data={byMethod} dataKey="amountCents" nameKey="name" innerRadius={55} outerRadius={90}>
                  {byMethod.map((d,i)=><Cell key={d.name} fill={LINE_COLORS[i%LINE_COLORS.length]}/>)}
                </Pie>
              </PieChart>
            </ChartContainer>
          ):<Unavailable reason="No rows in range."/>}
        </CardContent>
      </Card>
    </div>}
    <p className="text-xs"><Link href="/transactions" className="underline-offset-2 hover:underline">Open Transactions drill-down ↗</Link></p>
  </div>;
}
