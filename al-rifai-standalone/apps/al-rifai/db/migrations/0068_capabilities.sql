-- 0068: the three new submit capabilities, granted explicitly.
--
-- The capability vocabulary lives in code (lib/unified-auth-policy.ts), and
-- resolveCapabilities() unions the role defaults with whatever is stored on the row.
-- This migration records the grants on the rows themselves as well, so a later change
-- to a role default cannot silently remove an access the owner has granted, and so
-- the Admin Panel shows the real set rather than an empty array.
--
-- Nothing is elevated: USER never receives vessel.command, cash.review, audit.read or
-- workspace.admin. Existing grants are preserved and deduplicated.

BEGIN;

UPDATE public.cash_portal_users
   SET capabilities = (
         SELECT coalesce(jsonb_agg(DISTINCT value ORDER BY value), '[]'::jsonb)
           FROM jsonb_array_elements_text(
                  coalesce(capabilities,'[]'::jsonb) || '["vessel.submit","employee.submit","attendance.submit"]'::jsonb
                ) AS value
         WHERE value IN ('cash.read','cash.submit','cash.review','vessel.read',
                         'vessel.command','vessel.submit','employee.submit',
                         'attendance.submit','audit.read','workspace.admin')
       ),
       version = version + 1
 WHERE role = 'USER';

UPDATE public.cash_portal_users
   SET capabilities = (
         SELECT coalesce(jsonb_agg(DISTINCT value ORDER BY value), '[]'::jsonb)
           FROM jsonb_array_elements_text(
                  coalesce(capabilities,'[]'::jsonb) ||
                  '["cash.read","cash.submit","cash.review","vessel.read","vessel.command","vessel.submit","employee.submit","attendance.submit","audit.read"]'::jsonb
                ) AS value
         WHERE value IN ('cash.read','cash.submit','cash.review','vessel.read',
                         'vessel.command','vessel.submit','employee.submit',
                         'attendance.submit','audit.read','workspace.admin')
       ),
       version = version + 1
 WHERE role = 'ADMIN';

COMMIT;
