-- 0061: refuse a second employee row for the same person under a different format.
--
-- The primary key is (scope_account, employee_mobile), which only catches byte-equal
-- duplicates. Before this function, '+8801712345678' and '01712345678' could both be
-- inserted and the person would exist twice.
--
-- The check compares normalised values across rows in the same scope and ignores the
-- row's own exact value, so a normal UPDATE (duty_type, names, timestamps) is never
-- blocked. Violations raise SQLSTATE 23505 (unique_violation) so callers can treat
-- them like the existing key conflict; the message names the stored value so the
-- caller can adopt it.
--
-- employee_master's CHECK already requires +8801XXXXXXXXX, so no legitimate writer
-- can reach this trigger with a merely reformatted duplicate; it is a backstop for
-- future import or maintenance paths.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_employee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_mobile text;
BEGIN
  SELECT e.employee_mobile INTO existing_mobile
    FROM public.employee_master e
   WHERE e.scope_account = NEW.scope_account
     AND public.normalize_mobile(e.employee_mobile) = public.normalize_mobile(NEW.employee_mobile)
     AND e.employee_mobile <> NEW.employee_mobile
   LIMIT 1;

  IF existing_mobile IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate employee: mobile % already exists as %',
      NEW.employee_mobile, existing_mobile
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_employee ON public.employee_master;
CREATE TRIGGER trg_prevent_duplicate_employee
  BEFORE INSERT OR UPDATE ON public.employee_master
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_employee();

COMMIT;
