-- 0070: keep the Cash review queue visible in /review without moving its authority.
--
-- Cash already had a working two-step flow (cash_submissions → cash_submission_reviews)
-- with its own policy, and the Owner's instruction is that posting logic stays intact.
-- So cash is mirrored into review_items for visibility, and the decision is still made
-- by the cash endpoints. This function closes that mirror row when the cash decision is
-- recorded, so the queue never shows a stale PENDING item.
--
-- It also backfills cash.read and cash.submit onto the stored capability arrays. Those
-- are role defaults in code, but workflow_submit() checks the stored array, so a USER
-- submitting cash would have been refused with CAPABILITY_REQUIRED:cash.submit.

BEGIN;

CREATE OR REPLACE FUNCTION public.cash_review_mirror_close(
  p_submission_id text,
  p_status        text,
  p_actor         text,
  p_note          text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  a     record;
  it    record;
  v_n   integer := 0;
BEGIN
  SELECT id, role, active INTO a FROM public.cash_portal_users WHERE id = p_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTOR_UNKNOWN'; END IF;
  IF NOT a.active THEN RAISE EXCEPTION 'ACTOR_INACTIVE'; END IF;
  IF a.role <> 'ADMIN' THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status NOT IN ('APPROVED','REJECTED','CORRECTION_REQUESTED') THEN
    RAISE EXCEPTION 'DECISION_INVALID';
  END IF;

  FOR it IN
    SELECT * FROM public.review_items
     WHERE domain = 'CASH' AND target_ref = p_submission_id AND status = 'PENDING'
     FOR UPDATE
  LOOP
    UPDATE public.review_items
       SET status        = p_status,
           decision_note = coalesce(p_note,''),
           decided_by    = p_actor,
           decided_at    = now(),
           version       = version + 1
     WHERE id = it.id;

    INSERT INTO public.review_decisions (id, item_id, decision, actor_user_ref, actor_role, note, payload_hash, applied_ref)
    VALUES (encode(sha256(convert_to(it.id||'|'||p_status||'|'||p_actor||'|'||clock_timestamp()::text||'|'||gen_random_uuid()::text,'UTF8')),'hex'),
            it.id, p_status, p_actor, a.role, coalesce(p_note,''), it.payload_hash, p_submission_id);

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.cash_review_mirror_close(text,text,text,text) IS
 'Closes the review_items mirror of a cash submission after the cash decision is recorded. The cash tables remain the authority; this only keeps /review truthful.';

REVOKE ALL ON FUNCTION public.cash_review_mirror_close(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cash_review_mirror_close(text,text,text,text) TO alrifai_app, ir_review_runtime;

-- Align the stored capability arrays with the role defaults the code already applies.
UPDATE public.cash_portal_users
   SET capabilities = (
         SELECT coalesce(jsonb_agg(DISTINCT value ORDER BY value), '[]'::jsonb)
           FROM jsonb_array_elements_text(
                  coalesce(capabilities,'[]'::jsonb) || '["cash.read","cash.submit"]'::jsonb
                ) AS value
         WHERE value IN ('cash.read','cash.submit','cash.review','vessel.read',
                         'vessel.command','vessel.submit','employee.submit',
                         'attendance.submit','audit.read','workspace.admin')
       ),
       version = version + coalesce((
         SELECT 1 WHERE NOT (coalesce(capabilities,'[]'::jsonb) ? 'cash.submit')
       ), 0);

COMMIT;
