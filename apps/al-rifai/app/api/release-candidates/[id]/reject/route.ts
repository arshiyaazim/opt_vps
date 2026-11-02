import {NextRequest} from 'next/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {rejectCandidate, ApplyError} from '@/lib/release-apply';
import {assertCanCommandVessel, mapCommandError, VesselCommandError} from '@/lib/vessel-command-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff'},
});

/** POST /api/release-candidates/[id]/reject — discard a candidate. Never touches programs. */
export async function POST(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const user = await getChatGPTUser();
  try {
    assertCanCommandVessel(user);
  } catch (error) {
    return error instanceof VesselCommandError
      ? reply({error: error.code}, error.status)
      : reply({error: mapCommandError(error).code}, 500);
  }

  const {id} = await params;
  if (!/^\d+$/.test(id)) return reply({error: 'CANDIDATE_ID_INVALID'}, 400);

  try {
    await rejectCandidate(id, user?.userId ?? 'unknown');
    return reply({ok: true, id});
  } catch (error) {
    if (error instanceof ApplyError) return reply({error: error.message}, error.status);
    return reply({error: mapCommandError(error).code}, 409);
  }
}
