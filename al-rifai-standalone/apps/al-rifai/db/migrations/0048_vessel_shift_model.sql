-- 0048: correct the shift model (B5 UI fix).
--
-- What was wrong: 0044 treated a program as ONE shift (0.5 day). That was a
-- consequence of endDate being empty on every row, not a reading of the business
-- rule, and it priced an ongoing duty as if it were a single finished shift.
--
-- The correct model (Owner, 2026-11-02):
--   Each day has two shifts: D (day) and N (night).
--   Shifts run from start(date,shift) to end(date,shift) INCLUSIVE.
--   Worked example: 2026-11-02(N) -> 2026-11-20(D) = 36 shifts = 18 days,
--   salary = 36 x BDT 200.00 = BDT 7,200.00.
--   While endDate is empty the duty is ongoing, so nothing is calculated: the
--   register shows no days and no money until the duty is released.
--
-- Consequence, stated plainly: no program currently carries an endDate (0 of 85,
-- verified 2026-11-02), so after this migration every program resolves to
-- UNRESOLVED / END_DATE_REQUIRED and the register shows ৳— throughout. That is the
-- intended fail-closed state; amounts appear when a release command sets endDate.
--
-- Append-only: CREATE OR REPLACE in a new migration. 0044 is applied and its
-- sha256 is in the ledger; editing it would break the checksum guarantee restored
-- in d504505.
--
-- Note on units: half_day_units counts SHIFTS (one shift is half a day), so days
-- are half_day_units / 2. shift_count carries the same number for readability.

BEGIN;

-- Total shifts between two (date, shift) points, inclusive. NULL when the window
-- is incomplete or backwards, so a caller must decide what to do rather than
-- silently receiving 0. Shift offsets: D = 0, N = 1.
CREATE OR REPLACE FUNCTION public.count_shifts(
  p_start date, p_start_shift text, p_end date, p_end_shift text)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_start IS NULL OR p_end IS NULL THEN NULL
    WHEN p_start_shift IS NULL OR p_start_shift NOT IN ('D', 'N') THEN NULL
    WHEN p_end_shift IS NULL OR p_end_shift NOT IN ('D', 'N') THEN NULL
    WHEN ((p_end - p_start) * 2
          + CASE p_end_shift WHEN 'D' THEN 0 ELSE 1 END
          - CASE p_start_shift WHEN 'D' THEN 0 ELSE 1 END) < 0 THEN NULL
    ELSE ((p_end - p_start) * 2
          + CASE p_end_shift WHEN 'D' THEN 0 ELSE 1 END
          - CASE p_start_shift WHEN 'D' THEN 0 ELSE 1 END) + 1
  END;
$$;

COMMENT ON FUNCTION public.count_shifts(date, text, date, text) IS
 'Inclusive shift count between two (date,shift) points, D=0 N=1. 2026-11-02(N) to 2026-11-20(D) = 36. NULL when incomplete or backwards.';

CREATE OR REPLACE FUNCTION public.recalculate_program_pay(p_program_id text)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r          record;
  cfg        record;
  d_start    date;
  d_end      date;
  end_shift  text;
  shifts     integer;
  key        text;
  sal        bigint;
  conv       bigint;
  unresolved jsonb;
