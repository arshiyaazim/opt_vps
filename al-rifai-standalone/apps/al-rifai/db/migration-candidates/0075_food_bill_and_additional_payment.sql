-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- Owner rules B and C (2026-11-04): a duty-ending Food Bill can establish the
-- Release Date, and same-day additional money can be conveyance evidence — but
-- an unlabelled amount is only ever a candidate.
--
-- These columns keep that evidence apart from the approved release/match columns
-- that already exist (end_date, end_shift, conveyance, source_msg_id, program_id).
-- Depends on 0074 (which adds conveyance_date / office_return_date /
-- extraction_status / rule_trace and vessel_conveyance_event.candidate_id).
-- Apply 0072 → 0074 → 0075 in that order.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS food_bill_date date,
  ADD COLUMN IF NOT EXISTS food_bill_amount_bdt integer,
  ADD COLUMN IF NOT EXISTS food_bill_source_msg_id text,
  ADD COLUMN IF NOT EXISTS additional_amount_bdt integer,
  ADD COLUMN IF NOT EXISTS additional_source_msg_id text,
  ADD COLUMN IF NOT EXISTS conveyance_purpose text
    CHECK (conveyance_purpose IN ('OFFICE_RETURN_CONVEYANCE','GHAT_DUTY_CONVEYANCE','OTHER_VERIFIED_TRANSPORT','UNKNOWN_CONVEYANCE_PURPOSE')),
  ADD COLUMN IF NOT EXISTS conveyance_status text
    CHECK (conveyance_status IN ('VERIFIED','CANDIDATE','UNRESOLVED','NONE')),
  ADD COLUMN IF NOT EXISTS travel_date date,
  ADD COLUMN IF NOT EXISTS travel_date_source text
    CHECK (travel_date_source IN ('EXPLICIT_TRAVEL_DATE','SAME_DAY_ESTABLISHED')),
  ADD COLUMN IF NOT EXISTS payment_instruction_date date,
  ADD COLUMN IF NOT EXISTS employee_identity_source text
    CHECK (employee_identity_source IN ('ID_LABEL','ESCORT_LABEL','FIRST_MOBILE')),
  ADD COLUMN IF NOT EXISTS sukani_mentioned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_message_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.release_candidates.food_bill_date IS
  'Date of the duty-ending food bill. May become the release date (release_date_source = FOOD_BILL_EVENT).';
COMMENT ON COLUMN public.release_candidates.conveyance_status IS
  'VERIFIED = evidence supports the travel; CANDIDATE = plausible but unlabelled; UNRESOLVED = amount known, travel date unknown; NONE = no additional amount.';
COMMENT ON COLUMN public.release_candidates.payment_instruction_date IS
  'Date of a payment instruction/transfer note. Never a travel date.';

CREATE INDEX IF NOT EXISTS release_candidates_conveyance_status_idx
  ON public.release_candidates (conveyance_status, applied);

-- Everything a reviewer needs in one place: food-bill evidence that is not yet
-- a clean release, and conveyance that is not yet a verified month.
CREATE OR REPLACE VIEW public.release_evidence_review AS
SELECT rc.id                        AS candidate_id,
       rc.escort_phone,
       rc.escort_name,
       rc.program_id,
       rc.food_bill_date,
       rc.food_bill_amount_bdt,
       rc.end_date                  AS release_date,
       rc.extraction_status,
       rc.additional_amount_bdt,
       rc.conveyance_purpose,
       rc.conveyance_status,
       rc.travel_date,
       rc.payment_instruction_date,
       rc.review_reasons,
       rc.evidence_message_ids,
       rc.rule_trace,
       rc.source_msg_id
  FROM public.release_candidates rc
 WHERE rc.applied = false
   AND (
        rc.extraction_status IN ('PARTIAL','UNRESOLVED_CONVEYANCE','INVALID_DATES')
     OR rc.conveyance_status IN ('CANDIDATE','UNRESOLVED')
     OR jsonb_array_length(coalesce(rc.review_reasons, '[]'::jsonb)) > 0
   );

COMMENT ON VIEW public.release_evidence_review IS
  'Candidates whose food-bill / conveyance evidence still needs a human decision. A row here is preserved evidence, never an applied release or an allocated month.';

GRANT SELECT ON public.release_evidence_review TO alrifai_app, ir_review_runtime;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- REHEARSAL CHECKLIST (isolated PostgreSQL 16 only)
--   1. 140 existing candidates load; new columns are NULL / '[]' / false.
--   2. CHECK constraints reject an unknown purpose or status.
--   3. release_evidence_review lists only unapplied candidates with open evidence.
--   4. No program_pay row changes; no existing column changes.
--   5. Rollback: DROP VIEW release_evidence_review; DROP INDEX
--      release_candidates_conveyance_status_idx; ALTER TABLE release_candidates
--      DROP COLUMN ... (new columns only). No existing data is lost.
-- ════════════════════════════════════════════════════════════════════════════
