import {database} from "@/db/raw";
import {getRosterShadowState} from "@/lib/conversation-scope";
export const dynamic="force-dynamic";
export async function GET(){try{await database().first("SELECT 1 AS ready");
  const roster = getRosterShadowState();
  const res: Record<string, unknown> = {status:"ok"};
  if (roster.mode !== 'STATIC') {
    res.roster_mode = roster.mode === 'DB' && roster.startedAt ? 'DB (auto-promoted)' : roster.mode;
    if (roster.mode === 'SHADOW') {
      res.roster_shadow = {
        cycles_completed: roster.cyclesCompleted,
        diffs_found: roster.diffsFound,
        started_at: roster.startedAt,
        auto_promote_at: roster.autoPromoteAt,
        auto_promote_blocked: roster.autoPromoteBlocked,
      };
    }
  }
  return Response.json(res,{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({status:"unavailable"},{status:503});}}
