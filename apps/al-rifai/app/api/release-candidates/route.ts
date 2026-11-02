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
  const push = (clause: (i: number) => string, value: unknown) => {
    args.push(value);
    where.push(clause(args.length));
  };

  if (q.get('match_status')) push((i) => `match_status = $${i}`, q.get('match_status'));
  if (q.get('confidence')) push((i) => `confidence = $${i}`, q.get('confidence'));
  if (q.get('escort_phone')) push((i) => `escort_phone = $${i}`, q.get('escort_phone'));
  if (q.get('mismatch_kind')) push((i) => `mismatch_kind = $${i}`, q.get('mismatch_kind'));
  if (q.get('applied') !== null) push((i) => `applied = $${i}`, q.get('applied') === 'true');
  if (q.get('from')) push((i) => `end_date >= $${i}::date`, q.get('from'));
  if (q.get('to')) push((i) => `end_date <= $${i}::date`, q.get('to'));

  const limit = Math.max(1, Math.min(500, Number(q.get('limit') ?? 100)));
  const offset = Math.max(0, Number(q.get('offset') ?? 0));
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const rows = await database().all<Row>(
      `SELECT id, escort_phone, escort_name, program_id, end_date::text AS end_date, end_shift,
              amount_bdt, duty_days, calc_start::text AS calc_start, conveyance,
              match_status, match_pass, mismatch_kind, confidence, notes,
              source_msg_id, source_date, applied, reviewed_by, reviewed_at
         FROM public.release_candidates
         ${clause}
         ORDER BY end_date DESC, id
         LIMIT ${limit} OFFSET ${offset}`,
      args,
    );
    const total = await database().first<{n: string}>(
      `SELECT count(*)::text AS n FROM public.release_candidates ${clause}`, args,
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
