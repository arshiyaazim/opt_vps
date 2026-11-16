> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# AL-RIFA’I — Proposed Phase 2 Implementation Plan

Date: 8 October 2026, Asia/Dhaka. Planning only. Basis: PHASE2A_GAP_ANALYSIS.md, verified Phase 1 database/runtime and user-specified office workflows. Status: proposal pending administrator approval; no source code, migrations, records, permissions or runtime configuration changed.

## 1. Recommended sequence and governing decisions

1. Resolve material decisions D01–D12 before the dependent implementation; agree a private core acceptance slice and recovery gate D14. D13 report/invoice choices can follow core operations.
2. **2B**: settle source-of-truth, business transitions, identity/authorization, model, audit and finance contracts. Implement additive migrations only in a separately approved development/qualification environment after approval. No migration files are created in this audit.
3. **2C**: accountable employee registration/verification → active program → assignment/replacement → actual duty start → approved duty/attendance. Deliver usable forms within the existing shell alongside each API; do not defer all operational UI to 2E.
4. **2D**: verified release → approved calculation → draft/approval → evidenced posting → allocation/settlement/reconciliation, including independent cash.
5. **2E**: refine existing shell/search, scoped profiles/reports, historical review and controlled promotion preview. Historical review UI already exists; extend rather than replace it. Promotion is separately gated by source/policy decisions.
6. **2F**: qualify complete private workflows in isolation, then administrator accepts any controlled canonical rollout. Individual stage tests run during delivery too; 2F is final integration qualification, not the first testing stage.

No duration estimates are supplied: office policies, identity choice, canonical ownership and original-source availability materially affect effort. One Next.js app, one existing vps-infra PostgreSQL deployment/database and one existing vps-backend network remain the architecture. No public domain/reverse proxy, live integration or new shared service belongs to these stages by default.

Decisions D01–D14 are defined in PHASE2A_DECISIONS_REQUIRED.md. Evidence references E01–E20 and gaps G01–G30 are defined in the gap report; exact paths below are relative to `/opt/vps/apps/al-rifai`.

## 2. Phase 2B — Data model and business rules

### Scope and approved contracts

Specify staged required fields, status transitions, authority, correction/reopening rules, date/shift/duty units, employee identity, approval thresholds and monetary policy before code. User-provided employee categories share one personnel model: Escort, Survey Escort, Security Guard, Security Supervisor, Assistant Security Supervisor, Operation Officer, Marketing Officer, Security In-charge, Ghat Supervisor, Operation Supervisor. Designation/category/duty role/auth role remain separate concepts. Escort/security deployments need program/assignment/duty rules; office/marketing roles may need calendar attendance and periodic payroll. No evidence supports separate employee tables or category-specific salary rates. Supervisor designation must not automatically grant approval authority.

Proposed program states: draft, registered/unassigned, assigned, in_duty, completion_pending, completed/released, cancelled. Exact terminal distinction and reopened states depend on D06. Preserve historical status spelling in evidence; never convert historical Active/Running into active duty. Assignment statuses and effective intervals are separate from program status, permitting replacement history. Calendar attendance and vessel duty differ in context, shift boundaries, multiple assignments, duty units and correction approval; a program start/end date pair cannot substitute for daily approved entries.

Financial states must distinguish draft/submitted/approved/rejected from actual posted/part-paid/settled/reversed. Approving a draft does not send money. Historical instructions remain separate from cash. Define whether food is deduction, reimbursement or included allowance; approved calculation records retain rule version, verified units, conveyance, food, allowance, deductions, advance allocations and exact payable.

### Existing structures to reuse

| Existing table/module | Intended reuse | Required change/limit |
|---|---|---|
| programs | canonical local active program base if D12 selects local owner | add typed operational reference/client/dates/status/version metadata; active queries separate from historical overlay |
| reviews | duplicate/match pair review | explicit review domain, actor, evidence/version and decision history; not blindly programs-only FKs |
| datasets | source/import batch registration | explicit source checksum/version, validation and approval batch metadata as approved; do not assume existing snapshot datasetId FK |
| site_operation_notes | current review note/status projection | entity scope/version plus immutable audit event for every change |
| site_payment_drafts | payment request/calculation container | typed beneficiary/reference/amount/currency/status/revision/idempotency/approval metadata; details for noncritical extensible explanation |
| site_settlement_drafts | settlement calculation/approval container | employee/period or release basis, rule version, typed totals/status/revision and allocation references |
| site_cash_archive | historical read-only archive | no live money posting or active balance here |
| site_source_snapshots | immutable source evidence | no operational fields/payload rewrite; existing immutability triggers retained |
| alrifai_schema_migrations and scripts/database.mjs | explicit checksum-ledger migration authority | extend with additive files, dedicated migration permission, isolated tests; never startup migration |
| db/raw.ts + db/index.ts + db/postgres.mjs | one shared connection policy | scoped read/write transaction path; no separate database engine |

