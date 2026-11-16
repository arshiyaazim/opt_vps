'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Plus,RefreshCw,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {PageHeader,SectionCard,EmptyState,ErrorState,LoadingSkeleton,fmtBDT,fmtInt} from '@/app/platform/ui';
import {EmployeeLookup,DESIGNATION_LABEL} from '@/app/platform/employee-lookup';
import {writeJson} from '@/app/platform/csrf';

type Row = {
  employee_mobile: string;
  preferred_name: string;
  designation: string | null;
  joining_date: string | null;
  current_month_days: number;
  prev_month_days: number;
  current_month_cash_minor: string;
  prev_month_cash_minor: string;
  payable_minor: string;
};

const minor = (value: string | number) => fmtBDT(Number(value || 0));
const monthName = (offset: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleString('en-GB', {month: 'short', year: 'numeric'});
};

export default function AttendanceView({admin}:{admin:boolean}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);

  const load = useCallback(async () => {
    // State updates run after an await boundary so the effect body stays free of
    // synchronous setState (react-compiler rule used across this codebase).
    await Promise.resolve();
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/attendance/summary', {cache: 'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Attendance could not be loaded.');
      setRows(data.rows as Row[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  // Deferred past an await so the effect body never calls setState synchronously.
  useEffect(() => { void (async () => { await Promise.resolve(); await load(); })(); }, [load]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!rows) return [];
    if (!term) return rows;
    return rows.filter((row) =>
      row.employee_mobile.toLowerCase().includes(term) || row.preferred_name.toLowerCase().includes(term));
  }, [rows, query]);

  return (
    <div className="wx-page flex flex-col gap-4">
      <PageHeader
        eyebrow="Workforce"
        title="Attendance"
        description="Monthly attendance days and cash instructed per employee. Days come from released vessel programs or an approved manual entry; amounts are the value of cash instructions recorded in that month, not a settled payment."
        actions={<>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-3.5"/>Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5"/>Add attendance</Button>
        </>}
        meta={<>
          <span className="text-xs text-muted-foreground">{monthName(0)} · {monthName(1)}</span>
          {!admin && <span className="text-xs text-muted-foreground">Submissions go to an admin for review</span>}
        </>}
      />

      {error && <ErrorState message={error} onRetry={() => void load()}/>}

      <SectionCard flush
        title="Per-employee summary"
        description={rows ? `${fmtInt.format(shown.length)} of ${fmtInt.format(rows.length)} employees` : undefined}
        actions={<label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="size-3.5"/>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name or mobile…" className="h-8 w-56"/>
        </label>}
      >
        {loading && !rows && <LoadingSkeleton rows={6}/>}
        {rows && !shown.length && <EmptyState title="No employees match" description="Try a different name or mobile number."/>}
        {!!shown.length && (
          <div className="wx-table-wrap">
            <table className="wx-table">
              <thead>
                <tr>
                  <th rowSpan={2} scope="col">Employee ID</th>
                  <th rowSpan={2} scope="col">Name</th>
                  <th rowSpan={2} scope="col">Designation</th>
                  <th rowSpan={2} scope="col">Date of join</th>
                  <th colSpan={2} scope="colgroup" className="text-center">Attendance (days)</th>
                  <th colSpan={2} scope="colgroup" className="text-center">Cash received</th>
                  <th rowSpan={2} scope="col" className="text-right">Payable</th>
                  <th rowSpan={2} scope="col"><span className="sr-only">View</span></th>
                </tr>
                <tr>
                  <th scope="col" className="text-right">{monthName(0)}</th>
                  <th scope="col" className="text-right">{monthName(1)}</th>
                  <th scope="col" className="text-right">{monthName(0)}</th>
                  <th scope="col" className="text-right">{monthName(1)}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.employee_mobile}>
                    <td className="tabular-nums">{row.employee_mobile}</td>
                    <td>{row.preferred_name}</td>
                    <td>{row.designation ? DESIGNATION_LABEL[row.designation] ?? row.designation : '—'}</td>
                    <td className="tabular-nums">{row.joining_date ?? '—'}</td>
                    <td className="text-right tabular-nums">{fmtInt.format(Number(row.current_month_days))}</td>
                    <td className="text-right tabular-nums">{fmtInt.format(Number(row.prev_month_days))}</td>
                    <td className="text-right tabular-nums">{minor(row.current_month_cash_minor)}</td>
                    <td className="text-right tabular-nums">{minor(row.prev_month_cash_minor)}</td>
                    <td className="text-right tabular-nums">{minor(row.payable_minor)}</td>
                    <td><Button size="sm" variant="ghost" onClick={() => setDetail(row)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <AddAttendance
        open={open}
        admin={admin}
        onClose={() => setOpen(false)}
        onSaved={async () => { setOpen(false); await load(); }}
      />

      <Sheet open={!!detail} onOpenChange={(value) => { if (!value) setDetail(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detail?.preferred_name ?? 'Employee'}</SheetTitle>
            <SheetDescription>{detail?.employee_mobile}</SheetDescription>
          </SheetHeader>
          {detail && (
            <dl className="grid grid-cols-2 gap-3 px-4 text-sm">
              <dt className="text-muted-foreground">Designation</dt>
              <dd>{detail.designation ? DESIGNATION_LABEL[detail.designation] ?? detail.designation : 'Not set'}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{detail.joining_date ?? '—'}</dd>
              <dt className="text-muted-foreground">{monthName(0)} days</dt>
              <dd className="tabular-nums">{fmtInt.format(Number(detail.current_month_days))}</dd>
              <dt className="text-muted-foreground">{monthName(1)} days</dt>
              <dd className="tabular-nums">{fmtInt.format(Number(detail.prev_month_days))}</dd>
              <dt className="text-muted-foreground">{monthName(0)} cash</dt>
              <dd className="tabular-nums">{minor(detail.current_month_cash_minor)}</dd>
              <dt className="text-muted-foreground">{monthName(1)} cash</dt>
              <dd className="tabular-nums">{minor(detail.prev_month_cash_minor)}</dd>
            </dl>
          )}
          <SheetFooter>
            <Button asChild variant="outline">
              <Link href={`/employee/${encodeURIComponent(detail?.employee_mobile ?? '')}/programs`}>Program history</Link>
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Program-derived days are read-only: they are regenerated from released vessel programs.
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddAttendance({open,admin,onClose,onSaved}:{open:boolean;admin:boolean;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<'D' | 'N'>('D');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reset = () => { setMobile(''); setName(''); setHours(''); setNotes(''); setError(''); setMessage(''); };

  const submit = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      if (!mobile) throw new Error('Choose an employee first.');
      const result = await writeJson<{mode: string; status?: string}>('/api/attendance/add', {
        employee_mobile: mobile, attendance_date: date, shift,
        hours: hours === '' ? null : Number(hours), notes: notes || null,
      });
      setMessage(result.mode === 'direct' ? 'Attendance saved.' : 'Attendance submitted for review.');
      await onSaved();
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance could not be saved.');
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => { if (!value) { reset(); onClose(); } }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add attendance</SheetTitle>
          <SheetDescription>
            {admin ? 'Saved immediately as an admin entry.' : 'Submitted for admin review before it counts.'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4">
          <EmployeeLookup value={mobile} onChange={(nextMobile, nextName) => { setMobile(nextMobile); setName(nextName); }} required/>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Date</span>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)}/>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Shift</span>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={shift} onChange={(event) => setShift(event.target.value as 'D' | 'N')}>
              <option value="D">Day (D)</option>
              <option value="N">Night (N)</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Hours (optional)</span>
            <Input type="number" min="1" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)}/>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Notes (optional)</span>
            <Input value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)}/>
          </label>
          {name && <p className="text-[11px] text-muted-foreground">Selected: {name}</p>}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
        </div>
        <SheetFooter>
          <Button onClick={() => void submit()} disabled={busy || !mobile}>{busy ? 'Saving…' : admin ? 'Save attendance' : 'Submit for review'}</Button>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
