# Release candidate record — 2026-10-28 (stages 1–3 executed: `shadow` live, `on` not authorized)

Unified Super Admin authentication on the Owner's existing Cash Portal credential.
Sections 1–7 record the pre-deployment verification and the prepared procedure.
Section 8 records the Owner-authorized production execution on 2026-10-28:
migration `0033` applied, candidate image deployed in `off` mode, then `shadow`
enabled. `ALRIFAI_UNIFIED_AUTH_MODE=on` was **not** authorized and is **not**
enabled; the `validator` Basic guard remains in force.

| Item | Value |
|---|---|
| Source commit the image was built from | `47f7e11` ("docs: unified Super Admin authentication report, cutover and rollback plan") |
| Branch / remote state at build | `main`, fast-forward push `433b1ed..47f7e11` to `git@github.com:arshiyaazim/opt_vps.git` |
| Candidate image | `local/al-rifai:20261028-unified-auth` |
| Image digest (manifest list == image ID) | `sha256:52105520fa0e288a05955bdac9ea7c12daed09f5304d3a3ab6472fc5b8139a97` |
| Platform manifest | `sha256:1b76b666a8abd1487134633168de7aee5c5bf215f91a143e633b6092101b341c` |
| Image config | `sha256:855ad77135c0ce9b985a183b35e4af554a6dff52967e891be398d4629f1b6195` |
| Image build time / size | 2026-10-28T06:27:09+01:00 / 412,133,912 bytes |
| Pre-deployment backup | `/var/lib/vps/al-rifai/backups/pre-unified-auth-20261028.dump` |
| Backup SHA-256 | `b1f8c8fa9f5061f896ba7e00ed2245cb60e269a93b85be73e7b7f185bc309792` |
| Backup size / shape | 61 MB, `pg_dump -Fc`, 61 table-data sections, restore rehearsed |
| Production image before execution | `sha256:5f3e2aad0916f66f99c7af13339929ba8e0e041ef904de957c5d2f64244f3b06` |
| Production migration ledger before execution | 30 rows applied, newest `0030_epoch_scoped_register_and_program_writes.sql` |
| **Currently deployed image** | `sha256:52105520…` (since 2026-10-28 06:53, mode `shadow`) |
| **Current migration ledger** | 31 rows, newest `0033_unified_auth_sessions.sql` |

## 1. Owner identity verification (read-only, via the Cash application role)

Performed with the authorized Cash connection (`ir_review_runtime`, session forced
`default_transaction_read_only=on`), metadata only. No plaintext credential, hash
value, session token or secret file content was retrieved or printed.

| Check | Result |
|---|---|
| Cash account count | `1` |
| Account id | `81a73b320d9d56c175b48552a648b7405659dc814921bf12be38927f07b72c79` |
| Username / role | `Admin` / `ADMIN` |
| Active / must-change-password | `true` / `false` |
| Password hash scheme / length | `pbkdf2-sha256`, 600,000 iterations, 118 chars |
| Password-hash fingerprint (`md5(password_hash)`) | `e4d99a36533187eecd5f9d4f515f7ca3` — **identical to the recorded baseline** |
| `password_changed_at` | `2026-10-17T00:20:56.635Z` (unchanged) |
| Row version | `2` (unchanged) |
| Newest activity | `2026-10-28T03:33:56.610Z` — account in live use |
| Duplicate usernames (case-insensitive) | none |
| Accounts by role | `ADMIN=1` only |
| `ALRIFAI_CASH_SUPER_ADMIN_IDS` | exactly one id, equal to the account id above |
| Sessions | 24 total, 3 unexpired, all belonging to that single account |

Conflicting Super Admin identities: **none** — one account, one configured id, one
ADMIN role, no duplicate username.

Post-verification re-check (after every rehearsal below) returned the same id,
fingerprint, version and session count, confirming no account or password was
modified at any point.

Known pre-migration limitation: `ir_review_runtime` holds `INSERT` only on
`cash_portal_audit`, so audit history is not readable until `0033` grants `SELECT`
(see §3).

