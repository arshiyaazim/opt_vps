# AL-RIFA'I Development and Production Safety

**Project:** `/opt/vps/apps/al-rifai`
**App configuration:** `/etc/vps/apps/al-rifai/app.env`
**PostgreSQL container:** `vps-infra-postgres-1`
**Database:** `alrifai`
**App container:** `al-rifai-app-1`
**Runtime (inside container):** Node.js 22.23.3 (verified from `al-rifai-app-1` at 2026-10-21 07:05 CEST)
**Package manager (build stage):** pnpm (pinned via `package.json` `packageManager` field)

---

## 0. Current Production Position (verified 2026-10-27)

> **Current production position — 2026-10-29 (authoritative; supersedes the banners below):**
> app image `sha256:ef06c2ef68689d68e63879d9158a47caa575a159b355ce0bd5e9f7fd3ad651ad`
> (tag `local/al-rifai:20261029-review-nav-fix`, source `9bc9f85`; verified 2026-10-30
> via `docker inspect al-rifai-app-1`), mode `shadow`, 3 Cash Portal users (Owner `Admin`, USER
> `officeassistant`, USER `officeazzistant2`), ledger 32 (migration 0031 applied, 0032 not
> applied, 0033 applied), 0 current postings, freeze intact. Legacy IP-bucket login rate limiter removed; new username-keyed throttle in `apps/al-rifai/lib/login-throttle.ts` (migration 0036 applied 2026-10-30, throttle active).
> WA-01 degraded (1 of 9 chats failing; diagnosis recorded, bridge fix deferred by Owner).
> Full state, open items and deferred triggers: `NEXT-SESSION-HANDOFF.md` → "CURRENT STATE — 2026-10-29".

> **UI visibility repair — 2026-10-27:** commit `a157f58` exposes the workspace
> routes through boundary-exact private-entry allowlists and adds the
> “PLATFORM WORKSPACE” groups to the legacy Cash/Vessel sidebars. Deployed image
> `sha256:5f3e2aad…` (app-only, healthy). Authenticated browser verification is
> pending Owner login. Details in NEXT-SESSION-HANDOFF.md.
>
> **Release — 2026-10-27 (application-only, FINAL):** release commit `2881926`
> deployed as image `sha256:34ce3060…` (candidate `d6f274…` superseded; first
> attempt rolled back over a missing worker module, fixed and redeployed).
> Migrations 0031/0032 are READY FOR OWNER APPROVAL and NOT applied; Cash Freeze
> intact (1,842 instructions / 0 current postings). Verified DB backup sha256
> `e38086b3…`, compose backup, rollback image `049627fa…`, and exact next steps
> are in the FINAL SYSTEM STATE section of NEXT-SESSION-HANDOFF.md. Source
> pushed to origin; working tree clean. Do not start a new implementation cycle
> without Owner direction.
>
> **Implementation update — 2026-10-27 (session 3):** source `main` at
> `2881926` (feature commits `6df2352`, `53b7ae3`; release fix `2881926`). Added the Vessel command API (`/api/vessel-programs`) and
> `/vessel-register` UI with server-resolved actor, revision/idempotency guards,
> append-only audit and migration-dependency gating; 0032 revised + rehearsed.
> Migration readiness pack: `apps/al-rifai/docs/MIGRATION-READINESS-0031-0032.md`.
> No production deployment, migration, WhatsApp, permission or Cash Freeze change.
>
> **Implementation update — 2026-10-27 (session 2):** source `main` is at
> `765835c` (feature commits `b8bd93d`, `1c604be`, `2805879`). Added: Cash
> submission/approval API + `/cash/submissions` queue UI
> (returns a migration-dependency response until the prepared schema is applied),
> rehearsed candidate migrations `0031` (append-only submissions/reviews) and
> `0032` (Vessel SECURITY DEFINER command layer), shadow duplicate classifier
> (`ALRIFAI_DUPLICATE_CLASSIFIER=SHADOW`, default off), and a vessel report panel.
> No production image, database, WhatsApp, permission or Cash Freeze change.
>
> **Implementation update — 2026-10-27 (post-audit session):** source `main` was
> `c93762d` (base `d5dfef28…`). New tested modules: Cash user policy guards,
> verified-Admin + shift confirmation evidence, duplicate classification,
> configurable payroll engine, Admin order-draft review UI, WhatsApp TXT format
> coverage, vessel report aggregates, and a **prepared but unapplied** Cash
> review migration candidate. No production image, database, WhatsApp,
> permission or Cash Freeze change occurred; the previously built candidate
> `sha256:d6f274…` remains undeployed. See `NEXT-SESSION-HANDOFF.md` header
> section for the full record.
> **Staleness corrections:** `ALRIFAI_CASH_SUPER_ADMIN_IDS` is present (1 id);
> §0.2 row counts drift daily; the Vessel confirmation writer exists and
> `confirmation_message_id` is populated (123 rows) — see §0.3 rules which still
> govern behaviour.

This section is the current authority for agent behaviour. Later sections remain
valid safety policy; where an older section contradicts this one, this section
wins.

