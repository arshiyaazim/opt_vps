BEGIN;

-- 0026: approved conversation scope, canonical PN/LID identity, archive provenance.
-- Additive and backward compatible. No existing row is deleted or rewritten.

CREATE TABLE IF NOT EXISTS public.conversation_scope (
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 canonical_chat_jid text NOT NULL CHECK (length(canonical_chat_jid) BETWEEN 5 AND 200),
 domain text NOT NULL CHECK (domain IN ('CASH','VESSEL')),
 conversation_type text NOT NULL CHECK (conversation_type IN ('DIRECT','GROUP')),
 display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
 canonical_person_ref text,
 alias_chat_jids text[] NOT NULL DEFAULT ARRAY[]::text[],
 approved_at timestamptz NOT NULL DEFAULT now(),
 approved_by text NOT NULL DEFAULT 'OWNER',
 evidence_ref text,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (account_id,canonical_chat_jid),
 CHECK (conversation_type <> 'GROUP' OR canonical_chat_jid LIKE '%@g.us'),
 CHECK (conversation_type <> 'DIRECT' OR canonical_chat_jid LIKE '%@s.whatsapp.net')
);

COMMENT ON TABLE public.conversation_scope IS
 'Owner-approved WhatsApp conversations. Identifiers are data, never source code.';

CREATE TABLE IF NOT EXISTS public.whatsapp_identity_aliases (
 scope_account text NOT NULL CHECK (scope_account IN ('wa-01','wa-02')),
 pn_bare text CHECK (pn_bare IS NULL OR pn_bare ~ '^[0-9]{6,20}$'),
 lid_bare text CHECK (lid_bare IS NULL OR lid_bare ~ '^[0-9]{6,20}$'),
 canonical_person_ref text NOT NULL CHECK (length(btrim(canonical_person_ref)) BETWEEN 1 AND 200),
 saved_name text,
 profile_name text,
 verification text NOT NULL CHECK (verification IN ('BRIDGE_LID_MAP','OWNER_PROVIDED','UNRESOLVED')),
 verified_at timestamptz NOT NULL DEFAULT now(),
 evidence_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (pn_bare IS NOT NULL OR lid_bare IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_identity_aliases_pn
 ON public.whatsapp_identity_aliases(scope_account,pn_bare) WHERE pn_bare IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_identity_aliases_lid
 ON public.whatsapp_identity_aliases(scope_account,lid_bare) WHERE lid_bare IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_identity_aliases_person
 ON public.whatsapp_identity_aliases(scope_account,canonical_person_ref);

-- Which stored business dataset is CURRENT and which is pre-transition ARCHIVE.
CREATE TABLE IF NOT EXISTS public.dataset_scope (
 dataset_key text PRIMARY KEY CHECK (length(btrim(dataset_key)) BETWEEN 1 AND 300),
 domain text NOT NULL CHECK (domain IN ('CASH','VESSEL','MESSAGES')),
 scope text NOT NULL CHECK (scope IN ('CURRENT','ARCHIVE')),
 reason text NOT NULL DEFAULT 'OWNER_APPROVED_ARCHIVE_SEPARATION',
 marked_at timestamptz NOT NULL DEFAULT now(),
 marked_by text NOT NULL DEFAULT 'OWNER'
);

-- Provenance epoch on business records. Existing rows are pre-transition by definition.
-- These tables are append-only, so the column is added with the legacy default in a
-- single DDL statement instead of an UPDATE over existing rows.
ALTER TABLE public.cash_instructions
 ADD COLUMN IF NOT EXISTS dataset_epoch text NOT NULL DEFAULT 'LEGACY_PRE_TRANSITION_20261026';
ALTER TABLE public.cash_instructions ALTER COLUMN dataset_epoch SET DEFAULT 'CANONICAL_BACKFILL_20261026';
CREATE INDEX IF NOT EXISTS cash_instructions_dataset_epoch
 ON public.cash_instructions(scope_account,cash_account,dataset_epoch);

ALTER TABLE public.programs
 ADD COLUMN IF NOT EXISTS dataset_epoch text NOT NULL DEFAULT 'LEGACY_PRE_TRANSITION_20261026';
ALTER TABLE public.programs ALTER COLUMN dataset_epoch SET DEFAULT 'CANONICAL_BACKFILL_20261026';
CREATE INDEX IF NOT EXISTS programs_dataset_epoch ON public.programs(dataset_epoch);

ALTER TABLE public.escort_order_register
 ADD COLUMN IF NOT EXISTS dataset_epoch text NOT NULL DEFAULT 'LEGACY_PRE_TRANSITION_20261026';
ALTER TABLE public.escort_order_register ALTER COLUMN dataset_epoch SET DEFAULT 'CANONICAL_BACKFILL_20261026';
CREATE INDEX IF NOT EXISTS escort_order_register_dataset_epoch
 ON public.escort_order_register(account_id,dataset_epoch);

-- Least privilege: the review runtime may read the new configuration only.
GRANT SELECT ON public.conversation_scope TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.conversation_scope TO alrifai_app;
GRANT SELECT ON public.whatsapp_identity_aliases TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.whatsapp_identity_aliases TO alrifai_app;
GRANT SELECT ON public.dataset_scope TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.dataset_scope TO alrifai_app;
GRANT SELECT ON public.conversation_scope TO ir_review_runtime;
GRANT SELECT ON public.whatsapp_identity_aliases TO ir_review_runtime;
GRANT SELECT ON public.dataset_scope TO ir_review_runtime;
REVOKE ALL ON public.conversation_scope FROM PUBLIC;
REVOKE ALL ON public.whatsapp_identity_aliases FROM PUBLIC;
REVOKE ALL ON public.dataset_scope FROM PUBLIC;

COMMIT;
