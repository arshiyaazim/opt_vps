-- 0067b: correct the audit row id in workflow_decide.
--
-- 0067 inserted cash_portal_audit.id from gen_random_uuid()::text, which is a 36
-- character UUID; the table's own CHECK requires 64 hex characters, so every decided
-- item aborted. Caught by the first approval test, before any real submission existed.
-- The body is otherwise identical: the id is now a sha256 like every other audit path
-- in this codebase.
--
-- CREATE OR REPLACE supersedes the 0067 definition in place; both ship together, so no
-- deployment ever runs the broken intermediate.

BEGIN;

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
  VALUES (encode(sha256(convert_to(p_item||'|audit|'||p_decision||'|'||p_actor||'|'||clock_timestamp()::text,'UTF8')),'hex'),
          p_actor, p_item, 'REVIEW_'||p_decision,
          jsonb_build_object('domain', it.domain, 'action_kind', it.action,
                             'applied_ref', v_ref, 'edited', p_edited_payload IS NOT NULL,
                             'submitted_by', it.submitted_by_user_ref));

  RETURN jsonb_build_object('ok', true, 'id', p_item, 'status', p_decision,
                            'applied_ref', v_ref, 'applied', v_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_decide(text,text,text,integer,text,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workflow_decide(text,text,text,integer,text,jsonb,text,text) TO alrifai_app, ir_review_runtime;

COMMIT;
