# VPS Server Audit — 2026-11-11

**Host:** `/opt` · **Scope:** git repos, PostgreSQL/SQLite, application modules, routes, frontend, docs, Docker
**Mode:** read-only audit. No container, DB row, schema, file or git state was changed by this audit.

---

## Executive summary

1. **Two of three repos are dirty; `/opt/al-rifai-platform` is 66 commits behind `origin/main` and 2 local commits are unpushed.**
2. **Migration drift is the top risk:** the live DB has migrations `002–026` applied, but `main` only carries `002–009`; `012–026` exist only in the `feat/15-task-roadmap` worktree, and `main`'s untracked `011` has a checksum that does **not** match the applied ledger.
3. **Uncommitted `lib/standalone/finance.ts` breaks the build** (`TS2339 source_block_key`, `TS2304 now`) — this is user work, left untouched.
4. **Production runs an image that predates the mobile-responsiveness fix** (image built 05:52, fix committed 12:06); the deployed CSS contains zero `max-width: 768px` rules, so the live site is still mobile-broken.
5. **Docker hygiene:** 15 dangling images (≈1.72 GB each), 17/17 local volumes dangling (4.9 GB), 64 GB build cache, and 16 PostgreSQL databases (mostly test/restore copies).

---

## Section A — Git & code health

### A.1 Repository summary

| Repo | Branch | Work tree | Local commits not pushed | Behind upstream | Stash |
|---|---|---|---|---|---|
| `/opt/vps` | `target01-vessel-fragment-merge` | 🔴 DIRTY — 16 M, 2 untracked entries (706 files) | ⚪ NO UPSTREAM (0 unique commits) | n/a | none |
| `/opt/al-rifai-platform` | `main` | 🔴 DIRTY — 3 M, 5 untracked, 0 staged, 0 deleted | 🔴 UNPUSHED — 2 | 66 | none |
| `/opt/al-rifai-recruitment-ai` | `master` | ✅ CLEAN | ⚪ NO REMOTE — 6 local commits | n/a | none |

### A.2 `/opt/vps` (dirty, no upstream)

| Kind | Count | Files |
|---|---|---|
| Modified, unstaged | 16 | `apps/al-rifai/Dockerfile`, `app/api/cash/[...path]/route.ts`, `app/cash/page.tsx`, `candidates/identity-review/live-cash.ts`, `compose.yaml`, `docs/OWNER_BUSINESS_POLICY.md`, `docs/WHATSAPP-MESSAGE-MIRROR.md`, `lib/cash-publish.ts`, `lib/cash-scope.ts`, `lib/history-extraction.mjs`, `scripts/backfill-approved.mjs`, `scripts/check-runtime-imports.mjs`, `scripts/process-cash.ts`, `tests/business-workflows.mjs`, `tests/cash-intake-safety.mjs`, `tests/cash-super-admin-auth.mjs` |
| Staged | 0 | — |
| Untracked | 2 entries / 706 files | `al-rifai-standalone/` (entire tree), `apps/al-rifai/lib/cash-source-eligibility.ts` |
| Deleted | 0 | — |

- Last commit: `39f7d53` (2026-11-04) `docs: record Target 01/02 production position and deployment risks`
- Remote: `origin git@github.com:arshiyaazim/opt_vps.git`; branch has **no upstream**, but `git log --not --remotes` shows **0 unique commits**.
- Note: `apps/al-rifai` also contains a Drizzle setup (`drizzle.config.ts`, 68 files in `db/migrations`) that is **not** what production runs.

### A.3 `/opt/al-rifai-platform` (main worktree)

| Kind | Count | Files |
|---|---|---|
| Modified, unstaged | 3 | `compose.phase3.yaml`, `compose.yaml`, `lib/standalone/finance.ts` |
| Staged | 0 | — |
| Untracked | 5 | `app/(workspace)/layout.tsx.backup-20261107-192036`, `db/standalone/010_vessel_draft_delivery.sql`, `db/standalone/011_cash_payment_events.sql`, `phase3-implementation-plan.md`, `phase3-technical-decision-report.md` |
| Deleted | 0 | — |

