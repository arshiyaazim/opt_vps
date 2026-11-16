-- Additive live owner -> Accountant cash projection.
-- Applied by the explicit migration runner; never by application startup.

-- Existing source-linked instructions intentionally have no cash account.
-- Keep those rows valid while allowing a live paid instruction to carry both
-- its immutable WhatsApp source and the selected cash account.
ALTER TABLE public.cash_instructions DROP CONSTRAINT cash_instructions_check;

CREATE TABLE public.cash_live_sync_state (
 scope_account text PRIMARY KEY CHECK (scope_account = 'wa-01'),
 chat_jid text NOT NULL CHECK (chat_jid = '8801844836824@s.whatsapp.net'),
 owner_jid text NOT NULL CHECK (owner_jid = '8801880446111@s.whatsapp.net'),
 accountant_jid text NOT NULL CHECK (accountant_jid = '8801844836824@s.whatsapp.net'),
 after_rowid bigint NOT NULL DEFAULT 0 CHECK (after_rowid >= 0),
 enabled boolean NOT NULL DEFAULT true,
 last_error text,
 last_processed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cash_live_sync_state(scope_account,chat_jid,owner_jid,accountant_jid)
VALUES ('wa-01','8801844836824@s.whatsapp.net','8801880446111@s.whatsapp.net','8801844836824@s.whatsapp.net')
ON CONFLICT (scope_account) DO NOTHING;

CREATE FUNCTION public.alrifai_post_owner_accountant_cash(
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
    OR s.chat_jid<>'8801844836824@s.whatsapp.net'
    OR s.original_sender_ref<>'8801880446111@s.whatsapp.net'
    OR s.origin_state<>'PROVEN' OR s.visibility_state<>'VISIBLE'
 THEN RAISE EXCEPTION 'LIVE_CASH_OWNER_ACCOUNTANT_SOURCE_REQUIRED'; END IF;

 SELECT * INTO c FROM public.business_commands WHERE id=p_command FOR SHARE;
 IF c.id IS NULL OR c.scope_account<>'wa-01' OR c.source_ref<>s.id
    OR c.action<>'CASH_OWNER_ACCOUNTANT_AUTO_POST' OR c.result_ref<>i.id
    OR c.result_hash<>p_hash OR c.confirmation_basis<>'ADMIN_DIRECT'
    OR c.expected_resource_version IS DISTINCT FROM 1
 THEN RAISE EXCEPTION 'LIVE_CASH_OWNER_COMMAND_REQUIRED'; END IF;

 -- Re-check current verified owner, Accountant, bindings and epoch at posting
 -- time. Message text never supplies identity or authority.
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
   SELECT 1 FROM identity_review_candidate.records
   WHERE collection='registry' AND payload->>'kind'='binding' AND payload->>'status'='VERIFIED'
     AND payload->'data'->>'accountId'='wa-01'
     AND payload->'data'->>'chatJid'='8801844836824@s.whatsapp.net'
     AND payload->'data'->>'direction'='INCOMING' AND payload->'data'->>'purpose'='SENDER'
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

REVOKE ALL ON public.cash_live_sync_state FROM PUBLIC;
GRANT SELECT,UPDATE ON public.cash_live_sync_state TO ir_review_runtime;
REVOKE ALL ON FUNCTION public.alrifai_post_owner_accountant_cash(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alrifai_post_owner_accountant_cash(text,text,text,text) TO ir_review_runtime;
