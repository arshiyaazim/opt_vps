> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# AL-RIFA’I — Phase 2A Decisions Required

Original date: 8 October 2026, Asia/Dhaka. D12 reconciled 11 October 2026 after explicit owner approval of Option A, target architecture only. Earlier alternatives and business-rule proposals outside D12 are retained historical evidence; approved owner policy and the qualification summary take precedence, including superseding D03 identity advice. Nothing here authorizes production changes. Evidence/gap IDs refer to PHASE2A_GAP_ANALYSIS.md. Stage details are in PHASE2_IMPLEMENTATION_PLAN.md.

Only material architecture, integrity, access, business policy and acceptance decisions are listed. Routine component names, colors and development duration are not administrator decisions. Recommendations are supported defaults where evidence exists; otherwise no rate/policy is invented. Existing private Basic authentication, immutable historical evidence and infrastructure remain unchanged pending approval.

## Decision register

| ID | Decision | Recommended position | Blocks |
|---|---|---|---|
| D01 | Private accountable login/session/identity ownership | named staff identities, private initially; choose supported provider/local approach explicitly | G01/G28; 2B authorization, all accountable writes |
| D02 | PAYMENT RULES APPROVED: Admin direct, Staff pending Admin | PAY-001/PAY-003/PAY-004: authorized successful WhatsApp/Admin entry directly Confirmed; Staff approval by authenticated Admin | Named sessions/grants remain implementation gates; no extra payment approver |
| D03 | APPROVED employee-mobile-v3 | Employee ID = normalized source-role-proven mobile; technical internal ID and payout separate; PAY-005/EMP-001–006 | Registry adapter remains implementation; prior internal-ID-primary proposal superseded |
| D04 | Category/employment history and eligibility | shared personnel model; category/duty/auth role separate, effective history | G04/G09/G13/G17; assignment/payroll rules |
| D05 | Operational program/client/vessel reference rules | unique internal reference and staged required fields; preserve unknown historical fields | G06/G07/G11; program registration/client relation |
| D06 | Program/assignment/completion state transitions | explicit state machine, replacement history and cancellation reasons | G09–G11/G15; operational lifecycle |
| D07 | Calendar/vessel attendance units, shifts and corrections | separate contexts, approved entries/corrections; no assumed duty formula | G12–G14/G17; attendance and salary basis |
| D08 | Salary, food, conveyance, adjustment and advance calculation | versioned approved policy; no inherited fixed food/rate assumption | G17/G18/G22; calculation/settlement |
| D09 | Personnel/release/receipt documents and privacy | private persistent evidence storage and authorized metadata links | G05/G15/G28; verification/document flows |
| D10 | Historical matching/duplicates/promotion and original evidence | reviewed candidates with source-bound approval, never automatic active conversion | G08/G16/G23/G24; controlled promotion |
| D11 | POSTING POLICY APPROVED; accounts/balances still evidence-dependent | PAY-001–012: one atomic alrifai journal; no extra receipt/Accountant approval; unknown opening remains Unknown | Account/category/reversal details and activation remain gates |
| D12 | APPROVED target: AL-RIFA’I business authority | Option A approved; preserve current production writers/FPE; production transfer NOT AUTHORIZED | G07–G10/G27/G30 remain implementation, compatibility and deployment gates |
| D13 | Reports/invoice issuance/client visibility | core operational reports first; approved invoice template/rules before issuance | G25/G26; reporting/billing scope |
| D14 | Qualification environment, recovery/acceptance and rollout | isolated tests/restore on existing PG deployment, private browser E2E, separate rollout approval | G29; 2F, backup/recovery and canonical rollout |

## D01 — Accountable identity and sessions

Question: Who may log in privately, and which system owns named user identity, credentials, session lifetime, revocation and logout? Are Employee/Client self-service accounts required in this rollout or deferred?

Options:

- Existing trusted organizational identity provider, if available and maintainable: avoids a parallel password store but needs verified provider integration/session policy.
- Local named office accounts: works without external identity service but requires password/reset/session security and administrator lifecycle responsibility.
- Shared Basic validator only: adequate for the existing private read-only baseline, insufficient for individual operational approval/audit accountability.

