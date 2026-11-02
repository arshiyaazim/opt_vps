'use client';
import {useMemo,useRef,useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {defaultFilters,type ToolbarFilters,type FacetDef,type SortDef} from '@/app/platform/toolbar-logic';

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
 *
 * Deliberately no URL persistence. Writing search params with router.replace()
 * re-rendered the force-dynamic route, which remounted this subtree and reset the
 * parent's filter state — the URL showed the filter while the table kept showing
 * every row. Local state is the reliable option; shareable URLs can return later
 * behind a Suspense boundary if they are wanted.
 */
export function DataToolbar({
  filters, onChange, facets, sorts, resultLabel,
}:{
  filters: ToolbarFilters;
  onChange: (next: ToolbarFilters) => void;
  facets: FacetDef[];
  sorts: SortDef[];
  resultLabel: string;
}) {
  const [search, setSearch] = useState(filters.search);
  const debounce = useRef<number | undefined>(undefined);

  // Debounce in the handler rather than an effect: an effect keyed on `filters`
  // re-armed on every parent update, and reading the latest props through a ref
  // written during render is rejected by this project's lint rules.
  const changeSearch = (value: string) => {
    setSearch(value);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => onChange({...filters, search: value}), 300);
  };

  const setFacet = (key: string, values: string[]) =>
    onChange({...filters, facets: {...filters.facets, [key]: values}});

  const clearAll = () => {
    setSearch('');
    window.clearTimeout(debounce.current);
    onChange(defaultFilters(sorts[0]?.key ?? filters.sort));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search vessel, escort or mobile…"
          className="h-9 w-64 pr-8"
          aria-label="Search programs"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); window.clearTimeout(debounce.current); onChange({...filters, search: ''}); }} aria-label="Clear search"
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
