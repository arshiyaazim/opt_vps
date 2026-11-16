> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# AL-RIFA’I — Phase 2A Gap Analysis

Date: 8 October 2026, Asia/Dhaka. Mode: read-only audit and planning. Status: **PHASE_2A_PARTIAL_EVIDENCE**. The investigation and three planning deliverables are complete for accessible supplied evidence; interactive browser acceptance, original-source reconstruction and office policy qualification remain unproven. This status does not retract the completed Phase 1 baseline.

No Phase 2 implementation is authorized by this report. All future recommendations are proposals requiring the administrator's explicit Phase 2 approval.

## 1. Scope, method and evidence quality

Mandatory documents were inspected in requested order before application inspection: `/opt/vps/docs/VPS_MAP.md`, `docs/PHASE1_REPORT.md`, requested inventory path, `compose.yaml`, `package.json`, current README, upstream README/operations/conversation/provenance documents and migrations. The requested `/opt/vps/apps/al-rifai/phase1-file-changes.json` is absent; the authoritative inventory was discovered and read at `/opt/vps/apps/al-rifai/docs/phase1-file-changes.json`. No separate migration manual was found: current README, Phase 1 report, SQL files and `scripts/database.mjs` provide migration documentation. No project/VPS AGENTS.md, separate IN/OUT note, administrator manual or change-control procedure was found in inspected project/ancestor/docs/agent locations; dependency-local AGENTS.md files are not project policy. Upstream `docs/v10/README-OPERATIONS.md` contains next-agent guidance; its Sites deployment/Core instructions are historical and cannot override this read-only VPS scope. No maps or instruction files were created.

No equivalent Phase 2 reports were found among existing documentation filenames/content before exclusive creation of these reports. Historical staging path exists. Its SOURCE-MANIFEST verifies 183 files with zero byte-size/hash mismatches. Common v10/canonical files were compared byte-for-byte: business/query modules and most current view components are retained; authentication, source loading, database adapters and runtime boundaries changed.

Evidence classes used below:

- **S**: source/static inspection this session. Exact file and symbol references are listed in section 2. A source path alone never establishes operational success.
- **DB**: live SELECT-only PostgreSQL metadata/counts inside `BEGIN READ ONLY`, plus SELECT-only application-role verification. No user records printed.
- **HTTP**: authenticated local GET/SSR checks this session, printing statuses/counts/flags only. No writes, assistant POSTs or external endpoints invoked.
- **T1**: prior automated test/build results recorded by PHASE1_REPORT.md; inspected test sources corroborate scope, but tests/builds were not rerun here.
- **T10**: upstream test sources/documented results; no current live v10 environment or D1 backup available, so v10 runtime success is not newly verified.
- **BR**: actual interactive browser evidence: unavailable, not claimed.
- **REQ**: user-provided target workflow; proposal, not existing behavior or approved office policy.

Classifications: A working and verified within stated evidence scope; B implemented but not verified; C partial; D frontend-only/placeholder; E historical/read-only; F missing; G retired/intentionally disabled. An E reader can have A-level HTTP proof without becoming an active operational feature.

No test suites executed. `tests/database.mjs` creates a schema and inserts records even though rolled back, so it was explicitly not run. Import/parser entrypoints write offline files and were not run. A read-only verifier invocation failed because the standalone runtime omits `scripts/verify-state.mjs`; a narrowly scoped inline SELECT-only check subsequently verified snapshots and runtime session defaults. No copying or runtime edits were used to resolve this.

## 2. Exact evidence reference directory

All relative paths in this report resolve under **C = `/opt/vps/apps/al-rifai`** unless V is explicit. **V = `/opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source`**. Symbols give stable evidence anchors without dependence on generated file line numbers.

| Ref | Exact evidence |
|---|---|
| E01 | `/opt/vps/docs/VPS_MAP.md`; C/docs/PHASE1_REPORT.md; C/docs/phase1-file-changes.json; C/README.md |
| E02 | C/compose.yaml; C/Dockerfile; C/package.json; C/db/postgres.mjs:createPool; C/db/raw.ts:pool/database; C/db/index.ts:getDb |
| E03 | C/db/schema.ts; C/db/migrations/0000_gorgeous_the_executioner.sql through 0005_snapshot_immutability.sql; C/scripts/database.mjs:migrate/importEvidence/verifyEvidence |
| E04 | C/app/page.tsx:Home; C/app/register/page.tsx:Page; C/app/vessel-dashboard.tsx:VesselDashboard; C/app/api/register/route.ts:GET |
| E05 | C/lib/vessel-source.ts:historicalSnapshot/historicalRecord/liveSnapshot/coreRecord; C/lib/vessel-data.ts:queryFilters/filterRows/summarize/options |
| E06 | C/lib/programs.ts:validateProgram/parseDate/parseImport/candidates/filterPrograms/exportCsv; C/lib/register.ts:csv/vesselDirectory/historicalRows/qualityIssues |
| E07 | C/app/accounts-panel.tsx:AccountsPanel/AccountMessages; C/app/api/operations/route.ts:GET/POST/writer; C/lib/cash-source.ts:loadCashSnapshot; C/lib/cash-data.ts:filterCash/cashSummary/cashDaily/employeeStatements |
| E08 | C/lib/operations.ts:validateDraft/calculateSettlement; C/app/operations.tsx:Operations; C/app/tracker.tsx:Tracker; C/app/register-views.tsx:ReleaseView/ProgramDetails/SourceDialog |
| E09 | C/app/program-tools.tsx:ProgramTools; C/app/api/program-tools/route.ts:GET/denied; C/lib/program-workflows.ts:releaseState/buildProgramMessage/messageSchema/motherNameCandidates |
| E10 | C/app/import-review.tsx:ImportReview; C/app/api/import-audit/route.ts:GET; C/lib/conversation-snapshot.ts:ensureConversationSnapshot/importedRows/importedPrograms/importedMessages |
| E11 | C/lib/accounts-snapshot.ts:accountsMessages/ensureAccountsSnapshot/accountsCash/accountsReviews; C/lib/evidence.ts:loadEvidence/lazyEvidence; C/docs/evidence-checksums.json |
| E12 | C/app/conversations/page.tsx; C/app/conversations/inspector.tsx; C/app/historical-conversations.tsx; C/app/api/conversations/route.ts:GET; C/lib/conversation-read.ts:conversationConnection/readConversation; C/data/conversation-policy.json |
| E13 | C/app/assistant-popup.tsx; C/app/api/assistant/route.ts:POST; C/lib/register-assistant.ts:localPlan/answerPlan/planSchema/mutationRequest; C/lib/operations-assistant.ts:cashAnswer/workflowAnswer; C/lib/popup-position.ts |
| E14 | C/proxy.ts:proxy; C/app/chatgpt-auth.ts:getChatGPTUser/requireChatGPTUser; C/lib/validation-auth.mjs:validationIdentity/verifyAuthorization; C/lib/private-origin.ts:privateSameOrigin; C/lib/integrations.ts:integrationConfig |
| E15 | C/app/api/vessels/route.ts:GET; C/app/api/core/route.ts:GET; C/app/api/health/route.ts:GET |
| E16 | C/tests/workflows.mjs; C/tests/source-register.mjs; C/tests/phase1-unit.mjs; C/tests/phase1-http.mjs; C/tests/database.mjs; C/tests/test_accounts_import.py; C/tests/test_updated_conversations.py; C/tests/test_cash_archive.py; C/tests/legacy-source/{api,operations,conversations}.mjs |
| E17 | C/scripts/ingest_chats.py; C/scripts/update_conversations.py:reconcile/main; C/scripts/update_accounts.py:parse_message/reconcile_duplicates/main; C/scripts/operations/import_sources.py:parse_line/extract; C/docs/v10/{START-HERE-BN,README-OPERATIONS,CONVERSATIONS,README}.md; V/SOURCE-MANIFEST.json |
| E18 | `/var/lib/vps/al-rifai/evidence/{conversation-snapshot,accounts-snapshot,chat-archive,operations,recovered-programs}.json`; `/var/lib/vps/al-rifai/evidence/seed-source.ts` — checksum/topology checks only; private content omitted |
| E19 | Session DB checks: information_schema.columns; pg_constraint; pg_indexes; pg_trigger; pg_tables; pg_database; pg_roles; has_table_privilege; nine aggregate counts; migration id/hash SELECT; application-role READ ONLY exact snapshot comparison |
| E20 | Session local HTTP GET checks described in section 3; docker ps read-only container health/bindings |

