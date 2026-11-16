-- 0053: mismatch_kind for release candidates (R1 multi-payment correction).
--
-- The corrected algorithm treats a payment after a release as a NEW DUTY (a
-- program missing from the roster), not as a partial payment. That makes the
-- mismatch category the useful output: it tells the owner which programs to add.
--
-- mismatch_kind classifies a ROSTER_MISMATCH so it can be reported and filtered:
--   NO_ROSTER_PHONE            the escort phone appears in no program at all
--   NEW_DUTY_AFTER_RELEASE     dated after that escort's last matched release
--   BEFORE_PROGRAM             dated before that escort's earliest program start
--   OUTSIDE_TOLERANCE          phone is known but calc_start misses every ±2 window
--   AMBIGUOUS                  several programs match equally well
-- NULL for MATCHED and NO_PAYMENT rows.
--
-- Additive only. No data rewritten, programs untouched.

BEGIN;

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS mismatch_kind text
    CHECK (mismatch_kind IS NULL OR mismatch_kind IN (
      'NO_ROSTER_PHONE', 'NEW_DUTY_AFTER_RELEASE', 'BEFORE_PROGRAM',
      'OUTSIDE_TOLERANCE', 'AMBIGUOUS'));

CREATE INDEX IF NOT EXISTS release_candidates_mismatch_kind_idx
  ON public.release_candidates (mismatch_kind)
  WHERE mismatch_kind IS NOT NULL;

COMMENT ON COLUMN public.release_candidates.mismatch_kind IS
 'Why a ROSTER_MISMATCH could not be placed. NEW_DUTY_AFTER_RELEASE is the useful one: it points at a program missing from the roster.';

COMMIT;
