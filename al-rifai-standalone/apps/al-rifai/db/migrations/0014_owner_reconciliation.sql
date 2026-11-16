-- Additive owner-authorized reconciliation. No financial activation or legacy rewrite.
CREATE TABLE public.reconciliation_runs (
 id text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), snapshot_at timestamptz NOT NULL,
 window_start timestamptz NOT NULL, window_end timestamptz NOT NULL, parser_version text NOT NULL,
 snapshots jsonb NOT NULL, status text NOT NULL CHECK(status IN ('SCANNING','REVIEW_READY','FAILED')),
 summary jsonb NOT NULL DEFAULT '{}', CHECK(window_end>window_start AND window_end<=snapshot_at)
);
CREATE TABLE public.reconciliation_sources (
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES public.reconciliation_runs(id), account_id text NOT NULL,
 chat_jid text NOT NULL, domain text NOT NULL, coverage jsonb NOT NULL,
 UNIQUE(run_id,account_id,chat_jid,domain)
);
CREATE TABLE public.reconciliation_originals (
 id text PRIMARY KEY, account_id text NOT NULL, chat_jid text NOT NULL, message_id text NOT NULL,
 revision_hash text NOT NULL, source_time timestamptz, original jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,chat_jid,message_id,revision_hash)
);
CREATE INDEX reconciliation_original_time ON public.reconciliation_originals(account_id,chat_jid,source_time);
CREATE TABLE public.reconciliation_cases (
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES public.reconciliation_runs(id), original_id text REFERENCES public.reconciliation_originals(id),
 domain text NOT NULL CHECK(domain IN ('ACCOUNTS','ESCORT','RELEASE','IDENTITY')), block_key text NOT NULL,
 category text NOT NULL, proposal jsonb NOT NULL, matches jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','LINKED','APPROVED','REJECTED','CLARIFICATION','SUPERSEDED')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(original_id,domain,block_key)
);
CREATE INDEX reconciliation_case_queue ON public.reconciliation_cases(domain,status,created_at,id);
CREATE TABLE public.reconciliation_decisions (
 id text PRIMARY KEY, case_id text REFERENCES public.reconciliation_cases(id), operation_key text NOT NULL UNIQUE,
 actor_id text NOT NULL, action text NOT NULL, reason text NOT NULL CHECK(length(reason)>0),
 before_value jsonb NOT NULL, after_value jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reconciliation_links (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES public.reconciliation_cases(id),
 target_type text NOT NULL, target_id text NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,target_type,target_id)
);
CREATE TABLE public.reconciliation_policies (
 id text PRIMARY KEY, version integer NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true,
 account_id text NOT NULL, chat_jid text NOT NULL, domain text NOT NULL, payload jsonb NOT NULL,
 actor_id text NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(), valid_from timestamptz NOT NULL,
 valid_until timestamptz, historical_from timestamptz, historical_until timestamptz,
 CHECK(valid_until IS NULL OR valid_until>valid_from),
 CHECK((historical_from IS NULL)=(historical_until IS NULL)), CHECK(historical_until IS NULL OR historical_until>historical_from)
);
CREATE INDEX reconciliation_policy_scope ON public.reconciliation_policies(account_id,chat_jid,domain);
CREATE TABLE public.reconciliation_files (
 id text PRIMARY KEY, name text NOT NULL, sha256 text NOT NULL, bytes bytea NOT NULL, context jsonb NOT NULL,
 actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sha256,actor_id)
);
CREATE TABLE public.reconciliation_progress (
 id text PRIMARY KEY, version integer NOT NULL DEFAULT 1, cursor jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reconciliation_original_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.reconciliation_originals FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
CREATE TRIGGER reconciliation_decision_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.reconciliation_decisions FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
CREATE TRIGGER reconciliation_links_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.reconciliation_links FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
REVOKE ALL ON public.reconciliation_runs,public.reconciliation_sources,public.reconciliation_originals,public.reconciliation_cases,public.reconciliation_decisions,public.reconciliation_links,public.reconciliation_policies,public.reconciliation_files,public.reconciliation_progress FROM PUBLIC;
GRANT SELECT,INSERT ON public.reconciliation_originals,public.reconciliation_decisions,public.reconciliation_links TO ir_review_runtime;
GRANT SELECT,INSERT,UPDATE ON public.reconciliation_runs,public.reconciliation_sources,public.reconciliation_cases,public.reconciliation_policies,public.reconciliation_files,public.reconciliation_progress TO ir_review_runtime;
-- Definer writes only reviewed registry entities; no staff/grant/financial escalation.
CREATE FUNCTION public.alrifai_owner_registry(p_actor text,p_kind text,p_id text,p_expected integer,p_payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE prior jsonb;
BEGIN
 IF p_kind NOT IN ('person','relationship','binding','group','vesselAlias') OR p_payload->>'kind' IS DISTINCT FROM p_kind OR p_payload->>'id' IS DISTINCT FROM p_id
 OR p_payload->>'status' NOT IN ('VERIFIED','REVOKED') THEN RAISE EXCEPTION 'REGISTRY_KIND_DENIED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM identity_review_candidate.records WHERE collection='registry' AND payload->>'kind'='relationship' AND payload->>'status'='VERIFIED' AND payload->'data'->>'personId'=p_actor AND payload->'data'->>'kind'='SUPER_ADMIN') THEN RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_kind='relationship' AND p_payload->'data'->>'kind' IN ('ADMIN','SUPER_ADMIN') THEN RAISE EXCEPTION 'ADMIN_PROVISIONING_NOT_AVAILABLE' USING ERRCODE='42501'; END IF;
 SELECT payload INTO prior FROM identity_review_candidate.records WHERE collection='registry' AND id=p_id FOR UPDATE;
 IF coalesce((prior->>'version')::integer,0)<>p_expected OR (p_payload->>'version')::integer<>p_expected+1 THEN RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001'; END IF;
 INSERT INTO identity_review_candidate.records(collection,id,payload) VALUES('registry',p_id,p_payload)
 ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload;
 INSERT INTO identity_review_candidate.records(collection,id,payload) VALUES('registryHistory',p_id||':'||(p_expected+1),p_payload);
END; $$;
REVOKE ALL ON FUNCTION public.alrifai_owner_registry(text,text,text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alrifai_owner_registry(text,text,text,integer,jsonb) TO ir_review_runtime;