For v10 inventory, corresponding V/app, V/lib, V/db/schema.ts and V/drizzle/0000–0004 SQL were compared with the canonical locations above; v10 docs are preserved under C/docs/v10. Provenance copies are not active implementation duplicates.

## 3. Current architecture and observed baseline

One private Next.js 16.3.4 / React 19.2.6 App Router application, packageManager pnpm 11.25.0. Runtime Node 22.23.3 was observed. PostgreSQL is the existing vps-infra-owned deployment, database alrifai, application role alrifai_app, shared external network vps-backend. Drizzle describes schema; raw pg readers are also used, sharing one pool. There is no application PostgreSQL service. Docker runtime is non-root, read-only rootfs, read-only evidence/credential mounts, bounded logging, temporary /tmp, dropped capabilities. Loopback app publication was directly observed; postgres has no published host port. Both existing containers reported healthy.

Live metadata confirms eight application tables plus ledger, six migration hashes matching on-disk files, all seven operational tables empty, 54 snapshot rows/markers. All 54 snapshot fields/payload strings match expected original chunks/markers exactly. Six external evidence artifacts match the checksum manifest, including the four historical JSON files and separately recovered seed artifacts. Empty operational tables are intentional; historical information comes from immutable snapshots/external files and projections.

| Current check | Observation | Meaning/limit |
|---|---|---|
| GET /api/health | 200 | database readiness only |
| GET /, /register, /conversations | 200 | authenticated SSR routes respond; no browser interaction proof |
| GET /api/register | 200; total 646; Core/AI configured=false | current historical projection, not 646 verified current voyages |
| GET /api/operations?source=chat | 200; 7,038; canWrite=false | identity-qualified historical payment instructions, not payments |
| GET /api/operations?source=review | 200; 4,607 | legacy extraction, unverified |
| GET /api/operations?source=excel | 200; 1,024 | Excel-derived archive, unverified |
| GET /api/program-tools | 200; 646; canCorrect=false | read-only release classification, not completion authorization |
| GET /api/import-audit | 200; total=0 | summary view intentionally has no paginated result rows; not absent sources |
| GET /api/conversations?mode=historical | 200; 16,654; read_only=true | one sensitive envelope excluded from display; source preservation separate |
| GET /api/conversations?mode=policy | 200; configured=false | offline policy, no live conversation engine |
| GET /api/register?source=live | 503 | deliberate fail-closed live boundary |
| Spoofed identity headers on /api/register | 401 | Sites/middleware spoof does not authenticate |

All operational mutation exports statically return 405 (E04/E07/E09/E10/E12/E15). Phase 1 HTTP tests previously verified this; Phase 2A did not issue mutation requests. The deterministic assistant is implemented and previously HTTP-tested, but this session did not invoke POST. Its externally calling branch is unreachable under the frozen empty integration configuration.

## 4. v10 and canonical feature inventory

