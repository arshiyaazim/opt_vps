# Next-Session Handoff — Updated After Session 3

## CURRENT STATE — 2026-10-29 (authoritative; supersedes the dated sections below)

**Production application**
- Container `al-rifai-app-1` (compose project `al-rifai`, service `app`), healthy.
- Image `sha256:cace72aab3bbeff80abd4eafda76b55ea0de439c0dbda4b9e0f493bbcda36ed2`
  (source `67ec02b`; compose pin commit `74c3931`).
- `ALRIFAI_UNIFIED_AUTH_MODE=shadow`. Legacy Basic guard still answers workspace pages.
- Rollback chain (all present locally, ids verified 2026-10-29):
  `cace72aa…` → `80129758bf77…` (frontend USER fix, source `86379fb`) →
  `946635bd…` (session-revocation parity, source `c113784`) → `d405d54f…` → `2c0833c4…`.
- Login rate limiter **removed** (`67ec02b`, deployed on `cace72aa…`). Verified: 12
  consecutive wrong passwords from one client all return 401, never 429.

**Accounts (3 users in `cash_portal_users`)**
- `Admin` — ADMIN, Owner, active. Password set by the Owner on 2026-10-28 23:06 UTC
  through the UI; audit `PASSWORD_CHANGED`, `otherSessionsRevoked: 3`. Hash fingerprint
  `7a7b0d57` at 2026-10-29 pre-flight (fingerprints are md5 prefixes of `password_hash`).
- `officeassistant` — USER, active. Reset by the operator on 2026-10-29 04:38 UTC at the
  Owner's request (audit `PASSWORD_RESET`, surface `operator-sql`); the Owner then set
  their own password through the UI. Clean state.
- `officeazzistant2` — USER, active. Password changed by the user on 2026-10-28 22:26 UTC
  (`otherSessionsRevoked: 1`). Clean state, fingerprint `b0da7c4d` at pre-flight.

**Database and migrations**
- Migration `0031_cash_submissions_and_reviews.sql` **applied** 2026-10-29 04:30:42 UTC.
  Creates `cash_submissions`, `cash_submission_reviews`, view
  `cash_submission_review_state`, append-only triggers (`alrifai_foundation_append_only`),
  grants `SELECT, INSERT` to `ir_review_runtime`. Sha256 of the reviewed file `f803dbc6…`.
- Migration `0033_unified_auth_sessions.sql` applied 2026-10-28 05:50 UTC.
- Migration `0032_vessel_program_commands.sql` **NOT applied** (Vessel command API is
  unavailable; do not apply without a separate approval).
- Ledger `alrifai_schema_migrations`: **32 rows** (new baseline; was 31 before 0031).
- Freeze: **0 current postings**; 1,863 current instructions; postings across all epochs
  1,586 (legacy archive, not Current).
- Submissions: **1 row**, role `USER`, method `cash`, state `PENDING_REVIEW`, reviews 0.
  It is a functional-test row with purpose `TEST – migration 0031 acceptance – not a real
  payment`, but its employee name is `Muradul Alam`. Submissions are append-only, so the row
  is permanent. Owner decision required (see open items).

**WhatsApp (WA-01 degraded; WA-02 identity-only)**
- WA-01 `vps-whatsapp-wa-01-cap4-20261011`, up 46 h, bridge tree intact.
- 8 of 9 approved chats ingest normally. One **group** chat returns
  `NATIVE_READER_UNAVAILABLE` on every poll. Its last stored message is 2026-10-28 05:21 UTC.
- The bridge redacts all diagnostics by design (`whatsapp-mcp-server/capabilities.py`,
  `consumer_broker.py`). No environment switch exists, so the cause is not visible from logs.
- Newest WA-01 row 2026-10-29 03:40:53 UTC; 76 rows in the last 24 h vs 127 in the previous 24 h.
- No WA restarts were made. Bridge-side changes and consumer restarts are **deferred** on the
  Owner's instruction. Do not touch WA-01 without approval.
- WA-02 `vps-whatsapp-wa-02-cap4-20261011`, up 7 days, identity-only by policy. No rows since
  2026-10-25; not a fault.

**PostgreSQL:** `vps-infra-postgres-1` (`postgres:16-alpine`), healthy, up 10 days. Database `alrifai`.

**Verification baseline**
- Canonical suite (`package.json` "test" command) before Phase 6: 179 tests, 178 pass, 0 fail,
  1 pre-existing skip. Phase 6 result is recorded below once run.

**Open items (need the Owner)**
1. Review the test submission (row `f42fd870…`). Options: keep and label, or accept that it is permanent.
2. Confirm that the Admin review queue shows the test row (not yet reported).
3. Decide whether session `client_ip` should keep reading `x-forwarded-for` (metadata only;
   the limiter that used it is gone).
4. WA-01 failing group chat: diagnosis recorded; fix deferred by the Owner.
5. Off-host copy of backups (see `docs/VPS_MAP.md`, Backup convention).

**Deferred items and revisit triggers**
- Admin Panel reachability (`/admin` unreachable in shadow): revisit when a second Admin is added or credential rotation becomes routine.
- `/account` route: revisit when non-Owner users need profile management beyond the Cash Portal card.
- `on` mode: revisit when the Owner approves unified enforcement (this also removes the legacy Basic prompts).
- Username rename: revisit on Owner request; requires `on` mode.
- Sign-up queue: revisit when public sign-up requests need an approval workflow.
- Vessel Register redesign: revisit on Owner request.
- Public contact details: revisit when the Owner supplies verified contact information.
- PageNotice 360px: carried from the Owner's list; no detail is recorded in this session. Revisit with the Owner.
- Migration 0032 (Vessel commands): revisit when the Vessel command API is authorised.
- WA-01 failing group chat: revisit when the Owner prioritises it (needs bridge-side safe error codes, and a consumer restart or container recreate, each with approval).

**Process rules in force:** see `AGENTS.md` §13 (Operating rules).

---

## HISTORY — dated sections follow (superseded by the block above where they conflict)

## SESSION-REVOCATION PARITY DEPLOYED — 2026-10-28 20:53 (+01:00)

Image `sha256:946635bd3ba7e17c712d7ff4c96e6e1c93601323501fcc947b194306c0dcff96`
(source `c113784`) deployed to the app service only. Mode remains `shadow`;
PostgreSQL and both WhatsApp containers were not restarted.

Pre-deploy gate: 1 user, fingerprint `e4d99a36…`, 0 current postings, ledger 31,
rollback images `d405d54f…` and `2c0833c4…` present, candidate digest exact.
Safety net (not restored): `pre-revocation-deploy-20261028-2051.dump`
(`9b5acd7b…`).

Post-deploy: `/` and `/signup` 200, `/dashboard` 401 + challenge, `/cash` 200 with
a live login endpoint, `/employees` 183 rows with BDT totals, `/vessel-register`
200, 0 overflow at 1440/390; identity, sessions (31) and freeze unchanged; no app
errors.

**Feature verification (deployed):** the running build contains
`otherSessionsRevoked` in the cash route chunk. The end-to-end change-password
check requires the Owner's live credential and was **not** executed by the agent;
it is verified 16/16 on the identical digest in isolation. Owner procedure and the
post-check (audit row `PASSWORD_CHANGED` with `otherSessionsRevoked`) are recorded
in `apps/al-rifai/docs/UI-REDESIGN-20261028.md` §12.

**Rollback:** re-pin `sha256:d405d54f…`, `docker compose up -d --no-deps app`,
verify `/cash`.

## UI RELEASE DEPLOYED — 2026-10-28 19:59 (+01:00)

Image `sha256:d405d54f12001024b0e371edb72f1b93b62228d0c70ec6ed77b64e2121d6bdab`
(source `8e23fff`, HEAD `77cbcef`) deployed to the app service only.
`ALRIFAI_UNIFIED_AUTH_MODE` remains `shadow`; PostgreSQL and both WhatsApp
containers were not restarted (uptimes unbroken).

Verified after deploy: `/` and `/signup` 200, `/dashboard` 401 + Basic challenge,
`/cash` 200 with a live login endpoint, `/vessel-register` 200, `/employees`
renders with BDT totals (**Dipongkar BDT 40,306.00**), zero horizontal overflow at
1440/768/390, identity and freeze unchanged (1 user, fingerprint `e4d99a36…`,
30 sessions, 0 current postings, ledger 31). The two Cash layout fixes are present
in the deployed CSS bundle (`abd498c982318dd2.css`).

Safety net (not restored): `pre-ui-deploy-20261028-1958.dump`
(`b84392f5…`). Rollback images: `sha256:2c0833c4…` and `sha256:52105520…`.

**Account surface:** Cash Portal profile/password (username rename unsupported,
session revocation not yet on that path). Admin Panel remains unreachable in
`shadow`. Decision and revisit trigger:
`apps/al-rifai/docs/DECISION-2026-10-28-UI-RELEASE.md`.

**Next increment — READY, not deployed:** session-revocation parity on the Cash
Portal password endpoint. `revokeOtherSessions` now lives in `lib/cash-portal.ts`
as the single implementation used by both the Cash Portal and unified/Admin paths;
the Cash handler audits the revoked count and keeps the caller's session. 16/16
behavioural checks, 177 tests (176 pass / 1 skip), 60/60 responsive sweep.
Candidate `sha256:946635bd…` awaits deployment acceptance.

## RESPONSIVE UI/UX REDESIGN — 2026-10-28 (source only; NOT deployed)

Full responsive pass over the public site and every workspace page.

**Shared system** — `app/workspace.css` and `app/platform/ui.tsx` now provide
`PageHeader`, `SectionCard`, `TableShell` (tables become stacked record cards at
≤768px), `KpiCard`/`KpiGrid` with tone coding, `StatusPill`, `EmptyState`,
`ErrorState`, `LoadingSkeleton` and the provenance notice. Tokens, focus rings,
40px touch targets and reduced-motion support are defined once.

**Pages** — Dashboard (operational overview, recent instructions, explicit
instruction/verified/posted definitions), Employees (filtered vs all-record
totals, responsive master table, profile sheet), Transactions (filter bar with
filtered total, responsive ledger, evidence sheet), Admin Panel (header +
responsive account table; all guards untouched), Cash (mobile navigation strip,
stacked metrics), Vessel Register (existing responsive shell, palette aligned),
Insights/Income/Archive/Sources (shared primitives).

**Verification** — headless Chromium over CDP: 12 pages × 5 widths (360/390/768/
1280/1440) = **60/60 with zero horizontal overflow** (Insights, Income, Archive and
Sources included after fixing chart min-width, page scaffolding and the Cash 768px
offset/clipped mobile navigation); mobile drawer opens with
working links; Admin Panel rendered in an isolated `on` instance (1 account row,
all account-settings forms present, 0 overflow at 390/768/1440). 173 tests →
172 pass / 1 skip; typecheck, ESLint 0/0 and `next build` pass. Screenshots and
the defect list: `apps/al-rifai/docs/UI-REDESIGN-20261028.md`.

**Open finding** — the Admin Panel is unreachable while the mode is `shadow`
(Basic identity is never the Super Admin → 307 `/dashboard`). Credential changes
remain available through the Cash portal profile/password cards until `on` is
approved or a narrow session-authorised `/account` route is authorised.

**Authenticated Cash verification** — HTTPS harness with a self-signed cert and a
disposable password on the cloned Owner row: login 200, `__Host-` cookie present,
5 metrics / 12 nav links / 4 tabs / 100 rows, source dialog opens, employee tab 35
rows, 5/5 widths with zero overflow.

**Account management** — the Cash Portal changes the password safely (current
password, policy, confirmation, audit) but **not the username** (field disabled)
and does not revoke other sessions; the Admin Panel does both but is unreachable
in `shadow`. Recommendation: reuse the Cash Portal for the password, add
revocation parity, defer username rename to `on` or an approved `/account`.

**Candidate image** — `sha256:d405d54f12001024b0e371edb72f1b93b62228d0c70ec6ed77b64e2121d6bdab`,
built from `8e23fff` + verification fixes; **not deployed**. Production remains
`sha256:2c0833c4…` in `shadow`.

## OWNER SUITE — 2026-10-28 (source only; NOT deployed)

Three Owner requests implemented in source, tested and browser-verified. No
production deployment, migration, credential or authorization-mode change.

**1. Dipongkar payment audit (read-only).** 79 Current-epoch instructions for
`01880089543`; every stored amount matches its original WhatsApp text (79/79);
no duplicate source ref, command id, payload hash or same-day/amount pair; no
postings. True instruction total **BDT 40,306.00**. The reported
"BDT 4,030,600" was the same figure rendered from minor units without the /100
conversion in six workspace views. Fixed to `fmtBDT`. Record:
`apps/al-rifai/docs/DIPONGKAR-AUDIT-20261028.md`.

**2. Account Settings.** `/admin` already provided profile, username change and
password change with current-password reauthentication, confirmation and audit.
Added: password changes now revoke **every other session** for the account while
keeping the caller signed in, the revocation count is audited, and reusing the
current password is rejected (`PASSWORD_UNCHANGED`). Account id, historical
records and the single Cash credential store are untouched.

**3. Public website.** `/` and `/signup` are now public on both hosts: a
responsive corporate homepage (marine survey, security guarding, vessel escort,
about, contact, footer) with Login/Sign Up at the top right and a mobile drawer.
`/signup` explains that accounts are provisioned by an administrator and grants
nothing. The root no longer redirects to `/review` or `/cash`.
Entry allowlisting uses an exact-root check — adding `'/'` as a rule would have
matched as a subtree and exposed every path (caught by the entry tests).

**Validation.** 173 tests → 172 pass / 0 fail / 1 pre-existing skip; typecheck,
ESLint 0/0, `next build` and the Docker image build pass. Headless Chromium
against an isolated clone: **17/17** (desktop 1440×1000 and mobile 390×844
screenshots, homepage/signup DOM, no inflated total, Employees table shows
`BDT 40,106.00` for the filtered Dipongkar view).

**Candidate image.** `sha256:c64d92a13e2aa6a01e94f32e575c8a4c17f600484850baab4f45757288e62aaa`
(source `b0f4b45` + copy fix). Production still runs `sha256:2c0833c4…` in
`shadow`; deployment awaits approval.

**Not delivered.** The app-wide responsive/design-system refactor (Phase D) is
only partially done: the public site is fully responsive, the currency and status
labels are corrected, but the workspace pages keep their existing layout. A
structured UI pass remains open.

## SHADOW CHALLENGE REPAIR — 2026-10-28 (deployed, `shadow` retained)

