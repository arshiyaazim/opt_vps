-- Additive, runner-owned transaction. NOT executed by application startup.
-- Reconcile the approved post-0011 guard patch without rewriting 0011/checksum.
ALTER FUNCTION public.alrifai_foundation_verified_actor() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.alrifai_foundation_verified_actor() FROM PUBLIC;
CREATE TABLE public.cash_instructions (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'),
 operation_id text NOT NULL CHECK(operation_id ~ '^[a-f0-9]{64}$'),
 scope_account text NOT NULL CHECK(scope_account IN ('wa-01','wa-02')),
 source_ref text,
 command_id text NOT NULL,
 source_time timestamptz NOT NULL,
 block_order integer NOT NULL CHECK(block_order BETWEEN 0 AND 49),
 employee_mobile text CHECK(employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
 employee_name text NOT NULL CHECK(length(employee_name)<=150),
 payout_mobile text CHECK(payout_mobile ~ '^\+8801[3-9][0-9]{8}$'),
 purpose text NOT NULL CHECK(length(purpose)<=500),
 method text NOT NULL CHECK(method IN ('','cash','bkash','nagad','bank','rocket','unknown')),
 amount_minor bigint CHECK(amount_minor>0 AND amount_minor<=9007199254740991),
 cash_account text CHECK(cash_account ~ '^[A-Za-z0-9_.:-]{1,100}$'),
 reverses_id text,
 state text NOT NULL CHECK(state IN ('INTENT','REVIEW','PENDING_ADMIN','MANUAL_READY')),
 reasons jsonb NOT NULL CHECK(jsonb_typeof(reasons)='array'),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scope_account,id),
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id),
 FOREIGN KEY(scope_account,command_id) REFERENCES public.business_commands(scope_account,id),
 CHECK ((source_ref IS NULL)=(cash_account IS NOT NULL))
);
CREATE INDEX cash_instructions_operation ON public.cash_instructions(scope_account,operation_id,created_at DESC,id);
-- Evidence of mobile/name usage, NOT an employment/HR registry or permission.
CREATE TABLE public.employee_mobile_evidence (
 scope_account text NOT NULL, mobile text NOT NULL CHECK(mobile ~ '^\+8801[3-9][0-9]{8}$'),
 name text NOT NULL CHECK(length(name)<=150), source_ref text NOT NULL,
 source_role text NOT NULL CHECK(source_role IN ('EMPLOYEE_MOBILE','ESCORT_MOBILE','EMPLOYEE_LEDGER')),
 PRIMARY KEY(scope_account,mobile,source_ref),
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id)
);
CREATE TABLE public.roster_source_links (
 scope_account text NOT NULL, operation_id text NOT NULL CHECK(operation_id ~ '^[a-f0-9]{64}$'),
 source_ref text NOT NULL, event_id text NOT NULL,
 program_id text REFERENCES public.programs(id),
 outcome text NOT NULL CHECK(outcome IN ('DRAFT','CONFIRMED','EVIDENCE','RELEASED','REVIEW')),
 reasons jsonb NOT NULL CHECK(jsonb_typeof(reasons)='array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope_account,event_id),
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id),
 FOREIGN KEY(scope_account,event_id) REFERENCES public.domain_events(scope_account,id)
);
CREATE INDEX roster_source_links_program ON public.roster_source_links(scope_account,program_id,created_at);
CREATE TABLE public.program_assignments (
 id text PRIMARY KEY, scope_account text NOT NULL, program_id text NOT NULL REFERENCES public.programs(id),
 revision integer NOT NULL CHECK(revision>0), employee_mobile text NOT NULL CHECK(employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
 employee_person_id text, start_date date NOT NULL, start_shift text NOT NULL CHECK(start_shift IN ('D','N')),
 duty_started_on date, released_on date, predecessor_id text REFERENCES public.program_assignments(id),
 command_receipt text NOT NULL, source_refs jsonb NOT NULL CHECK(jsonb_typeof(source_refs)='array'),
 UNIQUE(program_id,revision)
);
CREATE TABLE public.cash_postings (
 id text PRIMARY KEY, scope_account text NOT NULL, operation_id text NOT NULL,
 instruction_id text NOT NULL, command_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor<>0), cash_account text NOT NULL,
 reverses_id text UNIQUE REFERENCES public.cash_postings(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scope_account,operation_id),
 FOREIGN KEY(scope_account,instruction_id) REFERENCES public.cash_instructions(scope_account,id),
 FOREIGN KEY(scope_account,command_id) REFERENCES public.business_commands(scope_account,id)
);
ALTER TABLE public.cash_instructions ADD CONSTRAINT cash_instruction_reversal_fk FOREIGN KEY(reverses_id) REFERENCES public.cash_postings(id);
CREATE TABLE public.cash_movements (
 posting_id text NOT NULL REFERENCES public.cash_postings(id), leg smallint NOT NULL CHECK(leg IN (1,2)),
 account_ref text NOT NULL, employee_mobile text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor<>0),
 PRIMARY KEY(posting_id,leg)
);
CREATE FUNCTION public.alrifai_cash_balanced() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (SELECT count(*)<>2 OR coalesce(sum(amount_minor),1)<>0 FROM public.cash_movements WHERE posting_id=NEW.id)
 OR NOT EXISTS(SELECT 1 FROM public.cash_movements m JOIN public.cash_instructions i ON i.id=NEW.instruction_id WHERE m.posting_id=NEW.id AND m.leg=1 AND m.account_ref=NEW.cash_account AND m.employee_mobile=i.employee_mobile AND m.amount_minor=-NEW.amount_minor)
 OR NOT EXISTS(SELECT 1 FROM public.cash_movements m JOIN public.cash_instructions i ON i.id=NEW.instruction_id WHERE m.posting_id=NEW.id AND m.leg=2 AND m.account_ref='EMPLOYEE_CLEARING' AND m.employee_mobile=i.employee_mobile AND m.amount_minor=NEW.amount_minor)
 THEN RAISE EXCEPTION 'CASH_UNBALANCED' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER cash_balanced AFTER INSERT ON public.cash_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.alrifai_cash_balanced();
