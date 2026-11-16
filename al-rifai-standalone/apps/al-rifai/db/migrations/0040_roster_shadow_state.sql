-- 0040: persistent roster SHADOW state.
--
-- Phase C stores comparison state in PostgreSQL instead of a JS module variable so
-- that (a) promotion survives a container restart and (b) the ingestion worker and
-- the Next.js /api/health route (separate processes) observe the same state.
--
-- Singleton row. Promotion is one-way: mode moves SHADOW -> DB once, and reverting
-- requires an explicit reset (DELETE the row) plus an owner-authorized deploy.

BEGIN;

CREATE TABLE IF NOT EXISTS public.roster_shadow_state (
  singleton boolean PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  mode text NOT NULL DEFAULT 'SHADOW' CHECK (mode IN ('SHADOW','DB')),
  cycles_completed integer NOT NULL DEFAULT 0 CHECK (cycles_completed >= 0),
  diffs_found integer NOT NULL DEFAULT 0 CHECK (diffs_found >= 0),
  started_at timestamptz NOT NULL,
  auto_promote_at timestamptz NOT NULL,
  auto_promote_blocked boolean NOT NULL DEFAULT FALSE,
  last_check_at timestamptz,
  last_diff_detail jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roster_shadow_state IS
  'Phase C SHADOW state (singleton). The worker seeds the row from env on the first SHADOW cycle; promotion to DB is one-way. Reset a shadow period with DELETE FROM public.roster_shadow_state.';

COMMENT ON COLUMN public.roster_shadow_state.cycles_completed IS
  'Monotonic count of completed SHADOW comparison cycles.';
COMMENT ON COLUMN public.roster_shadow_state.diffs_found IS
  'Monotonic count of cycles whose comparison found at least one difference. Promotion requires this to remain 0 for the whole period.';
COMMENT ON COLUMN public.roster_shadow_state.auto_promote_blocked IS
  'Sticky once set. Cleared only by an explicit new shadow period (DELETE the singleton row).';

-- The ingestion worker seeds/writes; the read-only web pool reads. Both run as alrifai_app.
GRANT SELECT, INSERT, UPDATE ON public.roster_shadow_state TO alrifai_app;
REVOKE ALL ON public.roster_shadow_state FROM PUBLIC;

COMMIT;
