-- 0039: compatibility views over escort_roster (Phase B step 3). Additive, read-only.
-- Drop-in replacements for legacy tables.
-- Phase B compatibility view — will become the real table in Phase E.

BEGIN;

-- V1: escort_client_contacts
CREATE OR REPLACE VIEW public.v_escort_client_contacts AS
SELECT
  r.id,
  r.account_id,
  r.display_name,
  r.username,
  r.phone,
  'ROSTER_BACKFILL'::text AS source,
  r.active
FROM public.escort_roster r
WHERE r.role = 'ESCORT_CLIENT'
  AND r.active = true;

COMMENT ON VIEW public.v_escort_client_contacts IS 'Phase B compatibility view — will become the real table in Phase E';

-- V2: escort_client_group_authorizations
CREATE OR REPLACE VIEW public.v_escort_client_group_authorizations AS
SELECT
  c.id,
  c.roster_id AS client_contact_id,
  c.chat_jid AS group_jid,
  c.participant_jid,
  c.active
FROM public.escort_roster_channel c
WHERE c.channel_role = 'GROUP'
  AND c.active = true;

COMMENT ON VIEW public.v_escort_client_group_authorizations IS 'Phase B compatibility view — will become the real table in Phase E';

-- V3: conversation_scope
CREATE OR REPLACE VIEW public.v_conversation_scope AS
WITH directs AS (
  SELECT DISTINCT ON (c.chat_jid)
    c.account_id,
    c.chat_jid AS canonical_chat_jid,
    c.domain,
    'DIRECT'::text AS conversation_type,
    r.display_name,
    CASE 
      WHEN r.id = 'escort-person-hridoy-wa01' THEN 'escort-hridoy-wa01'
      WHEN r.id = 'escort-person-rezaul-karim-wa01' THEN 'escort-rezaul-karim-wa01'
      WHEN r.id = 'escort-person-tcis-wa01' THEN 'escort-tcis-wa01'
      ELSE r.canonical_person_ref
    END AS canonical_person_ref,
    COALESCE(
      ARRAY(
        SELECT c2.participant_jid
        FROM public.escort_roster_channel c2
        WHERE c2.roster_id = c.roster_id
          AND c2.channel_role = 'DIRECT'
          AND c2.participant_jid LIKE '%@lid'
          AND c2.active = true
        ORDER BY c2.participant_jid
      ),
      ARRAY[]::text[]
    ) AS alias_chat_jids
  FROM public.escort_roster_channel c
  JOIN public.escort_roster r ON r.id = c.roster_id
  WHERE c.channel_role = 'DIRECT'
    AND c.active = true
),
groups AS (
  SELECT DISTINCT ON (c.chat_jid)
    c.account_id,
    c.chat_jid AS canonical_chat_jid,
    c.domain,
    'GROUP'::text AS conversation_type,
    CASE c.chat_jid
      WHEN '120363408741101070@g.us' THEN 'Escort Release Slip'
      WHEN '120363426895117693@g.us' THEN 'Al-Rifai Integrated Services Office group'
      WHEN '120363428977781821@g.us' THEN 'Al-Aqsa Escort Program Group'
      ELSE c.chat_jid
    END AS display_name,
    NULL::text AS canonical_person_ref,
    ARRAY[]::text[] AS alias_chat_jids
  FROM public.escort_roster_channel c
  WHERE c.channel_role = 'GROUP'
    AND c.active = true
),
legacy_extra AS (
  SELECT cs.account_id, cs.canonical_chat_jid, cs.domain, cs.conversation_type, cs.display_name, cs.canonical_person_ref, cs.alias_chat_jids
  FROM public.conversation_scope cs
  WHERE cs.active = true
    AND NOT EXISTS (SELECT 1 FROM directs d WHERE d.canonical_chat_jid = cs.canonical_chat_jid)
    AND NOT EXISTS (SELECT 1 FROM groups g WHERE g.canonical_chat_jid = cs.canonical_chat_jid)
)
SELECT * FROM directs
UNION ALL
SELECT * FROM groups
UNION ALL
SELECT * FROM legacy_extra;

COMMENT ON VIEW public.v_conversation_scope IS 'Phase B compatibility view — will become the real table in Phase E';

-- V4: whatsapp_identity_aliases - mirror legacy
CREATE OR REPLACE VIEW public.v_whatsapp_identity_aliases AS
SELECT scope_account, pn_bare, lid_bare, canonical_person_ref, saved_name, profile_name, verification, evidence_ref, verified_at, created_at
FROM public.whatsapp_identity_aliases;

COMMENT ON VIEW public.v_whatsapp_identity_aliases IS 'Phase B compatibility view — will become the real table in Phase E';

-- Grants
GRANT SELECT ON public.v_escort_client_contacts TO alrifai_app;
GRANT SELECT ON public.v_escort_client_group_authorizations TO alrifai_app;
GRANT SELECT ON public.v_conversation_scope TO alrifai_app;
GRANT SELECT ON public.v_whatsapp_identity_aliases TO alrifai_app;
GRANT SELECT ON public.v_escort_client_contacts TO ir_review_runtime;
GRANT SELECT ON public.v_escort_client_group_authorizations TO ir_review_runtime;
GRANT SELECT ON public.v_conversation_scope TO ir_review_runtime;
GRANT SELECT ON public.v_whatsapp_identity_aliases TO ir_review_runtime;

REVOKE ALL ON public.v_escort_client_contacts FROM PUBLIC;
REVOKE ALL ON public.v_escort_client_group_authorizations FROM PUBLIC;
REVOKE ALL ON public.v_conversation_scope FROM PUBLIC;
REVOKE ALL ON public.v_whatsapp_identity_aliases FROM PUBLIC;

COMMIT;
