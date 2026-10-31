-- 0041: catalog the CASH accountant in the roster.
--
-- Why this exists: live ingestion routing comes from loadConversationScopeWithShadow().
-- Once that returns the roster scope (DB mode), every chat the roster does not
-- contain stops being read. The legacy scope carries the Accountant direct chat
-- (8801844836824@s.whatsapp.net + its LID alias 19460614262828@lid); the roster did
-- not. Without this row, a DB cutover would silently drop CASH ingestion — the
-- "healthy-looking outage" class of defect.
--
-- Scope of change: roster cataloguing only. No CASH_SCOPE_* constant, no cash
-- processing logic, no financial posting, no message content is touched. The
-- accountant chat is already present in the WA-01 native-reader profile (9 chats),
-- so no bridge change and no bridge restart is required.
--
-- Idempotent: every insert uses ON CONFLICT DO NOTHING, and the epoch bump plus the
-- audit row are applied exactly once behind an operation_key guard.

BEGIN;

-- Person. Columns follow the applied 0037 schema (id/phone, not person_ref/phone_e164).
INSERT INTO public.escort_roster
  (id, account_id, role, domain_scope, display_name, canonical_person_ref, phone,
   username, active, version, evidence_ref, approved_by, created_at, updated_at)
VALUES
  ('cash-person-accountant-mamun-wa01', 'wa-01', 'ACCOUNTANT', ARRAY['CASH']::text[],
   'Cash Payment', 'accountant-mamun-wa01', '+8801844836824',
   NULL, true, 1, 'migration-0041', 'system', now(), now())
ON CONFLICT (id) DO NOTHING;

-- One DIRECT row. The table CHECK requires a DIRECT chat_jid to end in
-- @s.whatsapp.net, so the LID belongs in participant_jid — the same shape as the
-- existing ch-hridoy-direct-lid row. A single row yields both the canonical chat
-- key and its LID alias in loadRosterScope().
INSERT INTO public.escort_roster_channel
  (id, roster_id, account_id, chat_jid, participant_jid, channel_role, domain,
   active, version, created_at, updated_at)
VALUES
  ('ch-accountant-direct-lid', 'cash-person-accountant-mamun-wa01', 'wa-01',
   '8801844836824@s.whatsapp.net', '19460614262828@lid', 'DIRECT', 'CASH',
   true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Epoch bump and audit trail, applied exactly once so a re-run is inert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.escort_roster_audit
    WHERE operation_key = 'backfill:person:cash-person-accountant-mamun-wa01'
  ) THEN
    UPDATE public.escort_roster_epoch
       SET epoch = epoch + 1, updated_at = now()
     WHERE id = 1;

    INSERT INTO public.escort_roster_audit
      (id, roster_id, actor_id, action, reason, before_value, after_value,
       expected_version, operation_key, bridge_restart_required, created_at)
    VALUES
      ('audit-0041-cash-accountant', 'cash-person-accountant-mamun-wa01', 'system',
       'CREATE', 'CASH_SCOPE_PARITY_0041', NULL,
       jsonb_build_object(
         'source', 'migration-0041',
         'reason', 'cash-scope-parity',
         'chat_jid', '8801844836824@s.whatsapp.net',
         'participant_jid', '19460614262828@lid'
       ),
       1, 'backfill:person:cash-person-accountant-mamun-wa01', false, now());
  END IF;
END $$;

-- Already granted by 0037/0038; restated so the migration is self-contained.
GRANT SELECT ON public.escort_roster TO alrifai_app;
GRANT SELECT ON public.escort_roster_channel TO alrifai_app;

COMMIT;