Recommendation: retain current Basic during audit; select named staff identities for private writes, deny public registration, defer self-service Employee/Client access unless expressly needed. No evidence establishes an available organizational identity provider, so provider choice has no automatic default. Existing UI signout is a stale Sites link, not working Basic logout.

Consequence: approval/audit actor identity and all sensitive access depend on this. Blocked: accountable mutation APIs and user administration; read-only historical workspace can continue. Evidence E14/E20; G01/G28.

## D02 — Permissions, delegation and separation of duties

**Owner resolution — payment-posting-v1, 11 October 2026:** PAY-003 permits direct authenticated Admin payment entry without an additional approver; PAY-004 allows authorized Office Assistant/Operations/Staff entry pending authenticated Admin approval of the exact version. PAY-001 authorized successful Admin wa-01→Accountant sending is business confirmation, with no additional Accountant/receipt/manual approval. Server-authenticated identity and granted role, never user-supplied actor labels, control access. Remaining named login/session/grant implementation and non-payment permissions are unresolved; do not reopen these payment decisions. Options/recommendations below are retained earlier proposals, superseded for payment where inconsistent.

Question: Approve the proposed role matrix and name which roles may verify employees, approve attendance corrections, cancel/replace assignments, verify release slips, approve payments, post cash and approve reversals/settlement. Can a person approve their own draft, and are thresholds/dual approvals needed? Which sources/reports may each audience view/export?

Options:

- Named permissions with separate entry, approval and posting authority: stronger traceability; small-office staffing may need explicitly documented exceptions.
- Admin-only approval, delegated entry/posting: simpler first rollout, but administrator bottleneck.
- Broad all-staff mutation permissions: simpler navigation, weak finance/privacy boundaries; not recommended.

Recommendation: deny by default; Office/Operations submit within scope, Accountant prepares/posts after approval, Admin or explicitly delegated approver decides. Prevent self-approval where staffing permits; record approved exceptions explicitly rather than hide them in code. Personnel designation never automatically confers auth permission. Raw financial/private conversation access is a separate scoped permission, not ordinary program access. No monetary threshold invented.

Consequence: dictates server-side authorization and audit events; read permission, edit draft permission and approve/post permission differ. Blocked: write access and approval engine; ordinary private read-only baseline unaffected. G01/G02/G14/G19/G28.

## D03 — Employee identity, contacts and verification

**Existing approved resolution:** employee-mobile-v3 / EMP-001–006 / PAY-005 govern mobile-valued Employee ID, aliases and separate payout. Earlier recommendations below for internal-ID-primary identity are historical and superseded; no duplicate registry or identity reapproval required.

Question: What official employee code/identification is used, what makes registration verified, which fields/documents are mandatory, who resolves duplicates and what happens when contact numbers change or are shared? Is mobile currently used as office employee ID, and must that legacy alias remain searchable?

Options:

- Stable internal ID plus unique approved business employee code, with separate contacts and payout destinations: handles number changes and history cleanly.
- Phone as primary employee identifier: matches legacy labels but risks reassignment/shared-number confusion and conflating payout identity.
- External HR identity if an authoritative existing registry is supplied: reuse rather than build duplicate personnel master.

Recommendation: stable internal ID, explicit code, legacy phone aliases/contact verification as supporting evidence. Payout number never creates or automatically matches employee. No available authoritative HR register was supplied; administrator must provide/confirm initial verified personnel source. Employee names alone are not identity.

Consequence: determines personnel FKs, historical matching and finance beneficiary integrity. Blocked: reliable employee registration/assignment/payroll promotion. G03/G04/G09/G17/G24; E07/E08/E17.

## D04 — Category, employment and assignment eligibility

Question: Confirm designation vs employment category, effective status/transfer rules, active/inactive/terminated behavior, category-specific assignment eligibility, document needs and whether multiple categories may apply concurrently. Which roles have office calendar attendance, vessel duty or both?

Options:

