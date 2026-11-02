// Apply every high-confidence release candidate (Action 1.2).
//
// Standalone because the HTTP route needs an authenticated Owner session. The SQL
// path is identical: alrifai_vessel_program_release (never a direct UPDATE), then
// recalculate_program_pay, then the candidate is marked applied.
//
// One candidate per program is applied: several candidates can describe one duty
// (food bill + same-day partial), and releasing twice would append duplicate
// RELEASE_PROGRAM events. The extras are annotated instead.
import {createPool} from '../db/postgres.mjs';

type Cand = {id: string; program_id: string; end_date: string; end_shift: string};

async function main() {
  const app = createPool({readOnly: false, user: 'alrifai_app'});
  const cmd = createPool({readOnly: false, user: 'ir_review_runtime'});
  const actor = (process.env.ALRIFAI_VESSEL_COMMAND_ACTOR || process.env.ALRIFAI_CASH_OWNER_PERSON_REF || '').trim();
  if (!actor) throw new Error('VESSEL_COMMAND_ACTOR_NOT_CONFIGURED');

  try {
    const picked = await app.query<Cand>(
      `SELECT DISTINCT ON (program_id) id::text AS id, program_id, end_date::text AS end_date, end_shift
         FROM public.release_candidates
        WHERE applied = false AND match_status = 'MATCHED' AND confidence = 'high'
          AND program_id IS NOT NULL AND end_shift IS NOT NULL
        ORDER BY program_id, end_date, id`,
    );

    let applied = 0;
    const failed: Array<{id: string; error: string}> = [];

    for (const cand of picked.rows) {
      try {
        const rev = await app.query<{revision: number}>(
          'SELECT revision FROM public.programs WHERE id = $1', [cand.program_id],
        );
        const revision = rev.rows[0]?.revision;
        if (revision === undefined) throw new Error('PROGRAM_NOT_FOUND');

        await cmd.query(
          'SELECT public.alrifai_vessel_program_release($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',
          [cand.program_id, cand.end_date, cand.end_shift, '', actor, revision,
            `release-candidate-${cand.id}`, JSON.stringify({source: 'apply-all-high', candidateId: cand.id})],
        );
        await cmd.query('SELECT public.recalculate_program_pay($1)', [cand.program_id]);
        await app.query(
          `UPDATE public.release_candidates
              SET applied = true, match_status = 'APPLIED', reviewed_by = 'apply-all-high', reviewed_at = now()
            WHERE id = $1::bigint`, [cand.id],
        );
        applied += 1;
      } catch (error) {
        failed.push({id: cand.id, error: error instanceof Error ? error.message : String(error)});
      }
    }

    const ids = picked.rows.map((r) => r.id);
    if (ids.length) {
      await app.query(
        `UPDATE public.release_candidates
            SET notes = coalesce(notes || ' · ', '') || 'duplicate for a program already released by apply-all-high'
          WHERE applied = false AND match_status = 'MATCHED' AND confidence = 'high'
            AND program_id IS NOT NULL AND id <> ALL($1::bigint[])`,
        [ids],
      );
    }
    console.log(JSON.stringify({applied, failed, candidates: picked.rows.length}, null, 2));
  } finally {
    await app.end();
    await cmd.end();
  }
}

main().catch((error) => {
  console.error('APPLY_ALL_HIGH_FAILED', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
