-- 0054: APPLIED status and confidence (R1 Step D + apply flow).
--
-- Two gaps the apply API needs:
--
--  1. match_status must accept 'APPLIED' — §Step 4 sets it after a candidate is
--     applied, and the guardrail lists it, but 0051/0053 only allowed MATCHED,
--     ROSTER_MISMATCH, NO_PAYMENT, PENDING_REVIEW and REJECTED.
--  2. Step D matches are 'medium' confidence (lump-sum settlements that do not
--     back-calculate), while Steps A/B/C are 'high'. apply-all-high needs the
--     distinction stored, not inferred.
--
-- Existing rows are marked 'high' because everything currently in the table came
-- from Steps A/B/C. Step D rows are written as 'medium' by the backfill.
--
-- No data is destroyed; programs is untouched.

BEGIN;

ALTER TABLE public.release_candidates
  DROP CONSTRAINT IF EXISTS release_candidates_match_status_check;

ALTER TABLE public.release_candidates
  ADD CONSTRAINT release_candidates_match_status_check
  CHECK (match_status IN ('MATCHED','ROSTER_MISMATCH','NO_PAYMENT','PENDING_REVIEW','APPLIED','REJECTED'));

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS confidence text
    CHECK (confidence IS NULL OR confidence IN ('high','medium'));

UPDATE public.release_candidates
   SET confidence = 'high'
 WHERE confidence IS NULL AND match_status = 'MATCHED';

CREATE INDEX IF NOT EXISTS release_candidates_confidence_idx
  ON public.release_candidates (confidence, match_status, applied);

COMMENT ON COLUMN public.release_candidates.confidence IS
 'high = back-calculated start matched a program within ±2 (Steps A/B/C); medium = Step D lump-sum settlement that does not back-calculate and needs admin verification.';

COMMIT;
