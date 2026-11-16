> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# CONTROLLED OPERATIONAL IMPORT PLAN

9 October 2026, Asia/Dhaka. **DESIGN ONLY — NOT IMPLEMENTED OR EXECUTED.**
This plan uses the existing canonical application and existing alrifai PostgreSQL database. It does not authorize imports, migrations, temporary databases, recovery actions, WhatsApp installation, service changes or deployment. Read [mapping audit](SOURCE_TO_OPERATIONAL_SCHEMA_AUDIT.md) and [risk report](DATA_QUALITY_AND_MIGRATION_RISKS.md) before choosing a batch.

## Smallest safe approach

Keep the already preserved 54 historical snapshot rows and file-based archives as the read-only evidence authority. No additional archive import is necessary. Start later with a small owner-selected historical program subset whose independent employee/program identity and actual business dates have been verified. Financial/payment/payroll/invoice promotion stays blocked until receipts, policy and operational target schema exist. No second app, schema, database, service or competing importer.

Implement one bounded operational-promotion mode within the existing canonical scripts/database.mjs workflow after explicit code approval; do not run its current snapshot import to create business facts. Reuse checksum validation, pinned file versions, insert-conflict comparison, existing migration ledger and transaction/advisory-lock patterns. Reuse pure date/phone/money validators where compatible; qualify before use. The old original-export Python extractors are source reconstruction utilities, not operational writers, and would need separately approved offline output scope and original inputs.

A review decision plus checksum-linked source provenance is a prerequisite, not an optional log. Existing tables lack a durable complete provenance/identity/batch ledger. Owner-approved additive schema is needed for verified promotion; exact names/columns must be assigned only during separately authorized implementation against the then-current catalog. The following are required semantics, not claims that new tables/columns already exist.

## Preconditions and owner gates

1. Confirm local existing alrifai/public as operational authority, or supply independently verified external authority and define responsibility without parallel writers.
2. Approve stable personnel/program/vessel identity definitions, historical alias evidence, effective employment/assignment dates and mandatory completeness. No identity is bound by name/phone alone.
3. Supply actual duty/release/receipt/contract and historical policy proof for the chosen domain, or limit scope permanently to historical search.
4. Approve the smallest additive schema and constraints for chosen business workflow and durable provenance/approval/idempotency; no schema change in this audit.
5. Separately approve implementation and isolated qualification scope (paths/data/DB writes if needed). Existing runtime and recovery gates remain untouched.
6. Review final immutable dry-run output: exact file hashes, importer/transform version, schema fingerprint, accepted row IDs/payload hashes, rejected and manual rows, relationship bindings and totals. Approval names the exact manifest/batch; broad conversational assent never approves all unresolved history.
7. Explicitly authorize the final production insert-only import and allowed source records. Migration approval, application changes/deployment/restart, finance posting, WhatsApp/account pairing and messages remain separate authorization scopes.

## Source pinning and immutable identities

- Read only original evidence paths; calculate SHA-256 of file bytes and compare to the current accepted manifest. Verify staging match and expected protected snapshot payload hashes. Retain checksum of each source snapshot/version, original-export hash if available, parser version and exact source selector.
- A source occurrence key is (source file SHA-256, exact JSON pointer/chunk id/kind and decoded array position, retained source record id). For payload-string chunks, include chunk payload SHA-256 and array position. String-reference arrays use pointer+reference ID. Do not assume record id is globally unique across files/parsers.
- Store a source-record content hash using a versioned deterministic JSON canonicalization specification: recursively sorted object keys, preserved array order, UTF-8, no whitespace, exact decimal monetary values, distinguish null/absent/empty string. Preserve original raw/source bytes separately; never replace historical hashes with normalized hashes.
- Program/message aliases across export versions require an explicit many-source-to-one-target binding approved with evidence. The current 843 alias links are historical parser decisions, not approved operational mappings. One source occurrence can map once per explicitly approved domain/event role; reused source evidence may support several facts but may not create duplicate financial events.
- Target key generation must use a fixed versioned cryptographic namespace from approved domain binding, not random UUID per retry, names, phone numbers, vessel names or volatile array sorting. Keep source-occurrence identity separate from target business identity. Detect collisions by comparing expected target payload hash and binding; fail closed on mismatch.
- Keep record-level provenance private: exact file path/hash, chunk/pointer/id, message reference and line/record reference, transformation version, target PK, decision/approver/time, status/reason and resulting payload hash. Reports expose reference IDs/reason codes, not full private bodies.