## 2. Authentication verification

### 2.1 Automated suites (isolated Node 22.23.3 container, no production runtime)

| Check | Result |
|---|---|
| Full suite (`tests/*.mjs`, 157 tests) | **156 pass, 0 fail, 1 pre-existing skip** |
| `tests/workflows.mjs` | pass |
| `tests/source-register.mjs` | pass |
| `tests/phase1-unit.mjs` | pass |
| `tsc --noEmit` | pass (exit 0) |
| ESLint over `app lib release tests scripts proxy.ts db components` | 0 errors, 0 warnings |
| `next build --webpack` | pass; `/login`, `/admin`, `/api/auth/[...path]` present |
| Image build (`pnpm typecheck && pnpm lint && pnpm build` inside Dockerfile) | pass |

### 2.2 Runtime rehearsal — candidate image, throwaway clone: 36/36 checks pass

Disposable Postgres 16 restored from the backup above, `0033` applied, throwaway
credentials only, candidate image started on its own network from the same commit.
The Owner's production credential was never used: the clone's row was re-hashed with
a rehearsal-only password under the identical id/username/role.

| Check | Result |
|---|---|
| Health endpoint | 200 |
| Unauthenticated navigation → `302 /login?next=%2Fdashboard` | pass |
| Unauthenticated API → `401` (fail closed) | pass |
| Wrong password → `401 INVALID_CREDENTIALS`, no cookie minted | pass |
| Existing Cash credential accepted on `/login` | 200 |
| Same `__Host-alrifai_cash` cookie name, existing session table | pass |
| Owner resolves as configured Super Admin | `superAdmin: true` |
| `/admin` renders for the Super Admin | 200 |
| Standard user Cash login | 200 |
| Standard user is not Super Admin | `superAdmin: false` |
| Standard user `/admin` → redirect | 307 |
| Standard user cannot list accounts / create an ADMIN / self-escalate | 403 / 403 / 403 |
| `workspace.admin` grant refused | `CAPABILITY_NOT_GRANTABLE` |
| Final active Super Admin cannot be deactivated | `LAST_ADMIN_PROTECTED` |
| Valid capability grant persists | 200 |
| Audit history readable after `0033` | 200 |
| Legacy `validator` Basic accepted in `on` mode | 200 |
| No Basic, no session → denied | 401 |
| Cash portal's own `/api/cash/login` unchanged | 200 |
| Logout revokes the session | 200, then 401 |
| `shadow`: `/login` verifies credential, session does **not** authorise the workspace | 200 / 302 |
| `shadow`: legacy Basic still accepted | 200 |
| `off`: unified endpoints not exposed, legacy guard only, Cash login unchanged | 401 / 401 / 200 |

Conclusion: the existing credential is reused as-is, no new password is required,
no password hash is changed, Cash login still works, and the Admin Panel is enforced
server-side (role + configured id + capability allowlist, never a client claim).

## 3. Migration 0033 readiness

Additive only: adds `capabilities jsonb` and `username_changed_at`, grants
`SELECT` on `cash_portal_audit` to `ir_review_runtime`, and installs a
final-active-admin guard trigger. No user row, hash, session, role or audit row is
modified; no `DELETE` or `UPDATE` grant is added anywhere.