- One personnel entity with effective category/designation history and duty-role-specific rules: avoids separate databases for the ten named categories.
- One current category field with changes logged: smaller first scope but less explicit effective-period history.
- Separate employee models per category: justified only if genuinely different identities/legal records are required; no current evidence supports it.

Recommendation: common personnel model, effective history and assignment role separate. Vessel escort/security responsibilities share identity but may have distinct eligibility/duty/pay rules; office/marketing staff may have distinct attendance/pay basis. Supervisor employment label alone does not authorize money or corrections.

Consequence: constrains eligibility and policy versions without inventing salary terms. Blocked: applicable category assignment/attendance/payroll rules. G04/G09/G13/G17.

## D05 — Program reference and required data

Question: Confirm program numbering/uniqueness, client identity and mandatory fields at registration, assignment and duty start; allow missing vessels/contact at draft stage? Do vessel identifiers or client master records already exist outside the supplied project? Is a program one voyage, one vessel movement or another office-defined unit?

Options:

- Unique internal program reference with separate client/vessel/source references and staged completeness: supports draft/unassigned work without inventing unknown data.
- Existing external authoritative program reference: use if supplied with owner/schema/collision rules.
- Vessel/date/phone composite as sole program identity: unsafe when uncertain fields/replacements/repeated voyages occur.

Recommendation: internal stable program ID plus approved unique business reference; preserve historical source reference separately. Operational completeness is stricter than the sparse historical parser. Do not invent IMO, client or vessel names; do not force historical incomplete release records through registration validators. Standalone vessel registry only if authoritative identification need is established.

Consequence: client relation/reference indexes and program form requirements. Blocked: finalized program create API/schema. G06/G07/G11; E06/E16 deliberately exclude client/slip fields from historical parser.

## D06 — Assignment and program state rules

Question: Confirm state sequence, multiple escorts/security personnel per program, simultaneous programs per employee, planned vs actual dates, replacement effective boundary, cancellation before/after duty, distinction between completed and released, completion verifier and reopening rights. Can master/sukani contacts be unknown at duty start?

Options:

- Explicit versioned assignments and guarded transitions: preserves duty/payment history, supports replacements.
- One current escort text field with status edits: simple but cannot reliably preserve replacements or concurrent history.
- Delegated canonical Core commands: only if D12 selects a qualified accessible Core with defined authority.

Recommendation: assignment history plus stage guards and accountable reasons; never overwrite previous assignment/duty when replacing/cancelling. Historical Active/Running labels and missing end date are not actual current duty. Operational completion requires verified duty/release evidence; silence/elapsed days never imply it. Exact terminal statuses and roster cardinality have no assumed default.

Consequence: controls transactional state machine and relation cardinality. Blocked: assignment, replacement/cancellation/duty-start/completion. G09–G11/G15; E09.

## D07 — Attendance, shift boundaries and duty quantity

Question: Define day/night start/end boundaries, timezone and business date, duty units (shift/day/hour), partial duties, overnight/cross-date handling, overlap policy, leave/absence/holidays where applicable, total-duty rounding and corrections/approval after completion/payment. Which source establishes attendance?

Options:

- Separate calendar attendance and assignment-linked vessel duty under distinct context rules: shared identity, clear semantics.
- One generic attendance row with constrained context-specific links/units: feasible if approved rules fit one model.
- Derive all attendance from program start/end calendar dates: no evidence supports this; misses absence/replacement/shifts/corrections.

Recommendation: distinct business contexts; approved actual duty entries, not elapsed calendar days. Asia/Dhaka is the report/user-facing timezone; actual office shift boundaries must be confirmed. Do not assume inherited half-day calculator units are approved attendance policy. Corrections preserve original entry and approval history; paid corrections require reviewed finance adjustment.

Consequence: determines unique slots, overlap constraints and salary basis. Blocked: duty total calculation and attendance acceptance. G12–G14/G17; E08/E09.

## D08 — Salary, food, conveyance, adjustments and advances

Question: Supply approved effective rates by applicable category/contract, salary basis, food treatment (deduction/reimbursement/included), conveyance, allowance/deductions, rounding, negative payable, overtime if in scope, advance recovery rules and required evidence. Who approves rate versions and exceptional adjustments?

