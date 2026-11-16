-- 0064: designation vocabulary on employee_master.
--
-- designation was added by 0057 as deliberately unconstrained free text. RBAC-2
-- needs a closed vocabulary because the attendance page renders it as a dropdown
-- and the review queue must show a stable label. The eleven values below are the
-- owner's list, stored lower-case so comparisons never depend on how a human typed
-- them.
--
-- Backfill: the 75 employees already carrying duty_type='escort' are escorts, so
-- their designation is set to match. Everything else stays NULL (owner's to fill),
-- which the CHECK explicitly permits.

BEGIN;

ALTER TABLE public.employee_master DROP CONSTRAINT IF EXISTS employee_master_designation_check;

ALTER TABLE public.employee_master
  ADD CONSTRAINT employee_master_designation_check
  CHECK (designation IS NULL OR designation IN (
    'operation','office_assistant','escort','security','ghat_tallyman',
    'customer_service','marketing_officer','supervisor','in_charge',
    'accounts_audit','hr_admin'
  ));

COMMENT ON COLUMN public.employee_master.designation IS
 'Job designation, lower-case, constrained to the owner-approved vocabulary by employee_master_designation_check. NULL means not yet assigned.';

-- Data-only step; idempotent because of the IS NULL guard.
UPDATE public.employee_master
   SET designation = 'escort',
       updated_at  = now()
 WHERE duty_type = 'escort'
   AND designation IS NULL;

COMMIT;
