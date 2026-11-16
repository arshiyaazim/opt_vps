import {database} from '@/db/raw';
import {failure, json, readActor} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/attendance/summary
 *
 * Reads attendance_summary — an aggregate view that never exposes a cash row, only
 * the month totals. Amounts stay in minor units (paisa) here; the UI divides by 100.
 * A REVIEW employee is not in the view (it lists CONFIRMED only), which is what keeps
 * a pending hire out of the staff-facing list.
 */
export async function GET() {
  try {
    const actor = await readActor();
    if (!actor) return json({error: 'AUTHENTICATION_REQUIRED'}, 401);

    const rows = await database().all<{
      employee_mobile: string; preferred_name: string; designation: string | null;
      joining_date: string | null; current_month_days: number; prev_month_days: number;
      current_month_cash_minor: string; prev_month_cash_minor: string; payable_minor: string;
    }>(
      `SELECT employee_mobile, preferred_name, designation, joining_date::text,
              current_month_days, prev_month_days,
              current_month_cash_minor::text, prev_month_cash_minor::text, payable_minor::text
         FROM public.attendance_summary
        ORDER BY preferred_name`,
    );
    return json({rows: rows.results, checkedAt: new Date().toISOString()});
  } catch (error) {
    return failure(error);
  }
}
