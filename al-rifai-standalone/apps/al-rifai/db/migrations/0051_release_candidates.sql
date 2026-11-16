-- 0051: release_candidates — staging table for the Escort Release Parser (R1).
--
-- Purpose: hold candidate release facts extracted from the "Escort Release Slip"
-- group so an admin can review and apply them. Nothing here is a release until it
-- is applied through the vessel command layer (§8).
--
-- Adaptations from the specification's DDL, all forced by the real schema:
--
--  1. The spec references `vessel_programs(id)` with an INTEGER key. No such table
--     exists; the vessel register is `public.programs` and its `id` is TEXT (a
--     64-hex command identity). program_id is therefore TEXT with a FK to
--     programs(id).
--  2. The spec's match_status CHECK lists MATCHED, ROSTER_MISMATCH, NO_PAYMENT and
--     PENDING_REVIEW, but §8.3 rejects a candidate by setting match_status =
--     'REJECTED'. That value is added here, otherwise the reject endpoint could
--     never work.
--  3. §7.3(b) requires skipping messages already parsed. A plain source_msg_id is
--     not enough because one message can describe several escorts, so a unique
--     dedupe index covers (message, escort, day, amount).
--  4. Money is INTEGER Taka here, not minor units, because the parser reads Taka
--     from the message text and the spec's schema says amount_bdt. Conversion to
--     minor units happens only when a release is applied.
--
-- Guardrail (§12): the parser never writes to programs. This migration creates no
-- trigger and no function that touches programs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.release_candidates (
  id            bigserial   PRIMARY KEY,
  escort_phone  text        NOT NULL,
  escort_name   text,
  program_id    text        REFERENCES public.programs(id) ON DELETE SET NULL,
  end_date      date        NOT NULL,
  end_shift     text        CHECK (end_shift IN ('D', 'N')),
  amount_bdt    integer     CHECK (amount_bdt IS NULL OR amount_bdt >= 0),
  duty_days     integer     CHECK (duty_days IS NULL OR duty_days >= 0),
  calc_start    date,
  conveyance    integer     CHECK (conveyance IS NULL OR conveyance >= 0),
  match_status  text        NOT NULL CHECK (match_status IN (
                  'MATCHED', 'ROSTER_MISMATCH', 'NO_PAYMENT', 'PENDING_REVIEW', 'REJECTED')),
  source_msg_id text,
  source_date   timestamptz,
  source_text   text,
  image_ref     text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  applied       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT release_candidates_phone_chk CHECK (escort_phone ~ '^01[3-9][0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS release_candidates_phone_date_idx
  ON public.release_candidates (escort_phone, end_date);
CREATE INDEX IF NOT EXISTS release_candidates_status_idx
  ON public.release_candidates (match_status, applied);

-- Idempotency for the real-time hook and for re-running the backfill.
CREATE UNIQUE INDEX IF NOT EXISTS release_candidates_dedupe_uk
  ON public.release_candidates (source_msg_id, escort_phone, end_date, COALESCE(amount_bdt, -1));

COMMENT ON TABLE public.release_candidates IS
 'Staging area for release facts parsed from the Escort Release Slip group. Never authoritative: a release exists only after an admin applies it through the vessel command layer.';

GRANT SELECT, INSERT, UPDATE ON public.release_candidates TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.release_candidates_id_seq TO alrifai_app;

COMMIT;
