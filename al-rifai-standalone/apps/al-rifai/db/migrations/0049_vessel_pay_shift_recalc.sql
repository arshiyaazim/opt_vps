-- 0049: recalculate vessel pay under the corrected shift model (0048).
--
-- Re-derives every confirmed current-epoch program. Under 0048 a program with no
-- endDate resolves to UNRESOLVED / END_DATE_REQUIRED, so the expected result today
-- is zero CALCULATED rows: no duty has been released yet.
--
-- The loop selects from programs rather than reusing an id list, so it also picks
-- up programs created by live ingestion after the previous run.
--
-- Scope: writes program_pay only. programs is read, never updated, so
-- program_command_history is not engaged. No posting, no payment.
-- Idempotent: recalculate_program_pay upserts on program_id.

BEGIN;

DO $$
DECLARE
  r             record;
  outcome       text;
  n_total       integer := 0;
  n_calc        integer := 0;
  n_unresolved  integer := 0;
  n_skipped     integer := 0;
  n_missing     integer := 0;
  v_total_minor bigint  := 0;
BEGIN
  FOR r IN
    SELECT p.id
      FROM public.programs p
     WHERE p.dataset_epoch = 'CANONICAL_BACKFILL_20261026'
       AND p.status = 'Confirmed'
       AND (p.details::jsonb ->> 'confirmationMessageId') IS NOT NULL
     ORDER BY p.id
  LOOP
    outcome := public.recalculate_program_pay(r.id);
    n_total := n_total + 1;

    IF outcome = 'CALCULATED' THEN n_calc := n_calc + 1;
    ELSIF outcome = 'UNRESOLVED' THEN n_unresolved := n_unresolved + 1;
    ELSIF outcome = 'SKIPPED_NOT_CONFIRMED' THEN n_skipped := n_skipped + 1;
    ELSIF outcome = 'MISSING' THEN n_missing := n_missing + 1;
    END IF;
  END LOOP;

  SELECT coalesce(sum(pp.total_minor), 0) INTO v_total_minor
    FROM public.program_pay pp WHERE pp.state = 'CALCULATED';

  RAISE NOTICE 'B5_SHIFT_MODEL processed=% calculated=% unresolved=% skipped=% missing=% total_minor=%',
    n_total, n_calc, n_unresolved, n_skipped, n_missing, v_total_minor;
END $$;

COMMIT;
