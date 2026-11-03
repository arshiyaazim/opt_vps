-- Attendance backfill: released vessel programs → attendance_entries.
--
-- NOT a migration. This is a one-off data script (owner's step B3 / RBAC-2A #5) so it
-- stays rerunnable and reviewable without becoming schema history. It is idempotent:
-- ids are derived from (program, day, shift) and the insert uses ON CONFLICT DO NOTHING,
-- so a second run inserts 0 rows.
--
-- Rules, exactly as approved:
--   * only programs whose endDate is set (released) and that carry an escort mobile;
--   * every calendar day from startDate to endDate inclusive, never a future date;
--   * shift alternates day by day starting from the program's own shift (empty shift
--     is treated as 'D' and the row still records which shift was assumed);
--   * source='vessel_program', source_ref=program id, status='CONFIRMED'.
--
-- Run as vps_pg_admin, which owns employee_master and attendance_entries.

BEGIN;

WITH released AS (
  SELECT p.id AS program_id,
         public.normalize_mobile(p."escortMobile") AS mobile,
         p."startDate"::date AS started,
         p."endDate"::date   AS ended,
         CASE WHEN p.shift IN ('D','N') THEN p.shift ELSE 'D' END AS start_shift
    FROM public.programs p
   WHERE p.dataset_epoch = 'CANONICAL_BACKFILL_20261026'
     AND coalesce(p."startDate",'') ~ '^\d{4}-\d{2}-\d{2}$'
     AND coalesce(p."endDate",'')   ~ '^\d{4}-\d{2}-\d{2}$'
     AND public.normalize_mobile(p."escortMobile") IS NOT NULL
), days AS (
  SELECT r.program_id, r.mobile,
         d::date AS attendance_date,
         CASE WHEN (d::date - r.started) % 2 = 0
              THEN r.start_shift
              ELSE CASE WHEN r.start_shift = 'D' THEN 'N' ELSE 'D' END
         END AS shift
    FROM released r
   CROSS JOIN LATERAL generate_series(r.started, r.ended, interval '1 day') AS d
   WHERE d::date <= current_date
)
INSERT INTO public.attendance_entries
  (id, employee_mobile, attendance_date, shift, source, source_ref, status, submitted_by, created_at)
SELECT encode(sha256(convert_to('vessel_program|'||program_id||'|'||attendance_date||'|'||shift,'UTF8')),'hex'),
       mobile, attendance_date, shift, 'vessel_program', program_id, 'CONFIRMED',
       'system:attendance_backfill', now()
  FROM days
ON CONFLICT DO NOTHING;

COMMIT;