| Rehearsal | Result |
|---|---|
| Restore of `pre-unified-auth-20261028.dump` into throwaway Postgres 16 | exit 0 |
| Restored clone fidelity | 1 user, 24 sessions, 33 audit rows, fingerprint `e4d99a36…` (identical) |
| Apply pass 1 | exit 0 |
| Apply pass 2 (idempotency) | exit 0, only `NOTICE … already exists` |
| Users / sessions / audit row counts after apply | unchanged |
| Password fingerprint after apply | `e4d99a36533187eecd5f9d4f515f7ca3` (unchanged) |
| `capabilities` default `'[]'::jsonb`, `jsonb_typeof = array` | pass |
| `cash_portal_users_capabilities_array` CHECK rejects non-array | pass |
| Guard: demote / deactivate / delete final active ADMIN | blocked with `LAST_ADMIN_PROTECTED` (23514) |
| Guard: harmless update (`display_name`) | allowed |
| Guard: second active ADMIN allows demoting the first | allowed |
| Guard: demoting or deleting the then-final ADMIN | blocked |
| `ir_review_runtime` audit grants before / after | `INSERT` → `INSERT,SELECT` |
| `ir_review_runtime` users grants before / after | `INSERT,SELECT,UPDATE` (unchanged, no DELETE) |
| Documented rollback ladder (drop trigger, drop function, revoke SELECT, drop 2 columns) | exit 0 |
| State after rollback | columns/trigger/function gone, audit grants back to `INSERT`, owner row and 24 sessions intact |

**Not applied to production.** Applying it remains an Owner decision.

## 4. GitHub synchronization

| Item | Result |
|---|---|
| Working tree before push | clean |
| Secret scan over `433b1ed..HEAD` | no credential/token/private-key patterns; only `.env.example` changed, comment-only |
| Push | `git push origin main` → **`433b1ed..47f7e11`** (fast-forward, no force) |
| Local vs remote after push | `0` ahead / `0` behind |

## 5. New candidate image

`local/al-rifai:20261028-unified-auth`
digest `sha256:52105520fa0e288a05955bdac9ea7c12daed09f5304d3a3ab6472fc5b8139a97`,
built from `47f7e11` with BuildKit and the read-only `evidence` build context.
Content spot-check inside the image: `server.js`, `start-private-app.mjs`,
`entry-rules.mjs` with `/admin` and `/api/auth/login` allowed and an unrelated path
denied; `.next/server/app/{login,admin}` present.

The running production image
`sha256:5f3e2aad…` is untouched: `compose.yaml` still pins it, no container was
recreated, and `al-rifai-app-1` remains `Up (healthy)`.

## 6. Exact safe deployment sequence (not started)

Each step is separately approvable and individually reversible. Stop and report on
any deviation.

1. **Re-verify the credential baseline** — rerun the read-only identity check and
   confirm id `81a73b32…c79` and fingerprint `e4d99a36533187eecd5f9d4f515f7ca3`.
2. **Take a fresh backup** — `pg_dump -Fc` from `vps-infra-postgres-1`, record the
   SHA-256, and confirm `pg_restore -l` lists the expected objects.
3. **Apply migration 0033** — promote
   `db/migration-candidates/0033_unified_auth_sessions.sql` into `db/migrations/`
   (source commit), then apply it in production once, using the same mechanism as
   `alrifai_schema_migrations` (`node /app/scripts/database.mjs migrate` inside the
   app container, or an equivalent single transaction plus ledger row whose
   `sha256` equals the file). Verify: column defaults, CHECK constraint, trigger
   presence, `ir_review_runtime` audit grants `INSERT,SELECT`, and unchanged user /
   session / fingerprint values. Rollback ladder is in §3.
4. **Deploy the candidate image in `off` mode** — pin
   `sha256:52105520…` in `compose.yaml`, recreate only the app service, and record
   the deployed digest and commit `47f7e11`. In `off` mode behaviour is identical to
   today: legacy Basic only. Verify `/api/health`, Cash portal login, and that
   `POST /api/auth/login` is not exposed.
5. **Enable `shadow`** — set `ALRIFAI_UNIFIED_AUTH_MODE=shadow` (and
   `ALRIFAI_UNIFIED_ORIGINS` if hosts other than the two defaults are wanted) in
   `/etc/vps/apps/al-rifai/app.env`, restart the app service, then sign in once at
   `/login` with the existing Cash credential. Expected: sign-in succeeds, protected
   pages still demand the legacy credential.
6. **Enable `on`** — set `ALRIFAI_UNIFIED_AUTH_MODE=on`, restart, and use
   `/login` → `/dashboard`. The legacy Basic credential remains valid throughout.
