'use client';
import {useEffect,useRef,useState} from 'react';
import {Input} from '@/components/ui/input';

/**
 * Shared employee picker (RBAC-2B step 11).
 *
 * One implementation for every form that needs an employee: vessel programs, cash,
 * attendance. It searches GET /api/employees/lookup (mobile, preferred name or alias)
 * after two characters and 300 ms of quiet, and reports both the mobile and the name
 * so a caller never has to re-derive one from the other.
 *
 * An admin may receive a REVIEW employee — one staged by a pending submission. The
 * component shows the state and, because such a row has no designation yet, offers the
 * vocabulary instead of inventing a value. A CONFIRMED employee's designation is shown
 * as text and is edited from the attendance page, not from every form that picks a
 * person.
 */
export type LookupEmployee = {
  mobile: string;
  name: string;
  designation: string | null;
  state: string;
  duty_type: string | null;
};

export const DESIGNATIONS = [
  'operation','office_assistant','escort','security','ghat_tallyman','customer_service',
  'marketing_officer','supervisor','in_charge','accounts_audit','hr_admin',
] as const;

export const DESIGNATION_LABEL: Record<string, string> = {
  operation: 'Operation',
  office_assistant: 'Office Asst.',
  escort: 'Escort',
  security: 'Security',
  ghat_tallyman: 'Ghat Tally-man',
  customer_service: 'Customer Service',
  marketing_officer: 'Marketing Officer',
  supervisor: 'Supervisor',
  in_charge: 'In-charge',
  accounts_audit: 'Accounts & Audit',
  hr_admin: 'HR & Admin',
};

type Selection = {mobile: string; name: string; designation?: string | null; state?: string};

export function EmployeeLookup({
  value, onChange, label = 'Employee', required = false, disabled = false,
  placeholder = 'Search by mobile or name…',
}: {
  value: string;
  onChange: (mobile: string, name: string, extra?: Selection) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<LookupEmployee[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Selection | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const box = useRef<HTMLDivElement | null>(null);

  // The selection is derived, not synchronised: a value set from outside (edit form,
  // a row the parent reprogrammed) wins over stale internal state, so the field can
  // never claim a person the parent no longer holds. Deriving it also keeps the
  // effect body free of setState.
  const selected: Selection | null = value
    ? (picked && picked.mobile === value ? picked : { mobile: value, name: '' })
    : null;

  useEffect(() => {
    void (async () => {
    await Promise.resolve();
    if (query.trim().length < 2) { setRows([]); setOpen(false); setBusy(false); return; }
    setBusy(true); setFailed('');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const controller = new AbortController();
      fetch(`/api/employees/lookup?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store', signal: controller.signal })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data?.error || 'LOOKUP_FAILED');
          return data as { employees?: LookupEmployee[] };
        })
        .then((data) => { setRows(data.employees ?? []); setActive(0); setOpen(true); })
        .catch((error) => {
          if ((error as Error).name === 'AbortError') return;
          setRows([]); setFailed('Employee search is unavailable right now.'); setOpen(true);
        })
        .finally(() => setBusy(false));
    }, 300);
    })();
    return () => window.clearTimeout(timer.current);
  }, [query]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (row: LookupEmployee) => {
    const next: Selection = { mobile: row.mobile, name: row.name, designation: row.designation, state: row.state };
    setPicked(next); setOpen(false); setQuery('');
    onChange(row.mobile, row.name, next);
  };

  const clear = () => {
    setPicked(null); setQuery(''); setRows([]); setOpen(false);
    onChange('', '', { mobile: '', name: '', designation: null, state: '' });
  };

  const key = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !rows.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); const row = rows[active]; if (row) choose(row); }
    else if (event.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="grid gap-1" ref={box} data-lookup="employee">
      <label className="text-xs font-semibold text-muted-foreground" htmlFor="employee-lookup-input">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <span className="font-medium">{selected.name || 'Selected employee'}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{selected.mobile}</span>
          {selected.state === 'REVIEW' && (
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Awaiting approval
            </span>
          )}
          {!disabled && <button type="button" onClick={clear} className="ml-auto text-xs text-muted-foreground underline">Change</button>}
        </div>
      ) : (
        <div className="relative">
          <Input
            id="employee-lookup-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => { if (rows.length) setOpen(true); }}
            onKeyDown={key}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            aria-expanded={open}
            aria-controls="employee-lookup-results"
          />
          {busy && <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">searching…</span>}
        </div>
      )}

      {open && !selected && (
        <div id="employee-lookup-results" role="listbox" className="max-h-64 overflow-y-auto rounded-md border bg-background shadow-sm">
          {failed && <p className="px-3 py-2 text-xs text-destructive">{failed}</p>}
          {!failed && !rows.length && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No employee found. Type a full mobile number to use it as a new employee — an admin will review it.
            </div>
          )}
          {rows.map((row, index) => (
            <button
              key={row.mobile}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(row)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${index === active ? 'bg-muted' : ''}`}
            >
              <span className="w-40 shrink-0 tabular-nums text-muted-foreground">{row.mobile}</span>
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              {row.state === 'REVIEW' && <span className="text-[10px] uppercase tracking-wide text-amber-700">Review</span>}
            </button>
          ))}
        </div>
      )}

      {selected?.state === 'REVIEW' && (
        <p className="text-[11px] text-muted-foreground">
          This employee is awaiting approval. Their designation can be set once an admin confirms them.
        </p>
      )}
    </div>
  );
}
