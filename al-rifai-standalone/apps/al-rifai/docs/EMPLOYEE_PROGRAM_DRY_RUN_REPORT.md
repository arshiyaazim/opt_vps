> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Current lifecycle candidate — 9 October 2026, Asia/Dhaka

The retained identity report describes its earlier classifier. Current lifecycle classification and before/after denominators are in PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md. Employee Ledger results remain 7,007 matches/7,038 rows, 1,457 mobile keys, 2,270 raw name facts and 31 missing mobiles. Optional maritime association counts changed through newly role-labeled source extraction; no source data changed.

See [PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md](PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md) and [PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md](PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md).

---

# Owner-rule reconciliation dry-run — 2026-10-09

Status: candidate matching and isolated validation prepared. **Production execution not authorized.** Operational import remains BLOCKED by absent candidate schema, missing verified target/program/actor bindings and source evidence gaps. No operational records were created.

Current policy: [OWNER_BUSINESS_POLICY.md](OWNER_BUSINESS_POLICY.md); machine register [owner-business-rules.json](owner-business-rules.json). Current mapping retains its existing filename, with v3 content. Earlier identity conclusions below are historical and SUPERSEDED where inconsistent with EMP-001–006.

## Identity before / after with denominators

| Measurement | v1 / interim v2 | Current EMP-001–006 |
|---|---|---|
| Established ledger mobile occurrences / 7,038 ledger rows | Not accepted as primary matching keys | 7,007 matched; 31 missing, 0 invalid |
| Operational mobile keys / 7,007 valid rows | No accepted ledger mobile grouping | 1,457 candidate keys; no DB employee inserted |
| Same mobile, multiple raw names / 417 such groups | Unresolved / manual identity candidates | All 417 name-alias groups; 4,692 affected source rows |
| Same raw name, multiple mobiles / 300 such groups | Unresolved / merge review | All 300 remain separate mobile identities; 2,464 affected rows |
| Unique raw name facts across 1,457 keys | Not operational aliases | 2,270 name/alias facts with original source references |
| Optional maritime mobile groups / 199 valid groups | Independently grouped | 138 associate with ledger keys; remaining 61 have no ledger match |
| Actually verified production target FK bindings / 11,583 selected occurrences | 0 | 0; candidate key matching is distinct from database binding |

The 417/300 group counts overlap and cannot be added as distinct people. 2,270 includes first names and variations, not 2,270 additional names or employees. Missing 31 rows remain unresolved; names never fabricate IDs. Separate mobiles only link through explicit owner-approved linkage; no such actual linkage was supplied.

## Schema / field audit

No dedicated live Employee Ledger table or employee_id column exists. The read-model groups existing site_cash_archive.employeePhone TEXT; parser/UI establish Employee ID phone. Historical employeePhone and employeeId values are strings. Existing programs.escortMobile is TEXT; snake-case escort_mobile appears in the disabled external reader only. No new escort_mobile column is required. Proposed ep_employees.employee_id is normalized mobile TEXT UNIQUE; id remains technical TEXT. Existing columns/types are untouched. Candidate child employee_id foreign keys now reference mobile employee_id, rather than technical id.

Mapping uses actual accountsCash.employeePhone/name/identityRule/sourceId/sourceLine fields, not an invented employee_id source property. The owner-confirmed export and established parser rules prove the ledger field role; sender/master/client/payout/JID/LID remain excluded. Existing program escortMobile is optional evidence and shares the same normalization. Every original alias, contact value and decision retains occurrence/file/hash/pointer/message references. 16,655 local archived message references are preserved; native WhatsApp message URLs available: 0/16,655. No message URL is fabricated.

## Overall reconciliation

Selected occurrences: 11,583 = 7,038 employee + 1,318 program + 3,227 evidence/reference. Structurally valid 11,583/11,583; unknown-key rows 0/11,583; duplicate exact occurrence rows 0/11,583. Import eligibility remains 0/11,583; BLOCKED 8,356/11,583 and MANUAL_REVIEW evidence-only 3,227/11,583. All 8,356 operational-domain occurrences have SCHEMA_GAP because the 11 proposed tables do not exist. Identity-matched ledger rows are still not authorized operational writes. Financial promotions 0; writes 0; liveConnection false.