- Current branch `main`; upstream `origin/main`: **behind 66, ahead 2**.
- Unpushed: `b6c0c7f fix(ui): contain wide tables and make filters/forms mobile-first`, `ca958f8 docs(ui): add mobile detail-route screenshots`.
- Last commit: `ca958f8` (2026-11-11).
- Checkout is a multi-worktree repo (see A.4).

### A.4 Git worktrees of `/opt/al-rifai-platform`

| Worktree | Branch | Upstream | Ahead/behind | Status |
|---|---|---|---|---|
| `/opt/al-rifai-platform` | `main` | `origin/main` | ahead 2 / behind 66 | 🔴 dirty |
| `/opt/al-rifai-phase3-activation` | `feat/15-task-roadmap` | `origin/main` | ahead 19 / behind 9 | ✅ clean |
| `/opt/al-rifai-phase3-cash` | `feature/phase3-cash-paid-events` | same | 0 / 0 | ✅ clean |
| `/opt/al-rifai-phase3-docs` | `feature/phase3-docs-audit` | same | 0 / 0 | ✅ clean |
| `/opt/al-rifai-phase3-integration` | `feature/phase3-integration` | same | 0 / 0 | ✅ clean |
| `/opt/al-rifai-phase3-release` | `feature/phase3-010-011-release` | same | 0 / 0 | ✅ clean |
| `/opt/al-rifai-phase3-test` | `feature/phase3-router-cash-vessel` | same | 0 / 0 | 🟡 5 untracked fixtures |
| `/tmp/opencode/al-rifai-main` | `release/v1.11.0` | `origin/main` | 0 / 0 | ✅ clean |

### A.5 `/opt/al-rifai-recruitment-ai`

- ✅ CLEAN, no stash, **no remote configured** (push impossible), 6 local commits; last `67d00ee` (2026-11-11).
- `.env`, `data/`, `logs/` are untracked/ignored; no secret is tracked (`git ls-files` shows only `.env.example`).

---

## Section B — Database & migrations

### B.1 Migration status — PostgreSQL `alrifai_v2_phase3`

