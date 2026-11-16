import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentIdentity, unifiedMode} from '@/lib/unified-auth';
import {sanitizeReturnTo, signedInRedirectTarget} from '@/lib/unified-auth-policy';
import LoginView from './view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Sign in · AL-RIFA’I', robots: {index: false, follow: false}};

/**
 * Unified sign-in surface.
 *
 * Uses the existing verified Cash Portal credential (public.cash_portal_users)
 * and the deployed session cookie. It never renames, resets or rotates any
 * account: the Owner's live username and password stay exactly as they are.
 *
 * A signed-in visitor is only forwarded automatically in `on` mode, where the
 * session really does authorise the workspace. In `shadow` the session proves
 * the credential but authorises nothing, so forwarding would loop
 * `/login → /dashboard → /login` (ERR_TOO_MANY_REDIRECTS, 2026-10-28). Instead
 * the page explains the verified state and keeps the workspace behind the
 * legacy guard.
 */
export default async function LoginPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const params = await searchParams;
  const raw = typeof params.next === 'string' ? params.next : '/dashboard';
  const next = sanitizeReturnTo(raw);
  const mode = unifiedMode();
  if (mode === 'off') redirect('/');
  const identity = await currentIdentity();
  const target = signedInRedirectTarget(mode, next);
  if (identity && target && !identity.mustChangePassword) redirect(target);
  // Shadow: report that the credential was verified, never navigate onwards.
  return <LoginView
    next={next}
    mode={mode}
    verifiedName={mode === 'shadow' ? identity?.displayName ?? null : null}
    forcePasswordChange={mode === 'on' && identity?.mustChangePassword === true}
  />;
}
