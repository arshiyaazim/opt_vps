# AL-RIFA’I — Current Production State (2026-10-27)

This section supersedes older status notes below. Verified against the running
application and database on 2026-10-27.

## Architecture

### Unified platform UI (read-only surfaces, 2026-10-27)

`/dashboard`, `/transactions`, `/employees`, `/sources-review`, `/insights`,
`/income-expenditure`, `/archive` and `/assistant` share one authenticated shell
(`app/platform/`). They only read verified APIs (`/api/operations`,
`/api/escort-register`, `/api/register`, `/api/assistant`); every write action is
disabled with its dependency explained. Legacy screens (`/cash`, `/vessel`,
`/register`, `/conversations`, `/review`, `/message-mirror`, `/cash/archive`)
remain unchanged and linked. Since the 2026-10-27 UI repair, both production
hosts expose the workspace routes through boundary-exact allowlists, and the
legacy Cash/Vessel sidebars include a “PLATFORM WORKSPACE” navigation group.

New tested domain modules added in the same session:

| Module | Purpose |
|---|---|
| `lib/cash-user-policy.ts` | Super-Admin-only ADMIN management, last-admin protection |
| `lib/vessel-match.ts` (extended) | Shift evidence in confirmation matching |
| `lib/duplicate-identity.ts` | EXACT/PROBABLE/AMBIGUOUS/DISTINCT duplicate classification |
| `lib/payroll-rules.ts` | Configurable duty/pay engine; BDT 450 proposed only |
| `lib/order-draft.ts` | Admin order draft composition (no sending) |
| `lib/vessel-reports.ts` | Read-only mother/lighter/escort/date aggregates + CSV |
| `lib/cash-submission.ts` | PENDING_REVIEW submission validation (no posting) |
| `db/migration-candidates/0031_*` | Cash submissions + append-only review schema (rehearsed; current Production handoff records it applied) |
| `lib/cash-approval.ts` | Reviewer policy: role-scoped reads, reviewer≠submitter, decision validation |
| `db/migration-candidates/0032_*` | Vessel SECURITY DEFINER command layer (add/edit/release/assign/void); schema objects applied 2026-10-30, ledger row not recorded — see Migration ledger note in `docs/VPS_MAP.md` |
| `/cash/submissions` | Cash Portal submission + review queue UI (dependency-aware) |
| `/vessel-register` | Vessel Register with command API (`/api/vessel-programs`): details, audit, source, add/edit/release/assign/void (requires 0032; applied 2026-10-30) |

### Employee and transaction submissions — source update 2026-10-30

The platform drawers now use the existing authenticated Cash Portal API
surface. Cash transaction submissions use the schema from migration 0031 and
remain `PENDING_REVIEW`, with no posting side effect. Employee drawer requests
use candidate 0035 (applied 2026-10-30) and remain `PENDING_APPROVAL` until an Admin makes
one append-only approve/reject decision. Approval does not activate the
employee. A separate Super-Admin-only action with explicit confirmation creates
an immutable portal-directory entry; it does not modify payment-derived
`employee_master`, Cash postings or Vessel data. Request creators cannot review
their own submissions, and rejections require a reason recorded in both the
decision record and audit event. Portal activations are displayed in a distinct
source/status section on `/employees`; mobile collisions remain unmerged.
Candidate 0035's schema objects are applied (2026-10-30); its ledger row is
not recorded — see Migration ledger note in `docs/VPS_MAP.md`. Sensitive HR
fields (NID, salary, emergency contact) are intentionally not collected
without an approved protected storage workflow. See
[`docs/EMPLOYEE-TRANSACTION-SUBMISSIONS.md`](docs/EMPLOYEE-TRANSACTION-SUBMISSIONS.md).

### Verification — reproducible at commit 139f5df

Verification reproducible at commit `139f5df` (2026-10-30):

- Typecheck: 0 errors (isolated `node:22.23.3-alpine` container).
- Canonical test suite (`pnpm test`): TAP block 237/240 pass, 3 skip, 0 fail.
  The non-TAP post-processing script `tests/source-register.mjs` requires real
  Owner evidence and cannot run in the isolated environment; the suite exit
  code is non-zero for that reason alone.
- Production build verification: deferred to Phase 4.4 (post-Phase-4 image
  build).
- Full glob suite (53 files): 413 tests, 402 pass, 7 fail (all
  DB/server/evidence-dependent, 0 subtest-level assertion failures), 4 skipped.

The payment-derived Employee statements now paginate the full filtered result
in 40-row pages instead of stopping at the first 200 rows. Search and identity
scope filters reset pagination; totals remain calculated over all matching
rows. Portal Activated Employees continue to display in their own section.

---- One PostgreSQL database `alrifai`; one application container `al-rifai-app-1`.
- WA-01 / Bridge-1 is the authorized source for Cash and Vessel messages; its
  verified paired account is the WhatsApp Admin identity. WA-02 is identity-only.
- Message mirror: bridge SQLite `/runtime/store/messages.db` → PostgreSQL
  `whatsapp_messages_original` / `whatsapp_messages_processing`.
- Deployed image is pinned in `compose.yaml`; the container runs
  `/app/start-private-app.mjs` (Next server + ingestion, Cash, Vessel workers).

## Repository and deployment traceability
- VPS repository: `https://github.com/arshiyaazim/opt_vps.git`, branch `main`,
  HEAD `39ce58fe10bb7bbe747325295e452cbd09561bee`.
- This directory is a nested independent repository (own `.git`, no
  `.gitmodules`) with the **same remote URL**, branch `main`, HEAD
  `6b9b18d9f10d8a0cf76e6d95d45c0b89207c0816`.
- The deployed image is built from the working tree; local changes are
  uncommitted, so image-to-commit traceability is not established. Do not
  commit, push or change remotes without Owner authorization.

## Cash / Accounts
- Canonical: 1,819 instructions, BDT 939,889.00, all `REVIEW`, 0 postings.
- Archive: 1,610 legacy instructions with 1,586 legacy postings, separate epoch.
- Only a verified Admin → verified Accountant direct message qualifies.
- `payout_mobile` is a payment destination, never an employee identity.

## Vessel / Escort Register
- Canonical register: 377 rows (206 DRAFT / 171 REVIEW).
- Canonical programs: 64 `Confirmed`, each linked to its original client order,
  the outgoing Admin confirmation and one assignment.
- 64 REVIEW rows are confirmed-linked evidence; 107 are actionable review
  (55 unmatched, 47 incomplete, 5 duplicate-review).
- Archive: 608 register rows and 5 programs, preserved unchanged.
- One program per Lighter; same Mother + Lighter within ±1 day is a potential
  duplicate; different Lighters stay separate.

## Archive History
- Vessel: **Archive History** navigation switches the register to the legacy
  epoch; Cash: `/cash/archive`.
- Current and Archive are separated by `dataset_epoch` / `dataset_scope` in every
  API and page. No table is cleared to hide records.

## Safe development and validation
```bash
cd /opt/vps/apps/al-rifai
pnpm install --frozen-lockfile   # authorized isolated Node 22 env only
pnpm typecheck && pnpm lint && pnpm test
pnpm build
```
- Canonical vessel reconstruction: `node --experimental-strip-types
  scripts/backfill-vessel-canonical.mjs` (dry run) / `--apply` (idempotent).
- Do not run write-mode backfills, migrations or deployments without Owner
  authorization. Never send WhatsApp messages, re-pair, reset cursors, clear
  tables, auto-post Cash or auto-confirm programs.

## Documentation
- Business rules: `docs/VESSEL-WORKFLOW.md`.
- Operations handoff: `/opt/vps/NEXT-SESSION-HANDOFF.md`.
- Infrastructure map: `/opt/vps/docs/VPS_MAP.md`.
- Agent rules: `/opt/vps/AGENTS.md`.

---

## Session 3 Completion — 21 October 2026

Bridges recreated (wa-01 and wa-02, tag cap4-20261011) with wget health-check support. Socket access from al-rifai-app-1 to both bridges verified (read+write). Permission persistence installed via systemd-tmpfiles (P1) at /etc/tmpfiles.d/vps-whatsapp-control.conf. Cash development is now authorized within the Owner's exact scoped paths; production migration, deployment/restart, Live Sync, historical backfill and financial writes remain prohibited. See NEXT-SESSION-HANDOFF.md for current evidence and remaining work.

---
Bridge

আগের audit-এ পাওয়া database path

Bridge 1 (wa-01)

/var/lib/vps/whatsapp/wa-01/store/whatsapp.db

Bridge 2 (wa-02)

/var/lib/vps/whatsapp/wa-02/store/whatsapp.db

# AL-RIFA’I — engineering entry point

## Owner Cash Development Unfreeze and Production Boundaries

The Owner has authorized development and isolated testing for the scoped Cash,
WhatsApp, Message Mirror, Vessel, and UI integration work. Preserve existing
identity, source verification, authentication, role, review, approval,
duplicate-protection, employee-ID/payout-number separation, and financial
controls. Uncertain cases remain in review; do not automatically approve or
post financial transactions.

This authorization does not permit production database migrations or writes,
deployment/image release, app or Bridge restart, Live Sync activation,
historical backfill/reprocessing, WA-02 permission changes, or financial
posting/settlement. Those actions require separate Owner approval. WA-02 must
remain identity-only; do not call its message or contact tools even if a
runtime tool list exposes them. Never disclose secret values or send WhatsApp
messages.

Before editing a protected path, consult the repository-root `AGENTS.md` and
confirm that the path is within the Owner's exact authorized scope. The
advisory check remains available for review:

```text
node scripts/cash-freeze-guard.mjs --paths-from-stdin
```

The guard is not an approval authority or a production gate; repository
controls and separate production approval remain required. Do not expose
credentials or secrets.

### Continuation status — 20 October 2026, 19:41 UTC

The Owner authorized a bounded implementation exception for WhatsApp
replication, identity enrichment, Cash/Vessel processing and frontend
integration. This does not authorize automatic payment approval, disbursement,
ledger/posting or payment-history mutation, nor does it authorize production
restart/deployment before Cash isolation is verified.

The WhatsApp `list_messages` result now exposes `sender_push_name` only from
the source `whatsmeow_contacts.push_name` field (including mapped LIDs); it
does not relabel the presentation-oriented `sender_name` as a push name. The
existing compatibility ingestion mapper stores that field and keeps the raw
source response. Compatibility ingestion now also resolves an incoming
direct-message receiver from the matching bridge's verified paired JID:
WA-01 uses its existing native manifest, and WA-02 requests the read-only
native identity tool. Group recipients remain unresolved, and when WA-02
identity is unavailable the worker logs the gap and preserves a null receiver
instead of guessing. The native archive reader still does not provide contact
or push-name fields. These paths have offline tests only; no live ingestion,
original row, source database, pairing session, or processing record was
changed.

A bounded, read-only WA-02 MCP check confirmed that `list_messages` is
available to the current reader but `get_native_account_identity` is not
exposed. No message content was requested. WA-02 incoming direct-message
receiver identity therefore remains unresolved until the read-only capability
is separately authorized and made available; no identity or session grant was
changed.

Migration `0022_whatsapp_incremental_ingestion.sql` has since been applied
atomically through the approved database-admin path after receipt/schema
prechecks. Its checksum receipt is
`42c01d3fbaa4b0107a8bc4e6e574e270c99ee0b5ca5f07f6ca942af837d93fc3`.
Post-migration checks confirm the cursor and source-event tables and name
metadata columns exist; both new tables are empty, and the existing 213
originals, 213 processing rows, and zero contact rows are unchanged. The app
remains stopped; this migration did not start ingestion.

Offline verification passed: 17 focused Node tests, the workflow/source-
register/Phase 1 suites, TypeScript type-check, production build, focused
ESLint, and 15 WhatsApp Python tests with Ruff lint/format checks. The
source-register fixture was mounted read-only. The whole-repository lint
wrapper exceeded its 4 MiB subprocess output buffer; the integration files
were linted directly. Advisory Cash path guard passed.

