-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSED CANDIDATE — NOT APPLIED, NOT IN db/migrations, NOT LEDGERED.
--
-- Owner decision D3: the destination in the Owner's Example B is written
-- "kacpur". The existing reference table already maps the canonical spelling
-- "kachpur" → "kachpur" and there is an active rate row "kachpur", so the only
-- missing piece is the alias row. No new table is created.
--
-- Evidence (verified read-only, 2026-11-04):
--   escort_destination_alias rows = 46, distinct destination_key = 23
--   escort_destination_key('kachpur') = 'kachpur'   (canonical key works)
--   escort_destination_key('kacpur')  = '*'         (falls back, conveyance lost)
--   escort_rate_config has rate-kachpur, shift 20000 paisa, conveyance 60000 paisa
--   raw 'kacpur' occurs in the Owner's Example B and in the real message
--   ACCCC05B0B8F4213FADECC3E6F26F810 (2026-11-03, authorized direct chat).
--
-- Apply only with explicit Owner approval and a pre-migration pg_dump.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO public.escort_destination_alias (raw_key, destination_key, note)
VALUES ('kacpur', 'kachpur', 'Owner example B / real message ACCCC05B 2026-11-03')
ON CONFLICT (raw_key) DO NOTHING;

COMMIT;

-- Verification after applying (read-only):
--   SELECT escort_destination_key('kacpur');      -- expect 'kachpur'
--   SELECT count(*) FROM escort_destination_alias; -- expect 47
-- No program_pay row is recalculated by this migration. Existing programs keep
-- their current derived pay until recalculate_program_pay() is run for them,
-- which is a separate, explicitly approved operation.
