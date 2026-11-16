'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {LoadingLines,PageNotice,Unavailable,fmtBDT,useApi,fmtInt} from '@/app/platform/ui';
import {opUrl,type OperationsSnapshot} from '@/app/platform/ops-client';

interface ArchiveMessagesResponse{messages:{id:string;messageDate:string;time:string;sender:string;source:string;chatKey?:string;kind?:string}[];total:number}
type ArchiveCashSnapshot=OperationsSnapshot;

export default function ArchiveView(){
  const archiveCash=useApi<ArchiveCashSnapshot>(opUrl('cash','archive'));
  const [msgUrl,setMsgUrl]=useState('/api/register?messages=1');
  const messages=useApi<ArchiveMessagesResponse>(msgUrl);
  const [mq,setMq]=useState('');

  const exportNote='Historical provenance retained: source label, date and IDs are preserved; no historical record is rewritten by these screens.';

  return <div className="wx-page">
    <Unavailable compact reason={exportNote}/>

    <Tabs defaultValue="cash">
      <TabsList>
        <TabsTrigger value="cash">Cash instruction history</TabsTrigger>
        <TabsTrigger value="messages">Historical WhatsApp messages</TabsTrigger>
        <TabsTrigger value="vessels">Vessel program history</TabsTrigger>
        <TabsTrigger value="evidence">Reconciliation & import evidence</TabsTrigger>
      </TabsList>

      <TabsContent value="cash" className="mt-2 flex flex-col gap-2">
        {archiveCash.loading&&<LoadingLines/>}
        {archiveCash.error&&<Unavailable title="Archive unavailable" reason={archiveCash.error}/>}
        {archiveCash.data&&<>
          <PageNotice notice={archiveCash.data.notice} sourceLabel={archiveCash.data.sourceLabel} checkedAt={archiveCash.data.checkedAt}/>
          <p className="text-xs text-muted-foreground">{fmtInt.format(archiveCash.data.total)} archive rows · total {fmtBDT(archiveCash.data.summary.amountCents)} (legacy epoch, immutable)</p>
          <p><Link href="/cash/archive" className="text-sm underline-offset-2 hover:underline">Open preserved Cash Archive screen ↗</Link></p>
        </>}
      </TabsContent>

      <TabsContent value="messages" className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1"><Label htmlFor="a-q">Search archived messages</Label><Input id="a-q" type="search" value={mq} onChange={e=>setMq(e.target.value)} placeholder="Text, sender, source…" onBlur={()=>setMsgUrl(`/api/register?messages=1&q=${encodeURIComponent(mq)}`)}/></div>
          <Button size="sm" onClick={()=>setMsgUrl(`/api/register?messages=1&q=${encodeURIComponent(mq)}`)}>Search</Button>
          <Link href="/conversations" className="text-xs underline-offset-2 hover:underline">Conversation inspector (preserved) ↗</Link>
        </div>
        {messages.loading&&<LoadingLines/>}
        {messages.error&&<Unavailable title="Messages unavailable" reason={messages.error}/>}
        {messages.data&&<div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Sender</TableHead><TableHead>Source</TableHead><TableHead>Message ID</TableHead></TableRow></TableHeader>
            <TableBody>{messages.data.messages.map(m=><TableRow key={m.id}>
              <TableCell className="whitespace-nowrap">{m.messageDate}</TableCell>
              <TableCell className="whitespace-nowrap">{m.time}</TableCell>
              <TableCell>{m.sender}</TableCell>
              <TableCell className="text-xs">{m.source}</TableCell>
              <TableCell className="tabular-nums text-xs">{String(m.id).slice(0,18)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
          <p className="p-2 text-[11px] text-muted-foreground">{fmtInt.format(messages.data.total)} matching messages · message contents remain accessible in the preserved screens; this list is metadata only.</p>
        </div>}
      </TabsContent>

      <TabsContent value="vessels" className="mt-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Vessel program history</CardTitle><CardDescription>Program history with full provenance is owned by the preserved register.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline"><Link href="/register">Register (historical source)</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/vessel">Vessel Register</Link></Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="evidence" className="mt-2 flex flex-col gap-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Import evidence</CardTitle><CardDescription>Summaries, duplicates and reviews from verified evidence APIs.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline"><Link href="/sources-review">Sources &amp; Review</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/message-mirror">Message mirror</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/review">Identity review</Link></Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>;
}
