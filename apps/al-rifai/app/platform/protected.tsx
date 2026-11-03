import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {AppShell,type ShellUser} from '@/app/platform/app-shell';

/**
 * Server-side guard + shell for the unified platform routes.
 *
 * Identity comes from the legacy validation credential or from a validated Cash
 * session (when ALRIFAI_UNIFIED_AUTH_MODE allows it). The `admin` flag is
 * presentation-only and is now derived from the verified Super Admin identity
 * rather than the technical validator user id; every write remains behind the
 * server-side services and their own policy guards.
 */
export async function PlatformPage(
  {children,label,title,actions,pathname}:
  {children:React.ReactNode;label:string;title?:string;actions?:React.ReactNode;pathname:string}
){
  const user=await requireChatGPTUser(pathname);
  const superAdmin=user.superAdmin===true;
  const shellUser:ShellUser={...user,admin:superAdmin||user.source==='validation',superAdmin};
  // Dark sidebar for every /platform/* route (Owner-approved global effect, Phase 5.2).
  return <AppShell user={shellUser} label={label} title={title} actions={actions} variant="dark">{children}</AppShell>;
}
