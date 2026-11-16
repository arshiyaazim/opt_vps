BEGIN;

-- 0028: live synchronization cursors for the native WA-01 reader.
-- Additive and backward compatible. Legacy rowid cursors are preserved; the
-- native cursor is a separate, opaque bridge-issued value so that neither
-- cursor family can be mistaken for the other.

ALTER TABLE public.cash_live_sync_channels
 ADD COLUMN IF NOT EXISTS native_cursor text;

ALTER TABLE public.whatsapp_ingestion_cursors
 ADD COLUMN IF NOT EXISTS native_cursor text;

-- Backfill progress bookkeeping for the native reader (per chat).
CREATE TABLE IF NOT EXISTS public.whatsapp_native_sync_state (
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 chat_jid text NOT NULL CHECK (length(chat_jid) BETWEEN 5 AND 200),
 cursor text,
 last_sequence bigint,
 last_observed_at timestamptz,
 last_error text,
 activated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (account_id,chat_jid)
);

COMMENT ON TABLE public.whatsapp_native_sync_state IS
 'Live cursor per approved conversation for the WA-01 native message reader. A null cursor means the reader has not yet been activated (activation skips history by design; history comes from the approved backfill).';

GRANT SELECT,INSERT,UPDATE ON public.whatsapp_native_sync_state TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.whatsapp_native_sync_state TO ir_review_runtime;
REVOKE ALL ON public.whatsapp_native_sync_state FROM PUBLIC;

COMMIT;
