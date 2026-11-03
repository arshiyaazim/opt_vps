-- 0060: programs joined to their employee identity record.
--
-- A read-only convenience view for reporting and for checking identity coverage.
-- It does not replace programs and nothing writes through it.
--
-- security_invoker: the view runs with the caller's privileges, so it cannot be
-- used to read employee_master with the owner's rights. alrifai_app already holds
-- SELECT on both tables.
--
-- The join is on the normalised mobile, not on the raw text, because the raw column
-- is free text. A program with an empty or malformed mobile yields emp_mobile NULL
-- and is a visible orphan rather than a silent mismatch.

BEGIN;

CREATE OR REPLACE VIEW public.program_with_employee
WITH (security_invoker = true) AS
SELECT p.*,
       e.employee_mobile   AS emp_mobile,
       e.preferred_name    AS emp_name,
       e.name_aliases      AS emp_aliases,
       e.state             AS emp_state,
       e.duty_type         AS emp_duty_type,
       e.designation       AS emp_designation,
       e.joining_date      AS emp_joining_date,
       e.rate_minor        AS emp_rate_minor,
       e.rate_unit         AS emp_rate_unit
  FROM public.programs p
  LEFT JOIN public.employee_master e
    ON public.normalize_mobile(p."escortMobile") = e.employee_mobile
   AND e.scope_account = 'wa-01';

COMMENT ON VIEW public.program_with_employee IS
 'Programs left-joined to employee_master on the normalised escort mobile. emp_mobile IS NULL marks a program whose escort has no identity record.';

GRANT SELECT ON public.program_with_employee TO alrifai_app;

COMMIT;
