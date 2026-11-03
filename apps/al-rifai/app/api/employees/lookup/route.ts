import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';

export const dynamic = 'force-dynamic';

/**
 * Employee lookup for the shared EmployeeLookup component (RBAC-2 step 8).
 *
 * Read-only, ten rows, matches on mobile, preferred name or any alias. Two things are
 * deliberate:
 *
 *  * Scope is fixed server-side to wa-01 and to identities the caller may see. An
 *    ADMIN sees REVIEW rows too (they are staged for exactly that reason); a USER
 *    sees CONFIRMED only, so a pending submission cannot leak an employee who does
 *    not exist yet.
 *  * `q` is trimmed, length-capped and used only as a LIKE pattern parameter. It is
 *    never interpolated, and an empty query returns an empty list rather than the
 *    first ten employees.
 */
const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff'},
});

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({error: 'AUTHENTICATION_REQUIRED'}, 401);

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return reply({employees: []});

  // The legacy validation identity is the owner and sees everything, like an ADMIN.
  const admin = user.role === 'ADMIN' || user.userId === 'local-validator' || user.superAdmin === true;
  const pattern = `%${q}%`;

  try {
    const rows = await database().all<{
      mobile: string; name: string; designation: string | null; state: string; duty_type: string | null;
    }>(
      `SELECT employee_mobile AS mobile,
              preferred_name  AS name,
              designation,
              state,
              duty_type
         FROM public.employee_master
        WHERE scope_account = 'wa-01'
          AND ($2 OR state = 'CONFIRMED')
          AND (employee_mobile ILIKE $1
               OR preferred_name ILIKE $1
               OR EXISTS (SELECT 1 FROM unnest(name_aliases) AS alias WHERE alias ILIKE $1))
        ORDER BY (employee_mobile = $3) DESC, preferred_name ASC
        LIMIT 10`,
      [pattern, admin, q.startsWith('0') || q.startsWith('+') ? q : ''],
    );
    return reply({employees: rows.results});
  } catch {
    // Never surface a database message to a client; the page shows a neutral failure.
    return reply({error: 'LOOKUP_UNAVAILABLE'}, 503);
  }
}