BEGIN
  SELECT p.id, p."startDate", p."endDate", p.shift, p.destination, p.status,
         (p.details::jsonb ->> 'confirmationMessageId') AS conf,
         (p.details::jsonb ->> 'endShift')             AS end_shift
    INTO r
    FROM public.programs p
   WHERE p.id = p_program_id;

  IF NOT FOUND THEN
    RETURN 'MISSING';
  END IF;

  IF r.status IS DISTINCT FROM 'Confirmed' OR r.conf IS NULL THEN
    DELETE FROM public.program_pay WHERE program_id = p_program_id;
    RETURN 'SKIPPED_NOT_CONFIRMED';
  END IF;

  d_start := CASE WHEN r."startDate" ~ '^\d{4}-\d{2}-\d{2}$' THEN r."startDate"::date END;
  d_end   := CASE WHEN r."endDate"   ~ '^\d{4}-\d{2}-\d{2}$' THEN r."endDate"::date   END;
  end_shift := nullif(btrim(coalesce(r.end_shift, '')), '');

  -- Reason selection, most fundamental problem first.
  IF d_start IS NULL OR r.shift IS NULL OR r.shift NOT IN ('D', 'N') THEN
    unresolved := jsonb_build_array(CASE WHEN d_start IS NULL THEN 'START_DATE_INVALID' ELSE 'SHIFT_INVALID' END);
  ELSIF btrim(coalesce(r."endDate", '')) = '' THEN
    unresolved := jsonb_build_array('END_DATE_REQUIRED');       -- duty still ongoing
  ELSIF d_end IS NULL THEN
    unresolved := jsonb_build_array('END_DATE_INVALID');
  ELSIF end_shift IS NULL OR end_shift NOT IN ('D', 'N') THEN
    unresolved := jsonb_build_array('END_SHIFT_REQUIRED');
  ELSE
    shifts := public.count_shifts(d_start, r.shift, d_end, end_shift);
    IF shifts IS NULL THEN
      unresolved := jsonb_build_array('SHIFT_WINDOW_INVALID');
    END IF;
  END IF;

  IF unresolved IS NOT NULL THEN
    INSERT INTO public.program_pay
      (program_id, rule_version, destination_key, shift_count, half_day_units, state, reasons)
    VALUES
      (p_program_id, 2, public.escort_destination_key(r.destination), 0, 0, 'UNRESOLVED', unresolved)
    ON CONFLICT (program_id) DO UPDATE SET
      rule_version = EXCLUDED.rule_version, destination_key = EXCLUDED.destination_key,
      shift_count = 0, half_day_units = 0,
      rate_config_id = NULL, shift_rate_minor = NULL, salary_minor = NULL,
      conveyance_minor = NULL, total_minor = NULL,
      state = 'UNRESOLVED', reasons = EXCLUDED.reasons, computed_at = now();
    RETURN 'UNRESOLVED';
  END IF;

  key := public.escort_destination_key(r.destination);

  SELECT * INTO cfg
    FROM public.escort_rate_config c
   WHERE c.active AND c.destination_key = key
     AND c.effective_from <= d_start
     AND (c.effective_to IS NULL OR c.effective_to > d_start)
   ORDER BY c.effective_from DESC LIMIT 1;

  IF NOT FOUND AND key <> '*' THEN
    SELECT * INTO cfg
      FROM public.escort_rate_config c
     WHERE c.active AND c.destination_key = '*'
       AND c.effective_from <= d_start
       AND (c.effective_to IS NULL OR c.effective_to > d_start)
     ORDER BY c.effective_from DESC LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.program_pay
      (program_id, rule_version, destination_key, shift_count, half_day_units, state, reasons)
    VALUES
      (p_program_id, 2, key, shifts, shifts, 'UNRESOLVED', jsonb_build_array('RATE_CONFIG_MISSING'))
    ON CONFLICT (program_id) DO UPDATE SET
      rule_version = EXCLUDED.rule_version, destination_key = EXCLUDED.destination_key,
      shift_count = EXCLUDED.shift_count, half_day_units = EXCLUDED.half_day_units,
      rate_config_id = NULL, shift_rate_minor = NULL, salary_minor = NULL,
      conveyance_minor = NULL, total_minor = NULL,
      state = 'UNRESOLVED', reasons = EXCLUDED.reasons, computed_at = now();
    RETURN 'UNRESOLVED';
  END IF;

  sal  := cfg.shift_rate_minor * shifts;
  conv := cfg.conveyance_minor;

  INSERT INTO public.program_pay
    (program_id, rule_version, rate_config_id, destination_key,
     shift_count, half_day_units, shift_rate_minor,
     salary_minor, conveyance_minor, total_minor, state, reasons)
  VALUES
    (p_program_id, 2, cfg.id, key, shifts, shifts, cfg.shift_rate_minor,
     sal, conv, sal + conv, 'CALCULATED', '[]'::jsonb)
  ON CONFLICT (program_id) DO UPDATE SET
    rule_version = EXCLUDED.rule_version, rate_config_id = EXCLUDED.rate_config_id,
    destination_key = EXCLUDED.destination_key,
    shift_count = EXCLUDED.shift_count, half_day_units = EXCLUDED.half_day_units,
    shift_rate_minor = EXCLUDED.shift_rate_minor, salary_minor = EXCLUDED.salary_minor,
    conveyance_minor = EXCLUDED.conveyance_minor, total_minor = EXCLUDED.total_minor,
    state = 'CALCULATED', reasons = '[]'::jsonb, computed_at = now();

  RETURN 'CALCULATED';
END; $$;

COMMENT ON FUNCTION public.recalculate_program_pay(text) IS
 'Derive and upsert program_pay for one program from the release window. Salary = shifts x shift rate; days = shifts / 2. Nothing is calculated while endDate is empty.';

COMMIT;