| Capability | v10 classification and evidence | Phase 1 classification and proof |
|---|---|---|
| Home/register navigation | E, same VesselDashboard on both paths; V/app/{page,register/page}.tsx | E/A reader, same aliases, HTTP 200 |
| Register search/filter/sort/page/detail/deep links | E; V/app/vessel-dashboard.tsx and V/lib/vessel-data.ts; T10 | E/A GET listing; UI interactions B; E04/E05 |
| Insights/status/shift/destination counts | E; all matching loaded rows; source name counts | E; same summarization; actual charts B without BR |
| CSV register/accounts export | B/E; UI handlers and formula escaping; no operational writes | B/E; server export mode exists, browser download not exercised |
| Program validation, CSV/TSV/message parsing | B pure utilities with T10 tests; not registration API | B reusable primitives; T1 tests, write path G |
| Legacy Tracker/edit/import/duplicate dialogs | D/G current reachable app does not import Tracker; old payload contract | D/G retained, not routed; should not reactivate wholesale |
| Accounts source filters, employee statements and transaction source modals | E; source-specific historical projections | E/A GET counts; UI detail/filter interaction B |
| Cash received/paid/balance | F active accounting; historical amounts exist E | F active ledger; aggregation is not reconciled balance |
| Payment drafts/settlement calculator | C/D; dormant Operations forms, pure math, writer=false | C/D; empty draft tables, unreachable component, POST 405 |
| Accountant messages/review/exclusion | E; separate from qualified transactions | E/A reader endpoint; durable review actions F/G |
| Bill descriptions | E; archive extraction and bills GET | E; 23 historical bill objects, no invoice issue workflow |
| Completion tracking | E/C releaseState classifier, fields/source uncertainty | E/A program-tools read; operational completion F |
| Assignment/release message form | D local validate/preview/copy, no save/send | D/B frontend with inherited utility tests; not assignment/release entry |
| Vessel spelling suggestions | E/C candidates, no authoritative IMO or merge | E/C read-only comparison; verified correction F/G |
| Source audit, messages, conflicts, duplicate evidence | E; original source metadata and read-time D1 snapshot persistence | E/A explicit pre-imported PG reads, no GET bootstrap |
| Historical conversations | E snapshots available through import review; separate inspector primarily live policy | E/A added dedicated historical viewer in inspector |
| Live conversation inspector | B/G scaffold requiring verified Core config, never established live | G hard-disabled connection, offline policy retained |
| Register/accounts assistant | B/E deterministic reads, optional model parser B/unverified | B/E deterministic branch T1; model integration G |
| Auth/audience | B platform-dependent trusted Sites edge headers, no VPS identity | A private Basic validation checks; real users/RBAC F |
| Employee records/documents/verification | F; statement labels do not create personnel entities | F |
| Attendance/assignment history/duty approval | F; program date/shift text is not attendance | F |
| Payroll/release slips/approval/posting/reversal | F; draft math and release text not end-to-end implementation | F |
| Client records/user administration | F; parsers intentionally exclude client fields | F |
| Original source importers | B offline scripts, deterministic reconstruction requires originals/proof | B offline-only adapted guards; no import executed |
| Reports | E summaries/CSV; operational reconciliation/payroll/client reports F | E summaries retained; active reports F |
| Core/OpenAI/WhatsApp send | B/G external read/model scaffolds; send F | G; no live integration, bridge, provider or send |
| Deployment/auth adapters | D1/Vinext/Sites framework, not compatible VPS production | A private Next/PG runtime; old scaffolding G/retired |

## 5. PostgreSQL schema assessment

Live schema matches Drizzle and six SQL migrations. Unless noted, columns are non-null text; all tables have text `id` PK. Only `programs.duplicateOf` is nullable. No foreign keys, domain CHECK constraints, secondary indexes or non-PK unique constraints exist. Nine PK btree indexes are the entire observed index inventory.

| Entity | Columns/types/defaults beyond id | Assessment and reuse boundary |
|---|---|---|
| programs | motherVessel, lighterVessel, masterMobile, destination, escortName, escortMobile, startDate, endDate, shift, notes default empty; status default Recorded; source default Manual entry; duplicateOf nullable; createdAt text; revision integer default 0; details text default '{}' | Reuse active program identity/base fields after extension. No client/reference uniqueness, assignment relationship, assignment date, employee FK, duty rows, end shift/release evidence constraints. Current reader merges with historical evidence; must separate active list before enabling writes. |
| reviews | aId, bId, decision; note default empty; createdAt | Reuse pair-review purpose after adding accountable actor/version/scope. aId/bId are not FKs and may refer to evidence IDs; do not impose programs-only FKs blindly. |
| datasets | importedAt | Reuse import-batch marker if meaningful; no hash/provenance/approval metadata. Not automatically related to snapshot datasetId. |
| site_cash_archive | date, source, employeePhone, name, method, details; amountCents integer | Historical archive only; lacks direction, account, status, receipt, reversal, approval, stable employee relation. Do not turn into active cash ledger. |
| site_operation_notes | status, note, actor, updatedAt | Reuse review annotation current state; overwrites cannot provide append-only audit history. No entity scope/FK/version. |
| site_payment_drafts | details, actor, createdAt | Reuse draft container with typed status/references/revision/idempotency; cannot establish posted payment from JSON alone. |
| site_settlement_drafts | details, actor, createdAt | Reuse draft container with approved inputs, rule version, links, revision and approval state; posted settlement/allocation needs constraints. |
| site_source_snapshots | datasetId, kind, payload, contentHash | Immutable evidence boundary; keep payload bytes/IDs/hashes/markers unchanged. datasetId/kind queries currently have no secondary index. No active operations here. |
| alrifai_schema_migrations | sha256 text; applied_at timestamptz default now() | Explicit transactional runner with file-hash conflict rejection; do not edit existing migrations. |

Migration roles: 0000 programs/reviews/datasets; 0001 programs.details; 0002 archive/notes/payment drafts; 0003 settlement drafts; 0004 evidence snapshots; 0005 immutable update/delete and truncate rejection. Drizzle alone does not express all trigger/ledger behavior; SQL and runner remain authoritative too.

JSON is text, validated/parsing mostly in application code, not PostgreSQL. Several read paths JSON.parse without per-record domain schemas; malformed JSON can fail a whole request. Snapshot import checks evidence file SHA-256 and expected fields and uses insert-only conflict comparison. Manifest marker contentHash is a chunk count, not a cryptographic digest; retain this legacy representation and distinguish it from payload hashes. Read marker checks verify completion counts, not every stored payload hash on each request; exact payload verification was performed separately this session.

Revision is a stored integer only: no trigger increments it, no live optimistic edit endpoint exists. Program validation allows sparse historical data and cannot serve as a fully verified duty-start validator. Text dates have no DB calendar/order enforcement. Generic accepted phones in validateProgram differ from strict Bangladesh employee/payout validation. No active audit event journal or accountable multi-user history exists.

Queries: programs ordered by text startDate/id; historical overlay/fallback uses recovered seed if stored rows absent; snapshot SELECT by datasetId/kind; cash archive details loaded and same-ID overlaid; notes/drafts read from tables. Filtering/aggregation mostly occurs in memory after complete loads. Safe at observed size, but operational indexes/pagination should follow approved access patterns, not speculative redesign.

