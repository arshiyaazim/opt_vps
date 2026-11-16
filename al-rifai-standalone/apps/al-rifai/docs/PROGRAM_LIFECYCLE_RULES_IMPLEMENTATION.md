> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Program lifecycle rules implementation

9 October 2026, Asia/Dhaka. Controlled candidate only. No production migration/import/deployment/restart is authorized. Current version employee-program-v4-lifecycle; EMP-001–006 remain approved and unchanged. Canonical [owner policy](OWNER_BUSINESS_POLICY.md) and [machine register](owner-business-rules.json) distinguish owner rules from SAFE implementation safeguards and preserve previous register checksum/history.

## Entry, architecture and existing behavior

Read VPS_MAP, README, both owner policy files, the three employee/program documents, candidate SQL, validator/dry-run, existing lib/programs.ts, lib/program-workflows.ts, lib/vessel-source.ts, lib/cash-data.ts, db/schema.ts, historical parser scripts and evidence. Actual requested paths exist. No applicable AGENTS.md or additional VPS entry/exit procedure exists in inspected parent/project/root instruction locations; workspace .agents/.codex are empty. README/VPS_MAP govern handoff. No competing agent was observed: one Codex plus its helper. Existing files were hashed before edits; there is no Git repository, so hash inventory preserves pre-existing changes. No source parser writer was executed.

Reuse the current extractor, verifiedMessageRole, normalized employee matching, programWindowCandidates, source occurrence hashing, releaseCandidate, Ghat helper and read-only dry-run. A single pure classifyProgramLifecycle reducer now lives in the existing validation module; it creates only in-memory candidate objects and never a second database/register/application. lib/programs.ts existing Recorded/Active/Completed/Cancelled/Released/Escort change statuses remain historical assertions. Existing readers, ORM models, parser writers, API/UI and startup are unchanged. Candidate is not connected to live processing. No dependencies or OCR service were installed.

## Rules, fields and envelope

| Owner rules | Implemented meaning |
|---|---|
| EMP-001–006 | Existing normalized employee mobile identity, name aliases and original contacts/provenance reused. Escort Number is accepted only as an exact labeled escort-mobile field; Master/Sender/Client/Payout/JID/LID are excluded. |
| PRG-001 | Verified client/requester service order creates an incomplete-preserving Draft; repeated equivalent evidence within three days links one candidate order. Incomplete draft matching is exact normalized available fields + source export; ambiguous drafts remain Review. |
| PRG-002 | All six confirmation meanings and exact verified Admin role required; unique compatible prior Draft within three days links/promotes. Unmatched Admin may create a candidate under existing owner policy, with UNMATCHED_ADMIN_CONFIRMATION and no invented client order. |
| PRG-003–005 | Separate lighters under one mother; same-day/three-day duplicate or correction candidates; same lighter within five days transition review; master/status conflicts preserved. More than five days permits distinct-event candidate, but unchanged old duty details stay Review. |
| PRG-006 | Source-linked cancellation, correction, restart and mobile-to-mobile replacement preserve prior fields, program history and predecessor/successor assignments. Explicit transition markers and effective date/identity/linkage evidence are required; plain cancel mentions/questions cannot mutate even candidate state. |
| PRG-007 | Confirmation creates confirmed fact only. Assigned requires separate source-bound assignment decision; actual start requires explicit actual start date plus verified Admin/linkage. No Active default. |
| PRG-008 | Every event retains occurrence/reference, original body, source field/evidence, sender role proof, local timestamp, duty date/shift, applied IDs, missing/conflict reasons and linked candidate IDs. |
| REL-001–003 | Offline OCR injection hashes exact supplied media; extracted fields remain unapproved. Release matching may use mobile/chronology when vessel names missing; ambiguous OCR/matches block release. Release/completion separate; new assignment reviews prior open assignment without guessed release. |
| GHAT-001–002 | Exact 20,000 minor units in BDT, normalized ledger mobile, dates/purpose/prior lifecycle references; three consecutive distinct dates yield strong Review. Missing prior release remains an explicit review reason, not assumed post-release duty. Instructions distinct from source/date/amount/currency-bound verified transfer receipts. No postings. |

Exact additional accepted message labels: Program ID, Order ID, Event, Effective Date, Cancellation Date, Restart Date, Replacement Date, Old Employee ID/Old Escort Mobile, New Employee ID/New Escort Mobile, Actual Start Date, Release Date/End Date, End Shift, Start Shift/Duty Start Shift and Escort Number. Existing Mother Vessel/Lighter Vessel/Escort Name/Employee ID/Escort Mobile/Master Mobile/Start Date/Duty Start Date/Shift remain. Each raw label/value/body line is preserved; aliases are parser rules, not invented keys added to historical files. Unrecognized prose remains in originalMessage. Unsupported two-digit duty years, ambiguous numbers, invalid shifts, date/shift contradictions and repeated fields remain Review.

Sender binding requires APPROVED owner evidence, source export hash, chat key, exact sender and effective dates; admin/client/requester are distinct. Display name, message phone and a filled form never verify Admin. Lexical lifecycle signals are review-only unless an exact explicit event marker supports a transition. Multiple explicit intents are ambiguous; unverified field-only blocks have eventType null, not inferred ADMIN_CONFIRMATION.

