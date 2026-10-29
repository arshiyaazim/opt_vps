# AL-RIFA’I AI Platform

**HISTORICAL LEVEL B — CLOSED BY OWNER** (11 October 2026). Historical research, reconciliation, representation qualification, Option A validator repair and related historical-only work are closed. Original acceptance and PASS/FAIL/PARTIAL/BLOCKED/UNVERIFIED findings remain reference evidence; the old validator-repair recommendation is superseded. No import, posting or registry activation is authorized. Do not reopen without new explicit Owner authorization.

> CLOSED — HISTORICAL REFERENCE ONLY.
> This document records past investigation and is not a current production health report, active implementation task or authorization to resume historical reconciliation.
> Preserve original findings. Do not reopen without explicit Owner authorization.

This notice applies to the historical-only references indexed in the [canonical Safe Handoff](NEXT-SESSION-HANDOFF.md); current infrastructure, employee/program contracts and live PAY-001–012 remain applicable. Historical Level B is not a prerequisite for current Escort Order processing. Current priorities are authorized incoming Escort Client messages (including verified Escort Hridoy contacts) through identity/direction verification, vessel/master extraction, draft, Admin assignment, client confirmation and controlled persistence; and current/future authorized Admin-to-Accountant messages under live PAY rules. Use actual Owner-supplied WhatsApp examples and preserve original/forwarding context. No operational implementation or activation is authorized by this documentation update.


Canonical organization architecture and navigation entry point. Updated 11 October 2026, Asia/Dhaka. Target architecture and deployed infrastructure are separate: D12 approves AL-RIFA’I as the future business authority; production ownership transfer, implementation and cutover are not authorized.

## Platform Identity and Mission

AL-RIFA’I integrates business operations and AI automation for security/manpower services, vessel escort and lighter-vessel operations, employee identity/management, program registration/assignment/attendance, release/settlement, cash ledger/financial controls, business messaging/source evidence, and administrative AI assistance/reporting. This is the platform mission; the current private Phase 1 application implements a qualified historical workspace rather than all target operational capabilities.

## Organization Architecture

Applications: **AL-RIFA’I** is the approved primary target business application. **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** is intended for AI orchestration and controlled tool execution; it is not deployed here or a business authority.

