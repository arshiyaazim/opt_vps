-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- The Food Bill backward search can identify a Program from a message that has
-- no ASCII mobile (name / lighter / mother / master signals only). Such a
-- candidate has no escort_phone to store, but the existing constraint requires a
-- valid number:
--
--   CHECK (escort_phone ~ '^01[3-9][0-9]{8}$')
--
-- This migration allows the empty string for that one case and nothing else, so
-- a phone-less match can be queued for manual review instead of being dropped.
-- The path is disabled by default (ALRIFAI_RELEASE_FOOD_BILL_SEARCH) and every
-- such candidate is review-grade (confidence 'medium' or NULL), so it can never
-- be picked up by the high-confidence auto-apply gate.
--
-- Reversal: drop the constraint and recreate the original one; no data changes.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.release_candidates
  DROP CONSTRAINT IF EXISTS release_candidates_escort_phone_check;

ALTER TABLE public.release_candidates
  ADD CONSTRAINT release_candidates_escort_phone_check
  CHECK (escort_phone = '' OR escort_phone ~ '^01[3-9][0-9]{8}$');

COMMENT ON CONSTRAINT release_candidates_escort_phone_check ON public.release_candidates IS
  'A real mobile, or empty for a Food Bill candidate identified without one (backward search). Empty never auto-applies.';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- REHEARSAL CHECKLIST (isolated PostgreSQL 16 only)
--   1. Existing 140 rows satisfy the new constraint (all have a real mobile).
--   2. INSERT with escort_phone = '' succeeds; with '12345' still fails.
--   3. Rollback: drop and recreate the original CHECK; no rows change.
-- ════════════════════════════════════════════════════════════════════════════