-- The only financial writer. Runtime receives EXECUTE, never table INSERT/UPDATE.
CREATE FUNCTION public.alrifai_post_cash(p_instruction text,p_hash text,p_command text,p_account text,p_reverses text DEFAULT NULL)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE i public.cash_instructions; c public.business_commands; prior public.cash_postings; existing public.cash_postings; amount bigint; posting text;
BEGIN
 SELECT * INTO i FROM public.cash_instructions WHERE id=p_instruction FOR SHARE;
 IF i.id IS NULL OR i.payload_hash IS DISTINCT FROM p_hash OR i.employee_mobile IS NULL OR i.amount_minor IS NULL OR i.method='' OR i.purpose='' OR i.employee_name='' THEN RAISE EXCEPTION 'CASH_EXACT_INSTRUCTION_REQUIRED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(i.scope_account||i.operation_id,0));
 SELECT * INTO c FROM public.business_commands WHERE id=p_command FOR SHARE;
 IF c.id IS NULL OR c.scope_account<>i.scope_account OR c.action<>'CASH_POST' OR c.result_ref<>i.id OR c.result_hash<>p_hash OR c.expected_resource_version IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'CASH_COMMAND_REQUIRED'; END IF;
 -- Current verified Person, current explicit role and capability. Lock registry against revocation.
 PERFORM 1 FROM identity_review_candidate.records WHERE collection IN ('registry','meta') ORDER BY collection,id FOR SHARE;
