-- 0047: recalculate vessel pay under the Owner rate schedule.
--
-- 0045 ran when escort_rate_config was empty, so all 83 confirmed programs are
-- UNRESOLVED / RATE_CONFIG_MISSING. 0046 supplied the rates; this file re-derives
-- every program so program_pay reflects them.
--
-- Same selection and same idempotency as 0045: recalculate_program_pay() upserts on
-- program_id, so this is safe to re-run after any rate correction and never
-- duplicates rows.
--
-- Scope: writes program_pay only. programs is read, never updated, so the
-- program_command_history trigger is not engaged. No posting, no payment.

BEGIN;

DO $$
DECLARE
  r            record;
  outcome      text;
  n_total      integer := 0;
  n_calc       integer := 0;
  n_unresolved integer := 0;
  n_skipped    integer := 0;
  n_missing    integer := 0;
  v_total_minor bigint := 0;
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

  RAISE NOTICE 'B5_RECALC processed=% calculated=% unresolved=% skipped=% missing=% total_minor=%',
    n_total, n_calc, n_unresolved, n_skipped, n_missing, v_total_minor;
END $$;

COMMIT;