> **Session-revocation parity DEPLOYED — 2026-10-28 20:53:** Cash Portal password
> changes now revoke other sessions through the shared `revokeOtherSessions`
> helper, audit the count and keep the caller signed in. Running image
> `sha256:946635bd…` (source `c113784`), mode `shadow`; rollback `sha256:d405d54f…`.
> Owner-side end-to-end confirmation of the change flow is still pending.

> **UI release DEPLOYED — 2026-10-28 19:59:** app image
> `sha256:d405d54f…` (source `8e23fff`, HEAD `77cbcef`) is live; `shadow`
> unchanged; PostgreSQL/WA untouched; identity and Cash Freeze verified after
> deploy. Rollback `sha256:2c0833c4…`. Account surface = Cash Portal
> (password only); `/admin` still unreachable in shadow; `on` not approved.
> Decision note: `apps/al-rifai/docs/DECISION-2026-10-28-UI-RELEASE.md`.

> **UI redesign — 2026-10-28 (source only, NOT deployed):** shared workspace
> design system (`app/workspace.css`, `PlatformPage` primitives) and responsive
> passes over dashboard, employees, transactions, admin, cash and vessel. Browser
> verified 60/60 (12 pages × 360/390/768/1280/1440, zero overflow) plus an
> authenticated Cash Portal HTTPS run. Candidate `sha256:d405d54f…` built, **not
> deployed**; production stays `sha256:2c0833c4…`
> in `shadow`. Known: `/admin` is unreachable in shadow mode. Record:
> `apps/al-rifai/docs/UI-REDESIGN-20261028.md`.

> **Owner suite — 2026-10-28 (source only, NOT deployed):** public homepage at
> `/` and `/signup` (no credential, no business data), instruction totals fixed to
> divide minor units (the Dipongkar "BDT 4,030,600" was a display error; true
> BDT 40,306.00), and password changes now revoke other sessions. Candidate image
> `sha256:c64d92a1…` built but **not deployed**; production remains
> `sha256:2c0833c4…` in `shadow`. Details: `NEXT-SESSION-HANDOFF.md`,
> `apps/al-rifai/docs/DIPONGKAR-AUDIT-20261028.md`.

> **Shadow redirect-loop repair — 2026-10-28 (deployed, `shadow` retained):** the
> 2026-10-28 `ERR_TOO_MANY_REDIRECTS` defect (a signed-in visitor was forwarded
> from `/login` to `/dashboard` while shadow refused to authorise it) is fixed in
> `cc10ed8`. A second shadow defect — browser navigations answered with a redirect
> instead of the `401` Basic challenge, which made every protected page
> unreachable by click — is fixed in `a32c9ef`: the `/login` redirect now applies
> only in `on` mode. Deployed image `sha256:2c0833c4…`; `shadow` unchanged;
> identity (1 `Admin` row, fingerprint `e4d99a36…`) and Cash Freeze (0 current
> postings) preserved. **`on` mode still NOT authorized.**

> **Production activation — 2026-10-28 (stages 1–3 done; `shadow` live; `on` NOT
> enabled):** Owner-authorized `0033` is applied (ledger 31 rows) and the verified
> candidate `sha256:52105520…` (commit `47f7e11`) is the running app image with
> `ALRIFAI_UNIFIED_AUTH_MODE=shadow`. Identity preserved exactly: id
> `81a73b32…c79`, `Admin`, ADMIN, version 2, fingerprint `e4d99a36…`, 24 sessions
> intact. Cash Freeze intact (1,842 current instructions / 0 current postings).
> Pre-migration backup `pre-0033-20261028.dump` (`2093fadf…`) restore-verified.
> Rollback image `sha256:5f3e2aad…` retained. **`on` mode, retiring the `validator`
> guard, and any credential change remain unauthorized and undone.** Owner login
> confirmation is the gate. Record: `apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md`.

> **Release candidate prepared — 2026-10-28 (source pushed, NOT deployed, NOT
> enabled):** `main` is at `47f7e11` on `origin`; candidate image
> `local/al-rifai:20261028-unified-auth`
> `sha256:52105520…` was built from it and **is not in use** — `compose.yaml` still
> pins `sha256:5f3e2aad…` and no container was recreated. Pre-change backup
> `pre-unified-auth-20261028.dump` (`b1f8c8fa…`) restore-verified. Identity unchanged
> (single `Admin` row, fingerprint `e4d99a36…`). Migration `0033` rehearsed twice,
> including guard-trigger and rollback, and remains **unapplied**. Record:
> `apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md`.

> **Unified Super Admin authentication — 2026-10-28 (source only, NOT deployed,
> NOT enabled):** the Owner's existing Cash Portal credential is now the unified
> identity in source. Added `/login`, `POST /api/auth/*`, `/admin` (server-gated
> on the configured Super Admin), a fail-closed dual path in `proxy.ts` gated by
> `ALRIFAI_UNIFIED_AUTH_MODE` (default `off` = deployed behaviour), and a prepared
> unapplied migration candidate `0033`. No user row, hash, session, container,
> database, WhatsApp or permission was changed; the legacy `validator` Basic guard
> is retained as the fallback. Report and cutover/rollback plan:
> `apps/al-rifai/docs/UNIFIED-AUTH-DESIGN.md`. Enabling `shadow`/`on`, applying
> 0033 and deploying all require exact Owner approval.

