-- 0037: escort roster (ingestion scope). Additive, no behavior change.
-- Promotes conversation_scope/whatsapp_identity_aliases into a normalized roster
-- owned by escort_roster; identity_review_candidate.records remains authority
-- for identity decisions. CASH_SCOPE_* explicitly out of scope.

BEGIN;

CREATE TABLE IF NOT EXISTS public.escort_roster (
  id text PRIMARY KEY,
  account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
  role text NOT NULL CHECK (role IN ('ESCORT_CLIENT','ACCOUNTANT','OWNER')),
  domain_scope text[] NOT NULL DEFAULT ARRAY[]::text[],
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
  canonical_person_ref text,
  phone text CHECK (phone IS NULL OR phone ~ '^\+8801[3-9][0-9]{8}$'),
  username text,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  evidence_ref text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by text NOT NULL DEFAULT 'OWNER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (domain_scope <@ ARRAY['CASH','VESSEL']::text[])
);

CREATE UNIQUE INDEX IF NOT EXISTS escort_roster_account_person_key
  ON public.escort_roster(account_id, canonical_person_ref)
  WHERE canonical_person_ref IS NOT NULL AND active = true;

CREATE INDEX IF NOT EXISTS escort_roster_active_idx ON public.escort_roster(account_id, active);

CREATE TABLE IF NOT EXISTS public.escort_roster_channel (
  id text PRIMARY KEY,
  roster_id text NOT NULL REFERENCES public.escort_roster(id) ON DELETE RESTRICT,
  account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
  chat_jid text NOT NULL CHECK (length(chat_jid) BETWEEN 5 AND 200),
  participant_jid text CHECK (participant_jid IS NULL OR participant_jid ~ '^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid)$'),
  channel_role text NOT NULL CHECK (channel_role IN ('DIRECT','GROUP')),
  domain text NOT NULL CHECK (domain IN ('CASH','VESSEL')),
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((channel_role = 'GROUP' AND chat_jid LIKE '%@g.us') OR (channel_role = 'DIRECT' AND chat_jid LIKE '%@s.whatsapp.net')),
  CHECK (channel_role <> 'GROUP' OR participant_jid IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS escort_roster_channel_unique
  ON public.escort_roster_channel(account_id, chat_jid, COALESCE(participant_jid, ''));

CREATE INDEX IF NOT EXISTS escort_roster_channel_roster_idx ON public.escort_roster_channel(roster_id);
CREATE INDEX IF NOT EXISTS escort_roster_channel_chat_idx ON public.escort_roster_channel(account_id, chat_jid, active);

CREATE TABLE IF NOT EXISTS public.escort_roster_audit (
  id text PRIMARY KEY,
  roster_id text REFERENCES public.escort_roster(id),
  actor_id text,
  action text NOT NULL CHECK (action IN ('CREATE','UPDATE','DEACTIVATE','REACTIVATE','REMOVE')),
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  before_value jsonb,
  after_value jsonb,
  expected_version integer,
  operation_key text NOT NULL UNIQUE,
  bridge_restart_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escort_roster_epoch (
  id integer PRIMARY KEY CHECK (id = 1),
  epoch integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.escort_roster_epoch (id, epoch) VALUES (1, 1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.escort_roster_outbox (
  id bigserial PRIMARY KEY,
  epoch integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('PROFILE_REGENERATE')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  claimed_at timestamptz,
  completed_at timestamptz,
  claimed_by text,
  bridge_restart_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escort_roster_outbox_unclaimed_idx
  ON public.escort_roster_outbox(created_at) WHERE claimed_at IS NULL AND completed_at IS NULL;

CREATE FUNCTION public.escort_roster_apply(
  p_actor text,
  p_kind text,
  p_roster_id text,
  p_expected_version integer,
  p_payload jsonb,
  p_operation_key text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  prior escort_roster%ROWTYPE;
  new_version integer;
  chats_grew boolean := false;
BEGIN
  IF p_actor IS NULL OR btrim(p_actor) = '' THEN
    RAISE EXCEPTION 'ACTOR_REQUIRED';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED';
  END IF;
  IF p_operation_key IS NULL OR btrim(p_operation_key) = '' THEN
    RAISE EXCEPTION 'OPERATION_KEY_REQUIRED';
  END IF;
  IF p_kind NOT IN ('roster_person','roster_channel') THEN
    RAISE EXCEPTION 'ROSTER_KIND_DENIED';
  END IF;

  -- Authority: identity decisions remain in identity_review_candidate.records;
  -- this function only mutates ingestion scope. No SUPER_ADMIN check here
  -- - authorization is enforced by the API caller per policy.

  IF p_kind = 'roster_person' THEN
    SELECT * INTO prior FROM public.escort_roster WHERE id = p_roster_id FOR UPDATE;

    IF FOUND THEN
      IF coalesce(prior.version, 0) <> p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = '40001';
      END IF;
      new_version := prior.version + 1;

      UPDATE public.escort_roster
      SET display_name = COALESCE(p_payload->>'display_name', display_name),
          role = COALESCE(p_payload->>'role', role),
          domain_scope = COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_payload->'domain_scope') x), domain_scope),
          phone = COALESCE(p_payload->>'phone', phone),
          username = COALESCE(p_payload->>'username', username),
          canonical_person_ref = COALESCE(p_payload->>'canonical_person_ref', canonical_person_ref),
          active = COALESCE((p_payload->>'active')::boolean, active),
          evidence_ref = COALESCE(p_payload->>'evidence_ref', evidence_ref),
          version = new_version,
          updated_at = now()
      WHERE id = p_roster_id;

      INSERT INTO public.escort_roster_audit (id, roster_id, actor_id, action, reason, before_value, after_value, expected_version, operation_key, bridge_restart_required)
      VALUES (gen_random_uuid()::text, p_roster_id, p_actor, CASE WHEN (p_payload->>'active')::boolean IS FALSE AND prior.active THEN 'DEACTIVATE' ELSE 'UPDATE' END,
              p_reason, to_jsonb(prior), p_payload, p_expected_version, p_operation_key, false);
    ELSE
      IF p_roster_id IS NULL OR btrim(p_roster_id) = '' THEN
        RAISE EXCEPTION 'ROSTER_ID_REQUIRED';
      END IF;
      IF p_payload->>'display_name' IS NULL OR btrim(p_payload->>'display_name') = '' THEN
        RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
      END IF;
      IF p_payload->>'role' IS NULL OR p_payload->>'role' NOT IN ('ESCORT_CLIENT','ACCOUNTANT','OWNER') THEN
        RAISE EXCEPTION 'ROLE_INVALID';
      END IF;
      new_version := 1;

      INSERT INTO public.escort_roster (id, account_id, role, domain_scope, display_name, canonical_person_ref, phone, username, active, version, evidence_ref, approved_by)
      VALUES (p_roster_id,
              COALESCE(p_payload->>'account_id','wa-01'),
              p_payload->>'role',
              COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_payload->'domain_scope') x), ARRAY[]::text[]),
              p_payload->>'display_name',
              p_payload->>'canonical_person_ref',
              NULLIF(p_payload->>'phone',''),
              NULLIF(p_payload->>'username',''),
              COALESCE((p_payload->>'active')::boolean, true),
              new_version,
              p_payload->>'evidence_ref',
              p_actor);

      INSERT INTO public.escort_roster_audit (id, roster_id, actor_id, action, reason, before_value, after_value, expected_version, operation_key, bridge_restart_required)
      VALUES (gen_random_uuid()::text, p_roster_id, p_actor, 'CREATE', p_reason, NULL, p_payload, 0, p_operation_key, false);
    END IF;
  ELSIF p_kind = 'roster_channel' THEN
    -- Channel changes affect bridge profile; if adding a new chat (expanding chats list),
    -- mark bridge_restart_required per owner decision (§7).
    IF p_payload ? 'chat_jid' AND (p_payload->>'_chats_grew')::boolean = true THEN
      chats_grew := true;
    END IF;

    INSERT INTO public.escort_roster_audit (id, roster_id, actor_id, action, reason, before_value, after_value, expected_version, operation_key, bridge_restart_required)
    VALUES (gen_random_uuid()::text, p_roster_id, p_actor, COALESCE(p_payload->>'action','UPDATE'), p_reason, p_payload->'before_value', p_payload->'after_value', p_expected_version, p_operation_key, chats_grew);

    IF chats_grew THEN
      -- Caller/runner must handle 2s restart per runbook when bridge_restart_required is true
      NULL;
    END IF;
  END IF;

  -- Bump epoch and enqueue profile regeneration
  UPDATE public.escort_roster_epoch SET epoch = epoch + 1, updated_at = now() WHERE id = 1 RETURNING epoch INTO new_version;
  INSERT INTO public.escort_roster_outbox (epoch, kind, payload, bridge_restart_required)
  VALUES (new_version, 'PROFILE_REGENERATE', jsonb_build_object('roster_id', p_roster_id, 'kind', p_kind), chats_grew);

  RETURN jsonb_build_object('ok', true, 'roster_id', p_roster_id, 'epoch', new_version, 'bridge_restart_required', chats_grew);
END;
$$;

REVOKE ALL ON FUNCTION public.escort_roster_apply(text,text,text,integer,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escort_roster_apply(text,text,text,integer,jsonb,text,text) TO alrifai_app;
GRANT EXECUTE ON FUNCTION public.escort_roster_apply(text,text,text,integer,jsonb,text,text) TO ir_review_runtime;

-- Least privilege grants (additive only)
GRANT SELECT ON public.escort_roster TO alrifai_app;
GRANT SELECT ON public.escort_roster_channel TO alrifai_app;
GRANT SELECT ON public.escort_roster_audit TO alrifai_app;
GRANT SELECT ON public.escort_roster_epoch TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.escort_roster_outbox TO alrifai_app;
GRANT SELECT ON public.escort_roster TO ir_review_runtime;
GRANT SELECT ON public.escort_roster_channel TO ir_review_runtime;
GRANT SELECT,INSERT ON public.escort_roster_audit TO ir_review_runtime;
GRANT SELECT ON public.escort_roster_epoch TO ir_review_runtime;
GRANT SELECT,INSERT,UPDATE ON public.escort_roster_outbox TO ir_review_runtime;

REVOKE ALL ON public.escort_roster, public.escort_roster_channel, public.escort_roster_audit, public.escort_roster_epoch, public.escort_roster_outbox FROM PUBLIC;

COMMIT;
