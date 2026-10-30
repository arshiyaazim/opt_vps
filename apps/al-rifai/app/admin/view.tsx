'use client';
import {useCallback,useEffect,useState} from 'react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/app/platform/ui';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';

type Role = 'ADMIN' | 'USER';

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  mobile: string | null;
  whatsappNumber: string | null;
  role: Role;
  capabilities: string[];
  superAdmin: boolean;
  mustChangePassword: boolean;
};

type ManagedUser = {
  id: string;
  username: string;
  role: Role;
  displayName: string;
  email: string | null;
  mobile: string | null;
  whatsappNumber: string | null;
  mustChangePassword: boolean;
  active: boolean;
  lastSeenAt: string | null;
  capabilities?: string[] | null;
};

type AuditRow = {
  id: string;
  action: string;
  actor_username: string | null;
  target_username: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type SignupRequest = {
  id: string;
  displayName: string;
  email: string;
  requestedAt: string;
  decision: 'APPROVED' | 'REJECTED' | null;
  decisionNote: string | null;
  decidedByUsername: string | null;
  decidedAt: string | null;
};

const SIGNUP_REQUEST_PAGE_SIZE = 100;

/** Assignable capabilities. `workspace.admin` is config-bound and never listed. */
const GRANTABLE = ['cash.read', 'cash.submit', 'cash.review', 'vessel.read', 'vessel.command', 'audit.read'] as const;

const messages: Record<string, string> = {
  SUPER_ADMIN_REQUIRED: 'Only the configured Super Admin can do this.',
  LAST_ADMIN_PROTECTED: 'The final active administrator cannot be removed.',
  LAST_SUPER_ADMIN_PROTECTED: 'The configured Super Admin cannot be demoted or deactivated.',
  CAPABILITY_NOT_GRANTABLE: 'That permission is bound to the configured Super Admin identity.',
  CAPABILITY_ROLE_CONFLICT: 'That permission requires an administrative role.',
  CAPABILITIES_INVALID: 'The permission list is not valid.',
  CAPABILITIES_MIGRATION_REQUIRED: 'Permission storage is not migrated yet. The prepared migration 0033 must be approved and applied first.',
  AUDIT_READ_MIGRATION_REQUIRED: 'Audit history reads need migration 0033 (read grant) to be applied.',
  SIGNUP_SCHEMA_REQUIRED: 'Signup requests are unavailable until the prepared migration 0034 is approved and applied.',
  SIGNUP_PERMISSION_REQUIRED: 'The application database role cannot access signup requests; this needs a reviewed permission change.',
  SIGNUP_ALREADY_DECIDED: 'This request already has a decision.',
  SIGNUP_REQUEST_NOT_FOUND: 'That signup request could not be found.',
  SIGNUP_DECISION_INVALID: 'Choose a valid decision and try again.',
  USERNAME_TAKEN: 'That username is already in use.',
  USERNAME_EXISTS: 'That username is already in use.',
  USERNAME_INVALID: 'Username must be 3-80 characters: letters, digits, dot, dash or underscore.',
  USERNAME_UNCHANGED: 'The new username is the same as the current one.',
  CURRENT_PASSWORD_INVALID: 'The current password is not correct.',
  PASSWORD_POLICY: 'The new password must be at least 12 characters.',
  PASSWORD_CONFIRMATION_MISMATCH: 'The new password and confirmation do not match.',
  PASSWORD_UNCHANGED: 'The new password must be different from the current one.',
  USER_FIELDS_INVALID: 'The new account is incomplete or invalid.',
  ORIGIN_DENIED: 'This address is not allowed to submit this action.',
  CSRF_DENIED: 'Security check failed. Reload the page and try again.',
  AUTHENTICATION_REQUIRED: 'The session has expired. Sign in again.',
  SESSION_EXPIRED: 'The session has expired. Sign in again.',
  ADMIN_REQUIRED: 'Administrative role required.',
};

function friendly(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error);
  return messages[code] || 'The action could not be completed.';
}

function when(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short'});
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data && data.error) || 'Request failed');
  return data as T;
}

