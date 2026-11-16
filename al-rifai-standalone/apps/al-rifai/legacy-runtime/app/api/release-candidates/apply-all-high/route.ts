import {getChatGPTUser} from '@/app/chatgpt-auth';
import {applyAllHigh} from '@/lib/release-apply';
import {assertCanCommandVessel, mapCommandError, VesselCommandError} from '@/lib/vessel-command-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff'},
});

/**
 * POST /api/release-candidates/apply-all-high
 *
 * Applies every MATCHED candidate with confidence 'high'. Step D (medium) is
 * deliberately excluded — those are lump-sum settlements the admin must verify.
 */
export async function POST() {
  const user = await getChatGPTUser();
  try {
    assertCanCommandVessel(user);
  } catch (error) {
    return error instanceof VesselCommandError
      ? reply({error: error.code}, error.status)
      : reply({error: mapCommandError(error).code}, 500);
  }

  const result = await applyAllHigh(user?.userId ?? 'unknown');
  return reply({ok: true, ...result});
}
