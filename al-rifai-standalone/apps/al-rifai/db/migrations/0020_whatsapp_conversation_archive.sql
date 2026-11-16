BEGIN;

CREATE TABLE public.whatsapp_archive_conversations (
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 chat_jid text NOT NULL CHECK (chat_jid ~ '^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)$'),
 is_group boolean NOT NULL,
 native_scope jsonb NOT NULL CHECK (jsonb_typeof(native_scope) = 'object'),
 first_seen_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL,
 PRIMARY KEY (account_id,chat_jid)
);

CREATE TABLE public.whatsapp_archive_messages (
 account_id text NOT NULL,
 chat_jid text NOT NULL,
 source_rowid bigint NOT NULL CHECK (source_rowid > 0),
 message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 256),
 sender_id text,
 direction text CHECK (direction IN ('INCOMING','OUTGOING')),
 source_deleted_at_raw text,
 source_timestamp_raw text,
 message_type text,
 body text,
 visibility_state text NOT NULL CHECK (visibility_state IN ('VISIBLE','REVOKED','SUPPRESSED','UNKNOWN')),
 source_hash text CHECK (source_hash IS NULL OR source_hash ~ '^[a-f0-9]{64}$'),
 original_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(original_identifiers) = 'object'),
 source_provenance jsonb NOT NULL CHECK (jsonb_typeof(source_provenance) = 'object'),
 first_ingested_at timestamptz NOT NULL,
 last_observed_at timestamptz NOT NULL,
 PRIMARY KEY (account_id,chat_jid,message_id),
 UNIQUE (account_id,chat_jid,source_rowid),
 FOREIGN KEY (account_id,chat_jid)
  REFERENCES public.whatsapp_archive_conversations(account_id,chat_jid),
 CHECK (visibility_state = 'VISIBLE' OR body IS NULL)
);

CREATE TABLE public.whatsapp_archive_media (
 account_id text NOT NULL,
 chat_jid text NOT NULL,
 message_id text NOT NULL,
 media_ordinal smallint NOT NULL DEFAULT 0 CHECK (media_ordinal >= 0),
 media_type text,
 filename text,
 content_hash text CHECK (content_hash IS NULL OR content_hash ~ '^[a-f0-9]{64}$'),
 byte_length bigint CHECK (byte_length IS NULL OR byte_length >= 0),
 stored_file_ref text,
 acquired_at timestamptz,
 PRIMARY KEY (account_id,chat_jid,message_id,media_ordinal),
 FOREIGN KEY (account_id,chat_jid,message_id)
  REFERENCES public.whatsapp_archive_messages(account_id,chat_jid,message_id)
);

CREATE TABLE public.whatsapp_archive_sync_state (
 account_id text NOT NULL,
 chat_jid text NOT NULL,
 after_rowid bigint NOT NULL DEFAULT 0 CHECK (after_rowid >= 0),
 complete boolean NOT NULL DEFAULT false,
 last_observed_at timestamptz NOT NULL,
 PRIMARY KEY (account_id,chat_jid),
 FOREIGN KEY (account_id,chat_jid)
  REFERENCES public.whatsapp_archive_conversations(account_id,chat_jid)
);

CREATE INDEX whatsapp_archive_messages_page_idx
 ON public.whatsapp_archive_messages(account_id,chat_jid,source_rowid);
CREATE INDEX whatsapp_archive_messages_time_idx
 ON public.whatsapp_archive_messages(account_id,chat_jid,source_timestamp_raw,message_id);

COMMIT;
