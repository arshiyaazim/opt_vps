import type {CashRow} from '@/lib/operations';

export interface OperationsSnapshot{
  view:string;
  rows:CashRow[];
  summary:{total:number;amountCents:number;employees:number;missingIdentity:number;needsReview:number};
  daily:{date:string;count:number;amountCents:number}[];
  total:number;
  page:number;
  pages:number;
  filters:unknown;
  checkedAt:string;
  notice:string;
  sourceLabel:string;
  canWrite:boolean;
}

/** All-rows read for client-side aggregation (read-only, canonical scope). */
export const opUrl=(view='cash',scope:'current'|'archive'='current')=>
  `/api/operations?view=${view}${scope==='archive'?'&scope=archive':''}&export=1`;

export const ESCORT_SUMMARY_URL='/api/escort-register?summary=1';

/** Pure client-side date bucketing in Bangladesh calendar days. */
export function instructionBuckets(rows:CashRow[]){
  const today=dhakaToday();
  const weekAgo=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  const month=today.slice(0,7);
  let todayCents=0,weekCents=0,monthCents=0,hasToday=false,todayCount=0,pendingCents=0;
  for(const r of rows){
    if(r.date===today){todayCents+=r.amountCents;hasToday=true;todayCount++;}
    if(r.date>=weekAgo&&r.date<=today)weekCents+=r.amountCents;
    if(r.date.startsWith(month)&&r.date<=today)monthCents+=r.amountCents;
    if(r.issues?.length)pendingCents+=r.amountCents;
  }
  return {today:todayCents,week:weekCents,month:monthCents,hasToday,todayCount,pendingCents};
}

export function rangeCutoff(range:string):string|null{
  if(range==='all')return null;
  const days=Number(range);
  if(!Number.isFinite(days)||days<=0)return null;
  return new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
}

export function dhakaToday():string{
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date());
}

export function monthlyTotals(rows:CashRow[]){
  const months=new Map<string,{month:string;instructions:number;amountCents:number}>();
  for(const r of rows){
    const m=r.date.slice(0,7);
    const s=months.get(m)??{month:m,instructions:0,amountCents:0};
    s.instructions++;s.amountCents+=r.amountCents;months.set(m,s);
  }
  return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month));
}
