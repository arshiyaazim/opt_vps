-- 0069: attendance hours/notes, and the admin direct-write path.
--
-- The attendance form captures hours and a note per entry; 0065 had no place for
-- them. Both are nullable, so existing program-derived rows stay untouched.
--
-- Admin submissions must not travel through workflow_decide(): the decision function
-- refuses a reviewer who is also the submitter, and an admin approving their own
-- entry is exactly that. This function is the direct door: it resolves the caller
-- from cash_portal_users, requires ADMIN, and inserts a CONFIRMED row. Users keep the
-- staged path (workflow_submit → workflow_decide by someone else).

BEGIN;

ALTER TABLE public.attendance_entries
  ADD COLUMN IF NOT EXISTS hours numeric(4,2),
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.attendance_entries
  DROP CONSTRAINT IF EXISTS attendance_entries_hours_check,
  DROP CONSTRAINT IF EXISTS attendance_entries_notes_check;

ALTER TABLE public.attendance_entries
  ADD CONSTRAINT attendance_entries_hours_check CHECK (hours IS NULL OR (hours > 0 AND hours <= 24)),
  ADD CONSTRAINT attendance_entries_notes_check CHECK (notes IS NULL OR length(notes) <= 500);

COMMENT ON COLUMN public.attendance_entries.hours IS 'Worked hours for the shift, when recorded. NULL for program-derived rows.';

-- Keep the reviewed insert in step with the new columns.
CREATE OR REPLACE FUNCTION public.workflow_apply_attendance(p_payload jsonb, p_actor text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mobile text := public.normalize_mobile(p_payload->>'employee_mobile');
  v_date   date;
  v_shift  text := nullif(btrim(coalesce(p_payload->>'shift','')), '');
  v_hours  numeric;
  v_notes  text := nullif(btrim(coalesce(p_payload->>'notes','')), '');
  v_id     text;
BEGIN
  IF v_mobile IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_MOBILE_INVALID'; END IF;
  BEGIN
    v_date := (p_payload->>'attendance_date')::date;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'ATTENDANCE_DATE_INVALID';
  END;
  IF p_payload ? 'hours' AND nullif(btrim(coalesce(p_payload->>'hours','')),'') IS NOT NULL THEN
    BEGIN v_hours := (p_payload->>'hours')::numeric;
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'HOURS_INVALID'; END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employee_master WHERE scope_account='wa-01' AND employee_mobile = v_mobile) THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND';
  END IF;

  v_id := encode(sha256(convert_to('attendance|'||v_mobile||'|'||v_date||'|'||coalesce(v_shift,''),'UTF8')),'hex');

  INSERT INTO public.attendance_entries
    (id, employee_mobile, attendance_date, shift, source, source_ref, status, submitted_by, reviewed_by, reviewed_at, hours, notes)
  VALUES (v_id, v_mobile, v_date, v_shift, 'manual', null, 'CONFIRMED', p_actor, p_actor, now(), v_hours, v_notes)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

-- Admin direct write. Same validation as the reviewed path, minus the queue.
CREATE OR REPLACE FUNCTION public.attendance_create_direct(p_payload jsonb, p_actor text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  a record;
  v_mobile text := public.normalize_mobile(p_payload->>'employee_mobile');
  v_date   date;
  v_shift  text := nullif(btrim(coalesce(p_payload->>'shift','')), '');
  v_hours  numeric;
  v_notes  text := nullif(btrim(coalesce(p_payload->>'notes','')), '');
  v_id     text;
BEGIN
  SELECT id, role, active INTO a FROM public.cash_portal_users WHERE id = p_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTOR_UNKNOWN'; END IF;
  IF NOT a.active THEN RAISE EXCEPTION 'ACTOR_INACTIVE'; END IF;
  IF a.role <> 'ADMIN' THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  IF v_mobile IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_MOBILE_INVALID'; END IF;
  BEGIN
    v_date := (p_payload->>'attendance_date')::date;
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'ATTENDANCE_DATE_INVALID'; END;
  IF p_payload ? 'hours' AND nullif(btrim(coalesce(p_payload->>'hours','')),'') IS NOT NULL THEN
    BEGIN v_hours := (p_payload->>'hours')::numeric;
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'HOURS_INVALID'; END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employee_master WHERE scope_account='wa-01' AND employee_mobile = v_mobile) THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND';
  END IF;

  v_id := encode(sha256(convert_to('attendance|'||v_mobile||'|'||v_date||'|'||coalesce(v_shift,''),'UTF8')),'hex');

  INSERT INTO public.attendance_entries
    (id, employee_mobile, attendance_date, shift, source, source_ref, status, submitted_by, reviewed_by, reviewed_at, hours, notes)
  VALUES (v_id, v_mobile, v_date, v_shift, 'manual', null, 'CONFIRMED', p_actor, p_actor, now(), v_hours, v_notes)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_create_direct(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_create_direct(jsonb,text) TO alrifai_app, ir_review_runtime;

COMMIT;
