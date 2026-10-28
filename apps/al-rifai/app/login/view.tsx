'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

type Step = 'credentials' | 'password';

const messages: Record<string, string> = {
  CREDENTIALS_REQUIRED: 'Username and password are required.',
  INVALID_CREDENTIALS: 'Username or password is not correct.',
  ORIGIN_DENIED: 'This address is not allowed to sign in. Open the official workspace URL.',
  UNIFIED_AUTH_DISABLED: 'Unified sign-in is not enabled in this environment.',
  CURRENT_PASSWORD_INVALID: 'The current password is not correct.',
  PASSWORD_POLICY: 'The new password must be at least 12 characters.',
  PASSWORD_CONFIRMATION_MISMATCH: 'The new password and confirmation do not match.',
  PASSWORD_UNCHANGED: 'The new password must be different from the current one.',
  CSRF_DENIED: 'Security check failed. Reload the page and try again.',
  AUTHENTICATION_REQUIRED: 'The session has expired. Sign in again.',
  USERNAME_INVALID: 'Username must be 3-80 characters: letters, digits, dot, dash or underscore.',
  USERNAME_EXISTS: 'That username is already in use.',
  USERNAME_UNCHANGED: 'The new username is the same as the current one.',
};

function friendly(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error);
  return messages[code] || 'Sign-in could not be completed. Please try again.';
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data && data.error) || 'Request failed');
  return data as T;
}

export default function LoginView({next, mode, verifiedName}: {next: string; mode: 'off' | 'shadow' | 'on'; verifiedName?: string | null}) {
  const [step, setStep] = useState<Step>('credentials');
  const [login, setLogin] = useState({username: '', password: ''});
  const [change, setChange] = useState({currentPassword: '', newPassword: '', confirmPassword: ''});
  const [csrf, setCsrf] = useState('');
  const [target, setTarget] = useState(next);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Shadow mode: a verified credential is reported, never forwarded to a page
  // that the session cannot authorise yet.
  const [verified, setVerified] = useState<string | null>(verifiedName ?? null);

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await call<{user: {mustChangePassword: boolean; displayName: string}; csrf: string; redirect: string}>('login', {
        method: 'POST',
        body: JSON.stringify({...login, next}),
      });
      setCsrf(result.csrf);
      setTarget(result.redirect || next);
      setChange(value => ({...value, currentPassword: login.password}));
      setLogin(value => ({...value, password: ''}));
      if (result.user.mustChangePassword) {
        setStep('password');
        setNotice(`${result.user.displayName}, please set a new password before continuing.`);
        return;
      }
      if (mode === 'shadow') {
        setVerified(result.user.displayName || 'Signed in');
        setLogin({username: '', password: ''});
        return;
      }
      window.location.assign(result.redirect || next);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await call('password', {
        method: 'POST',
        headers: {'X-CSRF-Token': csrf},
        body: JSON.stringify(change),
      });
      window.location.assign(target || '/dashboard');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">AL-RIFA’I · Integrated Services</p>
        <h1 className="mt-1 text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          একই Cash Portal username ও password দিয়ে ঢুকুন — আলাদা কোনো password নেই।
        </p>

        {step === 'credentials' && verified ? (
          <div className="mt-5 flex flex-col gap-3">
            <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
              <span className="font-medium">Signed in — credential verified.</span>{' '}
              {verified === 'Signed in'
                ? 'Your existing Cash Portal username and password were accepted.'
                : `${verified}, your existing Cash Portal username and password were accepted.`}
            </p>
            <p className="text-sm text-muted-foreground">
              Workspace pages still require the existing private entry credential until
              unified sign-in is switched on. Your username, password and Cash sessions are unchanged.
            </p>
            <Button asChild>
              <a href="/dashboard">Open workspace</a>
            </Button>
            <Button type="button" variant="outline" onClick={() => { setVerified(null); setError(''); }}>
              Use a different account
            </Button>
          </div>
        ) : step === 'credentials' ? (
          <form className="mt-5 flex flex-col gap-3" onSubmit={submitCredentials}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                value={login.username}
                onChange={e => setLogin({...login, username: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={login.password}
                onChange={e => setLogin({...login, password: e.target.value})}
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</Button>
          </form>
        ) : (
          <form className="mt-5 flex flex-col gap-3" onSubmit={submitPassword}>
            <p className="text-sm text-muted-foreground">{notice}</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password (12+ characters)</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={change.newPassword}
                onChange={e => setChange({...change, newPassword: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={change.confirmPassword}
                onChange={e => setChange({...change, confirmPassword: e.target.value})}
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set password and continue'}</Button>
          </form>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          Sessions are server-side, HttpOnly and expire after 30 minutes idle.{' '}
          {mode === 'shadow' && 'Sign-in is in rehearsal mode: protected pages still require the existing private entry credential.'}
        </p>
      </section>
    </main>
  );
}
