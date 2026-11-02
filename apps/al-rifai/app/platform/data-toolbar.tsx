'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

/** Everything the toolbar controls. Serializable so it can live in the URL. */
export type ToolbarFilters = {
  search: string;
  /** key -> selected values. Empty array means "no restriction". */
  facets: Record<string, string[]>;
  from: string;
  to: string;
  sort: string;
};

export type FacetDef = {key: string; label: string; values: string[]};
export type SortDef = {key: string; label: string};

export const defaultFilters = (sort: string): ToolbarFilters => ({search: '', facets: {}, from: '', to: '', sort});

export function isFiltered(filters: ToolbarFilters): boolean {
  return Boolean(filters.search.trim() || filters.from || filters.to
    || Object.values(filters.facets).some((v) => v.length));
}

/**
 * Apply search, facets and a date range to rows.
 *
 * Kept out of the component so the register and the employee history page filter
 * identically — a divergence between two views of the same data would be a bug.
 */
export function applyFilters<T extends object>(
  rows: readonly T[],
  filters: ToolbarFilters,
  options: {searchFields: readonly string[]; dateField: string},
): T[] {
  const get = (row: T, key: string) => (row as Record<string, unknown>)[key];
  const term = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (term) {
      const hay = options.searchFields
        .map((f) => String(get(row, f) ?? ''))
        .join(' ')
        .toLowerCase();
      if (!hay.includes(term)) return false;
    }
    for (const [key, values] of Object.entries(filters.facets)) {
      if (!values.length) continue;
      if (!values.includes(String(get(row, key) ?? ''))) return false;
    }
    const date = String(get(row, options.dateField) ?? '').slice(0, 10);
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    return true;
  });
}

/** Sort by a known key. Unknown keys fall back to the caller's order. */
export function sortRows<T extends object>(rows: readonly T[], sort: string): T[] {
  const out = [...rows];
  const str = (row: T, key: string) => String((row as Record<string, unknown>)[key] ?? '');
  const num = (row: T, key: string) => Number((row as Record<string, unknown>)[key] ?? 0);
  switch (sort) {
    case 'start_desc': return out.sort((a, b) => str(b, 'startDate').localeCompare(str(a, 'startDate')));
    case 'start_asc': return out.sort((a, b) => str(a, 'startDate').localeCompare(str(b, 'startDate')));
    case 'mother_asc': return out.sort((a, b) => str(a, 'motherVessel').localeCompare(str(b, 'motherVessel')));
    case 'mother_desc': return out.sort((a, b) => str(b, 'motherVessel').localeCompare(str(a, 'motherVessel')));
    case 'escort_asc': return out.sort((a, b) => str(a, 'escortName').localeCompare(str(b, 'escortName')));
    case 'total_desc': return out.sort((a, b) => num(b, 'totalMinor') - num(a, 'totalMinor'));
    default: return out;
  }
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Multi-select dropdown built from <details> so it needs no popover dependency. */
function FacetMenu({def, selected, onChange}:{def:FacetDef;selected:string[];onChange:(values:string[])=>void}) {
  const [term, setTerm] = useState('');
  const shown = useMemo(
    () => def.values.filter((v) => v.toLowerCase().includes(term.trim().toLowerCase())),
    [def.values, term],
  );
  const toggle = (value: string) => onChange(
    selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
  );
  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-md border bg-background px-3 text-sm">
        {def.label}{selected.length ? ` (${selected.length})` : ''}
      </summary>
      <div className="absolute left-0 z-30 mt-1 w-56 rounded-md border bg-background p-2 shadow-md">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Filter ${def.label.toLowerCase()}…`} className="mb-2 h-8"/>
        <div className="mb-1 flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onChange([...def.values])}>Select all</Button>
          <Button size="sm" variant="ghost" onClick={() => onChange([])}>Clear</Button>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {shown.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm hover:bg-muted">
              <input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)}/>
              <span className="truncate" title={value}>{value || '(none)'}</span>
            </label>
          ))}
          {!shown.length && <p className="px-1 py-2 text-xs text-muted-foreground">No matches</p>}
        </div>
      </div>
    </details>
  );
}

/**
 * Filter toolbar shared by the vessel register and the employee history page.
 *
 * State lives in the caller; this component only renders controls and emits changes.
 * URL persistence is opt-in via `urlKeys` so a page that does not want it stays
 * clean.
 */
export function DataToolbar({
  filters, onChange, facets, sorts, resultLabel, urlKeys = false,
}:{
  filters: ToolbarFilters;
  onChange: (next: ToolbarFilters) => void;
  facets: FacetDef[];
  sorts: SortDef[];
  resultLabel: string;
  urlKeys?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restored = useRef(false);
  const [search, setSearch] = useState(filters.search);

  // Debounce the search box; the parent filters on every keystroke otherwise.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== filters.search) onChange({...filters, search});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, filters, onChange]);

  // Restore once from the URL on first load.
  useEffect(() => {
    if (!urlKeys || restored.current) return;
    restored.current = true;
    const params = searchParams;
    if (!params.toString()) return;
    const facetsFromUrl: Record<string, string[]> = {};
    for (const facet of facets) {
      const raw = params.get(facet.key);
      if (raw) facetsFromUrl[facet.key] = raw.split(',').filter(Boolean);
    }
    onChange({
      search: params.get('search') ?? '',
      facets: facetsFromUrl,
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
      sort: params.get('sort') ?? filters.sort,
    });
  }, [urlKeys, searchParams, facets, filters.sort, onChange]);

  // Write back whenever the filters change.
  useEffect(() => {
    if (!urlKeys) return;
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    for (const [key, values] of Object.entries(filters.facets)) {
      if (values.length) params.set(key, values.join(','));
    }
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.sort) params.set('sort', filters.sort);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', {scroll: false});
  }, [filters, urlKeys, router]);

  const setFacet = (key: string, values: string[]) =>
    onChange({...filters, facets: {...filters.facets, [key]: values}});

  const clearAll = () => {
    setSearch('');
    onChange(defaultFilters(sorts[0]?.key ?? filters.sort));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vessel, escort or mobile…"
          className="h-9 w-64 pr-8"
          aria-label="Search programs"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-1 top-1 h-7 w-7 text-muted-foreground">×</button>
        )}
      </div>

      {facets.map((facet) => (
        <FacetMenu key={facet.key} def={facet} selected={filters.facets[facet.key] ?? []}
          onChange={(values) => setFacet(facet.key, values)}/>
      ))}

      <div className="flex items-center gap-1">
        <Input type="date" value={filters.from} onChange={(e) => onChange({...filters, from: e.target.value})}
          className="h-9 w-36" aria-label="From date"/>
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" value={filters.to} onChange={(e) => onChange({...filters, to: e.target.value})}
          className="h-9 w-36" aria-label="To date"/>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => onChange({...filters, from: daysAgo(7), to: ''})}>7d</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({...filters, from: daysAgo(30), to: ''})}>30d</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({...filters, from: monthStart(), to: ''})}>This month</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({...filters, from: '', to: ''})}>All</Button>
      </div>

      <Select value={filters.sort} onValueChange={(sort) => onChange({...filters, sort})}>
        <SelectTrigger className="h-9 w-52" aria-label="Sort"><SelectValue/></SelectTrigger>
        <SelectContent>
          {sorts.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
      <span className="ml-auto text-xs text-muted-foreground">{resultLabel}</span>
    </div>
  );
}