| Metric | Value |
|---|---|
| Framework | Custom raw-SQL runner (`scripts/standalone/migrate.mjs`), ledger `public.schema_migrations` |
| Applied | **25** (`002`–`026`) |
| Pending (in ledger) | 0 |
| Failed | 0 |
| `schema_meta.schema_version` | `1.13.7` (2026-11-05) |
| Verdict | 🔴 **DRIFTED vs `main`** (DB newer than the repo's migration directory) |

**File/ledger consistency**

| Version | In `main` checkout | In activation worktree | Ledger checksum |
|---|---|---|---|
| `010_vessel_draft_delivery.sql` | untracked, checksum matches | ✅ | matches |
| `011_cash_payment_events.sql` | untracked, **checksum `9dabe5e7…` ≠ ledger `4203fdbe…`** | ✅ matches ledger | `4203fdbe…` |
| `012`–`026` | ❌ missing | ✅ present, all checksums match | matches |
| `002`–`009` | ✅ tracked | ✅ | matches |

Impact: a fresh install from `main` cannot reproduce production, and `npm run db:migrate` from `main` would refuse `011` (checksum change) and never apply `012–026`.

### B.2 Other databases

| Store | Tables / files | Status |
|---|---|---|
| PostgreSQL `alrifai_v2_phase3` | 67 public tables | ✅ all 32 module tables verified present |
| PostgreSQL other DBs | 15 extra: `alrifai`, `alrifai_v2`, `alrifai_v2_ai_ci_test`, `alrifai_v2_ci_test`, `alrifai_v2_fresh{,2,3}`, `alrifai_v2_import_test`, `alrifai_v2_phase3_{clone,preimport_restorecheck,rehearsal,restore_20261109t213503z,restore_y1109t213458,restorecheck,synctest}`, `alrifai_v2_test` | 🟡 test/restore leftovers |
| Recruitment SQLite `data/recruitment.db` | `recruitment_replies`, `sender_topics`, `conversation_state` | ✅ schema present (no migration ledger; created by app) |
| WA-01 bridge SQLite | `messages.db` 33.6 MB, `whatsapp.db` 8.6 MB | ✅ active |
| WA-02 bridge SQLite | `messages.db` 9.7 MB, `whatsapp.db` 5.7 MB | ✅ active |
| Drizzle (mirror only) | 68 SQL files in `/opt/vps/apps/al-rifai/db/migrations` | ⚪ not used by deployment |

### B.3 Schema consistency

- Verified 32 expected tables exist: cash (10), vessel (7), employee/identity (2), attendance (2), WhatsApp (4), review/audit (3), keys/log (2), message pipeline (2). **0 missing.**
- `cash_instructions.source_block_key` **does exist** in PostgreSQL (so the DB is fine).
- Real inconsistency is in code: uncommitted `lib/standalone/finance.ts` reads `submission.source_block_key` from a narrow TypeScript type that omits it, and calls an undefined `now()` (lines 529/538/539) → `tsc` fails.
- `app_settings('recruitment.mode') = {"mode":"DRY_RUN"}` ✅.

---

## Section C — Application module status

> “Last modified” = last git commit touching the core files; mtime shown where relevant.
> TODO/FIXME/HACK scan over `app lib components scripts db`: **0 occurrences**.

### C.1 Cash module (ক্যাশ)

| Aspect | Detail |
|---|---|
| Core files | `lib/standalone/finance.ts` (654 L), `cash-dashboard.ts`, `lib/cash-*.ts`, `app/api/finance/route.ts` |
| DB tables | `cash_accounts`, `cash_instructions`, `cash_postings`, `ledger_entries`, `cash_submissions`, `cash_submission_reviews`, `cash_payment_events`, `cash_payment_event_postings`, `cash_reconciliations`, `cash_transaction_adjustments` |
| API | `GET/POST /api/finance` — resources `instructions`, `payments`, `accounts`, `instruction`, `reconciliations`, `ledger`, `submissions`; actions approve / reject / post / reverse / submit / decide / income-expense / reconcile |
| Pages | `/cash`, `/cash/[id]`, `/cash/submissions`, `/cash/transactions`, `/cash/archive`, `/submissions`, `/transactions`, `/transactions/employee/[phone]`, `/income-expenditure`, `/register` (unrelated alias), `/sources-review` |
| Business rules | State machine `REVIEW → APPROVED → POSTED`; `REJECTED` terminal from REVIEW/APPROVED; reversal only from POSTED, never deletes the original posting or ledger entry, writes an audit event; capability gates `cash.read/submit/review/post/reverse/reconcile/ledger/account.manage` |
| Last modified | 2026-11-07 (`finance.ts`, `cash-dashboard.ts`, `app/api/finance/route.ts`) |
| TODO/FIXME/HACK | none |

### C.2 Vessel module (ভেসেল)

| Aspect | Detail |
|---|---|
| Core files | `lib/standalone/programs.ts` (428 L), `lib/programs.ts`, `lib/vessel-*.ts`, `lib/order-draft*.ts`, `lib/release-*.ts`, `app/api/programs/route.ts` |
| DB tables | `programs`, `program_assignments`, `program_events`, `program_pay`, `program_source_messages`, `vessels`, `vessel_draft_deliveries` (+ three `*_snapshot` tables) |
| API | `GET/POST /api/programs` — actions `create`, `update`, `assign`, `start`, `complete`, `release`, `void` |
| Pages | `/vessel`, `/vessel/[id]`, `/vessel/drafts`, `/vessel/register`, `/vessel/vessel-register`, `/vessel-register`, `/register` |
| Business rules | States `DRAFT → ASSIGNED/CONFIRMED → COMPLETED`, `VOIDED` terminal; duplicate warning on mother+lighter+date; void/update blocked after `COMPLETED`/`VOIDED`; release-day policy `HALF_DAY_ENDS`; `vessel.command`, `vessel.release`, `vessel.submit`, `vessel.read` |
| Last modified | 2026-11-07 |
| TODO/FIXME/HACK | none |

### C.3 Employee module (কর্মচারী)

| Aspect | Detail |
|---|---|
| Core files | `lib/standalone/employees.ts` (207 L), `lib/employee-*.ts`, `app/api/employees/route.ts` |
| DB tables | `employees`, `identity_aliases`, `escort_client_group_authorizations` |
| API | `GET` (search/directory), `POST` (create), `PATCH` (update) `/api/employees` |
| Pages | `/employees`, `/employees/[mobile]`, `/employee`, `/employee/[phone]` |
| Business rules | Mobile normalisation/search key; states `ACTIVE/INACTIVE/SUSPENDED`; submit-for-review when actor lacks `employee.manage`; capabilities `employee.read/manage/submit` |
| Last modified | 2026-11-07 |
| TODO/FIXME/HACK | none |

### C.4 Attendance module (হাজিরা)

| Aspect | Detail |
|---|---|
| Core files | `lib/standalone/attendance.ts` (100 L), `app/api/attendance/route.ts` |
| DB tables | `attendance`, `attendance_records` |
| API | `GET` (list + `?view=summary`), `POST` (record), `DELETE` `/api/attendance` |
| Pages | `/attendance` |
| Business rules | `state ∈ {PRESENT, ABSENT, LEAVE}`; `hours ∈ [0,24]`; unique `(employee_mobile, duty_date, shift)`; conflict = corrective upsert + `ATTENDANCE_CORRECTED` audit; employees must exist; non-managers go to review queue |
| Monthly summary | `attendanceSummary(month)` groups by employee/shift |
| OT / duty rules | **No clock-time OT.** Shift tokens `D`/`N`; a night shift is `N` on a calendar date; day = 2 shifts; `HALF_DAY_ENDS` = span − 0.5·[start=N] − 0.5·[end=D]; pay computed in half-day units from dated, verified rates (`lib/duty-calculation.mjs`, `lib/payroll-rules.ts`); transport is additive and separate |
| Last modified | 2026-11-06 |
| TODO/FIXME/HACK | none |

### C.5 Message parser (মেসেজ পার্সার)

| Aspect | Detail |
|---|---|
| Core files | `lib/release-parser.ts` (686 L), `lib/history-extraction.mjs` (168 L), `lib/message-classifier.ts`, `lib/escort-intake-candidate.mjs` |
| Supported formats | Payment block `ID: <phone> <name> <payout>(B/N) <amount>/-`; mobile-first lines with name heuristic; amounts `1,234/-`; Bangla + English keywords; Bengali digit normalisation; `(বিকাশ)`→`(b)`, `(নগদ)`→`(n)`; conveyance / office-return / ghat lines; food-bill, sukani, day-count and stated-date evidence lines; mother/lighter vessel + master-mobile order blocks |
| Error handling | No throws for malformed content: invalid timestamp → `[]`; lines without an escort context are skipped; unresolved amounts produce `amountBdt: null` for review; attendance/rate conflicts return `UNRESOLVED` + `reasons[]` rather than guessing |
| Tests | `tests/standalone/message-classifier.test.mjs`, `history-extraction.test.mjs`, `release-slip.test.mjs`, `business-workflows.mjs`, `test_parse_import_formats.py` |
| Last modified | 2026-11-06 |
| TODO/FIXME/HACK | none |

### C.6 Message forwarding (মেসেজ ফরওয়ার্ডিং)

| Aspect | Detail |
|---|---|
| Core files | `lib/message-router.ts` (1227 L), `lib/native-ingest.ts`, `lib/standalone/whatsapp.ts` (411 L), `lib/release-retry.ts` |
| Source → destination | Bridge SQLite/socket → `whatsapp_messages` (+ `whatsapp_chats`, `whatsapp_accounts`, `whatsapp_cursors`) → classifier → authorised chats only → `CASH` ⇒ `cash_submissions`/`cash_instructions` (REVIEW); `VESSEL` ⇒ `programs` (DRAFT) + `program_source_messages`; ambiguity/error ⇒ `review_items`; Admin confirmation ⇒ `applyConfirmation()` |
| Retry | Router claims `PENDING` + `FAILED` with `retry_count < 10` after 10-min backoff; increments `retry_count` and stores `last_error`. Release/food-bill evidence pass uses capped exponential backoff 1 → 2 → 4 … 30 min (`release-retry.ts`) |
| Failure handling | Crash-safe `processing_status`; every failure recorded in `markOutcome`; idempotent `ON CONFLICT DO NOTHING`; no auto-posting, no automatic outbound send |
| Last modified | 2026-11-06 |
| TODO/FIXME/HACK | none |

### C.7 WhatsApp AI agent (recruitment)

| Aspect | Detail |
|---|---|
| Image / version | `local/al-rifai-recruitment-ai:0.1.4` (running), container up 6 h; `package.json` says `0.1.0` (mismatch) |
| DRY_RUN | ✅ `DRY_RUN=1` |
| Gates | ✅ `SEND_ENABLED=0`, ✅ `ALLOW_SEND_STEP3=0`; DB `recruitment.mode = DRY_RUN` |
| API keys | 2 × OpenRouter `gpt-4o` **active/usable** (`apikey_1685ddbe…`, `apikey_d2b73290…`); 2 × Gemini **unusable** (`apikey_b490135f…` timeout, `apikey_e4fa9a8d…` HTTP 404); both cooled down, no retry storm |
| Model routing | Replies in logs served by both OpenRouter keys; Gemini keys served 0 |
| MCP socket | ✅ `/wa-02-control/mcp.sock` exists, `srw-rw---- 10003:10003`, readable by the root container |
| Consumer token | 🔴 `/run/secrets/wa02-consumer.token` **missing**; no token mount in `docker-compose.yml`; send path therefore unprovisioned (gates are off, so no impact today) |
| Audit log | PG `recruitment_reply_log`: 81 `DRY_RUN`, 202 `SKIPPED`; last write 2026-11-11 16:02 UTC. Local SQLite mirrors in `recruitment_replies` |
| Safety | No `tools/call`/`send_message` evidence in logs; WA-02 store mounted read-only |

---

## Section D — URL design & routing

### D.1 Inventory

| Kind | Count | Paths |
|---|---|---|
| API routes | 14 | `/api/assistant`, `/api/attendance`, `/api/auth/[...path]`, `/api/employees`, `/api/finance`, `/api/health`, `/api/media`, `/api/messages`, `/api/payroll`, `/api/programs`, `/api/reports`, `/api/review`, `/api/users`, `/api/whatsapp` |
| Pages | 36 | workspace routes listed in E.1 plus `/login` and `/` (redirects to `/dashboard`) |

All 14 API route files export at least one handler. ✅ No handler-less route.

### D.2 Duplicate / overlapping routes

| Route set | Component | Internal links | Verdict |
|---|---|---|---|
| `/vessel/register`, `/vessel/vessel-register`, `/vessel-register`, `/register` | same `VesselRegisterView` | **0 references** | 🔴 4 copies of one page (orphaned duplicates) |
| `/employee` vs `/employees` | alias directory vs workspace list | `/employee` is linked from `/employee/[phone]` back-links | 🟡 intentional legacy alias |
| `/submissions` vs `/cash/submissions` | same `CashSubmissionsView` | `/submissions` unlinked (only `/cash/submissions` linked) | 🟡 orphan alias |
| `/transactions` vs `/cash/transactions` | different views (`CashTransactionsView` vs `CashPaymentsView`) | both referenced | ✅ distinct pages |
| `/employee/[phone]` vs `/employees/[mobile]` | different detail pages | both referenced | 🟡 overlapping detail concepts |

### D.3 404 / naming

- Dynamic detail routes (`/cash/[id]`, `/review/[id]`, `/vessel/[id]`, `/employee/[phone]`, `/employees/[mobile]`, `/transactions/employee/[phone]`) all call `notFound()` on missing records ✅.
- **Naming is mixed:** path-style REST (`/api/employees`, `/api/programs`, `/api/payroll`) vs query-resource RPC (`/api/finance?resource=…`, `/api/review` + `body.action`, `/api/whatsapp` + `body.action`); camelCase query params (`employeeMobile`, `pageSize`, `programId`, `dutyType`) vs snake_case DB columns. Not a bug, but inconsistent.
- ⚠️ On a **clean HEAD build** (preview), `/cash/transactions` returns HTTP 500 and `/transactions` times out. The live production image may differ; flagged for backend follow-up.

---

## Section E — UI/UX & frontend

### E.1 Pages

`/dashboard`, `/insights`, `/assistant`, `/employees`, `/employee`, `/employee/[phone]`, `/employees/[mobile]`, `/vessel`, `/vessel/[id]`, `/vessel/drafts`, `/vessel/register`, `/vessel/vessel-register`, `/vessel-register`, `/register`, `/attendance`, `/cash`, `/cash/[id]`, `/cash/submissions`, `/cash/transactions`, `/cash/archive`, `/payroll`, `/review`, `/review/[id]`, `/messages`, `/conversations`, `/message-mirror`, `/reports`, `/settings`, `/archive`, `/submissions`, `/transactions`, `/transactions/employee/[phone]`, `/income-expenditure`, `/sources-review`, `/login` (35 + `/`).

### E.2 Responsive checks

| Check | Result |
|---|---|
| Viewport meta | ✅ Next emitted `width=device-width, initial-scale=1` already; explicit `viewport` export added in `app/layout.tsx` |
| CSS breakpoints | `standalone.css` 14 media queries, `globals.css` 13, `workspace.css` 5 |
| Root-cause found | Wide `<table>` min-content expanded the **layout viewport** (1075 px at a 375 px device), so every `max-width` media query was inert |
| Fix (committed) | Tables contained in scrollable cards; filters stack 1-column ≤768; fields/selects 100% ≥44 px; submit ≥48 px full-width; buttons/nav ≥44 px; 14 px type floor; drawer touch targets |
| Fix status | 🔴 **NOT DEPLOYED.** Commits `b6c0c7f` / `ca958f8` are local only; production image `v2.7.0-phase4e` (built 05:52) has **0** `max-width: 768px` rules in its CSS |
| Audit results (fixed preview, 27 routes × 320/375/414/768) | 0 page overflow, 0 unwrapped tables, min control 44 px |
| Device filter test (iPhone SE / 14 / Pixel 7) | 42 filter submissions, 0 failures; drawer opens with overlay |
| Typography | 0 visible app text <14 px on audited mobile pages |

### E.3 Data-filter components (the highest-priority surface)

| Page / component | Filter fields | Mobile state (committed fix) |
|---|---|---|
| `/employees`, `/employee` | q, status | ✅ stacked, ≥44 px |
| `/vessel` | q, state | ✅ stacked |
| `/attendance` | from, to, employee | ✅ stacked |
| `/cash` | q, state, ledger from/to | ✅ stacked, dates full-width |
| `/cash/transactions` (`cash-payments-view`) | date/from/to, employee, source, q | ✅ (page returns 500 on HEAD) |
| `/cash/archive`, `/transactions` (`cash-transactions-view`) | q, state, range | ✅ |
| `/review`, `/sources-review` (`review-filters`) | state, domain, category, q, mine | ✅ checkbox label 44 px |
| `/payroll` | month | ✅ month input full-width |
| `/messages` | q, direction | ✅ `form.row` wraps, 44 px |
| `/message-mirror` | search | ✅ |
| `/conversations` | q/state | ✅ |
| `/income-expenditure` | from/to | ✅ |
| `/vessel-register` (all 4 aliases) | q, state | ✅ scroll-safe card |

---

## Section F — Documentation

| Project / doc | State | Flag |
|---|---|---|
| `/opt/al-rifai-platform/README.md` | last 2026-11-07; code changed 2026-11-11 | 🟡 STALE |
| `/opt/al-rifai-platform/docs/*.md` (16 files) | 2026-11-06 → 2026-11-07 | 🟡 STALE vs 11-11 commits |
| Deployment docs | `PHASE3_CUTOVER_RUNBOOK.md`, `PHASE3_DEPLOYMENT_LOG.md`, `PHASE3_VPS_RELEASE_CHECKLIST.md`, `PHASE3_ROLLBACK_INSTRUCTIONS.md` | ✅ CURRENT (11-08 in activation worktree) |
| API documentation | none dedicated (only `docs/PROJECT_KNOWLEDGE.md`, `docs/PHASE3_AI_ASSISTANT.md`) | 🔴 MISSING |
| CHANGELOG | none in any project | 🔴 MISSING |
| `.env.example` (platform) | 71 keys vs 69 real keys; 12 example-only, 10 real-only | 🟡 DRIFT |
| `.env.example` (recruitment-ai) | 25 vs 25, exact match | ✅ CURRENT |
| `.env.example` (`/opt/vps/apps/al-rifai`, WhatsApp source) | present | ✅ |
| `/opt/vps/README.md` + 12 docs | last 2026-11-04, same as code | ✅ CURRENT |
| `/opt/al-rifai-recruitment-ai/README.md` | 2026-11-11, but **claims two valid Gemini keys/model `gemini-flash-latest`**; live DB has 2 OpenRouter `gpt-4o` working and 2 Gemini keys failing (timeout/404) | 🔴 INACCURATE |
| Secrets in git | none; only `.env.example` tracked in all three repos | ✅ |

---

## Section G — Docker & infrastructure

### G.1 Containers

| Name | Image | Status | Ports |
|---|---|---|---|
| `al-rifai-phase3-app-1` | `local/al-rifai-platform:v2.7.0-phase4e` | Up 11 h (healthy) | `127.0.0.1:3001→3000`, `0.0.0.0:443→3443` |
| `al-rifai-phase3-sync-1` | `local/al-rifai-platform:cash-final-eb70d91` | Up 2 days | internal |
| `al-rifai-recruitment-ai` | `local/al-rifai-recruitment-ai:0.1.4` | Up 6 h | none |
| `alrifai-ui-check` | `local/al-rifai-platform:phase3-ai-rc-675a3ef` | Up 4 days | `127.0.0.1:3007→3000` |
| `vps-whatsapp-wa-01-cap4-20261011` | `sha256:28a646d2…` | Up 9 days | none |
| `vps-whatsapp-wa-02-cap4-20261011` | `local/vps-whatsapp:20261020-ingestion` | Up 11 days | none |
| `vps-infra-postgres-1` | `postgres:16-alpine` | Up 11 days (healthy) | internal 5432 |

🔴 **Version skew:** `app` runs `v2.7.0-phase4e` while `sync` runs `cash-final-eb70d91` (2026-11-09) from the same compose file.
🔴 **Tag drift:** `/opt/vps/al-rifai-standalone/apps/al-rifai/.env` sets `ALRIFAI_TAG=cash-final-eb70d91`; the next `docker compose up -d` would **roll the app back** to the 11-09 image.
🟡 `alrifai-ui-check` is unmanaged (no compose labels) and runs a 4-day-old RC image.

### G.2 Compose files

| Location | Purpose |
|---|---|
| `/opt/al-rifai-platform/compose.yaml` + `compose.phase3.yaml` | live platform (app + sync) |
| `/opt/al-rifai-recruitment-ai/docker-compose.yml` | recruitment worker |
| `/opt/vps/infra/compose.yaml` | PostgreSQL |
| `/opt/vps/services/whatsapp/compose.yaml` | WA-01 / WA-02 bridges |
| `/opt/vps/apps/al-rifai/compose.yaml` | mirror app |
| Worktree copies in `/opt/al-rifai-phase3-{activation,cash,docs,integration,release,test}/` | 12 duplicate compose files (not running) |

### G.3 Storage / reclaimable

| Resource | Value |
|---|---|
| Images | 137 total, 8 active, 19.09 GB, **13.67 GB reclaimable (71%)** |
| Dangling images | **15**, ~1.72 GB each (≈25.8 GB logical) |
| Local volumes | 17 total, **all 17 dangling**, 4.931 GB (100%) |
| Build cache | 64 GB total, 5.08 GB reclaimable |
| Containers | 8, 72.5 MB |
| Disk `/` (includes `/var/lib/docker`) | 194 GB, **117 GB used, 78 GB free, 61%** |

---

## Action Required (priority order)

### P0 — correctness / data safety

1. **Fix or park the build-breaking uncommitted `lib/standalone/finance.ts`** — add `source_block_key` to the row type and define/import `now()`; `pnpm typecheck && pnpm build` currently fails, so no new image can be produced from this worktree.
2. **Resolve migration drift before any deploy/migrate.** Copy `012`–`026` into the tracked `db/standalone/` of `main` (or make the activation branch canonical), and reconcile the untracked `011` copy (checksum `9dabe5e7…`) with the applied ledger (`4203fdbe…`). Do not run `db:migrate` from `main` until then.
3. **Keep all WhatsApp gates off** until the WA-02 consumer token and mount exist: `DRY_RUN=1`, `SEND_ENABLED=0`, `ALLOW_SEND_STEP3=0` are currently correct; `/run/secrets/wa02-consumer.token` is still missing.

### P1 — deployment integrity

4. **Fix `ALRIFAI_TAG`**: set it to the image actually intended for production (`v2.7.0-phase4e`) or recreate both `app` and `sync` from the same tag; today a compose restart silently downgrades `app`.
5. **Deploy the mobile fix** (`local/al-rifai-platform:mobile-after`, ID `5946c49a4418`) and re-run the 375 px verification; live CSS currently has none of the responsive rules.
6. **Push/reconcile `main`**: 2 local commits are unpushed and the branch is 66 behind `origin/main`; decide whether to merge/rebase or abandon the divergence.
7. **Clean `/opt/vps`**: 16 modified files + 706 untracked files; commit or remove, and set an upstream for `target01-vessel-fragment-merge`.
8. **Retire `alrifai-ui-check`** (unmanaged, stale RC image, port 3007).

### P2 — hygiene / documentation

9. **Reclaim disk**: `docker image prune` (≈13.7 GB), `docker volume prune` (4.9 GB), `docker builder prune` (≈5 GB) — after confirming no rollback image/volume is needed.
10. **Drop or archive the 12+ test/restore PostgreSQL databases**; keep `alrifai_v2_phase3` and the named rollback copy.
11. **Consolidate duplicate vessel-register routes** (`/register`, `/vessel-register`, `/vessel/register`, `/vessel/vessel-register`) into redirects to one canonical path.
12. **Fix documentation drift**: update platform `README.md`/`docs` after the 11-11 UI change, add API docs and a CHANGELOG, reconcile `.env.example` with the real 69-key env, and correct the recruitment README's key/model claim.
13. **Investigate `/cash/transactions` 500 and `/transactions` timeout** on HEAD (backend/schema), then re-test the cash filter there.
14. **Gemini keys** remain broken (timeout + 404). No action requested; OpenRouter primary path is serving all replies.

---

*Audit artefacts: raw SQL/schema dumps and route inventories were read directly; no state was written except this report.*