Transactions: explicit migration/import runner uses one client/transaction plus advisory locks, ledger checksum checking and insert-only snapshot conflict checks. Runtime reader has no business-write transaction path. Financial exactly-once posting/reconciliation is absent. Application-role session default read-only was observed, but role owns database and all nine tables, with INSERT/UPDATE/TRUNCATE privileges. This is a deployment guard, not independently enforced read-only authorization: owner could change settings or triggers. Existing snapshot triggers correctly reject normal mutations; do not attempt destructive proof here. Future dedicated runtime read/write scope and migration ownership require approved privilege design.

## 6. Frontend/backend fit and validation gaps

The reachable workspace is VesselDashboard at `/` and `/register`, with register, insights, accounts, workflow and sources tabs; `/conversations` is separate. No employee, attendance, operational release, user/client administration or finance-posting page exists. Avoid a second generic dashboard.

| Target page/task | Existing component/route | API/entity dependency | Recommendation, missing validation and permission |
|---|---|---|---|
| Employee list/search/profile/registration | AccountsPanel employee statements at workspace accounts tab | /api/operations?view=employees; evidence CashRow groups | Add personnel form/list/profile inside existing shell; statements stay historical. Stable employee ID, contact verification, category/date/status/document controls; Office create, Admin verify, sensitive finance separate. |
| Program registration/search | VesselDashboard register tab; dormant Tracker forms | /api/register historical reader; programs + snapshots | Reuse filters/details/styles; add explicit active mode/API after schema extension. Required operational reference/client, actor, dates, program status guards. Legacy parser intentionally discards client—cannot roundtrip new fields. |
| Assignment/replacement/unassigned queue | ProgramTools preview form | /api/program-tools; evidence classifier, not assignment storage | Adapt message form fields into assignment editor with stable employee relation/history and conflict checks; Operations create, authorized cancellation/replacement. |
| Calendar/vessel attendance | No entry UI | no attendance API/entity | New focused attendance panel; distinct contexts, shift/date rules, overlap checks, correction approval. |
| Release slip | ProgramTools completion/message; dormant ReleaseView archive list | /api/program-tools and snapshots; no operational slip entity | Reuse evidence/source display; new slip entry/verification incl. conveyance/food/payable/document. Nullable program match for historical candidates; verification gate before finance. |
| Cash/payment/settlement | AccountsPanel historical reader; dormant Operations forms | /api/operations; archive + empty draft tables | Reuse source modals/filters and selected form parts; add typed draft approval/posting/allocation. Account/direction, receipt, idempotency, amount bounds, concurrent approval checks. |
| Historical review/import preview | ImportReview sources tab; historical-conversations | /api/import-audit, /api/conversations; snapshots | Retain reader; add separately approved versioned review decisions and preview-to-promotion pipeline. Never rewrite snapshot payloads. |
| Reports/invoices | insights and CSV; Operations bills archive | aggregate evidence; 23 bill objects | Reuse export utility; add approved operational reports/invoice templates after reliable ledger. Accountant/Admin access; source labels never become confirmed totals. |
| Users/roles | none; UI says owner-only | Basic validator via proxy/helpers | Admin-only management after identity decision; no self-service Employee/Client exposure until scoped ownership rules exist. |

Concrete source findings to address during authorized work:

1. `VesselDashboard` register table has a header for end date/end shift/release point but row markup omits that cell; status/actions are shifted beneath headers. Source-verified UI defect; browser appearance not verified.
2. The same sidebar links `/signout-with-chatgpt?return_to=%2F`, but no corresponding current route exists; Basic auth has no selected session/logout mechanism. “Owner access only” is stale product wording for one shared validator credential, not a verified role restriction.
3. Sources/filters dates/page parameters are inconsistently bounded across APIs. Import-audit message dates are compared as strings without common strict date validation; some endpoints use Number(page) without flooring/capping; arbitrary view values at operations can fall through to cash. Central request schemas needed before write paths.
4. `validateProgram` recognizes historical statuses but not target pending/unassigned/assigned lifecycle. Its `detailKeys` excludes endShift/releaseConfirmed, while readers require them; client/reference/slip fields are deliberately excluded by legacy import parsing/tests. Add a distinct operational schema without changing historical parser expectations.
5. `calculateSettlement` deducts a fixed food amount per day, uses half-day increments, and identifies employee by phone. `buildProgramMessage` accepts an explicit food rate. These are different responsibilities, but no approved common payroll policy governs them. Do not promote the fixed value or float math as business policy.
6. Inactive Operations has fixed historical dates, missing active route imports and a legacy `/api/core` financial payload expectation; the current Core API returns configuration flags only. Inactive Tracker expects RegisterState/old mutation contracts rather than current paginated reader. Existing component names do not establish compatibility.
7. No verified document storage, content type/size controls, malware handling, download authorization or retention policy exists for personnel/release evidence.

## 7. Feature-by-feature required gap matrix

Status letters below describe actual scope; A is always evidence-qualified. DB support is current, not proposed. Dependencies refer to gap IDs and decision IDs in PHASE2A_DECISIONS_REQUIRED.md.

