import {database} from "@/db/raw";
import {rosterSource} from "@/lib/conversation-scope";
export const dynamic="force-dynamic";

type ShadowRow = {
  mode: string;
  cycles_completed: number;
  diffs_found: number;
  started_at: Date | string;
  auto_promote_at: Date | string;
  auto_promote_blocked: boolean;
};

export async function GET(){
  try{
    await database().first("SELECT 1 AS ready");

    // Report the CONFIGURED source, always truthfully. Reporting a stale or
    // inferred value here is how a fail-closed ingestion outage stays invisible.
    let source="STATIC";
    let configError:string|null=null;
    try{ source=rosterSource(); }
    catch(error){ source="UNKNOWN"; configError=error instanceof Error?error.message:String(error); }

    const response:Record<string,unknown>={status:"ok",roster_mode:source};
    if(configError) response.roster_error=configError;

    let row:ShadowRow|null=null;
    let stateError:string|null=null;
    try{
      row=await database().first<ShadowRow>(
        `SELECT mode,cycles_completed,diffs_found,started_at,auto_promote_at,auto_promote_blocked
         FROM public.roster_shadow_state WHERE singleton = TRUE`,
      );
    }catch(error){
      stateError=error instanceof Error?error.message:String(error);
    }

    if(stateError && source==="SHADOW"){
      // The worker fails closed in this situation, so the outage must be visible.
      response.roster_error=`roster_shadow_state unreadable: ${stateError}`;
    }
    response.roster_shadow=row
      ?{
        mode:row.mode,
        cycles_completed:row.cycles_completed,
        diffs_found:row.diffs_found,
        started_at:row.started_at,
        auto_promote_at:row.auto_promote_at,
        auto_promote_blocked:row.auto_promote_blocked,
      }
      :null;

    return Response.json(response,{headers:{"Cache-Control":"no-store"}});
  }catch{
    return Response.json({status:"unavailable"},{status:503});
  }
}
