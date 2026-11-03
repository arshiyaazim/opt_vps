'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Pencil,XCircle,RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {PageHeader,SectionCard,EmptyState,ErrorState,LoadingSkeleton,StatusBadge} from '@/app/platform/ui';
import {writeJson} from '@/app/platform/csrf';

type Item = {
  id: string; domain: string; action: string; target_ref: string | null;
  payload: Record<string, unknown>; status: string;
  submitted_by_user_ref: string; submitted_by_role: string; submitted_by_name: string | null;
  decision_note: string; decided_by: string | null; decided_at: string | null;
  applied_ref: string | null; version: number; created_at: string;
};

const DOMAINS = [
  {key: '', label: 'All'},
  {key: 'VESSEL_PROGRAM', label: 'Vessel Program'},
  {key: 'EMPLOYEE', label: 'Employee'},
  {key: 'CASH', label: 'Cash'},
  {key: 'ATTENDANCE', label: 'Attendance'},
] as const;

const STATUSES = [
  {key: 'PENDING', label: 'Pending'},
  {key: 'APPROVED', label: 'Approved'},
  {key: 'REJECTED', label: 'Rejected'},
  {key: 'ALL', label: 'All'},
] as const;

/** The payload fields worth showing in a queue row, per domain. */
function preview(item: Item): string {
  const p = item.payload ?? {};
  const value = (key: string) => (p[key] === undefined || p[key] === null ? '' : String(p[key]));
  switch (item.domain) {
    case 'VESSEL_PROGRAM':
      return [value('motherVessel'), value('lighterVessel'), value('escortName'), value('startDate')].filter(Boolean).join(' · ');
    case 'EMPLOYEE':
      return [value('preferred_name'), value('employee_mobile'), value('designation')].filter(Boolean).join(' · ');
    case 'ATTENDANCE':
      return [value('employee_mobile'), value('attendance_date'), value('shift')].filter(Boolean).join(' · ');
    case 'CASH':
      return [value('employee_name'), value('amount_minor'), value('method')].filter(Boolean).join(' · ');
    default:
      return JSON.stringify(p).slice(0, 90);
  }
}

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'});