Options:

- Versioned approved rate/policy tables with immutable draft calculation inputs: repeatable and historically explainable.
- Per-release manually approved rate/adjustments, recording exact basis and approver: workable initial scope if no regular rate schedule exists.
- Reuse existing calculator constants/caller rates without policy approval: risks paying/deducting unsupported amounts; not recommended.

Recommendation: approved rule version or explicit approved manual basis with exact money arithmetic. No default salary or food amount. Existing calculateSettlement contains a fixed food deduction while message preview accepts explicit rate; neither establishes office policy. Conveyance/food/advance values stay independently explained; posted advances allocated once, never blindly subtracted twice.

Consequence: payroll may be prepared as an unapproved draft but cannot be represented as payable/settled until policy and basis are approved. Blocked: production calculation and settlement acceptance. G17/G18/G22; E08/E09.

## D09 — Documents, evidence access and retention

Question: Which employee/release/receipt documents are required, acceptable formats/size, storage owner/location, access/redaction rules, retention/deletion/legal requirements and approver? Can text-only releases qualify, and what evidence supports payout? How should unavailable media be obtained and reviewed?

Options:

- Private persistent file storage outside source with DB metadata/checksum/access links: fits existing VPS ownership separation.
- Existing authoritative document service, if supplied and verified: avoids duplicate storage but requires access/availability contract.
- Public assets/source folders or arbitrary external URLs as evidence store: violates privacy/persistence boundary; not recommended.

Recommendation: approved private persistent storage and restricted document metadata; retain original hashes and source attribution; missing image bytes remain explicit gaps. Do not invent document content from filenames. Verification requirements and retention are administrator policy, with no fabricated default. Raw conversations should be scoped/redacted separately from operational summaries.

Consequence: document validation/authorization/storage/backups and employee/release/payout verification. Blocked: authoritative document-backed verification and broader evidence access. G05/G15/G28; E11/E18.

## D10 — Historical review, matching and promotion

**Owner clarification — payment-posting-v1:** archives stay accessible and separate; historical native source/block/operation overlap is reconciled before an explicit batch import approval. Genuine repeated payments cannot be suppressed by employee/amount/date/text similarity. Old Core DB and unrecoverable manual records are accepted unavailable, with no restoration or fabricated reconstruction. No import is authorized by this documentation task.


Question: May any historical candidates become operational records, who approves exact candidate versions, what identity/duty/receipt proof is required, how are possible repeats/uncertain matches decided, and will original exports/workbooks/media/live D1 data or independent attestations be supplied? Should some historical information remain permanently read-only?

Options:

- Historical search only initially: safest core rollout, no automatic promotion; preserves evidence gaps.
- Controlled preview/matching/administrator approval with unique provenance mapping: supports selected genuine records while preventing repeated imports.
- Bulk automatic conversion from projections: risks duplicated employees/programs/payments and unverified authority; not recommended.

Recommendation: retain read-only history by default; controlled promotion only for explicitly selected, adequately evidenced candidates. Program/vessel links can remain unknown in review; do not invent them. Source identity attestation is not payment receipt proof. Possible duplicate instructions remain excluded until decision; do not delete raw evidence or silently merge names. No import is performed in Phase 2A.

Consequence: determines promotion scope/queue, provenance schema and reconstruction test completeness. Blocked: production promotion and complete original-source qualification; core new manual operations can proceed independently after other decisions. G08/G16/G23/G24; E10/E11/E17/E18.

## D11 — Cash ledger, balances, posting and reversal

**Owner resolution — payment-posting-v1:** PAY-001 successful complete authorized Admin wa-01→Accountant direct sending is Confirmed and immediately posting-eligible; no external receipt/Accountant reply/extra Admin approval prerequisite. PAY-003/PAY-004 resolve Admin-versus-Staff manual posting. PAY-007 requires one atomic alrifai posting identity/derived views; PAY-012 requires Unknown / Incomplete History where opening/earnings/inflows are missing, not zero. Actual cash accounts/opening evidence/category/controlled reversal specifics remain to be selected; old financial-proof proposals below are superseded only where inconsistent. Posting approval is policy, not implementation/import/cutover permission.