### 0.1 Architecture
- One application (`/opt/vps/apps/al-rifai`), one PostgreSQL database (`alrifai`),
  one app container (`al-rifai-app-1`) running the pinned image in `compose.yaml`.
- WA-01 / Bridge-1 is the authorized WhatsApp source for Cash and Vessel. Its
  verified paired account is the WhatsApp Admin identity. WA-02 is identity-only;
  never call its message/contact tools.
- Bridge SQLite (`/runtime/store/messages.db`) is transport evidence; the
  PostgreSQL mirror (`whatsapp_messages_original`) is the application source.

### 0.2 Verified data (2026-10-27, after Cash/Vessel recovery)
- Cash Current: 1,819 instructions / BDT 939,889.00, 0 postings, all REVIEW.
  Cash Archive: 1,610 instructions / 1,586 postings (legacy epoch).
- Vessel Current: 377 register rows (206 DRAFT / 171 REVIEW), 75 confirmed
  programs, 75 assignments; newest confirmed `startDate` 2026-10-25.
  Archive: 608 register rows, 5 draft programs.
- 37 REVIEW rows still carry `ASSIGNMENT_EVIDENCE_INCOMPLETE`; the 11 verified
  October assignments were reconciled into confirmed programs (6 EXACT, 5
  VARIANT) and 3 unmatched candidates remain in REVIEW.
- The reported Owner figure "BDT 945,890" is not reproducible from any canonical
  row, posting, candidate or duplicate; the ledger total is BDT 939,889.

### 0.2.1 Resolved defects and current verification state (2026-10-27)
- **Cash UI (RESOLVED):** the deployed app image contains the Cash aggregates,
  pagination and `ALRIFAI_CASH_SUPER_ADMIN_IDS`; the Owner confirmed the new
  frontend is visible (1,819 rows, BDT 939,889, Posted BDT 0, 19 pages).
- **Vessel freshness (RESOLVED):** the UI now shows canonical confirmed
  programs, latest program start, latest register activity and Draft/Review
  counts with working intake navigation.
- **WA-01 group identity (RESOLVED):** the native reader admits (a) the paired
  Admin PN/LID for its own outgoing group messages and (b) a client LID only
  when the bridge store resolved that same message to an allowlisted PN.
  Deployed bridge image `sha256:ae009303de09f564390d14a5ef1f7c30018040b52a73074f273a8dd67683bb33`;
  all 9 approved chats ingest with no error.
- **GitHub (COMPLETED):** repository architecture repaired and source pushed;
  see §2.4 and `NEXT-SESSION-HANDOFF.md` (GitHub section). Commits are now
  expected for source changes; production deployment still requires Owner
  approval and must record the deployed commit.

### 0.3 Business rules that must not be re-litigated
- Only the three authorized Escort Clients originate Vessel Orders; only the
  verified Admin → verified Accountant direct chat qualifies for Cash.
- The actual outgoing Admin WhatsApp message in the same client conversation is
  the Vessel confirmation. One program per Lighter.
- `MV`/`M.V.` prefixes are generic; spelling variants are matched by
  conversation + vessel context + Master Mobile + chronology, never by name
  alone. Never pad/truncate/fabricate a phone number.
- Escort Mobile is the Employee ID reference; `payout_mobile` is a payment
  destination and never creates or identifies an employee.
- Current vs Archive is separated by `dataset_epoch` / `dataset_scope`. Do not
  clear tables, mix Archive into Current, or rewrite statuses for display.

### 0.4 Prohibited without exact Owner authorization
- Production migrations or business-data writes; write-mode backfills;
  reprocessing the historical corpus; deployment/image release; app or Bridge
  restart; Live Sync activation; WA-02 permission changes; Cash posting,
  approval or settlement; WhatsApp sends; re-pairing; cursor resets; table
  clears; employee merges; scope expansion.

### 0.5 Mandatory before any production write
1. Identify the exact rows and source evidence. 2. Verify a usable backup.
3. Run a read-only dry run. 4. Confirm idempotency. 5. Confirm no Archive or
canonical row is silently overwritten. 6. Confirm no financial posting or
auto-confirmation.

### 0.6 Verification state
- Authenticated Owner Cash UI is **VERIFIED** by Owner confirmation (new
  frontend, 75 Vessel programs, updated Cash dashboard).
- Live WhatsApp E2E is **VERIFIED** for capture → identity → mirror → domain
  routing: Office-group event 1327 and client events 1328/1329 were recovered,
  and a genuinely new Owner message (event 1333) plus three new Accountant
  messages (events 1330–1332) were mirrored once each and classified
  `NOT_VESSEL_INTENT` / `NOT_OWNER_OUTGOING` with no business row created.