export default function ReviewQueueView() {
  const [domain, setDomain] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING');
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [asking, setAsking] = useState<'REJECT' | 'EDIT' | null>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    // State updates run after an await boundary so the effect body stays free of
    // synchronous setState (react-compiler rule used across this codebase).
    await Promise.resolve();
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({domain, status});
      const response = await fetch(`/api/review/list?${params}`, {cache: 'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'The queue could not be loaded.');
      setItems(data.items as Item[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The queue could not be loaded.');
    } finally { setLoading(false); }
  }, [domain, status]);

  // Deferred past an await so the effect body never calls setState synchronously.
  useEffect(() => { void (async () => { await Promise.resolve(); await load(); })(); }, [load]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items ?? []) map.set(item.domain, (map.get(item.domain) ?? 0) + 1);
    return map;
  }, [items]);

  const decide = async (item: Item, decision: 'APPROVE' | 'REJECT', extra?: {note?: string; editedPayload?: Record<string, unknown>}) => {
    setBusy(item.id); setError(''); setNotice('');
    try {
      // Cash keeps its own authority: the decision is recorded by the cash endpoint
      // (which enforces the two-step policy and the poster rules), and that endpoint
      // closes this mirror row. Sending it to workflow_decide would either duplicate
      // the posting logic or silently mark it done without deciding anything.
      if (item.domain === 'CASH') {
        const submissionId = String(item.payload?.submission_id ?? item.target_ref ?? '');
        if (!submissionId) throw new Error('This cash item has no submission reference.');
        await writeJson(`/api/cash/submissions/${encodeURIComponent(submissionId)}/decision`, {
          decision: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          note: extra?.note ?? '',
        });
        setNotice(decision === 'APPROVE' ? 'Cash submission approved.' : 'Cash submission rejected.');
        setAsking(null); setCurrent(null); setNote(''); setDraft('');
        await load();
        return;
      }
      await writeJson('/api/review/decide', {
        id: item.id,
        decision,
        expectedVersion: item.version,
        note: extra?.note ?? '',
        editedPayload: extra?.editedPayload ?? null,
      });
      setNotice(decision === 'APPROVE' ? 'Approved and applied.' : 'Rejected — the record is retained.');
      setAsking(null); setCurrent(null); setNote(''); setDraft('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The decision failed.');
    } finally { setBusy(''); }
  };

  const submitEdit = async () => {
    if (!current) return;
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      await decide(current, 'APPROVE', {editedPayload: parsed, note});
    } catch (cause) {
      setError(cause instanceof SyntaxError ? 'The edited payload is not valid JSON.' : (cause instanceof Error ? cause.message : 'Edit failed.'));
    }
  };

  return (
    <div className="wx-page flex flex-col gap-4">
      <PageHeader
        eyebrow="Administration"
        title="Review Queue"
        description="Every submission staged by staff. Approving applies it to the live tables; rejecting keeps the record with its reason. Nothing here is live until approved."
        actions={<Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-3.5"/>Refresh</Button>}
        meta={items ? <span className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} in this view</span> : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        {DOMAINS.map((entry) => {
          const count = entry.key ? counts.get(entry.key) ?? 0 : items?.length ?? 0;
          return (
            <Button key={entry.key || 'all'} size="sm" variant={domain === entry.key ? 'default' : 'outline'}
              onClick={() => setDomain(entry.key)}>
              {entry.label}{count ? ` (${count})` : ''}
            </Button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            {STATUSES.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()}/>}
      {notice && <p role="status" className="rounded-md border bg-muted/40 p-2 text-sm">{notice}</p>}

      <SectionCard flush title={status === 'PENDING' ? 'Awaiting decision' : 'Records'}>
        {loading && !items && <LoadingSkeleton rows={6}/>}
        {items && !items.length && <EmptyState title="Nothing here" description="No submissions match this filter."/>}
        {!!items?.length && (
          <div className="wx-table-wrap">
            <table className="wx-table">
              <thead>
                <tr>
                  <th scope="col">Submitted by</th>
                  <th scope="col">Date</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                  <th scope="col">Payload</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Decisions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.submitted_by_name || item.submitted_by_user_ref.slice(0, 8)}{item.submitted_by_role === 'USER' ? '' : ` · ${item.submitted_by_role}`}</td>
                    <td className="tabular-nums">{when(item.created_at)}</td>
                    <td>{item.domain.replace('_', ' ').toLowerCase()}</td>
                    <td>{item.action}</td>
                    <td className="tabular-nums">{item.target_ref ? item.target_ref.slice(0, 14) : '—'}</td>
                    <td className="max-w-[260px] truncate" title={preview(item)}>{preview(item) || '—'}</td>
                    <td><StatusBadge status={item.status}/>{item.decision_note && <span className="ml-1 text-[11px] text-muted-foreground" title={item.decision_note}>·</span>}</td>
                    <td className="text-right">
                      {item.status === 'PENDING' ? (
                        <span className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label="Approve" title="Approve"
                            disabled={busy === item.id} onClick={() => void decide(item, 'APPROVE')}>
                            <CheckCircle2 className="size-4 text-emerald-600"/>
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Edit and approve" title="Edit & Approve"
                            disabled={busy === item.id}
                            onClick={() => { setCurrent(item); setDraft(JSON.stringify(item.payload, null, 2)); setNote(''); setAsking('EDIT'); }}>
                            <Pencil className="size-4"/>
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Reject" title="Reject"
                            disabled={busy === item.id}
                            onClick={() => { setCurrent(item); setNote(''); setAsking('REJECT'); }}>
                            <XCircle className="size-4 text-destructive"/>
                          </Button>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{item.decided_at ? when(item.decided_at) : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Sheet open={asking !== null} onOpenChange={(value) => { if (!value) { setAsking(null); setCurrent(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{asking === 'REJECT' ? 'Reject submission' : 'Edit and approve'}</SheetTitle>
            <SheetDescription>
              {asking === 'REJECT'
                ? 'A reason is required. The record is retained with REJECTED status — nothing is deleted.'
                : 'Adjust the payload, then approve. The edited payload is validated by the same apply function that a normal approval uses.'}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            {asking === 'EDIT' && (
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Payload (JSON)</span>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[260px] w-full rounded-md border bg-background p-2 font-mono text-xs" spellCheck={false}/>
              </label>
            )}
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Note {asking === 'REJECT' ? '(required)' : '(optional)'}
              </span>
              <Input value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)}/>
            </label>
          </div>
          <SheetFooter>
            {asking === 'REJECT' ? (
              <Button variant="destructive" disabled={!note.trim() || busy === current?.id}
                onClick={() => current && void decide(current, 'REJECT', {note: note.trim()})}>
                {busy === current?.id ? 'Saving…' : 'Reject'}
              </Button>
            ) : (
              <Button disabled={busy === current?.id} onClick={() => void submitEdit()}>
                {busy === current?.id ? 'Saving…' : 'Approve with edits'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setAsking(null); setCurrent(null); }}>Cancel</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
