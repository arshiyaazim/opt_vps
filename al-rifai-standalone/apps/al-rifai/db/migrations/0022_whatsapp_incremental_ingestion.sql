BEGIN;

ALTER TABLE public.whatsapp_contacts
 ADD COLUMN name_source text,
 ADD COLUMN name_confidence text
  CHECK (name_confidence IS NULL OR name_confidence IN ('SOURCE_CONTACT','SOURCE_PUSH_NAME','TRANSPORT_JID'));

ALTER TABLE public.whatsapp_archive_conversations
 ADD COLUMN display_name text,
 ADD COLUMN display_name_source text,
 ADD COLUMN display_name_confidence text
  CHECK (display_name_confidence IS NULL OR display_name_confidence IN ('SOURCE_CHAT_METADATA','UNKNOWN'));

CREATE TABLE public.whatsapp_ingestion_cursors (
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 chat_jid text NOT NULL CHECK (chat_jid ~ '^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)$'),
 source_mode text NOT NULL CHECK (source_mode IN ('archive','compatibility')),
 page_number integer NOT NULL DEFAULT 0 CHECK (page_number >= 0),
 after_rowid bigint NOT NULL DEFAULT 0 CHECK (after_rowid >= 0),
 last_observed_at timestamptz NOT NULL DEFAULT now(),
 last_error text,
 PRIMARY KEY (account_id,chat_jid,source_mode)
);

CREATE TABLE public.whatsapp_message_source_events (
 id bigserial PRIMARY KEY,
 wa_account text NOT NULL CHECK (wa_account IN ('wa-01','wa-02')),
 chat_jid text NOT NULL,
 message_id text NOT NULL,
 revision_hash text NOT NULL CHECK (revision_hash ~ '^[a-f0-9]{64}$'),
 source_mode text NOT NULL CHECK (source_mode IN ('archive','compatibility')),
 source_rowid bigint,
 source_event text NOT NULL CHECK (source_event IN ('VISIBLE','REVOKED','SUPPRESSED','UNKNOWN','MESSAGE')),
 raw_content jsonb NOT NULL CHECK (jsonb_typeof(raw_content)='object'),
 observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (wa_account,chat_jid,message_id,revision_hash,source_mode)
);

CREATE INDEX whatsapp_message_source_events_latest_idx
 ON public.whatsapp_message_source_events (wa_account,chat_jid,message_id,observed_at DESC,id DESC);
CREATE INDEX whatsapp_messages_original_chat_page_idx
 ON public.whatsapp_messages_original (wa_account,chat_jid,id);

CREATE FUNCTION public.reject_whatsapp_source_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
 RAISE EXCEPTION 'whatsapp_message_source_events is append-only';
END;
$$;

CREATE TRIGGER whatsapp_message_source_events_no_update_delete
 BEFORE UPDATE OR DELETE ON public.whatsapp_message_source_events
 FOR EACH ROW EXECUTE FUNCTION public.reject_whatsapp_source_event_mutation();

CREATE TRIGGER whatsapp_message_source_events_no_truncate
 BEFORE TRUNCATE ON public.whatsapp_message_source_events
 FOR EACH STATEMENT EXECUTE FUNCTION public.reject_whatsapp_source_event_mutation();

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_ingestion_cursors TO alrifai_app;
GRANT SELECT, INSERT ON public.whatsapp_message_source_events TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_message_source_events_id_seq TO alrifai_app;
GRANT SELECT, INSERT, UPDATE ON
 public.whatsapp_archive_conversations, public.whatsapp_archive_messages,
 public.whatsapp_archive_media, public.whatsapp_archive_sync_state
 TO alrifai_app;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_contacts TO alrifai_app;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_contacts_id_seq TO alrifai_app;
GRANT SELECT ON public.whatsapp_messages_original, public.whatsapp_message_source_events TO ir_review_runtime;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_messages_processing TO ir_review_runtime;
GRANT SELECT ON public.whatsapp_ingestion_cursors TO ir_review_runtime;

COMMIT;
