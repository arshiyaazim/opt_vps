-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- Fixes the two defects proven on 2026-11-03:
--   1. `alrifai_app` was granted SELECT/INSERT on release_auto_apply_log but never
--      USAGE on its sequence, so every auto-apply INSERT failed with
--      "permission denied for sequence release_auto_apply_log_id_seq".
--      Proof: sequence last_value=1, is_called=false, while candidate 1252 was
--      already APPLIED and its program carries the RELEASE_PROGRAM event.
--   2. autoApplyHigh used two different pools (candidate bookkeeping vs the
--      command pool) with no transaction, so the candidate update committed and
--      the audit insert did not. Partial success was then swallowed by a catch.
--
-- The fix is one SECURITY DEFINER function: release, pay recalculation, candidate
-- state and the audit row all commit together or not at all.
--
-- Apply only with explicit Owner approval, a pre-migration pg_dump and an
-- isolated rehearsal. Depends on nothing else in this candidate series.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. The sequence grant the original migration forgot.
GRANT USAGE, SELECT ON SEQUENCE public.release_auto_apply_log_id_seq TO alrifai_app;

-- 2. One audit row per candidate, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS release_auto_apply_log_candidate_uk
  ON public.release_auto_apply_log (candidate_id);

-- 3. Atomic apply. Authorization, matching gate and idempotency are re-checked
--    here rather than trusted to the caller.
CREATE OR REPLACE FUNCTION public.apply_release_candidate(
  p_candidate_id bigint,
  p_actor text,
  p_reviewed_by text,
  p_trigger text DEFAULT 'ingestion-auto-apply'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  c            record;
  rev          integer;
  program_end  text;
  applied      jsonb;
BEGIN
  IF p_candidate_id IS NULL THEN RAISE EXCEPTION 'CANDIDATE_ID_REQUIRED'; END IF;
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;

  SELECT * INTO c FROM public.release_candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;
  IF c.applied THEN
    RETURN jsonb_build_object('ok', true, 'alreadyApplied', true, 'programId', c.program_id);
  END IF;
  IF c.match_status <> 'MATCHED' THEN RAISE EXCEPTION 'CANDIDATE_NOT_MATCHED'; END IF;
  IF c.program_id IS NULL THEN RAISE EXCEPTION 'CANDIDATE_WITHOUT_PROGRAM'; END IF;
  IF c.end_shift IS NULL OR c.end_shift NOT IN ('D','N') THEN RAISE EXCEPTION 'CANDIDATE_WITHOUT_SHIFT'; END IF;

  SELECT revision, coalesce("endDate", '') INTO rev, program_end
    FROM public.programs WHERE id = c.program_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  -- A stale MATCHED candidate must never re-release a program that already has an
  -- end date: the auto-apply eligibility query already excludes it, and the
  -- function refuses it too rather than bumping the revision again.
  IF btrim(program_end) <> '' THEN RAISE EXCEPTION 'PROGRAM_ALREADY_RELEASED'; END IF;

  applied := public.alrifai_vessel_program_release(
    c.program_id, c.end_date::text, c.end_shift, '',
    p_actor, rev, 'release-candidate-' || c.id::text,
    jsonb_build_object('source', p_trigger, 'candidateId', c.id));

  PERFORM public.recalculate_program_pay(c.program_id);

  UPDATE public.release_candidates
     SET applied = true, match_status = 'APPLIED',
         reviewed_by = coalesce(nullif(btrim(p_reviewed_by), ''), p_trigger),
         reviewed_at = now()
   WHERE id = c.id;

  INSERT INTO public.release_auto_apply_log
    (candidate_id, program_id, trigger_message_id, end_date, end_shift)
  VALUES
    (c.id, c.program_id, c.source_msg_id, c.end_date, c.end_shift);

  RETURN jsonb_build_object('ok', true, 'alreadyApplied', false,
                            'programId', c.program_id, 'revision', applied->>'revision');
END
$function$;

REVOKE ALL ON FUNCTION public.apply_release_candidate(bigint,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_release_candidate(bigint,text,text,text) TO alrifai_app, ir_review_runtime;

COMMENT ON FUNCTION public.apply_release_candidate(bigint,text,text,text) IS
  'Atomic release apply: release + pay recalculation + candidate state + audit row in one transaction. Re-checks actor, match status and idempotency.';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- REHEARSAL CHECKLIST (isolated PostgreSQL 16 only)
--   1. Apply once to an already-APPLIED candidate: returns alreadyApplied=true,
--      inserts no second audit row (unique index).
--   2. Apply to a MATCHED candidate: program endDate set, revision +1, pay row
--      recalculated, candidate APPLIED, exactly one audit row.
--   3. Force a failure inside (e.g. invalid program id): nothing is committed —
--      candidate stays MATCHED, no audit row, program unchanged.
--   4. Rollback: DROP FUNCTION apply_release_candidate; DELETE the one log row
--      per candidate index if reverting (or leave it, it is additive);
--      REVOKE USAGE on the sequence. No business table is altered.
-- ════════════════════════════════════════════════════════════════════════════