### Proposed additive model: each extension has a reason

Names are design proposals, not created files/tables. Combine small lookup/metadata structures only when constraints and responsibility allow it. Avoid separate tables per designation, per dashboard or per report.

| Proposal | Relationships and important fields | Why current schema is insufficient |
|---|---|---|
| Employee entity and category lookup/effective history | stable internal PK + approved unique employee code; contact separate from payout destination; name/designation/category/joining date/status; verified actor/time; category history effective dates | programs/cash text names/phones cannot represent employment identity, history or verification; phone can change/shared payout may differ |
| Identity/role membership model or adapter | stable authenticated actor ID; role grants; employee/client mapping where later allowed; revoked/suspended access | Basic has one shared validator; actor text in draft tables is not authenticated accountability. Provider may own credentials; do not duplicate its password store |
| Client lookup; optional vessel registry only if D05 requires authoritative vessel identity | clients FK from program; vessel names kept plus approved identifier/alias if supplied | client is absent and intentionally discarded by historical parser. Name similarity cannot establish vessel identity. Defer standalone vessel registry until authoritative identifiers/maintenance need demonstrated |
| Extended programs | unique approved program reference; client FK as required; registration/assignment dates; typed planned/actual duty start/end and shifts; operational status; updated actor/time and revision | base fields are text defaults/free status, no FK/reference/date guarantees; do not hide critical lifecycle fields in arbitrary details JSON |
| Program assignments | program FK, employee FK, duty role, effective start/end/shift, replacement/cancellation reason, previous assignment reference, revision | programs stores only one escort name/mobile; cannot preserve replacement/history or multiple personnel rules |
| Attendance/duty entries with correction decisions | employee FK, context office/vessel, assignment/program FK only for vessel context; service date/shift or interval, approved units, evidence, status, revision; original/corrected versions and approval | no attendance entity; existing program dates cannot represent daily duty, absence, overlap or approved correction. One constrained table with separate context rules is acceptable; split only if D07 policies cannot share safe constraints |
| Release slip/completion record | assignment/employee/program relation for verified operations; release date/shift/location, verified duty total, source document refs, verification actor/state and revision | release fields scattered in historical details/message preview; no accountable document-backed completion. Unmatched historical slips live as review candidates with nullable match until accepted, not fake completed programs |
| Supporting document metadata | permitted entity links, content checksum/type/size, restricted storage reference, uploaded actor/time, access/retention classification | no document ownership/storage security model. Files belong in approved private persistent storage, not source/public or snapshot payload mutation |
| Versioned compensation policy | effective policy/category/rate basis, unit/rounding/food/conveyance/adjustment authorization; approved actor/version | calculateSettlement has fixed food deduction and caller-provided rate; no approved/effective payroll basis. Retain approved calculation inputs on draft even if policies change later |
| Active cash accounts and transaction/posting entity | account/currency, receive/pay direction, amount in exact minor units, purpose/reference, optional employee/program/payment draft FKs, receipt evidence, posting actor/time, unique idempotency and reversal-of link | site_cash_archive has no account/direction/approval/reversal and must stay historical. Independent office cash must allow program null |
| Approval decision and append-only audit event | actor/time/action/entity type/id/version, reason/source, approved payload version; decision status; audit changes; approval can reference draft/slip/correction as appropriate | notes mutable current state and draft actor text are not full history; one reusable approval/audit responsibility avoids separate redundant logs per feature |
| Settlement allocations | settlement draft FK, posted payment/advance FK, exact amount, beneficiary identity, uniqueness/revision/approval | subtracting typed advance input cannot prevent duplicate recovery or reused payments; active allocation limits need relational constraints and transaction locks |
| Source-to-operational provenance/promotion mapping | dataset/source-local item/version/hash, operational entity FK/type, reviewer/approval IDs, unique approved promotion key | no current mapping guarantees exactly-once approved promotion or preserves uncertain matching independently of immutable snapshots |

