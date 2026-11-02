// Apply / reject a release candidate (R1 Step 4).
//
// Applying a release does NOT write to programs directly. It goes through the
// existing vessel command layer (alrifai_vessel_program_release), which sets
// endDate, records details.endShift and appends a RELEASE_PROGRAM event, bumping
// revision so program_command_history stays intact. A direct UPDATE would bypass
// that audit trail, which AGENTS.md forbids.
//
// The command already stored endDate/endShift on the program; program_pay is then
// recalculated so the register shows money instead of ৳—.

import {database} from '@/db/raw';
import {createPool} from '@/db/postgres.mjs';
import {commandActorFromEnv} from '@/lib/vessel-command-policy';

export type Candidate = {
  id: string;
  program_id: string | null;
  end_date: string;
  end_shift: string | null;
  amount_bdt: number | null;
  confidence: string | null;
  match_status: string;
  applied: boolean;
  escort_phone: string;
};

let writer: ReturnType<typeof createPool> | null = null;
function commandPool() {
  if (!writer) writer = createPool({readOnly: false, user: 'ir_review_runtime'});
  return writer;
}

// db/raw's pool is read-only, so candidate bookkeeping needs its own writer.
let bookkeeping: ReturnType<typeof createPool> | null = null;
function writePool() {
  if (!bookkeeping) bookkeeping = createPool({readOnly: false, user: 'alrifai_app'});
  return bookkeeping;
}

export class ApplyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function loadCandidate(id: string): Promise<Candidate> {
  const result = await database().all<Candidate>(
    'SELECT id, program_id, end_date::text AS end_date, end_shift, amount_bdt, confidence, match_status, applied, escort_phone FROM public.release_candidates WHERE id = $1',
    [id],
  );
  const row = result.results[0];
  if (!row) throw new ApplyError('CANDIDATE_NOT_FOUND', 404);
  return row;
}

/** Apply one candidate. Idempotent: an already-applied row returns its state. */
export async function applyCandidate(id: string, reviewedBy: string): Promise<{programId: string; alreadyApplied: boolean}> {
  const candidate = await loadCandidate(id);
  if (candidate.applied) return {programId: candidate.program_id ?? '', alreadyApplied: true};
  if (candidate.match_status !== 'MATCHED') throw new ApplyError('CANDIDATE_NOT_MATCHED', 409);
  if (!candidate.program_id) throw new ApplyError('CANDIDATE_WITHOUT_PROGRAM', 409);
  if (!candidate.end_shift) throw new ApplyError('CANDIDATE_WITHOUT_SHIFT', 409);

  // Read the current revision immediately before commanding; the function rejects
  // a stale revision rather than overwriting a concurrent change.
  const current = await database().all<{revision: number}>(
    'SELECT revision FROM public.programs WHERE id = $1', [candidate.program_id],
  );
  const revision = current.results[0]?.revision;
  if (revision === undefined) throw new ApplyError('PROGRAM_NOT_FOUND', 404);

  const actor = commandActorFromEnv(process.env as Record<string, string | undefined>).ref;
  const commandKey = `release-candidate-${candidate.id}`;

  const pool = commandPool();
  await pool.query(
    'SELECT public.alrifai_vessel_program_release($1,$2,$3,$4,$5,$6,$7,$8::jsonb) AS result',
    [candidate.program_id, candidate.end_date, candidate.end_shift, '', actor, revision, commandKey,
      JSON.stringify({source: 'release_candidates', candidateId: candidate.id})],
  );

  // Derived pay follows the release; without this the register keeps showing ৳—.
  await pool.query('SELECT public.recalculate_program_pay($1)', [candidate.program_id]);

  await writePool().query(
    `UPDATE public.release_candidates
        SET applied = true, match_status = 'APPLIED', reviewed_by = $2, reviewed_at = now()
      WHERE id = $1`,
    [id, reviewedBy],
  );
  return {programId: candidate.program_id, alreadyApplied: false};
}

/** Reject one candidate. Never touches programs. */
export async function rejectCandidate(id: string, reviewedBy: string): Promise<void> {
  const candidate = await loadCandidate(id);
  if (candidate.applied) throw new ApplyError('CANDIDATE_ALREADY_APPLIED', 409);
  await writePool().query(
    `UPDATE public.release_candidates
        SET applied = true, match_status = 'REJECTED', reviewed_by = $2, reviewed_at = now()
      WHERE id = $1`,
    [id, reviewedBy],
  );
}

/** Apply every high-confidence MATCHED candidate. Returns per-program outcome. */
export async function applyAllHigh(reviewedBy: string): Promise<{applied: number; failed: Array<{id: string; error: string}>}> {
  // Several candidates can describe one duty (a food bill and a same-day partial).
  // Releasing a program twice would append duplicate RELEASE_PROGRAM events and
  // rewrite the same end date, so only the first candidate per program is applied;
  // the rest are annotated for the reviewer instead of being issued again.
  const rows = await database().all<{id: string}>(
    `SELECT DISTINCT ON (program_id) id
       FROM public.release_candidates
      WHERE applied = false AND match_status = 'MATCHED' AND confidence = 'high'
        AND program_id IS NOT NULL
      ORDER BY program_id, end_date, id`,
  );
  let applied = 0;
  const failed: Array<{id: string; error: string}> = [];
  for (const row of rows.results) {
    try {
      await applyCandidate(row.id, reviewedBy);
      applied += 1;
    } catch (error) {
      failed.push({id: row.id, error: error instanceof Error ? error.message : String(error)});
    }
  }
  const appliedIds = rows.results.map((r) => r.id);
  if (appliedIds.length) {
    await writePool().query(
      `UPDATE public.release_candidates
          SET notes = coalesce(notes || ' · ', '') || 'duplicate for a program already released by apply-all-high'
        WHERE applied = false AND match_status = 'MATCHED' AND confidence = 'high'
          AND program_id IS NOT NULL AND id <> ALL($1::bigint[])`,
      [appliedIds],
    );
  }
  return {applied, failed};
}