- Review age (presentation-only, source timestamps): 95 recent / 12 legacy /
  0 date-unknown among 107 actionable rows; unresolved employee links remain.
- Repositories: monorepo `/opt/vps` (branch `main`, remote
  `git@github.com:arshiyaazim/opt_vps.git`). Application and WhatsApp source are
  ordinary tracked directories; nested `.git` directories were archived under
  `/var/lib/vps/al-rifai/backups/git-20261027/`. See §2.4.
- Deployed app image:
  `sha256:049627fa8eb3c95aaed45b0fa2ac29b97965ca74e8bf44b6541a696f687a3963`.
  Deployed WA-01 image:
  `sha256:ae009303de09f564390d14a5ef1f7c30018040b52a73074f273a8dd67683bb33`.
  Both were built from the working tree before the source commit; record the
  commit SHA in every future deployment note.
- Source integrity: `docs/SOURCE_INTEGRITY_MANIFEST.txt` (plus `.sha256`,
  `.sha1`, `.md5`) covers source snapshot commit `06356b6`.
- Remaining limitation: the deployed images predate the source commit, so
  image-to-commit traceability is still NOT VERIFIED for the currently running
  containers.
- Reference documents: `docs/VESSEL-WORKFLOW.md` (business rules),
  `NEXT-SESSION-HANDOFF.md` (state), `docs/VPS_MAP.md` (infrastructure).

---

## 1. Cash Domain Development Unfreeze and Owner Boundaries

The Owner has removed the previous Cash development freeze for the explicitly
authorized Cash, WhatsApp, Message Mirror, Vessel, and UI integration work.
This permits source and isolated-test changes; it does **not** remove business
security controls or authorize production actions.

Preserve the verified Admin-to-designated-Accountant eligibility, separate
employee identity from payout numbers, source/sender/recipient verification,
authentication, roles, approval/review controls, duplicate protection, and
original source evidence. Route uncertain identities or intent to review.
Do not automatically approve or post financial transactions. Do not change
legacy records or reconcile the Mirror against legacy business data.

Production PostgreSQL migrations or writes, deployment/image release, service
or Bridge restart, Live Sync activation, historical backfill/reprocessing,
WA-02 permission changes, and financial posting/approval/settlement remain
prohibited unless the Owner separately authorizes the exact production action.
WA-02 remains identity-only by policy; never call its message/contact tools
from an integration worker. WA-01 now exposes only
`get_native_account_identity`, `list_native_events`, `list_native_messages` and
`get_contact`; WA-02 still exposes identity plus broader legacy message/contact
tools, which is a blocker to report — not authority to use or expand them.

The current path-specific development authorization covers the paths listed
in the Owner's “Cash Unfreeze & WhatsApp Integration Recovery” and
“Documentation Synchronization” instructions. Do not extend edits to
additional protected paths without a new exact-path Owner authorization.
Never read or print credentials or secret-file contents. Do not send WhatsApp
messages or create credentials.

The advisory path guard is at `apps/al-rifai/scripts/cash-freeze-guard.mjs`.
It is not an approval authority, a production gate, or a substitute for
repository review, CODEOWNERS, branch protection, or production approval.
Preserve approved work and report exact changed paths and validation evidence.

---

## 2. Runtime Reality — Host vs Container

**The host shell is not the AL-RIFA'I app runtime.** The canonical runtime is the Docker app container `al-rifai-app-1`. Do not assume host shell binaries are authoritative.

### 2.1 Host executables (verified)
| Tool | Status | Path / Version |
|---|---|---|
| Node.js | **not installed on host** | — |
| npm | **not installed on host** | — |
| pnpm | **not installed on host** | — |
| npx | **not installed on host** | — |
| Corepack | **not installed on host** | — |
| Python 3 | installed | `/usr/bin/python3` (3.10.12) |
| pip / uv / pytest | not installed | — |
| Docker | installed | `/usr/bin/docker` (v29.8.2) |
| Docker Compose | installed | `/usr/bin/docker compose` (v5.6.0) |
| psql | not installed on host | use via `docker exec` |

### 2.2 Container runtimes (verified)
- **App container `al-rifai-app-1`:** Node 22.23.3 (verified 2026-10-21), built from `node:22.23.3-bookworm`.
- **Build stage:** uses pinned `pnpm` with `--frozen-lockfile`. **Production runtime image does not contain pnpm or python3.** Do not treat the running container as a build/test environment.
- **PostgreSQL container `vps-infra-postgres-1`:** `postgres:16-alpine`.
- **WhatsApp bridges:** `vps-whatsapp-wa-01-cap4-20261011` (UID 10002) runs
  `local/vps-whatsapp:20261027-native-writer`; `vps-whatsapp-wa-02-cap4-20261011`
  (UID 10003) runs `local/vps-whatsapp:20261020-ingestion`.

### 2.3 Python
- AL-RIFA'I app runtime does **not** use Python.
- Host Python exists for VPS tooling only; there is no project venv.

### 2.4 Git and GitHub source control
- **Repository:** `/opt/vps` is the single monorepo; remote
  `git@github.com:arshiyaazim/opt_vps.git`, branch `main`.
