import type {NextRequest} from 'next/server';
import {failure, json, normaliseDomain, readBody, requireWriteActor, workflowPool} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/review/submit — stage a user submission.
 *
 * The submitter is the session user; the body may not name one. workflow_submit()
 * re-resolves the role from cash_portal_users and enforces the capability, so this
 * route is a thin, honest wrapper.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireWriteActor(request);
    const body = await readBody(request);
    const domain = normaliseDomain(body.domain);
    const action = String(body.action ?? 'CREATE').toUpperCase();
    const targetRef = typeof body.targetRef === 'string' ? body.targetRef : null;
    const payload = body.payload;

    if (!domain || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({error: 'PAYLOAD_INVALID'}, 400);
    }

    const result = await workflowPool().query<{result: {id: string; status: string; deduped: boolean}}>(
      'SELECT public.workflow_submit($1,$2,$3,$4::jsonb,$5) AS result',
      [domain, action, targetRef, JSON.stringify(payload), actor.id],
    );
    return json({ok: true, ...result.rows[0]?.result}, 201);
  } catch (error) {
    return failure(error);
  }
}