| ID | Domain | Requirement | v10 status | Phase 1 status | Database support | Frontend support | Backend/API support | Evidence | Gap | Recommendation | Priority | Dependency | Approval |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G01 | Identity | Accountable users and authorization | B platform auth | A private Basic; F RBAC | no users/roles | temporary shared identity | proxy/read checks only | E14 S; E20 HTTP | no actor-specific write authority | add private identity/RBAC before writes | P0 | D01,D02 | identity and permission policy |
| G02 | Integrity | Write isolation/audit/concurrency | C read-only boundary | C owner role/default RO | revision only; no journal | none | no controlled writer | E02,E03,E19 DB | owner privileges, no append-only actions | scoped writer and audit service | P0 | G01,D02,D11 | privilege/change-control approval |
| G03 | Employee | Registration/identification/verification | F | F | none | historical statements only | none | E03,E07 S | no stable personnel entity | add shared employee model | P0 | G01,D03 | ID/verification rules |
| G04 | Employee | Categories/status/joining date | F | F | none | none | none | E03,E06 S | no employment model | add category lookup/effective history | P0 | G03,D03,D04 | category/employment policies |
| G05 | Employee | Documents/profile/history | F | F | no document/assignment/attendance/payment links | no personnel profile | none | E07,E08 S | missing profile relationships/storage | add focused profile/document metadata | P1 | G03,G09,G13,G20,D09 | storage/privacy policy |
| G06 | Client | Client identification/records | F intentional parser exclusion | F | no client FK | no client form | legacy excludes client | E06,E16 S | cannot register approved client consistently | add client lookup, extend programs | P1 | G01,D05 | required client fields/access |
| G07 | Program | Register operational vessel program/reference | C validators; E reader | E/A reader; F create | programs reusable partial | register reader; dormant form | POST 405 | E03–E06,E20 | no client/reference/actor lifecycle | extend programs, adapt shell/form | P0 | G01–G04,D05 | numbering and field requirements |
| G08 | Program | Separate active and historical records | E historical overlay | E/A projection | programs merged on reads | source switch historical/live | historicalSnapshot overlay/fallback | E05 S | future active rows may mix with evidence | distinct active query/state; evidence link only | P0 | G07,D10,D12 | source of truth/promotions |
| G09 | Assignment | Escort/security assignment/history | D message preview | D preview; F persistence | names/phones only | preview fields reusable | no assign API | E03,E09 S | no employee/program assignment relation | add assignments and versioned transitions | P0 | G03,G07,D04,D06 | multiple/overlapping duties |
| G10 | Program | Cancellation/replacement/unassigned/release status | E labels only | E classifier; F transitions | free text status/revision | readonly labels/tools | writes 405 | E06,E09 | no authorized state machine/history | add guarded transition service | P0 | G02,G09,D06 | cancellation/replacement authority |
| G11 | Program | Assignment date/duty start/master contact | C text fields | C historical fields | start date/master text; no assignment time | no active entry | loose parser | E03,E06 | assignment vs duty dates unseparated | extend typed fields and stage validation | P0 | G07,G09,D06 | required duty data |
| G12 | Attendance | Daily office attendance | F | F | none | none | none | E03 S | no calendar attendance model | add distinct attendance context | P1 | G03,D07 | leave/absence/corrections rules |
| G13 | Duty | Vessel attendance/shifts/duty totals | F dates not attendance | F | none | none | no duty calculation from attendance | E03,E08,E09 | no program-linked approved duty entries | add duty entries and versioned calculation | P0 | G09,D07,D08 | shifts/boundaries/duty units |
| G14 | Attendance | Corrections/approval/audit | F | F | no immutable corrections | none | none | E03,E14 | changes cannot be attributed/approved | correction requests and decision journal | P0 | G02,G13,D02,D07 | approver/reopening policy |
| G15 | Release | Operational completion/slip verification | E/C classifier | E/A read; F actual slip | no release slip entity | preview not entry | no completion mutation | E09,E20 | missing signer/document/duty verification | add release record and guarded completion | P0 | G13,G14,D06,D09 | completion requirements |
| G16 | Release | Unmatched/uncertain historical slips | E source records | E manual review | immutable payloads; no typed match decisions | source/review available | read only | E10,E17,E18 | slip may lack vessel/program match | preview candidate, nullable link, manual approval | P1 | G15,G24,D10 | promotion/matching thresholds |
| G17 | Payroll | Salary/conveyance/food/net payable | C draft calculator | C dormant calculator | JSON settlement drafts only | inactive form/local preview | pure utility, no approved payroll | E08,E09 | fixed food deduction, no rule version/rate policy | modify reusable math behind approved rules | P0 | G13,G15,D08 | pay/rate/rounding/adjustments |
| G18 | Finance | Payment/settlement drafts | C tables/forms | C empty tables; G writes | reuse two draft tables | historical accounts active; forms dormant | read GET only | E03,E07,E08 | no typed links/status/revision | extend existing drafts, adapt forms | P0 | G02,G17,D08 | draft requirements |
| G19 | Finance | Payment approval vs execution | F | F | no approvals/posting/receipts | none | none | E07,E14 | instruction/draft could be mistaken as paid | distinct approval/posting states/evidence | P0 | G01,G18,D02,D11 | who approves/payout proof |
| G20 | Cash | Daily received/paid/employee advances/program costs | E archive | E/A reader; F active | archive unsuitable | historical source modals/filters | no posted ledger | E03,E07,E20 | no direction/account/references | add active transactions, optional program FK | P0 | G19,D11 | accounts/opening balance/entry rules |
| G21 | Cash | Balance/corrections/reversals | F | F | no posting/reversal constraints | historical amount totals only | aggregate instructions not cash balance | E03,E07 | no reconciled balance or adjustment chain | atomic posting/reversal plus controlled opening entry | P0 | G20,D11 | reversal/negative balance/backdating |
| G22 | Settlement | Advance allocation/settlement/reconciliation | C draft math | C draft only | no allocations/posted settlement | dormant calculator | no atomic settlement | E08 | double subtraction/payment risk | constrained allocations to posted transactions | P0 | G18–G21,D08,D11 | recovery/refund/partial settlement |
| G23 | History | Search/source attribution/duplicate review | E | E/A GET; C decisions | snapshots/reviews/notes reusable | ImportReview/AccountsPanel | reader exists, decision writes absent | E10,E11,E20 | no approved resolution history | retain readers, extend review annotations/journal | P1 | G02,D10 | review access/authority |
| G24 | Import | Controlled preview/matching/promotion | B offline scripts | B offline scripts; F controlled promotion | datasets reusable partial | review not approval/preview | no promotion API | E17 | missing original inputs and approval/idempotency map | add typed preview/provenance links, no auto-import | P1 | G03,G08,G23,D10 | originals/attestation/promotion rules |
| G25 | Reports | Operational/payroll/cash/client reports | E summaries/CSV | E historical summaries | no active report entities required first | adapt insights/export | no reconciled active queries | E04,E07 | totals cannot support active decisions | add reports over approved domain queries | P1 | G13,G20,G22,D13 | report scope/redaction |
| G26 | Billing | Invoice/bill templates/issuance | E bill snippets | E 23 archived bill objects | no invoice lifecycle | dormant list | historical GET only | E07,E18 | no approved client/rates/numbered invoices | defer issuance; add template after decisions | P1 | G06,G20,D13 | template/tax/numbering/rates |
| G27 | UX | Form/route reuse and runtime wording | C overlap | C dormant components/stale signout/table markup | n/a | active shell reusable | compatibility routes available | E04,E08,E15 S | duplicate UI/old contracts and wrong table cells | consolidate by responsibility, focused fixes | P1 | G08,D01,D12 | canonical local/Core ownership |
| G28 | Security | Documents/finance/history privacy | C platform audience | C one validator only | no record-level scope | all validator readers | no scoped audience permissions | E12,E14,E19 | sensitive evidence access not differentiated | permissions/redaction/document authorization | P0 | G01,D02,D09 | permitted audiences/retention |
| G29 | Qualification | Browser/E2E/migration/restore safety | B/T10 no BR | T1 qualified baseline; no BR | supplied preservation proven | no interactive proof | write workflows not testable yet | E01,E16,E19 | policies/original sources/backup proof gaps | isolated Phase 2F qualification | P0 | G01–G22,D14 | acceptance and recovery gates |
| G30 | Integration | Future WhatsApp/AI extraction/reply | B external scaffold | G | snapshots only, no active ingestion/outbox | offline inspector | hard-disabled external config | E12–E14 | future contract/ownership unspecified | defer; single approved boundary | P2 | G02,G24,D12 | separate integration approval |

