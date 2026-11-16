-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- Owner decision (2026-11-04): Travel/Office-Return dates are not always
-- provable, so a missing travel date must not block an otherwise valid release.
-- These fields let the deterministic extractor (lib/release-evidence.ts) keep
-- the evidence separate from the approved release/match columns that already
-- exist (end_date, end_shift, conveyance, source_msg_id, program_id).
--
-- Existing columns reused unchanged:
--   release date      → end_date
--   release shift     → end_shift
--   conveyance amount → conveyance (BDT)
--   evidence message  → source_msg_id
--   matched program   → program_id
--   raw text          → source_text (4000 chars)
--
-- Depends on db/migration-candidates/0072 (vessel_conveyance_event). Apply 0072
-- first, then this file. No existing column is altered or dropped.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS release_date_source text
    -- FOOD_BILL_EVENT is the Owner rule B source (2026-11-04): a duty-ending food
    -- bill can establish the release date. Migration 0075 carries its evidence.
    CHECK (release_date_source IN ('STATED_END_DATE', 'FOOD_BILL_EVENT', 'MESSAGE_TIMESTAMP')),
  ADD COLUMN IF NOT EXISTS stated_release_date date,
  ADD COLUMN IF NOT EXISTS conveyance_date date,
  ADD COLUMN IF NOT EXISTS office_return_date date,
  ADD COLUMN IF NOT EXISTS extraction_status text
    CHECK (extraction_status IN ('COMPLETE', 'PARTIAL', 'UNRESOLVED_CONVEYANCE', 'INVALID_DATES', 'NO_EVIDENCE')),
  ADD COLUMN IF NOT EXISTS rule_trace jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.release_candidates.extraction_status IS
  'How complete the extracted evidence is. PARTIAL / UNRESOLVED_CONVEYANCE never block the release; INVALID_DATES always goes to review.';
COMMENT ON COLUMN public.release_candidates.rule_trace IS
  'Which deterministic rule produced each fact, e.g. R-STATED-END-DATE, R-OFFICE-RETURN-DATE, R-INVALID-STATED-DATE.';

-- One travel/return event per candidate: the database, not the code, is the last
-- line of defence against a double-counted conveyance.
ALTER TABLE public.vessel_conveyance_event
  ADD COLUMN IF NOT EXISTS candidate_id bigint REFERENCES public.release_candidates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vessel_conveyance_event_candidate_uk
  ON public.vessel_conveyance_event (candidate_id)
  WHERE candidate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS release_candidates_extraction_idx
  ON public.release_candidates (extraction_status, applied);

-- Visibility for reconciliation: every conveyance amount that has no verified
-- month, so it can be completed later without inventing a date.
CREATE OR REPLACE VIEW public.release_conveyance_unresolved AS
SELECT rc.id                     AS candidate_id,
       rc.escort_phone,
       rc.escort_name,
       rc.program_id,
       rc.end_date               AS release_date,
       rc.end_shift,
       rc.conveyance            AS conveyance_bdt,
       rc.conveyance_date,
       rc.office_return_date,
       rc.extraction_status,
       rc.source_msg_id,
       CASE
         WHEN rc.conveyance IS NULL THEN 'NO_CONVEYANCE_AMOUNT'
         WHEN rc.conveyance_date IS NULL AND rc.office_return_date IS NULL THEN 'TRAVEL_DATE_UNVERIFIED'
         WHEN rc.extraction_status = 'INVALID_DATES' THEN 'DATE_EVIDENCE_INVALID'
         ELSE 'READY_TO_ALLOCATE'
       END AS reason
  FROM public.release_candidates rc
 WHERE rc.applied = false
   AND (rc.conveyance IS NOT NULL
        OR rc.extraction_status IN ('PARTIAL', 'UNRESOLVED_CONVEYANCE', 'INVALID_DATES'));

COMMENT ON VIEW public.release_conveyance_unresolved IS
  'Release candidates whose conveyance is not yet attributable to a month. A row here is preserved evidence, never a guessed allocation.';

GRANT SELECT ON public.release_conveyance_unresolved TO alrifai_app, ir_review_runtime;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- REHEARSAL CHECKLIST (isolated PostgreSQL 16 only, never production first)
--   1. 140 existing candidates still load: SELECT count(*) FROM release_candidates.
--   2. New columns are NULL for historical rows except rule_trace = '[]'.
--   3. The unique index accepts one event per candidate and rejects a second
--      (insert twice inside a rolled-back transaction).
--   4. release_conveyance_unresolved returns the 6 NO_PAYMENT candidates with
--      reason NO_CONVEYANCE_AMOUNT and the conveyance-bearing ones as
--      TRAVEL_DATE_UNVERIFIED (no dates are invented).
--   5. Rollback: DROP VIEW release_conveyance_unresolved; DROP INDEX
--      vessel_conveyance_event_candidate_uk; ALTER TABLE release_candidates DROP
--      COLUMN ...; ALTER TABLE vessel_conveyance_event DROP COLUMN candidate_id.
--      No existing data is touched, so the rollback loses only new evidence.
-- ════════════════════════════════════════════════════════════════════════════