## Deterministic transformations

Use the column mappings exactly; do not introduce unsupported source keys or silently add fabricated target facts.

- Preserve raw labels and original script. Normalize Unicode/digits only in explicitly versioned comparison fields; no transliteration or fuzzy merge. Remove only documented phone formatting characters. A full explicit Bangladesh number can yield E.164 after country/role confirmation; malformed, multiple or ambiguous numbers go to review. LID/JID digits and payout number never become employee ID.
- Text length failures must reject/queue rather than truncate. Parse JSON-string payloads once and enforce object/array shapes. Preserve evidence/aliases/conflicts/details members; any dropped key appears in unmapped-field output and blocks lossless promotion.
- Calendar dates use exact documented source grammar; ISO dates are calendar-validated. DD.MM.YYYY (D/N) bill dates split into stored date and explicit shift only after matching original evidence. Reject impossible dates; reversed/future historical dates require reviewed resolution. Preserve message time, accounting/program date, actual duty start/end, release/completion, approval, payment and import times independently.
- Timezone-free source timestamps stay timezone-unknown until authoritative export/office semantics are confirmed. Asia/Dhaka is user/report display timezone, not evidence every original timestamp was recorded in it.
- amountCents is already integer minor units; never multiply again or use floating arithmetic for finance. Unknown currency/direction/account/payment date prevents posting. Other source amount/bill values require approved currency/scale/formula before decimal conversion. Reconcile sums by domain/currency/status; instruction sums are not balances or liabilities.
- Historical status is preserved as source evidence. No default Active/Completed/Released promotion; replaced/cancelled assignments retain effective history. Review-only statuses remain unresolved.
- New import timestamps/actors describe actual future execution/approval, never historical duty or transfer. SQL defaults are not business proof. Null/absent/blank are distinct; no guessed "Unknown person"/invented vessels, zero money, default shift or attendance days.
- No historical salary calculation uses the existing BDT 150 food constant or today's rate without period-specific approved proof. Training/permanent/role/group/effective policy, attendance/performance inputs, food/conveyance and allocation of advances/previously paid amounts remain separate.

## Identity resolution sequence

1. Acquire and approve authoritative personnel identity/employee code and employment/contact history. Match source references to a specific verified immutable person identity plus period. Account sender/export attestation only qualifies conversation provenance.
2. Present every multi-name-phone/multi-phone-name candidate and applicant/current/former/role ambiguity for review. Shared/reassigned phone and name variants need independent corroboration. Rejection/unknown is valid; no generated employee record from payout or applicant statement.
3. Confirm vessel identity with official identifier/owner-reviewed independent evidence, mother/lighter role, voyage/program reference and hierarchy. Repeated names require separate identities until proven equivalent.
4. Bind assignment to approved program and employee with exact effective start/end/replacement/cancellation event; preserve old assignee and duty. A current escort label is not assignment history.
5. Bind actual duty/attendance to that assignment and approved shift/time rules. A release document may have unknown vessel; keep it unresolved rather than attach by escort name.
6. Bind money to verified payer/payee and payment evidence, account/currency/direction and exact transaction reference. Employee contact, legacy office phone-ID, payment destination and message sender/receiver are separate roles.
7. Bind release/payroll/invoice only after corresponding duty/policy/client/contract facts are approved. Resolve each FK against the locked/revalidated target identity/version; reject mismatched or absent references.

## Deduplication and no-overwrite behavior

Use two independent protections:
- Source idempotency: unique durable source-occurrence/domain binding and deterministic target identity. Same input+transform+decision can be replayed without new rows. A changed source version is a new occurrence requiring lineage decisions, not an overwrite.
- Business-event duplicate prevention: qualified stable transfer/invoice/program/assignment reference plus domain-specific uniqueness. Fingerprints from date/phone/method/amount are candidate signals, never proof; missing identity excludes automatic resolution. Original 77 held groups and cross-source fingerprint intersections stay pending until receipt decisions.

