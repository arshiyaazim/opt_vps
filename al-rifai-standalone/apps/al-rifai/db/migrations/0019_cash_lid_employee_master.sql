-- Additive Cash LID scope and payment-derived employee identity projection.
-- Runtime Cash capture remains disabled by the existing feature flags.

CREATE TABLE public.cash_live_sync_channels (
 scope_account text NOT NULL CHECK (scope_account = 'wa-01'),
 chat_jid text NOT NULL CHECK (chat_jid IN ('8801844836824@s.whatsapp.net','19460614262828@lid')),
 owner_jid text NOT NULL CHECK (owner_jid = '8801880446111@s.whatsapp.net'),
 accountant_jid text NOT NULL CHECK (accountant_jid = '8801844836824@s.whatsapp.net'),
 after_rowid bigint NOT NULL DEFAULT 0 CHECK (after_rowid >= 0),
 enabled boolean NOT NULL DEFAULT true,
 last_error text,
 last_processed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (scope_account,chat_jid)
);

INSERT INTO public.cash_live_sync_channels
 (scope_account,chat_jid,owner_jid,accountant_jid,after_rowid,enabled,last_error,last_processed_at)
SELECT scope_account,chat_jid,owner_jid,accountant_jid,after_rowid,enabled,last_error,last_processed_at
FROM public.cash_live_sync_state
ON CONFLICT (scope_account,chat_jid) DO NOTHING;

INSERT INTO public.cash_live_sync_channels
 (scope_account,chat_jid,owner_jid,accountant_jid,after_rowid,enabled)
SELECT scope_account,'19460614262828@lid',owner_jid,accountant_jid,after_rowid,enabled
FROM public.cash_live_sync_state
WHERE scope_account='wa-01'
ON CONFLICT (scope_account,chat_jid) DO NOTHING;