Minimum delivery should omit unneeded lookup entities and defer transport/outbox/invoice issuance until approved. Supporting documents may use a normalized link structure where shared access/retention is valid; avoid unverifiable polymorphic pointers without application/DB validation. Ordinary reports are queries, not new redundant storage tables.

### Proposed migration groups, not executed

After the existing 0005 migration, reserve sequential additive migration groups (final filenames assigned only at implementation):

1. Identity/employee/client/document metadata, lookup constraints and audit/approval foundations.
2. Program operational additions, assignments and attendance/correction records.
3. Release/completion and compensation-policy versioning.
4. Typed payment/settlement draft extensions, accounts/postings/allocations and unique idempotency safeguards.
5. Review/provenance/promotion extensions and measured query indexes.

This is a dependency order, not a demand for exactly five files. Replay tests cover all approved SQL together. Maintain old text fields for historical compatibility until a separately reviewed conversion plan; add nullable typed operational fields and validate on operational states rather than coercing unknown strings to invented dates. Operational tables were empty at audit, but recheck counts before any migration/backfill. No snapshot backfill or transform permitted. Noncritical new extension JSON may be JSONB with schema version; snapshot payload text remains byte-identical. State transitions and financial amounts require constrained columns, not opaque JSON.

FKs for new active relations; unique employee code/program reference and request idempotency; checks for actual date order, valid shifts/status, positive exact amounts, context-required links and valid reversal relationships. Choose date for business dates and timestamptz for actions, using Asia/Dhaka for user-facing duty calendar boundaries after D07. Money: integer minor-unit decimal conversion with safe bounds, or PostgreSQL bigint/numeric if approved aggregate range exceeds existing integer; no floating-point payroll arithmetic. New money storage choices must handle JavaScript precision/serialization explicitly. Domain-specific ceilings are administrator decisions, not the inherited formatter's arbitrary limits.

Indexes: employee code/status/name search as needed; programs reference/client/status/start; assignments employee/time and program; duty context/date/status; drafts status/date/employee; posting account/date/reference; review/provenance keys. Snapshot datasetId/kind index is a possible read-only performance extension without payload edits, but only if measured need justifies it. There is no current secondary index. Validate plans with representative isolated data before selecting indexes.

### Transaction and audit strategy

One server-side domain service per responsibility; route handlers authenticate/authorize and validate, services perform business transitions. Each business write uses a single PostgreSQL client/transaction, reads required entity versions, locks contested rows, checks expected revision and authority, writes state and append-only audit together, and commits or rolls back completely. Read pool remains default read-only. A narrowly scoped writer must not be the migration/snapshot owner; selected role/config changes require separate administrator approval. Trigger protection remains; owner-level tampering is not prevented by current default session settings.

Financial posting requires approved exact draft revision, independently verified payout/receipt evidence, correct beneficiary/account/direction/currency, unique reference/idempotency key. Concurrent retries produce one posting; a same key with different payload is a conflict. Reversals are append-only compensating transactions linked to original, never deletions. Allocation locks enforce cumulative allocations within actual posted amount and employee/settlement boundaries. Later attendance/rate corrections do not rewrite paid settlements: create approved adjustment/reconciliation. Approval, cash execution, settlement and report totals are distinct facts.

Audit events record accountable actor, time, permitted action, entity/version, reason, source/policy/approval references and request ID. Sensitive raw documents/messages/credentials are not copied to logs. Reject prohibited direct mutation of posted money/audit records through application roles. Administrative maintenance still follows approved change control and backups.

### Files, tests and acceptance

Reuse/modify: `db/schema.ts`, `db/postgres.mjs`, `db/raw.ts`, `db/index.ts`, `scripts/database.mjs`, `lib/programs.ts` primitives, `lib/operations.ts` money primitives, `lib/program-workflows.ts` evidence formatter, `app/chatgpt-auth.ts`, `proxy.ts`, current request schemas/helpers. Existing auth/migration/evidence APIs keep their semantics until approved transition. New files justified: domain schemas/services for personnel, assignment/duty, release, ledger/approval/audit and provenance; identity adapter; sequential SQL migrations; meaningful constraint/transaction/authorization tests. Exact layout settled with existing conventions; no new parallel backend.

