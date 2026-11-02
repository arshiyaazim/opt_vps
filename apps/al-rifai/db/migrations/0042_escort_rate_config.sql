-- 0042: vessel pay rates and destination normalisation (B5.2a).
--
-- Why this exists: B5 needs a salary/conveyance model for confirmed vessel
-- programs. No rate, wage, salary, conveyance or policy table exists anywhere in
-- the database, and conveyance is not present in programs, program_assignments or
-- escort_order_register. The old application kept both in a per-destination
-- config table; this migration reintroduces that idea as an explicit,
-- Owner-maintained table rather than anything inferred from program data.
--
-- Money convention: this codebase stores money in minor units
-- (cash_instructions.amount_minor). Rates are therefore bigint paisa, not the
-- old app's NUMERIC Taka. BDT 200.00 is 20000.
--
-- Destination reality (verified 2026-11-02 on the current epoch, 83 programs):
--   '' 62 | Narayanganj 8 | Rupshi 4 | Narayongonj 2 | Noapara 2
--   N. Gonj 2 | N.Para 1 | N. Para 1 | Chattogram 1
-- Only 21 of 83 programs carry a destination at all, and the spellings disagree,
-- so a raw-string join to a rate row would price almost nothing. The alias table
-- exists to make that normalisation explicit and reviewable instead of hidden in
-- string manipulation.
--
-- IMPORTANT: this migration does NOT seed rates. The rate block below is
-- deliberately inert. No business rate has been supplied, and inventing one would
-- put fabricated money in front of the Owner. Apply this migration, then insert
-- rates once the Owner provides them; until then every program resolves to
-- UNRESOLVED / RATE_CONFIG_MISSING, which is the correct fail-closed behaviour.
--
-- Scope: two new tables, their grants, and an alias seed (non-financial).
-- Touches no existing table, no program row, and no frozen roster/bridge path.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS plus ON CONFLICT DO NOTHING throughout.

BEGIN;

CREATE TABLE IF NOT EXISTS public.escort_rate_config (
  id                text        PRIMARY KEY,
  destination_key   text        NOT NULL,
  destination_label text        NOT NULL,
  shift_rate_minor  bigint      NOT NULL CHECK (shift_rate_minor >= 0),
  conveyance_minor  bigint      NOT NULL DEFAULT 0 CHECK (conveyance_minor >= 0),
  effective_from    date        NOT NULL,
  effective_to      date,
  active            boolean     NOT NULL DEFAULT true,
  version           integer     NOT NULL DEFAULT 1,
  evidence_ref      text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escort_rate_config_key_from_uk UNIQUE (destination_key, effective_from),
  CONSTRAINT escort_rate_config_window_chk  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT escort_rate_config_key_chk     CHECK (destination_key = lower(destination_key) AND btrim(destination_key) <> ''),
  CONSTRAINT escort_rate_config_evidence_chk CHECK (btrim(evidence_ref) <> '')
);

COMMENT ON TABLE public.escort_rate_config IS
 'Owner-maintained vessel pay rates. Never inferred from program data, confirmation messages or payment history. Money in minor units (BDT paisa). The ''*'' destination_key is the fallback for programs with no usable destination.';

CREATE TABLE IF NOT EXISTS public.escort_destination_alias (
  raw_key         text PRIMARY KEY,
  destination_key text NOT NULL,
  note            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escort_destination_alias_raw_chk CHECK (raw_key = lower(btrim(raw_key)) AND btrim(raw_key) <> '')
);

COMMENT ON TABLE public.escort_destination_alias IS
 'Maps a normalised raw destination spelling onto an escort_rate_config.destination_key. Rows are data, not code, so a new spelling is fixed by adding a row rather than by editing a function.';

-- Every raw spelling observed in the current epoch. Decision (Owner, 2026-11-02):
-- Narayongonj / N. Gonj -> narayanganj; N.Para / N. Para / Noapara -> noapara;
-- a program with no destination resolves to the '*' fallback, not to this table.
INSERT INTO public.escort_destination_alias (raw_key, destination_key, note) VALUES
  ('*',            '*',            'explicit fallback'),
  ('narayanganj',  'narayanganj',  'canonical'),
  ('narayongonj',  'narayanganj',  'spelling variant'),
  ('n. gonj',      'narayanganj',  'spelling variant'),
  ('n.gonj',       'narayanganj',  'defensive: no space'),
  ('rupshi',       'rupshi',       'canonical'),
  ('noapara',      'noapara',      'canonical'),
  ('n.para',       'noapara',      'spelling variant'),
  ('n. para',      'noapara',      'spelling variant'),
  ('chattogram',   'chattogram',   'canonical')
ON CONFLICT (raw_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RATES — INERT. Populate only after the Owner supplies real values.
--
-- Uncomment and replace the placeholders, or insert rows directly, e.g.
--   INSERT INTO public.escort_rate_config
--     (id, destination_key, destination_label, shift_rate_minor,
--      conveyance_minor, effective_from, evidence_ref)
--   VALUES ('rate-narayanganj','narayanganj','Narayanganj',
--           20000, 0, '2026-07-01', 'OWNER_PROVIDED_2026-11-02');
--
-- A row is required for '*' before most programs can be priced: 62 of 83 carry
-- no destination. `shift_rate_minor` is per SHIFT (a shift is half a day).
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.escort_rate_config        TO alrifai_app;
GRANT SELECT ON public.escort_destination_alias  TO alrifai_app;

COMMIT;
