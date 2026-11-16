-- 0038: escort roster seed (Phase B). Additive, no behavior change.
-- Sources: S1 profile, S2 escort_client_contacts, S3 group authz, S4a conversation_scope, S4b aliases, S5 OWNER_ESCORT_CLIENTS.
-- Idempotent. No outbox entries. Legacy tables untouched. CASH_SCOPE_* NOT seeded.
-- Conflict resolutions (documented):
-- 1) Username @nhhridoyvau from S2/S5 (agree)
-- 2) Display names from S2 (curated) over S4b.profile_name (WhatsApp push/profile)
-- 3) New normalized roster person IDs replacing S4a short refs (escort-*-wa01 -> escort-person-*-wa01)

BEGIN;

-- Guard against double seed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.escort_roster) THEN
    RAISE EXCEPTION 'ESCORT_ROSTER_ALREADY_SEEDED';
  END IF;
END $$;

-- 9 escort persons (union S2 ∪ S5; S7 non-escort excluded; cash excluded)
-- source: S2 escort_client_contacts, S5 OWNER_ESCORT_CLIENTS
INSERT INTO public.escort_roster (id, account_id, role, domain_scope, display_name, canonical_person_ref, phone, username, active, version, approved_by)
VALUES
  ('escort-person-hridoy-wa01',       'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Escort Hridoy',       'escort-hridoy-wa01',       '+8801670535255', '@nhhridoyvau', true, 1, 'system'),
  ('escort-person-rezaul-karim-wa01', 'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Escort REZAUL KARIM', 'escort-rezaul-karim-wa01', '+8801836743754', NULL,           true, 1, 'system'),
  ('escort-person-tcis-wa01',         'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'TCIS W/A',            'escort-tcis-wa01',         '+8801757622300', NULL,           true, 1, 'system'),
  ('escort-person-faruk-wa01',        'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Md Faruk Hosen',      NULL,                       '+8801755627557', NULL,           true, 1, 'system'),
  ('escort-person-sahil-wa01',        'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Sahil',               NULL,                       '+8801790103900', NULL,           true, 1, 'system'),
  ('escort-person-alim-wa01',         'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Alim',                NULL,                       '+8801817201596', NULL,           true, 1, 'system'),
  ('escort-person-sezan-wa01',        'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Escort Sezan',        NULL,                       '+8801880414177', NULL,           true, 1, 'system'),
  ('escort-person-al-aqsa-wa01',      'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Al-Aqsa AK Khan',     NULL,                       '+8801958122301', NULL,           true, 1, 'system'),
  ('escort-person-jasim-wa01',        'wa-01', 'ESCORT_CLIENT', ARRAY['VESSEL'], 'Operation Jasim',     NULL,                       '+8801958122303', NULL,           true, 1, 'system')
ON CONFLICT (id) DO NOTHING;

-- 25 channels (4 directs + 21 group). sources: S1 profile, S3 group authz, S4a conversation_scope, S4b aliases
INSERT INTO public.escort_roster_channel (id, roster_id, account_id, chat_jid, participant_jid, channel_role, domain, active, version)
VALUES
  -- Directs
  ('ch-hridoy-direct-pn',  'escort-person-hridoy-wa01',       'wa-01', '8801670535255@s.whatsapp.net', NULL,                    'DIRECT', 'VESSEL', true, 1),
  ('ch-hridoy-direct-lid', 'escort-person-hridoy-wa01',       'wa-01', '8801670535255@s.whatsapp.net', '166082241384593@lid',    'DIRECT', 'VESSEL', true, 1), -- alias/LID mapping
  ('ch-tcis-direct',       'escort-person-tcis-wa01',         'wa-01', '8801757622300@s.whatsapp.net', NULL,                    'DIRECT', 'VESSEL', true, 1),
  ('ch-rezaul-direct',     'escort-person-rezaul-karim-wa01', 'wa-01', '8801836743754@s.whatsapp.net', NULL,                    'DIRECT', 'VESSEL', true, 1),
  -- Group 120363408741101070@g.us (Escort Release Slip) - 6
  ('ch-g1-hridoy-pn',      'escort-person-hridoy-wa01',       'wa-01', '120363408741101070@g.us',      '8801670535255@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g1-hridoy-lid',     'escort-person-hridoy-wa01',       'wa-01', '120363408741101070@g.us',      '166082241384593@lid',          'GROUP', 'VESSEL', true, 1),
  ('ch-g1-faruk',          'escort-person-faruk-wa01',        'wa-01', '120363408741101070@g.us',      '8801755627557@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g1-tcis',           'escort-person-tcis-wa01',         'wa-01', '120363408741101070@g.us',      '8801757622300@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g1-rezaul',         'escort-person-rezaul-karim-wa01', 'wa-01', '120363408741101070@g.us',      '8801836743754@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g1-al-aqsa',        'escort-person-al-aqsa-wa01',      'wa-01', '120363408741101070@g.us',      '8801958122301@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  -- Group 120363426895117693@g.us (Al-Rifai Integrated Services Office group) - 8
  ('ch-g2-hridoy-pn',      'escort-person-hridoy-wa01',       'wa-01', '120363426895117693@g.us',      '8801670535255@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-hridoy-lid',     'escort-person-hridoy-wa01',       'wa-01', '120363426895117693@g.us',      '166082241384593@lid',          'GROUP', 'VESSEL', true, 1),
  ('ch-g2-faruk',          'escort-person-faruk-wa01',        'wa-01', '120363426895117693@g.us',      '8801755627557@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-tcis',           'escort-person-tcis-wa01',         'wa-01', '120363426895117693@g.us',      '8801757622300@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-alim',           'escort-person-alim-wa01',         'wa-01', '120363426895117693@g.us',      '8801817201596@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-rezaul',         'escort-person-rezaul-karim-wa01', 'wa-01', '120363426895117693@g.us',      '8801836743754@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-al-aqsa',        'escort-person-al-aqsa-wa01',      'wa-01', '120363426895117693@g.us',      '8801958122301@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g2-jasim',          'escort-person-jasim-wa01',        'wa-01', '120363426895117693@g.us',      '8801958122303@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  -- Group 120363428977781821@g.us (Al-Aqsa Escort Program Group) - 7
  ('ch-g3-hridoy-pn',      'escort-person-hridoy-wa01',       'wa-01', '120363428977781821@g.us',      '8801670535255@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g3-hridoy-lid',     'escort-person-hridoy-wa01',       'wa-01', '120363428977781821@g.us',      '166082241384593@lid',          'GROUP', 'VESSEL', true, 1),
  ('ch-g3-tcis',           'escort-person-tcis-wa01',         'wa-01', '120363428977781821@g.us',      '8801757622300@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g3-sahil',          'escort-person-sahil-wa01',        'wa-01', '120363428977781821@g.us',      '8801790103900@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g3-alim',           'escort-person-alim-wa01',         'wa-01', '120363428977781821@g.us',      '8801817201596@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g3-rezaul',         'escort-person-rezaul-karim-wa01', 'wa-01', '120363428977781821@g.us',      '8801836743754@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1),
  ('ch-g3-sezan',          'escort-person-sezan-wa01',        'wa-01', '120363428977781821@g.us',      '8801880414177@s.whatsapp.net', 'GROUP', 'VESSEL', true, 1)
ON CONFLICT (id) DO NOTHING;

-- Epoch
INSERT INTO public.escort_roster_epoch (id, epoch) VALUES (1, 1)
ON CONFLICT (id) DO UPDATE SET epoch = GREATEST(escort_roster_epoch.epoch, EXCLUDED.epoch);

-- Audit: one row per seeded entity (9 persons + 25 channels)
INSERT INTO public.escort_roster_audit (id, roster_id, actor_id, action, reason, before_value, after_value, expected_version, operation_key, bridge_restart_required)
SELECT gen_random_uuid()::text,
       r.id,
       'system',
       'CREATE',
       'BACKFILL_PHASE_B',
       NULL,
       jsonb_build_object('id', r.id, 'display_name', r.display_name, 'phone', r.phone, 'role', r.role),
       0,
       'backfill:person:' || r.id,
       false
FROM public.escort_roster r
WHERE NOT EXISTS (SELECT 1 FROM public.escort_roster_audit a WHERE a.operation_key = 'backfill:person:' || r.id)
ON CONFLICT (operation_key) DO NOTHING;

INSERT INTO public.escort_roster_audit (id, roster_id, actor_id, action, reason, before_value, after_value, expected_version, operation_key, bridge_restart_required)
SELECT gen_random_uuid()::text,
       c.roster_id,
       'system',
       'CREATE',
       'BACKFILL_PHASE_B',
       NULL,
       jsonb_build_object('id', c.id, 'chat_jid', c.chat_jid, 'participant_jid', c.participant_jid, 'channel_role', c.channel_role),
       0,
       'backfill:channel:' || c.id,
       false
FROM public.escort_roster_channel c
WHERE NOT EXISTS (SELECT 1 FROM public.escort_roster_audit a WHERE a.operation_key = 'backfill:channel:' || c.id)
ON CONFLICT (operation_key) DO NOTHING;

COMMIT;