Tests: migration replay against isolated schema/database, constraints, invalid calendar/shift input, sparse historical compatibility, money precision/bounds, version conflict, atomic audit rollback, role grants, snapshots exact comparison, identity mapping. Never run current `tests/database.mjs` or future write tests against canonical persistent state without separate authorization and isolation.

Acceptance: administrator signs business rules/ownership; additive schema replay passes; active relationships and money constraints enforced; read-only paths do not bootstrap; least-privilege writer design approved; preserved hashes unchanged; transaction rollback leaves no partial business/audit state. Dependencies D01–D12; risks policy ambiguity, legacy adapters, inherited ownership. Rollback: stop enabling writes, retain old reader, use additive backward-compatible fields; do not drop new tables once real records exist. Approved migration rollback/restore only after impact review. Recovery uses consistent logical backup, separate restore target and validated cutover, never copy live PG data files. Required approvals: schema/rules/identity/role design and explicit future application of migrations/config changes.

## 3. Phase 2C — Core operations

Scope: personnel registration/list/profile and verification, category/status history, active programs, assignment/unassigned queue, replacement/cancellation, actual duty start and vessel attendance with corrections. Office calendar attendance follows distinct D07 rules; can be a later C increment if vessel core is first. Supporting employee documents follow approved D09 controls; absence of optional document uploads must not invent verification.

Reuse: `app/vessel-dashboard.tsx` shell/filter/detail patterns; `app/program-tools.tsx` field layouts/source references; `components/ui` existing inputs/dialogs/tables; `lib/programs.ts` date/parser primitives; `lib/vessel-data.ts` query helpers; `lib/register.ts` safe export; `app/import-review.tsx` source linking. Reuse dormant Tracker form parts only after confirming current API and payload compatibility; the whole component is not canonical.

Likely modify: existing shell/navigation, `app/api/register/route.ts` reader adapter or explicit active listing service, `app/api/program-tools/route.ts` read-only tools (preserve evidence behavior), validators/query modules and shared permission checks. Justified new files: employee form/list/profile, focused attendance entry/correction panel, active program/assignment domain API handlers and transactional services. New pages only for distinct workflow/deep link, not duplicate dashboards. Suggested active API namespaces `/api/employees`, `/api/programs`, `/api/assignments`, `/api/attendance` remain proposals; reuse `/api/register` as read adapter rather than breaking legacy response contracts.

DB impact: 2B-approved employee/client/program/assignment/duty/correction/audit entities only. No historical rows promoted implicitly; `historicalSnapshot` must stop being the source of active operational truth. Active programs are queried from their own table/status scope with evidence links; historical view keeps original reconciliation/fallback semantics.

Dependencies: G01–G14, D01–D07/D09/D12, approved 2B model/permissions. Risks: treating phone as employee ID; overlapping duties; replacing escort overwrites prior duty; historical “Active” labels leak into current roster; calendar vs vessel units conflated; stale revision forms; invalid contact/dates accepted by historical validator.

Tests: employee-code collision/contact change/payout separation; registration pending verification; inactive employee cannot start duty; unassigned program creation; assignment/replacement/cancel branches; concurrently assigned/revised records conflict safely; duplicate shift/duty overlap rules; attendance correction original history preserved; active vs historical counts/filter isolation; per-role API tests and focused browser form flows. Pure legacy import tests remain useful but do not prove operational transitions.

Acceptance: one verified employee can be registered, linked to a newly registered active program, assigned, started and have approved duty recorded; replacement preserves previous assignment/duty; cancellation requires authority/reason; unassigned queue accurate; no historical rows counted as live; accountable audit events accompany every state change; basic operational forms work in private browser acceptance. No salary/payment step represented as complete yet.

Rollback: disable new mutation permissions/features, retain historical reader and newly created records for review. Additive schema preserved; reverse erroneous operational state with approved transitions, not deletion. Old Phase 1 image may read newly populated programs through historical overlay, so do not assume image rollback alone is safe: verify read compatibility and active-history separation before rollout. Required approval: enable core writes for named users, category/verification/assignment/duty/cancellation policy and private acceptance.

## 4. Phase 2D — Release and finance

