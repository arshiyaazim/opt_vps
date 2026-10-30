# Unified Super Admin Authentication — Design, Evidence and Cutover Plan

**Status:** implemented in source, tested in an isolated environment, **NOT deployed**
and **NOT enabled** (`ALRIFAI_UNIFIED_AUTH_MODE` is unset, which resolves to `off`).
**Date:** 2026-10-28.

**Owner requirement honoured:** the Owner's existing working Cash Portal username
and password are the credential baseline and are preserved exactly. No user row,
password hash, account id, role, session or audit record was created, changed,
renamed, disabled or rotated as part of this work — in production or in source.

---

## A. Current Cash authentication mechanism (verified 2026-10-28)

| Item | Verified value |
|---|---|
| Login endpoint | `POST /api/cash/login` (`app/api/cash/[...path]/route.ts`) |
| Login UI | `app/cash/page.tsx` (inline form on `/cash`; no `/login` route existed) |
| User store | `public.cash_portal_users` (migration `0017_cash_portal_auth.sql`) |
| Session store | `public.cash_portal_sessions` (token = 32 random bytes, **only** its SHA-256 is stored) |
| Audit store | `public.cash_portal_audit` (append-only; app holds INSERT only) |
| Cookie | `__Host-alrifai_cash`; `HttpOnly; Secure; SameSite=Strict; Path=/`; no `Domain` |
| Lifetime | 8 h absolute, 30 min idle (`lib/cash-portal.ts`) |
| Password hash | PBKDF2-HMAC-SHA256, 600 000 iterations, 16-byte salt, 32-byte key, strict format check |
| CSRF | per-session 64-hex token; client sends `X-CSRF-Token`; compared with `timingSafeEqual` against the stored hash; refreshed by `GET /api/cash/me` |
| Origin | `ALRIFAI_CASH_ORIGIN` (`https://alrifai.iamazim.com`), exact match required on every mutation |
| Rate limit | Phase 1 (committed `d74f91e`, 2026-10-30): username-keyed, hash-only, database-backed progressive delay in `lib/login-throttle.ts`, integrated in both the unified login and the Cash Portal login handler. 30-second hard cap; never a lockout. Fail-open until the backing table from `db/migration-candidates/0036_login_throttle.sql` is applied (candidate, unapplied). Client-IP headers are not yet used as a key because the entry-peer trust contract is not enforced at the application boundary; this remains the earlier design note. The prior in-memory IP-bucket limiter was removed because it could lock out the Owner. |
| Roles | `ADMIN` / `USER`; Super Admin = role `ADMIN` **and** id listed in `ALRIFAI_CASH_SUPER_ADMIN_IDS` (`isCashSuperAdmin`) |
| DB role | `ir_review_runtime` (least privilege; `SELECT,INSERT,UPDATE` on users, full on sessions, INSERT on audit) |

## B. Current validator (workspace Basic) mechanism

| Item | Verified value |
|---|---|
| Implementation | `lib/validation-auth.mjs` + `proxy.ts` (Next 16 proxy entry) |
| Username | hardcoded technical literal `validator` — not a database account |
| Password source | file-backed secret: `ALRIFAI_VALIDATION_PASSWORD_FILE` → `/run/secrets/validation_password` ← host `/etc/vps/apps/al-rifai/validation_password` (bind-mounted read-only in `compose.yaml`) |
| Comparison | `sha256(credential) === sha256('validator:'+password)` with `timingSafeEqual` |
| Exemptions | `/api/health`, `/cash`, `/cash/**`, `/api/cash/**` (Cash portal has its own boundary) |
| Identity produced | `{userId:'local-validator'}`, no role, no DB row |
| Reverse proxy | `release/private-entry.mjs` — TLS terminator + boundary-exact path allowlists (`release/entry-rules.mjs`), strips client `x-forwarded-*`/`oai-authenticated-*`, injects `x-wf02-peer` and `x-alrifai-client-ip`. It performs **no authentication of its own**. |
| Redirects | `/` → `/review` on the main host, `/` → `/cash` on the Cash host |