export default function AdminView() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [csrf, setCsrf] = useState('');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [signupTotal, setSignupTotal] = useState(0);
  const [signupOffset, setSignupOffset] = useState(0);
  const [signupState, setSignupState] = useState('');
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditState, setAuditState] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({displayName: '', email: '', mobile: '', whatsappNumber: ''});
  const [rename, setRename] = useState({username: '', currentPassword: ''});
  const [selfPassword, setSelfPassword] = useState({currentPassword: '', newPassword: '', confirmPassword: ''});
  const [created, setCreated] = useState({username: '', displayName: '', email: '', password: '', role: 'USER' as Role});
  const [reset, setReset] = useState<{id: string; password: string} | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await call<{user: SessionUser; csrf: string}>('/api/auth/session');
      setSession(me.user);
      setCsrf(me.csrf);
      setProfile({
        displayName: me.user.displayName,
        email: me.user.email || '',
        mobile: me.user.mobile || '',
        whatsappNumber: me.user.whatsappNumber || '',
      });
      const list = await call<{users: ManagedUser[]}>('/api/cash/users');
      setUsers(list.users);
      try {
        const requests = await call<{rows: SignupRequest[]; total: number}>(
          `/api/cash/signup-requests?limit=${SIGNUP_REQUEST_PAGE_SIZE}&offset=${signupOffset}`,
        );
        setSignupRequests(requests.rows);
        setSignupTotal(requests.total);
        setSignupState('');
      } catch (e) {
        setSignupRequests([]);
        setSignupTotal(0);
        setSignupState(friendly(e));
      }
      try {
        const history = await call<{rows: AuditRow[]}>('/api/cash/audit?limit=100');
        setAudit(history.rows);
        setAuditState('');
      } catch (e) {
        setAudit([]);
        setAuditState(friendly(e));
      }
    } catch (e) {
      setError(friendly(e));
    }
  }, [signupOffset]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(path: string, method: string, body: unknown, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await call(path, {method, headers: {'X-CSRF-Token': csrf}, body: JSON.stringify(body)});
      setNotice(success);
      await load();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleCapability(user: ManagedUser, capability: string, on: boolean) {
    const current = new Set(user.capabilities ?? []);
    if (on) current.add(capability);
    else current.delete(capability);
    void mutate(
      `/api/cash/users/${user.id}`,
      'PATCH',
      {capabilities: [...current]},
      `Permissions updated for ${user.username}.`,
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Loading your verified identity…</CardDescription>
        </CardHeader>
        <CardContent>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent>
      </Card>
    );
  }

  return (
    <div className="wx-page">
      <PageHeader
        eyebrow="Administration"
        title="Admin panel"
        description="Accounts, roles and permissions for the private workspace. Every change is enforced server-side and recorded in the Cash audit trail."
      />
      {error && <p role="alert" className="rounded border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded border bg-muted p-2 text-sm">{notice}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Signup Requests</CardTitle>
          <CardDescription>Requests do not create accounts. Approval records a decision; account creation remains a separate, explicit Admin action.</CardDescription>
        </CardHeader>
        <CardContent>
          {signupState && <p role="status" className="mb-3 text-sm text-muted-foreground">{signupState}</p>}
          {!signupState && (
            <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Showing {signupTotal ? signupOffset + 1 : 0}–{Math.min(signupOffset + signupRequests.length, signupTotal)} of {signupTotal}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy || signupOffset === 0} onClick={() => setSignupOffset(offset => Math.max(0, offset - SIGNUP_REQUEST_PAGE_SIZE))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={busy || signupOffset + SIGNUP_REQUEST_PAGE_SIZE >= signupTotal} onClick={() => setSignupOffset(offset => offset + SIGNUP_REQUEST_PAGE_SIZE)}>Next</Button>
              </div>
            </div>
            <div className="wx-table-wrap stackable">
              <table className="wx-table stackable">
                <thead>
                  <tr><th>Applicant</th><th>Email</th><th>Requested</th><th>Status</th><th>Decision</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {signupRequests.map(request => (
                    <tr key={request.id}>
                      <td data-label="Applicant" className="strong">{request.displayName}</td>
                      <td data-label="Email">{request.email}</td>
                      <td data-label="Requested" className="muted">{when(request.requestedAt)}</td>
                      <td data-label="Status">{request.decision ?? 'PENDING'}</td>
                      <td data-label="Decision" className="muted">
                        {request.decision ? `${request.decision.toLowerCase()} by ${request.decidedByUsername || 'Admin'} · ${when(request.decidedAt)}` : '—'}
                      </td>
                      <td data-label="Action">
                        {request.decision === null ? (
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" disabled={busy} onClick={() => void mutate(
                              `/api/cash/signup-requests/${request.id}/decision`,
                              'POST',
                              {decision: 'APPROVED', note: ''},
                              `Signup request for ${request.displayName} approved. Create the account separately below.`,
                            )}>Approve</Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(
                              `/api/cash/signup-requests/${request.id}/decision`,
                              'POST',
                              {decision: 'REJECTED', note: ''},
                              `Signup request for ${request.displayName} rejected.`,
                            )}>Reject</Button>
                          </div>
                        ) : request.decision === 'APPROVED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCreated(value => ({...value, displayName: request.displayName, email: request.email, role: 'USER'}));
                              setNotice(`Account setup is ready for ${request.displayName}; choose a username and temporary password.`);
                              document.getElementById('create-account')?.scrollIntoView({behavior: 'smooth', block: 'center'});
                            }}
                          >Prepare account</Button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {!signupRequests.length && <tr><td colSpan={6} className="text-sm text-muted-foreground">No signup requests.</td></tr>}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signed-in identity</CardTitle>
          <CardDescription>
            {session.displayName} · {session.username} · role {session.role}
            {session.superAdmin && ' · configured Super Admin'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          {session.capabilities.map(capability => <Badge key={capability} variant="secondary">{capability}</Badge>)}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Contact details only. Username and password are never changed automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                void mutate('/api/cash/profile', 'PATCH', profile, 'Profile saved.');
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label>Username</Label>
                <Input value={session.username} disabled readOnly />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input id="displayName" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" value={profile.mobile} onChange={e => setProfile({...profile, mobile: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input id="whatsapp" value={profile.whatsappNumber} onChange={e => setProfile({...profile, whatsappNumber: e.target.value})} />
              </div>
              <Button type="submit" disabled={busy}>Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change username</CardTitle>
            <CardDescription>
              Voluntary only. Your current username stays valid until you submit this form with your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                void mutate('/api/auth/username', 'POST', rename, 'Username changed.').then(() => setRename({username: '', currentPassword: ''}));
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newUsername">New username</Label>
                <Input id="newUsername" value={rename.username} onChange={e => setRename({...rename, username: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="renamePassword">Current password</Label>
                <Input id="renamePassword" type="password" autoComplete="current-password" value={rename.currentPassword} onChange={e => setRename({...rename, currentPassword: e.target.value})} required />
              </div>
              <Button type="submit" variant="outline" disabled={busy}>Change username</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Voluntary only. Nothing rotates your credential unless you submit this form.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                void mutate('/api/auth/password', 'POST', selfPassword, 'Password changed. Other signed-in devices have been signed out.').then(() =>
                  setSelfPassword({currentPassword: '', newPassword: '', confirmPassword: ''}),
                );
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" type="password" autoComplete="current-password" value={selfPassword.currentPassword} onChange={e => setSelfPassword({...selfPassword, currentPassword: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">New password (12+ characters)</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" minLength={12} value={selfPassword.newPassword} onChange={e => setSelfPassword({...selfPassword, newPassword: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" minLength={12} value={selfPassword.confirmPassword} onChange={e => setSelfPassword({...selfPassword, confirmPassword: e.target.value})} required />
              </div>
              <Button type="submit" variant="outline" disabled={busy}>Change password</Button>
            </form>
          </CardContent>
        </Card>

        <Card id="create-account">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>New accounts must change their password at first sign-in.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                void mutate('/api/cash/users', 'POST', created, `Account ${created.username} created.`).then(() =>
                  setCreated({username: '', displayName: '', email: '', password: '', role: 'USER'}),
                );
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAccountUsername">Username</Label>
                <Input id="newAccountUsername" value={created.username} onChange={e => setCreated({...created, username: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAccountName">Display name</Label>
                <Input id="newAccountName" value={created.displayName} onChange={e => setCreated({...created, displayName: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAccountEmail">Email (optional)</Label>
                <Input id="newAccountEmail" type="email" value={created.email} onChange={e => setCreated({...created, email: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAccountPassword">Temporary password (12+ characters)</Label>
                <Input id="newAccountPassword" type="password" minLength={12} value={created.password} onChange={e => setCreated({...created, password: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAccountRole">Role</Label>
                <select id="newAccountRole" className="h-9 rounded-md border bg-background px-2 text-sm" value={created.role} onChange={e => setCreated({...created, role: e.target.value as Role})}>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={busy}>Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts and permissions</CardTitle>
          <CardDescription>
            Role and access changes are enforced server-side. The configured Super Admin cannot be demoted or disabled here,
            and the last active administrator is always preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="wx-table-wrap stackable">
          <table className="wx-table stackable">
            <thead>
              <tr>
                <th>Account</th><th>Role</th><th>Access</th><th>Permissions</th><th>Last seen</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td data-label="Account">
                    <div className="strong">{user.username}</div>
                    <div className="muted">{user.displayName}</div>
                  </td>
                  <td data-label="Role">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={user.role}
                      disabled={busy}
                      onChange={e => void mutate(`/api/cash/users/${user.id}`, 'PATCH', {role: e.target.value}, `Role updated for ${user.username}.`)}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td data-label="Access">
                    <Badge variant={user.active ? 'secondary' : 'destructive'}>{user.active ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td data-label="Permissions">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {GRANTABLE.map(capability => (
                        <label key={capability} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={(user.capabilities ?? []).includes(capability)}
                            disabled={busy || user.role !== 'ADMIN' && capability === 'cash.review'}
                            onCheckedChange={checked => toggleCapability(user, capability, checked === true)}
                          />
                          {capability}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td data-label="Last seen" className="muted">{when(user.lastSeenAt)}</td>
                  <td data-label="Action">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void mutate(`/api/cash/users/${user.id}`, 'PATCH', {active: !user.active}, `${user.username} ${user.active ? 'disabled' : 'enabled'}.`)}
                      >
                        {user.active ? 'Disable access' : 'Enable access'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setReset({id: user.id, password: ''})}>
                        Reset password
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {reset && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={e => {
                e.preventDefault();
                void mutate(`/api/cash/users/${reset.id}/password`, 'POST', {newPassword: reset.password}, 'Password reset. The account must change it at next sign-in.').then(() => setReset(null));
              }}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="resetPassword">Temporary password for the selected account (12+ characters)</Label>
                <Input id="resetPassword" type="password" minLength={12} value={reset.password} onChange={e => setReset({id: reset.id, password: e.target.value})} required />
              </div>
              <Button type="submit" disabled={busy}>Reset</Button>
              <Button type="button" variant="ghost" onClick={() => setReset(null)}>Cancel</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit history</CardTitle>
          <CardDescription>Newest 100 identity, permission and credential events. Read-only.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {auditState && <p className="mb-2 text-sm text-muted-foreground">{auditState}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">{when(row.created_at)}</TableCell>
                  <TableCell className="text-xs font-medium">{row.action}</TableCell>
                  <TableCell className="text-xs">{row.actor_username || '—'}</TableCell>
                  <TableCell className="text-xs">{row.target_username || '—'}</TableCell>
                  <TableCell className="max-w-[28rem] truncate text-xs text-muted-foreground">{row.details ? JSON.stringify(row.details) : '—'}</TableCell>
                </TableRow>
              ))}
              {!audit.length && !auditState && (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No audit rows yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
