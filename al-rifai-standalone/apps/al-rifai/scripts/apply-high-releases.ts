// Apply every high-confidence release candidate (Action 1.2).
//
// Standalone because the HTTP route needs an authenticated Owner session.
//
// Every candidate goes through public.apply_release_candidate(), which releases
// the program, recalculates pay, marks the candidate and writes the audit row in
// ONE transaction. This script used to call alrifai_vessel_program_release and
// UPDATE the candidate on two different connections with no transaction and no
// release_auto_apply_log row — the same non-atomic shape that let candidate 2093
// be applied without an audit record. If the function is absent the script now
// refuses to run and writes nothing.
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
    const probe = await app.query<{atomic: boolean}>(
      `SELECT to_regprocedure('public.apply_release_candidate(bigint,text,text,text)') IS NOT NULL AS atomic`,
    );
    if (!probe.rows[0]?.atomic) {
      console.error('ATOMIC_APPLY_REQUIRED_BUT_MISSING: apply_release_candidate() is not installed; nothing was applied.');
      process.exitCode = 1;
      return;
    }

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
        await cmd.query(
          'SELECT public.apply_release_candidate($1::bigint,$2,$3,$4) AS result',
          [cand.id, actor, 'apply-all-high', 'apply-all-high-cli'],
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