The validator credential is a **technical** secret: one shared password, no per-user
identity, no role, no audit, no revocation story. That is exactly why it is unsuitable
as the Owner's daily login and why it must not become the unified credential.

## C. Verified Owner identity mapping

Verified read-only against the production database on 2026-10-28:

| Field | Value |
|---|---|
| Rows in `cash_portal_users` | **1** |
| Account id | `81a73b320d9d56c175b48552a648b7405659dc814921bf12be38927f07b72c79` |
| Username | `Admin` (unchanged; not inferred — it is the only account) |
| Role | `ADMIN`, active, `must_change_password = false` |
| Password changed | 2026-10-17T00:20:56Z (bootstrap hash was replaced by the Owner) |
| Row version | 2 |
| Password-hash fingerprint (`md5` of the stored hash, for later comparison) | `e4d99a36533187eecd5f9d4f515f7ca3` |
| Live sessions | 24; newest activity 2026-10-28T03:33:56Z (Owner is actively using it) |
| `ALRIFAI_CASH_SUPER_ADMIN_IDS` | exactly one id, equal to the account id above |

The mapping is unambiguous: the single account in the store is also the single
allowlisted Super Admin id and is in active use. The username `Admin` was **not**
used as the identification criterion. The root-only
`/etc/vps/apps/al-rifai/auth/owner-login-recovery.json` exists (mode `0600`, root) and
was **not read**; it is a recovery record, not an identity source.

No competing Super Admin account was created, and none is proposed.

## D. Proposed unified session architecture

One identity store, one session store, one cookie — the deployed Cash ones:

```
browser
  │  POST /api/auth/login  {username,password}      Origin allowlist + throttling
  ▼
lib/unified-auth.ts ── findUser() + verifyPassword()  (public.cash_portal_users, PBKDF2)
  │                └── createSession()                (public.cash_portal_sessions)
  ▼  Set-Cookie: __Host-alrifai_cash (unchanged name)
proxy.ts (Next 16 proxy entry, Node runtime)
  │  1. legacy Basic validator  → allow (unchanged, always accepted)
  │  2. mode off              → 401 (deployed behaviour, byte-for-byte)
  │  3. /login, /api/auth/**  → allow (sign-in surface)
  │  4. mode on + cookie      → DB-validated session → allow
  │  5. document navigation   → 302 /login?next=<sanitised>
  │  6. everything else       → 401
  ▼
app/chatgpt-auth.ts → getChatGPTUser()  → {userId, role, superAdmin, capabilities}
  ▼
workspace pages (server components) + existing /api/* handlers (server-side checks)
```

Key properties:

* **No second password database.** `lib/unified-auth.ts` only calls the existing
  `findUser` / `verifyPassword` / `createSession` / `refreshCsrf` / `audit` helpers.
* **Cookie compatibility.** The name is reused verbatim, so every existing Cash
  session, and every Cash API call, keeps working unchanged. Sessions are host-scoped
  (`__Host-` has no `Domain`), so the Cash host and workspace host each hold their own
  session created by the same credential — no cross-subdomain cookie widening.
* **Server-side only.** Roles and `superAdmin` are resolved from the stored row plus
  `ALRIFAI_CASH_SUPER_ADMIN_IDS`; no header, cookie payload, query string or client
  body can assert them.
* **Fail-closed.** Unknown/absent mode ⇒ `off`; DB failure while validating a session
  ⇒ no identity ⇒ 401 (never a cached "trusted" verdict).
* **Two modes for a safe cutover:**
  * `shadow` — `/login` and `/api/auth/**` are live and prove the credentials, but
    every protected route still requires the legacy guard;
  * `on` — a validated Cash session also authorises the workspace; the legacy Basic
    guard stays accepted and is **not** removed by this change.

## E. Super Admin authorization design

* `isConfiguredSuperAdmin(id, role, ALRIFAI_CASH_SUPER_ADMIN_IDS)` — identical policy
  to the deployed `isCashSuperAdmin`, re-implemented as a pure function so it is
  testable and usable in the proxy-free layers. Role must be `ADMIN`; id must be a
  64-hex account id present in the allowlist; no wildcard is honoured.
