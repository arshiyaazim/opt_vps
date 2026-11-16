-- 0044: vessel pay functions (B5.2b).
--
-- Three pieces:
--   escort_destination_key(raw)  normalise a destination spelling to a config key
--   count_shifts(start, shift, end, end_shift)  half-day units for a duty window
--   recalculate_program_pay(program_id)         derive and store one program's pay
--
-- Scope: function definitions only. No table or row is modified here; the
-- backfill in 0045 is what writes program_pay. programs is only ever read, so the
-- program_command_history trigger is never engaged.
--
-- Fail-closed by construction: if a rate cannot be resolved, or the start date or
-- shift is unusable, the result is an UNRESOLVED row carrying a reason and no
-- money — never a zero-amount "success".
--
-- Idempotent: CREATE OR REPLACE throughout.

BEGIN;

-- Normalisation is data-driven: every observed spelling lives in
-- escort_destination_alias, so a new variant is an INSERT, not a code change.
-- STABLE, not IMMUTABLE, because it reads a table.
CREATE OR REPLACE FUNCTION public.escort_destination_key(raw text)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    (SELECT a.destination_key
       FROM public.escort_destination_alias a
      WHERE a.raw_key = lower(btrim(coalesce(raw, '')))),
    '*');
$$;

COMMENT ON FUNCTION public.escort_destination_key(text) IS
 'Maps a raw vessel destination spelling onto an escort_rate_config.destination_key, defaulting to the ''*'' fallback.';

-- Half-day units for a duty window. Each D or N shift is half a day, so the unit
-- count equals the number of shifts covered.
--
-- The current schema cannot express a range (programs has one startDate, one
-- shift, and an empty endDate on 100% of rows), so callers pass a NULL end and
-- get 1. The general branch is nevertheless implemented with real shift parity
-- rather than a placeholder formula, so it stays correct if a range ever becomes
-- representable, and returns NULL rather than a wrong number when the window is
-- contradictory.
CREATE OR REPLACE FUNCTION public.count_shifts(
  p_start date, p_start_shift text, p_end date, p_end_shift text)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_start IS NULL OR p_start_shift IS NULL OR p_start_shift NOT IN ('D', 'N') THEN NULL
    WHEN p_end IS NULL THEN 1
    WHEN p_end < p_start THEN NULL
    WHEN p_end = p_start AND (p_end_shift IS NULL OR p_end_shift = p_start_shift) THEN 1
    WHEN p_end_shift IS NULL OR p_end_shift NOT IN ('D', 'N') THEN NULL
    ELSE abs(
           ((p_end - p_start) * 2 + CASE p_end_shift WHEN 'D' THEN 0 ELSE 1 END)
           - (CASE p_start_shift WHEN 'D' THEN 0 ELSE 1 END)
         ) + 1
  END;
$$;

COMMENT ON FUNCTION public.count_shifts(date, text, date, text) IS
 'Half-day units covered by a duty window. Each D or N shift counts as half a day. NULL when the window is unusable.';

-- Derive one program's pay and upsert program_pay.
--
-- Invoker rights, deliberately: recalculating is a maintenance action, and the
-- application role holds SELECT only on program_pay. Resolves the exact
-- destination key first, then falls back to the '*' row so an unmapped spelling
-- cannot silently zero a payment.
CREATE OR REPLACE FUNCTION public.recalculate_program_pay(p_program_id text)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r        record;
  cfg      record;
  d        date;
  units    integer;
  key      text;
  sal      bigint;
  conv     bigint;