Question: Define cash/bank/mobile accounts in scope, currency, signed opening balances/date/evidence, cash received/paid classification, independent office expenses, advance vs salary vs reimbursement, transaction reference uniqueness, partial payment/settlement, approval and receipt proof, backdating limits, negative balance policy, reversal authority, overpayment/refund/recovery and whether full double-entry accounting is required. Approve runtime DB read/write/migration role separation.

Options:

- Operational cash ledger with explicit account, direction, evidence and allocation/reversal controls: enough for scoped received/paid/advance workflow, subject to accountant acceptance.
- Full double-entry accounting/chart of accounts: choose only if office accounting/reporting requirements demand it; materially broader scope.
- Treat current historical instruction totals/archive as cash balance: incorrect, because receipt/payment completion/opening balance is unverified.

Recommendation: select the smallest accountant-approved scope with explicit accounts/direction, evidenced posting and exactly-once references; maintain historical archive separately. A draft approval is not payout. Opening balance must be approved/proven, not derived from historical messages. Program relation optional for independent cash. Reversals append linked compensating entries; allocations cannot exceed posted payments/advances. Current alrifai_app owns tables; scope writer privileges without replacing existing PostgreSQL architecture after approval.

Consequence: active finance schema/transaction safeguards and recovery choices. No default balances, monetary ceilings or negative-balance rule provided. Blocked: actual posting, balance/reconciliation and settlement finalization. G02/G19–G22; E03/E07/E19.

## D12 — Approved target; production ownership preserved

Owner decision, 11 October 2026, Asia/Dhaka: **Option A — AL-RIFA’I as the target authoritative business application is approved.** Fazle-Core is the existing reference/functionality-reuse source; all its current operational commands, ingestion, FPE ledger and active integrations retain their present production authority until a separately approved transition. AL-RIFA’I Phase 1 remains read-only/archival. No external Core deployment is inferred from a repository.

```text
D12_TARGET_ARCHITECTURE = APPROVED_AL_RIFAI
D12_PRODUCTION_OWNERSHIP_TRANSFER = NOT_AUTHORIZED
D12_CURRENT_PRODUCTION_WRITERS = PRESERVE
D12_IMPLEMENTATION_AND_CUTOVER = PENDING_SEPARATE_APPROVAL
```

These are documentation decision labels, not runtime configuration variables.

The [Application Responsibility & Data Contract Specification](../../../services/whatsapp/qualification/application-contract-20261011/specification.md) is the single full ownership/integration contract. Its target map assigns Employee, Program, Attendance, Release, Cash Ledger, Application Raw Message Evidence and Application Media Evidence to one AL-RIFA’I logical writer each after an approved transition. Native WhatsApp stores remain bridge-owned; no competing financial posting authority is permitted.

Selection and PAY confirmation policy are resolved; implementation/cutover gates remain: existing-writer exclusivity, source-schema compatibility, identity/table mapping, idempotency, audit/source history, actor authentication, financial controls, reader compatibility and acceptance. Old Core DB/records are unavailable; no restoration/access/search prerequisite. Reference FPE posting code remains unchanged; continuity cannot require invented historical balances. No ledger has transferred. Existing infrastructure/schema/roles and active services/configuration remain unchanged. G07–G10/G27/G30; E05/E09/E12/E14 still inform those gates. This is a decision record, not an ownership-migration execution plan.

<details>
<summary>Historical 8 October D12 alternatives — superseded target selection, retained evidence</summary>

Question: Will `/opt/vps/apps/al-rifai` and existing alrifai PostgreSQL become the authoritative active office system, or is a separately existing Fazle Core intended to own employees/programs/finance? If Core is authoritative, provide a qualified contract/owner and access evidence; who owns each business responsibility and prevents duplicate writes?

Options:

- Local Next.js/PG owns Phase 2 active operations; later approved integrations submit drafts/domain commands to it: fits currently accessible canonical application and existing DB.
- Verified Core remains canonical and app is an authorized client: requires real source/schema/API/identity/permission/transaction evidence not supplied here; local mirror ownership must be explicit.
- Both independently own active records: creates conflicting truth and duplicate financial/assignment workflows; not recommended.

Recommendation: local existing PG is the practical candidate based on observed evidence, but administrator must confirm; source code's old Core correction guidance is not proof of current authoritative Core. Keep all live Core/WhatsApp/AI services disabled until separately approved. One authoritative implementation per responsibility; no duplicate conversation engine/backend or premature Hermes/9Router service.

Consequence: changes where writes/approvals/audit reside. Blocks final active schema/API design until ownership choice. G07–G10/G27/G30; E05/E09/E12/E14. Future message → identity → extraction → validation → draft/approval → domain write → authorized reply is an interface plan only, not integration authorization.

</details>

## D13 — Reports, invoices and client disclosure

Question: Select operational reports and period definitions, cash/advance/payroll reconciliation views, export access/redaction, release-slip layout, client bill/invoice template, numbering, bill basis/rates, tax/discount rules if applicable and whether clients may see their own program/completion/invoice data.

Options:

- Core program/duty/release and posted cash/advance/settlement reports first: uses qualified data with limited scope.
- Approved invoice generation/issuance with client/rate/numbering rules: broader deliverable after finance/client master decisions.
- Reuse historical bill snippets as authoritative issued invoices: unsupported; archive has 23 extracted objects, not issuance proof.

Recommendation: core operational reports first, reuse existing safe CSV/export patterns and source labels. Invoice template/issuance and client self-service require explicit policy/identity. No tax/rate/legal assumption supplied. Avoid redundant dashboards and reports that mix historical instructions, drafts and posted payments.

Consequence: affects 2E scope and optional invoice metadata; does not block foundational personnel/duty workflow. G25/G26; E04/E07/E18.

## D14 — Qualification, recovery and explicit rollout gate

Question: Approve isolated test/restore target on the existing PostgreSQL deployment, allowed test data/users and document handling, off-host backup destination/access/encryption/retention, recovery objectives, private browser acceptance owner and the scope of later canonical migrations/deployment/restart approval.

Options:

- Approved separate test database/schema with guarded test configuration, logical backup restore into separate target, private E2E and explicit rollout approval: measurable safety without replacing infrastructure.
- Transaction-scoped tests only: useful for migration/constraint proof but insufficient alone for multi-session API/browser/recovery qualification.
- Canonical database as unrestricted test target: not acceptable without a specific maintenance/restore plan and separate explicit authorization; not recommended.

Recommendation: isolate all writes/fixtures/restore qualification; fail closed if canonical DB selected; preserve snapshot/source hashes; independently verify recovery. Current Phase 1 backup/restore history does not select off-host retention/RPO/RTO for Phase 2. Actual interactive browser qualification is required; Phase 1 SSR/API evidence is not browser proof. Missing originals/media remain named limitations.

Consequence: determines safe test access and acceptance, not an implicit instruction to create databases/backups/restart services now. Blocked: Phase 2F acceptance and canonical rollout until approval/evidence. G29; E01/E16/E19/E20.

## Review and stop gate

Administrator may approve decisions/stages separately. Approval of this planning document alone is not authorization to apply migrations, enable writers, deploy, restart, publicly expose services or activate integrations. Implementation work requires explicit stage/scope authorization; routine choices within that authorized scope can then be resolved without repeated permission requests.

Phase 2A reports completed for supplied evidence, with **PHASE_2A_PARTIAL_EVIDENCE** because interactive browser/original-source/office-policy proof is unavailable. Source modifications 0; database changes 0; service restarts 0; deployment changes 0; external messages/provider API calls 0; Git operations 0. Only these three reports were created. STOP; wait for administrator review.

## Payment contract reconciliation history — 11 October 2026

Change reference payment-posting-v1 / PAY-001–012. Existing Owner Business Policy and owner-business-rules.json are canonical; parent register version/history are preserved. D02/D03/D10/D11/D12 above distinguish resolved Owner policy from remaining technical and account-balance inputs. Earlier questions/options remain historical evidence. The current single recommendation and task evidence are in NEXT-SESSION-HANDOFF.md; no implementation, import, schema, writer or runtime action is authorized.

