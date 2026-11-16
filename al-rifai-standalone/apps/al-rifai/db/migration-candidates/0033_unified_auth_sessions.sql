-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION.
--
-- Purpose: additive support for unified authentication on the existing Cash
-- Portal identity. This migration is deliberately narrow:
--
--   * no user row is inserted, renamed, deactivated or re-hashed;
--   * no existing password hash, user id, session, role or audit row changes;
--   * no financial table, grant, posting path or email/WhatsApp behaviour is
--     touched, and no UPDATE/DELETE grant is added anywhere;
--   * the Owner's current `cash_portal_users` row and live sessions remain
--     valid before and after application.
--
-- What it adds:
--   1. `capabilities jsonb` — explicit, Super-Admin-granted feature grants that
--      are additive to the stored role (role itself is never inferred from a
--      client, cookie or header).
--   2. `username_changed_at` — audit column for voluntary self-service renames.
--   3. `SELECT` on `cash_portal_audit` for the read-only Admin Panel history.
--      INSERT-only writing is unchanged; the app still cannot edit or delete
--      audit rows.
--   4. A defence-in-depth trigger that refuses to demote, deactivate or delete
--      the final active ADMIN row, even if application policy were bypassed.
--
-- Review required before application: exact Owner approval for this schema and
-- grant change, an isolated rehearsal against a restored clone, and a verified
-- rollback path (see docs/UNIFIED-AUTH-DESIGN.md).

BEGIN;

ALTER TABLE public.cash_portal_users
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cash_portal_users
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.cash_portal_users'::regclass
      AND conname = 'cash_portal_users_capabilities_array'
  ) THEN
    ALTER TABLE public.cash_portal_users
      ADD CONSTRAINT cash_portal_users_capabilities_array
      CHECK (jsonb_typeof(capabilities) = 'array');
  END IF;
END;
$$;

-- Read-only audit history for the Admin Panel. Writing stays INSERT-only.
GRANT SELECT ON public.cash_portal_audit TO ir_review_runtime;

-- ---- Final-active-administrator guard (defence in depth) -------------------
CREATE OR REPLACE FUNCTION public.alrifai_cash_portal_users_guard() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'ADMIN' AND OLD.active AND NOT EXISTS (
      SELECT 1 FROM public.cash_portal_users u
      WHERE u.role = 'ADMIN' AND u.active AND u.id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'LAST_ADMIN_PROTECTED' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'ADMIN' AND OLD.active AND (NEW.role <> 'ADMIN' OR NEW.active = false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cash_portal_users u
      WHERE u.role = 'ADMIN' AND u.active AND u.id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'LAST_ADMIN_PROTECTED' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_portal_users_guard ON public.cash_portal_users;

CREATE TRIGGER cash_portal_users_guard
  BEFORE UPDATE OR DELETE ON public.cash_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.alrifai_cash_portal_users_guard();

COMMIT;

-- Verification (run manually after application, read-only):
--   SELECT count(*) FROM public.cash_portal_users;                      -- unchanged
--   SELECT id, username, role, active FROM public.cash_portal_users;    -- unchanged
--   SELECT count(*) FROM public.cash_portal_sessions;                   -- unchanged
--   SELECT jsonb_typeof(capabilities) FROM public.cash_portal_users;    -- 'array'
