-- Additive vessel-register workflow. The WhatsApp bridge remains read-only;
-- the reconciliation producer is the only writer for these projections.
CREATE TABLE public.escort_client_contacts (
 id text PRIMARY KEY,
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 150),
 username text,
 phone text NOT NULL CHECK (phone ~ '^\+8801[3-9][0-9]{8}$'),
 source text NOT NULL DEFAULT 'OWNER_PROVIDED',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (account_id, phone)
);

CREATE TABLE public.escort_order_register (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 client_contact_id text NOT NULL REFERENCES public.escort_client_contacts(id),
 client_phone text NOT NULL CHECK (client_phone ~ '^\+8801[3-9][0-9]{8}$'),
 chat_jid text NOT NULL,
 source_message_id text NOT NULL,
 source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
 block_key text NOT NULL,
 source_time timestamptz NOT NULL,
 mother_vessel text NOT NULL DEFAULT '',
 lighter_vessel text NOT NULL DEFAULT '',
 master_mobile text NOT NULL DEFAULT '',
 cargo text NOT NULL DEFAULT '',
 capacity text NOT NULL DEFAULT '',
 importer text NOT NULL DEFAULT '',
 destination text NOT NULL DEFAULT '',
 booking_date date,
 escort_name text NOT NULL DEFAULT '',
 escort_mobile text NOT NULL DEFAULT '',
 duty_date date,
 shift text NOT NULL DEFAULT '' CHECK (shift IN ('','D','N')),
 release_point text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','REVIEW')),
 confirmation_message_id text,
 confirmation_source_hash text,
 reasons jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(reasons)='array'),
 parsed jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(parsed)='object'),
 source_text text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (account_id, source_hash, block_key)
);

CREATE INDEX escort_order_register_status ON public.escort_order_register(status, source_time DESC);
CREATE INDEX escort_order_register_client ON public.escort_order_register(account_id, client_phone, source_time DESC);
CREATE INDEX escort_order_register_vessel ON public.escort_order_register(account_id, lighter_vessel, mother_vessel);

CREATE TABLE public.escort_order_events (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 order_id text NOT NULL REFERENCES public.escort_order_register(id),
 event_type text NOT NULL CHECK (event_type IN ('DRAFT_CREATED','CONFIRMATION_REVIEW','CONFIRMED')),
 source_message_id text NOT NULL,
 source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (order_id, event_type, source_hash)
);

CREATE TRIGGER escort_order_events_append_only
 BEFORE UPDATE OR DELETE OR TRUNCATE ON public.escort_order_events
 FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();

REVOKE ALL ON public.escort_client_contacts, public.escort_order_register, public.escort_order_events FROM PUBLIC;
GRANT SELECT ON public.escort_client_contacts, public.escort_order_register, public.escort_order_events TO alrifai_app;
GRANT SELECT, INSERT, UPDATE ON public.escort_client_contacts, public.escort_order_register TO ir_review_runtime;
GRANT SELECT, INSERT ON public.escort_order_events TO ir_review_runtime;

INSERT INTO public.escort_client_contacts (id, account_id, display_name, username, phone)
VALUES
 ('escort-client-hridoy-wa01', 'wa-01', 'Escort Hridoy', '@nhhridoyvau', '+8801670535255'),
 ('escort-client-rezaul-karim-wa01', 'wa-01', 'Escort REZAUL KARIM', NULL, '+8801836743754'),
 ('escort-client-tcis-wa01', 'wa-01', 'TCIS W/A', NULL, '+8801757622300')
ON CONFLICT (id) DO UPDATE SET
 display_name=EXCLUDED.display_name,
 username=EXCLUDED.username,
 phone=EXCLUDED.phone,
 active=true;