Missing required program-field union changed from 1,004/1,318 (old destination-dependent specification) to 146/1,318 (current six confirmation meanings, logical employee mobile). Current projections changed from 508/646 to 96/646 missing-required union. These are source-shape counts, not verified Admin confirmations. Missing employee mobile 91, name 37, mother 19, shift 92, start date 51 out of 1,318; reasons overlap.

Current program projections 646; conflicts retained 50/646; source alias edges 843, orphan targets 0/843. Older source occurrences 1,294 include vessel-reference evidence. No vessel-name-only merge, inferred shift/completion date, silent cancellation or status default to Active.

## Retained owner lifecycle / release / Ghat review

6,221 maritime messages produced 822 labeled event blocks: 388/822 valid explicit Escort Mobile events, 111/822 complete confirmation-field blocks. Verified Admin role 0 and verified client role 0: all 822/822 remain REVIEW; Draft 0 and Admin confirmation candidate 0. Actor role is never inferred from display name.

342 reviewed program pairs: same-day duplicate reason 11/342; matching-within-three-day duplicate 19/342; three-day correction 81/342; repeated lighter within five days cancellation/restart/replacement review 323/342; master/status contradiction 38/342. Reasons overlap. No pair silently creates/cancels a program; message/event history is retained. Prior-assignment closure reviews 0 because verified new Admin assignments are absent.

Release candidate messages 68/6,221; verified releases 0/68. Available referenced media bytes 0, so OCR could not run. Code marks available media OCR_REQUIRED and verifies supplied release assertions before Released candidate; Program Completed, Settlement Approved and Payment Completed remain distinct. No fabricated release date/duty total.

BDT 200 evidence rows 2,507/7,038 ledger rows; 145 repeated label/date review groups, 101/145 with at least three consecutive distinct dates are HIGH_PRIORITY_GHAT_REVIEW. Payment instructions are not verified transfers: verified transfers 0/2,507. No cash/attendance/payroll/settlement posting.

## Verification and limits

71 isolated tests: PASS 71, FAIL 0, SKIP 0, CANCELLED 0. Three existing assertion scripts PASS: workflows, source-register, phase1-unit. Tests cover alias idempotency, format/role/missing/invalid numbers, separate-mobile identities, explicit linkage, target mobile FK distinction, pinned policy history, three/five-day candidates, Admin role, Release, Ghat and write/startup guards. No assertions were dropped to obtain a pass; earlier incompatible identity expectations were replaced explicitly under superseding EMP rules.

Read-only catalog collection uses repeatable-read READ ONLY, SELECT and ROLLBACK. Before/after collected production frames are byte-identical: catalog, all table rows, 54 snapshots and six ledger entries unchanged. All six evidence checksums are verified by the full dry-run; migrations 0000–0005 checksums remain verified. Existing schema fingerprint: `1c139104917bd756b7ab930701c8f9872f5b210b936808220d12cb329544ce4a`. Repeated final dry-runs with identical source/as-of are byte-identical, including runs using the unchanged after-catalog. Manifest SHA-256: `063e85630f4265607f9895556f343931a150ab159d86c83f78c3a8e47b2de95b`; as-of 2026-10-09. Manifests are private /tmp artifacts, not immutable accepted import batches.

SQL candidate was not executed or database-qualified; no isolated DB was created. Owner authorization is required for any later SQL rehearsal/database creation, production migration, import or reader deployment. Current mobile policy already has owner authorization and needs no repeat approval. Remaining evidence: 31 missing mobiles, verified Admin/client role bindings, vessel/program target bindings, original release media/OCR verification and native message URLs. Existing readers/fallback are unchanged; a future approved integration must deliberately select new relationships.

Exact created/modified/untouched path and hash inventory: [employee-program-file-changes.json](employee-program-file-changes.json). No production migration, import, deployment, restart, live processing or WhatsApp operation occurred.

