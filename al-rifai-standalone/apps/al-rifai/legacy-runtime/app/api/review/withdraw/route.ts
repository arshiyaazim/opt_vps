import type {NextRequest} from 'next/server';
import {failure, json, readBody, requireWriteActor, workflowPool} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/review/withdraw — the submitter retracts their own pending item. */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireWriteActor(request);
    const body = await readBody(request);
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return json({error: 'ITEM_ID_REQUIRED'}, 400);

    const result = await workflowPool().query<{result: Record<string, unknown>}>(
      'SELECT public.workflow_withdraw($1,$2) AS result',
      [id, actor.id],
    );
    return json(result.rows[0]?.result ?? {ok: true});
  } catch (error) {
    return failure(error);
  }
}