Scope: completion review, typed release slips/document linking including unmatched historical candidates, duty-based salary calculation, conveyance/food/other adjustments, employee advances, payment/settlement drafts, approval and evidenced cash received/paid, independent office cash, partial settlement and reconciliation/reversals.

Reuse: `ProgramTools` source/required release fields and `releaseState` as evidence-only classifier; `AccountsPanel` historical statement/source views; dormant Operations form layouts as component fragments; `validateDraft` and `calculateSettlement` only after stable employee IDs, precise money and approved rule versions replace legacy assumptions. Current fixed food deduction is not approved. Preserve the explicit-rate message preview as unsaved guidance.

Likely modify: `lib/operations.ts`, `lib/program-workflows.ts` helpers as needed without weakening historical preservation, existing finance shell/panels, `app/api/operations/route.ts` read adapter, `db/schema.ts`, permission/domain services. Justified new files: release entry/verification form/service/API, versioned compensation calculation module, draft/approval form/service, posting/reversal/allocation/reconciliation service with tests. Prefer central approval/audit service reused by attendance and finance. Do not implement payment execution through WhatsApp/provider.

DB impact: approved release/rule/typed draft/account/posting/approval/allocation extensions; archive/snapshots remain historical. A release candidate may have missing vessel match but cannot silently become verified operational completion. Cash direction/account required, optional program relation for independent activity; payout evidence is a separate authorized document reference.

Dependencies: completed C duty/identity/audit, D02/D06/D08/D09/D11/D12, approved minimum balances/account scope. Risks: double-post on retry; draft shown as paid; source instruction mistaken for receipt; unapproved food policy; duplicate advance recovery; mutable rate changes retroactively affect payroll; negative net payable; float rounding; paid attendance correction; reversal/allocation mismatches.

Tests: policy effective-date selection, salary units/rounding and food direction; missing receipt blocks posting; approved payload changed cannot post; unique idempotency and differing retry conflict; concurrent approvals/postings/allocations; full rollback on audit/payment failure; receipt-to-post mapping; partial payment/advance allocation limits; independent received/paid transaction; reversal preserves original and balances; correction after payment creates reviewed adjustment; permissions prevent self-approval where D02 requires. Use isolated PostgreSQL transactions and synthetic records only.

Acceptance: verified release from approved duty calculates using approved policy; authorized person approves exact draft; accountant posts once using evidence; cash balance ties to approved opening balance and posted/reversal entries; employee statement differentiates advances, salary payments and historical instructions; settlement allocates without double recovery and reports reconcile; uncertain historical release does not create a payable by default. No financial feature accepted solely from a working calculator.

Rollback: revoke/disable new write paths, preserve audit and posted records; use approved compensating reversal/adjustment. Restore is disaster recovery, not routine correction, and never erase legitimate newer transactions casually. Required approval: compensation rules, approvers/delegation/ceilings, cash account/opening balance proof, receipt definition, independent expenses, backdating/reversal/recovery policy and finance acceptance.

## 5. Phase 2E — Frontend and historical review

Scope: refine operational forms delivered in C/D; employee profile/history search, active program filters, duty/release/finance views, evidence decisions/matching, controlled import preview, approved reports/invoice template work. Prioritize actual workflow menus; preserve historical search and clear source/status labels. Employee/Client self-service access deferred unless separate scopes are approved.

Reuse: active VesselDashboard, AccountsPanel, ProgramTools, ImportReview, historical-conversations and existing UI primitives; `lib/register.ts:csv/saveCsv` export safety; query helpers and evidence readers. No whole-front-end redesign. Adapt source review into candidate/decision views; original envelopes remain read-only. Correct concrete current register header/body mismatch and stale Sites signout/owner/Core-only guidance as part of approved edits. Avoid adding a second account register or generic analytics dashboard.

Likely modify: `app/vessel-dashboard.tsx`, `accounts-panel.tsx`, `program-tools.tsx`, `import-review.tsx`, `historical-conversations.tsx`, `conversations/inspector.tsx`, scoped CSS, `app/api/import-audit/route.ts`, `app/api/operations/route.ts`, common request schemas/export handling. New files justified: profile/history view, typed preview/promotion decision controls and transaction service, operational reporting queries and selected invoice template renderers. Do not expose obsolete Tracker/Operations without adapting their contracts. Existing compat `/api/vessels` retained until callers documented.

