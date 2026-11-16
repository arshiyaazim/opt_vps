-- 0063: make the program_with_employee grants reproducible.
--
-- 0060 created the view and granted SELECT to alrifai_app. ir_review_runtime (the
-- role the vessel command writer connects as) was granted separately, by hand, on
-- 2026-11-03, because the phase 3 scope called for the grant as an operation rather
-- than a migration. A hand grant lives only in the live database: any restore from a
-- dump taken before it, followed by a migrate, would silently leave that role unable
-- to read the view.
--
-- GRANT is idempotent, so this is a no-op on the current database and a repair on any
-- restored one. No DDL, no data, no privilege reduction: both roles keep SELECT only,
-- exactly as they have today. Nothing is grantable to PUBLIC.

BEGIN;

GRANT SELECT ON public.program_with_employee TO alrifai_app;
GRANT SELECT ON public.program_with_employee TO ir_review_runtime;

COMMIT;
