-- 0058: canonical mobile normalisation for employee identity joins.
--
-- Phase 2 needs one comparison function shared by the join view, the backfill and
-- the duplicate guard. Doing it in one place is what stops "01XXXXXXXXX" and
-- "+8801XXXXXXXXX" becoming two employees.
--
-- The specification is "last 10 digits, prefixed +880". A bare prefix-and-concat
-- would turn any short or malformed value into '+880' plus whatever digits remain,
-- so the tail is also required to look like a Bangladeshi mobile (1, then 3-9, then
-- 8 digits). Anything else returns NULL, which joins to nothing and is rejected by
-- employee_master's existing CHECK instead of silently matching a different person.
--
-- IMMUTABLE is required for the expression index below and for use in a join.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_mobile(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE WHEN digits ~ '^1[3-9][0-9]{8}$' THEN '+880' || digits END
  FROM (SELECT right(regexp_replace(coalesce($1, ''), '[^0-9]', '', 'g'), 10) AS digits) s
$$;

COMMENT ON FUNCTION public.normalize_mobile(text) IS
 'Canonical E.164 form (+8801XXXXXXXXX) of a Bangladeshi mobile. Accepts local, no-plus and E.164 input; returns NULL when the value is not a valid mobile.';

CREATE INDEX IF NOT EXISTS employee_master_normalized_mobile_idx
  ON public.employee_master (public.normalize_mobile(employee_mobile));

COMMIT;
