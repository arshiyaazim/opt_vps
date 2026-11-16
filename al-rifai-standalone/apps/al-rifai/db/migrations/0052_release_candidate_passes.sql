-- 0052: release_candidates pass tracking (R1 pass 2/3 fix).
--
-- The three-pass matcher needs to record which pass produced a match and why, so
-- the admin review can tell a primary (calc_start within ±2) match from a fallback
-- (same-day partial payment, or duty-window attribution). Two additive columns:
--
--   match_pass  which pass matched (1 primary, 2 same-day partial, 3 window);
--               NULL when nothing matched.
--   notes       human-readable reason, e.g. "partial payment, same day as primary
--               ৳2550" or "window attribution, calc_start 2026-08-06 outside ±2".
--
-- No existing column is altered, no data is rewritten, and programs is untouched.
-- The schema fixes confirmed by the owner are already in 0051 (program_id TEXT,
-- match_status includes REJECTED, escort_phone stays NOT NULL).

BEGIN;

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS match_pass smallint
    CHECK (match_pass IS NULL OR match_pass IN (1, 2, 3));

ALTER TABLE public.release_candidates
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.release_candidates.match_pass IS
 'Which matching pass produced the program link: 1 = calc_start within ±2, 2 = same-day partial payment, 3 = duty-window attribution. NULL when unmatched.';

COMMENT ON COLUMN public.release_candidates.notes IS
 'Why this candidate was matched or flagged, for admin review. Never used for logic.';

COMMIT;