- **Tracked source:** `apps/al-rifai/` (Next.js app, Cash/Vessel domain, db
  migrations, scripts, tests), `services/whatsapp/source/` (Go bridge + Python
  MCP server), `services/whatsapp/compose.yaml`, `infra/`, `docs/` and the root
  operational documents.
- **Not tracked (must stay local):** runtime data, credentials, WhatsApp
  session/message stores, `apps/al-rifai/data/*`, `import/`, `staging/`,
  `qualification/` evidence, `node_modules`, `.next`, `.venv`, `.pnpm-store`,
  dumps, logs and archives. `.gitignore` encodes this.
- **Nested histories:** the former nested repositories (`apps/al-rifai`,
  `services/whatsapp/source`) were flattened. Their full histories are preserved
  as verified bundles and bare clones in
  `/var/lib/vps/al-rifai/backups/git-20261027/`. Do not delete that directory.
- **Commands:**
  ```bash
  cd /opt/vps
  git status --short
  git add -A && git commit -m "<scope>: <change>"   # source change
  git push origin main
  ```
- **Rules:** never commit `.env`/secrets or runtime data; never force-push;
  never rewrite published history; production deploy/restart still needs Owner
  approval and must record the deployed commit SHA and image digest.
- **Integrity:** `docs/SOURCE_INTEGRITY_MANIFEST.txt` (SHA-256 primary, SHA-1 and
  MD5 supplementary) with companion `.sha256`/`.sha1`/`.md5` files; regenerate
  for each release commit.

---

## 3. Canonical Paths

| Purpose | Path |
|---|---|
| Project root | `/opt/vps/apps/al-rifai` |
| App env file | `/etc/vps/apps/al-rifai/app.env` |
| DB password file (mounted secret, never printed) | `/etc/vps/apps/al-rifai/database_password` |
| WA-01 control dir | `/var/lib/vps/whatsapp/wa-01/control` (mode `0710`, owner `10002:10002`) |
| WA-02 control dir | `/var/lib/vps/whatsapp/wa-02/control` (mode `0710`, owner `10003:10003`) |
| WA-01 / WA-02 MCP socket | `<control>/mcp.sock` (mode `0660`, group-owned by bridge GID) |
| Runtime evidence dir | `/var/lib/vps/al-rifai/evidence` |

**Permission model:** App container runs as UID `10001` with supplementary groups `10002,10003`. Control directories use mode `0710` so the app can traverse to the socket without listing the directory. **Do not weaken these permissions** (no `0777`, no public read on `store`/`outbox`/`control`).

**Current control mounts:** `apps/al-rifai/compose.yaml` mounts both control
directories with `read_only: false` so the app can use the existing Unix
sockets. This was an Owner-authorized, path-limited deployment exception.
The host directories remain `0710`; socket files were observed as `0660`.
Do not generalize this exception to other paths or services.

---

## 4. PostgreSQL

- **Container:** `vps-infra-postgres-1`
- **Database:** `alrifai` (hardcoded in `db/postgres.mjs`; `PGDATABASE` is not read)
- **Role:** `alrifai_app` (default in code)
- **Port:** `5432` (hardcoded in code)
- **Credentials:** supplied via mounted secret file (`PGPASSWORD_FILE`), never echoed into logs or docs.
- **Connection strategy:** existing Docker network + mounted secret. Do **not** create new DB users or change credentials.

### Environment variable NAMES (never print or copy values)
Present in `app.env` / compose:
- `ALRIFAI_EVIDENCE_DIR`, `ALRIFAI_REVIEW_PROFILE`,
  `ALRIFAI_VALIDATION_PASSWORD_FILE`, `ALRIFAI_REVIEW_PASSWORD_FILE`,
  `ALRIFAI_NATIVE_MANIFEST_FILE`, `NODE_ENV`, `PGHOST`, `PGPASSWORD_FILE`,
  `PGSCHEMA`
- Cash: `ALRIFAI_CASH_OWNER_PERSON_REF`, `ALRIFAI_CASH_OWNER_BINDING_REF`,
  `ALRIFAI_CASH_ORIGIN`, `ALRIFAI_LIVE_CASH_SYNC`,
  `ALRIFAI_LIVE_CASH_INTENT_CAPTURE`
- Vessel: `ALRIFAI_VESSEL_PROCESSING_ENABLED`
- Mirror: `ALRIFAI_MESSAGE_MIRROR_ENABLED`, `ALRIFAI_MESSAGE_MIRROR_MODE`,
  `ALRIFAI_MIRROR_WORKER_PASSWORD_FILE`
- WhatsApp: `WHATSAPP_WA01_MCP_SOCKET`, `WHATSAPP_WA01_READER_TOKEN_FILE`,
  `WHATSAPP_WA02_MCP_SOCKET`, `WHATSAPP_WA02_READER_TOKEN_FILE`
- **Expected but absent (verified 2026-10-27):** `ALRIFAI_CASH_SUPER_ADMIN_IDS`
  — its absence blocks the Cash summary API (see §0.2.1).