## Owner-approved historical Level B acceptance — 11 October 2026

**Owner decision recorded; historical evidence acceptance only.** The Owner explicitly approved the exact pinned set of **1,486 structurally complete Level B payment blocks totaling BDT 824,718.00**, limited to the historical evidence boundary in the 11 October 2026 Historical Send-Success Evidence Reconciliation. The decision reference is `HIST-PAY-LB-20261011` and is a human decision-register reference, not a new PAY rule or machine policy version.

The accepted set is selected only by its original native message and logical block identities in the pinned private preview: manifest digest `4d54021989c9b53036b6e47f2bfaaf27760458d088e208f2a893c71738ebe6d6`; original report SHA256 `faef4a95e2b375d5e652117d6419dec69fa62522df0f0fb889ed5c56d5ad5fda`; private evidence SHA256 `b705ac79828b806ff38d6d1833b21b0c9cbfe51188328e4bdb2dd0b5489577f0`; exact sorted accepted block-ID set SHA256 `78e24b10764ae4d46061fb9ff17580ab83cf6bc034adb1835ef6950312ac2ec2`. Source/accountant projection SHA256 is `fd53465a7e34ab5eac7c4078f5f2cc5a91ff90db73a9716c10a27dff3a28113b`. These identifiers preserve the original preview; this approval does not select other rows by date or amount.

The approved provenance is Admin wa-01 → the approved Accountant direct chat. Preserve original sender, direction, native message ID, timestamp, source content, logical block spans and provenance for each approved identity. Preserve the pinned source/policy references, archive-overlap and Relay-linkage flags, and distinct native events including identical repeated messages. Missing technical acknowledgments, unavailable message revisions and incomplete historical coverage remain disclosed evidence limitations.

**Evidence distinctions:** Level A technical send-success records remain **0**. These Level B outgoing-history records have separately retained technical acknowledgment **NOT RETAINED / UNVERIFIED**; this is not a failed-send finding. The explicit Owner decision establishes **historical business-evidence acceptance for this exact set only**. It does not assert independently verified send-success, recipient delivery or external bank/mobile disbursement. No additional Accountant acknowledgment, receipt, bank proof or approval is required by this decision.

**Excluded:** all **66 Parser/Identity Review blocks** (known BDT67,235.00 plus six unknown amounts); all **10 media-only messages** with unknown content, logical block count and amount; incoming messages; outgoing nonpayment messages; other accounts/chats/groups/senders; messages outside the pinned subset; new/live/later-arriving or changed historical content; and unresolved employee identity or payout interpretation. The date window and amount alone never expand the approved set. Exclusions are unchanged from the pinned evidence report.

**Existing live policy remains payment-posting-v1 / PAY-001–012, unchanged.** This record is a separately approved historical evidence exception, not technical verification, a changed live confirmation rule or an operation permission. The existing machine rule register has no qualified non-executable, exact-manifest historical-acceptance record type. Adding this decision to active PAY rules or changing the pinned register would alter the existing policy/qualification boundary. Therefore the decision is recorded here and in the canonical handoff; **machine policy registration is BLOCKED** pending a separately qualified, non-executable representation. The existing register remains `employee-program-v4-lifecycle`, retains its 31 rules/five history entries and `productionExecutionAuthorized=false`; PAY-001–012 remain active and unchanged.

**Execution remains unauthorized.** This decision creates no employee, employee link, operation mapping, payment journal, Employee Ledger movement, cash-account movement or Daily Cash Register entry. Before any separately authorized future posting, resolve employee identity linkage and exact source-to-operation mapping; reconcile archive/Relay provenance for exact-once treatment; and qualify atomic, idempotent posting and applicable financial controls. No historical import, employee mutation, schema/migration, code, WhatsApp, Relay, runtime, configuration or deployment work is authorized here. Unknown employee/cash balances remain **UNKNOWN / INCOMPLETE HISTORY**.