---

## Retained original preparation report (historical)

Conflicting earlier identity conclusions below are SUPERSEDED by EMP-001–006 above; they are retained as audit history.

# Employee/program dry-run report

9 October 2026, Asia/Dhaka. PREPARATION COMPLETE; PRODUCTION MIGRATION/IMPORT BLOCKED. No independently verified import batch was supplied or created.

Actual execution: `node scripts/employee-program-dry-run.mjs --catalog PRIVATE_FRAMES --as-of 2026-10-09`. The catalog is a fresh separately collected read-only PostgreSQL inspection, not the historical audit reused as live truth. Collector: `scripts/employee-program-catalog-read.sql`, run with `psql -X -qAt -v ON_ERROR_STOP=1` on the existing PostgreSQL container. Both inspections used REPEATABLE READ READ ONLY, SELECT and ROLLBACK. No recovery gate was executed. The analyzer reads files only and exposes no writer, migration/import command or external approval ingestion. An absent catalog/as-of, bad source/hash/shape/count, schema/ledger/snapshot drift or target-count drift fails closed. Source-only profiling is not accepted operational eligibility.

Host PATH lacked Node. Existing container Node v22.23.3 executable was copied read-only to `/tmp/alrifai-preparation-node` for isolated host tests; nothing was installed or changed in the container. No service restart/deployment. Test/collector temporaries are outside production evidence. Full row manifests contain private normalized comparison labels and must remain restricted, not committed or pasted in chat.

| Domain | Occurrences | Eligible | Blocked | Manual review |
|---|---:|---:|---:|---:|
| Employee labels from accountsCash | 7,038 | 0 | 7,038 | 0 |
| Historical program occurrences, overlapping versions | 1,318 | 0 | 1,318 | 0 |
| Program evidence, aliases/conflicts and vessel references | 3,227 | 0 | 0 | 3,227 |
| Total source occurrences, NOT distinct people/programs | 11,583 | 0 | 8,356 | 3,227 |

All 11,583 passed the pinned observed JSON shape. Business identity resolved 0. Missing required program fields: 1,004/1,318 across versions, 508/646 current projections. Current per-field missing counts: {"destination": 498, "escortName": 31, "lighterVessel": 0, "motherVessel": 19, "shift": 66, "startDate": 41}. Six-field missing row union is not the sum of fields. Unknown source-key rows 0; unknown-field paths 0 for selected pinned data. Every known field is retained as provenance, so preservation-unmapped count 0; many have no operational promotion and are explicitly PROVENANCE_ONLY/SCHEMA_GAP/BLOCKED. Eleven proposed semantic tables are absent in production; exact candidate columns are enumerated in the SQL/proposal, not asserted live. Assignment/identity business proof missing for every selected program. No financial row is promoted.

Recomputed employee ambiguities: 417 multi-name-phone groups, 300 multi-phone-exact-name groups. These include 4,692 and 2,464 candidate source rows respectively, with overlap; they are not employee counts. No employee was created or merged. Per-row ambiguity flags remain source-bound. Original names/phones are in protected source evidence, comparison values are private manifest data, and verified immutable IDs are independent.

Current projections: 646; 50 conflict-bearing records; 94 separate flat assertion conflicts; 843 alias edges, 0 orphan target IDs. Older sources: 85 operations programs, 1,204 archive rows (582 programs + 622 vessel references), 5 recovered rows. Also inspect 1,668 current underlying programEvidence objects; they are overlapping evidence, not extra programs. Exact source-occurrence duplicate count 0. Same-file/source-ID differing payload reasons affect 1,562 occurrences (includes programEvidence versus projections); cross-file program-ID differing payload reasons affect 1,064 program occurrences. These are overlapping assertions/candidates, not confirmed duplicate voyages, and cannot be summed. No latest-version overwrite or alias-driven identity resolution occurs.