CREATE TABLE public.employee_master (
 scope_account text NOT NULL CHECK (scope_account IN ('wa-01','wa-02')),
 employee_mobile text NOT NULL CHECK (employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
 preferred_name text NOT NULL CHECK (length(preferred_name) BETWEEN 1 AND 150),
 name_aliases text[] NOT NULL DEFAULT '{}',
 state text NOT NULL DEFAULT 'REVIEW' CHECK (state IN ('REVIEW','CONFIRMED','INACTIVE')),
 first_seen_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (scope_account,employee_mobile)
);

WITH eligible AS (
 SELECT i.scope_account,i.employee_mobile,i.employee_name,s.source_time,i.id
 FROM public.cash_instructions i
 JOIN public.source_refs s ON s.scope_account=i.scope_account AND s.id=i.source_ref
 WHERE i.scope_account='wa-01'
   AND i.cash_account='Cash Payment'
   AND i.employee_mobile IS NOT NULL
   AND s.channel='WHATSAPP'
   AND s.chat_jid IN ('8801844836824@s.whatsapp.net','19460614262828@lid')
   AND s.original_sender_ref='8801880446111@s.whatsapp.net'
), latest AS (
 SELECT DISTINCT ON (scope_account,employee_mobile)
  scope_account,employee_mobile,employee_name
 FROM eligible
 ORDER BY scope_account,employee_mobile,source_time DESC,id DESC
), grouped AS (
 SELECT scope_account,employee_mobile,
  array_agg(DISTINCT employee_name ORDER BY employee_name) AS name_aliases,
  min(source_time) AS first_seen_at,max(source_time) AS last_seen_at
 FROM eligible
 GROUP BY scope_account,employee_mobile
)
INSERT INTO public.employee_master
 (scope_account,employee_mobile,preferred_name,name_aliases,state,first_seen_at,last_seen_at)
SELECT g.scope_account,g.employee_mobile,l.employee_name,g.name_aliases,'REVIEW',g.first_seen_at,g.last_seen_at
FROM grouped g JOIN latest l USING (scope_account,employee_mobile)
ON CONFLICT (scope_account,employee_mobile) DO UPDATE SET
 preferred_name=EXCLUDED.preferred_name,
 name_aliases=EXCLUDED.name_aliases,
 first_seen_at=EXCLUDED.first_seen_at,
 last_seen_at=EXCLUDED.last_seen_at,
 updated_at=now();

REVOKE ALL ON public.cash_live_sync_channels,public.employee_master FROM PUBLIC;
GRANT SELECT,UPDATE ON public.cash_live_sync_channels TO ir_review_runtime;
GRANT SELECT,INSERT,UPDATE ON public.employee_master TO ir_review_runtime;
GRANT SELECT ON public.employee_master TO alrifai_app;

-- Preserve the existing financial writer, but allow a verified PN/LID
-- Accountant source. The writer remains idempotent and keeps its existing
-- Owner, role, epoch and exact-payload checks.
CREATE OR REPLACE FUNCTION public.alrifai_post_owner_accountant_cash(
 p_instruction text,
 p_hash text,
 p_command text,
 p_account text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
 i public.cash_instructions;
 c public.business_commands;
 s public.source_refs;
 existing public.cash_postings;
 posting text;
BEGIN
 SELECT * INTO i FROM public.cash_instructions WHERE id=p_instruction FOR SHARE;
 IF i.id IS NULL OR i.scope_account<>'wa-01' OR i.payload_hash IS DISTINCT FROM p_hash
    OR i.source_ref IS NULL OR i.employee_mobile IS NULL OR i.payout_mobile IS NULL
    OR i.amount_minor IS NULL OR i.method='' OR i.purpose='' OR i.employee_name=''
    OR i.cash_account IS DISTINCT FROM 'Cash Payment'
 THEN RAISE EXCEPTION 'LIVE_CASH_EXACT_INSTRUCTION_REQUIRED'; END IF;

 PERFORM pg_advisory_xact_lock(hashtextextended(i.scope_account||i.operation_id,0));
 SELECT * INTO s FROM public.source_refs WHERE scope_account=i.scope_account AND id=i.source_ref FOR SHARE;
 IF s.id IS NULL OR s.channel<>'WHATSAPP' OR s.provider<>'WHATSAPP_NATIVE_BRIDGE'
    OR s.source_kind<>'LIVE_OWNER_ACCOUNTANT_PAYMENT'
    OR s.chat_jid NOT IN ('8801844836824@s.whatsapp.net','19460614262828@lid')
    OR s.original_sender_ref NOT IN ('8801880446111@s.whatsapp.net','93282931581172','93282931581172@lid','93282931581172:27@lid')
    OR s.origin_state<>'PROVEN' OR s.visibility_state<>'VISIBLE'
 THEN RAISE EXCEPTION 'LIVE_CASH_OWNER_ACCOUNTANT_SOURCE_REQUIRED'; END IF;

 SELECT * INTO c FROM public.business_commands WHERE id=p_command FOR SHARE;
 IF c.id IS NULL OR c.scope_account<>'wa-01' OR c.source_ref<>s.id
    OR c.action<>'CASH_OWNER_ACCOUNTANT_AUTO_POST' OR c.result_ref<>i.id
    OR c.result_hash<>p_hash OR c.confirmation_basis<>'ADMIN_DIRECT'
    OR c.expected_resource_version IS DISTINCT FROM 1
 THEN RAISE EXCEPTION 'LIVE_CASH_OWNER_COMMAND_REQUIRED'; END IF;

 PERFORM 1 FROM identity_review_candidate.records WHERE collection IN ('registry','meta') ORDER BY collection,id FOR SHARE;
 IF c.auth_epoch IS DISTINCT FROM (SELECT (payload->>'epoch')::bigint FROM identity_review_candidate.records WHERE collection='meta' AND id='epoch')
 THEN RAISE EXCEPTION 'LIVE_CASH_AUTH_EPOCH_CHANGED'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM identity_review_candidate.records
   WHERE collection='registry' AND id=c.actor_ref AND payload->>'kind'='person' AND payload->>'status'='VERIFIED'
 ) OR NOT EXISTS (
   SELECT 1 FROM identity_review_candidate.records
   WHERE collection='registry' AND payload->>'kind'='relationship' AND payload->>'status'='VERIFIED'
     AND payload->'data'->>'personId'=c.actor_ref AND payload->'data'->>'kind' IN ('ADMIN','SUPER_ADMIN')
 ) OR NOT EXISTS (
   SELECT 1 FROM identity_review_candidate.records
   WHERE collection='registry' AND payload->>'kind'='binding' AND payload->>'status'='VERIFIED'
     AND payload->'data'->>'personId'=c.actor_ref AND payload->'data'->>'accountId'='wa-01'
     AND payload->'data'->>'chatJid'='8801880446111@s.whatsapp.net'
     AND payload->'data'->>'direction'='OUTGOING' AND payload->'data'->>'purpose'='ACCOUNT_OWNER'
 ) OR NOT EXISTS (
   SELECT 1 FROM identity_review_candidate.records
   WHERE collection='registry' AND payload->>'kind'='relationship' AND payload->>'status'='VERIFIED'
     AND payload->'data'->>'kind'='ACCOUNTANT'
 ) OR NOT EXISTS (
   SELECT 1 FROM identity_review_candidate.records b
   JOIN identity_review_candidate.records r
     ON r.collection='registry' AND r.payload->>'kind'='relationship' AND r.payload->>'status'='VERIFIED'
    AND r.payload->'data'->>'kind'='ACCOUNTANT'
    AND r.payload->'data'->>'personId'=b.payload->'data'->>'personId'
   WHERE b.collection='registry' AND b.payload->>'kind'='binding' AND b.payload->>'status'='VERIFIED'
     AND b.payload->'data'->>'accountId'='wa-01'
     AND b.payload->'data'->>'chatJid' IN ('8801844836824@s.whatsapp.net','19460614262828@lid')
     AND b.payload->'data'->>'direction'='INCOMING' AND b.payload->'data'->>'purpose'='SENDER'
 )
 THEN RAISE EXCEPTION 'LIVE_CASH_CURRENT_OWNER_ACCOUNTANT_REQUIRED'; END IF;

 IF p_account IS DISTINCT FROM 'Cash Payment' THEN RAISE EXCEPTION 'LIVE_CASH_ACCOUNT_REQUIRED'; END IF;
 SELECT * INTO existing FROM public.cash_postings WHERE scope_account=i.scope_account AND operation_id=i.operation_id;
 IF existing.id IS NOT NULL THEN
  IF existing.instruction_id<>i.id OR existing.cash_account<>p_account THEN RAISE EXCEPTION 'CASH_REPLAY_CONFLICT'; END IF;
  RETURN existing.id;
 END IF;

 posting=c.id;
 INSERT INTO public.cash_postings(id,scope_account,operation_id,instruction_id,command_id,amount_minor,cash_account,reverses_id)
 VALUES (posting,i.scope_account,i.operation_id,i.id,c.id,i.amount_minor,p_account,NULL);
 INSERT INTO public.cash_movements
 VALUES (posting,1,p_account,i.employee_mobile,-i.amount_minor),
        (posting,2,'EMPLOYEE_CLEARING',i.employee_mobile,i.amount_minor);
 RETURN posting;
END;
$$;

REVOKE ALL ON FUNCTION public.alrifai_post_owner_accountant_cash(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alrifai_post_owner_accountant_cash(text,text,text,text) TO ir_review_runtime;
