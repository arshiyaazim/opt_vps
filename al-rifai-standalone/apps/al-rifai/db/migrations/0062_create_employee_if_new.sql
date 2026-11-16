-- 0062: the single approved write path for new employee identities.
--
-- employee_master is owned by vps_pg_admin and the app roles hold SELECT only, so
-- application code cannot insert an employee directly. Rather than grant INSERT on
-- the table (which would let any query create, rename or re-state an employee), this
-- function is the one reviewed door: it normalises the mobile, refuses anything that
-- is not a real Bangladeshi number, and only ever creates a CONFIRMED escort-side
-- identity or appends a name alias.
--
-- Returns 'created' | 'exists' | 'alias_added' so the caller can surface the outcome
-- (the vessel UI turns 'created'/'alias_added' into a toast).
--
-- Deliberate behaviour choices:
--  * The mobile is stored normalised (+8801XXXXXXXXX), so the same person cannot be
--    filed twice under two formats. normalize_mobile() is the same function the join
--    view and the duplicate trigger use.
--  * preferred_name is never overwritten. A later spelling becomes an alias, so the
--    name a human first recorded survives.
--  * state is always 'CONFIRMED' today because the admin is the only operator and the
--    RBAC/review workflow is explicitly deferred. This is the one place that would
--    change when review states arrive.
--  * duty_type is validated against the approved vocabulary instead of accepting
--    free text, so a typo cannot introduce a sixth duty category.
--  * Cash ingestion is NOT routed through this function: lib/cash-publish.ts keeps
--    inserting new employees as REVIEW, unchanged.
--
-- The duplicate trigger from 0061 stays the backstop for any other writer.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_employee_if_new(
  p_mobile    text,
  p_name      text,
  p_source    text,
  p_duty_type text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mobile        text;
  v_name          text;
  v_duty          text;
  v_existing_name text;
  v_inserted      integer := 0;
BEGIN
  v_mobile := public.normalize_mobile(p_mobile);
  IF v_mobile IS NULL THEN
    RAISE EXCEPTION 'INVALID_MOBILE:%', coalesce(p_mobile, '(null)')
      USING ERRCODE = '22023';
  END IF;

  v_name := nullif(btrim(coalesce(p_name, '')), '');

  v_duty := nullif(lower(btrim(coalesce(p_duty_type, ''))), '');
  IF v_duty IS NOT NULL
     AND v_duty NOT IN ('escort', 'tally', 'security', 'cash', 'other') THEN
    RAISE EXCEPTION 'INVALID_DUTY_TYPE:%', p_duty_type USING ERRCODE = '22023';
  END IF;

  SELECT e.preferred_name INTO v_existing_name
    FROM public.employee_master e
   WHERE e.scope_account = 'wa-01'
     AND e.employee_mobile = v_mobile;

  IF FOUND THEN
    IF v_name IS NOT NULL
       AND v_name <> coalesce(v_existing_name, '')
       AND NOT (v_name = ANY (
             coalesce((SELECT e.name_aliases FROM public.employee_master e
                        WHERE e.scope_account = 'wa-01' AND e.employee_mobile = v_mobile),
                      ARRAY[]::text[])
           )) THEN
      UPDATE public.employee_master
         SET name_aliases = array_append(coalesce(name_aliases, ARRAY[]::text[]), v_name),
             last_seen_at = GREATEST(last_seen_at, now()),
             updated_at   = now()
       WHERE scope_account = 'wa-01' AND employee_mobile = v_mobile;
      RETURN 'alias_added';
    END IF;

    UPDATE public.employee_master
       SET last_seen_at = GREATEST(last_seen_at, now()),
           updated_at   = now()
     WHERE scope_account = 'wa-01' AND employee_mobile = v_mobile;
    RETURN 'exists';
  END IF;

  INSERT INTO public.employee_master (
    scope_account, employee_mobile, preferred_name, name_aliases, state, duty_type,
    first_seen_at, last_seen_at, created_at, updated_at, confirmed_at, confirmed_by
  ) VALUES (
    'wa-01', v_mobile,
    coalesce(v_name, 'Unknown'),
    ARRAY[coalesce(v_name, 'Unknown')]::text[],
    'CONFIRMED', v_duty,
    now(), now(), now(), now(), now(),
    coalesce(nullif(btrim(coalesce(p_source, '')), ''), 'create_employee_if_new')
  )
  ON CONFLICT (scope_account, employee_mobile) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted > 0 THEN
    RETURN 'created';
  END IF;

  -- Lost a race with a concurrent caller: the row exists now, so behave like 'exists'.
  UPDATE public.employee_master
     SET last_seen_at = GREATEST(last_seen_at, now()),
         updated_at   = now()
   WHERE scope_account = 'wa-01' AND employee_mobile = v_mobile;
  RETURN 'exists';
END;
$$;

COMMENT ON FUNCTION public.create_employee_if_new(text, text, text, text) IS
 'Normalises a mobile and creates a CONFIRMED employee_master row, or appends a name alias to the existing one. Returns created | exists | alias_added. The only approved application write path into employee_master.';

REVOKE ALL ON FUNCTION public.create_employee_if_new(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_employee_if_new(text, text, text, text) TO alrifai_app;
GRANT EXECUTE ON FUNCTION public.create_employee_if_new(text, text, text, text) TO ir_review_runtime;

COMMIT;
