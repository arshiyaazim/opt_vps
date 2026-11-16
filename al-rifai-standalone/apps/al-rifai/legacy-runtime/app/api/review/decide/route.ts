import type {NextRequest} from 'next/server';
import {commandActorFromEnv} from '@/lib/vessel-command-policy';
import {programIdFor} from '@/lib/vessel-match';
import {failure, json, readBody, requireWriteActor, workflowPool} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/review/decide — approve, reject or request correction.
 *
 * workflow_decide() is the authority: it re-checks the actor's role, refuses a
 * reviewer who is also the submitter, and rejects a stale version. This route adds
 * only the two values the database cannot derive:
 *
 *  * the deterministic program id for an approved vessel program, computed with the
 *    same programIdFor() the direct admin command uses, so the two paths cannot
 *    create two different programs for one vessel pair;
 *  * the verified vessel actor ref from configuration, which the command functions
 *    require for their own audit trail.
 */
const DECISIONS: Record<string, string> = {APPROVE: 'APPROVED', REJECT: 'REJECTED', CORRECTION: 'CORRECTION_REQUESTED'};

export async function POST(request: NextRequest) {
  try {
    const actor = await requireWriteActor(request);
    const body = await readBody(request);
    const id = typeof body.id === 'string' ? body.id : '';
    const decision = DECISIONS[String(body.decision ?? '').toUpperCase()];
    const expectedVersion = Number(body.expectedVersion ?? 0);
    const note = typeof body.note === 'string' ? body.note : '';
    const edited = body.editedPayload && typeof body.editedPayload === 'object' ? body.editedPayload as Record<string, unknown> : null;

    if (!id) return json({error: 'ITEM_ID_REQUIRED'}, 400);
    if (!decision) return json({error: 'DECISION_INVALID'}, 400);

    const pool = workflowPool();
    const row = await pool.query<{domain: string; payload: Record<string, unknown>}>(
      'SELECT domain, payload FROM public.review_items WHERE id=$1',
      [id],
    );
    const item = row.rows[0];
    if (!item) return json({error: 'ITEM_NOT_FOUND'}, 404);

    const payload = edited ?? item.payload;
    let programId: string | null = null;
    let vesselActor: string | null = null;

    if (item.domain === 'VESSEL_PROGRAM' && decision === 'APPROVED') {
      programId = programIdFor({
        account: 'wa-01',
        clientChat: 'manual-command',
        mother: String(payload.motherVessel ?? ''),
        lighter: String(payload.lighterVessel ?? ''),
        startDate: String(payload.startDate ?? ''),
        shift: String(payload.shift ?? 'D'),
      });
      try {
        vesselActor = commandActorFromEnv(process.env as Record<string, string | undefined>).ref;
      } catch {
        return json({error: 'VESSEL_COMMAND_ACTOR_NOT_CONFIGURED'}, 503);
      }
    }

    const result = await pool.query<{result: Record<string, unknown>}>(
      'SELECT public.workflow_decide($1,$2,$3,$4,$5,$6::jsonb,$7,$8) AS result',
      [id, decision, actor.id, expectedVersion, note, edited ? JSON.stringify(edited) : null, vesselActor, programId],
    );
    return json(result.rows[0]?.result ?? {ok: true});
  } catch (error) {
    return failure(error);
  }
}
