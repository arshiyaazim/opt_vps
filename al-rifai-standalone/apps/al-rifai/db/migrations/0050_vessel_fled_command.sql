-- 0050: 'fled' status and command (B5 UI fix F13).
--
-- Why: the Actions/status dropdown needs a "Fleed A" (absconded) state that says
-- the escort left the vessel without being released. No such status, command or
-- audit event exists today — programs only ever holds 'Confirmed' and 'Draft'
-- (verified 2026-11-02), and 'Voided' is what the void command writes.
--
-- This mirrors alrifai_vessel_program_void exactly: same guards, same optimistic
-- revision check, same idempotent command-key handling, same append-only
-- programCommand event log. It differs only in the status it writes ('fled') and
-- the event name (FLEE_PROGRAM). Modelled on void rather than inventing a new
-- mechanism so program_command_history and the existing audit surface keep working
-- unchanged.
--
-- Status is deliberately lower-case 'fled', matching the existing convention where
-- 'Confirmed' is display-mapped by the UI (Confirmed renders as "Running"). The DB
-- values are never renamed by the UI.
--
-- Scope: one function, its grants. No table is altered, no row is modified by this
-- migration, and no existing function is replaced.
--
-- Idempotent: CREATE OR REPLACE plus a command-key idempotency check inside.

BEGIN;

CREATE OR REPLACE FUNCTION public.alrifai_vessel_program_fled(
  p_id text, p_actor text, p_reason text, p_expected_revision integer, p_command_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  d jsonb; cmd jsonb; event jsonb; prior jsonb;
  revision_now integer; current_status text;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key, '')) = '' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF length(btrim(coalesce(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'FLEE_REASON_REQUIRED'; END IF;

  SELECT details::jsonb, revision, status
    INTO d, revision_now, current_status
    FROM public.programs WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;

  cmd := coalesce(d->'programCommand', '{}'::jsonb);
  prior := public.alrifai_vessel_idempotent_event(cmd, p_command_key);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'id', p_id, 'revision', revision_now,
                              'status', current_status, 'idempotent', true);
  END IF;

  IF current_status = 'fled' THEN RAISE EXCEPTION 'PROGRAM_ALREADY_FLED'; END IF;
  IF current_status = 'Voided' THEN RAISE EXCEPTION 'PROGRAM_VOIDED'; END IF;
  IF p_expected_revision IS NULL OR revision_now <> p_expected_revision THEN
    RAISE EXCEPTION 'REVISION_CONFLICT';
  END IF;

  event := jsonb_build_object(
    'action', 'FLEE_PROGRAM', 'key', p_command_key, 'at', now(),
    'actor', p_actor, 'reason', p_reason, 'previousStatus', current_status);

  UPDATE public.programs
     SET status = 'fled',
         revision = revision + 1,
         details = ((coalesce(d, '{}'::jsonb)
                     || jsonb_build_object(
                          'fleeReason', p_reason,
                          'programCommand', jsonb_set(cmd, '{events}',
                            coalesce(cmd->'events', '[]'::jsonb) || jsonb_build_array(event))))::text)
   WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'revision', revision_now + 1,
                            'status', 'fled', 'idempotent', false);
END $$;

COMMENT ON FUNCTION public.alrifai_vessel_program_fled(text, text, text, integer, text) IS
 'Mark a program as fled (escort absconded). Append-only FLEE_PROGRAM event; mirrors the void command. Never deletes anything.';

REVOKE ALL ON FUNCTION public.alrifai_vessel_program_fled(text, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alrifai_vessel_program_fled(text, text, text, integer, text) TO ir_review_runtime;

COMMIT;