Assignment history: 86 program occurrences retain cancelled/replacement history reason; 85 retain lifecycle-evidence reason. Current status remains evidence, no automatic Active/Completed or guessed shift/end date. Pure event validation supports assigned/replaced/cancelled/ended chains, predecessor scope, explicit dates and identity checks. No historical assignments were generated, because source labels do not establish effective events. Date-only candidate events do not establish within-shift timestamps/duty; owner must supply precision/timezone if required.

Two complete reruns with identical source/catalog/as-of inputs produced byte-identical canonical JSON output. Manifest SHA256: `ba18497b3a9a13d7bed98c74cbe4a4ec48ccdb6ceb595a954907117a9f9bbe1b`. Mapping specification SHA256: `ddaca872e51f5f8ea66801f5f95b8a4e1f599e34cfee2505ee0ad547082544ba`. Catalog fingerprint (canonical sorted keys): `1c139104917bd756b7ab930701c8f9872f5b210b936808220d12cb329544ce4a`. Algorithm differs from the earlier audit/recovery JSON serialization fingerprint; it is versioned and rechecked against this task's own fresh live baseline, not misrepresented as the prior hash.

Tests: `node tests/employee-program.mjs`: **28 pass, 0 fail, 0 skip, 0 cancelled**. Synthetic fixtures are embedded in that test file, with no actual people/contact values. Coverage: same-name persons, shared/reassigned phone/periods, applicant distinction, ambiguous source labels, payout/JID rejection, approval occurrence mismatch, repeated vessel/program labels, several lighters/reuse, replacement/cancellation chain, missing dates/shifts, impossible/reversed dates, conflicts, source duplicates/version changes, unknown nested keys, checksum/schema mismatch, missing identity FK, deterministic ordering, no write dependency, no startup hook and passive module import. Existing workflows/source-register/phase1-unit scripts also passed: **3 scripts pass, 0 fail**; they are assertion scripts, not individually counted node:test cases. Do not claim their individual assertion count. No assertions were weakened. Direct script invocation yields the 28-case TAP output; container-derived `node --test` only reported the enclosing file in this environment, so it is not used for case counts.

NOT RUN: SQL execution rehearsal, constraints on a real isolated PostgreSQL database, concurrent collision/transaction rollback/unknown commit and writer privileges. No database was created; those require separate isolated-write authorization. The SQL candidate is not a production-qualified migration. The actual analyzer refuses externally submitted approvals and always blocks operational rows until a real reviewed workflow/business-proof validator is implemented; synthetic approved bindings in pure tests do not authorize production.

Integrity exit: before/after live collector output byte-identical; seven operational/archive/draft tables 0, immutable snapshots 54, migration ledger 6. All six evidence checksums/byte counts unchanged, four historical JSON sources match immutable v10 staging, migrations 0000–0005 unchanged. Baseline hashes of all 192 existing source/document files still match. New files only; no pre-existing uncommitted work was overwritten. Production writes 0, migrations 0, imports 0, credential changes 0, service/deployment/recovery actions 0, outbound messages 0.

Private temporary artifacts: `/tmp/alrifai-preparation-before.jsonl`, `/tmp/alrifai-preparation-after.jsonl`, `/tmp/alrifai-employee-program-manifest.json`, `/tmp/alrifai-employee-program-repeat.json` (0600), `/tmp/alrifai-employee-program-tests.tap`, `/tmp/alrifai-preparation-file-baseline.json`, `/tmp/alrifai-preparation-read.sql` and copied Node executable. They are working evidence, not an approved accepted-batch archive. Future accepted manifests must be immutably stored through the proposed checkpoint/approval flow.

Owner decisions: authoritative employee IDs/code and applicant/employment/contact periods; independently verified vessel/program references and approved hierarchy; per-field conflict/alias decisions; exact effective assignment events and lifecycle dates; required date/time precision and completeness; exact reviewed schema/manifest; isolated database rehearsal scope; least-privilege future writer/migrator and compatibility reader acceptance. Approval of this candidate does not approve migration, import, service restart or deployment.

