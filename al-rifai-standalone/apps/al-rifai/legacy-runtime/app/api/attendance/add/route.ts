import type {NextRequest} from 'next/server';
import {failure, json, readBody, requireWriteActor, workflowPool} from '@/lib/review-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/attendance/add
 *
 * An ADMIN writes the entry directly (attendance_create_direct), because the review
 * function refuses a reviewer who is also the submitter. A USER stages it through
 * workflow_submit and an admin decides later — same payload, different door.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireWriteActor(request);
    const body = await readBody(request);
    const payload = {
      employee_mobile: String(body.employee_mobile ?? '').trim(),
      attendance_date: String(body.attendance_date ?? '').trim(),
      shift: String(body.shift ?? '').trim().toUpperCase() || null,
      hours: body.hours === undefined || body.hours === null || body.hours === '' ? null : Number(body.hours),
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : null,
    };
    if (!payload.employee_mobile || !payload.attendance_date) return json({error: 'EMPLOYEE_AND_DATE_REQUIRED'}, 400);

    const pool = workflowPool();
    if (actor.admin) {
      const result = await pool.query<{result: string}>(
        'SELECT public.attendance_create_direct($1::jsonb,$2) AS result',
        [JSON.stringify(payload), actor.id],
      );
      return json({ok: true, mode: 'direct', id: result.rows[0]?.result}, 201);
    }

    const result = await pool.query<{result: {id: string; status: string; deduped: boolean}}>(
      "SELECT public.workflow_submit('ATTENDANCE','CREATE',NULL,$1::jsonb,$2) AS result",
      [JSON.stringify(payload), actor.id],
    );
    return json({ok: true, mode: 'review', ...result.rows[0]?.result}, 201);
  } catch (error) {
    return failure(error);
  }
}