For existing target IDs: identical accepted business payload/binding is an unchanged/no-op checkpoint; different payload or verified record always rejects and requires separate explicit amendment approval. Do not use ON CONFLICT DO UPDATE, blanket upsert, latest-source-wins, snapshot update, or silent field merge. Financial corrections/reversals append linked approved adjustments; never mutate a paid historical event or count a repeated instruction as another transfer. Do not automatically decrement advances or salary by conversation totals.

## Transaction, batching and rollback

- The authorized importer fixes existing alrifai/public, checks migration checksums/schema fingerprint and source hashes, and refuses unexpected versions/configuration. It must not call migrate(), any recovery tooling or service-control command.
- Precompute validation, accepted manifest and decisions before opening the writer transaction. Runtime rechecks inputs/approval content hash and existing target state.
- Acquire a transaction-scoped application lock compatible with existing migration/import lock ownership; choose the precise key in authorized implementation. Use explicit transaction isolation and necessary row locks so competing writes cannot invalidate employee/assignment or allocation checks.
- Batch by an atomic dependency group (e.g., one approved program with its required assignment/duty/evidence; one evidenced transaction with all allocations). Do not split a money transfer, settlement or related mandatory parent/child rows across independent commits. Set bounded row/byte limits after qualification, not invented here.
- Validate every parent/child binding, uniqueness, amount conservation, balance/allocation bounds and status transition inside the same transaction. Use parameterized INSERT statements through the existing pg pool.
- Commit target rows, durable accepted/rejected decision summary, source-to-target bindings and batch checkpoint atomically. Business failure, unexpected conflict or changed input causes full batch ROLLBACK. No financial half-import is permitted.
- Structurally rejected/manual rows are accounted for in a separate approved review artifact/queue before acceptance, never silently skipped. If an atomic group has a failed required row, block the entire group. Independent fully qualified groups may be separately approved/committed; report partial overall batch-set completion explicitly.
- After connection loss/unknown commit outcome, read the durable batch checkpoint and target bindings before retrying. Never blindly repeat a payment or generate a new target ID. Imports record historical posted events only if proven; no transfer/send side effect is authorized by import.
- Rollback before COMMIT removes all batch writes. After a committed batch, there is no blanket DELETE rollback: stop further batches and obtain approval for a compensating/correction process. No protected snapshot is touched, including during rollback.

## Dry-run design (not executed)

Implement later as a strictly read-only offline analyzer with no credentials/writer path required for source-only profiling. Target-dependent checks use a read-only PostgreSQL transaction. The analyzer shares pure deterministic mapping/validation with the approved importer, but exposes no mutation mode, migration startup hook or service dependency. Do not invoke the existing original-export generators as a dry run: they create filesystem output and require missing originals.

An isolated database rehearsal, test fixtures, new code files, temporary output directories, full parser reconstruction or any dry-run execution beyond the authorized final audit outputs needs separately approved implementation/output scope. This audit stopped before those actions. Current in-memory metadata profiling is inspection, not the formal dry-run result.

For each domain and source version produce these exact counters:

| Counter | Definition |
| --- | --- |
| total_source_records | Source occurrences in the explicitly named selected array; include/exclude references documented |
| structurally_valid_records | Complete required JSON types/format/range checks passed; distinct from business completeness |
| identity_resolved_records | All required domain identity bindings verified and approved for the event period; no name/phone-only FK |
| duplicate_candidates | Candidate occurrences and distinct groups reported separately; cross-source overlaps not additive |
| conflicting_records | Occurrences with source/target or assertion conflict; preserve all source IDs |
| missing_required_fields | Both row union count and individual field counts; no additive sum masquerading as rows |
| unmapped_source_fields | Distinct field paths plus affected occurrence count; include unknown nested keys |
| missing_target_columns | Actual required semantic target absent; table absence explicit; proposed names never called actual |
| eligible_records | Passed structure, completeness, identity, duplicate/conflict resolution, provenance, authority, FK and policy gates |
| manual_review_records | Potentially resolvable evidence/decision gaps; no production writes |
| blocked_records | Missing target/proof/authority or rejected atomic group; no attempted writes |