IF c.auth_epoch IS DISTINCT FROM (SELECT (payload->>'epoch')::bigint FROM identity_review_candidate.records WHERE collection='meta' AND id='epoch') THEN RAISE EXCEPTION 'CASH_AUTH_EPOCH_CHANGED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM identity_review_candidate.records WHERE collection='registry' AND id=c.actor_ref AND payload->>'kind'='person' AND payload->>'status'='VERIFIED')
 OR NOT EXISTS(SELECT 1 FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='relationship' AND payload->>'status'='VERIFIED' AND payload->'data'->>'personId'=c.actor_ref AND payload->'data'->>'kind' IN ('ADMIN','SUPER_ADMIN'))
 OR NOT EXISTS(SELECT 1 FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='grant' AND payload->>'status'='VERIFIED' AND payload->'data'->>'personId'=c.actor_ref AND payload->'data'->>'channel'='STAFF' AND payload->'data'->>'capability'='cash.post' AND payload->'data'->'scope'->>'accountId'=i.scope_account AND payload->'data'->'scope'->>'domain'='ACCOUNTS' AND payload->'data'->'scope'->>'chatJid' IS NULL AND payload->'data'->'scope'->>'resourceId' IS NULL)
 THEN RAISE EXCEPTION 'CASH_CURRENT_AUTHORITY_REQUIRED'; END IF;
 IF p_reverses IS NOT NULL AND NOT EXISTS(SELECT 1 FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='grant' AND payload->>'status'='VERIFIED' AND payload->'data'->>'personId'=c.actor_ref AND payload->'data'->>'channel'='STAFF' AND payload->'data'->>'capability'='cash.reverse' AND payload->'data'->'scope'->>'accountId'=i.scope_account AND payload->'data'->'scope'->>'domain'='ACCOUNTS' AND payload->'data'->'scope'->>'chatJid' IS NULL AND payload->'data'->'scope'->>'resourceId' IS NULL) THEN RAISE EXCEPTION 'CASH_REVERSAL_AUTHORITY_REQUIRED'; END IF;
 IF i.source_ref IS NOT NULL THEN RAISE EXCEPTION 'HISTORICAL_SEND_SUCCESS_NOT_ESTABLISHED'; END IF;
 IF i.state NOT IN ('MANUAL_READY','PENDING_ADMIN') OR (i.state='PENDING_ADMIN' AND (c.confirmation_basis<>'STAFF_APPROVED' OR c.approval_ref IS NULL OR c.approval_hash<>p_hash)) OR (i.state='MANUAL_READY' AND c.confirmation_basis<>'ADMIN_DIRECT') THEN RAISE EXCEPTION 'CASH_CONFIRMATION_REQUIRED'; END IF;
 IF i.cash_account IS DISTINCT FROM p_account OR i.reverses_id IS DISTINCT FROM p_reverses THEN RAISE EXCEPTION 'CASH_EXACT_POSTING_PAYLOAD_REQUIRED'; END IF;
 IF p_account='EMPLOYEE_CLEARING' THEN RAISE EXCEPTION 'CASH_ACCOUNT_REQUIRED'; END IF;
 IF p_account !~ '^[A-Za-z0-9_.:-]{1,100}$' THEN RAISE EXCEPTION 'CASH_ACCOUNT_REQUIRED'; END IF;
 SELECT * INTO existing FROM public.cash_postings WHERE scope_account=i.scope_account AND operation_id=i.operation_id;
 IF existing.id IS NOT NULL THEN
  IF existing.instruction_id<>i.id OR existing.cash_account<>p_account OR existing.reverses_id IS DISTINCT FROM p_reverses THEN RAISE EXCEPTION 'CASH_REPLAY_CONFLICT'; END IF;
  RETURN existing.id;
 END IF;
 amount=i.amount_minor;
 IF p_reverses IS NOT NULL THEN
  SELECT * INTO prior FROM public.cash_postings WHERE id=p_reverses FOR SHARE;
  IF prior.id IS NULL OR prior.scope_account<>i.scope_account OR prior.reverses_id IS NOT NULL OR prior.amount_minor<>i.amount_minor OR prior.cash_account<>p_account OR NOT EXISTS(SELECT 1 FROM public.cash_instructions oi WHERE oi.id=prior.instruction_id AND oi.employee_mobile=i.employee_mobile) THEN RAISE EXCEPTION 'CASH_REVERSAL_CONFLICT'; END IF;
  amount=-amount;
 END IF;
 posting=c.id;
 INSERT INTO public.cash_postings(id,scope_account,operation_id,instruction_id,command_id,amount_minor,cash_account,reverses_id) VALUES(posting,i.scope_account,i.operation_id,i.id,c.id,amount,p_account,p_reverses);
 INSERT INTO public.cash_movements VALUES(posting,1,p_account,i.employee_mobile,-amount),(posting,2,'EMPLOYEE_CLEARING',i.employee_mobile,amount);
 RETURN posting;
END; $$;
REVOKE ALL ON FUNCTION public.alrifai_cash_balanced() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alrifai_post_cash(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alrifai_post_cash(text,text,text,text,text) TO ir_review_runtime;
REVOKE ALL ON public.cash_instructions,public.employee_mobile_evidence,public.roster_source_links,public.program_assignments,public.cash_postings,public.cash_movements FROM PUBLIC;
GRANT SELECT,INSERT ON public.cash_instructions,public.employee_mobile_evidence,public.roster_source_links,public.program_assignments TO ir_review_runtime;
GRANT SELECT ON public.cash_postings,public.cash_movements TO ir_review_runtime;
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['cash_instructions','employee_mobile_evidence','roster_source_links','program_assignments','cash_postings','cash_movements'] LOOP
 EXECUTE format('CREATE TRIGGER immutable_business_fact BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only()',t);
 END LOOP;
END; $$;
