-- 0055: let the apply flow recalculate pay (R1 Step 4).
--
-- Applying a release must also refresh program_pay, otherwise the register shows
-- ৳— for a duty that now has an end date. recalculate_program_pay() is SECURITY
-- INVOKER and writes program_pay, which alrifai_app and ir_review_runtime can only
-- read, so the call would fail on grants.
--
-- Rather than granting INSERT/UPDATE on program_pay to the request roles, the
-- function becomes SECURITY DEFINER with a pinned search_path — the same pattern
-- the vessel command layer already uses. It only ever writes derived state, never
-- programs, and recomputes exclusively from escort_rate_config and the program row.
--
-- No data change here; this migration only alters the function and its grants.

BEGIN;

ALTER FUNCTION public.recalculate_program_pay(text) SECURITY DEFINER;
ALTER FUNCTION public.recalculate_program_pay(text) SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.recalculate_program_pay(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_program_pay(text) TO alrifai_app;
GRANT EXECUTE ON FUNCTION public.recalculate_program_pay(text) TO ir_review_runtime;

COMMENT ON FUNCTION public.recalculate_program_pay(text) IS
 'Derive and upsert program_pay for one program. SECURITY DEFINER so the apply flow (alrifai_app / ir_review_runtime) can refresh derived pay without table grants. Never touches programs.';

COMMIT;