## State machine and existing taxonomy adapter

| From | Event | Evidence | Candidate result |
|---|---|---|---|
| none | SERVICE_ORDER (ORDER_DRAFT result) | verified client/requester, original message | draft, incomplete allowed |
| draft/review/none | ADMIN_CONFIRMATION | verified Admin and six fields; optional linked Draft | confirmed, never automatically Active |
| confirmed | NEW_ASSIGNMENT | exact source-bound approved assignment decision/effective date | assigned |
| confirmed/assigned | DUTY_START | explicit actual date, verified Admin and program link | active |
| confirmed/assigned/active | PROGRAM_RELEASE | original media/OCR, exact program/identity/release approval and effective date | released |
| released | PROGRAM_COMPLETION | distinct source-bound approved completion/effective date | completed |
| draft/confirmed/assigned/active | PROGRAM_CANCELLATION | explicit Admin transition, program link, explicit date | cancelled |
| cancelled | PROGRAM_RESTART | explicit Admin marker, complete fields, matching vessels, restart decision/date | confirmed; append assignment predecessor |
| confirmed/assigned/active | ESCORT_REPLACEMENT | explicit Admin marker/date, old/new distinct normalized mobiles, open predecessor | same program state; old assignment retained, successor appended |
| eligible linked state | PROGRAM_CORRECTION | source-bound approved exact corrected fields | same state; previous field snapshot preserved |
| existing matching event | PROGRAM_DUPLICATE | comparison + chronology/master/status | same program reference; no new program |
| any | incomplete/conflicting/unverified event | failed evidence requirement | Review Required; previous approved state unchanged |

Correction/restart/replacement/Review are linked event outcomes, not independent programs. Local candidate `completed` maps to existing Completed display and SQL `program_completed`; candidate states are not written to existing status columns. Required uppercase event names are an API adapter onto the candidate's existing lower-case assertion/assignment values, not another persisted taxonomy. RELEASE_EVIDENCE and GHAT_DUTY_CANDIDATE are evidence/review, not state transitions. Settlement/payment remain distinct review-decision assertions and never inferred.

Message-calendar dates drive three/five-day windows, while retained local time orders messages. Timestamp timezone is unknown and stays null; elapsed-hour claims are not made. Day five lies in the earlier inclusive recurrence-review rule; the new owner's “five or more” permission is conditional, so day five remains Review rather than automatically new. Beyond five days requires distinct business details/evidence and status review. Names are comparison labels, never physical vessel identity proof. No cap on lighters per mother.

## Candidate SQL and future binding

Still eleven tables, existing programs(id) anchor, existing ledger and immutable occurrence/batch/binding structures. Lifecycle SQL differences in this task expand approved program-event assertion values (duplicate, corrected, assigned, duty_started, release_evidence, ghat_review) and permitted initial lifecycle values assigned/active. ep_review_decisions and ep_source_bindings each gain candidate event_key TEXT DEFAULT ''; unique occurrence/role/event_key and approval FK use identical block scope. A source message may contain many lighters, so occurrence/role alone could not represent them. event_key hashes original message occurrence plus actual body start line; sourceBlockStartLine and original source pointer remain preserved. Blank key retains whole-record scope, no fake JSON pointer or source edit. No new table/phone column, existing type rename, migration 0000–0005 change or financial schema. The existing immutable ep_programs initial state stays frozen; accepted transitions append approved decisions/source bindings, reconstructed by the candidate reducer. Contact/mobile identity design is unchanged.

Drafts can use existing programs(id) plus candidate draft metadata after separately approved import integration. Incomplete source/review evidence can live in source occurrence/review decisions without operational target. Unmatched Ghat patterns have review decisions, no fabricated program binding. Future target IDs must be actual approved database identities; in-memory candidate IDs do not imply inserted targets or immutable accepted batches.

## Safety, tests and remaining implementation limits

Pure validation imports crypto only. Offline dry-run verifies source checksums, catalog/snapshots/migration ledger and pinned policy checksum/version/rule coverage/event adapter; it never opens DB or invokes migration/import. Role/transition/OCR inputs are explicit injectable isolated-test contracts; the historical CLI does not accept external approvals or enable writer credentials. No startup invocation. Replays deduplicate occurrence before pair/group generation; changed same-occurrence content rejects. Duplicate payment instructions do not add consecutive days.

Actual release media is absent and no local OCR executable/provider is available. Offline extraction orchestration is tested with synthetic supplied bytes and extractor; actual image/PDF OCR is **BLOCKED**, not claimed qualified. Known operational program context is absent, and verified Admin/client bindings remain empty. SQL execution/constraint/concurrency qualification is not performed and no isolated DB is created. Candidate is reviewable for a separately authorized isolated SQL rehearsal; it is not production migration/import ready. Full historical operational verification remains blocked by those evidence gaps.

See [verification report](PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md) and exhaustive [file-change inventory](employee-program-file-changes.json). Exit: production fingerprints/evidence hashes rechecked; all passive candidate artifacts documented; no deployment/restart/live processing occurred.
