'use client';
import {useCallback,useEffect,useState} from 'react';
import {RefreshCw,Undo2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {PageHeader,SectionCard,EmptyState,ErrorState,LoadingSkeleton,StatusBadge} from '@/app/platform/ui';
import {writeJson} from '@/app/platform/csrf';

type Item = {
  id: string; domain: string; action: string; target_ref: string | null;
  payload: Record<string, unknown>; status: string; decision_note: string;
  decided_at: string | null; created_at: string; version: number;
};

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'});

function summary(item: Item): string {
  const p = item.payload ?? {};
  const value = (key: string) => (p[key] === undefined || p[key] === null ? '' : String(p[key]));
  switch (item.domain) {
    case 'VESSEL_PROGRAM': return [value('motherVessel'), value('lighterVessel'), value('startDate')].filter(Boolean).join(' · ');
    case 'EMPLOYEE': return [value('preferred_name'), value('employee_mobile')].filter(Boolean).join(' · ');
    case 'ATTENDANCE': return [value('employee_mobile'), value('attendance_date'), value('shift')].filter(Boolean).join(' · ');
    case 'CASH': return [value('employee_name'), value('amount_minor')].filter(Boolean).join(' · ');
    default: return JSON.stringify(p).slice(0, 80);
  }
}

/**
 * My Submissions — the submitter's own view of the queue.
 *
 * Filtering is server-side on the session identity (`mine=1` is not a client-widenable
 * parameter: a USER is always restricted to their own rows). Withdrawal is only
 * offered while the item is PENDING; the database refuses anything else.
 */
export default function SubmissionsView() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    // State updates run after an await boundary so the effect body stays free of
    // synchronous setState (react-compiler rule used across this codebase).
    await Promise.resolve();
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/review/list?status=${status}&mine=1`, {cache: 'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Submissions could not be loaded.');
      setItems(data.items as Item[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Submissions could not be loaded.');
    } finally { setLoading(false); }
  }, [status]);

  // Deferred past an await so the effect body never calls setState synchronously.
  useEffect(() => { void (async () => { await Promise.resolve(); await load(); })(); }, [load]);

  const withdraw = async (item: Item) => {
    setBusy(item.id); setError('');
    try {
      await writeJson('/api/review/withdraw', {id: item.id});
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Withdrawal failed.');
    } finally { setBusy(''); }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Workforce"
        title="My Submissions"
        description="Everything you have submitted and where it stands. A pending item can be withdrawn; a decided one is kept with its reason and cannot be deleted."
        actions={<>
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="CORRECTION_REQUESTED">Correction requested</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-3.5"/>Refresh</Button>
        </>}
      />

      {error && <ErrorState message={error} onRetry={() => void load()}/>}

      <SectionCard flush title="Your submissions">
        {loading && !items && <LoadingSkeleton rows={5}/>}
        {items && !items.length && <EmptyState title="Nothing submitted yet" description="Programs and attendance you submit will appear here until an admin decides."/>}
        {!!items?.length && (
          <div className="wx-table-wrap">
            <table className="wx-table">
              <thead>
                <tr>
                  <th scope="col">Domain</th>
                  <th scope="col">Action</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Decision note</th>
                  <th scope="col"><span className="sr-only">Withdraw</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.domain.replace('_', ' ').toLowerCase()}</td>
                    <td>{item.action}</td>
                    <td className="max-w-[260px] truncate" title={summary(item)}>{summary(item) || '—'}</td>
                    <td><StatusBadge status={item.status}/></td>
                    <td className="tabular-nums">{when(item.created_at)}</td>
                    <td className="max-w-[220px] truncate" title={item.decision_note}>{item.decision_note || '—'}</td>
                    <td className="text-right">
                      {item.status === 'PENDING' && (
                        <Button size="sm" variant="ghost" disabled={busy === item.id} onClick={() => void withdraw(item)}>
                          <Undo2 className="size-3.5"/>Withdraw
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