BEGIN
  SELECT p.id, p."startDate", p.shift, p.destination, p.status,
         (p.details::jsonb ->> 'confirmationMessageId') AS conf
    INTO r
    FROM public.programs p
   WHERE p.id = p_program_id;

  IF NOT FOUND THEN
    RETURN 'MISSING';
  END IF;

  -- Only a confirmed program is priced. programs.status is the mixed-case
  -- 'Confirmed' (escort_order_register uses DRAFT/REVIEW); the confirmation
  -- message id must also be present, which agrees on all 83 current rows.
  IF r.status IS DISTINCT FROM 'Confirmed' OR r.conf IS NULL THEN
    DELETE FROM public.program_pay WHERE program_id = p_program_id;
    RETURN 'SKIPPED_NOT_CONFIRMED';
  END IF;

  d := CASE WHEN r."startDate" ~ '^\d{4}-\d{2}-\d{2}$' THEN r."startDate"::date END;

  IF d IS NULL OR r.shift IS NULL OR r.shift NOT IN ('D', 'N') THEN
    INSERT INTO public.program_pay
      (program_id, rule_version, destination_key, shift_count, half_day_units, state, reasons)
    VALUES
      (p_program_id, 1, public.escort_destination_key(r.destination), 0, 0,
       'UNRESOLVED',
       jsonb_build_array(CASE WHEN d IS NULL THEN 'START_DATE_INVALID' ELSE 'SHIFT_INVALID' END))
    ON CONFLICT (program_id) DO UPDATE SET
      rule_version     = EXCLUDED.rule_version,
      destination_key  = EXCLUDED.destination_key,
      shift_count      = EXCLUDED.shift_count,
      half_day_units   = EXCLUDED.half_day_units,
      rate_config_id   = NULL,
      shift_rate_minor = NULL, salary_minor = NULL,
      conveyance_minor = NULL, total_minor   = NULL,
      state            = EXCLUDED.state,
      reasons          = EXCLUDED.reasons,
      computed_at      = now();
    RETURN 'UNRESOLVED';
  END IF;

  units := public.count_shifts(d, r.shift, NULL, NULL);
  key   := public.escort_destination_key(r.destination);

  IF units IS NULL THEN
    INSERT INTO public.program_pay
      (program_id, rule_version, destination_key, shift_count, half_day_units, state, reasons)
    VALUES
      (p_program_id, 1, key, 0, 0, 'UNRESOLVED', jsonb_build_array('SHIFT_WINDOW_INVALID'))
    ON CONFLICT (program_id) DO UPDATE SET
      rule_version = EXCLUDED.rule_version, destination_key = EXCLUDED.destination_key,
      shift_count = EXCLUDED.shift_count, half_day_units = EXCLUDED.half_day_units,
      rate_config_id = NULL, shift_rate_minor = NULL, salary_minor = NULL,
      conveyance_minor = NULL, total_minor = NULL,
      state = EXCLUDED.state, reasons = EXCLUDED.reasons, computed_at = now();
    RETURN 'UNRESOLVED';
  END IF;

  SELECT * INTO cfg
    FROM public.escort_rate_config c
   WHERE c.active
     AND c.destination_key = key
     AND c.effective_from <= d
     AND (c.effective_to IS NULL OR c.effective_to > d)
   ORDER BY c.effective_from DESC
   LIMIT 1;

  IF NOT FOUND AND key <> '*' THEN
    SELECT * INTO cfg
      FROM public.escort_rate_config c
     WHERE c.active
       AND c.destination_key = '*'
       AND c.effective_from <= d
       AND (c.effective_to IS NULL OR c.effective_to > d)
     ORDER BY c.effective_from DESC
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.program_pay
      (program_id, rule_version, destination_key, shift_count, half_day_units, state, reasons)
    VALUES
      (p_program_id, 1, key, units, units, 'UNRESOLVED', jsonb_build_array('RATE_CONFIG_MISSING'))
    ON CONFLICT (program_id) DO UPDATE SET
      rule_version = EXCLUDED.rule_version, destination_key = EXCLUDED.destination_key,
      shift_count = EXCLUDED.shift_count, half_day_units = EXCLUDED.half_day_units,
      rate_config_id = NULL, shift_rate_minor = NULL, salary_minor = NULL,
      conveyance_minor = NULL, total_minor = NULL,
      state = EXCLUDED.state, reasons = EXCLUDED.reasons, computed_at = now();
    RETURN 'UNRESOLVED';
  END IF;

  sal  := cfg.shift_rate_minor * units;
  conv := cfg.conveyance_minor;

  INSERT INTO public.program_pay
    (program_id, rule_version, rate_config_id, destination_key,
     shift_count, half_day_units, shift_rate_minor,
     salary_minor, conveyance_minor, total_minor, state, reasons)
  VALUES
    (p_program_id, 1, cfg.id, key,
     units, units, cfg.shift_rate_minor,
     sal, conv, sal + conv, 'CALCULATED', '[]'::jsonb)
  ON CONFLICT (program_id) DO UPDATE SET
    rule_version     = EXCLUDED.rule_version,
    rate_config_id   = EXCLUDED.rate_config_id,
    destination_key  = EXCLUDED.destination_key,
    shift_count      = EXCLUDED.shift_count,
    half_day_units   = EXCLUDED.half_day_units,
    shift_rate_minor = EXCLUDED.shift_rate_minor,
    salary_minor     = EXCLUDED.salary_minor,
    conveyance_minor = EXCLUDED.conveyance_minor,
    total_minor      = EXCLUDED.total_minor,
    state            = EXCLUDED.state,
    reasons          = EXCLUDED.reasons,
    computed_at      = now();

  RETURN 'CALCULATED';
END; $$;

COMMENT ON FUNCTION public.recalculate_program_pay(text) IS
 'Derive and upsert program_pay for one program. Returns CALCULATED, UNRESOLVED, SKIPPED_NOT_CONFIRMED or MISSING. Never posts or pays anything.';

GRANT EXECUTE ON FUNCTION public.escort_destination_key(text)     TO alrifai_app;
GRANT EXECUTE ON FUNCTION public.count_shifts(date, text, date, text) TO alrifai_app;
GRANT EXECUTE ON FUNCTION public.recalculate_program_pay(text)     TO alrifai_app;

COMMIT;
