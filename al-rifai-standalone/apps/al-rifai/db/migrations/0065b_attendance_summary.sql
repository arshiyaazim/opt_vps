-- 0065b: attendance_summary — one row per confirmed employee for the attendance page.
--
-- The approved sketch joined attendance and cash in the same FROM clause. That
-- multiplies rows (an employee with 20 attendance days and 5 instructions would
-- count 100), so the numbers would have been wrong by a large factor. This version
-- aggregates each side first and joins the small results, which is also far cheaper
-- than normalising every cash row once per employee.
--
-- Column names and semantics match the approved spec. Two deliberate notes:
--   * days count CONFIRMED attendance only, so a pending submission never inflates
--     a month before it is reviewed.
--   * cash is the value of cash *instructions* recorded in the month. There is no
--     posted/settled state in cash_instructions for the current epoch, so calling it
--     "received" would overstate it; the UI labels it as instructed cash.
--   * payable_minor stays 0, as specified: it is derived in the app layer once the
--     rate model is decided (B5 remains blocked on that data-model question).
--
-- security_invoker: the view runs with the caller's rights, so it cannot be used to
-- read employee_master or cash_instructions with the owner's privileges.

BEGIN;

CREATE OR REPLACE VIEW public.attendance_summary
WITH (security_invoker = true) AS
WITH month_start AS (
  SELECT date_trunc('month', current_date)::date AS this_month,
         (date_trunc('month', current_date) - interval '1 month')::date AS last_month,
         (date_trunc('month', current_date) + interval '1 month')::date AS next_month
), att AS (
  SELECT a.employee_mobile,
         count(*) FILTER (WHERE a.attendance_date >= m.this_month AND a.attendance_date < m.next_month) AS current_month_days,
         count(*) FILTER (WHERE a.attendance_date >= m.last_month AND a.attendance_date < m.this_month) AS prev_month_days
    FROM public.attendance_entries a CROSS JOIN month_start m
   WHERE a.status = 'CONFIRMED'
   GROUP BY a.employee_mobile
), cash AS (
  SELECT public.normalize_mobile(c.employee_mobile) AS mobile,
         coalesce(sum(c.amount_minor) FILTER (WHERE c.created_at >= m.this_month AND c.created_at < m.next_month), 0) AS current_month_cash_minor,
         coalesce(sum(c.amount_minor) FILTER (WHERE c.created_at >= m.last_month AND c.created_at < m.this_month), 0) AS prev_month_cash_minor
    FROM public.cash_instructions c CROSS JOIN month_start m
   WHERE public.normalize_mobile(c.employee_mobile) IS NOT NULL
   GROUP BY 1
)
SELECT e.employee_mobile,
       e.preferred_name,
       e.designation,
       e.joining_date,
       coalesce(att.current_month_days, 0)::bigint AS current_month_days,
       coalesce(att.prev_month_days, 0)::bigint    AS prev_month_days,
       coalesce(cash.current_month_cash_minor, 0)::bigint AS current_month_cash_minor,
       coalesce(cash.prev_month_cash_minor, 0)::bigint    AS prev_month_cash_minor,
       0::bigint AS payable_minor
  FROM public.employee_master e
  LEFT JOIN att  ON att.employee_mobile = e.employee_mobile
  LEFT JOIN cash ON cash.mobile = e.employee_mobile
 WHERE e.state = 'CONFIRMED';

COMMENT ON VIEW public.attendance_summary IS
 'Per-employee attendance days and cash-instruction value for the current and previous month. Aggregates are pre-collapsed so attendance and cash cannot multiply each other.';

GRANT SELECT ON public.attendance_summary TO alrifai_app;
GRANT SELECT ON public.attendance_summary TO ir_review_runtime;

COMMIT;
