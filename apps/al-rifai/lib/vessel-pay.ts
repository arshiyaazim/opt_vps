// Presentation of derived vessel pay.
//
// Two rules encoded here, both deliberate:
//
//   1. A missing amount is never shown as 0. It renders as `৳—`, because
//      "no rate configured" and "paid nothing" must not look the same.
//   2. Internal reason codes never reach the operator. `RATE_CONFIG_MISSING` is a
//      diagnostic string for logs and support; the person reading the register
//      gets a short Bangla explanation instead.
//
// The register is read-only: nothing here computes pay, it only formats what
// program_pay already resolved.

export const PAY_NOTE_UNSET = 'রেট সেট করা হয়নি';

const AMOUNT = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `৳1,234.50` for a resolved amount, `৳—` when there is none. Never `৳0.00` for absent. */
export function payAmount(minor: string | null | undefined): string {
  if (minor === null || minor === undefined || minor === '') return '৳—';
  const n = Number(minor);
  if (!Number.isFinite(n)) return '৳—';
  return `৳${AMOUNT.format(n / 100)}`;
}

/** Half-day units as a day figure: 1 shift = 0.5 day. `—` when unknown. */
export function payDays(units: number | null | undefined): string {
  if (units === null || units === undefined || !Number.isFinite(units)) return '—';
  return AMOUNT.format(units / 2);
}

/**
 * Operator-facing explanation for an unresolved row. Unknown codes fall back to a
 * generic message rather than leaking the raw value.
 */
export function payNote(reason: string | null | undefined): string {
  switch (reason) {
    case 'RATE_CONFIG_MISSING': return PAY_NOTE_UNSET;
    case 'START_DATE_INVALID': return 'শুরুর তারিখ ঠিক নেই';
    case 'SHIFT_INVALID': return 'শিফট ঠিক নেই';
    case 'SHIFT_WINDOW_INVALID': return 'শিফট হিসাব করা যায়নি';
    default: return 'হিসাব করা যায়নি';
  }
}

export type PayCell = { value: string; note: string | null };

/**
 * One row's four pay cells. `note` is non-null only when the value is missing, so
 * the table can show the tooltip on exactly the cells that need explaining.
 */
export function payCells(row: {
  payState?: 'CALCULATED' | 'UNRESOLVED' | null;
  payReason?: string | null;
  halfDayUnits?: number | null;
  salaryMinor?: string | null;
  conveyanceMinor?: string | null;
  totalMinor?: string | null;
}): { days: PayCell; salary: PayCell; conveyance: PayCell; total: PayCell } {
  const note = row.payState === 'UNRESOLVED' ? payNote(row.payReason) : null;
  const withNote = (value: string): PayCell => ({ value, note: value === '৳—' || value === '—' ? note : null });
  return {
    days: withNote(payDays(row.halfDayUnits)),
    salary: withNote(payAmount(row.salaryMinor)),
    conveyance: withNote(payAmount(row.conveyanceMinor)),
    total: withNote(payAmount(row.totalMinor)),
  };
}