P0 denotes safe core operational prerequisites, not every office enhancement. Full document profiles, client administration, office attendance, advanced reports and import promotion can follow a qualified core slice. Future AI/live messaging is P2 and outside implementation approval for these stages unless separately selected.

## 8. End-to-end lifecycle gap analysis

Actors and transitions below are proposed, subject to decisions; current implementation column distinguishes reads/previews from writes. Every transition needs actor ID, timestamp, reason, entity version, request/idempotency ID and source references in an append-only audit event; money events also need posting/approval IDs. No current journal provides this.

| Transition | Input | Responsible actor | Validation | DB read/write requirement | Proposed status | Errors | Approval | Required audit record | Existing / missing |
|---|---|---|---|---|---|---|---|---|---|
| Registration → verification | stable employee ID, name/contact/category/joining/status, permitted documents | Office enters; Admin verifies | ID uniqueness, contact not payout identity, required evidence; no invented salary | R personnel lookup; W employee+document metadata+audit | draft → pending → verified/rejected | duplicate identity/missing proof | verifier independent of entry where feasible | verification decision and evidence version | historical names/phones only; all personnel steps missing |
| Verified employee → program registration | client, reference, vessels/master, assignment date and planned duty | Operations | unique reference; stage-specific required fields; uncertain historical values preserved | R clients/employees; W extended programs+audit | draft → registered/unassigned | duplicate ref/date/missing vessel/client | policy-defined registration acceptance | registration version | programs base+parser available; create API/form missing |
| Registration → assignment | program, verified employee, category/duty role, time/shift | Operations | active eligible employee; overlapping assignment policy; programme assignable | R program/employee/assignments; W assignment+version+audit | unassigned → assigned | inactive/unverified personnel, collision/stale revision | supervisor if policy requires | assignment/replacement chain | message preview exists; persistence missing |
| Assignment → duty start | assignment, actual date/shift/location/contact and source | Operations or duty recorder | actual vs planned dates; status guard; verified master/contact requirements | R assignment/program; W duty-start event/entry+audit | assigned → in_duty | no active assignment, invalid chronology | duty-start permission | actual start actor/time/source | text start field exists; guard/actual event missing |
| Duty start → attendance | employee/program/assignment, service date/shift/unit, evidence | Operations records; supervisor reviews | nonduplicate approved slot, overlap, actual roster; office attendance separate | R assignments/calendar; W duty entries + correction requests | pending entry → approved/rejected | invalid slot/repeated or cross-program duty | approved duty unit; correction approver | original entry and correction decisions | none beyond historical dates/shifts |
| Attendance → completion | final approved duty, end date/end shift, release point, verification | Operations submits; authorized supervisor accepts | all required duty resolved, no date conflict; elapsed time insufficient | R approved entries/assignment; W completion request/event+audit | in_duty → completion_pending | missing duty/conflicting release/replacement | completion verifier | reviewed duty totals/reference | releaseState reads only; completion workflow missing |
| Completion → release slip | employee/program, release date/shift/location, document, duty total | Operations; verifier | document provenance, employee identity; nullable historical match remains candidate | R program/duty; W slip/version/document links+audit | slip draft → verified; program → completed/released per D06 | unmatched slip/missing image/duplicate slip | verifier, historical matching separately | slip approval and match evidence | preview/source list exist; typed slip missing |
| Slip → calculation | approved duty quantity/rate version, conveyance/food/adjustments/advances | Accountant | policy effective date, exact money/rounding, food direction, no duplicate advance deductions | R slip/approved duty/rules/advances; W settlement/payment draft+audit | verified basis → calculated draft | missing rules, excessive deductions, disputed duty | policy approval and draft review | immutable input/calculation version | calculateSettlement partial and policy-unqualified |
| Calculation → payment approval | draft version, beneficiary/payment method, total/evidence | Admin or delegated approver | separation of duties, amount ceilings, stale version, beneficiary verification | R draft/user scope; W approval+audit atomically | draft → submitted → approved/rejected | self-approval/changed draft/incorrect beneficiary | explicit approver | exact approved payload hash/version | no approval engine |
| Approval → cash transaction | receipt/execution proof, approved amount, account/method/reference | Accountant posts; approval role as selected | approved version, unique reference/idempotency, currency/direction; approval alone not paid | R approval/account; W posted transaction+audit in one transaction | approved → posted/part_paid when evidence valid | duplicate retry/concurrent posting/missing receipt | posting authority; high value second check if chosen | posting, receipt, approval link | archive exists; active posting absent |
| Cash → settlement | posted employee payments/advances, payable version, allocation amounts | Accountant; approver | each allocation ≤ unallocated amount; no cross-employee accidental match | R ledger/draft; W allocations/settlement approval+audit | draft → reconciled/settled or dispute | double allocation/overpayment/negative payable | settlement approval/reopening policy | allocation and settlement version | settlement draft table only |
| Settlement → reports | approved operational state, posted money, period/account/source scope | Office/Operations/Accountant/Reviewer by scope | distinguish draft/approved/posted/historical; reconcile totals to ledger | R domain query only; optional export audit | read-only issued report | missing opening balance/date/source ambiguities | export permission; no extra approval for ordinary authorized read | sensitive export metadata | historical summaries/CSV reusable; active reports absent |
| Independent cash → reports | non-program receipt/payment, account, purpose, counterparty and source; optional employee/program | Accountant, authorized approver | direction/account/reference, opening balance/reversal rules; no forced escort link | R account/approvals; W draft/transaction/audit; R balance | draft → approved → posted → reversed if approved | unrelated expense forced into program; duplicate entry | finance authority | independent posting/reversal evidence | not supported as active workflow |

