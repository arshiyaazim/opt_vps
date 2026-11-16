BEGIN;

-- 0029: allow the native reader to record its own cursor failures.
--
-- The bridge no longer exposes the historical message tools, so the ingestion
-- worker records failures against source_mode='native'. The original CHECK only
-- allowed the retired 'archive' and 'compatibility' modes, which made a native
-- failure abort the whole account cycle. This widens the allowed set; no row is
-- deleted or rewritten and existing cursors are untouched.

ALTER TABLE public.whatsapp_ingestion_cursors
 DROP CONSTRAINT IF EXISTS whatsapp_ingestion_cursors_source_mode_check;

ALTER TABLE public.whatsapp_ingestion_cursors
 ADD CONSTRAINT whatsapp_ingestion_cursors_source_mode_check
 CHECK (source_mode = ANY (ARRAY['archive'::text, 'compatibility'::text, 'native'::text]));

COMMIT;