7. **Retire the legacy guard only if, and when, the Owner separately decides to.**

Rollback at any step: set `ALRIFAI_UNIFIED_AUTH_MODE=off` and restart (previous
behaviour exactly, Cash sessions stay valid); re-pin the previous image digest
`sha256:5f3e2aad…` and recreate the app service; migration 0033 is reversible with
the ladder in §3. The `validator` Basic credential is the fallback that keeps the
Owner reachable even if the database is unavailable.

## 7. Owner approvals — status after execution

| # | Approval | Status |
|---|---|---|
| 1 | Apply migration `0033` in production | **DONE** 2026-10-28 (Owner-authorized) |
| 2 | Deploy `sha256:52105520…` (record digest + commit `47f7e11`) | **DONE** 2026-10-28 (Owner-authorized) |
| 3a | Enable `ALRIFAI_UNIFIED_AUTH_MODE=shadow` | **DONE** 2026-10-28 (Owner-authorized) |
| 3b | Enable `ALRIFAI_UNIFIED_AUTH_MODE=on` | **NOT AUTHORIZED, NOT DONE** — needs the Owner's personal `/login` confirmation plus a new explicit authorization |
| 4 | `ALRIFAI_UNIFIED_ORIGINS` beyond the two default hosts | not needed; defaults in force |
| 5 | Retire the `validator` Basic guard | **NOT AUTHORIZED, NOT DONE** |

## 8. Production execution record — 2026-10-28

Executed exactly the three authorized stages, with a verification gate before each.

### 8.1 Pre-flight (read-only, passed)

| Check | Result |
|---|---|
| Git | `967e026` on `main`, `0/0` vs `origin/main`; `47f7e11..967e026` is documentation only |
| Candidate / rollback images | both present with the exact approved digests |
| Running app before change | `sha256:5f3e2aad…`, healthy, compose pin matched |
| PostgreSQL | healthy, 645 MB |
| WA-01 / WA-02 | up 24 h / 7 d, untouched |
| Cash portal | `/cash` → 200; `/api/cash/login` live |
| Unified endpoints before change | `/api/auth/login` → 401 (not exposed in `off`) |
| Owner identity | id `81a73b32…c79`, `Admin`, ADMIN, active, version 2, fingerprint `e4d99a36…` — matched baseline |
| Super Admin mapping | exactly one id, equal to the Owner account |
| Sessions | 24 total, 3 unexpired |
| Migration ledger | 30 rows, newest `0030` |
| Cash Freeze | 1,842 current instructions (BDT 947,339.00), **0 current postings**; legacy 1,610 / 1,586 postings |

### 8.2 Fresh backup (passed)

`pre-0033-20261028.dump` — 61 MB, 61 table-data sections,
sha256 `2093fadf36082e97b58e66b17b95f7a7756671ed18288154b414d992616e5810`;
`pg_restore -l` succeeded. Isolated restore into a throwaway Postgres 16 reproduced
users 1 / sessions 24 / audit 33 / ledger 30 / current 1,842 / legacy 1,610 /
postings 1,586 / movements 3,172 and the same password fingerprint — fidelity MATCH.
Configuration snapshotted to
`/var/lib/vps/al-rifai/backups/pre-unified-deploy-20261028/`.

### 8.3 Migration 0033 (applied, verified)

File sha256 `c7e05dae…`, unmodified vs HEAD, applied with `ON_ERROR_STOP` in its own
transaction (exit 0); ledger row added with the same sha256 → 31 rows.

| Post-apply check | Result |
|---|---|
| `capabilities` | `jsonb` NOT NULL default `'[]'::jsonb` |
| `username_changed_at` | `timestamptz`, nullable |
| CHECK `cash_portal_users_capabilities_array` | present |
| Guard trigger / function | `cash_portal_users_guard` enabled BEFORE UPDATE/DELETE |
| `ir_review_runtime` audit grants | `INSERT,SELECT` |
| users grants | `INSERT,SELECT,UPDATE` (no DELETE) |
| Users / sessions / unexpired / audit rows | 1 / 24 / 3 / 33 — unchanged |
| Account id / role / active / version / fingerprint | unchanged |
| Cash counts and `amount_minor` | unchanged; current postings still 0 |
| `0031` / `0032` | not applied |

