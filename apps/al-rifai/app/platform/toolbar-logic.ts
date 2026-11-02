/** Toolbar filter types and the pure filtering/sorting helpers.
 * Extracted from the component so they can be unit-checked without JSX, and so
 * the register and the employee history page filter identically. */

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

