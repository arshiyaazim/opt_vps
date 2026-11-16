BEGIN;

-- 0027: historical backfill staging for the approved WA-01 conversations.
-- Additive only. Stage first, reconcile, then publish. No production business
-- table is read or modified by the staging step.

CREATE TABLE IF NOT EXISTS public.wa01_backfill_staging (
 batch_id text NOT NULL CHECK (length(btrim(batch_id)) BETWEEN 1 AND 100),
 account_id text NOT NULL CHECK (account_id IN ('wa-01','wa-02')),
 chat_jid text NOT NULL CHECK (length(chat_jid) BETWEEN 5 AND 200),
 message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 256),
 direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
 sender_bare text,
 sender_push_name text,
 sender_phone text,
 receiver_jid text,
 contact_name text,
 group_name text,
 chat_type text NOT NULL CHECK (chat_type IN ('individual','group')),
 source_time timestamptz NOT NULL,
 message_type text,
 text_content text,
 media_ref text,
 raw_content jsonb NOT NULL CHECK (jsonb_typeof(raw_content)='object'),
 loaded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (batch_id,chat_jid,message_id)
);

CREATE INDEX IF NOT EXISTS wa01_backfill_staging_chat
 ON public.wa01_backfill_staging(batch_id,chat_jid,source_time);

CREATE TABLE IF NOT EXISTS public.wa01_backfill_runs (
 id text PRIMARY KEY,
 batch_id text NOT NULL,
 scope jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL CHECK (status IN ('STAGED','PUBLISHED','FAILED')),
 scanned integer NOT NULL DEFAULT 0,
 inserted integer NOT NULL DEFAULT 0,
 cash_eligible integer NOT NULL DEFAULT 0,
 cash_published integer NOT NULL DEFAULT 0,
 cash_duplicate integer NOT NULL DEFAULT 0,
 vessel_queued integer NOT NULL DEFAULT 0,
 unmatched integer NOT NULL DEFAULT 0,
 review_queued integer NOT NULL DEFAULT 0,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 notes jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT,INSERT,UPDATE,DELETE ON public.wa01_backfill_staging TO alrifai_app;
GRANT SELECT,INSERT,UPDATE ON public.wa01_backfill_runs TO alrifai_app;
GRANT SELECT ON public.wa01_backfill_staging TO ir_review_runtime;
GRANT SELECT ON public.wa01_backfill_runs TO ir_review_runtime;
REVOKE ALL ON public.wa01_backfill_staging FROM PUBLIC;
REVOKE ALL ON public.wa01_backfill_runs FROM PUBLIC;

COMMIT;