Production migration readiness: **BLOCKED** by missing independent identity/business evidence and accepted owner-approved batch, absent SQL/transaction qualification, and unresolved reader/privilege acceptance. All preservation and preparation-only safety criteria verified within stated limits. Reviewable implementation exists, but an import-ready verified batch does not. See proposal and source mapping for required future work.

Created/modified/untouched paths and SHA256 inventory: `employee-program-file-changes.json`. Every existing relevant application/model/reader/configuration/test/migration/doc/evidence file is untouched. No equivalent employee/program deliverables existed before this task.

Appendix: exact machine reconciliation (reason counts overlap; classifications are exclusive):

```json
{
  "sourceCounts": {
    "accounts-snapshot.json#accountsCash": 7038,
    "conversation-snapshot.json#programEvidence": 1668,
    "conversation-snapshot.json#links": 843,
    "chat-archive.json#programs": 1204,
    "conversation-snapshot.json#conflicts": 94,
    "conversation-snapshot.json#programs": 646,
    "operations.json#programs": 85,
    "recovered-programs.json#rows": 5
  },
  "summary": {
    "blocked": 8356,
    "domains": {
      "employee": {
        "blocked": 7038,
        "manualReview": 0,
        "total": 7038
      },
      "program": {
        "blocked": 1318,
        "manualReview": 0,
        "total": 1318
      },
      "reference": {
        "blocked": 0,
        "manualReview": 3227,
        "total": 3227
      }
    },
    "duplicateOccurrenceRows": 0,
    "eligible": 0,
    "identityResolved": 0,
    "manualReview": 3227,
    "missingRequiredRows": 1004,
    "reasons": {
      "ASSIGNMENT_EVIDENCE_NOT_SUPPLIED": 1318,
      "ASSIGNMENT_HISTORY_REQUIRED": 86,
      "BUSINESS_APPROVAL_NOT_SUPPLIED": 1318,
      "CONFLICTING_ASSERTIONS": 50,
      "CONFLICTING_SOURCE_ID": 1562,
      "CROSS_VERSION_ASSERTION_CONFLICT": 1064,
      "DATE_ORDER": 1,
      "EMPLOYEE_AUTHORITY_NOT_SUPPLIED": 7038,
      "EMPLOYEE_IDENTITY_UNVERIFIED": 1318,
      "EVIDENCE_ONLY": 3227,
      "FUTURE_HISTORICAL_DATE": 3,
      "LIFECYCLE_EVIDENCE_REQUIRED": 85,
      "LIGHTER_IDENTITY_UNVERIFIED": 1318,
      "MISSING_destination": 988,
      "MISSING_escortName": 37,
      "MISSING_motherVessel": 19,
      "MISSING_shift": 92,
      "MISSING_startDate": 51,
      "MOTHER_IDENTITY_UNVERIFIED": 1318,
      "MULTI_NAME_PHONE_CANDIDATE": 4692,
      "MULTI_PHONE_NAME_CANDIDATE": 2464,
      "PROGRAM_IDENTITY_UNVERIFIED": 1318,
      "SCHEMA_GAP": 8356
    },
    "structurallyValid": 11583,
    "total": 11583,
    "unknownKeyRows": 0
  },
  "observations": {
    "aliasEdges": 843,
    "currentConflictedPrograms": 50,
    "currentPrograms": 646,
    "employeeCandidates": 7038,
    "financialPromotion": 0,
    "missingTargetTableCount": 11,
    "missingTargetTables": [
      "ep_employees",
      "ep_employee_history",
      "ep_vessels",
      "ep_vessel_aliases",
      "ep_programs",
      "ep_program_vessels",
      "ep_assignment_events",
      "ep_source_occurrences",
      "ep_review_decisions",
      "ep_source_bindings",
      "ep_import_batches"
    ],
    "multiNamePhoneGroups": 417,
    "multiPhoneNameGroups": 300,
    "olderOccurrences": 1294,
    "orphanAliasTargets": 0,
    "sourceOccurrenceCount": 11583
  }
}
```

IMPLEMENTATION PREPARED — PRODUCTION MIGRATION AND IMPORT NOT AUTHORIZED