DB impact: approved review/datasets/provenance mapping and optional report/invoice metadata only if issuance/audit requires it. Report queries do not need new mirror tables. Preview creates no active records; promotion uses exact approved candidate version and unique source mapping. Source-bound attestation is required before finance extraction; originals/media/D1 absence remains visible.

Dependencies: reliable C/D operational states and permissions; D09/D10/D13; historical promotion depends on supplied original evidence and explicit administrator review. Risks: importing overlaps twice, source identity guessed from content, private raw messages leaked to broad viewers, withheld repeats counted, names merged automatically, missing mother/lighter fabricated, report mixes draft/historical/posted, unbounded exports/filters, browser clipboard/download/session behavior unproven.

Tests: combined search/filter/page/detail/deep-link behavior; current table header alignment; empty/error/stale states; role-sensitive navigation and backend denial; authorized document access; Bengali/date/phone formatting; CSV escaping and content scope; preservation of originals/exclusions/repeats; preview totals/duplicate mapping; identical promotion retry idempotent; mismatched source/candidate approval rejected; raw evidence privacy; browser keyboard/dialog/clipboard/export behavior. Original importer reconstruction tests remain conditional on inputs/proof and optional offline dependencies approved separately.

Acceptance: existing reader remains usable; employees/programs/attendance/release/finance found from focused menus; profiles show authorized linked history; historical search/source attribution preserved; preview visibly distinguishes candidate/uncertain/excluded/approved and makes no unapproved operational writes; approved report totals derive from correct status/domain; no duplicate UI responsibility or stale unsupported auth promise. Import acceptance cannot claim full source reconstruction without originals/media/attestation.

Rollback: disable promotion/report features, keep source readers and review history; never delete supplied snapshots. Promotion mistakes get accountable domain corrections/reversals; rollback of UI must not obscure source traceability. Required approvals: review/promotion authority and thresholds, document/evidence access, selected report/invoice scope and whether later self-service roles are included.

## 6. Phase 2F — Qualification and private acceptance

Scope: qualify implemented C–E capabilities plus identity/schema/transactions/recovery; carry forward Phase 1 evidence without treating it as proof of new features. Record source, automated, HTTP, DB and browser evidence separately. Qualification uses an approved isolated DB/schema or designated noncanonical instance on the existing PostgreSQL deployment; no second PostgreSQL architecture. Never point mutation tests, seed/import or restore at canonical alrifai by default.

Reuse: existing pure `tests/workflows.mjs`, `tests/source-register.mjs`, `tests/phase1-unit.mjs`; existing Python accounts/conversation/cash parser tests conditional on inputs; Phase 1 HTTP tests as read-only boundary regression; migration/import runner and exact snapshot comparison. Inspect targets first: `tests/database.mjs` writes a rolled-back schema, Python tests may create temp artifacts, HTTP suite issues mutation-denial requests/assistant POST. These were not run in Phase 2A. Adapt future suites to explicit test target and fail closed if canonical target selected.

Likely modify: test/config helpers and scripts for isolated migration/transaction checks, auth/API/browser suites; selected README qualification/recovery references only in authorized implementation. New tests justified for policy math, workflow transitions, concurrency/idempotency, authorization, document access, historical promotion, reconciliation and migration/restore integrity. No mirror tests asserting implementation text rather than behavior.

| Qualification area | Required evidence | Acceptance gate |
|---|---|---|
| Unit/domain | approved status transitions, employee matching, strict dates/shifts, exact money/policy version, payroll adjustments | invalid inputs denied; historical sparse data preserved; no policy invented |
| API | authorization/state/version/input errors and domain responses | every write has actor/scope/version; malformed requests and wrong role fail safely |
| Transaction/concurrency | parallel posting/approval/assignment/allocation retry tests in isolation | one posting per key; no partial state/audit; no excessive allocations or silent lost updates |
| Migration replay | fresh isolated schema/database, repeat ledger consistency, changed hash rejected, upgrade/backward compatibility | no snapshot payload changes; approved indexes/FKs/checks valid; clean rollback of test changes |
| Authorization | role matrix, own/client scopes if selected, self-approval/revocation/doc/export rules | deny-by-default and server checks, not navigation-only restrictions |
| Browser | actual interactive registration→verification→program→assignment→duty→release→approval→cash→settlement flow | forms/keyboard/dialog/error/retry/deep-link/export work; screenshots/evidence sanitized |
| Historical integrity | all supplied manifest files and external checksums; exact 54-row snapshots/markers/exclusions | unchanged evidence, no GET import, no historical rows silently active |
| Financial reconciliation | approved opening balance + posted receives − posted pays + compensating reversals; employee advances/allocation/payable | account, employee and settlement reports agree; drafts/instructions excluded from cash balance |
| Backup/restore | approved logical backup, restore to separate target and verify schema/counts/hashes/financial invariants | recovery meets selected RPO/RTO; off-host/access/retention policy accepted |
| Private runtime | existing non-root read-only container, loopback exposure, shared network/infra ownership, scoped DB roles | no public exposure/integration activation/new DB stack; runtime compatibility qualified |