No migration was applied and no live app/bridge was started, restarted, or
deployed. Migration 0022 remains unapplied; the app remains stopped. Cash
source inspection found a separate candidate API host that can start its
review-only Cash sync when invoked; this path can write review records, so the
production no-Cash-side-effect gate is not yet verified. Do not restart or
deploy. See the latest [canonical recovery handoff](../../NEXT-SESSION-HANDOFF.md)
for exact status and next actions.

## Current verified status — 20 October 2026, 20:36 CEST (18:36 UTC)

This is the read-only recovery baseline as of 18:36 UTC; implementation and
validation progress is superseded by the continuation update above. The
database and production-runtime facts below remain the observed baseline.

This section supersedes earlier operational status statements in the retained
dated material below. Observation was read-only. No service was started,
restarted, migrated, re-paired, or sent a WhatsApp message; no business or
financial write was performed.

**Observed healthy snapshot — 2026-10-21 06:46:11 CEST (+02:00):** a
host-side `GET http://127.0.0.1:3000/api/health` returned
`{"status":"ok"}`. This is one successful, database-backed health response at
that timestamp only; it is not an ongoing health or availability guarantee,
and does not establish WhatsApp connectivity. The stopped/exited app states
recorded below describe the 20 October baseline and are superseded only as
app-health observations.

At **2026-10-21 07:05:32 CEST (+02:00)**, Docker reported
`al-rifai-app-1` running/healthy with restart count `0`; Node.js
`v22.23.3` was verified inside that container. The Owner-approved,
path-specific mount change in `compose.yaml` makes only the wa-01/wa-02
control mounts read-write; only the app service was recreated. Host control
directories are mode `0710`; both mounted sockets were verified from this
container as present, readable and writable. Bridge HTTP health and
sync-completion status remain unverified. See the
[canonical checkpoint](../../NEXT-SESSION-HANDOFF.md) for evidence limits.

### Canonical architecture and archive contract

- PostgreSQL database `alrifai` remains the AL-RIFA'I application database.
  WA-01 and WA-02 each own their native store under
  `/var/lib/vps/whatsapp/wa-01/store` and
  `/var/lib/vps/whatsapp/wa-02/store`; do not replace, reset, or open a
  session store with a second writer.
- Migration `0021_whatsapp_message_ingestion.sql` is recorded in
  `public.alrifai_schema_migrations` with SHA-256
  `ab614a34a9cd10b7f0cc3aa0d15ec14628a3ae0bfd9fa2de29bd6f108b21e3fc`,
  applied at `2026-10-20 08:59:17 UTC`. It defines append-only
  `whatsapp_messages_original`, idempotent-per-domain
  `whatsapp_messages_processing`, and `whatsapp_contacts`.
- Migration 0020 is also recorded. The source file
  `0022_whatsapp_incremental_ingestion.sql` is present but has no database
  receipt; its cursor/source-event tables and contact-name columns are absent.
  Do not rerun 0020/0021 or apply 0022 without the required Owner exception.
- Read-only database counts: WA-01 has 213 originals from five individual
  chats (111 incoming, 102 outgoing); WA-02 has zero originals. All 213
  processing rows are `archive/pending`; `whatsapp_contacts` is empty.
  Every archived row has `sender_jid`; `sender_phone`, `sender_push_name`,
  and `group_name` are null. The archive payload is the structured record
  returned by `list_archive_messages`, not complete provider transport JSON.
  Original media bytes are not established by a media reference.
- The 0020 archive tables (`whatsapp_archive_conversations`,
  `whatsapp_archive_messages`, `whatsapp_archive_sync_state`, and
  `whatsapp_archive_media`) currently contain zero rows. The worker's fixed
  scope names five direct and three group chats, but only five direct chats
  are present in `whatsapp_messages_original`; no group archive is verified.
- The original table has UPDATE/DELETE and TRUNCATE rejection triggers.
  The effective grant view also reports UPDATE/DELETE/TRUNCATE privileges
  for `alrifai_app`; this mismatch is unresolved and was not changed. Do not
  infer that a trigger is a substitute for minimum database grants.
- The newer uncommitted source includes `scripts/message-ingestion-worker.ts`:
  it enumerates a fixed eight-chat scope (five direct, three group), reads
  source cursors, uses archive pages or compatibility messages by account,
  commits page/cursor work transactionally, and retries. The worker and
  archive tests are present, and the current launcher supervises ingestion,
  Cash, and Vessel processors. This is source-level implementation only:
  migration 0022 is missing, neither bridge tool/policy path was exercised,
  no ingestion run was verified, and the tests/build were not run here.
- The API/UI and `process-cash.ts` / `process-vessel.ts` source paths exist,
  but no message-to-frontend behavior was verified. No fresh Owner
  test-message ID was matched. The current app container is stopped.

### Runtime, pages, and pairing-preserving recovery

- Both bridge containers are running and their native `messages.db` and
  `whatsapp.db` files remain present and were recently updated. Logs show each
  connected during startup and later disconnected/reconnecting; current
  WhatsApp connectivity/pairing status is therefore not confirmed. No session
  database contents were opened. Preserve both stores; do not scan a QR code,
  delete session state, or recreate either bridge as an app-recovery shortcut.
- `al-rifai-app-1` is still exited with code 127. Its recorded OCI error is a
  bind-mount type mismatch for the WA-01 `mcp.sock`; the app's saved Compose
  container uses image `sha256:274eca3c…`. Current source Compose instead pins
  local image `sha256:0650c73e…` and mounts the WA-01 control directory; that
  candidate has not been deployed. No recreate/restart was attempted.
- The stopped container retains
  `ALRIFAI_LIVE_CASH_INTENT_CAPTURE=APPROVED_AUTO_POST`; current source Compose
  says `APPROVED_REVIEW_ONLY`, but it does not change the stopped container.
  The new launcher also starts the Cash processor. Under the Cash freeze,
  **do not start or deploy either configuration** until the Owner authorizes
  the exact protected paths and financial write boundary. No financial write
  or WhatsApp send was performed in this inspection.
- The source routes are `/cash` (`app/cash/page.tsx`) and `/vessel`
  (`app/vessel/page.tsx`), with expected URLs
  `https://alrifai.iamazim.com/cash` and
  `https://alrifai.iamazim.com/vessel`. They are not currently usable because
  the shared app container is stopped; neither page was browser-tested.
- The Vessel source now treats an outgoing assignment as a separate review
  candidate and the UI says it does not establish actual duty start. However,
  applied migration 0018 still has only `DRAFT|CONFIRMED|REVIEW` and
  `DRAFT_CREATED|CONFIRMATION_REVIEW|CONFIRMED`; actual duty-start/release
  lifecycle events are not implemented. No assignment/release was processed
  or shown live.
- Continue only after exact Owner authorization for protected migration,
  ingestion/startup, and Cash-isolation paths. Then verify Cash isolation
  before a controlled deployment; verify both pages, an Owner-supplied
  existing message ID, idempotent replay, and original immutability. Do not
  send a test message or rerun an applied migration.

### Secret sources and operational limits

- Compose reads `/etc/vps/apps/al-rifai/app.env`. Observed variable names are
  `ALRIFAI_EVIDENCE_DIR`, `ALRIFAI_REVIEW_PROFILE`,
  `ALRIFAI_VALIDATION_PASSWORD_FILE`, `NODE_ENV`, `PGHOST`,
  `PGPASSWORD_FILE`, and `PGSCHEMA`. The deployed Compose file separately
  configures Cash activation variables. Secret values are intentionally
  omitted.
- Database, validation, WhatsApp, and TLS credentials remain in separate
  protected files under `/etc/vps/apps/al-rifai`; credentials have not been
  consolidated. Do not print, copy into source, or document secret values.
- `/cash` and `/vessel` rendering, fresh pairing, WA-02 archive coverage,
  contact/name enrichment, media-byte preservation, and end-to-end ingestion
  remain unverified or blocked. No cleanup candidate has been dependency-
  checked; preserve legacy history, migration files, backups, and session
  state. This is not a production-readiness claim.

