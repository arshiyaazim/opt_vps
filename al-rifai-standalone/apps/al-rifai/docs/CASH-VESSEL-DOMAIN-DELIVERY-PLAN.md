> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Cash and Vessel Domain Delivery Plan

**Purpose:** Deliver reliable, auditable WhatsApp-to-PostgreSQL-to-review workflows for both the Cash and Vessel domains without unrelated work, unsafe replay, or implicit financial authority.

**Plan status:** Execution contract; not production authorization.  
**As-of evidence:** Read-only app/database inspection on 2026-10-21. Recheck all runtime facts before implementation.

## 1. Final goal and definition of “working”

Both domains are considered technically operational only when the same verified source message can be traced end-to-end:

1. From an authorized WhatsApp account/chat and immutable source record.
2. Through the `archive` and domain-specific processing records, with stable source identity and replay-safe persistence.
3. Through explicit processing outcomes (`processed`, `pending`, or actionable `error`) with no silent loss.
4. Into the correct private, read-only review surface with source provenance and useful error/review reasons.
5. Through tests and operational evidence that demonstrate normal processing, retry/replay safety, and recovery from failure.

“Working” does **not** mean automatically approving a Cash instruction, posting money, confirming an escort assignment, or treating a parser result as business approval. The current Cash boundary remains review-only with `financialAction: "NONE"` unless the Owner separately authorizes an exact, narrowly scoped policy change.

## 2. Verified starting point

These are observed facts, not assumptions derived from README or agent instructions:

- `scripts/message-ingestion-worker.ts` reads WhatsApp messages, stores originals, and creates `archive`, `cash`, and `vessel` processing rows.
- The app supervises the ingestion, Cash, and Vessel workers in `release/start-private-app.mjs`.
- The Cash worker polls pending `cash` rows and stores a review classification. Its source requires `ALRIFAI_LIVE_CASH_SYNC=1` and `ALRIFAI_LIVE_CASH_INTENT_CAPTURE=APPROVED_REVIEW_ONLY`; it assigns `financialAction: "NONE"`.
- The Vessel worker polls pending `vessel` rows and derives only `DRAFT` and `REVIEW` operations. Its API is read-only; mutation methods return `405`.
- The Escort/Vessel API reads `escort_order_register`, contacts, events, and pending/error/review message processing rows.
- The latest inspected aggregate had 8,671 original rows and 8,671 processed rows in each domain, with zero pending/error rows. Those were aggregate counts across accounts, not proof that every chat or business workflow was covered.
- WA-02 token access was repaired and verified separately. WA-01 still had three compatibility-reader cursor errors. No WA-01 group originals were present in the inspected state; switching those cursors to archive mode may replay history and is not an automatic fix.

Relevant implementation surfaces:

- [Message ingestion worker](../scripts/message-ingestion-worker.ts)
- [Cash processor](../scripts/process-cash.ts)
- [Vessel processor](../scripts/process-vessel.ts)
- [Cash route](../app/api/cash/[...path]/route.ts)
- [Escort/Vessel route](../app/api/escort-register/route.ts)
- [Cash intake safety tests](../tests/cash-intake-safety.mjs)
- [Vessel health isolation test](../tests/vessel-health-isolation.mjs)
- [Vessel register tests](../tests/escort-register.mjs)
- [Ingestion tests](../tests/whatsapp-archive-ingestion.mjs)

## 3. Hard scope and non-goals

### In scope

- Ingestion coverage and cursor health for explicitly authorized chats/accounts.
- Replay-safe domain queue creation and processor completion/error behavior.
- Cash review classification and private read-only review experience, subject to the Cash authorization gate below.
- Vessel draft/review creation, provenance, and private read-only review experience.
- Targeted isolated tests, bounded read-only production checks, and an evidence-backed release decision.

### Out of scope unless the Owner explicitly adds a separate task

- Financial posting, cash approval, payment settlement, employee/payroll changes, or writes to financial ledgers.
- WhatsApp sending, read receipts, history requests, pairing/session changes, or message-store repair.
- Broad schema redesign, migration backfill, data cleanup/deletion, unrelated UI/API work, and changes to other domains.
- Changing Cash parser rules, amounts, owner identity, scope, authorization, posting, permissions, dependencies, or review policy.
- Fixing WA-01 group ingestion by silently switching to a cursor that starts historical ingestion.

