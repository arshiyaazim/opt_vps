-- 0056: audit trail for automatic release application (R2 Action 4).
--
-- The specification says auto-applications log to "migration_ledger". That table is
-- alrifai_schema_migrations, which records applied schema migrations by id/sha256;
-- writing AUTO_RELEASE rows into it would pollute a structure that
-- scripts/database.mjs migrate validates. A dedicated table keeps both meanings
-- clean and lets the audit be queried.
--
-- Every auto-apply already appends a RELEASE_PROGRAM event to the program's
-- command history; this table adds the machine-triggered context (which candidate
-- and which message caused it), which that event does not carry.

BEGIN;

CREATE TABLE IF NOT EXISTS public.release_auto_apply_log (
  id                 bigserial   PRIMARY KEY,
  candidate_id       bigint      NOT NULL,
  program_id         text        NOT NULL,
  trigger_message_id text,
  end_date           date        NOT NULL,
  end_shift          text        CHECK (end_shift IN ('D', 'N')),
  applied_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS release_auto_apply_log_program_idx
  ON public.release_auto_apply_log (program_id, applied_at DESC);

COMMENT ON TABLE public.release_auto_apply_log IS
 'One row per automatic release application from the ingestion hook. Human applications are recorded in release_candidates.reviewed_by instead.';

GRANT SELECT, INSERT ON public.release_auto_apply_log TO alrifai_app;

COMMIT;
