BEGIN;

ALTER TABLE public.escort_order_register
 ADD COLUMN business_key text
 CHECK (business_key IS NULL OR business_key ~ '^[a-f0-9]{64}$');

CREATE UNIQUE INDEX escort_order_register_business_key
 ON public.escort_order_register(account_id,business_key)
 WHERE business_key IS NOT NULL;

CREATE TABLE public.escort_order_sources (
 account_id text NOT NULL CHECK (account_id='wa-01'),
 source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
 block_key text NOT NULL,
 order_id text NOT NULL REFERENCES public.escort_order_register(id),
 client_contact_id text NOT NULL REFERENCES public.escort_client_contacts(id),
 source_message_id text NOT NULL,
 chat_jid text NOT NULL,
 source_time timestamptz NOT NULL,
 provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (account_id,source_hash,block_key)
);

CREATE INDEX escort_order_sources_order
 ON public.escort_order_sources(order_id,source_time);

CREATE TABLE public.escort_client_group_authorizations (
 account_id text NOT NULL CHECK (account_id='wa-01'),
 group_jid text NOT NULL CHECK (group_jid ~ '^[A-Za-z0-9_.:+-]{1,160}@g\.us$'),
 participant_jid text NOT NULL CHECK (participant_jid ~ '^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid)$'),
 client_contact_id text NOT NULL REFERENCES public.escort_client_contacts(id),
 authorization_ref text NOT NULL CHECK (length(btrim(authorization_ref)) BETWEEN 1 AND 300),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (account_id,group_jid,participant_jid)
);

ALTER TABLE public.escort_order_events
 DROP CONSTRAINT IF EXISTS escort_order_events_event_type_check;
ALTER TABLE public.escort_order_events
 ADD CONSTRAINT escort_order_events_event_type_check
 CHECK (event_type IN (
  'DRAFT_CREATED','CONFIRMATION_REVIEW','ASSIGNMENT_REVIEW','CONFIRMED'
 ));

REVOKE ALL ON public.escort_order_sources, public.escort_client_group_authorizations FROM PUBLIC;
GRANT SELECT,INSERT ON public.escort_order_sources TO ir_review_runtime;
GRANT SELECT ON public.escort_order_sources, public.escort_client_group_authorizations TO alrifai_app;
GRANT SELECT ON public.escort_client_group_authorizations TO ir_review_runtime;

COMMIT;