## 4. Mandatory Cash freeze authorization gate

The current Cash owner policy freezes Cash behavior. Before changing **any** Cash-protected code, SQL/migration, test, dependency, configuration, deployment, or release file, stop and obtain a new explicit Owner exception containing all of:

1. Exact permitted paths.
2. Exact intended behavior.
3. Validation plan.
4. Deployment/restart scope.
5. Financial write boundary.

An approval to continue WA-02 ingestion/backfill is not, by itself, approval to change Cash behavior. Until a qualifying exception is recorded, Cash work is limited to read-only diagnosis and documentation. Do not “unfreeze” Cash by interpretation.

## 5. Ordered execution phases

Each phase has one owner/agent, a bounded deliverable, and an explicit exit check. Do not start a later phase while an earlier exit check fails. Keep one coordinator responsible for scope and evidence; do not assign multiple agents to edit the same worker, migration, or route concurrently.

### Phase 0 — Establish the baseline and authorize scope

**Work**

- Confirm repository/worktree state and exact deployed code/image identity.
- Capture bounded, read-only counts by account, chat, domain, and status; cursor errors; latest source/ingestion/processing times; and review-table counts.
- Confirm app/DB health and current worker processes. Do not read secrets or message bodies.
- Record Cash freeze status and whether a qualifying exception exists. If not, mark Cash implementation tasks blocked; do not edit protected paths.
- Agree on the exact production chat/account scope and the business definition of successful Cash and Vessel review.

**Exit**

- A dated baseline is recorded with query results and code/image identity.
- Every proposed edit has an exact path and authorization status.
- No implementation begins with an unresolved scope/approval ambiguity.

### Phase 1 — Repair source coverage and ingestion reliability

**Work**

- Verify each account’s reader credential path is readable by the app identity without exposing credential contents.
- Verify MCP socket access and tool availability per account. Separate socket/credential failures from missing-tool/capability failures.
- Resolve WA-01 group-reader errors using an explicitly selected strategy:
  - **Live-only:** set a safe, verified start boundary and prove it cannot replay old source rows into Cash/Vessel; or
  - **Historical replay:** obtain explicit Owner authorization for the exact chats, replay window, affected domains, and review consequences before changing a cursor or source mode.
- Never reset a cursor or bypass native identity, participant, or privacy checks to force ingestion.
- Verify originals, source events, cursor advancement, and the two required domain queue records are committed consistently and idempotently.

**Exit**

- Every in-scope account/chat has a documented supported reader, advancing cursor, and no unexplained persistent cursor error.
- A bounded new source page is represented once in originals/source events and once per expected domain, even after safe replay.
- Out-of-scope and unauthorized group chats remain excluded.

### Phase 2 — Validate and stabilize the Cash review pipeline

**Authorization:** This phase cannot edit Cash-protected files until Phase 0 records the Owner exception above.

**Work**

- In an isolated Node.js 22 environment using the pinned pnpm lockfile, test the processor’s pending → processed/error transitions, bounded batch behavior, transactional rollback, and retries.
- Prove account/chat/owner identity gates using synthetic fixtures only; do not use synthetic production messages or write live business data.
- Reconcile Cash review records to their immutable source IDs and make processing errors visible to an authorized reviewer.
- Verify the UI/API presents review candidates and unresolved cases without implying approval.
- Keep `APPROVED_REVIEW_ONLY`, approval requirements, and `financialAction: "NONE"` unchanged. Do not invoke financial writers.

**Exit**

- Every in-scope Cash queue row has a visible, source-linked outcome; pending/error counts converge to zero or each remaining error has an assigned, evidence-backed disposition.
- Safety tests prove no automatic approval/posting path is reachable.
- Human Owner/accountant acceptance of actual Cash interpretation is recorded separately from technical test success.

### Phase 3 — Validate and stabilize the Vessel review pipeline

**Work**

