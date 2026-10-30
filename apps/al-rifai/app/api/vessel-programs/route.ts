import {NextRequest} from 'next/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
import {createPool} from '@/db/postgres.mjs';
import {programIdFor} from '@/lib/vessel-match';
import {parseCommand} from '@/lib/vessel-commands';
import {
  assertCanCommandVessel, assertCanReadVessel, commandActorFromEnv, mapCommandError, MIGRATION_DEPENDENCY, VesselCommandError,
} from '@/lib/vessel-command-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;
const reply = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'},
});

const COMMAND_FUNCTION = 'public.alrifai_vessel_program_update(text,jsonb,text,integer,text,text)';
let writer: ReturnType<typeof createPool> | null = null;
function commandWriter() {
  if (!writer) writer = createPool({readOnly: false, user: 'ir_review_runtime'});
  return writer;
}

function errorReply(error: unknown) {
  if (error instanceof VesselCommandError) return reply({error: error.code, available: error.code !== MIGRATION_DEPENDENCY ? undefined : false}, error.status);
  const mapped = mapCommandError(error);
  return reply({error: mapped.code, available: mapped.code === MIGRATION_DEPENDENCY ? false : undefined}, mapped.status);
}

async function availability() {
  const result = await database().all<{available: boolean}>('SELECT to_regprocedure($1) IS NOT NULL AS available', [COMMAND_FUNCTION]);
  return !!result.results[0]?.available;
}

export async function GET(request: NextRequest) {
  const user = await getChatGPTUser();
  try {
    assertCanReadVessel(user);
  } catch (error) {
    return errorReply(error);
  }
  const params = request.nextUrl.searchParams;
  const available = await availability();
  const id = params.get('programId');
  const messageId = params.get('messageId');

  if (messageId) {
    if (!/^[A-Za-z0-9_.:@-]{1,200}$/.test(messageId)) return reply({error: 'MESSAGE_ID_INVALID'}, 400);
    const row = await database().all<Row>(
      `SELECT message_id, chat_jid, direction, sender_jid, sender_phone, "timestamp" AS source_time, text_content
       FROM public.whatsapp_messages_original
       WHERE wa_account='wa-01' AND message_id=$1 ORDER BY "timestamp" DESC LIMIT 1`, [messageId]);
    return reply({available, source: row.results[0] ?? null});
  }

  if (!id) return reply({available, programs: null});
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(id)) return reply({error: 'PROGRAM_ID_INVALID'}, 400);
  const program = await database().first<Row>(
    `SELECT id, "motherVessel" AS "motherVessel", "lighterVessel" AS "lighterVessel",
            "masterMobile" AS "masterMobile", destination, "escortName" AS "escortName",
            "escortMobile" AS "escortMobile", "startDate" AS "startDate", "endDate" AS "endDate",
            shift, status, source, notes, revision, details, dataset_epoch
     FROM public.programs WHERE id=$1`, [id]);
  if (!program) return reply({error: 'PROGRAM_NOT_FOUND'}, 404);
  let details: Row = {};
  try {
    details = typeof program.details === 'string' ? JSON.parse(String(program.details)) as Row : (program.details as Row ?? {});
  } catch { details = {}; }
  return reply({available, program: {...program, details}, history: details.programCommand ?? null});
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  try {
    assertCanCommandVessel(user);
  } catch (error) {
    return errorReply(error);
  }
  let actor;
  try {
    actor = commandActorFromEnv(process.env as Record<string, string | undefined>).ref;
  } catch (error) {
    return errorReply(error);
  }
  let command;
  try {
    command = parseCommand(await request.json().catch(() => ({})));
  } catch (error) {
    const details = (error as {details?: unknown}).details;
    return reply({error: error instanceof Error ? error.message : 'COMMAND_INVALID', details}, 400);
  }
  try {
    const pool = commandWriter();
    switch (command.action) {
      case 'add': {
        const programId = programIdFor({
          account: 'wa-01', clientChat: 'manual-command',
          mother: command.motherVessel, lighter: command.lighterVessel,
          startDate: command.startDate, shift: command.shift,
        });
        const result = await pool.query<{result: Row}>(
          'SELECT public.alrifai_vessel_program_add($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) AS result',
          [programId, command.motherVessel, command.lighterVessel, command.masterMobile ?? '',
            command.destination ?? '', command.escortName ?? '', command.escortMobile ?? '',
            command.startDate, command.shift, actor, command.commandKey, command.note ?? '']);
        return reply({ok: true, programId, ...result.rows[0]?.result}, 201);
      }
      case 'edit': {
        const result = await pool.query<{result: Row}>(
          'SELECT public.alrifai_vessel_program_update($1,$2::jsonb,$3,$4,$5,$6) AS result',
          [command.programId, JSON.stringify(command.patch), actor, command.expectedRevision, command.commandKey, command.note ?? '']);
        return reply({ok: true, programId: command.programId, ...result.rows[0]?.result});
      }
      case 'release': {
        const result = await pool.query<{result: Row}>(
          'SELECT public.alrifai_vessel_program_release($1,$2,$3,$4,$5,$6,$7,$8::jsonb) AS result',
          [command.programId, command.endDate, command.endShift, command.releasePoint, actor,
            command.expectedRevision, command.commandKey, JSON.stringify(command.evidence ?? {})]);
        return reply({ok: true, programId: command.programId, ...result.rows[0]?.result});
      }
      case 'assign': {
        const result = await pool.query<{result: Row}>(
          'SELECT public.alrifai_vessel_program_assign($1,$2,$3,$4,$5,$6,$7,$8,$9) AS result',
          [command.programId, command.employeeMobile, command.startDate, command.startShift, actor,
            command.expectedRevision, command.commandKey, command.replace ?? false, command.note ?? '']);
        return reply({ok: true, programId: command.programId, ...result.rows[0]?.result});
      }
      case 'void': {
        const result = await pool.query<{result: Row}>(
          'SELECT public.alrifai_vessel_program_void($1,$2,$3,$4,$5) AS result',
          [command.programId, actor, command.reason, command.expectedRevision, command.commandKey]);
        return reply({ok: true, programId: command.programId, ...result.rows[0]?.result});
      }
      default:
        return reply({error: 'COMMAND_INVALID'}, 400);
    }
  } catch (error) {
    return errorReply(error);
  }
}
