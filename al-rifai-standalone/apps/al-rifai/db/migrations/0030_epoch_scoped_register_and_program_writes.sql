BEGIN;

-- 0030: epoch-scoped register identity + least-privilege program writes.
--
-- The canonical reconstruction reads the WA-01 message database and must be able
-- to re-derive a Draft/Review row for the same source block that already exists
-- in the pre-transition Archive epoch. Source identity is therefore unique per
-- (account, epoch, source block), never across epochs. Business identity follows
-- the same rule so a canonical program is not blocked by an archived record.
--
-- No row is deleted or rewritten; existing legacy rows keep their identity.

ALTER TABLE public.escort_order_register
 DROP CONSTRAINT IF EXISTS escort_order_register_account_id_source_hash_block_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS escort_order_register_epoch_source
 ON public.escort_order_register(account_id,dataset_epoch,source_hash,block_key);

DROP INDEX IF EXISTS public.escort_order_register_business_key;

CREATE UNIQUE INDEX IF NOT EXISTS escort_order_register_epoch_business_key
 ON public.escort_order_register(account_id,dataset_epoch,business_key)
 WHERE business_key IS NOT NULL;

ALTER TABLE public.escort_order_sources
 ADD COLUMN IF NOT EXISTS dataset_epoch text NOT NULL DEFAULT 'LEGACY_PRE_TRANSITION_20261026';
ALTER TABLE public.escort_order_sources
 ALTER COLUMN dataset_epoch SET DEFAULT 'CANONICAL_BACKFILL_20261026';

ALTER TABLE public.escort_order_sources DROP CONSTRAINT IF EXISTS escort_order_sources_pkey;
ALTER TABLE public.escort_order_sources
 ADD CONSTRAINT escort_order_sources_pkey PRIMARY KEY (account_id,dataset_epoch,source_hash,block_key);

-- The vessel processor runs as ir_review_runtime. It may create a canonical
-- program (idempotent insert only); it may not update or delete program rows.
GRANT INSERT ON public.programs TO ir_review_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON public.programs FROM ir_review_runtime;

COMMIT;