* Admin Panel gate: `app/admin/page.tsx` is a server component that redirects unless
  `superAdmin === true && role === 'ADMIN'`; `requireWorkspaceAdmin()` is the API-side
  equivalent.
* Capabilities (additive to the role, catalogue is fixed):
  `cash.read`, `cash.submit`, `cash.review`, `vessel.read`, `vessel.command`,
  `audit.read`. `workspace.admin` exists in the catalogue but is **config-bound and
  never grantable**; `cash.post` does not exist at all, so posting cannot be expressed
  as a permission.
* Grant rules (server-side): only a Super Admin may change capabilities; a `USER`
  account can never receive `cash.review`; unknown codes are rejected.
* Lockout protection, two independent layers:
  1. policy: `LAST_ADMIN_PROTECTED` (existing) **and** `LAST_SUPER_ADMIN_PROTECTED`
     (new — the configured Super Admin cannot be demoted or disabled while it is the
     only active configured Super Admin, even if other admins exist);
  2. database (migration candidate 0033): a `BEFORE UPDATE OR DELETE` trigger raises
     `LAST_ADMIN_PROTECTED` if the final active `ADMIN` row would be demoted,
     deactivated or deleted.

## F. Credential-preservation evidence

| Check | Result |
|---|---|
| Production user rows | 1 (unchanged) |
| Password hash fingerprint | `e4d99a36533187eecd5f9d4f515f7ca3` (record this before cutover and re-check after) |
| `password_changed_at` | 2026-10-17T00:20:56Z (unchanged) |
| Sessions | 24 (none revved, none created by this work) |
| Source diff footprint | no `INSERT`/`DELETE`/`UPDATE` against `cash_portal_users` exists in the unified modules; the only two `UPDATE`s are inside password-confirmed self-service functions (`changeOwnPassword`, `changeOwnUsername`) |
| Migration candidate 0033 | additive DDL + one read grant + one guard trigger; contains no `INSERT`, `UPDATE`, `DELETE`, `DROP TABLE`, `ALTER COLUMN`, and no reference to `password_hash` |
| Tests enforcing the above | `tests/unified-auth-integration.mjs` (fails if a future change mutates users automatically or replaces the cookie/identity store) |

## G. Lockout prevention and rollback

Cutover steps (each reversible, none performed yet):

1. Owner approves migration candidate `0033` and the read grant on
   `cash_portal_audit` (see `docs/MIGRATION-READINESS-0031-0032.md` for the process
   used for the other candidates).
2. Set `ALRIFAI_UNIFIED_AUTH_MODE=shadow` and `ALRIFAI_UNIFIED_ORIGINS` in
   `/etc/vps/apps/al-rifai/app.env`; deploy the image; **do not** touch any user row.
3. Owner signs in at `https://<workspace-host>/login` with the existing Cash
   username/password. Protected pages must still demand the legacy credential —
   proving the new credential verification without changing access.
4. Set `ALRIFAI_UNIFIED_AUTH_MODE=on`; the Owner uses `/login` → `/dashboard`; the
   legacy Basic credential remains accepted throughout.
5. Only after the Owner confirms normal use, decide (separately) whether the
   validator Basic guard is retired. Nothing in this change retires it.

Rollback ladder (any step, no data loss):

* `ALRIFAI_UNIFIED_AUTH_MODE=off` + restart → previous behaviour exactly; existing
  Cash sessions remain valid.
* Previous image digest re-pin in `compose.yaml`.
* Migration 0033 rollback (only if it was applied and must be undone):
  `DROP TRIGGER cash_portal_users_guard ON public.cash_portal_users;`
  `DROP FUNCTION public.alrifai_cash_portal_users_guard();`
  `REVOKE SELECT ON public.cash_portal_audit FROM ir_review_runtime;`
  `ALTER TABLE public.cash_portal_users DROP COLUMN username_changed_at;`
  `ALTER TABLE public.cash_portal_users DROP COLUMN capabilities;`
  (Dropping the columns discards only newly granted capabilities; no credential,
  identity or session is affected.)

Known deliberate risk and its mitigation: in `on` mode the proxy performs one indexed
session lookup per protected document request. If the database is unavailable the
result is 401 (fail closed) and the legacy Basic credential remains a working
fallback — the Owner is never locked out by a database hiccup alone.

