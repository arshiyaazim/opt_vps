-- 0046: Owner rate schedule (B5.2a) — the real rates.
--
-- Why a new migration instead of editing 0042: 0042 is applied and its sha256 is
-- recorded in alrifai_schema_migrations. Editing an applied migration is exactly
-- what produced the 0016/0039 checksum drift reconciled in d504505, and it would
-- make scripts/database.mjs migrate refuse to run. Schema and seed therefore stay
-- in separate, append-only files.
--
-- Owner-confirmed schedule (2026-11-02):
--   shift rate  : BDT 200.00 per shift, uniform across every destination
--                 (20000 paisa; a shift is half a day, so a day is BDT 400.00)
--   conveyance  : per destination, see the table below
--   effective   : 2025-01-01, so it covers every program in the current epoch
--                 (earliest startDate 2026-07-12)
--
-- Destination model, as explained by the Owner: "N. Gonj" is the umbrella name
-- used in all WhatsApp traffic and is the dominant value in programs. The
-- individual ghats (Murapara, Habib Ghat, Nitaigonj, ...) appear only on
-- handwritten release slips, so they are separate keys here, ready for when that
-- data is digitised. All N. Gonj-area ghats share BDT 600.00 conveyance.
--
-- The '*' fallback covers the 62 programs with no destination. Its zero
-- conveyance is an Owner-confirmed zero (salary only), NOT missing data, and the
-- evidence_ref says so explicitly so a later reader does not "fix" it.
--
-- Idempotent: rates upsert on id, aliases upsert on raw_key. Re-running is safe
-- and does not duplicate rows.

BEGIN;

INSERT INTO public.escort_rate_config
  (id, destination_key, destination_label, shift_rate_minor, conveyance_minor,
   effective_from, evidence_ref)
VALUES
  ('rate-narayanganj','narayanganj','Narayanganj',20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-rupshi',     'rupshi',     'Rupshi',      20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-kachpur',    'kachpur',    'Kachpur',     20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-murapara',   'murapara',   'Murapara',    20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-shah',       'shah',       'Shah',        20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-nitaigonj',  'nitaigonj',  'Nitaigonj',   20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-bhairob',    'bhairob',    'Bhairob',     20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-ashuganj',   'ashuganj',   'Ashuganj',    20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-rupgonj',    'rupgonj',    'Rupgonj',     20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-habibghat',  'habibghat',  'Habib Ghat',  20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-kazipara',   'kazipara',   'Kazipara',    20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-aricha',     'aricha',     'Aricha',      20000, 70000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-bmc',        'bmc',        'BMC',         20000, 70000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-kaligonj',   'kaligonj',   'Kaligonj',    20000, 60000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-baghabari',  'baghabari',  'Baghabari',   20000,100000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-nowapara',   'nowapara',   'Nowapara',    20000,100000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-faridpur',   'faridpur',   'Faridpur',    20000, 80000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-jhalokathi', 'jhalokathi', 'Jhalokathi',  20000,100000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-barishal',   'barishal',   'Barishal',    20000,100000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-nagorbari',  'nagorbari',  'Nagorbari',   20000,100000,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-chattogram', 'chattogram', 'Chattogram',  20000,     0,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  ('rate-local',      'local',      'Local',       20000,     0,'2025-01-01','OWNER_RATE_SCHEDULE_2026_11'),
  -- Fallback for programs with no destination at all.
  ('rate-fallback',   '*',          'Unspecified', 20000,     0,'2025-01-01',
   'OWNER_RATE_SCHEDULE_2026_11_OWNER_CONFIRMED_ZERO_CONVEYANCE_NOT_MISSING')
ON CONFLICT (id) DO UPDATE SET
  destination_key   = EXCLUDED.destination_key,
  destination_label = EXCLUDED.destination_label,
  shift_rate_minor  = EXCLUDED.shift_rate_minor,
  conveyance_minor  = EXCLUDED.conveyance_minor,
  effective_from    = EXCLUDED.effective_from,
  evidence_ref      = EXCLUDED.evidence_ref,
  version           = public.escort_rate_config.version + 1,
  updated_at        = now();

-- Aliases. ON CONFLICT DO UPDATE is required, not DO NOTHING: 0042 seeded
-- 'noapara' -> 'noapara', and the Owner schedule makes 'noapara' an alias of
-- 'nowapara'. Without the update, the 4 programs spelled Noapara / N.Para /
-- N. Para would keep resolving to a key that has no rate.
INSERT INTO public.escort_destination_alias (raw_key, destination_key, note) VALUES
  ('narayanganj','narayanganj','canonical'),
  ('narayangonj','narayanganj','spelling variant'),
  ('n. gonj',    'narayanganj','umbrella name used in WhatsApp traffic'),
  ('n.gonj',     'narayanganj','defensive: no space'),
  ('rupshi',     'rupshi',     'canonical'),
  ('kachpur',    'kachpur',    'canonical'),
  ('k. pur',     'kachpur',    'spelling variant'),
  ('murapara',   'murapara',   'canonical'),
  ('m. para',    'murapara',   'spelling variant'),
  ('shah',       'shah',       'canonical'),
  ('nitaigonj',  'nitaigonj',  'canonical'),
  ('bhairob',    'bhairob',    'canonical'),
  ('ashuganj',   'ashuganj',   'canonical'),
  ('ashuginj',   'ashuganj',   'spelling variant'),
  ('a. gonj',    'ashuganj',   'spelling variant'),
  ('rupgonj',    'rupgonj',    'canonical'),
  ('r. gonj',    'rupgonj',    'spelling variant'),
  ('habibghat',  'habibghat',  'canonical'),
  ('habib ghat', 'habibghat',  'spaced label form'),
  ('h. ghat',    'habibghat',  'spelling variant'),
  ('kazipara',   'kazipara',   'canonical'),
  ('k. para',    'kazipara',   'spelling variant'),
  ('aricha',     'aricha',     'canonical'),
  ('bmc',        'bmc',        'canonical'),
  ('kaligonj',   'kaligonj',   'canonical'),
  ('k. gonj',    'kaligonj',   'spelling variant'),
  ('baghabari',  'baghabari',  'canonical'),
  ('b. bari',    'baghabari',  'spelling variant'),
  ('nowapara',   'nowapara',   'canonical'),
  ('noapara',    'nowapara',   'remapped by 0046 from 0042 value'),
  ('n. para',    'nowapara',   'spelling variant'),
  ('n.para',     'nowapara',   'defensive: no space'),
  ('faridpur',   'faridpur',   'canonical'),
  ('f. pur',     'faridpur',   'spelling variant'),
  ('jhalokathi', 'jhalokathi', 'canonical'),
  ('j. kathi',   'jhalokathi', 'spelling variant'),
  ('barishal',   'barishal',   'canonical'),
  ('b. shal',    'barishal',   'spelling variant'),
  ('nagorbari',  'nagorbari',  'canonical'),
  ('n. bari',    'nagorbari',  'spelling variant'),
  ('chattogram', 'chattogram', 'canonical'),
  ('chittagong', 'chattogram', 'alternate spelling'),
  ('ctg',        'chattogram', 'abbreviation'),
  ('local',      'local',      'canonical'),
  ('*',          '*',          'explicit fallback')
ON CONFLICT (raw_key) DO UPDATE SET
  destination_key = EXCLUDED.destination_key,
  note            = EXCLUDED.note;

COMMIT;
