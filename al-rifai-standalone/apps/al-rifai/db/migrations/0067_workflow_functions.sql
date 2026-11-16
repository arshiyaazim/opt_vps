-- 0067: the workflow functions — submit, decide, withdraw, and the per-domain appliers.
--
-- Submit and decide are the only write doors, both SECURITY DEFINER with the role
-- resolved from cash_portal_users (never from the caller's claim or a parameter).
--
-- Two things are deliberately owned by the API layer rather than the database:
--   * p_vessel_actor — the verified person ref the vessel command functions demand.
--     It lives in ALRIFAI_VESSEL_COMMAND_ACTOR, and duplicating that mapping in a
--     table would create a second source of truth. The function still validates it
--     against identity_review_candidate.records, so a bogus ref is rejected.
--   * p_program_id — the deterministic program identity from programIdFor(). Reusing
--     the Node implementation guarantees an approved submission and a direct admin
--     write produce the same id for the same vessel pair, so the two paths cannot
--     create duplicate programs.
--
-- Approval is atomic: the live write, the decision row, the item status and the audit
-- entry all commit or all roll back together.

BEGIN;

-- ---------- submit ----------

CREATE OR REPLACE FUNCTION public.workflow_submit(
  p_domain     text,
  p_action     text,
  p_target_ref text,
  p_payload    jsonb,
  p_submitter  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  u        record;
  v_cap    text;
  v_hash   text;
  v_id     text;
  v_row    record;
  v_target text;
  v_escort text;
  v_name   text;
  v_result text;
BEGIN
  SELECT id, role, active, capabilities INTO u FROM public.cash_portal_users WHERE id = p_submitter;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBMITTER_UNKNOWN'; END IF;
  IF NOT u.active THEN RAISE EXCEPTION 'SUBMITTER_INACTIVE'; END IF;

  IF p_domain NOT IN ('VESSEL_PROGRAM','VESSEL_EDIT','CASH','EMPLOYEE','ATTENDANCE','PROGRAM_RELEASE') THEN
    RAISE EXCEPTION 'DOMAIN_INVALID';
  END IF;
  IF p_action NOT IN ('CREATE','UPDATE','DELETE') THEN RAISE EXCEPTION 'ACTION_INVALID'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'PAYLOAD_INVALID'; END IF;

  v_target := nullif(btrim(coalesce(p_target_ref,'')), '');
  IF p_action <> 'CREATE' AND v_target IS NULL THEN RAISE EXCEPTION 'TARGET_REQUIRED'; END IF;

  v_cap := CASE p_domain
             WHEN 'ATTENDANCE' THEN 'attendance.submit'
             WHEN 'EMPLOYEE'   THEN 'employee.submit'
             WHEN 'CASH'       THEN 'cash.submit'
             ELSE 'vessel.submit'
           END;
  IF u.role <> 'ADMIN' AND NOT (coalesce(u.capabilities,'[]'::jsonb) ? v_cap) THEN
    RAISE EXCEPTION 'CAPABILITY_REQUIRED:%', v_cap;
  END IF;

  v_hash := encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  v_id   := encode(sha256(convert_to(p_domain||'|'||p_action||'|'||coalesce(v_target,'')||'|'||p_submitter||'|'||v_hash,'UTF8')),'hex');

  INSERT INTO public.review_items (id, domain, action, target_ref, payload, payload_hash, submitted_by_user_ref, submitted_by_role)
  VALUES (v_id, p_domain, p_action, v_target, p_payload, v_hash, p_submitter, u.role)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    -- Idempotent resubmit, or a conflicting open request for the same record.
    SELECT id, status INTO v_row FROM public.review_items
     WHERE submitted_by_user_ref = p_submitter AND payload_hash = v_hash;
    IF FOUND THEN
      RETURN jsonb_build_object('id', v_row.id, 'status', v_row.status, 'deduped', true);
    END IF;
    RAISE EXCEPTION 'PENDING_REVIEW_EXISTS';
  END IF;

  -- A user-submitted program must not mint a confirmed identity. The escort row is
  -- created for the admin to see, held at REVIEW, and promoted only on approval.
  IF p_domain = 'VESSEL_PROGRAM' THEN
    v_escort := public.normalize_mobile(p_payload->>'escortMobile');
    v_name   := nullif(btrim(coalesce(p_payload->>'escortName','')), '');
    IF v_escort IS NOT NULL THEN
      v_result := public.create_employee_if_new(v_escort, v_name, 'vessel_submit', 'escort');
      IF v_result = 'created' THEN
        UPDATE public.employee_master
           SET state = 'REVIEW', updated_at = now()
         WHERE scope_account = 'wa-01' AND employee_mobile = v_escort AND state = 'CONFIRMED';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'status', 'PENDING', 'deduped', false);
END;
$$;

-- ---------- withdraw (submitter only) ----------

CREATE OR REPLACE FUNCTION public.workflow_withdraw(p_item text, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE it record;
BEGIN
  SELECT * INTO it FROM public.review_items WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  IF it.submitted_by_user_ref <> p_actor THEN RAISE EXCEPTION 'NOT_SUBMITTER'; END IF;
  IF it.status <> 'PENDING' THEN RAISE EXCEPTION 'ITEM_NOT_PENDING'; END IF;

  UPDATE public.review_items
     SET status = 'WITHDRAWN', decided_by = p_actor, decided_at = now(), version = version + 1
   WHERE id = p_item;
  INSERT INTO public.review_decisions (id, item_id, decision, actor_user_ref, actor_role, note, payload_hash)
  VALUES (encode(sha256(convert_to(p_item||'|WITHDRAWN|'||p_actor||'|'||clock_timestamp()::text||'|'||gen_random_uuid()::text,'UTF8')),'hex'),
          p_item, 'WITHDRAWN', p_actor, it.submitted_by_role, 'withdrawn by submitter', it.payload_hash);
  RETURN jsonb_build_object('ok', true, 'id', p_item, 'status', 'WITHDRAWN');
END;
$$;

-- ---------- domain appliers (internal; not granted to any role) ----------

CREATE OR REPLACE FUNCTION public.workflow_apply_vessel_program(
  p_payload jsonb, p_item text, p_vessel_actor text, p_program_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mother  text := nullif(btrim(coalesce(p_payload->>'motherVessel','')), '');
  v_lighter text := nullif(btrim(coalesce(p_payload->>'lighterVessel','')), '');
  v_start   text := nullif(btrim(coalesce(p_payload->>'startDate','')), '');
  v_shift   text := nullif(btrim(coalesce(p_payload->>'shift','')), '');
  v_mobile  text := nullif(btrim(coalesce(p_payload->>'escortMobile','')), '');
  v_name    text := nullif(btrim(coalesce(p_payload->>'escortName','')), '');
  v_result  jsonb;
  v_mob     text;
BEGIN
  IF v_mother IS NULL OR v_lighter IS NULL THEN RAISE EXCEPTION 'VESSEL_PAIR_REQUIRED'; END IF;
  IF v_start IS NULL THEN RAISE EXCEPTION 'START_DATE_REQUIRED'; END IF;
  IF v_shift IS NULL THEN v_shift := 'D'; END IF;
  IF p_program_id IS NULL OR btrim(p_program_id) = '' THEN RAISE EXCEPTION 'PROGRAM_ID_REQUIRED'; END IF;
  IF p_vessel_actor IS NULL OR NOT public.alrifai_vessel_actor_verified(p_vessel_actor) THEN
    RAISE EXCEPTION 'VESSEL_ACTOR_REQUIRED';
  END IF;

  v_result := public.alrifai_vessel_program_add(
    p_program_id, v_mother, v_lighter,
    coalesce(p_payload->>'masterMobile',''), coalesce(p_payload->>'destination',''),
    coalesce(v_name,''), coalesce(v_mobile,''), v_start, v_shift,
    p_vessel_actor, 'review:'||p_item, coalesce(p_payload->>'note',''));

  -- The escort identity was staged at submission; approval is what makes it real.
  v_mob := public.normalize_mobile(v_mobile);
  IF v_mob IS NOT NULL THEN
    PERFORM public.create_employee_if_new(v_mob, v_name, 'review_approve', 'escort');
    UPDATE public.employee_master
       SET state = 'CONFIRMED', confirmed_at = now(), confirmed_by = 'review_approve', updated_at = now()
     WHERE scope_account = 'wa-01' AND employee_mobile = v_mob AND state = 'REVIEW';
  END IF;

  RETURN p_program_id;
END;
$$;

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
  v_id     text;
BEGIN
  IF v_mobile IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_MOBILE_INVALID'; END IF;
  BEGIN
    v_date := (p_payload->>'attendance_date')::date;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'ATTENDANCE_DATE_INVALID';
  END;
  IF NOT EXISTS (SELECT 1 FROM public.employee_master WHERE scope_account='wa-01' AND employee_mobile = v_mobile) THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND';
  END IF;

  v_id := encode(sha256(convert_to('attendance|'||v_mobile||'|'||v_date||'|'||coalesce(v_shift,''),'UTF8')),'hex');

  INSERT INTO public.attendance_entries
    (id, employee_mobile, attendance_date, shift, source, source_ref, status, submitted_by, reviewed_by, reviewed_at)
  VALUES (v_id, v_mobile, v_date, v_shift, 'manual', null, 'CONFIRMED', p_actor, p_actor, now())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_apply_employee(p_payload jsonb, p_actor text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mobile text := public.normalize_mobile(p_payload->>'employee_mobile');
  v_name   text := nullif(btrim(coalesce(p_payload->>'preferred_name','')), '');
  v_desig  text := nullif(lower(btrim(coalesce(p_payload->>'designation',''))), '');
  v_duty   text := nullif(lower(btrim(coalesce(p_payload->>'duty_type',''))), '');
  v_join   date;
BEGIN
  IF v_mobile IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_MOBILE_INVALID'; END IF;
  IF p_payload ? 'joining_date' AND nullif(btrim(coalesce(p_payload->>'joining_date','')),'') IS NOT NULL THEN
    BEGIN v_join := (p_payload->>'joining_date')::date;
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'JOINING_DATE_INVALID'; END;
  END IF;

  PERFORM public.create_employee_if_new(v_mobile, v_name, 'review_approve', v_duty);

  UPDATE public.employee_master
     SET state         = 'CONFIRMED',
         designation   = coalesce(v_desig, designation),
         joining_date  = coalesce(v_join, joining_date),
         confirmed_at  = now(),
         confirmed_by  = 'review_approve',
         updated_at    = now()
   WHERE scope_account = 'wa-01' AND employee_mobile = v_mobile;

  RETURN v_mobile;
END;
$$;

-- ---------- decide ----------

CREATE OR REPLACE FUNCTION public.workflow_decide(
  p_item            text,
  p_decision        text,
  p_actor           text,
  p_expected_version integer,
  p_note            text,
  p_edited_payload  jsonb DEFAULT NULL,
  p_vessel_actor    text  DEFAULT NULL,
  p_program_id      text  DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  it       record;
  a        record;
  v_note   text;
  v_payload jsonb;
  v_hash   text;
  v_ref    text;
  v_applied boolean := false;
BEGIN
  IF p_decision NOT IN ('APPROVED','REJECTED','CORRECTION_REQUESTED') THEN RAISE EXCEPTION 'DECISION_INVALID'; END IF;

  SELECT id, role, active INTO a FROM public.cash_portal_users WHERE id = p_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTOR_UNKNOWN'; END IF;
  IF NOT a.active THEN RAISE EXCEPTION 'ACTOR_INACTIVE'; END IF;
  IF a.role <> 'ADMIN' THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  SELECT * INTO it FROM public.review_items WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  IF it.submitted_by_user_ref = p_actor THEN RAISE EXCEPTION 'REVIEWER_IS_SUBMITTER'; END IF;
  IF it.status <> 'PENDING' THEN RAISE EXCEPTION 'ITEM_NOT_PENDING'; END IF;
  IF p_expected_version IS NULL OR it.version <> p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  v_note := btrim(coalesce(p_note,''));
  IF p_decision <> 'APPROVED' AND v_note = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF length(v_note) > 2000 THEN RAISE EXCEPTION 'NOTE_TOO_LONG'; END IF;

  v_payload := coalesce(p_edited_payload, it.payload);
  IF v_payload IS NULL OR jsonb_typeof(v_payload) <> 'object' THEN RAISE EXCEPTION 'PAYLOAD_INVALID'; END IF;
  v_hash := encode(sha256(convert_to(v_payload::text,'UTF8')),'hex');

  IF p_decision = 'APPROVED' THEN
    CASE it.domain
      WHEN 'VESSEL_PROGRAM' THEN
        v_ref := public.workflow_apply_vessel_program(v_payload, it.id, p_vessel_actor, p_program_id);
      WHEN 'ATTENDANCE' THEN
        v_ref := public.workflow_apply_attendance(v_payload, p_actor);
      WHEN 'EMPLOYEE' THEN
        v_ref := public.workflow_apply_employee(v_payload, p_actor);
      ELSE
        RAISE EXCEPTION 'DOMAIN_NOT_IMPLEMENTED:%', it.domain;
    END CASE;
    v_applied := true;
  END IF;

  UPDATE public.review_items
     SET status        = p_decision,
         decision_note = v_note,
         decided_by    = p_actor,
         decided_at    = now(),
         applied_ref   = v_ref,
         version       = version + 1
   WHERE id = p_item;

  INSERT INTO public.review_decisions (id, item_id, decision, actor_user_ref, actor_role, note, payload_hash, applied_ref)
  VALUES (encode(sha256(convert_to(p_item||'|'||p_decision||'|'||p_actor||'|'||clock_timestamp()::text||'|'||gen_random_uuid()::text,'UTF8')),'hex'),
          p_item, p_decision, p_actor, a.role, v_note, v_hash, v_ref);

  INSERT INTO public.cash_portal_audit (id, actor_id, target_id, action, details)
  VALUES (gen_random_uuid()::text, p_actor, p_item, 'REVIEW_'||p_decision,
          jsonb_build_object('domain', it.domain, 'action_kind', it.action,
                             'applied_ref', v_ref, 'edited', p_edited_payload IS NOT NULL,
                             'submitted_by', it.submitted_by_user_ref));

  RETURN jsonb_build_object('ok', true, 'id', p_item, 'status', p_decision,
                            'applied_ref', v_ref, 'applied', v_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_submit(text,text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_decide(text,text,text,integer,text,jsonb,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_withdraw(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_apply_vessel_program(jsonb,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_apply_attendance(jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_apply_employee(jsonb,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.workflow_submit(text,text,text,jsonb,text) TO alrifai_app, ir_review_runtime;
GRANT EXECUTE ON FUNCTION public.workflow_decide(text,text,text,integer,text,jsonb,text,text) TO alrifai_app, ir_review_runtime;
GRANT EXECUTE ON FUNCTION public.workflow_withdraw(text,text) TO alrifai_app, ir_review_runtime;

COMMIT;