## H. Implementation and test results

Isolated validation (no production action):

| Check | Result |
|---|---|
| `tsc --noEmit` (Node 22.23.3 container) | pass |
| `node scripts/lint.mjs` | 0 errors; no new warnings in changed files |
| `next build --webpack` | pass; `/login`, `/admin`, `/api/auth/[...path]` present; proxy compiled |
| Full unit suite (`pnpm test` set, 157 tests) | 156 pass, 0 fail, 1 pre-existing skip |
| New policy tests (`tests/unified-auth-policy.mjs`) | 14/14 pass |
| New wiring tests (`tests/unified-auth-integration.mjs`) | 14/14 pass |
| Isolated runtime rehearsal (throwaway Postgres 16 + built app, own container/network, removed afterwards) | 30/30 behaviour checks pass |

Runtime rehearsal evidence (isolated, disposable database; **no production system,
container, credential or database was touched**):

* unauthenticated document navigation → `302 /login?next=%2Fdashboard`; RSC/API
  requests → `401` (fail closed);
* wrong password → `401 INVALID_CREDENTIALS`; foreign `Origin` → `403 ORIGIN_DENIED`;
* correct Cash credential → `200`, `Set-Cookie: __Host-alrifai_cash=…` (same name),
  hostile `next` neutralised to `/dashboard`, `superAdmin: true` for the allowlisted id;
* `/admin` renders for the Super Admin (`200`) and redirects a standard user to
  `/dashboard` (`307`);
* deactivating the configured Super Admin → `403` (`LAST_ADMIN_PROTECTED`);
  `workspace.admin` grant → `403 CAPABILITY_NOT_GRANTABLE`; capability grant persists;
* standard user: cannot list accounts (`403 ADMIN_REQUIRED`), cannot create any
  account, cannot self-escalate;
* audit history readable by the Super Admin (login/rename/grant events present);
* voluntary rename: no-op refused, wrong current password refused, successful rename
  keeps the **same account id** and the **original password** valid;
* legacy Basic credential still accepted (`200` on `/api/core`) in `on` mode;
* logout revokes the session (`401` afterwards); disabling an account immediately
  invalidates its live session; absolute expiry invalidates the session;
* `shadow` mode: `/login` + `/api/auth/login` work, `/dashboard` with a valid session
  still redirects to `/login` (legacy guard intact);
* `off` mode: identical to today (legacy guard only).

## I. Exact remaining Owner approvals

Nothing below has been done. Each requires explicit Owner authorization:

1. **Approve migration candidate `0033_unified_auth_sessions.sql`** (adds
   `capabilities`, `username_changed_at`, `SELECT` on `cash_portal_audit`, and the
   final-admin guard trigger). Until applied, the API reports
   `CAPABILITIES_MIGRATION_REQUIRED` / `AUDIT_READ_MIGRATION_REQUIRED` instead of
   failing opaquely, and every existing user-management action keeps working.
2. **Approve the image build/deploy** and record the new image digest plus the source
   commit (the currently running image predates the source commit).
3. **Approve enabling `ALRIFAI_UNIFIED_AUTH_MODE=shadow`**, then `on`, in
   `/etc/vps/apps/al-rifai/app.env` (restart of the app service is required, which is
   itself an Owner-authorized action).
4. **Approve the `ALRIFAI_UNIFIED_ORIGINS` value** if the Owner wants hosts other than
   `https://alrifai.iamazim.com` and `https://app.al-rifai.iamazim.com`.
5. **Decide separately** whether the `validator` Basic guard is ever retired. It is
   deliberately left in place as the fallback; removing it is out of scope here.
6. **Confirm the Owner account after cutover**: username `Admin`, hash fingerprint
   `e4d99a36533187eecd5f9d4f515f7ca3`, account id `81a73b32…c79`. Any deviation must
   stop the cutover and be reported, not repaired.

Explicitly **not** part of this change: no credential rotation, no username change, no
new Super Admin account, no Cash posting/approval change, no WhatsApp change, no
production migration, no deployment, no app restart.
