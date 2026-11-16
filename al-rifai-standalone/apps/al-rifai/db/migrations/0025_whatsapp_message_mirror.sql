CREATE SCHEMA IF NOT EXISTS whatsapp_mirror;
REVOKE ALL ON SCHEMA whatsapp_mirror FROM PUBLIC;

CREATE TABLE whatsapp_mirror.bridges (
  bridge_id text PRIMARY KEY CHECK (bridge_id IN ('wa-01', 'wa-02', 'wa-03')),
  connection_status text NOT NULL CHECK (
    connection_status IN ('NOT_VERIFIED', 'CONNECTED', 'NOT_CONNECTED', 'READY_FOR_CONNECTION', 'ERROR')
  ),
  message_access_status text NOT NULL CHECK (
    message_access_status IN ('UNKNOWN', 'IDENTITY_ONLY', 'MESSAGE_READ', 'DENIED')
  ),
  sync_enabled boolean NOT NULL DEFAULT false,
  activation_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_mirror.bridges (bridge_id, connection_status, message_access_status)
VALUES
  ('wa-01', 'NOT_VERIFIED', 'UNKNOWN'),
  ('wa-02', 'NOT_VERIFIED', 'UNKNOWN'),
  ('wa-03', 'READY_FOR_CONNECTION', 'UNKNOWN')
ON CONFLICT (bridge_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS whatsapp_mirror.schema_migrations (
  id text PRIMARY KEY,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_mirror.messages (
  logical_message_id bigserial PRIMARY KEY,
  canonical_identity text UNIQUE,
  possible_duplicate_identity text,
  identity_status text NOT NULL CHECK (identity_status IN ('VERIFIED', 'UNRESOLVED', 'CONFLICT')),
  original_message_id text,
  chat_jid text NOT NULL,
  sender_jid text,
  sender_lid text,
  sender_phone text,
  saved_contact_name text,
  sender_name text,
  sender_name_source text,
  chat_type text NOT NULL CHECK (chat_type IN ('GROUP', 'DIRECT', 'UNKNOWN')),
  direction text CHECK (direction IN ('INCOMING', 'OUTGOING')),
  message_text text,
  message_type text NOT NULL,
  media_metadata jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(media_metadata) = 'array'),
  source_timestamp timestamptz,
  content_sha256 text CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[a-f0-9]{64}$'),
  processing_status text NOT NULL DEFAULT 'RECEIVED' CHECK (
    processing_status IN ('RECEIVED', 'UNRESOLVED', 'CONFLICT')
  ),
  first_mirrored_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_chat_time_idx
  ON whatsapp_mirror.messages (chat_jid, source_timestamp DESC, logical_message_id DESC);
CREATE INDEX messages_possible_duplicate_idx
  ON whatsapp_mirror.messages (possible_duplicate_identity)
  WHERE possible_duplicate_identity IS NOT NULL;

CREATE TABLE whatsapp_mirror.message_sources (
  source_record_id bigserial PRIMARY KEY,
  logical_message_id bigint REFERENCES whatsapp_mirror.messages (logical_message_id),
  bridge_id text NOT NULL REFERENCES whatsapp_mirror.bridges (bridge_id),
  stream_id text NOT NULL,
  source_event_id text NOT NULL,
  source_sequence bigint NOT NULL CHECK (source_sequence >= 0),
  identity_status text NOT NULL CHECK (identity_status IN ('VERIFIED', 'UNRESOLVED', 'CONFLICT')),
  possible_duplicate_identity text,
  original_chat_jid text NOT NULL,
  original_sender_jid text,
  original_message_id text,
  source_timestamp timestamptz,
  source_event_ref text NOT NULL,
  raw_source_metadata jsonb NOT NULL CHECK (jsonb_typeof(raw_source_metadata) = 'object'),
  mirrored_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bridge_id, stream_id, source_event_id)
);

CREATE INDEX message_sources_logical_idx
  ON whatsapp_mirror.message_sources (logical_message_id, bridge_id);
CREATE INDEX message_sources_chat_sequence_idx
  ON whatsapp_mirror.message_sources (bridge_id, original_chat_jid, source_sequence);
CREATE INDEX message_sources_possible_duplicate_idx
  ON whatsapp_mirror.message_sources (possible_duplicate_identity)
  WHERE possible_duplicate_identity IS NOT NULL;

CREATE TABLE whatsapp_mirror.message_events (
  message_event_id bigserial PRIMARY KEY,
  source_record_id bigint NOT NULL UNIQUE
    REFERENCES whatsapp_mirror.message_sources (source_record_id),
  logical_message_id bigint REFERENCES whatsapp_mirror.messages (logical_message_id),
  event_type text NOT NULL,
  event_metadata jsonb NOT NULL CHECK (jsonb_typeof(event_metadata) = 'object'),
  occurred_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_mirror.sync_checkpoints (
  bridge_id text NOT NULL REFERENCES whatsapp_mirror.bridges (bridge_id),
  chat_jid text NOT NULL,
  stream_id text NOT NULL,
  activation_at timestamptz NOT NULL,
  activation_cursor text NOT NULL,
  activation_boundary_sequence bigint NOT NULL CHECK (activation_boundary_sequence >= 0),
  last_committed_cursor text NOT NULL,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error text,
  last_successful_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bridge_id, chat_jid)
);
