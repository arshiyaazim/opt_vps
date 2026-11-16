-- 0059: backfill escorts who appear in programs but never received a cash payment.
--
-- employee_master only knew about employees the Cash path had seen, so 25 escorts
-- (26 program rows) had no identity record. They are known escorts, already vetted
-- by appearing in confirmed programs, so they are inserted CONFIRMED with
-- duty_type='escort' and confirmed_by='escort_backfill_phase2'.
--
-- Source of truth per mobile: the most recent program's escort name (the name a
-- human last wrote), the earliest start date as first_seen_at, and the latest end
-- date as last_seen_at. Where no end date exists, last_seen_at is now(), matching
-- the approved specification.
--
-- Dates are cast only when they look like ISO dates; a malformed value becomes NULL
-- rather than aborting the migration. Empty or invalid mobiles are excluded: they
-- cannot identify a person, and inventing one would be worse than an orphan row.
--
-- ON CONFLICT DO NOTHING plus the NOT EXISTS guard makes a re-run a no-op.

BEGIN;

WITH src AS (
  SELECT public.normalize_mobile(p."escortMobile") AS mobile,
         nullif(btrim(coalesce(p."escortName", '')), '') AS escort_name,
         CASE WHEN p."startDate" ~ '^\d{4}-\d{2}-\d{2}$' THEN p."startDate"::date END AS started,
         CASE WHEN coalesce(p."endDate", '') ~ '^\d{4}-\d{2}-\d{2}$' THEN p."endDate"::date END AS ended
    FROM public.programs p
   WHERE public.normalize_mobile(p."escortMobile") IS NOT NULL
), agg AS (
  SELECT mobile,
         (array_agg(escort_name ORDER BY started DESC NULLS LAST))[1] AS latest_name,
         min(started) AS first_start,
         max(ended)   AS last_end
    FROM src
   GROUP BY mobile
)
INSERT INTO public.employee_master (
  scope_account, employee_mobile, preferred_name, name_aliases, state, duty_type,
  first_seen_at, last_seen_at, created_at, updated_at, confirmed_at, confirmed_by
)
SELECT 'wa-01',
       a.mobile,
       coalesce(a.latest_name, 'Unknown escort'),
       ARRAY[coalesce(a.latest_name, 'Unknown escort')]::text[],
       'CONFIRMED',
       'escort',
       coalesce(a.first_start, now())::timestamptz,
       coalesce(a.last_end, now())::timestamptz,
       now(), now(), now(),
       'escort_backfill_phase2'
  FROM agg a
 WHERE NOT EXISTS (
   SELECT 1 FROM public.employee_master e
    WHERE e.scope_account = 'wa-01' AND e.employee_mobile = a.mobile
 )
ON CONFLICT (scope_account, employee_mobile) DO NOTHING;

COMMIT;