> `PGPORT`, `PGDATABASE`, and `PGUSER` are not read from `app.env`: port `5432`, database `alrifai`, and the default role `alrifai_app` are defined in code. `PGHOST` may override the default host. Do not copy plaintext credentials into AGENTS.md or logs.

### Compose precedence
`compose.yaml` → `env_file` (`/etc/vps/apps/al-rifai/app.env`) → explicit `environment:` overrides → bind-mounted secret files. The app relies on **file-backed secret mounts**, not workspace `.env` values in tracked source.

---

## 5. API Endpoints (AL-RIFA'I App)

Route inventory from `app/api/**/route.ts` and `app/candidate-api/[...path]/route.ts`:

| Path | Methods | Notes |
|---|---|---|
| `/api/health` | `GET` | Database-backed health check. |
| `/api/register` | `GET` | Private register read. |
| `/api/vessels` | `GET` | Private vessel register read. |
| `/api/program-tools` | `GET` | Private program workflow read. |
| `/api/escort-register` | `GET` | Private escort register read. |
| `/api/conversations` | `GET` | Private conversation/archive read. |
| `/api/import-audit` | `GET` | Private import evidence read. |
| `/api/core` | `GET` | Private integration connection state. |
| `/api/operations` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Non-GET handlers are present but return method-not-allowed. |
| `/api/assistant` | `POST` | Private read-only question endpoint. |
| `/api/cash/[...path]` | `GET`, `POST`, `PATCH` | Dynamic Cash route; endpoint inventory only. Cash source development is unfrozen within the Owner-authorized scope; production financial controls remain in force. |
| `/candidate-api/[...path]` | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` | Dynamic candidate API host route. |

Do not probe write endpoints during audits. This table describes registered route handlers, not authorization outcomes or business behavior.

---

## 6. Safe Commands for Agents

### 6.1 Application tests (isolated, non-production)
```bash
# Run only in an authorized isolated Node.js 22 environment, never in production.
# package.json pins pnpm@11.25.0; install from the committed lockfile:
cd /opt/vps/apps/al-rifai
pnpm install --frozen-lockfile
pnpm test
```

The project requires Node.js `>=22.13.0`. Use the pnpm version pinned in
`package.json`; do not use npm/npx or the production container for tests.

### 6.2 Typecheck, lint, build
```bash
# Use the same authorized isolated Node.js 22 environment and installed dependencies:
cd /opt/vps/apps/al-rifai
pnpm typecheck
pnpm lint
pnpm build
```

Do not build or redeploy production images unless separately authorized.

### 6.3 Read-only health & inventory
```bash
# App health (local, non-mutating):
curl -fsS http://127.0.0.1:3000/api/health

# App DB verification (bounded, read-only):
docker exec -i vps-infra-postgres-1 psql -U alrifai_app -d alrifai -At \
  -c "SELECT count(*) FROM public.whatsapp_messages_original;"

# Container status:
docker ps --format '{{.Names}}\t{{.Status}}' \
  | grep -E 'al-rifai-app|wa-01|wa-02|postgres'