### 8.4 Deployment with mode `off`

`compose.yaml` re-pinned to `sha256:52105520…`; `docker compose up -d --no-deps app`
recreated only `al-rifai-app-1`. PostgreSQL and both WhatsApp containers kept their
uptimes. Verified: healthy, `/api/health` ok, `/cash` 200, Cash login endpoint live
(`INVALID_CREDENTIALS`), `/login` `/dashboard` `/review` `/admin` 401 without Basic,
`/api/core` 401 without and 200 with the legacy credential, TLS entry correct
(workspace 401 / cash host 200 / unknown host 403), mirror disabled, WhatsApp
outboxes empty, no error lines in the log.

### 8.5 Shadow mode

`ALRIFAI_UNIFIED_AUTH_MODE=shadow` in `app.env`; only the app service recreated.

| Check | Result |
|---|---|
| Health | ok |
| `/login` | 200 without Basic (sign-in surface reachable) |
| Failed unified login | 401 `INVALID_CREDENTIALS`, **no** `Set-Cookie` |
| Missing fields | 400 `CREDENTIALS_REQUIRED` |
| Foreign `Origin` | 403 `ORIGIN_DENIED` |
| `/dashboard` document navigation | `302 /login?next=%2Fdashboard` — shadow grants no authorization |
| `/api/core` without auth | 401 (fail closed) |
| `/api/core` / `/dashboard` with legacy Basic | 200 / 200 |
| `/admin` without Basic | 401 |
| `/admin` with the `validator` credential | `307 /dashboard` — validator is not the Super Admin |
| `/api/cash/users` with Basic | 401 (Cash boundary unchanged) |
| `/cash` and `/api/cash/login` | 200 / live |
| Sessions / audit rows / fingerprint | 24 / 33 / `e4d99a36…` — unchanged |
| Application log | no errors |

### 8.6 Not performed

`ALRIFAI_UNIFIED_AUTH_MODE=on`; retiring the `validator` guard; any username,
password, hash, session or secret change; any Cash posting or WhatsApp send.


## 9. Incident and repair — shadow redirect loop (2026-10-28, deployed)

**Symptom.** Opening `https://app.al-rifai.iamazim.com/login` produced
`ERR_TOO_MANY_REDIRECTS`. Two `LOGIN` audit events (`surface=unified`,
08:35:24Z and 08:36:23Z) show the credential itself was accepted.

**Root cause.** `app/login/page.tsx` forwarded any signed-in visitor with
`if (identity) redirect(next)`, while `proxy.ts` refuses to authorise a session
outside `on` mode. Measured chain:

```
/login                       307 -> /dashboard
/dashboard                   302 -> /login?next=%2Fdashboard
/login?next=%2Fdashboard     307 -> /dashboard        (cycle)
```

Shadow-only: `off` answers 401 and `on` authorises `/dashboard`, so neither
loops. It required a **valid** session cookie; without one `/login` returned 200.

**Fix — commit `cc10ed8`.**
- `lib/unified-auth-policy.ts`: `signedInRedirectTarget(mode, next)` returns a
  sanitised target only for `on`, `null` for `shadow`/`off`.
- `app/login/page.tsx`: uses the guard; in shadow it renders the page and passes
  the verified display name.
- `app/login/view.tsx`: shadow shows a “credential verified” panel (no token, no
  password, no id) explaining the workspace still needs the private entry
  credential, with “Open workspace” and “Use a different account”; refreshes do
  not create sessions.
- `tests/unified-auth-shadow-loop.mjs`: replays both decisions with a valid
  session, asserts the **pre-fix rule loops**, and asserts the shipped policy
  terminates.