Eligible/manual/blocked must be an exclusive final classification with reason precedence: absent required schema/authority/proof → blocked; then unresolved identity/conflict/required field → manual; then eligible only if every gate passes. Other counters overlap and must never be summed. Output both source occurrences and approved canonical business-event counts after reviewed linkage. Explain exclusions and superseded versions. Unknown counters use null/"NOT RUN"; do not print guessed zeros.

### Current observed inputs and audit-gate results, not formal dry-run execution

| Domain | Observed source occurrences / evidence | Structural business validation | Approved operational identity resolved | Duplicate/conflict observations | Required-field observations | Eligible unattended promotion under present gates | Manual evidence to examine | Blocked operational promotion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Employee / identity | No authoritative roster; 1,457 employee-phone labels reported by accounts summary, not employees | NOT RUN; employee schema absent | 0 established; real identity count UNKNOWN | 417 multi-name phone groups / 300 multi-phone exact names; not actual people count | No official code/employment history proof | 0 established | Source-referenced label groups, count not unique people | Entire personnel promotion; record count UNKNOWN |
| Vessel / program / assignment | 1,318 non-reference program occurrences: 582 + 85 + 646 + 5; 622 vessel references excluded | JSON keys/types observed; full validator/operational completeness dry run NOT RUN | 0 independently approved operational bindings established | 50/646 conflicting current projections; 843 alias edges; older version overlaps | 508/646 missing >=1 required field; seed 5 have all six basic labels but identity unverified | 0 established | 646 current projections and linked old evidence; not additive | All 1,318 unattended promotions gated; references not programs |
| Duty / attendance | No structured actual attendance/duty array; program interval evidence only | NOT RUN | 0 established | Same-event linkage/overlap NOT VERIFIED | Actual start/end/attendance evidence missing | 0 established | Program/message/slip references; unique duty count UNKNOWN | All duty promotion; count UNKNOWN |
| Cash / advance | 12,669 cash/instruction occurrences: 4,607 + 1,024 + 7,038; extra 155 held candidates excluded from total | Key/type and positive int4 amount profile observed; full posting validation NOT RUN | 0 verified payer/payee operational bindings established | 77/155 held groups/rows; cross-source matching keys 98/2,070/221 | All 7,038 qualified purposes blank, 31 employee labels blank, 4,089 payout blank; receipt/account/direction absent | 0 established | 2,047 accountsReview objects (1,892 parsing + 155 duplicate), 3,715 old reviews; overlapping events | All 12,669 postings blocked; cash archive semantics distinct |
| Release Slip / settlement | 162 old release/payment entries: 13 Release note +149 Payment record labels; 19 current Release review rows overlap program domain | NOT RUN; required completed-slip schema absent | 0 verified releases in 646 current programs | Four amount-conflict + one correction issue flags in old entries | 74/162 amount null; all 162 vessel/location blank; required document/duty/payment proof absent | 0 established | 13 notes +19 review-state programs and original-media requests; overlaps explicit | All 162 as completed settlement/financial events; eligible completed slips 0 established |
| Payroll / salary | No authoritative payroll or effective-policy record array | NOT RUN | 0 established | Prior-paid/advance allocation duplicates NOT VERIFIED | Historical applicable rate, training/permanent and incentive basis missing | 0 established | Salary-related statements only; distinct records UNKNOWN | Entire payroll promotion; count UNKNOWN |
| Client / invoice | 23 bill snippets | Extracted shape observed; authoritative invoice validation NOT RUN | 0 verified client/agreement bindings established | Duplicate billing NOT VERIFIED | No client/contract/invoice ID, issued/paid proof or verified rate formula | 0 established | 23 snippets and original workbook/formula evidence | All 23 receivables blocked |
| Historical conversations / ancillary | 16,655 current envelopes; 3,677 older overlapping envelopes; 54 stored chunks/manifests | 54/54 independent payload hash and metadata parity verified | Business identity not applicable to snapshot parity; native session identity UNKNOWN | Earlier/later export overlap; 9,002 old identity-pending reviews superseded by separate source-attested account interpretation, not erased | 1,244 unavailable-media messages reported in current summary | No new operational import; history already preserved | 399 maritime reviews and other references; overlapping source messages | Live-session/account/message promotion not available/approved |