- In isolation, test incoming order → `DRAFT`; assignment/confirmation ambiguity → `REVIEW`; missing identity/contact/source text → explicit review/error; deleted/revoked source → safe non-action.
- Verify idempotent source hashes and event writes, uniqueness/replay handling, and transaction rollback.
- Verify the authorized private UI/API shows source provenance, parser/review reasons, and pending/error rows.
- Preserve the rule that an assignment message does not itself confirm an order or start duty. Keep browser write methods disabled unless a separately approved workflow defines them.

**Exit**

- In-scope Vessel messages produce exactly the allowed draft/review outcome or an explicit error; no unauthorized confirmation or operational action occurs.
- Review records remain source-linked and stable under replay.
- Human business acceptance of representative Vessel cases is recorded separately from technical test success.

### Phase 4 — End-to-end acceptance in an isolated environment

**Work**

- Run focused ingestion, Cash safety, Vessel lifecycle, API authorization/read-only, health-isolation, and replay tests.
- Run typecheck and lint for touched app code.
- Use isolated fixtures or a disposable database; never run tests against production business data.
- Verify acceptance evidence for both domains on the same source identifiers: source → original → domain processing → review surface.
- Include at least one expected success, one explicit review, one malformed/ambiguous input, one replay, and one recoverable processing failure per domain.

**Exit**

- Targeted tests, typecheck, and lint pass; any unrelated baseline failure is separately identified.
- Acceptance matrix is complete and reproducible; no secrets or message bodies are included in routine logs/reporting.

### Phase 5 — Release readiness and controlled deployment

**Work**

- Review the exact final diff against the baseline and verify Cash-protected paths have authorized scope.
- Confirm backup/rollback procedure, exact image, restart scope, health checks, and an observation window.
- Deploy only with separate explicit production approval; restart only the named required service. Never restart WhatsApp bridges for an app-only issue.
- After approval, observe bounded per-account/per-domain counts and cursor errors; do not modify data to make metrics appear healthy.

**Exit**

- App and required worker processes remain healthy through the observation window.
- In-scope new messages advance from source to both expected domain processing queues and review surfaces.
- Pending/error trends and any exclusions are reported. Stop and escalate if errors rise, scope expands, or financial/operational side effects appear.

## 6. Agent execution contract

Every implementation task must begin with the following compact brief:

> **Goal:** complete only the assigned phase and its exit criteria in this plan.  
> **Allowed paths:** list exact paths before editing.  
> **Forbidden:** unrelated cleanup/features, README-driven assumptions, production test writes, secret access, WhatsApp sends, cursor resets, deployment/restarts unless expressly approved, and financial/operational actions.  
> **Cash gate:** do not edit a Cash-protected path unless the exact Owner exception is attached to the task.  
> **Evidence required:** changed paths, tests/commands and results, before/after bounded metrics, remaining risks, and explicit exit-criteria status.  
> **Stop conditions:** unexpected dirty-file conflict, missing authorization, unclear data scope, destructive/replay risk, secret exposure risk, failed safety test, or a result requiring broader changes.

Agents must report a blocker and stop rather than widen scope. The coordinator decides whether a new, separately authorized task is needed. Do not convert a blocked task into unrelated cleanup.

## 7. Acceptance dashboard

Report these measurements per account, chat, and domain, with timestamps:

- Source reader available and last successful observation.
- Cursor mode, position, last observation, and error code (never credentials).
- Original rows and source-event rows; duplicate/replay behavior.
- Per-domain pending, processed, and error counts; latest source and processing timestamps.
- Cash review classification counts and explicit proof that financial action remains `NONE`.
- Vessel draft/review counts and source-linked event/provenance checks.
- Test/typecheck/lint results, app health, worker process status, deployment identity, and human acceptance status.

Counts alone do not prove coverage. “Zero errors” is not a pass if a source/chat is missing, excluded without explanation, or never observed.

## 8. Current plan decision

- WA-02 token access was repaired and new ingestion plus both domain processors were observed working in review-only mode.
- WA-01 group compatibility errors remain unresolved. Do not switch them to archive mode until the live-only versus historical-replay decision is made and its acceptance boundary is approved.
- The inspected queue had zero pending/errors, but aggregate processed totals do not prove all intended chats or business cases work.
- Cash behavior work remains gated by a path-specific Owner exception. Continue only the already authorized WA-02 ingestion behavior; do not infer broader Cash authorization from it.