# WhatsApp control dir inspection (read-only):
ls -l /var/lib/vps/whatsapp/wa-01/control
ls -l /var/lib/vps/whatsapp/wa-02/control
```

### 6.4 WhatsApp bridge checks (read-only only)
- Inspect mounted control sockets and container health only.
- Do **not** restart, re-pair, reset, or wipe sessions.
- Do **not** overwrite credentials.
- Bridge health probe (via `docker exec`, uses mounted reader token — token value never printed):
  ```bash
  docker exec vps-whatsapp-wa-01-cap4-20261011 sh -c \
    'wget -qO- --timeout=5 http://127.0.0.1:8080/api/health'
  ```

---

## 7. Production Safety Restrictions

### 7.1 Absolute prohibitions (no exceptions, even with Owner authorization)
- Do not use `nsenter`, `strace`, `gdb`, or any host-level namespace/process
  attachment tool to enter a container's network, PID, or mount namespace.
- Do not `cat`, `head`, `tail`, `less`, or otherwise read the **contents** of
  any file under `/etc/vps/apps/al-rifai/auth/`,
  `/etc/vps/services/whatsapp/*.token`, or any `*_PASSWORD_FILE` /
  `*_TOKEN_FILE` path. Use `test -r <file>` to verify existence and
  readability only.
- Do not print, echo, log, or include any secret value (token, password,
  private key) in chat output, tool output, or documentation.

### 7.2 Prohibited without explicit Owner authorization
- Restart or redeploy of app or WhatsApp bridges
- Migration, reset, or schema change of PostgreSQL
- Payment posting or approval changes
- WhatsApp pairing reset, session wipe, or credential overwrite
- Production business-data writes
- Synthetic business-data creation
- Permission changes on `/var/lib/vps/whatsapp/wa-0X/{store,outbox,control}`
  beyond the documented `0710` traverse model
- Removal of any running container without verified ownership

### 7.3 Bridge health check — approved method only
- Use `docker exec <container> sh -c 'wget -qO- --timeout=5 http://127.0.0.1:8080/api/health'`
  as shown in Section 6.4.
- If the bridge container lacks an HTTP client, **report the limitation** —
  do not work around it with `nsenter` or host-network access.

---

## 8. Docker Inventory (observed 2026-10-21; re-verified 2026-10-27)

**14 containers running** on the VPS (re-verified 2026-10-27): 4 Compose-managed
and 10 GitHub MCP tooling containers. Container names below remain the
2026-10-21 observation and were not individually re-verified; the count is
current. The inventory is an observation, not a permanent count.

### Managed by Compose (4)
| Container | Project | Compose file |
|---|---|---|
| `al-rifai-app-1` | `al-rifai` | `apps/al-rifai/compose.yaml` |
| `vps-infra-postgres-1` | `vps-infra` | `infra/compose.yaml` |
| `vps-whatsapp-wa-01-cap4-20261011` | `vps-whatsapp-cap4-wa01` (runtime label) | `services/whatsapp/compose.yaml` (declared name: `vps-whatsapp-privacy`) |
| `vps-whatsapp-wa-02-cap4-20261011` | `vps-whatsapp-cap4-wa01` (runtime label) | same |

> The WhatsApp Compose file declares `name: vps-whatsapp-privacy`, but containers run under project `vps-whatsapp-cap4-wa01` due to a `-p` override at deploy time. This is intentional; do not reconcile without Owner review.

### Unmanaged tooling containers (10)
Ten containers running `ghcr.io/github/github-mcp-server:0.29.0` were observed:
`awesome_mccarthy`, `unruffled_kepler`, `stoic_wilbur`, `dazzling_shockley`,
`strange_banach`, `loving_payne`, `wizardly_einstein`, `elegant_jang`,
`elated_ellis`, and `youthful_nightingale`. Host process inspection observed
owner `root`, process name `github-mcp-serv`, and parent process
`containerd-shim` for each. Raw process arguments were not collected. No
container was stopped, removed, or changed during that inspection.

**Do not remove these containers without Owner authorization**, even though they are unmanaged.

---

## 9. Troubleshooting Guide

| Symptom | First action |
|---|---|
| `node`/`npm` missing on host | Use the Dockerized app runtime or the ephemeral `node:22.23.3-bookworm` container. Do not install Node on the host. |
| App dependencies missing in a validation env | Use the checked-in lockfile; run `pnpm install --frozen-lockfile` in the authorized isolated env only. Never install into production. |
| Mounted file missing | Check `/etc/vps/apps/al-rifai/` and the Compose bind-mount targets before assuming a code defect. |
| DB access fails | Verify container is healthy (`docker ps`), check secret file path, then run bounded read-only SQL against `alrifai`. |
| App cannot reach bridge socket | Confirm control dir mode is `0710` and owned by bridge UID; confirm app UID 10001 has supplementary group matching bridge GID (10002 or 10003); confirm socket exists and mode is `0660`. **Do not `chmod 777` or widen permissions.** |
| Bridge log shows disconnect/reconnect | This is observable in logs but is **not** sufficient grounds to restart. Document and escalate to Owner. |

---

## 10. Agent Readiness Checklist

Before any action, an agent must confirm:
- [ ] The action is **read-only**, **or** it has explicit Owner authorization.
- [ ] Any protected-path edit is within the Owner's exact authorized paths.
- [ ] Cash identity, source, permission, review, and financial controls remain intact.
- [ ] The action does not restart, re-pair, or reconfigure any container.
- [ ] Secrets are not read into logs, chat, or documentation.
- [ ] If a tool/binary is missing on host, the Dockerized runtime is used instead.
- [ ] Permission model on WhatsApp control dirs (`0710` + `0660` socket) is preserved.
- [ ] Any discovered discrepancy (container count, Compose labels, env mismatch) is **reported**, not auto-fixed.

**When in doubt: stop, document, request Owner authorization.**
## 11. Control Directory Permission Persistence

### P1: systemd-tmpfiles (ACTIVE — installed Session 3)
Config: /etc/tmpfiles.d/vps-whatsapp-control.conf
Contents:
    d /var/lib/vps/whatsapp/wa-01/control 0710 10002 10002 -
    d /var/lib/vps/whatsapp/wa-02/control 0710 10003 10003 -
Apply manually: sudo systemd-tmpfiles --create
Runs automatically on boot via systemd-tmpfiles-setup.service.
After any bridge recreate, run:
    sudo systemd-tmpfiles --create /etc/tmpfiles.d/vps-whatsapp-control.conf

### P2: Bridge Entrypoint (BACKUP — not yet applied)
If P1 fails after reboot, add to
/opt/vps/services/whatsapp/source/service-entrypoint.sh:
    chmod 0710 /runtime/control 2>/dev/null || true
Then rebuild image and recreate bridges.

## 12. Al-Rifa'i live workflow and evidence rules

- The existing application at `/opt/vps/apps/al-rifai` and its single
  PostgreSQL database `alrifai` are the implementation target. Do not create
  a replacement app or database.
- **History (2026-10-25):** the Owner's Message Mirror direction identified
  WA-01 and WA-02 as intended sources and required WA-03 support; at that time
  the running artifact lacked the Mirror worker, migration 0025 was not applied,
  no activation cursor existed, the `whatsapp_mirror` schema was absent, and
  WA-01 exposed only stored/archive MCP tools. Keep this as dated history; it no
  longer describes the running system.
- **Current (2026-10-27):** migration 0025 is applied and ledgered (30 ledger
  rows) and the `whatsapp_mirror` schema exists. The Mirror worker is present in
  the image but **disabled** (`ALRIFAI_MESSAGE_MIRROR_ENABLED=0`,
  `ALRIFAI_MESSAGE_MIRROR_MODE=EVIDENCE_ONLY`). Live ingestion uses the WA-01
  native reader: 9/9 approved-scope cursors in `whatsapp_native_sync_state` and
  2/2 Cash channels in `cash_live_sync_channels`.
- **WA-01 tools (2026-10-27):** `get_native_account_identity`,
  `list_native_events`, `list_native_messages`, `get_contact`. WA-02 still
  exposes identity plus legacy message/contact tools; never call them from an
  integration worker and do not infer grants from a runtime tool list.
- **Bridge health probe:** still returns exit code 6 although `wget` exists in
  both containers. This is a known limitation; do not change permissions or use
  `nsenter`/host networking to work around it.
- Cash development is unfrozen only within the Owner-authorized scope.
  Preserve original source evidence; never automatically delete business
  records, approve uncertain cases, post Cash, replay historical ingestion,
  or backfill.
- A healthy app, database, or bridge does not establish successful
  end-to-end business processing. Perform a bounded, read-only, function-by-
  function audit before changing live ingestion; do not infer workflow
  success from health, counts, source code, or a prior Agent summary.
- Start from `NEXT-SESSION-HANDOFF.md` and its dated Current Production
  Position / issue register. Preserve prior evidence and dirty worktree state;
  record new observations with their timestamp and source rather than
  replacing older results.
- Report findings by business function: WhatsApp Receive, Native Message
  Persistence, PostgreSQL Mirroring, identity validation, Escort parsing and
  duplicate detection, Accounts parsing, Review queue, Register/Accounts
  visibility, recovery, source traceability, and end-to-end completion.
- Do not claim historical reconciliation is complete without source-level
  evidence. Historical TXT/Excel ranking, import, deduplication, correction,
  backfill, and archive-wide reprocessing require separate Owner instructions.
- Never read message bodies or Cash business rows during metadata-only
  audits. If a requested conclusion requires content, credentials, writes, or
  scope expansion, mark it NOT VERIFIED and request the required authorization.

### Current Blockers Reference

See `NEXT-SESSION-HANDOFF.md`, **GITHUB SOURCE CONTROL AND SESSION HANDOFF —
2026-10-27 (authoritative)**, for the current production snapshot, the final Git
architecture, GitHub push verification, the source integrity manifest and the
safe next steps. The 2026-10-24, 2026-10-25 and earlier 2026-10-27 sections
remain historical evidence and are superseded by that section and by §0 of this
file. Source changes now follow §2.4; production actions still require Owner
approval.

## 13. Operating rules (proven 2026-10-28 and 2026-10-29)

These rules are not negotiable. If an incident seems to require breaking one, stop and ask the Owner, even if recovery is delayed. A delayed recovery is preferable to an unauthorised one.

1. **No credential changes without explicit instruction.** This covers the Owner's account and every other account. During incident recovery, propose a disposable test account or ask first. An explicit, scoped Owner instruction is required for any reset, and the reset is limited to the named account.
2. **No session deletion without explicit instruction.** A reset that ends one named account's sessions is allowed only when the reset itself was explicitly instructed.
3. **Deploy the exact verified artifact.** Never re-cut an image to piggyback changes. The digest that passed verification is the digest that is deployed.
4. **Keep two rollback images locally at all times.** Verify both are present and id-matched before any deploy.
5. **Take a separate pg_dump before every deploy or migration.** Hash it (`.sha256` sidecar), label it `pre-<change>-<YYYYMMDD-HHMM>.dump`, and keep it even if it is never used.
6. **Static guards in tests** must assert single implementation, write-after-verify ordering, audit-field presence, and that security guards and cookie attributes are unchanged.
7. **The full canonical suite must pass before any deploy report.** Spot checks are not sufficient. Canonical means the `package.json` "test" command, run as written.
8. **Never run production services with `docker run` outside compose.** Use `docker compose -f compose.yaml up -d --no-deps app`, or `docker compose -f compose.yaml restart app` to clear in-memory state. Outside compose, HTTPS, networks, and dependencies are dropped.
9. **`app.env` must remain `600 root:root` at all times.** Verify after any container recreation.
10. **No file-permission changes on `app.env` or any secrets file.**
11. **No WhatsApp container restarts and no bridge changes without explicit approval.** Read-only diagnosis is allowed.
12. **Record the deployed commit SHA and image digest** in every deployment note, and push source before deploying.
