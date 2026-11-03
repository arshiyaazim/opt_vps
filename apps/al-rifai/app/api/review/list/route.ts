import type {NextRequest} from 'next/server';
import {database} from '@/db/raw';
import {failure, json, readActor} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/review/list?domain=&status=&mine=1
 *
 * An admin sees every submission; a USER sees only their own — the filter is applied
 * in SQL from the session identity, never from the query string, so `submittedBy` is
 * not a parameter a browser can widen.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await readActor();
    if (!actor) return json({error: 'AUTHENTICATION_REQUIRED'}, 401);

    const params = new URL(request.url).searchParams;
    const domain = String(params.get('domain') ?? '').trim().toUpperCase();
    const status = String(params.get('status') ?? 'PENDING').trim().toUpperCase();
    const mineOnly = params.get('mine') === '1' || !actor.admin;

    const result = await database().all<{
      id: string;
      domain: string;
      action: string;
      target_ref: string | null;
      payload: Record<string, unknown>;
      status: string;
      submitted_by_user_ref: string;
      submitted_by_role: string;
      submitted_by_name: string | null;
      decision_note: string;
      decided_by: string | null;
      decided_at: string | null;
      applied_ref: string | null;
      version: number;
      created_at: string;
    }>(
      `SELECT i.id, i.domain, i.action, i.target_ref, i.payload, i.status,
              i.submitted_by_user_ref, i.submitted_by_role,
              u.display_name AS submitted_by_name,
              i.decision_note, i.decided_by, i.decided_at::text, i.applied_ref, i.version, i.created_at::text
         FROM public.review_items i
         LEFT JOIN public.cash_portal_users u ON u.id = i.submitted_by_user_ref
        WHERE ($1 = '' OR i.domain = $1)
          AND ($2 = 'ALL' OR i.status = $2)
          AND (NOT $3 OR i.submitted_by_user_ref = $4)
        ORDER BY i.created_at DESC
        LIMIT 200`,
      [domain, status, mineOnly, actor.id],
    );

    return json({items: result.results, viewer: {id: actor.id, role: actor.role, admin: actor.admin}});
  } catch (error) {
    return failure(error);
  }
}
