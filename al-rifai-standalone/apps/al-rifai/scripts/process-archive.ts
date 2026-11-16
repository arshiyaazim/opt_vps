import {createIngestionDbPool} from "./ingestion-db.ts";

const pool = createIngestionDbPool();
try {
  const result = await pool.query(
    `WITH batch AS (
       SELECT p.id, p.original_id, o.raw_content
       FROM public.whatsapp_messages_processing p
       JOIN public.whatsapp_messages_original o ON o.id=p.original_id
       WHERE p.domain='archive' AND p.status='pending'
       ORDER BY p.id
       LIMIT 100
       FOR UPDATE OF p SKIP LOCKED
     )
     UPDATE public.whatsapp_messages_processing p
     SET status='processed', processed_content=batch.raw_content, processed_at=NOW()
     FROM batch
     WHERE p.id=batch.id
     RETURNING p.id`,
  );
  console.log(`Processed ${result.rowCount ?? 0} archive message(s).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Archive processing failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