The final dry run must produce a separate domain table containing every exact counter, including unmapped-field and missing-target counts. Current audit tables enumerate those paths/columns, but aggregate distinct operational-gap counts depend on owner-approved target semantics and are UNKNOWN, not estimated. Do not claim this matrix is the future full dry-run result.

Confirmed unattended operational eligibility 0/14,172 candidate occurrences = 0%, using the mapping audit's explicit repeated-occurrence denominator. Unique event denominator, fully structurally valid/business-valid counts, eventual manual/eligible partitions after evidence, and automation success rate after implementation are UNKNOWN.

## Pre-import reconciliation and review artifacts

Generate an immutable report within an approved private output location:
- Original/source file checksums, original-export metadata vs actual availability, complete selected record IDs/pointers/content hashes, schema fingerprint and applied migration hashes.
- Source-total reconciliation with explicit reference/review/version exclusions; every selected occurrence classified exactly once; rejected/manual reason counts must account for the residual.
- Identity bindings with independent evidence/approver/effective period; domain FK preview and collision report.
- Financial counts/sums separately by currency, account, direction, completed vs instruction, duplicate/held vs accepted. Match independently authenticated receipts/statement balances; no opening balance inferred.
- Programs/assignments/actual duty/release reconciliation by owner-approved ID; cancellation/replacement and overlap intervals; omit unknown completion/current duty from active reports.
- Payroll policy/input/advance/prior payment/rounding reconciliation and invoice client/agreement/period/rate/reference totals, only if independently qualified.
- Field-loss report: every exact source path has an accepted target/provenance mapping or explicit UNMAPPED review; every actual required target has a trustworthy source or MISSING SOURCE rejection.
- Frozen approval manifest and exact output SHA-256. Per-row review status/approver/version preserved; private body/document access separate from public summary.

Mandatory pass conditions: unchanged protected snapshots/source files; accepted groups contain no unresolved mandatory identity/ref/conflict/proof gap; no unapproved target overwrite; no financial duplicate binding; all totals independently reconcile; schema and approval versions match; every required provenance edge preserved. Otherwise stop before INSERT.

## Post-import reconciliation (future, authorized only)

Within the same transaction, compare accepted manifest vs actual target rows/provenance/batch counts and content hashes. Check mandatory relationships/status invariants/unique financial references, source coverage, domain monetary conservation and allocation caps. Before COMMIT reject any unexpected delta. After COMMIT read-only independently recheck:
- Expected inserted rows only; previously verified business row checksums unchanged.
- Accepted=written+explicit identical/no-op rows; all rejected/manual remain unwritten; no orphan relations/unknown checkpoint.
- Snapshot counts/payload hashes remain 54/54 until separately approved unrelated historical version work; all source file hashes unchanged.
- Re-execution of the exact batch preview yields 0 new target rows, 0 changes, identical source/binding hashes. A different source version does not silently overwrite.
- Existing register/account readers do not hide accepted records or double-count historical accountsCash; seed fallback/alias behavior explicitly qualified.
- Financial totals/status match evidence and manual accountant sign-off; no sent-money claim from imported instructions.
- Preserve final audit log, rejection/manual queue and reconciliation report. Unexpected effect → stop remaining batches; no automatic repair/recovery/service restart.

Transactional failure/unknown-commit/retry behavior, concurrent collision/FK changes and rollback need meaningful isolated tests under separately approved write scope; not tested here. Current source and schema parity are inspection evidence, not those tests.

## Expected operational impact and stop

Current audit has no operational impact beyond documentation. A later approved program import may change register visibility due to existing fallback/alias overlays; cash archive materialization may duplicate displayed accounts instructions, so avoid it. Financial balance, payroll payable, settlement completion and receivable amounts must remain unchanged until independently evidenced posting is explicitly authorized.

No implementation, schema migration, production import, credential change, recovery action, WhatsApp MCP installation or deployment follows this document automatically. Stop and wait for explicit owner approval of the exact implementation and later execution scopes.

