-- 0045: backfill derived vessel pay (B5.2b).
--
-- Recalculates program_pay for every confirmed program in the current epoch.
--
-- Expected outcome TODAY: every row lands UNRESOLVED / RATE_CONFIG_MISSING,
-- because 0042 deliberately seeded no rates. That is the point of this step: it
-- proves the pipeline and establishes a zero-state baseline that the Owner can
-- verify before any money exists. Once rates are inserted, re-running this file's
-- loop (or calling recalculate_program_pay per program) produces CALCULATED rows.
--
-- Selection mirrors the function's own gate and the verified data shape:
--   dataset_epoch = 'CANONICAL_BACKFILL_20261026'  (current; archive untouched)
--   status        = 'Confirmed'                     (mixed case; NOT 'CONFIRMED')
--   details->>'confirmationMessageId' IS NOT NULL   (agrees on all 83 rows)
--
-- Scope: writes program_pay only. Reads programs; never updates it, so the
-- program_command_history trigger is not engaged. No posting, no payment.
--
-- Idempotent: recalculate_program_pay upserts on program_id, so re-running
-- produces the same rows rather than duplicates.

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

  RAISE NOTICE 'B5_BACKFILL processed=% calculated=% unresolved=% skipped=% missing=%',
    n_total, n_calc, n_unresolved, n_skipped, n_missing;
END $$;

COMMIT;