Private acceptance scenarios: simple escort duty/payment; security duty with approved applicable rules; unassigned program; replacement mid-duty; cancellation before and after duty; attendance correction before and after finance; release without full original vessel identity held for review; partial payout/advance allocation; duplicate retry; independent office cash received/paid; erroneous payment reversed; unauthorized raw-history access denied. Exact policies and expected results must be signed off before tests.

DB impact: qualification writes only in approved isolated target. Canonical rollout/migrations/permissions/runtime cutover require explicit authorization after evidence review. Risks: test target leakage, migration owner misuse, inadequate restore target permissions/off-host backup, unavailable original files/browser tools, stale Phase 1 runtime image. If evidence unavailable, report partial qualification rather than claim pass.

Acceptance: meaningful tests pass; actual private browser E2E passes; source integrity and accounting invariants hold; backup restore verified; administrator signs off business result and recovery; no required high-risk decision open. Rollback: disable operational writes and retain readers; choose approved backward-compatible image/schema strategy; preserve records/audit; separate restore validation before any cutover. No automated destructive teardown on canonical resources. Required approvals: test/restore environment, backup handling, acceptance dataset/users, recovery targets and any rollout/deployment/restart separately.

## 7. Cross-stage rollback and recovery rules

- Keep Phase 1 artifacts/evidence and current deployment definitions authoritative; no automatic source/infrastructure replacement.
- Additive migration with compatibility-first code can roll back UI/writer enablement, but newly populated program tables change old historical reader behavior. Explicitly qualify downgrade reads.
- Once money or duty records exist, rollback means stopping new writes and using reviewed compensating corrections/reversals, not dropping tables/truncating records.
- Back up logically through existing PostgreSQL. Select access controls/encryption/off-host retention before reliance on backup; current documented Phase 1 backup is not proof of current Phase 2 restore readiness.
- Restore into separate approved target, verify evidence and financial invariants, obtain cutover approval, reconcile transactions since backup; never restore over canonical data as a casual test.
- Migrations/import/promotion remain explicit administrator-controlled operations. Startup, GET readers and assistant questions cannot bootstrap or apply them.

## 8. Explicitly deferred work and stop gate

Deferred: live WhatsApp/MCP messages and outbound reply; Fazle Core activation; Hermes/9Router; OpenAI/other providers; public authentication/public registration/domain/nginx/DNS/TLS/firewall changes; a second conversation/AI backend; separate PostgreSQL/service stack; automatic ingestion or unapproved historical promotion; inferred source records/media; self-service Employee/Client portals unless selected; full ERP/double-entry/chart-of-accounts architecture unless finance scope explicitly requires it; invoice issue/tax treatment until D13; whole frontend redesign; unnecessary dashboards/tables; destructive consolidation/cleanup/Git publication.

These deferrals do not waive private accountable identity, financial safeguards, employee/assignment/duty/release core or browser/recovery qualification before safe operations.

Reports are the only new files in Phase 2A. Source modifications 0; DB changes 0; restarts 0; deployment changes 0; external messages/provider API calls 0; Git operations 0. STOP: no 2B code/migrations/configuration has begun. Administrator must review these proposals and authorize the selected implementation scope.

Audit evidence status: **PHASE_2A_PARTIAL_EVIDENCE**, as detailed in the gap report; original-source reconstruction, interactive browser evidence and unapproved office policies remain gaps. Final nine-table database fingerprint matches the Phase 1 baseline exactly.
