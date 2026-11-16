-- REVIEW CANDIDATE ONLY. Reconcile applied migration manifest before assigning 0011.
-- Apply transactionally to a fresh isolated database first; no grants or activation.
BEGIN;
CREATE TABLE public.business_commands (
 id text PRIMARY KEY CHECK (btrim(id) <> ''),
 scope_account text NOT NULL CHECK (btrim(scope_account) <> ''),
 source_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 operation_key text NOT NULL CHECK (btrim(operation_key) <> ''),
 payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
 action text NOT NULL CHECK (btrim(action) <> ''),
 actor_collection text NOT NULL DEFAULT 'registry' CHECK (actor_collection = 'registry'),
 actor_ref text NOT NULL,
 actor_binding_ref text,
 auth_epoch bigint NOT NULL CHECK (auth_epoch >= 0),
 expected_resource_version integer CHECK (expected_resource_version >= 0),
 approval_ref text,
 approval_hash text CHECK (approval_hash ~ '^[0-9a-f]{64}$'),
 confirmation_basis text NOT NULL CHECK (confirmation_basis IN
  ('ADMIN_DIRECT','STAFF_APPROVED','ADMIN_SEND_SUCCESS','DOMAIN_APPROVAL','NONFINANCIAL')),
 result_ref text NOT NULL CHECK (btrim(result_ref) <> ''),
 result_hash text NOT NULL CHECK (result_hash ~ '^[0-9a-f]{64}$'),
 committed_at timestamptz NOT NULL,
 UNIQUE(scope_account, operation_key),
 UNIQUE(scope_account, id),
 FOREIGN KEY(actor_collection, actor_ref)
  REFERENCES identity_review_candidate.records(collection,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK ((approval_ref IS NULL) = (approval_hash IS NULL))
);
CREATE TABLE public.source_refs (
 id text PRIMARY KEY CHECK (btrim(id) <> ''),
 scope_account text NOT NULL CHECK (btrim(scope_account) <> ''),
 source_ref text,
 created_command_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 channel text NOT NULL CHECK (channel IN ('WHATSAPP','FRONTEND','PHONE','OFFLINE','IMPORT','SYSTEM')),
 provider text, stream_id text, event_seq bigint CHECK (event_seq >= 0),
 chat_jid text, message_id text,
 source_kind text NOT NULL CHECK (btrim(source_kind) <> ''),
 external_ref text NOT NULL CHECK (btrim(external_ref) <> ''),
 block_key text NOT NULL DEFAULT '',
 payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
 source_time timestamptz,
 observed_at timestamptz NOT NULL,
 original_sender_ref text, submitted_by_ref text,
 origin_state text NOT NULL CHECK (origin_state IN ('PROVEN','FORWARDED_UNKNOWN','UNKNOWN')),
 visibility_state text NOT NULL CHECK (btrim(visibility_state) <> ''),
 UNIQUE(scope_account,id),
 UNIQUE(scope_account,channel,external_ref,block_key,payload_hash),
 FOREIGN KEY(scope_account,created_command_id) REFERENCES public.business_commands(scope_account,id)
  DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id)
  DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE public.business_commands ADD CONSTRAINT business_commands_source_fk
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id)
 DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.domain_events (
 id text PRIMARY KEY CHECK (btrim(id) <> ''),
 scope_account text NOT NULL,
 source_ref text,
 created_command_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 resource_kind text NOT NULL CHECK (btrim(resource_kind) <> ''),
 resource_id text NOT NULL CHECK (btrim(resource_id) <> ''),
 event_type text NOT NULL CHECK (btrim(event_type) <> ''),
 effective_at timestamptz, business_date date,
 previous_version integer CHECK (previous_version >= 0),
 new_version integer CHECK (new_version >= 0),
 reason text NOT NULL,
 assertion jsonb NOT NULL CHECK (jsonb_typeof(assertion) = 'object'),
 previous_event_id text,
 event_hash text NOT NULL CHECK (event_hash ~ '^[0-9a-f]{64}$'),
 UNIQUE(scope_account,id),
 UNIQUE(created_command_id,resource_kind,resource_id,event_type),
 FOREIGN KEY(scope_account,created_command_id) REFERENCES public.business_commands(scope_account,id)
  DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(scope_account,source_ref) REFERENCES public.source_refs(scope_account,id)
  DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(scope_account,previous_event_id) REFERENCES public.domain_events(scope_account,id)
  DEFERRABLE INITIALLY DEFERRED,
 CHECK (previous_event_id IS DISTINCT FROM id),
 CHECK (previous_version IS NULL OR new_version IS NULL OR new_version > previous_version),
 CHECK (event_type !~* '(CORRECT|VOID|REVOK)' OR btrim(reason) <> '')
);
CREATE INDEX source_refs_native_idx ON public.source_refs(scope_account,stream_id,event_seq);
CREATE INDEX source_refs_lineage_idx ON public.source_refs(scope_account,channel,external_ref,block_key);
CREATE INDEX business_commands_actor_idx ON public.business_commands(actor_ref,committed_at,id);
CREATE INDEX domain_events_history_idx ON public.domain_events(scope_account,resource_kind,resource_id,created_at,id);
CREATE INDEX domain_events_report_idx ON public.domain_events(scope_account,event_type,effective_at,id);
-- Validate new receipts only. Later revocation must never invalidate historical receipts.
-- FOR SHARE serializes a concurrent registry update until this transaction ends.
CREATE FUNCTION public.alrifai_foundation_verified_actor() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE actor_payload jsonb;
BEGIN
 SELECT payload INTO actor_payload FROM identity_review_candidate.records
  WHERE collection=NEW.actor_collection AND id=NEW.actor_ref FOR SHARE;
 IF actor_payload IS NULL OR actor_payload->>'kind' IS DISTINCT FROM 'person'
    OR actor_payload->>'status' IS DISTINCT FROM 'VERIFIED' THEN
  RAISE EXCEPTION 'verified Person actor required' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER business_commands_verified_actor AFTER INSERT ON public.business_commands
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 EXECUTE FUNCTION public.alrifai_foundation_verified_actor();
ALTER TABLE public.source_refs ADD CONSTRAINT source_refs_bounds CHECK (
 length(id)<=500 AND length(scope_account)<=128 AND length(external_ref)<=2000
 AND length(block_key)<=500 AND (provider IS NULL OR length(provider)<=128)
 AND (stream_id IS NULL OR length(stream_id)<=500)
 AND (chat_jid IS NULL OR length(chat_jid)<=500)
 AND (message_id IS NULL OR length(message_id)<=500)
 AND length(source_kind)<=128 AND length(visibility_state)<=128
 AND (original_sender_ref IS NULL OR length(original_sender_ref)<=500)
 AND (submitted_by_ref IS NULL OR length(submitted_by_ref)<=500));
CREATE FUNCTION public.alrifai_foundation_append_only() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'foundation facts are append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER source_refs_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.source_refs
 FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
CREATE TRIGGER business_commands_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.business_commands
 FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
CREATE TRIGGER domain_events_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.domain_events
 FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();
REVOKE ALL ON public.source_refs,public.business_commands,public.domain_events FROM PUBLIC;
GRANT SELECT,INSERT ON public.source_refs,public.business_commands,public.domain_events TO ir_review_runtime;
COMMIT;
