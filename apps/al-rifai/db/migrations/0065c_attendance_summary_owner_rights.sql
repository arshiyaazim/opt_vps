-- 0065c: attendance_summary runs with the view owner's rights.
--
-- 0065b created the view with security_invoker = true. That is the right default for
-- a view that simply re-exposes rows a caller may already read, but here it fails
-- closed in the wrong place: the caller (alrifai_app) has no SELECT on
-- cash_instructions, so any query that reads the cash columns is denied. count(*)
-- still worked only because the planner dropped the unused LEFT JOIN.
--
-- Granting alrifai_app SELECT on cash_instructions would fix the symptom by widening
-- a deliberate boundary — the raw cash table stays unreadable by the application
-- role. So the view runs as its owner (vps_pg_admin) instead and exposes only
-- per-employee monthly aggregates, never raw instructions. Both roles keep SELECT on
-- the view alone.

BEGIN;

ALTER VIEW public.attendance_summary SET (security_invoker = false);

COMMENT ON VIEW public.attendance_summary IS
 'Per-employee attendance days and cash-instruction value for the current and previous month. Runs with owner rights so callers need no access to cash_instructions; exposes aggregates only.';

COMMIT;
