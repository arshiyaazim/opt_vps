BEGIN;

CREATE TABLE public.whatsapp_messages_original (
 id SERIAL PRIMARY KEY,
 wa_account VARCHAR(50) NOT NULL CHECK (wa_account IN ('wa-01','wa-02')),
 chat_jid VARCHAR(255) NOT NULL,
 chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('individual','group')),
 message_id VARCHAR(255) NOT NULL,
 direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming','outgoing')),
 sender_jid VARCHAR(255),
 sender_phone VARCHAR(30),
 sender_push_name VARCHAR(255),
 receiver_jid VARCHAR(255),
 receiver_phone VARCHAR(30),
 group_name VARCHAR(255),
 "timestamp" TIMESTAMPTZ NOT NULL,
 message_type VARCHAR(50),
 raw_content JSONB NOT NULL CHECK (jsonb_typeof(raw_content) = 'object'),
 text_content TEXT,
 media_ref TEXT,
 ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (wa_account, chat_jid, message_id)
);

CREATE TABLE public.whatsapp_messages_processing (
 id SERIAL PRIMARY KEY,
 original_id INTEGER NOT NULL REFERENCES public.whatsapp_messages_original(id),
 domain VARCHAR(50) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','processed','error')),
 processed_content JSONB,
 processing_errors JSONB,
 processed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (original_id, domain)
);

CREATE TABLE public.whatsapp_contacts (
 id SERIAL PRIMARY KEY,
 wa_account VARCHAR(50) NOT NULL CHECK (wa_account IN ('wa-01','wa-02')),
 phone_number VARCHAR(30) NOT NULL,
 jid VARCHAR(255) NOT NULL,
 push_name VARCHAR(255),
 contact_name VARCHAR(255),
 is_business BOOLEAN NOT NULL DEFAULT FALSE,
 verified_name VARCHAR(255),
 last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (wa_account, phone_number)
);

CREATE FUNCTION public.reject_whatsapp_original_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
 RAISE EXCEPTION 'whatsapp_messages_original is append-only';
END;
$$;

CREATE TRIGGER whatsapp_messages_original_no_update_delete
 BEFORE UPDATE OR DELETE ON public.whatsapp_messages_original
 FOR EACH ROW EXECUTE FUNCTION public.reject_whatsapp_original_mutation();

CREATE TRIGGER whatsapp_messages_original_no_truncate
 BEFORE TRUNCATE ON public.whatsapp_messages_original
 FOR EACH STATEMENT EXECUTE FUNCTION public.reject_whatsapp_original_mutation();

CREATE INDEX whatsapp_messages_original_time_idx
 ON public.whatsapp_messages_original (wa_account, chat_jid, "timestamp", id);
CREATE INDEX whatsapp_messages_processing_pending_idx
 ON public.whatsapp_messages_processing (domain, created_at, id)
 WHERE status = 'pending';

GRANT SELECT, INSERT ON public.whatsapp_messages_original TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_messages_original_id_seq TO alrifai_app;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_messages_processing TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_messages_processing_id_seq TO alrifai_app;
GRANT SELECT ON public.whatsapp_contacts TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_contacts_id_seq TO alrifai_app;

COMMIT;