**2026-10-16 deployed private owner reconciliation release (noncritical lint/off-host checks pending): see current status and evidence in [WORKFLOW_RELEASE](docs/WORKFLOW_RELEASE.md#2026-10-16-owner-reconciliation-release-current-canonical-runbook). Financial posting: OFF. Earlier dated acceptance statements below are historical.**

Read this current guide before the preserved dated material below. Fresh read-only database observation was **16 October 2026, 01:06:20 Asia/Dhaka** (15 October 19:06:20 UTC). Container inspection corroborated the R1 repair pins and start/restart fingerprints. Earlier ledger-6/11/12/13, “no MCP consumer”, “no operational writer”, deployment-pending and tunnel-only descriptions are historical checkpoints, not today's baseline. The audit changed documentation only; it did not change business policy or release acceptance.

## Mission and authority

AL-RIFA’I supports security/manpower services and vessel Escort operations: people and employee identity, Client requests, vessel programs and assignments, duty/attendance, release, settlement, cash instructions/payments, payroll, reports and business evidence. The application currently combines an archival workspace with a bounded live identity/review and Cash/Roster workflow. It is not yet a complete HR, payroll, accounting or Security Guard operations system.

Owner policy takes precedence: latest explicit Owner instruction → preserved App Constitution → [Owner business policy](docs/OWNER_BUSINESS_POLICY.md) and [versioned rules](docs/owner-business-rules.json) → applicable contracts. Runtime and tests establish implementation facts; they do not grant business authority. Agent recommendations and older technical safeguards cannot supersede Owner decisions.

- WhatsApp, frontend and phone/offline entries are entry channels to the same authorized domain workflows and canonical `alrifai` PostgreSQL database. Keep actual channel, operator, sender, mentioned person and original/forwarded provenance distinct.
- **employee-mobile-v3:** Employee ID is normalized, source-role-proven employee mobile; internal Person/relational IDs and payout, Client, Master or sender contacts are different identities. Same mobile retains all names as aliases; same name/different mobiles remains separate absent approved linkage. Cash evidence does not establish employment. Applicants and personal chats cannot automatically create employees, assignments or financial entries.
- **PAY-001–012:** a complete qualifying designated Admin→Accountant direct instruction with attributable successful sending is business confirmation; no extra Accountant reply/receipt or second Admin approval is required. Admin manual entries post directly through the authorized single writer; Staff entries require actual Admin approval of the exact version. These are approved semantics, not proof that all paths are implemented or activated. Distinct equal payments remain distinct; only the same established operation/block is replay.
- Client order → Draft; verified complete Admin confirmation, assignment, actual duty start, release, program completion, settlement approval, posting and externally verified disbursement are separate facts. Release ambiguity and open predecessor assignments require review; never invent dates, rates or totals.
- Missing opening balance, entitlement or history stays **Unknown / Incomplete History**. Opening balance does not gate extraction, frontend development or valid period entries. Historical Level B is **CLOSED BY OWNER — HISTORICAL REFERENCE ONLY**; it is not a current-work prerequisite.

## Historical release baseline — 16 October 2026 (superseded)

| Area | Fresh observation or retained evidence | Meaning / limit |
|---|---|---|
| App | `al-rifai-app-1`, image `sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097`, healthy; started 15 October 18:15:23 UTC; restarts 0 | Same approved candidate; health is not operational acceptance |
| PostgreSQL | `vps-infra-postgres-1`, image `sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`, healthy | Existing shared engine; no restart/migration by this audit |
| WhatsApp | wa-01 image `sha256:199a9fd56f077190966110684129b530d5011a892adcb7cdfe7a9a0614a7b2a1`; wa-02 `sha256:b76c837c435364011307859f8c04bc4aee02b3e3c97ae75e13a149e7a2584f83`; both running, restarts 0 | IDs/images/start/restarts match retained R1 state; running does not independently prove fresh connectivity or message delivery |
| Schema | 14 ledger receipts, `0000`–`0013`; every recorded SHA256 matches its canonical migration; 20 base tables across public and identity-review schemas | `0012` retained; approved `0013` applied. No pending numbered migration in `db/migrations/` at audit time |
| Source facts | 82 source references / extraction assertions: 51 v1 + 31 v2; 54 historical snapshots; archive cash table 0 | Different evidence units; do not sum these into business counts |
| Client/Roster | Five canonical **Draft** programs; seven source links = five Draft + two unlinked Review confirmations; all seven historical-authority admissions false | Confirmed programs 0; assignments 0. Native source retention does not establish dated role authority |
| Accountant/Cash | 24 instructions, all **REVIEW**; original full-row digest `0332e81ab3ac99a58bf10e93e3c85917` matches | Instructions are evidence, not postings or verified transfers |
| Financial safety | Activation value absent; zero verified registry `cash.post`/`cash.reverse` grants; cash postings 0, movements 0 | SQL function EXECUTE permission exists; it is not an activated financial capability |
| Runtime controls | Verified-actor guard remains SECURITY DEFINER with fixed `pg_catalog` search path and no PUBLIC execution; guard/function history hashes match R1; program history trigger enabled | Actual runtime row-lock/CAS/append-only behavior is retained qualification evidence, not rerun through a fixture here |
| Acceptance | Retained actual Chromium live-API report: **44 checks passed**, desktop 1366px/mobile layout 390px, no API mocks or TLS bypass; mixed v1/v2 reader contract passed | Reviewed, not rerun. Physical-phone acceptance and genuine historically authorized confirmation/assignment remain incomplete |

The release manifest's `images.wa01 = fb739d…` identifies a **built candidate**, not the deployed `199a9f…` bridge. Use `deployedImages`, `r1Repair` and fresh inspection for deployed facts. This discrepancy in field meaning is documented without rewriting the sealed manifest.

Current working source is ahead of the deployed app. [Pending-source manifest](data/workflow-release.json) and [repair patch](data/workflow-r1-repair.patch) identify these five files: `candidates/identity-review/business-register.ts`, `history-extractions.ts`, `conversation-subjects.ts`, `lib/history-policy.mjs`, `lib/duty-calculation.mjs`. Retained six focused + twelve business regressions and typecheck passed; these changes are **TESTED, NOT BUILT, NOT DEPLOYED**. They preserve authority warnings and improve OFFICE/RELEASE classification, calculator validation and inventory disclosure; they do not finish R2–R4.

R1 blockers remain: genuine dated Client/Admin authority evidence (Owner promised an existing reference, not yet supplied), an actually matching authorized confirmation/assignment, deployment/acceptance of the warning projection correction, and physical-phone acceptance. Do not backdate bindings, manufacture approval, import synthetic conversations or promote Draft/HTTP/browser success into release acceptance.

## Architecture and source map

```text
Owner / named operator browser                 Per-account WhatsApp bridge
  HTTPS :443 → same-container TLS entry          Go/Whatsmeow → own SQLite/session/media
  /review React workspace                       Unix MCP broker + scoped native/history reader
               \                                  /
                authenticated API / verified identity + intent
                scoped service → repository transaction
                canonical program / evidence / financial boundaries
                           PostgreSQL alrifai
                source references + commands + events + review/audit
```

This is one Next.js application, not separate backend microservices. Stack declarations: Next.js 16.3.4, React 19.2.6, TypeScript, Zod, `pg` 8.16.3 and Drizzle; Node >=22.13.0, pnpm 11.25.0. SQL migrations/catalog, not the partial Drizzle model alone, define the complete database.

| Location | Responsibility / status |
|---|---|
| `app/review/page.tsx`; `candidates/identity-review/ui/` | Named-session entry; Messages/request/work-step review, Cash and Escort Roster, extraction, permitted subject selection, data/call-setting panels. `BusinessWorkspace`, `CashEntry`, `BusinessRequest` and `BusinessReviews` share existing services |
| `app/page.tsx`, `app/register/`, `app/conversations/`; dashboard/register/accounts/operations components | Older historical vessel, employee-statement, cash, bill, settlement/message and import-audit views. Their presence does not make them current business writers or public HTTPS routes |
| `app/candidate-api/[...path]/route.ts`; `candidates/identity-review/{api,host,deployment-profile}.ts` | Same-origin named API dispatch, explicit live profile, broker injection and restricted runtime pool |
| `candidates/identity-review/{auth,contracts,routing,service,repository}.ts` | Named staff/session, scoped grants, source checks, domain routing, review/claim/audit and transactional state. Directory name “candidates” is historical; selected paths are deployed |
| `native-intake.ts`, `broker-read.ts`, `stored-history-mcp.ts`, `history-sync.ts`, `history-extractions.ts`, `history-business.ts`, `source-visibility.ts` in that directory | Bounded native intake and stored-history evidence; independent native/backfill cursors; current-source verification; typed cash/program projections; parser v1/v2 compatibility |
| `lib/program-command-boundary.ts`, `lib/employee-program-validation.mjs`, `lib/escort-intake-candidate.mjs` | Canonical program command/CAS/history boundary and reused identity/parser/lifecycle logic; no second roster writer |
| `candidates/identity-review/{cash-commands,business-register,workspace,roster-context}.ts`; `lib/duty-calculation.mjs` | Cash manual/approval adapters, source-aware reads and projections; single SQL financial function; incomplete verified duty/rate feeders |
| `app/api/{register,vessels,operations,conversations,program-tools,assistant,core,import-audit,health}/route.ts` | Historical reads, deterministic assistant/preview and diagnostics; legacy business mutations return 405. Named `/candidate-api` has separately authorized mutations; “all mutations disabled” is no longer globally true |
| `db/migrations/`, `scripts/database.mjs`, `data/` | Applied SQL/checksum ledger, explicit tooling and sealed release evidence. `db/migration-candidates/` contains unapplied proposals with historical number collisions; never feed them into the live runner |
| `services/whatsapp/source/`, `services/whatsapp/compose.yaml` | Existing Go bridge/Python MCP source and account deployments. Source/candidate capabilities exceed current deployed profiles; inspect image and exact consumer scope before assuming availability |
| `SOURCE-MANIFEST.json`, `docs/v10/`, `docs/legacy-d1/`, `/opt/vps/import/al-rifai-v10/` | Original Sites version-10 export provenance; commit `3425b13f640016fdd7171ea1fda1c2d20c13f038`, not a current working-tree commit or live D1 backup |

Named API families include `/session/*`, `/conversations/{subjects,submit,outcome}`, `/intake/pull`, `/reviews/*` (source/history/actions/program-preview/program-approve/program-execute/roster), `/registry/*`, `/claims/*`, `/workspace/data`, `/business/{history/status,history/pull,extractions,register,cash/access,cash/entries,cash/post}` and `/calls/settings`, beneath `/candidate-api`. Route existence does not establish grants, completed domain logic or real acceptance. The deployed TLS adapter exposes `/review`, `/candidate-api/`, static assets and root redirect; legacy dashboard/API access has a separate Basic validation boundary on loopback.

## Data ownership and permitted writers

| Data / application | Authoritative owner | Permitted writer / readers and limits |
|---|---|---|
| Native accounts, sessions, contacts, messages, call/media transport | Each WhatsApp account's own bridge/store | One native writer/account; MCP is a scoped reader/transport interface. App has socket access, no native-store or Docker mount. wa-02 is not proven equivalent to wa-01 native intake |
| Persons, scoped bindings/roles/grants, staff | `identity_review_candidate.records`; SQL owner `vps_pg_admin` | Approved operator provisioning/decisions govern registry/staff. Runtime RLS does not grant general registry administration even though proposal/verify/revoke handlers exist |
| Sessions, review, source revisions, native receipts/progress, operations/audit | Same existing records repository | `ir_review_runtime` writes allowed collections under RLS; service enforces person/account/chat/action and exact versions. `operator_decisions` is operator-owned proof, not claimant text |
| Canonical programs and lifecycle history | `public.programs`; SQL owner `alrifai_app` | `executeCanonicalProgramCommand`, via `ir_review_runtime` with exactly 17 INSERT/12 UPDATE columns from 0013, CAS/re-preview/history trigger. No runtime DELETE/TRUNCATE or immutable-column UPDATE |
| Source pointers, extraction commands/events | `public.source_refs`, `business_commands`, `domain_events`; SQL owner `vps_pg_admin` | Foundation runtime insertion with verified-actor/append-only guards. Derived assertions remain REVIEW_ONLY evidence; raw native text stays source-owned. Existing older envelopes/history are preserved, not silently erased |
| Cash instructions, mobile evidence, roster links, assignments | Six-table 0012 increment, SQL owner `vps_pg_admin` | First four tables permit restricted runtime SELECT/INSERT. Mobile evidence is not Employee master data; assignment projection requires an admitted canonical event |
| Cash postings/movements | `alrifai` single financial boundary; SQL owner `vps_pg_admin` | Only `public.alrifai_post_cash(...)` writes financial rows; runtime has SELECT and function EXECUTE, not financial-table INSERT/UPDATE. Current flags/grants disable use; function independently checks current actor, scope, epoch, exact payload and confirmation basis |
| Historical snapshots/archive/legacy draft indexes | Existing `site_*`, `datasets`, legacy `reviews` in `alrifai` | Explicit authorized migration/import tooling only; archive readers use `alrifai_app` pool with default read-only transactions. Snapshot immutability and evidence checksums preserved. Legacy drafts/notes are not the named workflow's posting authority |
| Fazle-Core / external FPE and relay | Existing external owner/writers retained wherever deployed | No verified live ledger handover or external health. Reuse references are not operational integration. Do not dual-post or mutate Core/`wbom_*`/FPE tables from this app |
| Original Sites/D1 project | Separate original hosting/data boundary | No verified current proxy/sync/cutover to this VPS; no Site deployment changed by this audit |

Fresh catalog: **18 public + 2 identity-review tables**, including the migration ledger. The eight legacy domain/archive tables plus ledger are extended by two identity-review tables, three 0011 foundation tables and six 0012 tables. No Employee master, attendance, payroll or invoice relational table exists in this catalog. Applied 0013 changes rights, not table count. Its retained “PREPARED ONLY” SQL comment is stale historical annotation: receipt/checksum and live rights establish application; never edit the applied file to fix the comment.

## End-to-end contracts and missing links

1. **WhatsApp → business action.** Native Go capture persists source-owned evidence; named `/intake/pull` uses scoped native stream/receipts and the identity/intent conversation adapter. Separately, `/business/history/pull` reads stored pages through MCP, validates current visibility/hash and role-effective admission, and atomically appends source refs/commands/extraction events plus typed projections. Exact source operation identity controls replay; native and backfill progress remain separate. Client facts may produce canonical Drafts; historical Admin confirmation requires dated authority, exact program/fields and canonical command validation. Unresolved facts stay Review. Revalidation also governs details/search/totals/CSV/print; rowid continuation alone is not edit/revoke coverage. No live extraction was executed in this documentation task.
2. **Employee → program → duty → release → settlement.** Verified Employee registry relationship and role-proven mobile feed named assignment; historically authorized source commands can retain a mobile without inventing an employed Person. Program preview/approval/execution rechecks source, grant epoch, exact digest and revision; same transaction stores command/history and relevant assignment projection. ASSIGN/REPLACE, START_DUTY, COMPLETION_PENDING and RELEASE have separate evidence/chronology checks. No accepted real assignment exists; Employee relationship count is zero. Terminal program-completed command, actual media/OCR, predecessor late-release reconciliation, verified attendance/effective rates and settlement approval/posting remain incomplete. Pure lifecycle/calculator tests do not close this chain.
3. **Admin → Accountant → ledger.** Parsing preserves per-block employee/payout/method/amount/source and independent genuine operations. The 24 stored instructions remain REVIEW because historical outgoing projection does not establish attributable successful sending and dated authority. The current SQL writer explicitly refuses source-linked historical posting (`HISTORICAL_SEND_SUCCESS_NOT_ESTABLISHED`). It supports scoped exact manual Admin/Staff-confirmed commands behind disabled activation, balanced integer-minor-unit legs, replay and linked reversal checks. Attributable send-result ingestion/correlation and concurrent-session qualification remain missing; this is an implementation gap, not an extra Accountant verification policy. Advances are purposes/evidence, not implemented entitlement/recovery allocations.
4. **Office form → database/report.** Named subject selection → `/conversations/submit` → Zod/origin/session/CSRF + current operator/subject grants → `integrateFrontend/processConversation` → repository transaction → review/history/receipt/audit → frontend review. It correctly records FRONTEND/operator provenance; its durable result explicitly says business write/send NOT_ATTEMPTED. It is not an automatically approved order. Separate `/business/cash/entries` validates typed money/mobile and persists manual instructions; only qualifying activated actual Admin actions can invoke the same posting function. Full Staff/Employee/attendance/recruitment/Security Guard forms and approved-order-to-report closure are not complete.

Draft, Review, identity Verification, business Confirmation/Approval, Posting and external disbursement must remain distinguishable in UI/API/audit. A source assertion's REVIEW_ONLY label can coexist with a linked canonical Draft; neither label authorizes later milestones.

## Application capability and completion matrix

“Deployed” below means code/schema active; “qualified” means evidence for the stated artifact; “accepted” requires the actual operational exit criteria. Tests cited are retained evidence reviewed in this audit unless explicitly called fresh metadata inspection.

| Module | Intended Responsibility | Existing Implementation | Database Owner | Integration Status | Test Evidence | Operational Status | Missing Work | Risk |
|---|---|---|---|---|---|---|---|---|
| Identity / employee | Staff identity, Employee aliases/HR | Named login, registry/bindings/grants; mobile helpers/evidence; historical statements | records/operator; mobile evidence in alrifai | Deployed scoped identity; HR incomplete | B04/B05 reports; fresh zero Employee relationships | Partial; one named staff login | Verified Employee/HR history and broader scoped onboarding | High: payment/contact mistaken for employment |
| Client requests / Escort | One Draft per admitted request, canonical program | Parser, intake, command/CAS/history, five Drafts | programs + source links | Bounded direct-chat R1 deployed | Runtime boundary/reader reports; live 44 checks | NOT ACCEPTED; 2 confirmations Review | Dated role evidence and exact real confirmation | High: source presence mistaken for authority |
| Security Guard | Client/site/post/shift operations | Routing/review intent and target plan | Intended same alrifai owner | No complete operational Guard service verified | Conversation qualification only | Planned/partial review | Guard-specific order, staffing, duty and billing contracts | High: Escort vessel model applied to Guard |
| Assignment / Escort | Verified staffing, replacement, availability | Canonical command and append-only assignment projection | programs/program_assignments | Code/schema deployed; zero assignments | Offline business cases; R1 fixture boundary | Real chain unaccepted | Employee/source proof; predecessor linkage | High: concurrent/open duty conflicts |
| Vessel duty | Evidenced actual start and shifts | START_DUTY/COMPLETION_PENDING/release guards; pure calculator | programs; future attendance owner alrifai | Partial; no verified feeders | Retained business/calculator tests | Not operationally qualified | Real attendance, rates/policy versions, terminal completion | High: invented payable days |
| Office attendance / recruitment | Attendance/HR observations and hiring separation | Conversation classifications/reviews | records; no typed attendance/HR tables | Review only | Conversation/revocation qualification | Partial | Actual observation/verification/correction workflows | High: applicant promoted to Employee |
| Release slip | Media evidence → unique assignment release | Text extraction and guarded RELEASE; media refs | Native bytes/source refs/programs | Real media/OCR chain incomplete | Synthetic helpers only; no actual OCR PASS | Unaccepted | Approved acquisition/OCR, ambiguous/predecessor cases | High: wrong assignment released |
| Settlement / salary policy | Verified entitlement, deductions, approval | Historical drafts/helper; source calculator refuses absent basis | site_settlement_drafts; future alrifai | No verified payroll/settlement pipeline | Historical unit/helper evidence | Incomplete | Effective policy/rates/attendance/conveyance; allocations | High: legacy BDT150 food or Core rate defaults treated as approved salary |
| Cash / advances / Accountant | Source instructions, approval and one ledger | Typed Cash UI/API, 24 REVIEW; default-off manual writer | cash_* / single SQL function | Read/review deployed; financial OFF | Single-transaction rollback rehearsal; no concurrent sessions | No postings/movements | Send-result correlation; financial concurrency and exact activation | Critical: premature/dual posting |
| Reports / statements | Scoped totals, exports and operational reports | Source-aware Cash/Roster search/details, selected-page CSV/print; historical reports | Derived from existing owners | Deployed bounded readers | Live Cash24/Roster7 checks | Partial, coverage-limited | Complete operational balances/entitlement/report universe | High: page totals or archives treated as ledger balance |
| Invoices / reconciliation | Client billing, receipts, historical separation | Archived bill/import-audit readers; proposed data model | Historical site sources; intended alrifai | No live invoicing/allocation service verified | Historical evidence only | Planned beyond archive reads | Approved terms, invoice/receipt allocations and coverage | High: archived totals double counted |
| WhatsApp MCP / media | Scoped evidence with account isolation | Native/history read broker; two independent transports | Account-owned SQLite | wa-01 bounded direct path; R2 group/socket candidate | Existing bounded source reads; R1 report | Partial; fresh transport connectivity not tested | Exact group/participant/socket compatibility; media | High: access expansion or stale socket |
| Fazle-Core / reusable modules | Reuse compatible patterns; preserve writers | Adapted parsers/routing/identity patterns; retained 40-file reference | External responsibilities retained | No live Core/FPE adapter verified | Fresh 40/40 retained Git-blob parity | Reference only | Exact external writer/client continuity if cutover proposed | Critical if duplicate ledger introduced |
| AI / assistants / Hermes | Grounded assistance without business authority | Deterministic historical query/answer helpers; provider branch hard-disabled by empty integration config | Derived reads; no AI owner | No operational provider/Hermes deployment verified | Static code/previous scoped tests | Local assistance only | Qualified retrieval/privacy/provider/sending scope | High: invented authority or disclosure |
| Calls | Named policy control, bounded rejection/fallback | Settings/gateway/outbox components; last acceptance OFF | records + native call policy | Settings evidence; real pilot incomplete | B04/B05 live settings/synthetic call evidence | No physical reject/send acceptance | Other controlled phone and fresh explicitly approved window | High: setting ON confused with effective action |
| Recovery / operations | Preserve monotonic data and compatible readers | Hardened Compose, logs, manual WA restart, guarded recovery tools | Infrastructure / each source owner | Existing mechanisms with dated qualifications | R1 fingerprints; earlier recovery evidence | Recovery completeness unverified | Compatible image recovery, socket lifecycle, renewal/capacity | High: old image or backup overwrites newer facts |

## Security, infrastructure and recovery boundaries

Named sessions use PBKDF2-SHA256 (600,000 iterations), hashed random session/CSRF tokens, Secure/HttpOnly/SameSite=Strict cookies, 30-minute idle/8-hour absolute limits, current account/Person/version checks, throttling, mutation origin and CSRF checks. The TLS adapter strips forged proxy/identity/peer headers and derives client IP from the actual peer. Basic validation is a separate older access boundary, not named multi-user identity. One named login does not give WhatsApp contacts browser logins. Registry administration remains operator-scoped; shared DB-role RLS does not implement per-person tenancy by itself.

Fresh Docker port metadata: app HTTP **127.0.0.1:3000**, HTTPS **0.0.0.0:443 → container3443**. HTTPS is login-protected and internet-facing, not VPN-only/private-network access. App/PG use `vps-backend`; WhatsApp uses `vps-whatsapp_whatsapp-private`, private Unix sockets and no host REST/MCP ports in Compose. App UID10001 and WA account UIDs10002/10003 are separate; read-only rootfs, dropped capabilities, no-new-privileges, secret-file references, bounded tmpfs/logs protect the application boundary. Do not publish configuration values, tokens, private keys, contact details or message bodies.

App and PG restart policy is `unless-stopped`; WA is `no`. The production restart gate still applies to intentional recreation/restart. Existing single-socket bind mounts and named ACLs can become stale when WA sockets are recreated; directory-mount/reconnect work is a candidate, not already deployed permission. Never broad `compose up/down`, resume a retained account owner or install a second bridge.

Public certificate metadata freshly confirms expiry **12 January 2027, 19:19:02 Asia/Dhaka**. Prior operational evidence specifies manual DNS-01 renewal, not unattended renewal. Existing timer/cron inventories show no identified business scheduler in their inspected scope; host schedules were not freshly/exhaustively traced here. No new systemd service, background financial job or full monitoring coverage is inferred. Logs are bounded Docker logs and application/source audit records; no continuous uptime or load/capacity qualification is claimed.

File evidence is read-only under `/var/lib/vps/al-rifai/evidence`; account transport/session/media state under `/var/lib/vps/whatsapp`; credentials/configuration under `/etc/vps`; protected checkpoints/backups under `/var/backups/vps` per existing map. Media retention, external exports/Core state and complete restore coverage are not verified by file/config presence. Source-register exports are selected-page artifacts, not source backups.

The old app `sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2` is **not a compatible operational rollback**: its v1-only reader rejects retained v2. Compatible reader recovery is the approved `f88…` candidate. Different recovery image needs exact source diff/pin and approval; old-image emergency login recovery entails a declared v2 outage. App recovery retains additive 0012/0013 schema, grants, receipts and source facts. Never DROP/rewrite evidence, invent revocation or restore an older DB/SQLite over newer history. [Guarded recovery guide](../../infra/recovery/al-rifai/README.md) is dated tooling evidence, not permission or proof of current-schema restore acceptance.

## Development, verification and release procedure

Start with [R1 activation result](docs/R1_ACTIVATION_RESULT.md), [current state](data/workflow-r1-current-state.json), [release manifest](data/workflow-release.json), [production roadmap](docs/WORKFLOW_PRODUCTION_ROADMAP.md) and the latest [canonical handoff](../../NEXT-SESSION-HANDOFF.md). The roadmap's first rollout and `R1_REPAIR_HANDOFF` original work order are historical/completed, not commands to repeat.

For separately authorized source development, work in `/opt/vps/apps/al-rifai` with the declared Node/pnpm versions and frozen lockfile. `pnpm dev` binds loopback; it is not production deployment. Declared validation commands are `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; focused suites include `tests/business-workflows.mjs` and `tests/workflow-r1-repair.mjs`. The default test script covers only three suites, not all identity/native/SQL/browser/financial behavior. Source-register/database/HTTP tests require their documented private evidence or configured test target. Read test harnesses first: several qualification/rehearsal/browser scripts create fixtures, mutate sessions, import or perform production actions and are not read-only audit commands. Do not rerun already passed unchanged qualification to manufacture completion.

`pnpm db:migrate`, `pnpm db:import`, explicit release/repair scripts and rollback rehearsals are **not development startup steps**. `scripts/database.mjs` uses transactional checksum receipts, but newer owner-applied roles/functions require their approved migrator scope; the read-only archive pool is not a permission bypass. No migration/import runs on startup. All numbered migrations already match the live ledger. Never modify an applied migration or blindly apply `db/migration-candidates/`.

**Do not run `workflow-direct-production.py --apply` or `workflow-repair-production.py --apply`.** Their initial ledger-12/13 activation assumptions are consumed. Even state/browser scripts can write evidence or business/session state; inspect before using. A new release needs a bounded source diff, relevant tests, immutable image pin, exact persistent/config/access delta, reader-compatible recovery plan, and separately authorized deployment/restart/source/financial actions. The current documentation assignment authorizes none of those mutations.

## Priority findings and safe continuation

1. **Critical — financial completion is not established.** Preserve OFF and zero posting grants. Attributable Admin send success, external writer continuity and concurrency qualification must precede any proposed activation; do not add an Accountant acknowledgment gate or a second ledger.
2. **High — authority/projection gap.** Five Drafts retain historical-role warnings in source links, while the deployed canonical-row projection omits them. The pending source fixes this; until a separately accepted image exists, treat all five as unresolved despite their canonical IDs. The two outgoing confirmations are unmatched, not confirmation authority.
3. **High — incomplete operational chain.** No verified Employee relationship, real assignment, attendance/rate feeder, actual media/OCR-to-release, terminal completion or approved settlement/billing chain. Reuse current boundaries; table proposals and Core rate defaults cannot fill missing evidence.
4. **High — recovery/access lifecycle.** Old v1 rollback is incompatible; socket recreation requires exact ACL/remount/reconnect handling. Broad restart or DB restore can break retained facts/consumers. Physical device, restore/load and renewal operations remain distinct acceptance work.
5. **Medium — documentation/source drift.** Root README/VPS map and database-master-plan contain dated claims superseded by R1; this task leaves them intact outside its two-file scope. The plan's 43 proposed additions/54 eventual tables is a design, not current schema or mandatory rebuild. `db/schema.ts` omits newer SQL tables; qualification source copies/builds and candidate bridge pin are not deployed truth. Legacy archive duplicate/food/rate assumptions do not govern current PAY/EMP/entitlement semantics.

**Independently recommended next task (proposal only): prepare a narrowly scoped R1 authority-warning release package from the already tested correction.** Isolate the required canonical-roster warning projection from mixed R2–R4 changes, establish its exact source/compiled artifact and immutable image pin, and verify the five Draft warnings/two Review states, v1/v2 compatibility, unchanged Cash evidence and financial OFF in existing suitable qualification tooling. Preserve `f88…` as compatible recovery. Acceptance is a reviewable minimal package with relevant passing checks and an explicit live/device acceptance plan; no deployment, new grants, extraction, fixture commitment or release approval is included. This removes a verified misleading display gap while the Owner's dated authority reference is unavailable. It does not substitute for that reference or complete R1 acceptance.

## Evidence index and audit limits

- Current release: [R1 result](docs/R1_ACTIVATION_RESULT.md), [state](data/workflow-r1-current-state.json), [manifest](data/workflow-release.json), [reader contract](data/workflow-r1-reader-contract.json), [runtime boundary](data/workflow-r1-runtime-boundary.json), [live browser acceptance](data/workflow-r1-live-acceptance.json), [repair result](data/workflow-r1-repair-result.json), [rehearsal comparison](data/workflow-rehearsal-state-comparison.json), [follow-up runtime projection](data/workflow-r1-followup-runtime-check.json).
- Policy/contracts: [Owner rules](docs/OWNER_BUSINESS_POLICY.md), [identity/routing reconciliation](docs/IDENTITY_PERMISSIONS_ROUTING_RECONCILIATION_SPEC.md), [application responsibility/data contract](../../services/whatsapp/qualification/application-contract-20261011/specification.md), [completion plan](APP_COMPLETION_PLAN.md), [remaining work](docs/VS_CODE_AGENT_REMAINING_WORK.md).
- Whole-system design/history: [database master plan](qualification/database-master-plan-20261015/DATABASE_MASTER_PLAN.md), [source authority map](qualification/database-master-plan-20261015/SOURCE_AUTHORITY_MAP.md), [frontend/API matrix](qualification/database-master-plan-20261015/FRONTEND_API_DATABASE_MATRIX.md), [open decisions](qualification/database-master-plan-20261015/OPEN_DECISIONS.md), [employee qualification](docs/EMPLOYEE_PROGRAM_QUALIFICATION_SUMMARY.md), [Cash Control reuse](docs/CASH_CONTROL_SELECTIVE_REUSE_COMPATIBILITY_ASSESSMENT.md), [B01–B03 reuse assessment](qualification/b01-b03-readonly-20261014/ASSESSMENT.md).
- Operational history: [live readiness](qualification/live-off-readiness-20261014/DIFF_SUMMARY.md), [B04/B05 report](qualification/b04-b05-completion-20261014/REPORT.md), [business inbox](qualification/business-inbox-20261015/REPORT.md), [VPS map](../../docs/VPS_MAP.md), [root overview](../../README.md), [WhatsApp source guide](../../services/whatsapp/source/README.md).

Local `.git` is an empty mounted directory; `git status`/history are unavailable. `SOURCE-MANIFEST.json` explicitly excludes Git history. Retained Fazle-Core reference at commit `1838619b644dc83f4ca723d3442d94435e6050f1` freshly matched **40/40 Git blob hashes**; it is not an installed Core service. No remote current Core/Cash Control/Escort Operations/Hermes/Sites runtime or ownership cutover was verified. Browser/reader/replay/CAS/rehearsal/test results above were inspected as dated evidence, not executed again. Fresh work independently verified Docker identity/health/ports, certificate metadata, database/catalog/ledger/checksums, aggregate states, historical admissions, original cash digest and guard/history fingerprints. No fresh native content, WhatsApp connection/send, authenticated browser/device, business transition, financial concurrency, complete backup restore or exhaustive host-job/log/security audit is claimed.

`/opt/vps/NEXT-SESSION-HANDOFF.md` remains canonical. [R1 repair handoff](docs/R1_REPAIR_HANDOFF.md) is a scoped work order with historical steps; [VS Code agent handoff](qualification/frontend-workspace-20261015/VS_CODE_AGENT_HANDOFF.md) is a dated frontend package. Neither replaces the canonical handoff.

---

## Preserved dated reference and Owner Constitution

The complete pre-audit README follows unchanged. Its Owner Constitution remains authoritative subject to later explicit Owner instructions. Other operational statements retain their original dates and are superseded by the verified guide above where inconsistent; no historical evidence has been deleted.

## Stored-history extraction verified — 2026-10-15

This update supersedes earlier blocked/pending statuses below. Owner explicitly approved the verified-actor guard SECURITY DEFINER correction and PUBLIC execution revocation. It is now applied, preserving the existing predicate, FOR SHARE row lock and pg_catalog search_path; app registry privileges did not expand. Exact correction is retained in data/history-actor-guard-fix.sql; original migration 0011 checksum/receipt remain unchanged and ledger stays 12.

Bounded live extraction PASSED: 20 stored messages across two approved chats yielded 17 source-linked proposals. source_refs/business_commands/domain_events counts are each 17. The current-source-verified extraction API returns 17 rows. Replaying the first 10-message page twice produced 10 replays and zero inserts each time. Login, four authorized scopes and /review HTTP pass; visual/browser acceptance is not claimed. This is not full-history import, approved orders or financial posting.

No service restarted for this correction. PostgreSQL and wa-02 remain unchanged. No payment posting, message sending or business-data deletion. Current evidence: data/history-activation-status.json and data/history-live-verification.json. Existing MCP named-user ACL must be restored if its socket is recreated; call-control socket was not modified/accepted. Continue with bounded history coverage, verified Employee linkage, operational order/roster and financial writer; opening balance is not a prerequisite.

## Stored-history live increment — 2026-10-15

Migration 0011 is applied with its original checksum and receipt (ledger 12). App and wa-01 run the prepared history-increment images; app health, named login, four approved scopes, extraction read API and /review HTTP pass. PostgreSQL and wa-02 were not restarted. No new qualification workspace/database, payment posting, message send or business-data deletion.

Extraction is blocked: the new verified-actor trigger uses SELECT FOR SHARE under the runtime role; existing registry RLS returns zero locked verified actors although six are readable. The attempted extraction rolled back; source_refs/business_commands/domain_events counts remain 0/0/0. Do not report live extraction completion.

A proposed correction changes only alrifai_foundation_verified_actor() to SECURITY DEFINER and revokes PUBLIC execution, preserving its verified-person predicate, row lock and fixed search_path. Automatic approval review rejected that exact privilege change pending specific Owner approval. It has NOT been applied. No app registry grant expansion is proposed. After approval, fix the guard and repeat bounded extraction/replay/current-source checks; no restart is needed.

App UID 10001 access to the recreated MCP socket was restored with a named rw ACL. Future socket recreation needs this ACL restored until lifecycle handling is implemented. Separate call socket was not modified or accepted. Opening balance does not gate development. Full business workflow and financial writer remain unfinished.

# START AUDIT — APP CONSTITUTION DOCUMENTATION — 14 October 2026 (Asia/Dhaka)

Owner authorized root read/edit of only the three documents below. Documentation only; preserve previous content. Existing latest integration-readiness handoff reviewed (2026-10-13T20:57:56.793473+00:00 UTC). Its production findings are prior evidence, not live checks rerun here.

## App Constitution — Owner-authoritative — 14 October 2026 (Asia/Dhaka)

**Owner: Fazle Azim (aslsg). This Constitution records the Owner's business direction and governs future AL-RIFA’I work. Later explicit Owner instructions prevail. Older proposals, agent recommendations, code defaults and qualification safeguards are implementation details subordinate to this policy; they do not create business authority or new approval requirements. Documenting this policy does not activate production capabilities.**

### মালিকের সহজ মূলনীতি / Simple business workflow

WhatsApp আর frontend একই অ্যাপের দুটি প্রবেশপথ। কে তথ্য দিচ্ছে এবং কী কাজ করতে চাইছে—এই দুই বিষয় দেখে তথ্য সংশ্লিষ্ট কাজে যাবে এবং একই অনুমোদিত ব্যবসায়িক ডাটাবেসে সংরক্ষিত হবে। নিয়োগের আবেদন থেকে Escort duty তৈরি হবে না; ব্যক্তিগত কথা ব্যবসায়িক হিসাবে মিশবে না। ফোনে, সরাসরি বা ওয়েবে পাওয়া অর্ডারও একই নিয়মে গ্রহণ করা যাবে।

**WhatsApp / frontend (including phone or offline entries) → verified identity + message intent → scoped domain workflow → one authoritative business database.** AI agents and MCP are supporting interfaces to this same workflow, not separate business systems or authorities.

| Identity and intent | Business route and authority |
| --- | --- |
| Designated Admin ↔ Accountant direct chat | Authorized ledger/accounting workflow under existing Owner-approved PAY-001–012. A valid designated Admin→Accountant direct message with successful attributable sending is business confirmation; no new acknowledgment, reply, receipt or manual-approval gate. Incoming Accountant messages follow their authorized scope, not automatic Admin authority. |
| Escort Client ordering or confirming service | Escort orders/programs, preserving Client, vessel, Master and employee identities separately; existing Owner-approved assignment/confirmation rules apply. |
| Employee / operational staff | Staff records, duty, attendance and related operations within the person's approved capabilities. |
| Applicant seeking employment | Recruitment/applicant workflow; an application does not grant employee status or create Escort production/roster/duty assignments. |
| Family, relatives and other personal chats | Segregated personal context; no automatic business, recruitment or ledger write. Explicit Owner-authorized business intent is needed to enter a business workflow. |

A person can have more than one approved role or phone. Route each item by verified identity, current scoped authority AND actual intent; neither a contact name nor chat membership grants permission. wa-01 is the Owner-designated Admin WhatsApp account; operational phone/JID/account bindings must be verified against Owner authority without publishing private values. Account identity is not proof that every self-message was authored or approved by the Owner. Unknown or conflicting identity/intent stays unresolved for the applicable review path; do not guess, discard it silently or route all chats to Escort.

### One business truth, source evidence and safe access

- Apply the same domain validation, permission, approval and persistence rules to WhatsApp, frontend and Admin-entered phone/offline orders. Record the actual channel and operator; a web entry must not pretend to be a native WhatsApp message.
- AL-RIFA’I is the intended single logical authority for business records in the existing canonical database. Preserve existing authorized production writers until a separately approved transition; native WhatsApp stores remain transport evidence, not a competing business database.
- Preserve source traceability: account/chat/message IDs where available, original sender and direction, original content/reference, source and entry times, operator, linked domain record and outcome. Keep forwarded/quoted origin separate from submitter; unavailable provenance remains explicitly unknown.
- Handle exact replay idempotently by stable source/event or command identity. Do not merge distinct orders solely because names, phones or text resemble each other. Preserve revisions and conflicts; uncertain write/send outcomes require reconciliation before retry.
- Access is scoped by approved identity, role, domain, account/chat and action. Approval comes only from Owner policy: retain existing applicable rules, never invent repeated or blanket gates. A technical deficiency must be explained as a concrete implementation gap, with the smallest compatible remedy; do not silently bypass protections or treat a test restriction as an independent authority over the Owner.
- Preserve PAY-001–012, employee-mobile-v3, separate release/completion/settlement/payment milestones and immutable historical evidence. Historical Level B remains CLOSED BY OWNER — HISTORICAL REFERENCE ONLY; it is not a prerequisite for the current workflow.

### Reuse first; agent scope and timebox

Reuse compatible Fazle-Core, current VPS code/contracts/parsers/UI, existing WhatsApp MCP and the qualified integration candidate before adding code. Check provenance, business-rule compatibility and deployed-vs-candidate status; reference availability or offline PASS is not live integration proof. Use one domain routing path and canonical writer for both inputs. No unrelated infrastructure, duplicate bridge/database/service, generic platform expansion or reopening historical work.

Start each task with START AUDIT and the latest handoff; state the Owner-authorized goal, exact paths, expected result and boundaries. Use one bounded assessment pass (target 30 minutes, a working timebox rather than a business approval gate). If unfinished, report evidence, remaining uncertainty and one smallest next task; do not loop into unrelated audits or implementation. Continue already authorized work without repeated permission requests; obtain separate approval only for actions outside that scope.

Explain decisions to the Owner in ordinary business language: what works, what is missing, how it affects the business, the smallest proposed change and any decision actually required. Include exact changed paths/diff summary and evidence limits. End with END AUDIT and safe handoff distinguishing historical findings, newly checked evidence, proposed work and unexecuted actions.

### Owner decision summary

**সিদ্ধান্ত স্থির:** WhatsApp ও ওয়েবের কাজ একই নিয়মে হবে; হিসাব, Escort, কর্মী, নিয়োগ ও ব্যক্তিগত কথার কাজ আলাদা থাকবে; বিদ্যমান উপাদান আগে ব্যবহার হবে। এই নথি পরিবর্তনের জন্য নতুন ব্যবসায়িক সিদ্ধান্ত দরকার নেই। Production চালু করা, deploy/restart, migration, credential/grant provisioning বা টাকা পোস্ট করার অনুমতি এই নথি দেয় না।


## Prior verified B01/B02/B03 — none closed by this update

Latest integration-readiness definitions: B01 live native capture/reader/startup and scoped consumer unavailable; B02 fixed qualification host/database/profile guards reject real alrifai and need scoped production bootstrap compatibility; B03 CID identity/review schema, restricted role and migrations absent in production. B04 actual named bindings/grants and B05 private access remain separate dependencies. Older B-number registers are not interchangeable.

**Copy-paste next task — NOT EXECUTED / NOT AUTHORIZATION:** Start with START AUDIT, this Constitution and latest handoff. Perform one bounded read-only reuse-first compatibility assessment for B01/B02/B03. Match Fazle-Core/current VPS assets and the existing qualified integration candidate against the canonical app/database and existing WhatsApp interfaces. Identify exact reusable paths, newly verified gaps, minimum proposed startup/host-profile/schema-role changes, acceptance checks and safe transition/rollback boundaries. Explain actual Owner decisions in ordinary business language; separate prior findings from new evidence. Do not implement gates, provision grants/credentials, deploy, restart, migrate, activate consumers or post money without separate Owner approval. End with END AUDIT and safe handoff; no unrelated infrastructure expansion or historical reopening.

## END AUDIT — APP CONSTITUTION DOCUMENTATION — SAFE HANDOFF

Changed paths:
- /opt/vps/apps/al-rifai/README.md
- /opt/vps/docs/VPS_MAP.md
- /opt/vps/NEXT-SESSION-HANDOFF.md

Identical prominent Constitution and audit section added to all three. Editing procedure verifies previous bytes unchanged and ownership/mode retained. No code/configuration/runtime/database changes, deployment, restart, migration, provisioning, WhatsApp send or financial posting. No new production-readiness or regression-test claim. Next task remains proposed and requires its own authorization. Previous document bytes follow unchanged.

---

# AL-RIFA’I — Canonical Project Overview

## Current architecture and operations readiness — 11 October 2026

Read-only VPS/GitHub/Sites reconciliation, Asia/Dhaka. **Historical Level B: CLOSED BY OWNER — HISTORICAL REFERENCE ONLY.** The current objective is future Escort Client intake and authorized Admin–Accountant processing. The 8 October installation proposal below is retained history; it does not describe today's deployment or authorize installation.

| Component | Status | Verified responsibility and limit |
|---|---|---|
| Private VPS application | **RUNNING** | Next.js App Router frontend and server APIs in one `al-rifai-app-1` container, `127.0.0.1:3000`; authenticated `/`, `/register`, `/conversations` return 200. Historical views and preview/copy tools are available; business writes remain disabled |
| Shared PostgreSQL | **RUNNING** | `vps-infra` owns the engine on `vps-backend`; `alrifai`/`alrifai_app` serve the application. Eight application tables plus migration ledger: six migrations, 54 immutable snapshots, seven empty operational tables, read-only application transactions |
| WhatsApp transport/MCP | **RUNNING** | Independent service at `/opt/vps/services/whatsapp/source`, Compose at `/opt/vps/services/whatsapp/compose.yaml`; wa-01/wa-02 connected with one native writer each, CAP-4. wa-03 inactive. Private sockets, account-scoped consumer tokens; no application consumer provisioned |
| Stored parsers / lifecycle helpers | **IMPLEMENTED BUT UNVERIFIED** for current intake | `scripts/ingest_chats.py` is an offline archive extractor; `lib/employee-program-validation.mjs` is a pure candidate helper. Bounded tests find bare client-order and assignment-label/date gaps; neither is a live intake service |
| Contact/group administration | **PLANNED** | No live business contact/group registry or management API/UI. Bridge contact-book names and bundled conversation policy are evidence/reference, not client/finance authorization |
| Current Escort/Accounts pipeline | **BLOCKED** | No connected capture→identity→intent→draft→review→writer→send-evidence path. Individual Admin/Staff RBAC, approved client bindings, controlled operational writers and outbound correlation are missing |
| Future business authority | **PLANNED** | D12 selects AL-RIFA’I as sole logical owner of Employee, Program, Attendance, Release, Cash and application message/media evidence after separate transition approval. Existing production writers/FPE retain authority until then |
| Separate Sites project | **RUNNING** publication; implementation partly unverified | Version 10 / commit `3425b13f640016fdd7171ea1fda1c2d20c13f038`, `https://al-rifai.iamazim.com`; platform access mode is `public`. Eight D1 table names verified. Publication declares no Site MCP. Retained source export is verified, but current application authorization and runtime integration overrides are not independently qualified |
| Historical Level B | **HISTORICAL/CLOSED** | **CLOSED BY OWNER — HISTORICAL REFERENCE ONLY**; no investigation, import, posting or validator repair is an active prerequisite |

### Source layout, APIs and ownership

- `app/`: register, vessel/dashboard, Accounts and conversation views. Accounts uses snapshot/read models (`lib/accounts-snapshot.ts`, `lib/cash-data.ts`); Employee ID is the source-role-proven employee mobile, separate from payout number.
- `app/api/`: register/vessels, operations, import-audit, conversations, program-tools, core configuration, assistant and health. Operational mutation exports deny writes; program tools produce previews, not assignments, release approval or WhatsApp sends. `proxy.ts`, `app/chatgpt-auth.ts` and `lib/validation-auth.mjs` provide temporary private Basic validation, not individual production RBAC.
- `db/`: shared PostgreSQL pool/read adapters, Drizzle schema, six applied migrations and explicit migration/import tools. `programs`, `reviews`, `datasets`, `site_cash_archive`, `site_operation_notes`, `site_payment_drafts`, `site_settlement_drafts`, `site_source_snapshots` are the existing tables. Draft table names do not establish an operational approval/posting workflow. `db/migration-candidates/0006_employee_program_identity.sql` is unapplied candidate SQL, outside the migration ledger.
- `lib/integrations.ts`: frozen empty configuration; ambient keys do not activate Core, WhatsApp or AI. `lib/conversation-read.ts` retains a disabled external Core read adapter. There is no WhatsApp intake webhook or live message/account/outbox schema in the application.
- `scripts/` and `docs/`: offline extraction/qualification, explicit database tooling, approved policies and candidates. Source IDs in archive projections are export identities; native WhatsApp evidence requires separate account/chat/message correlation.

### Evidence, authorization and integration boundaries

Each WhatsApp bridge owns only its own `/var/lib/vps/whatsapp/wa-0N/{store,outbox,control}` and native SQLite/session/contact/LID state. WhatsApp containers use `vps-whatsapp_whatsapp-private`, have no published ports, and are separate from the app/PostgreSQL `vps-backend` network. The current app has no bridge-store mount or MCP grant. Transport persistence exists; an application evidence projection/ingestion boundary remains planned.

The app mounts `/var/lib/vps/al-rifai/evidence` read-only. Existing snapshots remain immutable. WhatsApp image/audio/document metadata exists, including quoted-message IDs; automatic media download and webhooks are disabled. No stored per-chat media files were found at inspection. OCR/PDF extraction is not connected, and transcription has neither a consumer grant nor configured model/provider here. No media was acquired in this audit. Forwarded text and transport direction do not identify the human/AI actor or prove authorized send success.

Direct finance authority remains exactly approved PAY-001–012: valid designated Admin→Accountant direct-message **successful sending** is business confirmation, without a new acknowledgment/manual-approval gate. Group, forwarded and extracted media evidence may support review but cannot independently post cash. Staff entries need authenticated Admin approval; the shared validator supplies no such role. Release, completion, settlement and payment remain separate milestones. Future authority/approval changes require immutable actor, version, source and outcome audit records; existing snapshots and candidate review/audit designs do not supply that production command log.

Fazle-Core is a pinned functionality reference (`1838619b644dc83f4ca723d3442d94435e6050f1`), not a locally installed app. Its Escort/client settings API, roster, group identity, FPE, RBAC and draft approval are reusable candidates with known policy/qualification gaps. Hermes, Escort Operations, Cash Control and other proposed MCP services have no verified local operational integration. Preserve external current writers; remote source availability is not deployment proof.

See the [latest Safe Handoff](../../NEXT-SESSION-HANDOFF.md#current-whatsapp-operations-foundation-and-documentation-reconciliation--11-october-2026) for the readiness matrix, contact/group and routing specification, actual-example acceptance results, source limitations and exactly one next task. Binding references: [Owner policy](docs/OWNER_BUSINESS_POLICY.md), [Phase 2 decisions](docs/PHASE2A_DECISIONS_REQUIRED.md), [responsibility/data contract](../../services/whatsapp/qualification/application-contract-20261011/specification.md), and [VPS map](../../docs/VPS_MAP.md). Older proposals yield to these current policies and the latest Owner instruction; Historical Level B remains closed.

### Selective Escort reuse — inactive candidate, 11 October 2026

Owner authorized accepting useful elements from the supplied Fazle-Core Escort module. [lib/escort-intake-candidate.mjs](lib/escort-intake-candidate.mjs) adapts pure parsing, one source-linked draft per lighter, blank Admin preview and existing-draft confirmation matching to AL-RIFA’I policies. It preserves raw text/field spans, capacity/cargo/destination, separates Master and employee mobiles, and keeps message date, booking date and explicit duty date/shift separate. It recognizes exact native replays without collapsing distinct orders with identical content. Unknown bindings, groups, forwarded/media evidence, missing Master, conflicting fields and ambiguous confirmations remain Review. Fazle-Core's `parse_escort_message(text)` remains its canonical parser; this separately named AL-RIFA’I candidate does not replace that source of truth.

**IMPLEMENTED BUT UNVERIFIED for production; bounded offline acceptance passed.** No API, UI, startup, consumer, schema, database writer, employee creation, roster mutation or outbound sending is registered. The module returns `operationalWrites=false` and `sendAuthorized=false`. Injected versioned binding/alias records are trusted offline qualification inputs, not authentication or signed production approval. Real operational bindings, actor verification, transaction/concurrency enforcement and send evidence remain blocked. Confirmation matching currently uses a conservative three-calendar-day source window and requires an explicit approved alias for differing vessel keys; that window still needs operational policy qualification.

[tests/escort-intake-candidate.mjs](tests/escort-intake-candidate.mjs): 25 checks pass against the retained private Owner fixtures and explicit offline authority controls. Tests do not persist contact numbers or business messages in source. From this application directory, run `ALRIFAI_ESCORT_FIXTURES=/path/to/private/fixtures.json node tests/escort-intake-candidate.mjs` with Node 22; the private fixture bundle must be supplied separately. Existing historical helpers, immutable evidence, policies and finance rules remain unchanged. See [the selective-reuse handoff](../../NEXT-SESSION-HANDOFF.md#selective-escort-reuse--inactive-candidate--11-october-2026) for limitations and the next task.

## Historical owner direction — 8 October 2026

Mission: complete and operate Integrated Services while preserving the working
application and business evidence. Current priority is WhatsApp MCP installation
and message data, followed by employee, cash, vessel program, duty, release slip,
payroll and reporting workflows. Recovery C1–C4 remains preserved but deprioritized;
do not expand recovery tooling or restart implementation from the ZIP.

PRIMARY_PRIORITY = WHATSAPP_MCP_INSTALLATION
PREFERRED_REPOSITORY = arshiyaazim/whatsapp-mcp
WHATSAPP_ACCOUNTS = 3
INSTALLATION = PENDING_OWNER_APPROVAL
NO_DUPLICATE_BRIDGES = TRUE

## Historical WhatsApp audit and installation proposal — 8 October 2026

Repository inspected remotely, without cloning or executing its code:
https://github.com/arshiyaazim/whatsapp-mcp/tree/895404542017f34a900f9f572a5497c275a96440
Commit: 895404542017f34a900f9f572a5497c275a96440. Its documentation identifies its
upstream lineage as verygoodplugins/whatsapp-mcp. Keep the owner's selected fork;
do not silently substitute repositories. arshiyaazim/whatsmeow is a library, not
a second server; the selected go.mod already pins go.mau.fi/whatsmeow. Do not
install that fork separately or change the dependency without a demonstrated need.
Do not install whatsapp-mcp-lharis alongside the selected implementation.

Local findings: neither apps/al-rifai/integrations nor the proposed WhatsApp runtime
directory exists. services is empty; no bridge source was found in canonical
apps/services/infra. Docker lists only al-rifai-app-1 and vps-infra-postgres-1.
Application remains on 127.0.0.1:3000; PostgreSQL has no host-published port.
Existing containers have no explicit memory/CPU/PID limits; do not alter these
without approval. Proposed bridge ports 8081–8083 and MCP ports 8001–8003 were
not listening at inspection, but the recommended container deployment below
requires no host-published bridge/MCP ports. Recheck before launch.

Host snapshot: approximately 21.3 GiB available memory, 183 GiB free disk, no swap.
Host Python is 3.10.12; Go, uv and FFmpeg are absent from PATH. Selected repository
requires Go 1.26.0 (SQLite driver requires CGO/compiler), Python >=3.11, and the
locked Python dependencies in uv.lock. Prefer a multi-stage container build with
the required toolchains; do not replace host Python or install global packages.
Dependency availability and actual build/tests remain unverified until approved.

### Verified upstream features and remaining gaps

IMPLEMENTED below means implemented in inspected upstream source, not installed
or live-qualified for AL-RIFA’I.

| Feature | Status | Evidence/limit |
|---|---|---|
| Three-account isolation | PARTIAL | ROADMAP explicitly specifies one process/paired device; run three isolated instances of one checkout/image |
| Per-account pairing | IMPLEMENTED | GetFirstDevice and refreshed terminal QR workflow; no pairing performed |
| Persistent sessions | IMPLEMENTED | Go uses relative store/whatsapp.db; session/contact/LID store must remain opaque |
| Account-specific sending | PARTIAL | Each instance sends through its own client; application must select an explicit fixed account and token, without fallback |
| Webhook delivery | PARTIAL | Native message IDs, replies, reactions, direction, media metadata; X-Bridge-Token, no redirects, 30-second timeout; no durable retry queue, timestamp/account identity absent from payload |
| Incoming/outgoing persistence | IMPLEMENTED | store/messages.db chats/messages, native composite message key (id, chat_jid); outbound save failures can be warnings after a successful send |
| Text/image/document/PDF/audio | IMPLEMENTED | Bridge media handling and MCP download/send_file/send_audio; voice conversion requires FFmpeg; image webhook bytes capped at 10 MiB |
| Transcription | PARTIAL | Opt-in whisper.cpp/model/FFmpeg or explicitly configured HTTP provider; transcript marker/provider/model retained; not configured here |
| Names and LID mapping | PARTIAL | Native mapping and contact lookup exist; chat display names combine fallbacks, not a complete separate name provenance model |
| Incoming calls | IMPLEMENTED | Call offer/group offer/accept/reject/terminate handlers and calls table; not delivered by inspected webhook.go |
| Missed calls | PARTIAL | Persisted lifecycle/result can support review; real event semantics require qualification |
| Outgoing calls | UNSUPPORTED | Repository guidance says linked devices cannot observe outgoing calls reliably; no outgoing-call promise |
| Auto-decline/follow-up | MISSING | No inspected RejectCall integration or automatic follow-up workflow; do not enable or claim either |
| AI/manual/other-human attribution | MISSING | is_from_me indicates direction only; application request actor/type/model/approval correlation needed |
| PostgreSQL sync | MISSING | No PostgreSQL integration; preserve upstream SQLite authority and use an idempotent application projection |
| Delivery/read/failed lifecycle | PARTIAL | Self-read markers implemented; not a full per-recipient delivery/failed ledger |
| Edits/deletions/reactions | PARTIAL | Reactions and deletion field exist; complete lifecycle/export behavior needs targeted verification |
| Meta Business channel | MISSING locally | Keep separate from linked-device stores, pairing and tokens |

Current local message model: source-reviewed PostgreSQL schema has programs,
reviews, datasets, site_cash_archive, site_operation_notes, site_payment_drafts,
site_settlement_drafts, immutable site_source_snapshots and the migration ledger.
No live messages/accounts/outbox schema is present in the reviewed migrations.
Historical conversations are snapshot projections. lib/integrations.ts is empty
and frozen; /api/conversations exposes historical/policy reads, denies mutations,
and its optional read adapter targets external Fazle Core rather than this bridge.
No database connection was opened; deployed schema drift/counts were not rechecked.

### Proposed exact paths and runtime architecture

One checkout only:
`/opt/vps/apps/al-rifai/integrations/whatsapp-mcp/`
One locally built pinned image, reused by three account instances. Proposed
integration deployment file: integrations/whatsapp-mcp/compose.alrifai.yaml;
container build file: integrations/whatsapp-mcp/Dockerfile.alrifai.

Private account directories:
- /var/lib/vps/al-rifai/whatsapp/account1/store/
- /var/lib/vps/al-rifai/whatsapp/account2/store/
- /var/lib/vps/al-rifai/whatsapp/account3/store/

Each store holds its own whatsapp.db, messages.db, .bridge-token and per-chat
media; each account also has a separate outbox directory. Bind only that account's
store at /runtime/store, working directory /runtime. This reuses upstream relative
Go paths without adding storage configuration or symlinks into source. Python
uses explicit WHATSAPP_DB_PATH=/runtime/store/messages.db,
WHATSMEOW_DB_PATH=/runtime/store/whatsapp.db, WHATSAPP_API_URL pointing to its own
bridge. Label pairing devices AL-RIFA’I account1/account2/account3.

Configuration proposals:
/etc/vps/apps/al-rifai/whatsapp/account1.env, account2.env, account3.env.
No real numbers, tokens, QR data or session secrets belong in documentation.
Root owns configuration; secrets 0600. Runtime directories 0700, secret/database
files 0600 where supported, owned by each distinct approved runtime UID. Separate
UIDs/mounts protect stores between instances; root retains administrative access.
Do not reuse app UID 10001 for sessions by default. UID selection needs approval.

Bridge instances whatsapp-account1/2/3 would join existing vps-backend with no
published ports, capped resources and only their own writable mounts. Native
bridge binds loopback and enforces loopback Host values, so container-to-container
REST needs a small reviewed bind-address/explicit-host-allowlist adaptation in
whatsapp-bridge/main.go and auth.go. Retain token auth and safe upstream defaults;
never remove Host validation or mount the Docker socket into Next.js.

Python MCP initially remains stdio, launched on demand per account by an approved
operator/client within that account's container. No unauthenticated HTTP/SSE MCP
endpoint. Next.js uses the existing authenticated bridge REST API for manual
application sends; no second WhatsApp implementation. AI sends stay disabled until
actor/approval controls are implemented and separately accepted.

Initial proposed caps per bridge workload: 1 CPU, 512 MiB memory, 128 PIDs,
bounded logs (10 MiB x 3). Python MCP, media and history bursts require measurement;
transcription workers/models are excluded from these estimates. Start with one
approved account, measure resource use, then enable the other two. No changes to
production app/PostgreSQL caps are proposed. Media disk budget, retention and
historical sync depth need owner selection; do not silently delete media.

### Smallest necessary application adaptations

Installation first: pin checkout, build image, verify upstream Go/Python tests and
account configuration without starting/pairing; prepare inactive compose definition.
No changes to app package dependencies are expected for this preparation.

Subsequent separately approved application integration:
- Update lib/integrations.ts only with a typed private account registry; do not
  revive all old integrations or Fazle Core assumptions.
- Add lib/whatsapp.ts and app/api/whatsapp/webhook/[account]/route.ts; authenticate
  the account-specific token, derive account from trusted route/config, validate
  bounded events, never trust an arbitrary payload account. Review proxy.ts for
  machine authentication without weakening browser routes.
- Extend existing conversations UI/API to show accounts, preserved message identity,
  media and attribution; add an authenticated manual-send route with explicit actor,
  account and recipient selection. Never infer human/AI attribution from direction.
- Add one additive migration through existing db/migrations and checksum-ledger
  authority, plus db/schema.ts changes, only after schema/write approval. Final
  migration filename is assigned after checking the existing ledger.
- Reuse chats/messages/calls as bridge transport authority. PostgreSQL stores a
  rebuildable application projection keyed by (account_id, chat_jid, message_id),
  and application-owned outbound intent/actor metadata, not a rival message ledger.
  Account/chat keys must not collapse identical message IDs across accounts.
- Add bounded read-only reconciliation/export from upstream SQLite through the
  existing authenticated bridge REST surface, with cursor/overlap deduplication.
  Webhooks are notifications, not proof that a SQLite row persisted. This covers
  missed webhooks, history and calls without inventing another bridge. Export must
  omit session keys/media encryption secrets and retain native IDs/timestamps.
- Extend send response to return native response ID for exact intent attribution;
  its current JSON exposes only success/message. Unknown send outcomes must be
  reviewed, not blindly resent. Successful send plus failed persistence is a
  distinct error requiring reconciliation.

Preserve original JIDs/LIDs and known phone identifiers separately from normalized
E.164; unresolved phone is NULL, never digits guessed from an LID. Record separate
contact-book/display name provenance where upstream supplies it; unknown recipient,
name or username stays unknown. Store original message time separately from receipt,
send-attempt and sync timestamps. Preserve reply IDs and typed events. AI/manual/
other-human/system attribution is explicit application metadata; uncorrelated
self messages are unattributed rather than assumed manual or AI.

### Meta, approval boundaries and handoff

Meta Business remains a separate channel requiring owner-approved business/app/WABA
and phone-number IDs, permission/token setup, webhook verification/signature checks,
and outbound policy/template review. No linked-device session or QR is used for Meta.
Do not assume its business number can share the selected accounts' registration.
No Meta setup or credentials were changed.

Next owner approval should distinguish: (1) checkout/build/offline adaptation paths
and dependencies; (2) runtime directories/UIDs/config/services and one-at-a-time
pairing with the owner's phones; (3) additive database projection and application
write/auth changes; (4) approved test recipients and manual sends; (5) AI/transcription,
Meta and any eventual app deployment/restart. Installation approval alone does not
authorize pairing, sending, migrations or production restart.

Owner's requested weak temporary development login must remain strictly private,
use password hashing, and be replaced before external access. Existing validator
credentials/authentication remain unchanged; do not overwrite them without approval.

This session changed this existing overview only. Public repository source, local
source/migrations, container names/limits/ports and host resources were inspected.
No repository installed, service created, account paired, message sent, database
connected or changed, authentication changed, production restart or cleanup occurred.
Next agent: read this overview and VPS_MAP, recheck repository commit/dependency
availability and runtime conflicts, then obtain the appropriate implementation
approval. Detailed prior workflow proposals remain in docs/PHASE2_IMPLEMENTATION_PLAN.md;
their recovery-first sequencing does not override the owner's WhatsApp priority.

## Preserved Phase 1 implementation reference

Next.js 16.3.4 / React 19.2.6 on Node 22.23.3, pnpm 11.25.0, PostgreSQL 16.
One private validation application; no public deployment or live integrations.

Source: `/opt/vps/apps/al-rifai`. Configuration: `/etc/vps/apps/al-rifai`.
Private evidence: `/var/lib/vps/al-rifai/evidence`, mounted read-only.
The v10 ZIP and staging tree are immutable provenance, not runtime inputs.

`pnpm build` creates a genuine Next production build. `pnpm start` serves on
host loopback for standalone checkout use. The Docker runtime runs Next's
standalone `server.js`; its internal listener is reachable through the single
host binding `127.0.0.1:3000:3000` and the existing `vps-backend` network.

Browser authentication uses HTTP Basic username `validator`, with a random
password in `/etc/vps/apps/al-rifai/validation_password`. Obtain that value
through an administrator's secure local terminal; never paste it into chat,
source or documentation. Use an SSH tunnel for access from another machine.
This temporary identity grants only the existing read-only workspace. Sites
identity headers are ignored. Before any public deployment choose real login,
audience authorization, session lifetime, logout and transport protection.

Database commands are explicit: `pnpm db:migrate`, `pnpm db:import`,
`pnpm db:verify`. They require the external database password file and evidence.
The server never runs migrations or imports during startup/GETs. Its PostgreSQL
sessions default to read-only. Migration and import commands use one transaction,
reject changed migration hashes or conflicting immutable rows and never overwrite
records. Original SQLite migrations are provenance in `docs/legacy-d1` only.

Four private datasets are byte-identical copies. Five recovered seed rows are
externalized as JSON; original seed source is also retained privately.
`docs/evidence-checksums.json` records hashes. Dataset projection and historical
same-ID overlay behavior is inherited from v10; import does not deduplicate,
normalize or rewrite evidence. This export is not a live D1 backup. Hosting-only
records and missing original exports/media remain unavailable.

External integrations are hard-disabled by `lib/integrations.ts` and the live
conversation boundary, including with ambient credentials present. Historical
conversations and policy remain available. All operational mutations remain 405.

Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`node tests/database.mjs`, and `node tests/phase1-http.mjs` against loopback.
Legacy Worker tests are preserved under `tests/legacy-source`; they are not the
current runtime tests. Original Python parser tests that require original exports
cannot establish full source reconstruction without those missing inputs.

Upstream originals are in `docs/v10`; current Phase 1 behavior takes precedence
where those documents refer to Sites, D1 or external systems.


## B04/B05 live scoped baseline and app roadmap — 2026-10-15T00:18:32.417777+06:00

Current entry https://app.al-rifai.iamazim.com/review; existing named admin credential unchanged. Package `/opt/vps/apps/al-rifai/qualification/b04-b05-completion-20261014/REPORT.md`; roadmap `/opt/vps/apps/al-rifai/APP_COMPLETION_PLAN.md`. Owner authorized this session's completion work; only app/wa-01 changed. Fixed six-person registry with ten new PN/LID incoming aliases and91 bounded grants, five-person exact native reader, named subject selection/native refresh/shared draft path and live security/replay/revocation checks verified.

Two actual incoming Hridoy events resolve to one verified Client; original native receipts and explicit qualification draft survive actual restart/replay. Unknown forwarding stays clarification. Qualification draft is held NEEDS_CLARIFICATION/NOT_ACTUAL_ORDER; preserve evidence. Named HTTPS/browser38, live native/form18, controlled scope revoke12, session boundaries5 and saved ON/effective OFF/ending OFF settings3 checks pass. Current-source synthetic workflow13groups/41traces, targeted18, policy21 and Go socket/lease/race10top-level55including subtests pass; these are not physical phone/reject/delivery proof.

Real restart stale owned call socket fixed in the reviewed bridge: only same-owner ECONNREFUSED cleanup; active/foreign/file/symlink/replaced inode refused. An execution mistake started deployment after an image-executable smoke failure, briefly making wa-01 unavailable. Corrected file mode, exact-image smoke prerequisite and socket identities/ACL/remount restored connection; failure and recovery evidence retained. Final app/wa-01 running; PostgreSQL/wa-02 ID/image/start unchanged. App image84c60c6f8359…; bridge9f34e0d6c5c5…; exact full pins in ACTIVATION_ARTIFACTS.json.

Calls saved/effective OFF, connected, caller list empty/all-trusted-direct false, cooldown600, eight owner/wife/daughter/Accountant PN/LID exceptions saved; action capabilities absent. WhatsApp toggle disabled pending human attribution; frontend works independently. No real reject/send/provider/financial action. No new migration/credentials/DNS/TLS/public port/service/database/pairing; ledger11 and countsprogram/cash/payment/settlement0/source54 unchanged. PAY-001–012/employee-mobile-v3/historical closure retained.

**Full B04/B05 acceptance OPEN.** Actual owner device acceptance, broader service/Employee/participant proof and unknown-chat/provenance compatibility remain as documented; do not convert retained synthetic cases into live domain PASS. Current app reader permits only ten exact direct namespaces, no group participants or broad contacts/store/send. Only one named owner login; other contacts are not logins.

Owner was asked once for PC/mobile feedback and a different controlled physical phone; no answer recorded in this session. Do not repeat activation approval for already authorized work. Original17:05–17:10 slot expired/not executed; no guessed new caller/time. Controlled proposal ready=false, caller/start/end null. Next smallest required external step: owner device check plus other-phone caller/fresh300s window for physical pilot; next development batch is roadmapphase1 acceptance/unknown inbox then one verified real client order. No blanket per-call confirmation gate after approved ON. Future business/financial/provider/general-send phases remain plans, not automatically authorized rollout.

Old packages untouched; canonical README/VPS_MAP/handoff append-only. Root-private checkpoints preserved; never overwrite newer receipts/data with backups as rollback. Final boundary/pins and detailed diff in this package.

END AUDIT — SAFE HANDOFF


## Inbox usability deployment — 2026-10-15T00:56:54.021436+06:00

Owner approved isolated build/tests then app-only deploy/restart. Current image
sha256:6b55d4160b16c0aa5e587d112bf692d9e4f24a2d21d5554ca2ee5a28eee9e16f; existing URL/login unchanged. Default permitted IDENTITY
inbox auto-loads; names, source text/time and current-page search are available.
Native refresh reloads reviews; zero new events does not mean no prior messages.
Database/call/technical controls collapsed. Initial default ESCORT mismatch was
found during live test and corrected; failed evidence and images retained.
Full build/typecheck/smoke PASS; isolated browser 22 PASS;
live trusted HTTPS/browser 24 PASS, including actual native
source. Physical owner phone and headless Bengali glyph rendering unqualified.
Only app recreated; PostgreSQL/wa-01/wa-02 exact initial states retained.
Calls OFF/connected; no send/reject/financial action or permission expansion.
Full B04/B05 remains OPEN. Details: /opt/vps/apps/al-rifai/qualification/inbox-fix-20261015/REPORT.md.


## Owner-facing business inbox correction — 2026-10-15T01:20:22.664877+06:00

Owner requested that fixing the page preserve the complete AL-RIFA’I business
target. Current actual source: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/source/alrifai. Image sha256:18f6086df8c6ebfe46d55245ef62122b40786789c7b7c57768446923ab1814c5.
Three tabs: Messages / Write a new request / Work steps. Only source-proven
permitted native messages appear in inbox; manual/held qualification drafts
are excluded without deleting evidence. Domains are merged; no owner technical
category selection. JSON/qualification command/database/call diagnostic controls
are removed from this page. Existing backend permissions and call OFF unchanged.
Full build/typecheck/smoke PASS; isolated browser 30 PASS;
live normal HTTPS/browser 30 PASS. Only app restarted;
PostgreSQL/wa-01/wa-02 exact ID/image/start unchanged. No finance/order/send,
credential, migration, grant expansion or history import.
Physical owner mobile and headless Bengali glyph rendering remain unqualified.
Target/workflows: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/TARGET_WORKFLOWS.md. Full app and B04/B05 still OPEN.
Next business milestone is one verified real client request → canonical approved
order → approved Employee assignment; do not keep treating inbox polish as full
business completion. Preserve PAY-001–012, employee-mobile-v3 and historical closure.
Report: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/REPORT.md. Roll back app image only if needed; never restore older DB.


## Cash/roster frontend start and VS Code audit handoff — 15 October 2026

Owner requested complete root/app review and Cash/Roster frontend development.
Prepared handoff: /opt/vps/apps/al-rifai/qualification/frontend-workspace-20261015/VS_CODE_AGENT_HANDOFF.md.
No direct VS Code messaging tool was available; no receiving agent/started audit
is claimed. Scoped metadata/source review only; full audit remains pending.
Fresh alrifai metadata: nine public tables including ledger; identity review has
records/operator_decisions; 11 ledger entries. ep_* candidate and operational
cash ledger not deployed in this inventory. Do not call business database done.
Existing AccountsPanel/RegisterViews should be audited and reused where valid.
Separate frontend/index.html design preview has browser-memory drafts only,
starts empty and explicitly labels demo data. Eight model +28 isolated browser
checks PASS. It is NOT connected to company data and NOT production accounting.
Next: complete page/API/writer/schema audit; qualify canonical cash and
order/Employee/assignment contract; integrate authenticated real cash/roster
pages with reports/import/export/print. See API_AND_PAGE_PLAN.md and REPORT.md.
No production deployment/restart/schema/credential/DNS/finance/send action this
turn; prior inbox UI approval does not authorize financial/schema activation.


## Source-linked Cash / canonical Escort Roster — 15 October 2026

Canonical source now contains typed source-linked Cash records/manual exact-money boundary, canonical Client draft→confirmation/lifecycle linkage, table filters/details/page totals/export, scoped group reader and socket lifecycle fix. This is a built candidate, not a production activation or full workflow-completion claim. [Release, current counts, limits and rollback](docs/WORKFLOW_RELEASE.md); [exact files/SQL/image manifest](data/workflow-release.json); [review diff](data/workflow.patch). Do not run migration/rehearsal or recreate services without the action-specific approval recorded there. Existing auth/credentials, applied 0011 checksum, guard, wa-02 and paired stores are preserved.


AL-RIFA’I R1 repair — 16 October 2026 (Asia/Dhaka): **NOT ACCEPTED**.
Owner-approved column-scoped 0013_program_command_permissions.sql + receipt
committed (sha256 ca9044bd197808d1141b8fcc7cbdf86b9dbcaeb6aecafa987e213d2fc144ef65),
ledger14, 0012 checksum preserved. Same f88af2ed49ce candidate app live/healthy,
financial OFF, WhatsApp/PostgreSQL identities/start/restarts unchanged. Actual
runtime boundary/trigger/CAS PASS; old v1-only image is incompatible with retained
v2 and is not an operational rollback target. Compatible reader recovery pin is
the same approved f88 candidate; retain additive schema/facts on app recovery.
Bounded30 Client messages =>7 source facts,5 canonical Draft +2 Review,0 Confirmed,
0 assignments/postings; exact replay0 new facts. All7 historical authority false;
Owner will supply an existing proof reference, not yet provided. Never backdate
bindings or count synthetic conversations/HTTP200 as confirmation acceptance.
All24 original REVIEW Accountant cash rows retain their full-row digest.
Real desktop/mobile-layout browser44 PASS with live API, trusted TLS and no mocks;
physical phone and operational confirmation NOT accepted. Limited source-only
R2–R4 fixes prepared/tests6+12/typecheck PASS, not built/deployed; full group/media,
predecessor release, verified rate/attendance/send-result and directory remain.
Do not rerun either initial-ledger12 or repair-ledger13 activation script.
Current evidence/report: apps/al-rifai/docs/R1_ACTIVATION_RESULT.md,
apps/al-rifai/data/workflow-release.json and workflow-r1-current-state.json.