Reference and supporting applications: **[Fazle-Core](https://github.com/arshiyaazim/fazle-core)** supplies existing parsing, identity, routing, employee/program/attendance, release/settlement, financial, approval and messaging functionality for reuse assessment. Its existing production responsibilities remain protected. **[Escort Operations](https://github.com/arshiyaazim/escort-operations)** and **[Cash Control](https://github.com/arshiyaazim/cash-control)** are independently developed components requiring reuse/integration assessment; no local deployment or operational integration is verified.

Services: **[WhatsApp MCP](https://github.com/arshiyaazim/whatsapp-mcp)** is deployed independently for two active accounts. **[GitHub MCP](https://github.com/arshiyaazim/github-mcp-server)**, **[Filesystem MCP](https://github.com/arshiyaazim/servers/tree/main/src/filesystem)** and **[Memory MCP](https://github.com/arshiyaazim/servers/tree/main/src/memory)** are intended scoped supporting tools; no local VPS deployment is verified. Repository existence does not establish service installation, activation or granted access.

Infrastructure: existing shared PostgreSQL, private evidence/file storage, Docker runtime/container management and internal networking support the current platform. Authentication/authorization, logging/monitoring and recovery mechanisms have documented limits: private validation authentication is not final per-user production identity, operator checks are not continuous monitoring, and recovery tooling is not permission to run it. See [VPS_MAP](docs/VPS_MAP.md) for verified infrastructure and [recovery guide](infra/recovery/al-rifai/README.md) for retained guarded tooling.

## Logical Directory Organization

The existing `apps/`, `services/`, `infra/` and `docs/` roots support the intended organization. Component locations below describe logical placement; proposed locations are not created or deployed by this document.

| Component | Intended logical location | Verified existing filesystem / status |
|---|---|---|
| AL-RIFA’I | `apps/al-rifai/` | `/opt/vps/apps/al-rifai`; private Phase 1 deployed |
| Hermes Agent | `apps/hermes-agent/` (proposed) | No canonical local directory/deployment found |
| Fazle-Core | `apps/fazle-core/` (proposed reference location) | Remote reference; no canonical local directory/deployment found |
| Escort Operations | `apps/escort-operations/` (proposed) | Remote independent component; no canonical local directory found |
| Cash Control | `apps/cash-control/` (proposed) | Remote independent component; no canonical local directory found |
| WhatsApp MCP | `services/whatsapp/` | `/opt/vps/services/whatsapp`; source in `source/`, shared deployment definition and qualification evidence |
| GitHub MCP | `services/github-mcp/` (proposed) | No canonical local directory/deployment found |
| Filesystem MCP | `services/filesystem-mcp/` (proposed) | No canonical local directory/deployment found |
| Memory MCP | `services/memory-mcp/` (proposed) | No canonical local directory/deployment found |
| Shared infrastructure | `infra/` | `/opt/vps/infra`; PostgreSQL Compose and guarded AL-RIFA’I recovery tooling |
| Organization documents | `docs/` | `/opt/vps/docs`; application policies and service contracts remain in their verified component paths |
| Organization entry point | `README.md` | `/opt/vps/README.md` |
| Current AL-RIFA’I recovery status | `AL-RIFAI-CURRENT-RECOVERY-STATUS.md` | `/opt/vps/AL-RIFAI-CURRENT-RECOVERY-STATUS.md` |
| Canonical Safe Handoff and historical evidence | `NEXT-SESSION-HANDOFF.md` | `/opt/vps/NEXT-SESSION-HANDOFF.md` |

Runtime state, restricted configuration and backup staging remain outside source under `/var/lib/vps`, `/etc/vps` and `/var/backups/vps` respectively. No directory relocation, duplicate checkout or new service is implied.

## Application Responsibility and Data Ownership

AL-RIFA’I is the approved target sole logical writer for Employee, Program, Attendance, Release, Cash Ledger, Application Raw Message Evidence and Application Media Evidence **after a separately approved transition**. Existing Fazle-Core commands/FPE ledger, transport ingestion and every current operational writer preserve authority in the meantime. The ledger has not transferred; AL-RIFA’I Phase 1’s archival/read-only boundary has not become active business authority.

Fazle-Core is a functionality/reference source; supporting apps submit scoped intents or read owner results under a qualified future contract. Hermes may execute authorized tools and prepare sourced drafts; it cannot infer approval, write SQL/business records directly or send autonomously. Each WhatsApp bridge exclusively owns its native SQLite/session/transport state. Application evidence ownership is separate from transport ownership. Shared infrastructure access remains controlled and least privilege; sharing PostgreSQL does not authorize cross-application writes.

The [Application Responsibility & Data Contract Specification](services/whatsapp/qualification/application-contract-20261011/specification.md) contains the full seven-record map, permissions, reliability and compatibility gates.

```text
D12_TARGET_ARCHITECTURE = APPROVED_AL_RIFAI
D12_PRODUCTION_OWNERSHIP_TRANSFER = NOT_AUTHORIZED
D12_CURRENT_PRODUCTION_WRITERS = PRESERVE
D12_IMPLEMENTATION_AND_CUTOVER = PENDING_SEPARATE_APPROVAL
```

These are documentation decision labels, not runtime configuration variables.

## Message and Business Lifecycle

WhatsApp Capture → Raw Evidence → Extraction → Identity → Domain Routing → Business Validation → Draft/Approval/Posting → Authorized Response.

This summarizes a target contract, not an active AL-RIFA’I ingestion pipeline. Preserve original evidence and source provenance; distinguish sender identity, employee mobile and payout destination. Extraction, approval, financial posting and message sending are separate authorized operations. Release does not imply program completion, settlement approval or payment completion. Current outbound WhatsApp grants remain denied.

## Security and Reliability

Account isolation and one native bridge writer per account protect session/transport state. Least-privilege MCP scopes and per-actor authorization govern every operation; an incoming sender or AI inference cannot grant approval authority. Domain idempotency, duplicate protection, immutable audit provenance and one financial posting boundary prevent replay and double posting; complete future application guarantees still require implementation and qualification.

Production WhatsApp restart policy remains manual (`no`); restarts, deployments, account activation and cutover require separate explicit approval. Failures retain evidence and review state rather than silently posting or retrying uncertain payments/sends. Existing mobile-only WhatsApp backup, accepted VPS-history-loss/re-pairing risk and deferred additional recovery remain owner decisions. AL-RIFA’I recovery tooling retains its execution locks; shared PostgreSQL recovery requires separately authorized verification and cutover. See the canonical guides for actual boundaries.

## Current production state — 2026-10-29

- Application image: `sha256:cace72aab3bbeff80abd4eafda76b55ea0de439c0dbda4b9e0f493bbcda36ed2` (source `67ec02b`).
- Mode: `ALRIFAI_UNIFIED_AUTH_MODE=shadow`. Login rate limiter removed.
- Users: 3 Cash Portal accounts (1 ADMIN Owner, 2 USER).
- Migrations: 0031 applied (cash submissions), 0032 not applied, 0033 applied. Ledger baseline 32.
- Freeze: 0 current postings.
- WhatsApp WA-01: degraded (1 of 9 approved chats failing; diagnosis recorded; fix deferred by the Owner).
- Details and open items: [`NEXT-SESSION-HANDOFF.md`](NEXT-SESSION-HANDOFF.md) → "CURRENT STATE — 2026-10-29". Audit and decision record: [`apps/al-rifai/docs/AUDIT-20261028-CASH-LOGIN.md`](apps/al-rifai/docs/AUDIT-20261028-CASH-LOGIN.md).

## Current Qualification Status

### Unified Super Admin authentication — 28 October 2026 (stages 1–3 complete)

The Owner's existing Cash Portal username and password remain the single unified
Super Admin credential. Migration `0033_unified_auth_sessions.sql` is applied
(ledger 31 rows), and the verified image
`sha256:2c0833c4…` (source commit `a32c9ef`) is deployed with
`ALRIFAI_UNIFIED_AUTH_MODE=shadow`. In shadow the new `/login` verifies the Cash
credential and reports it, but authorises **no** protected route; protected pages
still answer with the legacy Basic challenge, exactly as before shadow mode, and
the `validator` guard remains the fallback. Two 28 October defects (a login
redirect loop, then a missing Basic challenge that made protected pages
unreachable by click) are fixed in `cc10ed8` and `a32c9ef`. Account id, password
hash, version, sessions and Cash postings are unchanged. `on` mode is **not**
enabled and requires a new explicit Owner authorization plus the Owner's personal
login confirmation. Record:
[release candidate](apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md).

### AL-RIFA’I operational checkpoint — 21 October 2026

At **07:05:32 CEST (+02:00)**, `al-rifai-app-1` was observed running and
Docker-reported healthy (restart count `0`); `node --version` inside that
container returned `v22.23.3`. A host-side health GET had returned
`{"status":"ok"}` at 06:46:11 CEST. These are timestamped observations, not
an ongoing availability guarantee, and do not establish WhatsApp bridge
health or sync completion.

The Owner-approved, path-limited change in `apps/al-rifai/compose.yaml` makes
only the wa-01/wa-02 control-directory mounts read-write. Only the AL-RIFA’I
`app` service was recreated. Host directories are mode `0710`; both sockets
were verified from the app container as present and readable/writable.
The Cash source-development freeze recorded at this 21 October checkpoint was
later superseded by the Owner's scoped 25 October development-unfreeze
authorization. Production financial controls and activation restrictions remain
in force. No payment or employee data and no financial write were involved.
Full details and limitations are in the
[current recovery status](AL-RIFAI-CURRENT-RECOVERY-STATUS.md) and
[canonical handoff](NEXT-SESSION-HANDOFF.md).

### Current VPS recovery status — 20 October 2026 (continuation update)

This update supersedes the operational claims in the dated 11 October
reconciliation below; that section remains historical evidence. Its 20
October application-stopped state is superseded only by the dated 21 October
checkpoint above. The Owner has
authorized bounded implementation changes for WhatsApp replication,
identity enrichment, Cash/Vessel processing and frontend integration, with
no automatic financial posting and no production restart/deployment until
Cash isolation is verified.

Read-only PostgreSQL checks confirmed applied migrations 0020/0021 and 213
immutable-source rows from five WA-01 direct chats (111 incoming, 102
outgoing); WA-02 has no copied rows. Processing currently contains only 213
`archive/pending` rows, contacts are empty, and the 0020 archive tables are
empty. Migration 0022 and its cursor/source-event tables are not applied,
although the uncommitted source worker expects them. The worker's eight-chat
scope (five direct, three group) and message-processing frontends remain
runtime-unverified.

Offline verification now passes for the focused integration tests, application
type-check/build, targeted ESLint, and WhatsApp metadata tests. `list_messages`
exposes the source `push_name` separately from its display label. No migration,
live data write, WhatsApp send, start, restart or deployment occurred. The
current source still has a candidate API host that can start a review-only
Cash sync when invoked; production isolation is not yet proven. The stopped
app remains on the old image after its socket bind-mount failure, while the
candidate image is not deployed. See the [current AL-RIFA’I continuation
status](apps/al-rifai/README.md) and [canonical recovery handoff](NEXT-SESSION-HANDOFF.md) for the complete
evidence and remaining gates.

### Current WhatsApp operations reconciliation — 11 October 2026

**HISTORICAL SNAPSHOT — superseded by the 20 October recovery status above.**

**RUNNING:** private AL-RIFA’I read-only workspace and shared PostgreSQL; connected wa-01/wa-02 transport/MCP, each with one native writer. WhatsApp uses its own `vps-whatsapp_whatsapp-private` network; app/PostgreSQL use `vps-backend`. No AL-RIFA’I MCP consumer, webhook intake or active operational writer is connected. Auto media download/webhooks remain disabled; OCR/transcription are not operationally connected.

**IMPLEMENTED BUT UNVERIFIED** for current intake: offline source extractors, pure lifecycle candidates and pinned Fazle-Core reference modules. **PLANNED:** configurable business contact/group registry, individual RBAC/audit and controlled draft/command/evidence interfaces. **BLOCKED:** complete current-message Escort and Accounts workflows pending these boundaries and parser qualification. **HISTORICAL/CLOSED:** Historical Level B is **CLOSED BY OWNER — HISTORICAL REFERENCE ONLY**.

The separate Sites AL-RIFA’I project has a succeeded version-10 publication, platform access mode `public`, D1 binding `DB`, and no Site MCP server. It is not the private VPS deployment, a verified proxy to it, or proof of current business writer authority. Retained source matches its recorded version-10 commit; current application access enforcement/runtime overrides and external Core deployment remain unverified. See [application architecture](apps/al-rifai/README.md#current-architecture-and-operations-readiness--11-october-2026) and [current audit/handoff](NEXT-SESSION-HANDOFF.md#current-whatsapp-operations-foundation-and-documentation-reconciliation--11-october-2026) for exact evidence and acceptance gaps.

| Evidence category | Status and limit |
|---|---|
| Verified production state | Documentation audit: wa-01/wa-02 HTTP 200 and connected, each with one native writer/FLOCK owner; wa-03 inactive/no writer. AL-RIFA’I and PostgreSQL container health reports healthy. Existing private Phase 1 and integration-disabled configuration preserved |
| Prior pairing evidence | Latest supplied audit found wa-03 unpaired; not freshly rechecked by opening SQLite in this task |
| Offline-qualified behavior | Employee/program lifecycle and isolated SQL qualification; CAP-4 and request-budget review evidence retained. These results do not establish live application integration |
| Approved/proposed architecture | D12 AL-RIFA’I target approved; supporting-app adapters and undeployed service locations remain proposals |
| Pending implementation | Target command/evidence boundaries, FPE continuity, actor delegation, reader compatibility and application integrations; no production transfer authorized |
| Pending acceptance | Actual adapter/client compatibility, rollback/recovery, source-bound historical promotion and appropriate production acceptance remain gated |

MAX_MCP_CLIENTS=4 limits sessions; request-concurrency and response-budget enforcement were not fully implemented. Prior wa-01/wa-02 cutovers accepted separate bounded content-free windows. There is no claim of 24-hour stability, unrestricted production workload readiness, complete history/media qualification or complete WhatsApp policy compliance. External Fazle-Core live ownership/health is not verified by this VPS audit.

## Documentation Navigation

- [Root organization README](README.md), [verified VPS map](docs/VPS_MAP.md), [current AL-RIFA’I recovery status](AL-RIFAI-CURRENT-RECOVERY-STATUS.md), [canonical Safe Handoff and historical evidence](NEXT-SESSION-HANDOFF.md).
- [Owner business policy](apps/al-rifai/docs/OWNER_BUSINESS_POLICY.md), [versioned business rules](apps/al-rifai/docs/owner-business-rules.json), [employee/program qualification summary](apps/al-rifai/docs/EMPLOYEE_PROGRAM_QUALIFICATION_SUMMARY.md).
- [Application Responsibility & Data Contract Specification](services/whatsapp/qualification/application-contract-20261011/specification.md), [Phase 2A decision register](apps/al-rifai/docs/PHASE2A_DECISIONS_REQUIRED.md).
- [AL-RIFA’I application README](apps/al-rifai/README.md), [WhatsApp source README](services/whatsapp/source/README.md), [WhatsApp operational plan](whatsapp-mcp-plan.md), [AL-RIFA’I recovery guide](infra/recovery/al-rifai/README.md).
- [Phase 1 report](apps/al-rifai/docs/PHASE1_REPORT.md), [request/response-budget review](services/whatsapp/qualification/request-budget-review-20261011/report.md), [wa-01 bounded acceptance](services/whatsapp/qualification/wa01-cap4-live-20261011/report.md), [wa-02 bounded acceptance](services/whatsapp/qualification/wa02-cap4-live-20261011/report.md).

Application README’s 8 October installation/path proposals and old decision-register alternatives are historical. Source README documents available upstream features; production consumer policy restricts them. Current VPS_MAP/handoff prevail for deployed facts; approved owner policies prevail over earlier identity/lifecycle advice. Recovery commands/examples do not grant execution authorization. Historical reports retain their original evidence dates and limits.

## Development and Release Governance

Audit → Specification → Owner Approval → Isolated Implementation → Offline Qualification → Deployment Approval → Controlled Cutover → Acceptance → Safe Handoff.

Approval is scope-specific. Approved business rules remain binding, but target architecture approval does not authorize source changes, migration, deployment or production writer transfer. Recommendations never constitute execution authorization. Reuse must preserve owner-approved policy and pass compatibility/acceptance gates before integration.

## Owner Cash Domain Development Unfreeze — 25 October 2026

The Owner has removed the previous development freeze for authorized Cash,
WhatsApp, Message Mirror, Vessel, and UI integration work. Source changes and
isolated tests may proceed within the exact authorized scope. Preserve verified
identity and recipient checks, PN/LID routing, duplicate protection, approval
and review controls, and original evidence. Uncertain cases remain in review;
do not automatically approve or post financial transactions.

This does not authorize production database changes, migration, deployment,
service or Bridge restart, Live Sync activation, historical backfill, WA-02
permission expansion, or financial posting. WA-02 remains identity-only.
Current boundaries are maintained in `AGENTS.md` and
`NEXT-SESSION-HANDOFF.md`; the advisory path check in
`apps/al-rifai/scripts/cash-freeze-guard.mjs` is not an approval or production
gate.

## Documentation Maintenance

| Canonical document | Responsibility |
|---|---|
| Root README | Organization architecture and navigation |
| VPS_MAP | Verified deployed infrastructure |
| Owner policy and versioned rules | Authoritative approved business meaning |
| Data Contract Specification | Ownership and integration requirements |
| NEXT-SESSION-HANDOFF | Latest operational state and one next-task recommendation |

Keep one authoritative copy of each policy/specification and one Safe Handoff. Update documents in place; link to detailed evidence rather than duplicating policy registers, infrastructure inventories or chronological logs. Label target, deployed, offline-qualified and historical claims explicitly. No runtime change results from a documentation decision.


AL-RIFA’I workflow increment — 15 October 2026 (Asia/Dhaka): actual Cash and canonical Escort Roster source/API/frontend integration is prepared in the canonical app. Immutable candidate images are built; no production migration/deployment/financial activation. See [concrete release, verification and exact remaining gates](apps/al-rifai/docs/WORKFLOW_RELEASE.md) and [machine manifest](apps/al-rifai/data/workflow-release.json). Current persisted business state remains 51 v1 extractions / 0 canonical programs. Media OCR, verified rate/attendance feeder, full contact directory and SQL/live acceptance remain incomplete; do not describe the whole app as finished.


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
