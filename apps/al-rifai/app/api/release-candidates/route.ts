import {NextRequest} from 'next/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
import {assertCanReadVessel, mapCommandError, VesselCommandError} from '@/lib/vessel-command-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff'},
});

type Row = Record<string, unknown>;

/**
 * GET /api/release-candidates — review queue.
 *
 * Filters: match_status, applied (true/false), confidence, escort_phone,
 * from/to (end_date range), limit, offset. Read-only.
 */
export async function GET(request: NextRequest) {
  const user = await getChatGPTUser();
  try {
    assertCanReadVessel(user);
  } catch (error) {
    return error instanceof VesselCommandError
      ? reply({error: error.code}, error.status)
      : reply({error: mapCommandError(error).code}, 500);
  }

  const q = request.nextUrl.searchParams;
  const where: string[] = [];
  const args: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    args.push(value);
    where.push(sql.replace('?', `$${args.length}`));
  };

  if (q.get('match_status')) push('rc.match_status = ?', q.get('match_status'));
  if (q.get('confidence')) push('rc.confidence = ?', q.get('confidence'));
  if (q.get('escort_phone')) push('rc.escort_phone = ?', q.get('escort_phone'));
  if (q.get('mismatch_kind')) push('rc.mismatch_kind = ?', q.get('mismatch_kind'));
  if (q.get('applied') !== null) push('rc.applied = ?', q.get('applied') === 'true');
  if (q.get('from')) push('rc.end_date >= ?::date', q.get('from'));
  if (q.get('to')) push('rc.end_date <= ?::date', q.get('to'));

  const limit = Math.max(1, Math.min(500, Number(q.get('limit') ?? 100)));
  const offset = Math.max(0, Number(q.get('offset') ?? 0));
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const rows = await database().all<Row>(
      `SELECT rc.id, rc.escort_phone, rc.escort_name, rc.program_id,
              rc.end_date::text AS end_date, rc.end_shift,
              rc.amount_bdt, rc.duty_days, rc.calc_start::text AS calc_start, rc.conveyance,
              rc.match_status, rc.match_pass, rc.mismatch_kind, rc.confidence, rc.notes,
              rc.source_msg_id, rc.source_date, rc.source_text, rc.applied, rc.reviewed_by, rc.reviewed_at,
              p."startDate" AS program_start, p."motherVessel" AS mother_vessel,
              p."lighterVessel" AS lighter_vessel
         FROM public.release_candidates rc
         LEFT JOIN public.programs p ON p.id = rc.program_id
         ${clause}
         ORDER BY rc.end_date DESC, rc.id
         LIMIT ${limit} OFFSET ${offset}`,
      args,
    );
    const total = await database().first<{n: string}>(
      `SELECT count(*)::text AS n FROM public.release_candidates rc ${clause}`, args,
    );
    const summary = await database().all<Row>(
      `SELECT match_status, coalesce(confidence,'-') AS confidence, count(*)::int AS count
         FROM public.release_candidates GROUP BY 1,2 ORDER BY 1,2`,
    );
    return reply({
      rows: rows.results,
      total: Number(total?.n ?? 0),
      limit,
      offset,
      summary: summary.results,
    });
  } catch (error) {
    return reply({error: 'RELEASE_CANDIDATES_UNAVAILABLE', detail: mapCommandError(error).code}, 503);
  }
}