**Second shadow defect, found by the Owner's click-through.** After the loop fix
the Owner signed in successfully (verified panel) but every protected link
dead-ended on `/login`. Measured: browser navigation to `/dashboard` returned
`302 → /login` with **no** `WWW-Authenticate`, while a non-navigation request
returned the correct `401` challenge. Shadow therefore suppressed the only
prompt that can supply the legacy credential, making the whole workspace
unreachable by click (Cash sidebar “Dashboard” and the panel's “Open workspace”).

**Fix (`a32c9ef`).** In `proxy.ts` the `/login` redirect now lives **inside** the
`mode === "on"` branch. In `shadow` the response falls through to the original
`401` + `WWW-Authenticate` (identical to `off`), so the browser prompts and the
workspace opens. Tests model the challenge (`tests/unified-auth-shadow-loop.mjs`)
and assert the branch ordering.

**Validation.** 167 tests → 166 pass / 0 fail / 1 pre-existing skip; typecheck,
ESLint 0/0, `next build` pass; isolated clone with the new image **13/13**
(shadow+cookie `/dashboard` 401+challenge, shadow+Basic `/dashboard` 200,
`/admin` 307→`/dashboard`, `/login` 200, `off` unchanged, `on` 307→200, Cash
200).

**Deployment.** Image `sha256:2c0833c4860a2a3ee6b23a87d937622ad628f2419dd6e7e1ae2c9ab6fb162d7f`
(source `a32c9ef`); only `al-rifai-app-1` recreated; mode stays `shadow`; no
migration; PostgreSQL and WhatsApp untouched. Rollback images:
`sha256:960ee047…` (loop fix) and `sha256:52105520…` (pre-repair candidate).

**Production after deploy.** `/dashboard` and `/admin` → `401` + Basic challenge;
`/dashboard` with the legacy credential → **200**; `/admin` with it →
`307 /dashboard`; `/login` 200 with or without an invalid cookie; `/cash` 200;
health ok; no error lines. Identity: 1 user, fingerprint `e4d99a36…`, version 2,
29 sessions (7 unexpired), 38 audit rows, ledger 31, 0 current postings.

**Awaiting the Owner:** open `https://app.al-rifai.iamazim.com/dashboard` (or
click Dashboard from Cash) — the browser should now ask for the private entry
username/password; enter the existing `validator` credential and the workspace
opens. `on` mode still requires a separate explicit authorization.

## SHADOW REDIRECT-LOOP REPAIR — 2026-10-28 (deployed, `shadow` retained)

**Incident.** The Owner opened `/login` and the browser reported
`ERR_TOO_MANY_REDIRECTS`. Two `LOGIN` audit events (`surface=unified`, 08:35:24Z
and 08:36:23Z) prove the Cash credential was accepted; the failure was the
post-login redirect, not authentication.

**Root cause.** `app/login/page.tsx` forwarded *any* visitor holding a valid
session to `next` (`if (identity) redirect(next)`), while `proxy.ts` deliberately
refuses to authorise a session outside `on` mode. Chain: `/login` **307** →
`/dashboard` **302** → `/login?next=%2Fdashboard` **307** → … until the browser
aborted. Shadow-only: `off` returns 401 and `on` authorises, so neither loops.

**Fix (`cc10ed8`).**
- `lib/unified-auth-policy.ts`: new pure `signedInRedirectTarget(mode, next)` —
  returns a sanitised target **only** in `on`.
- `app/login/page.tsx`: uses that guard; in `shadow` it renders the page and
  passes the verified display name instead of redirecting.
- `app/login/view.tsx`: shadow sign-in shows a “credential verified” panel that
  explains the workspace still needs the private entry credential, offers
  “Open workspace” and “Use a different account”; it stores no token and creates
  no extra session on refresh.
- Tests: `tests/unified-auth-shadow-loop.mjs` replays the two cooperating
  decisions with a valid session, proves the **pre-fix rule loops**, and proves
  the shipped policy terminates (shadow 1 hop, dashboard/admin/review 2 hops
  ending on `/login`, off 401, on 307→200). Suite total now 166 tests.

**Validation.** 166 tests → 165 pass / 0 fail / 1 pre-existing skip; typecheck,
ESLint (0/0), `next build` pass. Isolated clone rehearsal with the new image and a
real session cookie: **21/21** checks pass, including “no loop”, “credential
verified” rendering, no extra sessions across three refreshes, Cash login intact,
Basic intact, no escalation, `off` 401, and `on` (isolated only) 307→200.

**Deployment.** Image `sha256:960ee047b7a9ce880a01885794835debd45286c1d780bbb8d36eff3abd35fc43`
(source `cc10ed8`); only `al-rifai-app-1` recreated; `ALRIFAI_UNIFIED_AUTH_MODE=shadow`;
PostgreSQL and both WhatsApp containers untouched; no migration applied.
Previous image `sha256:52105520…` retained for rollback.

**Production verification.** `/login` 200 with 0 redirects; `/dashboard`,
`/admin`, `/review` each resolve in one hop to `/login`; an invalid/stale cookie
also returns 200; no verified panel without a session; `/cash` 200; health ok;
1 user / 26 sessions (5 unexpired) / audit 35 / fingerprint `e4d99a36…` / version
2 / ledger 31 / 0 current postings — all unchanged.

**Awaiting the Owner:** reload `https://app.al-rifai.iamazim.com/login`; the form
should render (or the verified panel if a session cookie is present). Signing in
again should show the confirmation panel, not the loop. `on` mode still requires a
new explicit authorization.

## UNIFIED AUTH PRODUCTION ACTIVATION — 2026-10-28 (stages 1–3 done, `shadow` live)

Owner-authorized production execution. **Three stages performed; `on` mode was not
authorized and was not enabled.**

**Stage 1 — pre-flight (read-only gate, passed).** Commit `967e026` (docs-only after
the image commit `47f7e11`), candidate image present with the approved digest,
rollback image present, PostgreSQL healthy, WA-01/WA-02 running and untouched, Cash
portal serving `/cash` 200, unified endpoints not exposed. Identity matched the
baseline exactly (one `Admin` row, id `81a73b32…c79`, ADMIN, active, version 2,
fingerprint `e4d99a36…`, 24 sessions, 3 unexpired). Super Admin list holds exactly
that id. Ledger was 30 rows.

**Stage 2 — fresh backup (gate passed).**
`/var/lib/vps/al-rifai/backups/pre-0033-20261028.dump`, 61 MB,
sha256 `2093fadf36082e97b58e66b17b95f7a7756671ed18288154b414d992616e5810`,
61 table-data sections, `pg_restore -l` OK. Isolated restore into throwaway
Postgres 16 reproduced **every** critical count and the password fingerprint
(`RESTORE_FIDELITY=MATCH`). Config rolled back up first:
`/var/lib/vps/al-rifai/backups/pre-unified-deploy-20261028/`.

**Stage 3 — migration 0033 applied.** File sha256
`c7e05dae48389ac79758b8d633279bb2a9017fb2174812da3315b3eef6ab9158`, unmodified vs
HEAD, applied in its own transaction with `ON_ERROR_STOP` (exit 0), ledger row
inserted with the same sha256 → **31 rows**, newest
`0033_unified_auth_sessions.sql`. Verified: `capabilities` jsonb NOT NULL default
`'[]'`, `username_changed_at` present, CHECK constraint present, guard trigger
`cash_portal_users_guard` enabled (BEFORE UPDATE/DELETE), guard function present,
audit grants `INSERT,SELECT`, users grants unchanged (`INSERT,SELECT,UPDATE`).
Users 1 / sessions 24 / audit 33 / fingerprint / Cash counts all unchanged.
`0031` and `0032` were **not** applied.

**Stage 4 — deployed with mode `off`.** `compose.yaml` re-pinned to
`sha256:52105520…`; only the `app` service recreated (`--no-deps`). Verified:
healthy, `/api/health` ok, `/cash` 200, Cash login endpoint live
(`INVALID_CREDENTIALS` for a wrong credential), unified endpoints still 401,
`/login` `/dashboard` `/review` `/admin` all 401 without Basic, Basic → `/api/core`
200, TLS entry correct (workspace 401, cash host 200, unknown host 403), mirror
disabled, WhatsApp outboxes empty, freeze intact.

**Stage 5 — `shadow` enabled.** Mode set in `app.env`, only the `app` service
recreated. Verified: health ok; `/login` 200 publicly; failed unified login → 401
`INVALID_CREDENTIALS` with **no** cookie; missing fields → 400; foreign origin →
403 `ORIGIN_DENIED`; `/dashboard` document navigation → `302 /login?next=%2Fdashboard`
and `/api/core` → 401 (no session authorization in shadow, fail closed); Basic →
`/api/core` 200 and `/dashboard` 200; `/admin` without Basic → 401, and with the
validator credential → `307 /dashboard` (validator is not the Super Admin);
`/api/cash/users` with Basic → 401 (Cash boundary unchanged). Sessions stayed 24,
audit stayed 33, fingerprint unchanged, no errors in the app log.

**Awaiting the Owner** (not done): personal `/login` confirmation with the existing
Cash username/password, then a new explicit authorization for
`ALRIFAI_UNIFIED_AUTH_MODE=on`. The `validator` guard stays; no credential, session
or Cash record was changed.

## UNIFIED AUTH FINAL VERIFICATION — 2026-10-28 (release candidate prepared, NOT deployed)

Owner-authorized final verification and release preparation. **No production
migration, deployment, restart, mode change or credential change occurred.**

- **Source pushed:** `git push origin main` → `433b1ed..47f7e11` (fast-forward).
  Local and remote both at `47f7e11`; working tree clean; secret scan of the pushed
  range found no credential/token/key material.
- **Candidate image:** `local/al-rifai:20261028-unified-auth`,
  digest `sha256:52105520fa0e288a05955bdac9ea7c12daed09f5304d3a3ab6472fc5b8139a97`,
  built from `47f7e11`. Production image `sha256:5f3e2aad…` remains pinned in
  `compose.yaml` and `al-rifai-app-1` was not recreated.
- **Backup:** `/var/lib/vps/al-rifai/backups/pre-unified-auth-20261028.dump`,
  sha256 `b1f8c8fa9f5061f896ba7e00ed2245cb60e269a93b85be73e7b7f185bc309792`,
  restore rehearsed successfully into a throwaway Postgres 16.
- **Identity re-verified (read-only, Cash role, read-only transaction):** one
  account, id `81a73b32…c79`, `Admin`, ADMIN, active, version 2, 24 sessions,
  fingerprint `e4d99a36533187eecd5f9d4f515f7ca3` — identical to the baseline, before
  and after every rehearsal. `ALRIFAI_CASH_SUPER_ADMIN_IDS` holds exactly that id;
  no duplicate or conflicting Super Admin identity.
- **Tests:** 157 tests → 156 pass / 0 fail / 1 pre-existing skip; `workflows`,
  `source-register`, `phase1-unit` pass; typecheck, ESLint (0/0) and
  `next build --webpack` pass; the Docker image build re-runs typecheck/lint/build.
- **Migration 0033 rehearsal:** applies twice idempotently, changes no user/session/
  audit row and no hash; guard trigger blocks demoting/deactivating/deleting the
  final active ADMIN and permits everything legitimate; documented rollback ladder
  restores the pre-migration schema, grants and data. **Still unapplied.**
- **Runtime rehearsal:** candidate image against a throwaway clone — 36/36 checks
  pass (login, cookie name, `/admin` gate, no self-escalation, `workspace.admin`
  refusal, last-admin protection, audit read after 0033, legacy Basic fallback,
  logout, `shadow` and `off` behaviour). Rehearsal containers/networks removed.
- Full record, exact deployment/rollback sequence and remaining approvals:
  `apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md`.

Next session starts from `47f7e11` + the release-candidate record; the five Owner
approvals in §7 of that record are the gate to any production step.

## UNIFIED SUPER ADMIN AUTHENTICATION — 2026-10-28 (source only, NOT deployed)

Owner directive: the existing working Cash Portal username/password is the
credential baseline and must be preserved exactly; no second technical password
for the Owner; the Cash account becomes the unified Super Admin identity.

Delivered (source + tests only — **no deploy, no restart, no migration, no user
row touched**):
- `lib/unified-auth-policy.ts` (pure policy), `lib/unified-auth-db.ts` (session
  loader), `lib/unified-auth.ts` (login/logout/self-service, mode-gated).
- `/login` + `POST /api/auth/{login,logout,session,password,username}`; identity
  reuses `public.cash_portal_users`/`cash_portal_sessions` and the deployed
  `__Host-alrifai_cash` cookie, so every live Cash session stays valid.
- `/admin` Admin Panel (server-gated on the configured Super Admin): profile,
  voluntary username/password change, create accounts, role + capability
  assignment, enable/disable, read-only audit history.
- `proxy.ts` gains a fail-closed dual path: legacy Basic is checked **first** and
  always accepted; `ALRIFAI_UNIFIED_AUTH_MODE` (`off` default → deployed
  behaviour, `shadow` → sign-in proven only, `on` → session accepted).
- `GET /api/cash/audit`, capability-aware `PATCH /api/cash/users/:id`, and
  `LAST_SUPER_ADMIN_PROTECTED` in addition to `LAST_ADMIN_PROTECTED`.
- Prepared, **unapplied** `db/migration-candidates/0033_unified_auth_sessions.sql`
  (additive: `capabilities`, `username_changed_at`, audit SELECT grant, final-admin
  guard trigger; no data mutation).
- 28 new tests (policy + wiring); typecheck, lint and `next build` pass; isolated
  runtime rehearsal against a throwaway Postgres (own container/network, removed
  afterwards) passed 30/30 checks.

Verified production identity mapping (read-only, 2026-10-28): exactly one Cash
account — id `81a73b320d9d56c175b48552a648b7405659dc814921bf12be38927f07b72c79`,
username `Admin`, role ADMIN, active, hash fingerprint
`e4d99a36533187eecd5f9d4f515f7ca3` — and `ALRIFAI_CASH_SUPER_ADMIN_IDS` contains
exactly that id. 24 live sessions; newest activity 2026-10-28T03:33Z.

Gate before any cutover: Owner approval of migration 0033, of the image build, and
of `ALRIFAI_UNIFIED_AUTH_MODE=shadow` → `on` in `/etc/vps/apps/al-rifai/app.env`.
The validator Basic guard is deliberately retained as the fallback.
Full report: `apps/al-rifai/docs/UNIFIED-AUTH-DESIGN.md`.

---

## UI VISIBILITY REPAIR — 2026-10-27 (deployed)

Root cause: the workspace routes existed in the image but the private-entry proxy
allowlists and legacy sidebars never exposed them (`/dashboard` etc. returned
404; `/vessel-register` was reachable only via the `/vessel` prefix accident).

Fix (`a157f58`):
- new `release/entry-rules.mjs` — boundary-exact allowlists (exact path or
  `/path/…`, subtree only for explicit `/api/.../`, `/_next/`, asset prefixes;
  traversal/`//` rejected). Both hosts now allow the nine workspace routes;
  Cash host additionally allows `/api/operations`, `/api/assistant`,
  `/api/vessel-programs`, `/api/health`. Cash host keeps its restricted API set.
- `release/private-entry.mjs` uses the tested rules; no auth change.
- Cash and Vessel legacy sidebars gained a visible “PLATFORM WORKSPACE” group
  linking Dashboard, Vessel Register, Transactions, Employees, Sources & Review,
  Insights, Income & Expenditure, Archive, Assistant; all legacy items kept.
- Dockerfile ships `entry-rules.mjs`; 5 new allowlist tests (129 total).

Deployed image: `sha256:5f3e2aad0916f66f99c7af13339929ba8e0e041ef904de957c5d2f64244f3b06`
(tag `local/al-rifai:owner-approved-20261027-ui-repair`, revision `a157f58`),
app service only, healthy, workers running. Previous image `34ce3060…` and
compose backup `/var/backups/vps/al-rifai-compose-pre-uirepair-20261027T211142Z.yaml`
retained for rollback.

External route verification (post-deploy):
- Cash host: workspace routes 401 (auth) instead of 404; `/cash`,
  `/cash/archive`, `/cash/submissions` 200; `/vessel` 401; `/api/unknown`,
  `/candidate-api/*`, `/vesselx`, `/cashier`, `/dashboard-evil` 404.
- Main host: workspace routes 401; `/review`, `/vessel`, `/register` 401;
  `/cash` 404 (unchanged boundary).
- Served Cash bundle contains “PLATFORM WORKSPACE” and the workspace labels.
- **Authenticated browser-rendered verification is PENDING** — no Owner
  credentials were available to the agent; the Owner should load
  `https://alrifai.iamazim.com/cash`, sign in, and confirm the new group, then
  visit `/dashboard` with the existing validation credential.

---

## FINAL SYSTEM STATE — 2026-10-27 (safe stop, Owner break)

**Start here next session.**

| Item | Value |
|---|---|
| Production image | `sha256:5f3e2aad0916f66f99c7af13339929ba8e0e041ef904de957c5d2f64244f3b06` (UI repair) |
| Released source commit | `2881926` (packaging fix); compose pin committed |
| Git HEAD / sync | `dc3b92b` (docs) · `origin/main` synchronized · working tree clean |
| App health | healthy, 0 restarts; workers running ("Live Cash continuation started (review-only)") |
| PostgreSQL | healthy, Up 9 days, 30 ledger rows |
| WA-01 / WA-02 | Up (no container healthcheck by design); MCP sockets present; no sends |
| Cash Freeze | intact — 1,842 current-epoch instructions, **0 current postings**; posting env absent |
| Database backup | `/var/backups/vps/alrifai-pre-0031-0032-20261027T203833Z.dump` (63.8 MB) · sha256 `e38086b30390426b756054b6900634fa250b30b667dd5ee37498245f433d10e0` (re-verified) |
| Compose backup | `/var/backups/vps/al-rifai-compose-20261027T204929Z.yaml` |
| Rollback image | `sha256:34ce3060…` (previous release) and `sha256:049627fa…` (pre-platform) both present |
| Migrations 0031/0032 | **READY FOR OWNER APPROVAL — not applied** (hashes + commands in `docs/MIGRATION-READINESS-0031-0032.md`) |

### Rollback (application only)
```bash
cd /opt/vps/apps/al-rifai
cp /var/backups/vps/al-rifai-compose-20261027T204929Z.yaml compose.yaml
docker compose -p al-rifai up -d --no-deps app
docker inspect al-rifai-app-1 --format '{{.Image}}'   # expect 049627fa…
curl -fsS http://127.0.0.1:3000/api/health
```

### Known risk register
1. Migrations 0031/0032 are absent, so `/cash/submissions` shows the dependency
   banner and `/vessel-register` commands are disabled — expected and safe.
2. WhatsApp TXT import runtime lacks the Python parser in the image; import API is
   not exposed in the deployed UI (deferred, needs image change).
3. Legacy `programs` UPDATE remains revoked; command layer is the intended path.
4. `ALRIFAI_VESSEL_COMMAND_ACTOR` is unset (falls back to Cash Owner person ref)
   until migrations are approved and an actor is confirmed.

### Next-session starting point
Apply 0031 → 0032 with the documented backup/verification sequence (Owner
approval gate), verify post-migration checks, then run the read-only acceptance
probes and update the handoff. No other implementation cycle is open.

---

## CONTROLLED RELEASE — 2026-10-27 (application-only, migrations NOT applied)

- Source `main` at `2881926` (release fix); pushed fast-forward to
  `origin/main` (`17e004d..2881926`). Working tree clean.
- **Deployed image:** `sha256:34ce306018641a4c074d07c67acfd6e9800197764904ae4a7862615f43e6b3a5`
  (tag `local/al-rifai:owner-approved-20261027-platform2`), built from
  `2881926` with the approved BuildKit evidence mount, `--provenance=false`.
- Dockerfile SHA-256: recorded in the release build log; image label
  `org.opencontainers.image.revision=2881926…`.
- First deployment attempt (`b51233af…`) exposed a packaging defect: the vessel
  worker imports `lib/duplicate-identity.ts`, which the runtime COPY list
  omitted. **Rolled back immediately** to `049627fa…`; fixed the Dockerfile
  (`fix(build): ship duplicate classifier with the vessel worker runtime`),
  rebuilt and redeployed. Workers verified: "Approved scope loaded: 9 chat
  addresses across 7 conversations", "Live Cash continuation started
  (review-only)", 0 restarts, healthy.
- **Database:** backups taken before release:
  `/var/backups/vps/alrifai-pre-0031-0032-20261027T203833Z.dump`
  (63.8 MB, sha256 `e38086b30390426b756054b6900634fa250b30b667dd5ee37498245f433d10e0`),
  archive readable (517 entries / 61 table-data items). Full restore into an
  isolated PostgreSQL matched live counts (programs 84, escort rows 994,
  employees 181, whatsapp originals 13,819). Migrations 0031 + 0032 rehearsed
  against the restored clone: business-table counts unchanged
  (`1586/3452/84/994`), submission→approval projection `ACTIVE_REVIEWED`,
  append-only update blocked, vessel add idempotent replay verified.
- **Migrations 0031/0032 remain NOT APPLIED** in production (30 ledger rows;
  `cash_submissions` and command functions absent). The deployed app is designed
  for this: `/cash/submissions` shows the dependency banner, `/vessel-register`
  commands stay disabled, all reads work.
- **Post-deploy checks:** `/api/health` ok; all platform/legacy routes return
  expected auth status (401 unauth, Cash pages 200 login); current-epoch
  instructions 1,842 with **0 postings** (Cash Freeze intact); WA-01/WA-02 and
  PostgreSQL untouched; no evidence hashes or markers in the image (0/2,952
  files matched evidence hashes).
- **Rollback:** previous image `sha256:049627fa…` present; effective compose
  backup `/var/backups/vps/alrifai-compose-20261027T204929Z.yaml`. Rollback
  command: restore that file and `docker compose -p al-rifai up -d --no-deps app`.
- **Next:** Owner approval to apply 0031/0032 (migration readiness pack) and to
  set `ALRIFAI_VESSEL_COMMAND_ACTOR` if the Cash Owner ref is not the intended
  actor; then the command API/queue activate automatically.

---

## IMPLEMENTATION SESSION 3 — 2026-10-27 (Vessel command integration & migration readiness)

### Source state
- `main` HEAD `53b7ae3` (feature commits `6df2352` API, `53b7ae3` UI); base
  `625d9e6`. Working tree clean; origin/main still `17e004d` (no push).
- Production unchanged: app image `sha256:049627fa…` running; candidate
  `sha256:d6f274…` undeployed; no migrations applied.

### Completed (tested, committed)
1. **Vessel command API** `app/api/vessel-programs` — GET program detail + audit
   history + linked WhatsApp source; POST add/edit/release/assign/replace/void.
   Server-side auth (`local-validator` only), server-resolved actor
   (`ALRIFAI_VESSEL_COMMAND_ACTOR`, fallback `ALRIFAI_CASH_OWNER_PERSON_REF`),
   zod validation, deterministic program ids, optimistic revision checks and
   command-key idempotency enforced in the SQL functions, safe error mapping
   (`REVISION_CONFLICT` 409, `PROGRAM_NOT_FOUND` 404, migration dependency 503).
2. **0032 revised and re-rehearsed** — functions now take `expected_revision` and
   `command_key`, reject stale revisions, replay idempotently, keep one appended
   event per command, stay EXECUTE-only, use fixed `search_path`, require a
   VERIFIED person actor, and never DELETE. Rehearsal: ledger 6 events / revision
   5 / Voided retained / 2 assignment revisions / direct UPDATE+DELETE denied /
   stale revision rejected / replay appended nothing / Cash untouched.
3. **Vessel Register UI** `/vessel-register` (new sidebar item) — searchable
   program table, details sheet, audit history, WhatsApp source viewer, Add/Edit/
   Release/Assign/Replace/Void drawers and dependency-aware disabling. Nothing
   is presented as saved until the server confirms; the legacy register stays.
4. **Cash approval verification** — 0031 rehearsal re-run: PENDING_REVIEW
   projection, duplicate payload rejection, self-approval rejection, append-only
   UPDATE/DELETE block, repeated decisions append, `cash_postings`=0, INSERT+
   SELECT-only grants. Endpoint policy tests (role scope, reviewer≠submitter,
   CSRF/origin inherited from the existing portal auth) pass.
5. **Migration readiness pack** — `docs/MIGRATION-READINESS-0031-0032.md` with
   exact schema, compatibility, ordering, roles, backup/restore rehearsal,
   execution and post-verification commands, and forward-recovery strategy.

### Verification evidence
- `pnpm test`: **124 tests, 123 pass, 1 skipped, 0 fail**.
- `pnpm typecheck` pass; `pnpm build` pass (routes `/vessel-register`,
  `/api/vessel-programs`); lint clean for changed files.
- Isolated PostgreSQL: bootstrap + 0031 rehearsal + 0032 rehearsal all
  `..._OK`; Python parser suite OK.

### Still open / Owner decisions
- Apply 0031 + 0032 to production and set `ALRIFAI_VESSEL_COMMAND_ACTOR` (or rely
  on the Cash Owner person ref); command UI stays locked until `available:true`.
- Deploy the platform UI image and record commit↔image traceability.
- Outbound WhatsApp draft delivery; salary rules; legacy program UPDATE policy.

---

## IMPLEMENTATION SESSION 2 — 2026-10-27 (Cash approval workflow + Vessel command layer)

### Source state
- `main` commit `2805879`; unit commits: `b8bd93d` (Cash submissions/approval
  API + queue UI + rehearsed schema), `1c604be` (Vessel SECURITY DEFINER command
  layer, prepared + rehearsed), `2805879` (submissions UI, shadow duplicate
  classifier, vessel report panel). Base: `582e5e9`.
- Production unchanged: image `sha256:049627fa…` running; candidate
  `sha256:d6f274…` still undeployed. No push, no migration applied to production.

### Completed (tested, committed)
1. **Cash submissions & approval (Priority 2)** — endpoints
   `POST/GET /api/cash/submissions` and `POST /api/cash/submissions/:id/decision`
   with PENDING_REVIEW, role-scoped reads (ADMIN all / USER own), CSRF+origin
   enforcement, reviewer≠submitter, append-only decisions, duplicate payload
   idempotency, and explicit `MIGRATION_0031_…_NOT_APPLIED` dependency response
   when the schema is absent. Pure policy: `lib/cash-approval.ts`; validation:
   `lib/cash-submission.ts`. UI: `/cash/submissions` (submit, queue, decisions,
   audit history) linked from the Cash portal sidebar.
2. **Prepared schema 0031** — `cash_submissions` + `cash_submission_reviews`
   (append-only triggers, reviewer≠submitter, INSERT/SELECT-only runtime grants,
   projection view, no ledger inserts). Rehearsed in isolated PostgreSQL:
   PENDING_REVIEW projection, duplicate rejection, self-approval rejection,
   UPDATE/DELETE blocked, repeated decisions append, zero cash_postings.
3. **Vessel command layer (Priority 1, prepared)** — `0032` adds five SECURITY
   DEFINER functions (add, edit, release, assign/replace, void) requiring a
   VERIFIED person actor, revision+1 and one appended `programCommand` event,
   granting EXECUTE only (no table UPDATE/DELETE). Rehearsed: 6 ledger events /
   revision 5 / Voided status preserved, 2 assignment revisions, direct UPDATE
   and DELETE denied to the runtime role, unverified actor rejected, Cash
   untouched. **Not applied; UI remains read-only until approved.**
4. **Duplicate classifier shadow integration** — `ALRIFAI_DUPLICATE_CLASSIFIER=SHADOW`
   (default off) records EXACT/PROBABLE/AMBIGUOUS/DISTINCT evidence in
   `parsed.duplicateClassification` without changing candidate selection or
   writes. Tests cover both flag states.
5. **Vessel reports UI** — `/insights` now includes a mother-vessel report with
   program/escort counts, honest "Not recorded" payroll columns and CSV export.

### Verification evidence
- `pnpm test`: **118 tests, 117 pass, 1 skipped, 0 fail** (includes 6 approval,
  6 submission, 6 integrity, 10 duplicate, 8 payroll, 5 report, 8 Python parser).
- `pnpm typecheck`: pass. `pnpm build`: pass (after fixing relative CSS import in
  the new page). Isolated DB rehearsals: `REHEARSAL_OK`,
  `VESSEL_COMMANDS_REHEARSAL_OK`.
- Rehearsal bootstrap: `tests/sql/rehearsal_bootstrap.sh` recreates a throwaway
  database, applies all migrations + candidates, requires a fresh container.

### Still open / blocked
- Applying 0031/0032 to production and enabling the command UI: Owner decision.
- Register command UI wiring (buttons/drawers) remains disabled until 0032 is
  approved; the migration is rehearsed but no endpoint calls it yet.
- Cash submission endpoint returns 503 with the dependency while 0031 is absent.
- Outbound WhatsApp draft delivery, salary business rules, program UPDATE grants
  remain Owner decisions.

---

## IMPLEMENTATION SESSION — 2026-10-27 (post-audit, authoritative for code state)

### Source state
- Branch `main`, commits: `9f00e17` (Cash user policy), `bde9799` (Vessel
  confirmation integrity), `17358d1` (duplicate classification + payroll engine),
  `58972b9` (Admin order drafts UI), `85a438c` (import formats + vessel reports),
  `c93762d` (prepared Cash review migration + submission validation).
  Base before this session: `d5dfef28…`.
- Production unchanged: app image `sha256:049627fa…` running; candidate
  `sha256:d6f274…` built but NOT deployed. No push to origin/main.

### Completed (tested, committed)
1. **Cash user security (A)** — `lib/cash-user-policy.ts` + route guards:
   only a Super Admin may create/promote ADMINs, reset ADMIN passwords, or
   edit/demote/deactivate ADMIN accounts; the final active ADMIN can never be
   removed; USER targets remain editable by any ADMIN. Audit detail payloads now
   record role/active before/after. Tests: `tests/cash-user-policy.mjs`.
2. **Vessel confirmation integrity (B)** — verified-Admin sender gate wired into
   `scripts/process-vessel.ts` (sender must match the paired Owner identity);
   Shift is supporting evidence in `lib/vessel-match.ts` (conflict ⇒ AMBIGUOUS,
   agreement may break ties); new programs persist
   `details.sourceMessageId`. Tests: `tests/escort-confirmation-integrity.mjs`,
   extended `tests/vessel-match.mjs`.
3. **Duplicate classification (D)** — `lib/duplicate-identity.ts` implements the
   ±1-day rule with alias-aware vessel matching, release-point/shift
   normalization and EXACT/PROBABLE/AMBIGUOUS/DISTINCT explanations; only EXACT
   replays are suppressible. Tests: `tests/duplicate-identity.mjs`.
4. **Payroll engine (G)** — `lib/payroll-rules.ts` (configurable employee rate,
   separate customer charge, additive transport, release-day policies
   HALF_DAY_ENDS/INCLUSIVE/EXCLUSIVE, unresolved states). BDT 450 remains a
   PROPOSED configurable default. Tests: `tests/payroll-rules.mjs`.
5. **Admin order drafts (E)** — `lib/order-draft.ts` composes the draft from a
   verified client order; Sources & Review has a new "Admin drafts" tab with
   review, provenance, gap/warning display and Copy. No sending; WA tools
   unchanged. Tests: `tests/order-draft.mjs`.
6. **Reports/import (H)** — WhatsApp TXT parser now accepts plain/bracketed,
   24-hour and AM/PM exports (occurrence ids preserved); read-only vessel report
   aggregates + CSV in `lib/vessel-reports.ts`. Tests:
   `tests/test_parse_import_formats.py` (8 passing), `tests/vessel-reports.mjs`.
7. **Cash submission/approval (F, prepared)** — `lib/cash-submission.ts`
   validation/hash (PENDING_REVIEW, no posting) and prepared migration candidate
   `db/migration-candidates/0031_cash_instruction_reviews.sql` (append-only,
   reviewer ≠ submitter, no UPDATE/DELETE grants, no postings). NOT applied.
   Tests: `tests/cash-submission.mjs`.

### Verification evidence (this session)
- `pnpm test`: 111 tests, 110 pass, 0 fail (1 skipped).
- `pnpm typecheck`: pass. `pnpm build`: pass. New/changed lint: clean.
- Python parser tests: 8/8 pass.
- Full-suite runs used the ephemeral `node:22.23.3-bookworm` container with the
  evidence directory mounted read-only; no production access.

### Still open (not implemented / blocked)
- Register write UI (Add/Edit/Release/Assignment) and program UPDATE grants:
  BLOCKED on Owner decision (restore UPDATE vs SECURITY DEFINER commands).
- Draft delivery to the Admin via WhatsApp: BLOCKED — no outbound authorization.
- Cash submission/approval endpoints + migrations: prepared only; need Owner
  authorization and an isolated DB rehearsal.
- Register CONFIRMED state/Running/attendance: unimplemented.
- Salary business meaning of BDT 450, release-day policy and transport approval:
  Owner decision required.
- Image-to-commit traceability and deployment: pending Owner approval.

### Corrections to earlier documentation
- `ALRIFAI_CASH_SUPER_ADMIN_IDS` is **present** (1 id) — earlier "absent"
  statements are stale.
- Vessel register counts drift daily; treat AGENTS §0.2 figures as historical.
- `docs/VESSEL-WORKFLOW.md` claims "no confirmation writer / 0 programs /
  confirmation_message_id never populated" were stale; the writer and 79
  programs exist. Its L369–370 notes about `Lighter Name:`/serial stripping are
  also stale (both implemented).

---

## Session 3 Summary (2026-10-21)

### Completed
1. Bridge Dockerfile — wget added for health checks
2. Bridge images rebuilt (tag cap4-20261011)
3. Bridges recreated (wa-01 and wa-02)
4. Socket access verified: App UID 10001 to both bridge sockets
5. P1 systemd-tmpfiles installed at /etc/tmpfiles.d/vps-whatsapp-control.conf

### Remaining for Next Session
- STEP 3: MCP container inventory and ownership audit (7 MCP containers running)
- STEP 5: Final documentation polish
- Git repo: Initialize /opt/vps as git repo
- Bridge health endpoint: Test wget health check from inside bridge containers
- Permission persistence P2 (backup): If P1 fails after reboot, apply P2

### Correct Compose Commands

    Bridge ps:
    docker compose -p vps-whatsapp-cap4-wa01 -f /opt/vps/services/whatsapp/compose.yaml --profile wa-02 ps

    Bridge recreate (requires Owner confirmation each time):
    docker compose -p vps-whatsapp-cap4-wa01 -f /opt/vps/services/whatsapp/compose.yaml --profile wa-02 up -d --no-deps --force-recreate whatsapp-wa-01 whatsapp-wa-02

    After recreate, fix permissions:
    sudo systemd-tmpfiles --create /etc/tmpfiles.d/vps-whatsapp-control.conf

### Permission Model
- wa-01/control: 0710, owner 10002:10002
- wa-02/control: 0710, owner 10003:10003
- mcp.sock: 0660, bridge UID:GID
- App UID 10001, groups 10002 and 10003

### P2 Backup Plan (if P1 fails after reboot)
If control dirs revert to 0700, add this line to
/opt/vps/services/whatsapp/source/service-entrypoint.sh before supervisor exec:
    chmod 0710 /runtime/control 2>/dev/null || true
Then rebuild bridge image and recreate containers.

## Goal-driven continuation — 2026-10-22, 14:49 CEST

### Current

- The Vessel URL-state change remains in the worktree and is not deployed.
  The Cash-page link is still `/vessel`; that route exists. API requests
  continue to include their prior `source`, `page`, `sort`, and filter
  defaults. Browser URLs omit untouched defaults, retain explicitly supplied
  base state and non-empty filters, and use `replaceState` only when the URL
  changes.
- A React lint issue in the URL-state ref initialization was corrected in
  `apps/al-rifai/app/vessel-dashboard.tsx`; no Cash behavior was changed.
- Authenticated browser rendering and the deployed browser URL remain
  unverified; this continuation did not deploy the worktree change.
- Cash's displayed date is derived from `cash_instructions.source_time` and
  rendered in `Asia/Dhaka`. The existing scope is `wa-01` / `Cash Payment`;
  its latest-row ordering is `source_time DESC, id DESC`. The table schema
  includes `created_at`. The exact production timestamp for the reported
  2026-10-18 row remains unavailable: the prior bounded query was denied on
  `cash_instructions` for role `alrifai_app`. No permission bypass, broader
  grant, or authenticated endpoint probe was attempted.
- Read-only runtime observation: `/api/health` returned `{"status":"ok"}`;
  the app and PostgreSQL were healthy, and both WhatsApp bridges were running.
  No deployment, restart, migration, financial write, or bridge operation was
  performed.
- The initial worktree was already dirty in `/opt/vps`, `apps/al-rifai`, and
  `services/whatsapp/source`, including unrelated and Cash-protected changes.
  Those changes were preserved; nothing was staged, reset, or cleaned. This
  continuation changed only the Vessel ref initialization and this handoff
  plus the corrected delivery plan.

### Validation

All Node checks ran in disposable Node 22.23.3 containers with networking
disabled, the app source mounted read-only, and only temporary writable space.
The build used a temporary copy and no production mounts or credentials.

| Check | Result | Notes |
|---|---|---|
| Vessel URL, Cash safety, health-isolation, WA-02/archive tests | **PASS** — 19 tests | Includes the URL default/shareability cases and WA-02 archive-only/idempotency assertions. |
| Package-defined escort/archive tests | **PASS** — 23 tests | Re-run after the ref correction. |
| Workflow tests | **PASS** | Completed in the isolated container. |
| Phase-1 unit checks | **PASS** | Completed in the isolated container. |
| Typecheck | **PASS** | `tsc --noEmit`; compiler state redirected to temporary storage. |
| Targeted ESLint | **PASS** | `app/vessel-dashboard.tsx`, `lib/vessel-url-state.ts`, and `tests/vessel-url-state.mjs`. |
| Full ESLint | **FAIL** | The repository lint wrapper hit `ENOBUFS`; direct full-tree lint reported 8,291 errors and 92,728 warnings, including archived qualification fixture copies. No unrelated lint fixes were made. |
| Production build | **PASS, qualified** | Built successfully in isolation, including `/vessel`; installed Next.js was 16.3.4 while the manifest/lockfile specify 16.3.8, so a build against the exact locked dependency tree remains unverified. |
| Authenticated browser rendering | **NOT RUN** | No authenticated production or test-account session was used. |
| `tests/source-register.mjs` | **BLOCKED** | Requires `/var/lib/vps/al-rifai/evidence/chat-archive.json`, which was deliberately not mounted into the isolated environment. |
| `git diff --check` | **PASS** | Root, app, and WhatsApp-source worktrees. |
| Migration-chain / production integration | **NOT RUN** | No database or production data path was mounted or accessed. |

### Isolation evidence and next action

- WA-02 archive-only assertions passed: archive markers remain available while
  WA-02 creates no pending Cash/Vessel markers; the tests also confirm
  WA-01 remains eligible. Cash and Vessel processors select pending work only
  from `wa-01`. This is source/test evidence, not a live processing test.
- Cash freeze remains active. No Cash source, test, migration, dependency,
  runtime setting, release file, or production behavior was changed by this
  continuation.
- Next action: have the Owner or an already-authorized read-only database
  operator return only the latest in-scope row's `source_time` and `created_at`
  converted to `Asia/Dhaka`, using the existing `wa-01` / `Cash Payment`
  scope and `source_time DESC, id DESC` tie-break. Do not widen database
  grants or return IDs, amounts, identities, or message content.
- Before any release is considered, repeat build/lint/test checks with the
  exact lockfile dependency versions in an authorized isolated environment.
  No production deployment or restart is authorized by this handoff.

### Correct Compose Commands

    Bridge ps:
    docker compose -p vps-whatsapp-cap4-wa01 -f /opt/vps/services/whatsapp/compose.yaml --profile wa-02 ps

    Bridge recreate (needs Owner confirmation):
    docker compose -p vps-whatsapp-cap4-wa01 -f /opt/vps/services/whatsapp/compose.yaml --profile wa-02 up -d --no-deps --force-recreate whatsapp-wa-01 whatsapp-wa-02

    After recreate, fix permissions:
    sudo systemd-tmpfiles --create /etc/tmpfiles.d/vps-whatsapp-control.conf

### Permission Model
- wa-01/control: 0710, owner 10002:10002
- wa-02/control: 0710, owner 10003:10003
- mcp.sock: 0660, bridge UID:GID
- App UID 10001, groups 10002 and 10003

### P2 Backup Plan
If control dirs revert to 0700 after reboot, add to
/opt/vps/services/whatsapp/source/service-entrypoint.sh:
    chmod 0710 /runtime/control 2>/dev/null || true
Then rebuild bridge image and recreate containers.

## Goal-driven continuation — 2026-10-22, 15:48 CEST

### Current

- The requested latest `source_time` and `created_at` values remain
  **BLOCKED**. The prior timestamp-only query was denied for
  `alrifai_app`; no query was retried and no alternate access was attempted.
- `package.json` and `pnpm-lock.yaml` specify Next.js `16.3.8`; the package
  manager is pinned to `pnpm@11.25.0`.
- Root is on `master`; the app and WhatsApp-source repositories are on
  `main`. Their pre-existing dirty changes remain untouched. The app
  worktree includes Cash-protected paths, including Cash UI/API, Cash
  libraries, migrations, tests, package/configuration, and release paths.
  This inspection did not establish an exact-path Owner exception or the
  provenance of those changes.
- Production health/status was not rechecked in this continuation. The
  previously recorded live observation is not a current observation.

### Validation

| Check | Result | Notes |
|---|---|---|
| Locked-version build | **NOT RUN** | No verified isolated dependency tree for the pinned lockfile was established; no package download or install was attempted. The prior build used Next.js 16.3.4 and does not satisfy this check. |
| `tests/source-register.mjs` | **BLOCKED / NOT RUN** | It reads `chat-archive.json`, which was not provided as a safe fixture. No production evidence or personal data was copied or mounted. |
| Timestamp-only production read | **BLOCKED** | Prior read-only query returned permission denied on `cash_instructions`; no permission change or bypass was attempted. |
| `git diff --check` | **PASS** | Root, app, and WhatsApp-source tracked diffs; untracked files are not covered by this check. |

Previously recorded test/build results in the preceding continuation are
historical and were not rerun in this continuation.

### Isolation, safety, and readiness

- Cash Freeze remains in force. No Cash/Vessel behavior, production data,
  configuration, database, container, or bridge was changed by this
  continuation. No messages were sent.
- The existing dirty app changes overlap Cash-protected scope. They were not
  edited, staged, reset, or cleaned; their authorization and isolation status
  remain **UNVERIFIED**.
- **Deployment readiness: BLOCKED.** The timestamp evidence, exact
  lockfile-version build, `source-register` test, and authorization status of
  the protected worktree changes remain unresolved.
- Next action: ask the Owner or an already-authorized read-only database
  operator to provide only the latest in-scope `source_time` and `created_at`
  in `Asia/Dhaka`, without widening database grants or returning other
  fields. Separately, keep the protected dirty changes untouched pending
  exact-path Owner review.
- No production deployment, restart, migration, or write was performed.

## Read-only Cash/Bridge audit — 2026-10-22, 16:41 CEST

### 1. Bridge/source timestamp evidence

- The Bridge1 message-store schema in source defines messages by `(id,
  chat_jid)` and stores `sender`, `timestamp`, and direction. The WA-01
  containers were running, but the approved health probes returned no payload
  (exit code 6); no alternate API, socket, credential, or store access was
  attempted.
- The existing bounded MCP history-list tools return message body text as
  well as metadata. The proof tool needs known message IDs and returns state
  and a hash, not timestamp/sender. No metadata-only native read was available
  in this session, so the actual Bridge1 SQLite rows remain **UNVERIFIED**.
- A read-only aggregate against the existing AL-RIFA'I projection, restricted
  to WA-01 Cash payment candidates, found 1,707 processed candidate rows;
  every row had a message ID, source timestamp, sender reference, and chat
  reference. No message IDs, contact values, body, amount, or employee data
  were returned. This proves fields exist in that projection, not that every
  Bridge1 message was copied or that Cash rows map correctly.
- The live app database schema exposes `whatsapp_messages_original` fields
  for message ID, chat, sender, timestamp, direction, and ingestion time.
  This does not establish a lossless or complete copy from the Bridge1 store.

### 2. Cash-record mapping

- **BLOCKED:** the current `alrifai_app` role has no SELECT privilege on
  `cash_instructions` or `source_refs`. No Cash row, mapping, or exact
  `source_time`/`created_at` value was read. No alternate role or grant was
  used.
- `source_time` represents the source event time; `created_at` represents
  creation of the Cash instruction in the application database. They are
  distinct. The requested latest pair remains unverified.

### 3. Duplicate protection

- Live PostgreSQL index metadata confirms unique native-message identity
  `(wa_account, chat_jid, message_id)` and unique processing identity
  `(original_id, domain)`.
- Cash postings have a unique `(scope_account, operation_id)` constraint.
  Cash instructions have primary-key uniqueness, but their operation index
  is non-unique. Source references have a unique key including
  `(scope_account, channel, external_ref, block_key, payload_hash)`; that
  constraint alone does not enforce uniqueness of a source message/block
  independent of payload hash.
- The dirty source snapshot derives stable IDs from account/chat/message/block
  and takes an operation advisory lock. This is static source evidence only;
  it is not proof that the current production worker uses it. Timestamp alone
  is not a safe duplicate key: independent messages can share timestamp
  resolution, and a single message may contain multiple payment blocks.

### 4. Employee identity and ledger

- Live aggregate metadata shows 173 WA-01 `employee_master` rows; all are
  `REVIEW` and all have aliases. No mobile, name, alias, or transaction row
  was returned. The table key is `(scope_account, employee_mobile)`, but the
  correctness of any Cash-record-to-employee mapping is **UNVERIFIED**.

### 5. Cash access control

- Static review of the dirty, uncommitted app worktree shows Cash portal roles
  `ADMIN` and `USER`, not a distinct `SUPER_ADMIN` role. The `summary` and
  `messages` GET handlers authenticate a session but do not call
  `requireAdmin`; user-management handlers do. The messages handler selects
  message text and sender metadata. If this worktree API is deployed, a
  regular authenticated `USER` appears able to read sensitive Cash data,
  contrary to the stated Super Admin-only rule.
- Live authorization was not tested. The GET authentication helper updates
  session and user `last_seen_at`, so calling these endpoints would not be a
  strictly read-only database check. No credentials or accounts were used.
  Deployment of this dirty worktree is also unverified.

### Safety and next action

- Only schema/index metadata, scoped aggregate counts, and container health
  were inspected. No message body, Cash row, phone number, employee identity,
  amount, secret, or credential was read or returned. No data or behavior was
  changed; no message was sent.
- The health probes did not return a response; app was reported healthy and
  database healthy by `docker ps`. These observations do not prove the native
  reader or bridge API is available.
- **Readiness remains BLOCKED.** Next action: have the Owner or an already
  authorized read-only operator provide a metadata-only, exact-scope Bridge1
  to Cash mapping result with only source time and Cash creation time; do not
  widen grants, expose bodies/identities/amounts, or change Cash code.

## Ready-made tool discovery & capability closure — 2026-10-22, 20:50 CEST

### Work completed

- Reused the prior audit results in
  [CASH-VESSEL-DOMAIN-DELIVERY-PLAN-CORRECTED.md](CASH-VESSEL-DOMAIN-DELIVERY-PLAN-CORRECTED.md);
  did not rerun production queries, health probes, or tests.
- Reviewed the root/app/WhatsApp instructions, handoff, VPS map, native
  message inventory, app package/Compose, bridge Compose, current dirty source
  adapters and ingestion migrations. Root, app, and WhatsApp-source trees
  were already dirty; no existing change was staged, overwritten or removed.
- Evaluated official repositories/docs for CrystalDBA Postgres MCP, the
  existing WhatsApp MCP, Gatus, Uptime Kuma, Testcontainers Node, pgTAP,
  dbt and Auth.js. Selection/rejections, license/activity evidence,
  limitations and exact POC controls are in the delivery plan.
- Updated only this handoff and the delivery plan. No code, SQL, tests,
  package/configuration, production data, container, bridge, credential or
  permission was changed. Cash Freeze remains in force.

### Consolidated evidence and status

- **Source → ingestion → processing → Cash counts: BLOCKED.** The historical
  WA-01 all-message store count (14,541, observed 2026-10-12) and the scoped
  AL-RIFA’I Cash-candidate projection count (1,707, observed 2026-10-22) do
  not share scope or observation time and are not a loss/reconciliation
  denominator. The projection rows had message ID, timestamp, sender and chat
  references. No direct current Bridge1 rows, comparable stage counts,
  failure/rejection/unmatched totals or Cash-record linkage were obtained.
- **Cash record timestamp/mapping: BLOCKED.** Prior bounded read was denied
  for `cash_instructions` / `source_refs` under `alrifai_app`; no grant,
  alternate role or retry was attempted. Exact source/Cash creation timestamps
  and per-record mappings remain unavailable.
- **Employee mapping: UNVERIFIED.** Prior aggregate found 173
  `employee_master` entries, all `REVIEW`; no individual identity/mobile or
  ledger mapping was observed.
- **Idempotency: PARTIAL evidence only.** Prior live index inspection found
  source message and processing uniqueness and `cash_postings` uniqueness on
  `(scope_account, operation_id)`. It did not prove end-to-end concurrent
  replay behavior. Dirty, undeployed code uses source account/chat/message/
  block identity; it is not live proof.
- **Authorization: BLOCKED / potential static gap.** Dirty app candidate has
  `ADMIN`/`USER` roles; the Cash read handlers appear not to enforce the
  required distinct Super Admin policy. Live authorization and deployment of
  that worktree were not checked. Treat as a security issue requiring exact
  protected-path Owner exception, not as a live finding.
- **Bridge metadata capability: BLOCKED.** Existing archive tools require
  content access and return body text. Candidate `list_native_events` can
  represent held/no-body metadata, but its `native.events.read` capability is
  not registered in the source capability map. Source tree changes are
  uncommitted; production availability is unverified.
- **Cash/Vessel isolation: UNVERIFIED for live operation.** Prior offline
  tests and source-scope assertions are historical only; no tests were run in
  this continuation and no production processing was exercised.
- **Monitoring: PARTIAL.** Existing app/Docker healthchecks are reused; no
  current independent alert service/destination is evidenced. Optional
  Gatus was recommended over adding Uptime Kuma, subject to explicit
  service/network/alert approval.

### Candidate decisions

- **Recommended existing components:** current account-scoped WhatsApp MCP
  and the existing PostgreSQL/Node test architecture; no second pipeline,
  database, auth service, or orchestrator.
- **Optional, not installed:** Gatus for independently monitored internal
  health endpoints; Testcontainers Node only if the present disposable
  qualification harness proves insufficient.
- **Not selected:** production Postgres MCP due to direct DB credential/data
  exposure, Python/container addition and unknown advisory status; Uptime
  Kuma due to greater persisted/admin operational surface; dbt due to
  unnecessary transformation pipeline; pgTAP due to server extension change;
  Auth.js due to broad auth/session migration without solving business
  authority mapping; Airflow/Prefect due to no architectural need.
- GitHub advisory pages for Postgres MCP, Gatus and Uptime Kuma could not be
  retrieved, so advisory status is **UNVERIFIED**, not “no advisories.”

### Tests / work not run

| Check | Status | Reason |
|---|---|---|
| Production Bridge1 metadata read / matched source-to-Cash reconciliation | **BLOCKED** | No metadata-only production reader or authorized Cash projection read established. |
| Exact-scope failure, duplicate and unmatched counts | **BLOCKED** | Comparable, same-window source/DB metadata unavailable. |
| Cash replay/concurrency, employee mapping, Posted immutability and Super Admin tests | **NOT RUN** | Cash behavior/test paths are protected; no exact-path exception or safe isolated Node+PostgreSQL environment established. |
| Vessel/Cash cross-domain integration tests | **NOT RUN** | Prior offline results are historical; current dirty code was not executed. |
| Locked-version typecheck/lint/build/full tests | **NOT RUN** | Exact lockfile dependency tree was not installed; production runtime is not a build/test environment. |
| Third-party software install or isolated POC | **NOT RUN** | No need to install software to make the selection; new dependencies/services require isolation and, where protected, Owner approval. |
| Documentation whitespace check | **FAIL, pre-existing issue isolated** | `git diff --check` on this tracked handoff was clean. `git diff --no-index --check /dev/null CASH-VESSEL-DOMAIN-DELIVERY-PLAN-CORRECTED.md` reports only trailing spaces on pre-existing lines 3–4 of the untracked plan; the appended section has none. Those unrelated lines were preserved. |

### Readiness / next authorized step

**Production readiness: BLOCKED.** The delivery plan now contains a complete
least-privilege permission/tool package, required isolated test cases,
deployment order, rollback/recovery boundaries and one consolidated exact-
path exception request. No production deployment/restart, database change,
financial write, message send or new credential is authorized by this update.

If the Owner authorizes the protected work, authorize the exact paths listed
in the delivery plan together with: intended metadata-only/read-guard behavior;
an isolated synthetic fixture validation plan; explicit statement that there
will be no financial business writes or WhatsApp sends; and a separate
deployment/restart decision. Also identify the approved Super Admin
principal(s) and (only if choosing Gatus) the alert destination. Until then,
keep all existing dirty protected paths unchanged.

## Bounded offline Cash/Vessel delivery work — 2026-10-22

The Owner approved offline implementation/tests only on the exact candidate
bridge metadata and Cash read-authorization paths in the delivery plan. This
does not authorize runtime configuration, database grants/migrations,
production data access, service restart/deployment, financial writes, posting
or approval changes, or WhatsApp sends.

### Changes made

- In `services/whatsapp/source/whatsapp-mcp-server/capabilities.py`,
  `list_native_events` is now gated by `native.events.read`.
- In `services/whatsapp/source/whatsapp-mcp-server/native_reader.py`, the
  metadata tool forces body-free serialization regardless of whether the
  principal separately has content capability; it also omits paired
  JID/LID values from the metadata response. The existing account/chat scope
  and privacy-barrier checks remain.
- In
  `services/whatsapp/source/whatsapp-mcp-server/tests/test_capabilities.py`,
  added a synthetic disposable-SQLite test for capability isolation,
  metadata-only output, no paired identities, and out-of-scope chat denial.
- In `apps/al-rifai/lib/cash-portal.ts` and
  `apps/al-rifai/app/api/cash/[...path]/route.ts`, Cash `summary` and
  `messages` reads now require an `ADMIN` identity explicitly listed in
  `ALRIFAI_CASH_SUPER_ADMIN_IDS`. Unset/empty configuration denies by
  default. No account was selected or promoted.
- Added `apps/al-rifai/tests/cash-super-admin-auth.mjs` for default denial,
  explicit allowlisting, role/ID validation, and guard placement.
- No posting, parsing, ingestion, source scope, employee mapping, migration,
  database, bridge runtime or vessel-processing code was changed.

### Validation status

| Check | Status | Result |
|---|---|---|
| Focused Node Cash authorization test | **NOT RUN** | Test runner has no registered VS Code test controller; host Node/pnpm are unavailable and no isolated Node runner was available. |
| Focused Python bridge capability test | **NOT RUN** | Test runner has no registered controller; Python environment configuration and container-tool helpers were unavailable. |
| Typecheck/lint/full tests/build | **NOT RUN** | No authorized isolated Node 22 environment was available. |
| Source-to-Cash reconciliation and failure/unmatched counts | **BLOCKED** | No authorized same-scope current metadata mapping. |
| Live Cash Super Admin authorization | **UNVERIFIED** | No Owner-designated identity or production allowlist configuration. |
| Live Cash/Vessel isolation and deployed bridge capability | **UNVERIFIED** | No tests against a live service and no deployment occurred. |

**Production status: DEPLOYMENT BLOCKED.** The code is fail-closed but not
release-validated. Required next steps are to obtain the Owner-designated
existing `ADMIN` ID(s), approve/document the runtime allowlist configuration
and deployment window, then run isolated focused tests plus exact-lockfile
typecheck/lint/full tests/build. Production read grants, migrations, writes,
deployment/restart, and WhatsApp sends remain outside this approval. All
pre-existing dirty work was preserved; no broad staging or cleanup occurred.

## Batch 0.2 — Vessel duplicate qualification continuation

### Scope and changes

- Continued the already-authorized offline Vessel-only work. The only files
  changed in this continuation are
  [apps/al-rifai/lib/escort-register.mjs](apps/al-rifai/lib/escort-register.mjs)
  and
  [apps/al-rifai/tests/escort-register.mjs](apps/al-rifai/tests/escort-register.mjs).
- For an exact normalized Mother/Lighter vessel pair with duty dates no more
  than one day apart, one existing canonical candidate is linked as a
  **potential duplicate in REVIEW**. Its original register row is not updated
  or confirmed; each source keeps its own source link/event/provenance.
- Multiple canonical matches remain a separate ambiguous REVIEW item with no
  business key. More than one day apart or a different vessel pair remains a
  distinct order. Invalid `Date` values cannot throw during candidate checks.
- Existing WA-01-only scope, group authorization, login/roles/permissions,
  Cash logic, ingestion, bridge identity/session, and database code were not
  changed. No production data, container, service, or WhatsApp bridge was
  accessed or changed.

### Validation

| Check | Result | Evidence / limitation |
|---|---|---|
| Vessel + WhatsApp archive + health isolation + URL-state synthetic tests | **PASS** | 29/29 in disposable Node 22.23.3 container with networking disabled and source mounted read-only. Includes ±1 day, two-day separation, different lighter, ambiguity, canonical preservation, provenance and replay. |
| Targeted ESLint | **PASS** | Both changed files; cached isolated `al-rifai-toolchain:phase1` image. |
| TypeScript check | **PASS** | `tsc --noEmit`; compiler state redirected to `/tmp` in the isolated toolchain container. |
| `git diff --check` | **PASS** | No whitespace errors in the app worktree. |
| Exact frozen-lockfile install/build and full test/lint suite | **NOT RUN** | `pnpm exec` attempted an install into the read-only source mount and failed with `EROFS`; no install or source change was made. No exact-lockfile build is claimed. |
| Migration chain / disposable DB | **NOT RUN** | Cached PostgreSQL 16 image exists, but no migration was applied during this continuation. No production database was accessed. |
| Authenticated UI/browser acceptance | **NOT RUN** | No auth/session/account was used. |

### Migration and release boundary

- Candidate migration dependencies remain 0018 and 0020–0023. They are not
  cleared for production: 0018 seeds/upserts Vessel contacts and changes
  grants; 0021/0022 add ingestion schema/triggers and grants; 0023 adds
  Vessel identity/group-authorization schema, changes an event constraint,
  and grants access. 0020 is additive archive schema. No migration was
  changed or applied here.
- The candidate files are worktree changes, not proof of deployed behavior.
  The previously recorded live app image digest is
  `sha256:16c1289086e69da16d5270bc39bcaae85718388eba6a46747c92711a2e395d2d`;
  no deployment or restart occurred.
- **Next-stage decision: NO-GO for release or deployment.** The focused
  candidate logic is synthetically validated, but exact-lockfile build/full
  suite, disposable migration verification, authenticated UI acceptance,
  migration permission review, and release-path isolation remain outstanding.
  Continue excluding all Cash-protected and identity/auth/role/permission
  paths. Do not begin Batch 1 or deployment without the Owner's separate
  approval.

  ## Current Production Position — 2026-10-24

  ### Scope and evidence provenance

  This is a dated, read-only production snapshot and Batch 1.4F Step 1 evidence
  handoff. It does not authorize implementation, migration, replay, cleanup,
  deployment, restart, business-data access, or Cash Payment changes. Previous
  Agent reports are identified as reports; they are not treated as raw test
  evidence. The Batch 1.4F session evidence is in
  `/root/.copilot/session-state/474ac02f-17e0-49af-b9e9-24b31a838865/events.jsonl`;
  the 1.4E readiness and 1.4F Step 1 checkpoints are in the current session's
  `checkpoints/` directory. The 1.4D candidate source files were not recovered
  as persistent source artifacts.

  ### Canonical system and observed production baseline

  - Existing application/repository: `/opt/vps/apps/al-rifai`; VPS
    orchestration: `/opt/vps`; application configuration:
    `/etc/vps/apps/al-rifai/app.env`.
  - Canonical PostgreSQL service: container `vps-infra-postgres-1`, database
    `alrifai`; deployed application: container `al-rifai-app-1`. Do not create
    another app or database.
  - At 2026-10-24 13:46 CEST, read-only checks observed app image
    `sha256:16c1289086e69da16d5270bc39bcaae85718388eba6a46747c92711a2e395d2d`,
    app container `running (healthy)`, `/api/health` returning
    `{"status":"ok"}`, PostgreSQL `16.15` and `healthy`.
  - The same snapshot found 23 rows in `public.alrifai_schema_migrations`,
    latest `0022_whatsapp_incremental_ingestion.sql`; 0023 and 0024 are absent.
    The ledger's 0016 SHA-256 is
    `8bf6171533186695f4024317b457559723677d3c42cb6e1c6da668f2afcb6b2`.
  - `alrifai_migrator`, `alrifai_vessel_owner`, `alrifai_migration_owner`, and
    `alrifai_wa_view_owner` were absent from the queried production role
    snapshot. `alrifai_app` and `ir_review_runtime` were non-superusers;
    `vps_pg_admin` was a superuser. Do not infer least-privilege readiness from
    this role inventory.
  - WA-01 and WA-02 containers were running the same image digest,
    `sha256:d36ca8516dc615825c22300f030042941a408331296c47423d4234f5ecad093c`.
    Their control directories were `0710`, owned by `10002:10002` and
    `10003:10003`; sockets were `0660` with the corresponding bridge ownership.
    The approved local `/api/health` probes returned no payload and exit code
    6 for both bridges. Pairing/session status, message reception, and bridge
    health are therefore **NOT VERIFIED**. No WA-02 message was inspected.
  - Health checks prove service reachability only. They do not prove that an
    incoming message was received, preserved, classified, processed, or shown
    to the correct office user.

  ### Batch 1.4F Step 1 — recovered evidence and limitations

  **Migration 0016:** Exact SQL bytes were located in an existing local Docker
  image layer and hashed to
  `8bf6171533186695f4024317b457559723677d3c42cb6e1c6da668f2afcb6b2`,
  matching the production ledger. The current workspace file hash is
  `9880bc5da925552fd9cb7f089480c0dfea1524ff3ff90a8237e002b2fbb8114c`.
  Signed image provenance/attestation was not established. The recovered bytes
  were not copied into the canonical migration path. No production ledger or
  Cash data change was authorized.

  **Migration runner and proposed migrations:** The complete tested Batch
  1.4D runner/helper and 0023/0024 candidates were not recovered as persistent
  source artifacts. Archived commands, reported hashes, and selected raw
  outputs exist in the session event log. Reported candidate SHA-256 values:

  - runner `1da99a61a9519a8fbafcc633baa1db7540294b77248694efd5f82ad7c756a16e`
  - helper `6b65fbbd1cf23224eb584e27dba0e013ca55c0dc59afe27b40de5da970817b09`
  - candidate 0023 `21862bc3ea5550723cbfcd52f32760afc11d2c0b8e3b81775beddf46347028d`
  - candidate 0024 `8088198e9898a26f8ab76189a33f0d739566b2fc30ce0af9d973cd3e0a5dad5d`

  These are archived Agent-session values, not independently re-hashed
  candidate files. The tested implementation is **NOT RECOVERED**. The design
  and transaction/role/locking behavior require a reproducible implementation
  and verification package in a separately authorized disposable environment.
  The reported backend-disconnection `57P01` unhandled client error remains an
  unresolved robustness issue.

  **Failure-injection evidence:** A1–A4 have recorded injected-failure exit
  codes, but only one aggregate schema/ledger check after all four; separate
  post-failure rollback evidence for every case is incomplete. A5 has corrected
  role-switching failure output. A6 has disposable checksum-mismatch
  fail-closed output. A7's concurrent outcomes are consistent with
  serialization, but direct lock-wait evidence is missing. A8 has disposable
  idempotent-rerun output. The 1.4D archived raw summary says `44/44 matched`;
  complete per-table fingerprint artifacts were not recovered. Do not report
  these incomplete items as test-suite PASS.

  **Roles and WA-01 view:** Selected disposable privilege denials are recorded.
  The proposed role design allowed the migrator to assume the WA view owner;
  therefore denial of direct base-table SELECT does not prove lack of effective
  contact access. Production candidate roles are absent. WA-01 alias-view and
  WA-02 exclusion behavior remain unverified in the deployed end-to-end path.

  **Backup, fingerprints and cleanup:** The archived backup and manifest
  hashes were verified in the earlier evidence recovery; a strict PostgreSQL
  16 disposable restore was recorded with exit `0`. The aggregate 44/44
  fingerprint result exists, but its individual fingerprint files are absent.
  Three anonymous volumes with prefixes `2cea89ed`, `aca35d6b`, and `cf6d9897`
  remain unattributed. Do not inspect their contents, reuse, mount, or delete
  them without separate verification and authorization.

  ### Issue register

  `Production changed?` below refers to the documented audit/recovery work;
  none of those activities changed production. It does not assert a historical
  before/after comparison of every business row.

  | Issue ID | Affected function / component | Current observed state | Evidence and source | Business impact | Required corrective action | Owner decision needed | Status | Production changed? |
  |---|---|---|---|---|---|---|---|---|
  | CP-01 | Cash Payment / all protected Cash paths | Freeze remains active; this audit made no Cash write or behavior change. | Root `AGENTS.md`; read-only audit scope. | Prevents unapproved financial behavior changes. | Keep frozen; request exact-path exception before any protected change. | YES, for any exception. | BLOCKED | No |
  | MIG-01 | 0016 checksum / migration source | Ledger hash matches bytes found in an image layer; current workspace hash differs; image attestation is absent. | Production ledger query and earlier image-layer SHA-256 evidence. | Applying a modified historical migration could invalidate checksum/history. | Preserve evidence; establish trusted provenance and decide whether canonical source recovery is required. | YES before source/ledger action. | OPEN | No |
  | MIG-02 | Atomic migration runner / 0023 / 0024 | Exact Batch 1.4D tested candidate files are not persistent/recovered. | 1.4D session log contains hashes/commands, not complete source artifacts. | No reproducible basis to certify atomic migration or least privilege. | Recover exact artifact or design and verify anew in an approved disposable environment. | YES before protected source or test work. | BLOCKED | No |
  | MIG-03 | Atomicity / locking / connection failure | A1–A4 per-case rollback proof incomplete; A7 lock-wait proof missing; `57P01` client handling unresolved. | Selected 1.4D raw output and session report. | Partial migration, concurrency, or worker failure may be mishandled. | Build test-specific assertions and robust connection-loss handling; validate outside production. | YES before protected runner changes. | NOT VERIFIED | No |
  | ROLE-01 | Migration roles / WA-01 alias view | Candidate roles absent in production; candidate migrator could assume view-owner role in disposable design. | 2026-10-24 role metadata; 1.4D selected privilege outputs/report. | Effective access may exceed the intended base-table denial. | Define and test complete direct/effective privilege matrix, including view ownership and role switching. | YES before grants, role, or migration changes. | BLOCKED | No |
  | WA-01 | WhatsApp receive / bridge pairing | Container running and socket permission model intact; approved health probe returned no payload, exit 6. Pairing/session and receive status unknown. | 2026-10-24 `docker ps`, `stat`, approved health probe. | New messages may not arrive or recover; service status alone is insufficient. | Obtain an approved status-only bridge check and trace through the existing pipeline without message content. | YES if a credentialed or content-level check is needed. | NOT VERIFIED | No |
  | WA-02 | Identity-only boundary | Container running; no WA-02 message access performed; health probe returned no payload, exit 6. | 2026-10-24 status/permission metadata. | Must not expand WA-02 message scope. | Keep identity-only boundary; verify only non-message identity metadata under authorized method. | YES for any scope expansion. | NOT VERIFIED | No |
  | ING-01 | Native store → PostgreSQL mirror / worker | Live end-to-end source-to-archive correspondence, retries, duplicate behavior, and cursor health not demonstrated. | Health checks and static source/report evidence are insufficient. | Loss, delay, duplicate, or silent omission of incoming work is possible but not established. | Use bounded metadata-only source-to-archive tracing; do not read message bodies or replay. | YES for any content access or write/replay. | NOT VERIFIED | No |
  | ESC-01 | Escort Order / parser and register | Owner rules and candidate parser exist in source/report history; current deployed message-to-review/register result is not verified. | Candidate files and archived test reports; no live trace. | Escort assignment may be missed, misparsed, duplicated, or incorrectly confirmed. | Verify identity, fields, provenance, duplicate rule, and ambiguity-to-Review behavior in a controlled approved test. | YES for live injection or protected changes. | NOT VERIFIED | No |
  | ACC-01 | Accounts instruction / Cash review pipeline | Cash flow remains frozen; no live instruction was read or posted; current authenticated review visibility not tested. | Cash Freeze; no Cash-row access in this audit. | Incorrect identity/direction mapping could create unsafe or missing work. | No posting/approval; obtain explicit Cash Owner authorization before content-level or protected-path validation. | YES. | BLOCKED | No |
  | UI-01 | Review queue / authenticated register and Accounts UI | App and DB health passed; authenticated item visibility and error presentation are not proven by health. | Current `/api/health`; no authenticated browser/API session. | Office users may not see, distinguish, or act on pending/rejected work correctly. | Verify read-only authenticated visibility using an authorized test identity and metadata-safe sample. | YES if identity/session access is required. | NOT VERIFIED | No |
  | HIST-01 | Historical source/fingerprints/backup | 44/44 aggregate fingerprint output exists; per-table artifacts unavailable; source-level historical reconciliation was not done. | Archived 1.4D output/report and backup/restore event evidence. | Historical accuracy cannot be claimed from aggregate or service-health evidence. | Defer history reconciliation until Owner provides documents and separate scope. | YES for historical import/reconciliation. | BLOCKED | No |
  | VOL-01 | Disposable Docker resources | Three anonymous volumes remain without verified batch ownership. | Docker metadata; no content inspection or reference found in prior snapshot. | Reuse/deletion could affect unknown data. | Establish ownership before any mount, reuse, or deletion. | YES before any operation. | OPEN | No |

  ### Function status and authorization boundary

  At the initial 13:46 CEST snapshot, no function in the live workflow was
  certified **PASS — LIVE VERIFIED** and the function-based audit was still
  pending. The read-only audit completed during the 13:46–14:00 CEST window;
  its evidence and updated statuses are recorded in the addendum below.
  Historical TXT/Excel reconciliation, ranking, import, deduplication,
  backfill, and reprocessing remain unauthorized and deferred.

  ### Authorization and non-change record

  Cash Freeze and protected-path controls remain in force. Any change to
  protected source, migration, role/grant, runtime configuration, release,
  deployment, or service requires the applicable explicit Owner authorization;
  Cash behavior additionally requires an explicit Cash Owner exception. This
  handoff update changed documentation only. No application source, migration,
  database, role, permission, business data, Docker resource, volume, WhatsApp
  session, or service was changed.

  ### Live Workflow Read-Only Audit — 2026-10-24 (observed through 14:00:36 CEST)

  This addendum supersedes the initial snapshot's pending-audit statement and
  preserves that earlier observation. Checks were read-only. No message body,
  Cash business row, WA-02 message content, secret, or credential was read.
  No message was injected; no ingestion/replay command, database write,
  permission change, restart, deployment, or cleanup was performed.

  **Service and evidence boundary**

  - During the audit window, `al-rifai-app-1` was `running (healthy)`,
    `/api/health` returned `{"status":"ok"}`, and PostgreSQL 16.15 was healthy.
    These establish service health only, not correct workflow completion.
  - The approved WA-01 and WA-02 bridge health commands returned no body and
    exit code 6. The reason/status and pairing state were not established; no
    alternate bridge or namespace probe was used.
  - The deployed app build contains `/api/escort-register`, `/api/register`,
    `/api/vessels`, `/api/cash/[...path]`, `/review`, `/vessel`, `/register`,
    and `/cash` routes. An unauthenticated `HEAD` to
    `/api/escort-register` returned 401. No authenticated UI/API read was
    attempted.
  - Deployed worker/library source differs from the current workspace for
    `message-ingestion-worker.ts`, `process-cash.ts`, `process-vessel.ts`,
    `whatsapp-archive.ts`, and `escort-register.mjs`. The live image, not the
    dirty workspace, is the runtime evidence. The `start-private-app.mjs`,
    `live-cash.ts`, and `escort-intake-candidate.mjs` hashes matched their
    workspace counterparts at the audit.

  **Current metadata-only observations**

  - For 2026-10-24, PostgreSQL had 44 WA-01 original-message rows, 44 archive
    rows, and 44 source-event rows. The five most recent redacted metadata
    samples each had an original, archive, source-event, and processed markers
    for `archive`, `cash`, and `vessel`. This confirms internal PostgreSQL
    correspondence only; the samples were not matched to the native store and
    their message types or business meaning were not inspected.
  - WA-01 had five archive cursors without recorded errors and three
    compatibility cursors with `AUTHORIZED_COMPATIBILITY_READER_UNAVAILABLE`;
    the latest observed cursor error was at 13:59:53 CEST. The deployed worker
    routes group chats through compatibility mode. This is a verified
    group-receive/processing failure at that observation, not proof that all
    WA-01 messages are failing.
  - WA-02 had 3,120 original rows and corresponding archive/cash/vessel
    processing markers in PostgreSQL. No WA-02 message rows or content were
    queried. Independently, deployed worker source calls `runAccount("wa-02")`
    and iterates the configured chat list using `list_messages`; this conflicts
    with the identity-only boundary. Actual current bridge authorization and
    success of the latest calls remain unverified. The audit did not create
    this deployed path or change its scope.
  - The Escort register had aggregate counts of 382 `DRAFT` and 218 `REVIEW`.
    No row content or mapping to the five recent messages was read.
  - Deployed Escort logic gates clients by account and active contact and
    prevents replay of the same account/source-hash/block key. It does not
    implement the Owner-approved cross-message possible-duplicate rule
    (same Mother Vessel + Lighter Vessel with duty dates equal or within
    one day). Its assignment matching also uses one-character vessel-name
    tolerance; the effect on live assignments was not tested.
  - The deployed Cash processor was inspected as source only. It creates
    processing/review classifications and does not itself establish a Cash
    posting or approval. No Cash rows, recipient records, or authenticated
    Accounts view were read; the verified Admin-to-verified-Accountant
    recipient binding and office visibility remain unproven.
  - The deployed ingestion loop retains cursors and uses exponential retry
    backoff up to 60 seconds. Three WA-01 compatibility cursors still had the
    reader-unavailable error at the latest observation; successful recovery
    was not demonstrated.

  **Function-by-function status**

  | Function | Status | Evidence and limitation |
  |---|---|---|
  | WhatsApp Receive | PARTIAL | Recent WA-01 PostgreSQL records exist; pairing is unverified and all three observed WA-01 compatibility cursors failed. |
  | Native Message Persistence | NOT VERIFIED | Native store and pairing/session state were not inspected. |
  | PostgreSQL Message Mirroring | PARTIAL | 44 WA-01 original/archive/source-event rows and five internally joined samples; no native-store comparison. |
  | Client / Admin / Accountant Identity Validation | PARTIAL | Deployed source contains account/contact and sender/direction checks; verified recipient binding and live identity decisions were not demonstrated. WA-02 scope conflict is separately recorded below. |
  | Escort Order Parsing | PASS — CODE ONLY | Deployed parser/processor can form `DRAFT` and `REVIEW` operations; no recent message content or live classification was verified. |
  | Vessel Duplicate Detection | FAIL — VERIFIED | Deployed logic lacks the approved cross-message vessel-pair/date duplicate check. |
  | Accounts Parsing | PARTIAL | Deployed source supports review classification; exact Admin-to-Accountant identity/direction and an actual office review item were not verified. |
  | Review Queue | PARTIAL | Escort aggregate review rows exist and routes are present; authenticated queue contents and Cash candidate visibility were not tested. |
  | Register / Accounts Visibility | NOT VERIFIED | Routes are present; authenticated reads were not performed. |
  | Retry / Reconnection / Recovery | PARTIAL | Cursor retention/backoff exists in code; current reader errors persisted and successful recovery was not observed. |
  | Source Traceability | PARTIAL | Source metadata/provenance and internal PostgreSQL joins exist; native-source matching and content-level classification were not checked. |
  | End-to-End Completion | NOT VERIFIED | No authorized recent message was traced from native source through correct business item to authenticated UI. |

  No function is certified **PASS — LIVE VERIFIED**. Therefore the answer to
  “can a new authorized message now be safely received, preserved, interpreted,
  and shown as the correct office work item?” is **NOT VERIFIED**.

  **Updated issue register**

  | Issue ID | Affected function / component | Current observed state | Evidence and source | Business impact | Required corrective action | Owner decision needed | Status | Production changed? |
  |---|---|---|---|---|---|---|---|---|
  | WA-01-GROUP | WA-01 group receive / compatibility reader | Three compatibility cursors report `AUTHORIZED_COMPATIBILITY_READER_UNAVAILABLE`; archive cursors had no recorded error. | Read-only PostgreSQL cursor metadata and deployed worker branch, observed through 13:59:53 CEST. | Group-sourced work may be delayed or absent; direct-chat success does not cover groups. | Diagnose reader availability and cursor recovery in an approved, non-mutating check; do not replay. | YES before any bridge, permission, or protected runtime change. | OPEN | No |
  | WA-02-SCOPE | WA-02 identity-only boundary | Deployed worker invokes `list_messages` over the configured chat list for WA-02; WA-02 processing-marker aggregates exist. Bridge acceptance of the latest calls is unknown. | Deployed worker source plus account-level aggregate metadata; no WA-02 content inspected. | Message scope may exceed the permitted identity-only role. | Owner must decide the authorized boundary; any code/config/bridge correction needs separate approval. | YES | OPEN | No |
  | ING-02 | Native persistence / PostgreSQL mirror | 44 WA-01 records are internally joined in PostgreSQL; native-store source match is absent. | Bounded read-only aggregates and five redacted metadata samples. | Completeness, source fidelity, and duplicate-free end-to-end receipt remain unproven. | Smallest next test is an approved metadata-only source-to-archive comparison, without message bodies or replay. | YES if native identity access or credentials are required. | NOT VERIFIED | No |
  | ESC-DUP-01 | Escort duplicate handling | Same-source replay key exists; approved cross-message vessel-pair/date rule is absent from deployed logic. | Deployed `escort-register.mjs` source; 0023 remains unapplied. | Possible duplicate orders may become separate drafts without the required review signal. | Implement and test only after separate approval for the exact protected paths and disposable validation scope. | YES | OPEN | No |
  | ACC-ID-01 | Accounts identity / recipient validation | Parser and review classification exist in deployed source; verified Accountant recipient and live Admin-to-Accountant trace are unproven. | Deployed source inspection only; no Cash data or message content read. | Misidentified recipient or instruction could be omitted or misclassified. | Obtain an authorized redacted test case and verify identity gates without posting or approval. | YES, Cash Owner approval required. | BLOCKED | No |
  | UI-01 | Review / Register / Accounts visibility | Deployed routes exist; unauthenticated Escort API `HEAD` returned 401; authenticated item visibility unknown. | Deployed route manifest and bounded `HEAD` response. | An accepted candidate may not appear to the intended office user or may display stale data. | Perform an authorized read-only authenticated visibility check with a metadata-safe item. | YES for session/test identity access. | NOT VERIFIED | No |
  | REC-01 | Cursor retry / reconnection | Retry/backoff and cursor retention are present; three compatibility cursor failures persisted at the latest check. | Deployed worker source and cursor metadata. | Recovery after reader availability returns is unproven; delay may continue. | Verify a later natural recovery without forcing a replay or disconnect. | NO for passive observation; YES for intervention. | OPEN | No |

  **Recent WA-01 trace sample (redacted; no content or IDs)**

  | Sample | Dhaka source time / direction | Original + archive + source event | Processing markers | Native match / parser result / UI |
  |---|---|---|---|---|
  | 1 | 17:40 / outgoing | Present in PostgreSQL | `archive`, `cash`, `vessel`: processed | NOT VERIFIED |
  | 2 | 15:26 / outgoing | Present in PostgreSQL | `archive`, `cash`, `vessel`: processed | NOT VERIFIED |
  | 3 | 15:08 / outgoing | Present in PostgreSQL | `archive`, `cash`, `vessel`: processed | NOT VERIFIED |
  | 4 | 15:08 / incoming | Present in PostgreSQL | `archive`, `cash`, `vessel`: processed | NOT VERIFIED |
  | 5 | 14:39 / outgoing | Present in PostgreSQL | `archive`, `cash`, `vessel`: processed | NOT VERIFIED |

  These are database metadata samples, not content-verified Escort, Accounts,
  or non-business examples. Their suitability for those categories is unknown.
  No synthetic sample or live-message test was created.

  **Smallest safe next action:** After Owner approval where needed, perform
  one bounded, metadata-only WA-01 native-store-to-PostgreSQL comparison using
  an existing recent source identity, then an authorized authenticated
  read-only UI check for the corresponding existing review item. Do not access
  message bodies or Cash rows, inject/replay, change WA-02 scope, apply
  migrations, alter roles, restart, deploy, or clean up resources. If source
  identity cannot be compared without content or privileged access, retain
  **NOT VERIFIED** and request that specific authorization.

## Cash Unfreeze and WhatsApp Integration Recovery — Updated 2026-10-25

This is the current handoff for the Owner-authorized source-development and
isolated-test recovery. Al-Rifa'i is in a modular business-application
rebuild while retaining its existing VPS, PostgreSQL, and WhatsApp
infrastructure. The authorization covers the existing Cash, WhatsApp,
Message Mirror, Vessel, and UI integration scope; it does not authorize
production migration/writes, deployment, service or Bridge restart, Live Sync,
historical backfill, WA-02 permission expansion, or financial posting.

### Completed source work; not deployed

The advisory Cash path guard no longer blocks the authorized source work; it
remains non-authoritative for production. The Mirror worker routes newly
persisted WA-01 native messages through the existing source classifier and
immutable original-message store, then creates the existing pending Cash or
Vessel marker only for an eligible source. Duplicate original messages do not
create downstream work. WA-02 is identity-only in the worker: it validates
identity and returns before message or contact reads.

Relevant app paths:

- `apps/al-rifai/db/migrations/0025_whatsapp_message_mirror.sql` — authoritative
  additive SQL design for the independent `whatsapp_mirror` schema.
- `apps/al-rifai/scripts/message-mirror-worker.ts` — generic WA-01/02/03
  connector, per-bridge/chat activation checkpoints, cursor persistence,
  source evidence, conservative protocol-identity deduplication, retries,
  and recovery.
- `apps/al-rifai/app/message-mirror/page.tsx` and
  `apps/al-rifai/app/vessel-dashboard.tsx` — authenticated read-only Mirror
  page and navigation link.
- `apps/al-rifai/tests/message-mirror.mjs` — isolated unit and disposable
  PostgreSQL integration tests.
- `apps/al-rifai/tests/whatsapp-archive-ingestion.mjs` — Cash/Vessel routing,
  source-safety, and read-only uploaded-export parser fixtures.
- `apps/al-rifai/lib/whatsapp-archive.ts` — shared Mirror-to-domain route
  helper; reuses existing source authorization and persistence.
- `apps/al-rifai/scripts/cash-freeze-guard.mjs` — advisory path notice; it no
  longer enforces the superseded freeze.
- `apps/al-rifai/Dockerfile`,
  `apps/al-rifai/compose.yaml`, and
  `apps/al-rifai/release/start-private-app.mjs` — build/test/runtime wiring;
  Compose keeps `ALRIFAI_MESSAGE_MIRROR_ENABLED` set to `0`.
- `apps/al-rifai/docs/WHATSAPP-MESSAGE-MIRROR.md` — operational and test
  documentation.

The workspace also contains native-reader MCP source changes in
`services/whatsapp/source/whatsapp-mcp-server/main.py`,
`capabilities.py`, and `native_reader.py`, with related tests in
`tests/test_native_live_mirror.py` and `tests/test_capabilities.py`. This
recovery changed the capability test's account-alias setup; it did not change
runtime policy or Bridge permissions. The existing app MCP relay client in
`apps/al-rifai/scripts/message-ingestion.ts` is reused.

### MCP interface and permissions

The Mirror uses the native live contract, not a renamed archive API:

| Function | Canonical tool | Required capability |
|---|---|---|
| Bound account/stream identity | `get_native_account_identity` | `native.identity.read` |
| Ordered event metadata/cursor | `list_native_events` | `native.events.read` |
| Message envelopes/content | `list_native_messages` | `native.events.read` and `native.content.read` |
| Saved contact lookup | `get_contact` | `contacts.read` |

`list_archive_messages` is archive-history paging and `list_stored_messages`
is stored-history access; neither is interchangeable with the live cursor
contract. Existing interfaces were retained rather than duplicated or
renamed. The worker treats `get_contact` as optional and keeps the saved
contact field separate from push-name display fallback.

WA-01 still requires the listed capabilities plus an Owner-approved chat
scope in its actual runtime consumer policy. No runtime policy, Bridge
configuration, or permission was changed here. WA-02 remains identity-only
in worker source; the prior runtime observation showed legacy message/contact
tools in its advertised list, so runtime policy alignment remains unverified
and must not be bypassed. Production Bridge tools were not called.

### Database design (not applied to production)

The migration defines exactly these six tables:

| Table | Purpose |
|---|---|
| `whatsapp_mirror.bridges` | Per-Bridge connection, message-access, sync, activation, and error status. Seeds WA-01/02 as unverified and WA-03 as ready for connection. |
| `whatsapp_mirror.schema_migrations` | Mirror-only migration identifier, SHA-256 checksum, and application timestamp. |
| `whatsapp_mirror.messages` | Logical message records; verified protocol identity is the cross-Bridge deduplication key, while uncertain identities remain unresolved. |
| `whatsapp_mirror.message_sources` | Separate source evidence per Bridge/stream/event, linked to a logical message when appropriate; unique source-event identity prevents duplicate source rows. |
| `whatsapp_mirror.message_events` | Event metadata associated with a source record and, where available, its logical message. |
| `whatsapp_mirror.sync_checkpoints` | Independent activation boundary, durable cursor, retry count, and last-success state for each Bridge/chat pair. |

The exact columns, PostgreSQL types, defaults, constraints, and indexes are
defined only by the authoritative SQL migration above; consult that file for
the full schema. The worker's migration mode is limited to this Mirror
migration and does not invoke the legacy migration runner.

### Validation evidence and limits

| Check | Result |
|---|---|
| Mirror worker, disposable PostgreSQL migration/checkpoint/dedup/retry/restart, Cash/Vessel routing, and uploaded exports | **PASS** — 16 Node tests, 0 failures, 0 skips; temporary isolated PostgreSQL and read-only export mounts. |
| Cash/Vessel and Cash-safety regression selection | **PASS** — 39 Node tests, 0 failures, 0 skips. |
| WhatsApp MCP full Python suite, including native contact scoping, WA-02 identity-only capability catalog, native profile, and `get_contact` tests | **PASS** — 254 tests under Python 3.12.15 in an isolated image; Ruff check and format check also pass. |
| TypeScript typecheck | **PASS** — `tsc --noEmit --pretty false --incremental false` under Node 22.23.3. |
| Earlier saved-contact/LID focused verification | **PASS — PRIOR EVIDENCE** — 32 tests (5 Node, 27 Python), separate from this recovery validation. |
| Full app suite, production runtime capability probe after policy correction, authenticated UI flow | **NOT RUN / NOT VERIFIED** |
| Production migration, deployment, activation, and actual message delivery | **NOT RUN / NOT VERIFIED** |

All executed tests used isolated environments; the reference exports were
read-only fixtures and were not imported into any database. No production
Mirror schema or activation cursor was created.

### Production and Bridge status

- **Not deployed or activated:** no production Mirror migration, app image
  deployment, or Live Sync activation was performed. Compose remains disabled.
- **WA-01:** read-only runtime policy metadata showed the legacy owner-reader
  still has broad legacy read grants. The separate
  `alrifai-wa-01-native-reader` entry has native event/content grants but
  lacks native identity and scoped contact grants; the app's authenticated
  runtime discovery did not expose the worker-required native tools. No
  approved chat/participant values were supplied.
- **WA-02:** read-only runtime policy metadata showed
  `wa-02-owner-reader` has legacy message, contact, media, and calls grants in
  addition to native identity. It is not identity-only in the current policy;
  the observed runtime tool list also exposed legacy message/contact tools.
  Do not use those tools. Runtime policy alignment is blocked pending the
  approved policy update.
- **WA-03:** no running container was present in the observed inventory;
  it remains unconnected / ready for connection.
- No activation timestamp, production source cursor, mirrored-message count,
  or successful production sync time exists for this Mirror.

### Authorized next work and boundaries

Wait for Owner review of the completed source changes and test evidence.
Before any production activation, the Owner must separately authorize the
required runtime policy/configuration and release scope. Verify WA-01's
message/contact capabilities and authorized chat scope in runtime; keep
WA-02 identity-only and resolve its advertised-tool/policy discrepancy
without granting new authority; then separately approve migration,
deployment/restart, and Live Sync. Authenticated UI presentation and live
delivery remain unverified.

### Permission-correction source preparation

The source now offers `native.contacts.read` as a separate, narrow grant for
`get_contact`, requiring `native.events.read` and restricting lookup to
approved native chat JIDs and explicitly listed participants. This grant does
not expose `search_contacts`. Native profile validation rejects malformed
JIDs and participant entries that are not keyed by an approved chat. WA-02
identity-only catalog/denial behavior and scoped native contact lookup are
covered by the isolated Python suite above.

No runtime policy or profile was changed. Exact protected policy paths are
`/etc/vps/services/whatsapp/wa-01-consumer-policy.json` and
`/etc/vps/services/whatsapp/wa-02-consumer-policy.json`; the WA-01 profile is
`/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json`. The needed
policy state is WA-01 Mirror grants `native.identity.read`,
`native.events.read`, `native.content.read`, `native.contacts.read` (without
broad `contacts.read`) and WA-02 designated consumer grant
`native.identity.read` only. Before profile/app allowlists can be populated,
the Owner must provide verified WA-01 Cash direct-chat JID, verified Admin
sender and designated Accountant recipient identities, separately approved
Vessel chat JIDs, and exact group participant JIDs. No JID or participant
was invented or copied into source/docs. The Mirror must use the scoped WA-01
consumer's private token; credentials remain outside this handoff.

No production migration or business-data write, deployment/image release,
app or Bridge restart, Live Sync activation, historical backfill/replay,
WA-02 access expansion, or financial posting/approval change was performed
or is authorized. Keep uncertain identity/intent in review, preserve
source evidence and existing approval controls, and do not read secret
contents or send WhatsApp messages.

---

## Owner-Approved Seven-Conversation Implementation — 2026-10-27

Recorded by the implementation session. Additive: no earlier observation above
was replaced.

### Applied configuration (identifiers are DB/config data, not source)
- `public.conversation_scope`: 7 approved WA-01 conversations (1 Cash direct,
  3 Vessel direct, 3 Vessel groups); 2 direct conversations carry a verified
  PN↔LID alias (Cash Accountant, Escort Hridoy).
- `public.whatsapp_identity_aliases`: 4 rows (2 BRIDGE_LID_MAP, 2 OWNER_PROVIDED).
- `public.escort_client_contacts`: 8 active (3 Owner-provided, 5 Owner-approved
  group participants); `public.escort_client_group_authorizations`: 20 rows.
- Seed files are root-only 0600 under `/var/lib/vps/al-rifai/owner-review/`.

### Historical backfill (WA-01 store, read-only)
- 7,770 messages across the 9 approved addresses staged in
  `public.wa01_backfill_staging` (batch `backfill-20261026`); 4,591 new
  `whatsapp_messages_original` rows, remainder already stored.
- Cash: 2,278 messages in the Cash chats, 2,103 Owner outgoing, 1,819 payment
  messages → 1,819 canonical instructions (৳9,39,889.00) in REVIEW state.
  PN 1,793 + LID 26 with zero content overlap. 202 ID-shaped lines were
  rejected by the strict parser and were not published.
- Vessel: 4,560 messages queued; 19 canonical register rows (Rezaul 15 DRAFT /
  4 REVIEW). Hridoy's 116/106 derivations matched pre-transition facts by
  (account, source_hash, block_key) and were linked, not duplicated.
- Group reprocess: 754 authorized incoming group messages, 35 carried
  order-shaped blocks, 0 new drafts (assignment confirmations without a client
  order, or lighter-only "ready for program" lists).
- Run ledger: `cash_duplicate 0`, `unmatched 0`, `review_queued 0`.

### Provenance separation
- Current Cash 1,819 / Archive Cash 1,610; Current register 19 / Archive 608;
  Current programs 0 / Archive programs 5. `dataset_scope` marks 2 evidence
  datasets ARCHIVE (accounts, conversations). Zero Current postings.
- `/cash/archive` page and `?scope=archive` on `/api/cash/summary`,
  `/api/escort-register`; `/vessel` `source=archive`.

### Live synchronization
- Ingestion worker is native-reader only and scope-driven; the retired
  `list_messages` / `list_archive_messages` / `list_stored_messages` paths and
  the reserved-word SQL alias that aborted every cycle were removed.
- Cash continuation starts at boot (`instrumentation.ts`) and is review-only.
  Both Cash channels hold a durable `native_cursor`; replaying the activation
  boundary produced 0 duplicate instructions across two restarts.
- 7 Vessel chats still fail closed: the bridge native-reader grant lists only
  the 2 Cash chats and returns a generic "Tool execution failed".

### Migrations and deployment
- Applied + ledgered: 0023, 0024, 0026, 0027, 0028 (native cursors),
  0029 (native cursor failure mode). Ledger rows: 29.
- Image `sha256:ffb9e49e23c1aa808d5d9bf4e4326955df3ed42524f1914ae470fd9e9f145f32`
  deployed through `compose.yaml`; bridges and PostgreSQL were not restarted.

### Remaining blockers (unchanged root causes)
1. Bridge native projection still stalls at `native_events.event_seq = 1306`
   (2026-10-20T08:53:28Z); new rows reach `messages.db` through the history path
   that bypasses the native-event writer. Fixing needs a bridge restart or
   reconfiguration — Owner authorization required.
2. Native reader grants cover only the 2 Cash chats; the 3 Vessel direct chats
   and 3 groups cannot be read live until the bridge profile is extended.
3. `/var/lib/vps/whatsapp/wa-01/store` remains 0700/0600; the app cannot read
   SQLite directly, so historical extraction ran as a read-only probe inside the
   bridge container.
4. Authenticated browser verification of the Cash/Vessel UI still requires the
   Owner's login; APIs were verified fail-closed and the UI is covered by tests.

---

## Live Sync Blocker Fixes — 2026-10-27 (second session)

Additive record. Identifiers remain configuration data; none were added here.

### 1. Native event writer — root cause
The deployed WA-01 binary never contained the native event writer. Evidence:
`native_events`/`native_stream`/`native_payloads` string counts are 0 in
`local/vps-whatsapp:20261020-ingestion` and
`local/vps-whatsapp-mcp-candidate:20261025-0933`, but 24/4/1 in
`alrifai-whatsapp:business-workflows-20261015`. Last event
`event_seq=1306` at `2026-10-20T08:53:28Z`; 1,412 messages were stored after
that through the history-sync path (no native events, no projection errors).
A restart alone could not fix this; the image had to be rebuilt from the
current source, which contains `appendNativeMessageEvent`.

Fix: `local/vps-whatsapp:20261027-native-writer`
(`sha256:2067b1fe1a457823e3f7c3cfe61b16fa03f56a5092f39b733df352ac53af49b7`),
built from `/opt/vps/services/whatsapp/source` (go vet + go test pass), with an
additional guard so chats outside the native JID pattern (status broadcast,
newsletters) are stored without a native event instead of being rolled back.
WA-01 recreated; session and store untouched; WA-02 not restarted.
Observed after deploy: `event_seq` advanced to 1307 (live reaction in an
out-of-scope group), projection `not_applicable`, message stored with
`identity_state=RESOLVED`, and the app correctly ingested nothing for it.

### 2. Reader grants
`/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json` now lists 9
chats (2 Cash, 4 Vessel direct addresses including the Hridoy LID alias, 3
Vessel groups), 20 group participant entries, epoch 3→4. Backup:
`/var/lib/vps/al-rifai/backups/pre-native-fix-20261027/native-reader-profile.json.bak`.
Verified per chat: all 9 approved chats ALLOW, an out-of-scope direct chat and
an out-of-scope group DENY. WA-02 unchanged.

### 3. Vessel extraction
Three demonstrated defects fixed in `lib/escort-register.mjs`:
- office posts inside an approved group were unrouted; they now route as
  `VESSEL_GROUP_SOURCE` and are attributed only when the block names exactly
  one authorized participant of that group (mobile first, then exact name);
- assignments missing escort mobile / duty date / shift were discarded; they
  are now REVIEW rows with `ASSIGNMENT_EVIDENCE_INCOMPLETE:*` reasons and no
  business key (nothing is confirmed);
- LID-addressed direct chats were unmapped; `scopePhoneAliases` resolves
  Owner-approved aliases to the conversation's phone.
Reprocess (`scripts/reprocess-approved-groups.mjs`, now scope-driven and both
directions): 5,492 messages scanned, 2,771 routed, 603 parsed, 50 new rows
(2 DRAFT + 48 REVIEW). Canonical register: 69 rows (17 DRAFT / 52 REVIEW);
Archive 608 unchanged; 0 duplicate (account, source_hash, block_key).
Still unattributed by design: 178 group assignment blocks whose sender was lost
by the history path, and 52 office-posted assignments naming escorts who are not
authorized participants. Both need an Owner decision before widening contacts.

### 4. Status
Cash live continuation active (both channels have cursors, 0 duplicates,
1,819 canonical instructions unchanged). Vessel reader now authorized for the
seven conversations. End-to-end new-message verification for an approved chat
was still pending when this record was written; the writer itself is proven in
production by event 1307.

---

## Canonical Vessel Programs + Archive History — 2026-10-27 (third session)

Backup before writes: `/var/lib/vps/al-rifai/backups/pre-canonical-vessel-20261027.dump`
(63.5 MB, sha256 prefix `65d619ebaf03fa8a`). Migration 0030 applied and ledgered
(30 ledger rows): epoch-scoped register/source uniqueness and INSERT on
`programs` for `ir_review_runtime`.

Canonical reconstruction from the WA-01 message database (not from the old
application Archive):
- `scripts/backfill-vessel-canonical.mjs` (dry by default, `--apply`).
- Canonical register: 69 → 377 rows (206 DRAFT / 171 REVIEW); legacy 608 untouched.
- Canonical programs: 0 → 64 `Confirmed` (45 exact, 19 spelling-variant);
  64 `program_assignments`; 0 duplicate ids or source blocks; replay dry run = 0.
- Review reasons: 64 linked confirmations, 55 unmatched, 48 incomplete assignment
  evidence, 4 duplicate-ambiguous.
- Escort Mobile → Employee ID: 48 resolved via `employee_master`, 16 unresolved.
- Cash unchanged: 1,819 canonical / ৳939,889; 1,610 archive; 0 current postings.

Deployed image `sha256:1dd057bddc89b3376f465b77f02d38ba7010071ecf2dd774a507e9ef96cf6174`
(compose pin updated). Health 200, auth-gated APIs 401, `/cash/archive` 200,
9/9 native cursors, 2/2 Cash channels, 0 pending processing rows, restart
recovery verified (no duplicate programs or instructions).

Unverified: authenticated browser views (Owner login) and a live new-message
end-to-end pass — no approved-chat message arrived during the session.

---

## FINAL OPERATIONAL HANDOFF — 2026-10-27 (acceptance + finishing)

### VERIFIED
- Final image `sha256:20e144f06e7598c2eb740c5405442f36941db0bec24626ba12a60382be1f8aa1`
  deployed via `compose.yaml` (previous 1dd057bd); container healthy; `/api/health`
  200; database `alrifai`; migration ledger 30. This image adds the derived
  review classification (`reviewClass`, `actionableReview`, `confirmedEvidence`)
  and the Action-required / Confirmed-evidence UI.
- Cash Current 1,819 instructions / BDT 939,889.00, 0 postings, 0 duplicates;
  Cash Archive 1,610 / 1,586 postings, separate epoch.
- Vessel Current 377 register rows (206 DRAFT / 171 REVIEW), 64 confirmed
  programs, 64 assignments; Archive 608 register rows + 5 draft programs.
- All 64 programs link to a canonical DRAFT order row, the outgoing Admin
  confirmation in the same client conversation (PN/LID aware) and an assignment;
  0 duplicate programs, assignments, source blocks or business keys.
- 19 spelling-variant confirmations have exact normalized Master Mobile; 0
  conflicting candidates.
- 64 REVIEW rows are confirmed-linked evidence; 107 actionable (55 unmatched,
  47 incomplete, 5 duplicate-review).
- 16 programs have unresolved Employee Master links: 0 exact/near mobile, 1
  name-only conflict, 2 mobiles appear only as payout destinations.
- API authentication fail-closed; epoch/dataset scope separation in code.
- WA-01 ingestion: 9/9 cursors, 2/2 Cash channels, 0 pending/error; new
  out-of-scope events correctly excluded.

### IMPLEMENTED BUT NOT VERIFIED
- Authenticated Owner UI rendering (no Owner session available during checks).
- New authorized-message end-to-end path (no approved-chat message has arrived
  since deployment; native events 1307–1310 were out-of-scope).

### NEEDS REVIEW
- 55 unmatched outbound confirmations: investigation found 5 with a similar
  order but 0 conclusive; keep as actionable review.
- 47 incomplete assignments: 4 have later messages in the same conversation but
  none supplies the missing field conclusively; keep in review.
- 5 duplicate-review rows (two same-lighter pairs + one incomplete/ambiguous);
  Owner decision required before any merge.
- 16 employee links (see above).
- 3 two-character vessel-name variants (e.g. `Belforte` / `Belforte At`) with
  exact Master Mobile; spot-check recommended, do not undo automatically.

### BLOCKED
- No technical blocker. Owner login and a genuine new authorized message are
  required to close the two NOT VERIFIED items.

### Safe next steps
1. Owner logs in and checks `/vessel` (Current, Archive History, Action required,
   Confirmed evidence) and `/cash` + `/cash/archive`.
2. On the next real authorized message, trace native event → mirror → processor
   → canonical row → page; do not send test messages.
3. Resolve NEEDS REVIEW items only with source evidence and Owner approval.

### Prohibited
Rebuild/re-pair/reset, cursor resets, table clears, write-mode historical
reprocessing, Cash posting/approval, WhatsApp sends, WA-02 scope expansion,
employee merges, or deployments without Owner authorization.

---

## GitHub & Review-Age Verification — 2026-10-27

### Repositories (read-only inspection; nothing committed or pushed)
- **VPS repository:** `/opt/vps`, remote `https://github.com/arshiyaazim/opt_vps.git`,
  branch `main`, HEAD `39ce58fe10bb7bbe747325295e452cbd09561bee` ("first commit").
  No upstream configured; ahead/behind cannot be determined without fetching.
- **Application repository:** `/opt/vps/apps/al-rifai` is a **nested independent
  repository** (own `.git`, no `.gitmodules`), remote
  `https://github.com/arshiyaazim/opt_vps.git` — the same URL as the parent, not
  an app-specific repository. Branch `main`, HEAD
  `6b9b18d9f10d8a0cf76e6d95d45c0b89207c0816` (2026-10-16). No upstream configured.
- The parent indexes `apps/al-rifai` and `services/whatsapp/source` as gitlinks
  (mode `160000`) without submodule configuration.
- **Image-to-commit:** the deployed image was built from the dirty working tree
  (115 app-repo entries), not from HEAD. Commit-level traceability is
  **NOT VERIFIED**; the image maps to the build snapshot only. All local changes
  remain uncommitted and unpushed.

### Review age (source WhatsApp timestamps, Dhaka date; window 2026-07-27 → 2026-10-27)
- Actionable 107: **95 RECENT_REVIEW**, **12 UNVERIFIED_LEGACY**, 0 DATE_UNVERIFIED.
  Breakdown — unmatched 55 (45 recent / 10 legacy), incomplete 48 (46/2),
  duplicate-review 4 (4/0).
- Employee links unresolved 16: **14 recent / 2 legacy** (by program duty/order date).
- Spelling spot-check 3 (two-character distance): **1 recent / 2 legacy**.
- Resolved by new evidence: **0**. Derived `reviewAge` is presentation-only; no
  row status or source evidence changed.

### Status
- Authenticated UI acceptance: **NOT VERIFIED** — the private validation Basic-auth
  credential is Owner-held and was not read or used.
- Live E2E: **NOT VERIFIED** — no authorized-chat message has arrived; native
  events 1307–1312 were all out-of-scope.

---

## Cash/Vessel workflow recovery — 2026-10-27 (implementation, not deployed)

### Vessel parser defect fixed
- Cause: October assignments use a malformed shift suffix (`22/10/26 ((N)`).
  `parseEscortDate` required a single parenthesis, so the duty date and shift were
  dropped and 14 assignments stayed INCOMPLETE.
- Fix: `lib/escort-intake-candidate.mjs` accepts repeated/mismatched parentheses
  around the shift (no value guessing).
- Evidence: all 14 assignments now parse date+shift; 11 match a unique original
  order (6 EXACT, 5 VARIANT), 3 remain unmatched. Duty dates are 2026-10-22..25.
- `scripts/reconcile-vessel-assignments.mjs` (dry run by default) re-parses the
  stored source text, fills only missing fields, links the confirmation and
  creates one program per Lighter. Dry run: scanned 14, confirmable 11,
  unmatched 3, programs 11. **--apply is a production DB write and is NOT run.**

### Cash/Vessel read-only API + frontend
- `GET /api/cash/summary` now also returns `employees`, `payouts`, `complete`,
  `notes` (same server-owned scope/filters); the Cash page uses the global
  counts and keeps pagination (100/page, 19 pages for 1,819).
- `GET /api/escort-register?summary=1` returns summary + `latestSourceTime`
  without rows/source text; the Vessel header uses it and now says
  "latest register activity" (not "latest source activity").
- Built image `sha256:049627fa8eb3c95aaed45b0fa2ac29b97965ca74e8bf44b6541a696f687a3963`
  (tag `local/al-rifai:owner-approved-20261027e`); **not deployed**.

### Pending Owner approval
1. Run `reconcile-vessel-assignments.mjs --apply` (11 confirmed programs).
2. Deploy the new image (compose pin + recreate app only).
3. Live end-to-end verification with a genuine new authorized message.

---

## GITHUB SOURCE CONTROL AND SESSION HANDOFF — 2026-10-27 (authoritative)

This section supersedes every earlier Git/GitHub note in this file. Earlier
sections remain dated historical evidence for business work.

### A. Session summary
- Repaired the broken repository architecture: three gitlinks without
  `.gitmodules` were replaced by ordinary tracked source directories.
- Imported the complete application, WhatsApp bridge/MCP server, infrastructure
  and operational documentation into one monorepo and pushed it to GitHub.
- Removed a stray credential from `apps/al-rifai/.env.example` before publishing.
- Created MD5/SHA-1/SHA-256 integrity manifests for the source snapshot.
- Updated `docs/VPS_MAP.md`, `AGENTS.md` and this handoff.
- No production container, database row, WhatsApp session or permission was
  changed by this Git work.

### B. Git architecture
- Root: `/opt/vps`; branch `main`; remote
  `git@github.com:arshiyaazim/opt_vps.git`.
- Tracked: `apps/al-rifai/`, `services/whatsapp/source/`,
  `services/whatsapp/compose.yaml`, `infra/`, `docs/`, root documents.
- No gitlinks, no `.gitmodules`, no nested repositories remain in the tree.
- Former nested histories are preserved as verified bundles and bare clones in
  `/var/lib/vps/al-rifai/backups/git-20261027/`:
  `apps-al-rifai.git`, `whatsapp-source.git`,
  `apps-al-rifai-history-20261027.bundle`,
  `whatsapp-source-history-20261027.bundle`,
  `opt-vps-pre-github-20261027.bundle`,
  `staging-cash-history-20261027.bundle`.
- `staging/cash-standalone-readonly-projection-20261017` remains a separate
  checkout of `arshiyaazim/wa_msg_to_auto_respoder` and is intentionally ignored.
- The previous local history is retained on branch
  `archive/pre-github-20261027` (not published).

### C. GitHub status
- Repository `arshiyaazim/opt_vps` (public; Owner approved publishing on
  2026-10-27).
- Source snapshot commit: `06356b6e2c2b92fbf120d2b8350d0a9c1917b28e`.
- Documentation + integrity manifest commit: the HEAD of `main`; read it with
  `git rev-parse HEAD` (never hardcode a SHA that has not been pushed).
- Push verification: remote `refs/heads/main` must equal local `HEAD`; a clean
  clone must contain `apps/al-rifai/package.json`,
  `services/whatsapp/source/whatsapp-bridge/main.go` and
  `services/whatsapp/source/whatsapp-mcp-server/native_reader.py`.

### D. Production baseline (verified 2026-10-27)
- App container `al-rifai-app-1`, image
  `sha256:049627fa8eb3c95aaed45b0fa2ac29b97965ca74e8bf44b6541a696f687a3963`.
- WA-01 `vps-whatsapp-wa-01-cap4-20261011`, image
  `sha256:ae009303de09f564390d14a5ef1f7c30018040b52a73074f273a8dd67683bb33`.
- WA-02 `vps-whatsapp-wa-02-cap4-20261011` unchanged (identity-only).
- PostgreSQL `vps-infra-postgres-1`, database `alrifai`.
- Cash Freeze intact; no postings, no approvals, no settlement.

### E. Cash and Vessel state
- Cash Current: 1,819 instructions / BDT 939,889.00, 0 postings, 180 employee
  IDs, 309 payout numbers, all REVIEW. Archive: 1,610 instructions, 1,586
  legacy postings.
- Vessel: 377 register rows (206 DRAFT / 171 REVIEW), 75 confirmed programs,
  75 assignments, newest confirmed `startDate` 2026-10-25. 37 REVIEW rows still
  carry `ASSIGNMENT_EVIDENCE_INCOMPLETE`; 3 reconciliation candidates remain
  unmatched in REVIEW.
- Owner-reported "BDT 945,890" is not reproducible from any canonical row,
  posting, candidate or duplicate; the ledger total is BDT 939,889.

### F. WhatsApp live E2E (verified)
- Group identity fix deployed: the reader admits the paired Admin PN/LID for its
  own outgoing group messages and admits a client LID only when the bridge store
  resolved that same message to an allowlisted PN.
- Recovered events 1327 (Office group, Admin outgoing), 1328/1329 (client LID in
  an approved group).
- Genuinely new live messages after the fix: event 1333 (Owner test message,
  mirrored once, vessel `NOT_VESSEL_INTENT`, no business row) and events
  1330–1332 (Accountant LID, cash `NOT_OWNER_OUTGOING`, no Cash row).
- Cursors: all 9 approved chats advanced with no error; 2/2 Cash channels clean.

### G. Source integrity
- `docs/SOURCE_INTEGRITY_MANIFEST.txt` — size, SHA-256, SHA-1, MD5 for all 554
  tracked files of source snapshot `06356b6`.
- Companions: `docs/SOURCE_INTEGRITY_MANIFEST.sha256` (primary),
  `.sha1`, `.md5`.
- Verify:
  ```bash
  git archive --format=tar 06356b6e2c2b92fbf120d2b8350d0a9c1917b28e | tar -x -C /tmp/alrifai-snapshot
  git show HEAD:docs/SOURCE_INTEGRITY_MANIFEST.sha256 > /tmp/alrifai-snapshot/docs/SOURCE_INTEGRITY_MANIFEST.sha256
  cd /tmp/alrifai-snapshot && sha256sum -c docs/SOURCE_INTEGRITY_MANIFEST.sha256
  ```
- The manifest covers the source snapshot, not the later documentation commit.

### H. Security
- Excluded from Git: `.env`/secret files, WhatsApp session and message stores,
  `apps/al-rifai/data/*` (except `conversation-policy.json`), `import/`,
  `staging/`, all `qualification/` evidence, `node_modules`, `.next`, `.venv`,
  `.pnpm-store`, dumps, logs and archives.
- A 64-character credential was removed from `apps/al-rifai/.env.example`; the
  original is preserved locally (mode 0600) at
  `/var/lib/vps/al-rifai/backups/git-20261027/app-env-example-with-leaked-token.bak`.
- Secret scan of the published tree: no private keys, GitHub/AWS/Slack/OpenAI
  tokens or password values. Remaining phone-number-like strings are synthetic
  test fixtures.
- Risk: the repository is public, so infrastructure paths and operational
  documentation are world-readable. No runtime secret is published.

### I. Recovery
- Source: `git clone git@github.com:arshiyaazim/opt_vps.git` (or HTTPS).
- Nested history: `git clone /var/lib/vps/al-rifai/backups/git-20261027/apps-al-rifai.git`
  or restore from the corresponding `.bundle` with `git clone <bundle>`.
- Runtime data is **not** in Git. Restore business data only from PostgreSQL
  backups (`/var/lib/vps/al-rifai/backups/`) following the existing recovery
  procedure; never overwrite live volumes from a clone.

### J. Pending work
- Image-to-commit traceability: the running app/WA-01 images predate the source
  commit; record commit + digest together on the next approved deployment.
- Cash: no genuinely new Owner→Accountant instruction has been observed live yet;
  the next real instruction should produce a REVIEW row and no posting.
- Vessel: 3 unmatched reconciliation candidates and 37 incomplete REVIEW rows
  remain for Owner/business review.
- Owner-reported BDT 945,890 still needs the exact screen/tab to reconcile.

### K. Next-session starting instructions
1. Read this section, then `AGENTS.md` §0, §2.4 and §12.
2. Verify production read-only: `docker ps`, app `/api/health`, Cash/Vessel counts.
3. Verify source state: `cd /opt/vps && git status --short && git log --oneline -3`.
4. Do not restart, redeploy, migrate, post, approve or re-pair without explicit
   Owner authorization.
5. For source changes: edit, test in an isolated environment, commit with a clear
   message, push `main`, and regenerate the integrity manifest for the release.