**Verification.** 166 tests → 165 pass / 0 fail / 1 pre-existing skip; typecheck,
ESLint 0/0, `next build` pass. Isolated clone with the new image and a real cookie:
21/21 checks (`/login` 1 hop 200 + verified panel; dashboard/admin/review 2 hops
ending on `/login`; no extra sessions over 3 refreshes; Cash login 200; Basic 200;
no escalation; `off` 401; `on` 307→200, isolated only).

**Deployment.** Image `sha256:960ee047b7a9ce880a01885794835debd45286c1d780bbb8d36eff3abd35fc43`
(platform manifest `sha256:d2491546…`, config `sha256:f4f4042e…`), source
`cc10ed8`; only the app service recreated; mode stays `shadow`; no migration
applied; PostgreSQL and WhatsApp untouched. Rollback image
`sha256:52105520…` retained.

**Production after deploy.** `/login` 200 with 0 redirects; `/dashboard`,
`/admin`, `/review` each 1 hop to `/login` (200); invalid/stale cookie → 200; no
verified panel without a session; `/cash` 200; health ok; 1 user / 26 sessions
(5 unexpired) / audit 35 / fingerprint `e4d99a36…` / version 2 / ledger 31 /
0 current postings.

**Remaining.** Owner browser confirmation of the sign-in panel, then a separate
explicit approval for `on` mode. The `validator` guard is unchanged.

## 10. Second incident and repair — shadow suppressed the Basic challenge (2026-10-28, deployed)

**Symptom.** After the loop repair the Owner signed in and saw the verified panel,
but clicking *Dashboard* (Cash sidebar) or *Open workspace* returned to the same
panel. Finite redirects, but the workspace was unreachable by click.

**Root cause.** `proxy.ts` answered *every* protected document navigation with
`302 → /login` for any mode other than `off`. That replaced the `401 +
WWW-Authenticate` challenge, so the browser never offered the only credential
that can open the workspace in shadow mode.

| Request | Before | After |
|---|---|---|
| `GET /dashboard` (navigation) | `302 /login?next=%2Fdashboard` | `401` + `WWW-Authenticate` |
| `GET /dashboard` (non-navigation) | `401` + challenge | unchanged |
| `GET /dashboard` + legacy Basic | `302` (never usable) | **200** |

**Fix — commit `a32c9ef`.** The `/login` redirect moved inside the
`mode === "on"` branch; `shadow` falls through to the original fail-closed `401`
challenge. `on` and `off` behave exactly as before. Tests: the shadow model now
asserts a challenge with no `Location`, and the integration test asserts the
redirect lives inside the `on` branch and that the challenge is the final
fallback.

**Validation.** 167 tests → 166 pass / 0 fail / 1 pre-existing skip; typecheck,
ESLint 0/0, `next build` pass; isolated clone with the new image **13/13**
(shadow + cookie `/dashboard` → 401 challenge; shadow + Basic `/dashboard` → 200;
`/admin` + Basic → 307 `/dashboard`; `/login` 200; `off` unchanged; `on`
307 → 200; Cash portal and Cash login healthy).

**Deployment.** Image `sha256:2c0833c4860a2a3ee6b23a87d937622ad628f2419dd6e7e1ae2c9ab6fb162d7f`
(source `a32c9ef`); only the app service recreated; mode stays `shadow`; no
migration; PostgreSQL and WhatsApp untouched. Rollback images
`sha256:960ee047…` and `sha256:52105520…` retained.

**Production after deploy.** `/dashboard` and `/admin` → `401` + Basic challenge;
`/dashboard` with the legacy credential → 200; `/admin` with it → `307
/dashboard`; `/api/core` 200 with and 401 without; `/login` 200 (with and without
an invalid cookie); `/cash` 200; health ok; no error lines. Identity: 1 user,
fingerprint `e4d99a36…`, version 2, 29 sessions (7 unexpired), 38 audit rows,
ledger 31, 0 current postings.

**Remaining.** Owner click-through with the existing private entry credential,
then a separate explicit approval for `on` mode.
