-- 0065: attendance_entries — one row per employee, day and shift.
--
-- RBAC-3 will build the review workflow on top of this table; RBAC-2 creates it so
-- the attendance page and the escort backfill have somewhere to write.
--
-- Identity: employee_mobile is the employee_master employee_mobile (normalised
-- +8801XXXXXXXXX). A real FOREIGN KEY is impossible while employee_master's primary
-- key is (scope_account, employee_mobile), so the format is enforced by CHECK and the
-- link is made on the normalised mobile, exactly as program_with_employee does.
-- A dangling mobile is a visible orphan rather than a silently wrong person.
--
-- Uniqueness uses NULLS NOT DISTINCT: a manual entry may legitimately have no shift,
-- and two identical "no shift" rows for one day must still collide.
--
-- status defaults to CONFIRMED because every writer that exists today is either an
-- admin or the program backfill. User submissions arrive as PENDING when RBAC-3
-- wires the review queue; the vocabulary is already here so no later migration has
-- to alter the column.

BEGIN;

CREATE TABLE IF NOT EXISTS public.attendance_entries (
  id               text PRIMARY KEY,
  employee_mobile  text NOT NULL,
  attendance_date  date NOT NULL,
  shift            text,
  source           text NOT NULL,
  source_ref       text,
  status           text NOT NULL DEFAULT 'CONFIRMED',
  submitted_by     text,
  reviewed_by      text,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_entries_id_check
    CHECK (id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT attendance_entries_mobile_check
    CHECK (employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
  CONSTRAINT attendance_entries_shift_check
    CHECK (shift IS NULL OR shift IN ('D','N')),
  CONSTRAINT attendance_entries_source_check
    CHECK (source IN ('vessel_program','manual','import')),
  CONSTRAINT attendance_entries_status_check
    CHECK (status IN ('CONFIRMED','PENDING','REJECTED')),
  CONSTRAINT attendance_entries_source_ref_check
    CHECK (source_ref IS NULL OR length(source_ref) <= 200),
  CONSTRAINT attendance_entries_unique_day
    UNIQUE NULLS NOT DISTINCT (employee_mobile, attendance_date, shift)
);

CREATE INDEX IF NOT EXISTS attendance_entries_mobile_date_idx
  ON public.attendance_entries (employee_mobile, attendance_date);

CREATE INDEX IF NOT EXISTS attendance_entries_status_idx
  ON public.attendance_entries (status, attendance_date);

COMMENT ON TABLE public.attendance_entries IS
 'Daily attendance per employee and shift. source distinguishes program-derived rows from manual entries; status carries the review state.';

COMMENT ON COLUMN public.attendance_entries.source_ref IS
 'Program id when source = vessel_program; free reference otherwise.';

-- Read-only for the application role. Every write goes through an admin path or a
-- reviewed apply function, mirroring employee_master's boundary.
GRANT SELECT ON public.attendance_entries TO alrifai_app;
GRANT SELECT ON public.attendance_entries TO ir_review_runtime;

COMMIT;
