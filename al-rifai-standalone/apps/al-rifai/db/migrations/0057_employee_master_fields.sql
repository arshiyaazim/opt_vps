-- 0057: employee master fields (phase 1 of the approved employee overhaul).
--
-- Every column is nullable and starts empty: joining date, designation, rate and
-- duty type are to be filled by the owner, not inferred here. No CHECK constraint
-- is added for designation or rate_unit yet, per the approved phase 1 scope.
--
-- Nothing here changes ingestion. The Cash path (lib/cash-publish.ts) still inserts
-- new employees with state='REVIEW'; its ON CONFLICT branch touches names, aliases
-- and timestamps only, so a confirmed row is never pushed back to REVIEW.

BEGIN;

ALTER TABLE public.employee_master
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS designation  text,
  ADD COLUMN IF NOT EXISTS rate_minor   integer,
  ADD COLUMN IF NOT EXISTS rate_unit    text,
  ADD COLUMN IF NOT EXISTS duty_type    text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by text;

COMMENT ON COLUMN public.employee_master.joining_date IS
 'Employment start date. Nullable: no verified source populates it yet.';
COMMENT ON COLUMN public.employee_master.designation IS
 'Free-text job title. Intentionally unconstrained in phase 1.';
COMMENT ON COLUMN public.employee_master.rate_minor IS
 'Agreed rate in minor units (paisa). Nullable: no verified rate source exists.';
COMMENT ON COLUMN public.employee_master.rate_unit IS
 'Intended values: shift | day | month. Unconstrained in phase 1.';
COMMENT ON COLUMN public.employee_master.duty_type IS
 'Intended values: escort | tally | security | cash | other. Unconstrained in phase 1.';
COMMENT ON COLUMN public.employee_master.confirmed_at IS
 'When the row was moved from REVIEW to CONFIRMED.';
COMMENT ON COLUMN public.employee_master.confirmed_by IS
 'Who confirmed the row: owner_bulk_confirm_phase1, escort_backfill_phase2, vessel_auto_create, or an operator.';

COMMIT;