Cancellation/replacement branches must preserve old assignments and approved duty. Cancellation before duty differs from stopping a started duty; never delete earlier attendance or paid amounts. Corrections after payment require recalculation/reconciliation and approved adjustments, not silent edits.

## 9. Historical evidence and controlled promotion

Available supplied material: 36 conversation chunks + marker; 16 accounts chunks + marker = 54 rows. Conversation chunk arrays include 6,221 maritime message envelopes and 10,434 account envelopes (the visible combined reader excludes one sensitive envelope), 646 reconciled program rows, 1,668 program evidence entries, 94 conflicts, 399 maritime review items and 843 links. Accounts chunks include 7,038 qualified instructions, 2,047 review items and 1,798 excluded items. These are different projections/accounting units and must not be summed as employees, voyages or payouts. External operations archive has 4,607 cash extractions, 1,024 Excel entries, 85 program objects, 23 bill objects and separate summaries/reviews. Older chat archive has 3,677 messages, 1,204 program/reference objects and 162 entries. Five recovered seed objects remain separate. Overlapping archives are not additive operational counts.

Accounts identity attestation is bound to the exact supplied source hash; it is not transport/JID proof or payout receipt evidence. Possible repeats remain in review; historical instructions and accountant summaries never establish paid salary, debt or cash balance. Payout numbers cannot create employees. Missing media/image bytes, original WhatsApp export collection, workbooks, independent source attestations and live D1 state are evidence gaps. No record was fabricated to fill them.

Recommended controlled promotion: retain source envelope/hash and source-local record ID → parse offline/new immutable version → preview typed candidates and exclusions → resolve employee/program matching explicitly → record reviewer decisions separately → administrator approves exact candidate version → transactionally create active record with unique source-promotion mapping and audit → link historical evidence from operational record. Repeating an approved promotion is idempotent; changed input requires fresh review. Ambiguous/missing vessel links remain nullable candidate matches, never invented mother/lighter names. Unmatched slips can be retained for review but cannot drive program completion or payment until required identity/duty/payable evidence is accepted. Historical paid claims need independent payout evidence before promotion as posted cash; otherwise remain instructions/drafts.

Review relationships can reuse reviews/operation notes, with explicit scope and event history. Existing datasets can become approval/batch metadata; a separate provenance/promotion link is justified because no current FK/idempotency relationship maps immutable source items to active entities. Do not change snapshot tables/payloads to store live operational records. Existing historical reader must remain available after operational rollout; legacy overlay semantics cannot be the active ledger.

## 10. Mandatory duplication and simplification audit

| Candidate | Verified responsibilities | Canonical implementation and recommendation |
|---|---|---|
| `/` and `/register` | exact same VesselDashboard; intentional route aliases | keep one component; no second dashboard. Consolidate small page wrapper plumbing only if needed. |
| Tracker/register-views vs VesselDashboard | older tracker consumes RegisterState, parsing/edit/review dialogs; active dashboard consumes paginated reader | active dashboard is canonical shell. Extract only compatible form/source utilities; do not expose unused Tracker as another register. |
| Operations vs AccountsPanel | old Operations also has dormant drafts/bills/settlement and mismatched live payloads; AccountsPanel is current historical cash/statement reader | AccountsPanel canonical historical finance reader; adapt useful draft widgets into same workflow, not a second accounts application. Distinct missing finance responsibilities are not duplicate just because names overlap. |
| `/api/register` vs `/api/vessels` | share loadSnapshot, latter compatibility full-list response | register API canonical current listing; maintain documented compatibility adapter until consumers identified. Central query service, different response contract retained as needed. |
| `lib/programs.ts` vs vessel-data/register | legacy Program import/validation/candidate heuristics vs newer normalized VesselRecord queries/release projection | share primitive date/phone/money validation only after equivalence tests; retain evidence parser adapter. Do not silently change legacy normalization or matching. |
| `lib/register.ts:csv` vs programs exportCsv/parser | generic spreadsheet escape utility vs domain-specific historical roundtrip exporter | generic CSV escaping canonical primitive; preserve format-specific adapters/tests. No report import parser reused blindly for operational clients. |
| `db/index.ts` vs db/raw.ts | ORM and raw readers share pool, not duplicate connection runtimes | createPool/pool canonical connection; Drizzle schema canonical model and SQL migrations canonical evolution. New writes use one transaction service/client per operation. |
| Auth in proxy + route/page checks | perimeter plus defense-in-depth helpers, intentionally complementary | validationIdentity canonical credential check now; future centralized requirePermission plus perimeter. Do not remove route checks just to reduce repetition. |
| Repeated reply/error/filter/page parsing | genuine small helpers duplicated with different cache/schema behavior | common request schemas/response handling once scopes are explicit; preserve no-store and error privacy. |
| Runtime evidence loader vs scripts/database.mjs:evidence | server lazy cache vs offline importer verification, different execution contexts | share approved integrity primitive if practical; preserve build privacy and explicit imports. No new evidence bootstrap service. |
| Four historical datasets plus snapshots | immutable original/projection/source views overlap by design | original hashes and source IDs canonical provenance; keep all copies/versions. Resolve active promotion mapping, not raw deletion/deduplication. |
| Three accounts parser generations | legacy payout-inferred extraction vs identity-qualified updated parser | latest source-bound accounts parser canonical for future qualified preview. Legacy parsing stays provenance/unverified; avoid silent reclassification. |
| release message food estimate vs settlement deduction | explicit rate preview vs fixed food payroll deduction | not equivalent today; one approved versioned monetary policy with distinct preview/calculation adapters. |
| Current Compose/Docker vs retired Sites/legacy D1 | current runtime vs preserved provenance | C/compose.yaml and vps-infra PostgreSQL remain canonical. No parallel app stack, DB, migration runner, Core engine or service. |
| README, upstream ops docs, Phase 1 report, VPS map | current usage, historical claims, completed baseline and operational ownership | current README/map authoritative within their domains; archive old claims and refer instead of duplicating maps. Correct stale Core-only/owner/logout wording when implementation approved. |

