-- 0043: derived vessel pay table (B5.2a).
--
-- Why a separate table instead of columns on programs: programs is a business
-- fact under an immutability trigger (program_command_history, BEFORE UPDATE).
-- The trigger returns early today only because no row yet carries
-- details->'programCommand'; once one does, it requires revision+1 and exactly
-- one appended event, so a later rate correction could no longer rewrite a
-- stored salary column without fabricating a command. program_assignments is
-- hard append-only (immutable_business_fact). Derived money therefore belongs
-- somewhere it can be recomputed and dropped, not inside the fact table.
--
-- This table is derived state, never a posting or a payment. Every row is
-- reproducible by calling recalculate_program_pay(program_id) again; cascading
-- deletes keep it aligned with programs.
--
-- Consequence of the schema (verified 2026-11-02): programs has one startDate
-- and one shift, endDate is empty on 100% of rows, and no endShift/releasePoint
-- exists in details. A shift RANGE is not representable, so a confirmed program
-- is one shift = one half-day unit = 0.5 day. `half_day_units` is authoritative;
-- `shift_count` is carried for readability.
--
-- Scope: one new table and its grants. No existing table or row is touched, no
-- program is updated, and no frozen roster/bridge path is involved.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.program_pay (
  program_id       text        PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  rule_version     integer     NOT NULL,
  rate_config_id   text        REFERENCES public.escort_rate_config(id),
  destination_key  text        NOT NULL,
  shift_count      integer     NOT NULL CHECK (shift_count >= 0),
  half_day_units   integer     NOT NULL CHECK (half_day_units >= 0),
  shift_rate_minor bigint      CHECK (shift_rate_minor IS NULL OR shift_rate_minor >= 0),
  salary_minor     bigint      CHECK (salary_minor IS NULL OR salary_minor >= 0),
  conveyance_minor bigint      CHECK (conveyance_minor IS NULL OR conveyance_minor >= 0),
  total_minor      bigint      CHECK (total_minor IS NULL OR total_minor >= 0),
  state            text        NOT NULL CHECK (state IN ('CALCULATED', 'UNRESOLVED')),
  reasons          jsonb       NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  computed_at      timestamptz NOT NULL DEFAULT now(),
  -- A priced row must carry every money field; an unresolved row must carry a
  -- reason and no money. This makes a half-computed row impossible to store.
  CONSTRAINT program_pay_state_shape_chk CHECK (
    (state = 'CALCULATED'
       AND shift_rate_minor IS NOT NULL AND salary_minor IS NOT NULL
       AND conveyance_minor IS NOT NULL AND total_minor IS NOT NULL
       AND jsonb_array_length(reasons) = 0)
    OR
    (state = 'UNRESOLVED'
       AND shift_rate_minor IS NULL AND salary_minor IS NULL
       AND conveyance_minor IS NULL AND total_minor IS NULL
       AND jsonb_array_length(reasons) > 0)
  )
);

CREATE INDEX IF NOT EXISTS program_pay_state_idx ON public.program_pay (state);
CREATE INDEX IF NOT EXISTS program_pay_destination_idx ON public.program_pay (destination_key);

COMMENT ON TABLE public.program_pay IS
 'Derived vessel pay per program. Recomputed from escort_rate_config by recalculate_program_pay(). Never a posting or a payment; safe to drop and rebuild.';

-- Read-only for the application role. Rows are written by the migration/backfill
-- step and by recalculate_program_pay() under the maintenance role.
GRANT SELECT ON public.program_pay TO alrifai_app;

COMMIT;
