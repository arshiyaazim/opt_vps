import {redirect} from 'next/navigation';
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
  {children,label,title,actions,pathname,access='user'}:
  {children:React.ReactNode;label:string;title?:string;actions?:React.ReactNode;pathname:string;access?:'user'|'admin'}
){
  const user=await requireChatGPTUser(pathname);
  const superAdmin=user.superAdmin===true;
  // Server-side role gate (RBAC-2). `access='admin'` covers the review and source
  // surfaces, which a USER must not reach even by typing the URL. The legacy
  // validation identity is the owner and is always admitted; /admin additionally
  // requires the configured super-admin id in its own page.
  const isAdmin=user.role==='ADMIN'||user.source==='validation'||superAdmin;
  if(access==='admin'&&!isAdmin)redirect('/dashboard');
  const shellUser:ShellUser={...user,admin:isAdmin,superAdmin};
  // Dark sidebar for every /platform/* route (Owner-approved global effect, Phase 5.2).
  return <AppShell user={shellUser} label={label} title={title} actions={actions} variant="dark">{children}</AppShell>;
}
