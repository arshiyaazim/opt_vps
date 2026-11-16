'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ExternalLink,RefreshCw,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Unavailable} from '@/app/platform/ui';

type RegisterAnswer={answer:string;refs:{kind?:string;id:string;label:string}[];mode:string;scope:string;checkedAt:string;warnings:string[]};
type Turn={question:string;answer?:RegisterAnswer;error?:string};

const SUGGESTIONS=[
  'Show all payments in September',
  'Summary of current accounts',
  'Which rows are in review?',
  'Why is a transaction pending review?',
  'Show duplicates for vessels',
];

export default function AssistantView(){
  const [scope,setScope]=useState('register');
  const [question,setQuestion]=useState('');
  const [turns,setTurns]=useState<Turn[]>([]);
  const [asking,setAsking]=useState(false);
  const scroller=useRef<HTMLDivElement>(null);
  const generation=useRef(0);

  useEffect(()=>{if(scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;},[turns,asking]);

  const ask=async(text:string)=>{
    if(!text.trim()||asking)return;
    const token=++generation.current;
    setQuestion('');setAsking(true);setTurns(t=>[...t,{question:text}]);
    try{
      const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:text,source:scope==='accounts'?'historical':'historical',context:scope})});
      const v=await r.json() as RegisterAnswer&{error?:string};
      if(!r.ok)throw new Error(v.error||'The assistant is unavailable.');
      if(token===generation.current)setTurns(t=>t.map((x,i)=>i===t.length-1?{...x,answer:v}:x));
    }catch(e){
      if(token===generation.current)setTurns(t=>t.map((x,i)=>i===t.length-1?{...x,error:e instanceof Error?e.message:'Question failed.'}:x));
    }finally{
      if(token===generation.current)setAsking(false);
    }
  };

  const submit =(e:React.KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void ask(question);}};

  return <div className="flex flex-col gap-3">
    <Unavailable compact reason="The Assistant reads authorized application data through the existing read-only register/accounts interfaces and applies the same private authentication. It cannot modify financial records — no write path exists from here into the Cash Ledger."/>
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">Data scope:
          <select value={scope} onChange={e=>{setScope(e.target.value);setTurns([]);}} className="rounded border bg-background px-1 py-0.5" aria-label="Assistant data scope">
            <option value="register">Vessel register</option>
            <option value="accounts">Accounts / Cash</option>
          </select>
        </label>
        <Button size="sm" variant="ghost" onClick={()=>setTurns([])} disabled={!turns.length||asking}>Clear chat</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-muted-foreground" aria-hidden/>Assistant</CardTitle>
          <CardDescription>Ask anything · verified data only · read-only retrieval</CardDescription>
        </CardHeader>
        <CardContent><Unavailable compact reason="Hermes runner naming is historical: no separate runner is connected. Queries execute through the structured local planner; AI interpretation activates only when a key is configured."/></CardContent>
      </Card>
      <div ref={scroller} className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto rounded-md border p-3" aria-live="polite">
        {!turns.length&&<div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Try a question such as:</p>
          <span className="flex flex-wrap gap-2">{SUGGESTIONS.map(q=><Button key={q} size="sm" variant="outline" onClick={()=>void ask(q)}>{q}<ArrowRight className="ml-1 inline size-3"/></Button>)}</span>
        </div>}
        {turns.map((t,i)=>(
          <article key={i} className="grid gap-1">
            <p className="self-end rounded-md bg-secondary px-3 py-1.5 text-sm">{t.question}</p>
            {t.answer?<div className="rounded-md border p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground"><Sparkles className="size-3" aria-hidden/>{t.answer.mode}&nbsp;·&nbsp;{t.answer.scope}</p>
              <p className="whitespace-pre-wrap">{t.answer.answer}</p>
              {!!t.answer.refs.length&&<div className="mt-2 flex flex-wrap gap-1">{t.answer.refs.map(r=>(<span key={r.id} className="inline-block rounded border px-2 py-0.5 text-[11px]"><ExternalLink className="mr-1 inline size-3" aria-hidden/>{r.label} · #{r.id}</span>))}</div>}
              {!!t.answer.warnings.length&&<details className="mt-2"><summary className="cursor-pointer text-[11px] text-muted-foreground">Source &amp; uncertainty</summary><ul className="mt-1 list-disc pl-5 text-[11px] text-muted-foreground">{t.answer.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul><p className="text-[11px] text-muted-foreground">Read at {t.answer.checkedAt.slice(0,16).replace('T',' ')} · Dhaka</p></details>}
            </div>:t.error?<p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{t.error}</p>
            :<p className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="size-3.5 animate-spin" aria-hidden/>Reading available records…</p>}
          </article>
        ))}
      </div>
      <div className="grid gap-1">
        <Textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={submit} rows={2}
          placeholder="Ask about verify-only data: employees, payments, vessels, review cases…" aria-label="Assistant question"/>
        <div className="flex items-center gap-2">
          <Button size="sm" className="ml-auto" disabled={asking||!question.trim()} onClick={()=>void ask(question)}>
            {asking?<RefreshCw className="size-3.5 animate-spin" aria-hidden/>:'Ask'}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Unauthorized or mutation requests are answered as guidance only — nothing is written anywhere.</p>
    </div>
  </div>;
}