No consolidation solely from similar names; no deletion performed or proposed as part of Phase 2A. Avoid speculative removal of retained evidence utilities, compat routes or UI primitives without consumer analysis.

## 11. Proposed authorization matrix

Future permission design, not implemented. All roles deny by default; Admin delegation must be explicit. Role names are not personnel categories. A Security Supervisor employee is not automatically a transaction approver.

Legend: R read relevant scoped records; C create/submit; E edit draft with version guard; A approve; Q request correction; — deny. Employee/Client scopes are own authorized records only and deferred until identity/relationship checks exist.

| Action | Admin | Office staff | Operations staff | Accountant | Employee | Client | Read-only reviewer |
|---|---|---|---|---|---|---|---|
| Manage users/roles | RCEA | — | — | — | — | — | — |
| Personnel register/profile | RCEA | RCE | R limited assignment fields | R payment identity fields | R own; Q changes | — | R redacted if authorized |
| Verify employee/category/status | RCEA | C/Q | Q | — | — | — | R decision only |
| Programs/assignment/duty start | RCEA | RC draft | RCE | R finance-linked | R own assignment | R own client scope | R approved scope |
| Cancel/replace program | A/E | Q | C/Q; A only delegated | R | — | — | R |
| Attendance entries | RCEA | C office context | C/E pending vessel duty | R approved totals | R own/Q | — | R redacted |
| Attendance correction approval | A | Q | Q; A delegated supervisor | Q paid-total discrepancy | Q own | — | R approved history |
| Release slip entry/verification | RCEA | C documents | C/E submit; A delegated | R verified payable basis | R own; Q | R own completion only | R redacted |
| Salary/rule/private finance | RCEA | — | R duty only | RCE calculations | R own approved statement | — | R redacted explicit grant |
| Payment draft/approval | R/A; C if no self-approval | — | C expense request only | RCE submit; A separately delegated | R own approved status | — | R approved scope |
| Post cash/advance/reversal | R/A exceptional | — | C expense request | RCE posting after approval; Q reversal | R own advances | — | R explicitly granted/redacted |
| Settlement/reconciliation | R/A | — | R duty discrepancy | RCE submit | R own finalized statement | — | R approved scope |
| Historical raw messages/evidence | R granted | R only permitted sources | R maritime scope | R finance scope | — | — | R specifically approved/redacted |
| Import review/promotion | R/A | C/Q preview | C/Q maritime matching | C/Q finance matching | — | — | R preview only |
| Reports/export | R | R office scope | R operations | R finance scope | R own scoped report | R own scoped report | R redacted; export separate grant |

Four separate gates: permitted record scope, permitted action, current business state, approved version. A shared Basic credential cannot supply per-user accountability. Keep Basic unchanged during audit; proposed identity is private initially, without public registration or public hosting.

## 12. Integration boundary and future ownership

Frozen empty integrationConfig and hard-false conversationConnection keep live Core, WhatsApp, providers, Hermes/9Router disabled even if ambient credentials exist. The operational model can later support a single adapter contract: provider/bridge/message immutable identity + checksum + received time → verified identity binding (never display name alone) → domain classification → parsed candidate with extractor version/confidence/source ranges → validation → draft + explicit approval → idempotent domain command → authorized reply/outbox receipt. Reuse approved domain validators/transaction services and review/provenance mapping. No assistant may post directly or bypass authorization. An authorized reply needs its own sender authority, target scope and idempotency; it is not implied by approving an internal record.

D12 must decide whether the VPS application or an independently qualified Core owns active records. Current code's Core-first correction guidance is historical, not proof of an accessible canonical Core. No second conversation engine or duplicate AI backend is justified. Interfaces/outbox/schema for actual transport should wait for a separately approved integration design, rather than prematurely building shared infrastructure.

## 13. Risks, evidence gaps and stop gate

Safe-operation blockers: actor identity/permissions; source-of-truth selection; stable personnel identity; guarded assignment/duty/release transitions; approved payroll rules; ledger/approval/idempotency/reversal/allocation safeguards; immutable audit and least-privilege runtime boundaries. Additional risks: legacy/current API contracts; historical overlays when active writes start; payload/text/date validation; stale UI signs/labels/table columns; excessive raw evidence access/export; original media/source gaps; absent current interactive acceptance; off-host backups/retention unselected.

Preserve map, v10 tree/ZIP, original SQL, private external evidence and all 54 snapshots. No tests/builds/migrations/imports/restart/deployment or operational record changes occurred. Read-only inspection commands, Docker introspection/exec GET/SELECT, and exclusive report writes only. Normal reads may produce ordinary server/access telemetry; no runtime files/configuration were intentionally modified. Local application HTTP and internal PostgreSQL inspection were performed; **external messages/provider API calls = 0**.

Session counters: source files modified 0; database schema/data changes 0; service restarts 0; deployment changes 0; external messages/API calls 0; Git operations 0. Reports created 3 in the designated docs directory. No Phase 2B work began.

Read PHASE2_IMPLEMENTATION_PLAN.md and PHASE2A_DECISIONS_REQUIRED.md next. STOP pending explicit administrator review/approval.

## Final read-only verification

After report creation, a SELECT-only application-role transaction recomputed the nine-table state fingerprint: `96f4fe553fdd54d5e10869696dd9e5ded3e9da434c4fe4cc37496599be0464ba`, exactly matching the published Phase 1 baseline. Counts remain seven operational tables at zero, 54 snapshots and six migration records. Report checks found all 14 required matrix columns and no personal telephone-number patterns in any report. No source, configuration or runtime file was written.
