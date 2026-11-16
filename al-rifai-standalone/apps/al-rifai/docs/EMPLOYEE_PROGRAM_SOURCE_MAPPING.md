> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Current lifecycle candidate — 9 October 2026, Asia/Dhaka

Mapping content is now employee-program-v4-lifecycle. Exact Escort Number label uses the same employee-mobile normalization; Event/program/effective-date/old-new employee/release labels retain original body-line evidence. The policy register checksum and event adapter are checked. EMP-001–006 are unchanged.

See [PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md](PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md) and [PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md](PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md).

---

# Current owner reconciliation — 2026-10-09

Current mapping version: employee-program-v3-employee-mobile; the existing machine-spec filename employee-program-mapping-v1.json is retained to avoid a competing mapping. It pins the owner rule register checksum. Exact historical source employeePhone (accountsCash) maps, under the established Employee Ledger parser/source role, to logical operational employee_id and proposed ep_employees.employee_id. Original employeePhone/name values, source occurrence and message references are retained. No source employee_id key is invented. The existing explicit program escortMobile field optionally associates with the same normalized key; it is not mandatory when Employee ID supplies the mobile.

Same normalized mobile preserves raw names as aliases; same name/different mobiles is separate unless explicit owner linkage. Whitespace, supported punctuation, Bengali digits and verified national/+880 forms normalize consistently; ambiguous/missing values never manufacture IDs. Sender/master/client/payout/JID/LID cannot supply employee identity. Mobile matching alone does not confirm employment. Internal IDs remain separate; approved target bindings return both internal id and mobile employee_id. Assignment mobile foreign keys use the latter.

Every alias/contact/decision retains file/checksum, document/decoded pointer, record/payload hash and original message/export/library/line/media reference. Missing native WhatsApp URLs remain null. All source fields remain shape-checked, unknown keys fail closed, missing target capability stays SCHEMA_GAP. Existing exact selectors/checksums and type/null/rejection definitions remain in the machine specification. No accepted operational rows or financial promotion occur.

See [OWNER_BUSINESS_POLICY.md](OWNER_BUSINESS_POLICY.md) and [owner-business-rules.json](owner-business-rules.json).

---

## Retained preparation audit (historical; conflicting identity assumptions SUPERSEDED)

The following original audit is retained for traceability. Where it conflicts with EMP-001–006 above, it is historical and not current authority.

# Employee and program source mapping

9 October 2026, Asia/Dhaka. Version `employee-program-v1`; source files remain unchanged. The machine specification `employee-program-mapping-v1.json` pins exact source path/SHA256, selector, observed shape including nested keys/types, exact field names, actual vs proposed target/type, transformation, validation, identity/provenance, missing/null rules and duplicate semantics. No candidate table is described as live. A change to this specification requires a new reviewed version; the dry-run manifest also includes the specification content hash.

| File at /var/lib/vps/al-rifai/evidence | SHA256 | Selected records |
|---|---|---|
| accounts-snapshot.json | e8bb01f520f035362acd1284419e6929ec02547edaef1b0ebcfcf2c0a914e5c2 | 7,038 decoded accountsCash identity-label candidates; no amount or financial posting |
| conversation-snapshot.json | 63cd86a078268046deb2ce0e3186dba7ebda0cf323ed7e5e7e58df6f2fb0d8d4 | 646 programs, 1,668 programEvidence, 843 links, 94 conflicts |
| chat-archive.json | 9f2ba5c0e881e19bb1a7df50ac86c25fc479550dc707bc0737b20c22a46ec872 | 1,204 programs = 582 program + 622 vessel-reference occurrences |
| operations.json | e41b24393a6822c74e9f8f87dca538e9dc0e2f38c93c1e8791907d805d6a8547 | 85 programs; excludes cash/excel/bills/etc from business promotion |
| recovered-programs.json | 5b1761598fe4619ab416b6ead7c3502b8670a8eda9fd103ce6a55b40fde3bf86 | Root array of 5 rows, not a fabricated JSON object `rows` property |

Seed-source.ts hash 1e6e1566e6c2baf4f2b0bd2d0bd1a4e05d33ab90400ee374ef5c7f27071bdc52 is checked as provenance, not executed. All six hashes and file byte sizes are checked against existing evidence-checksums.json. Four original v10 data files were independently compared byte-for-byte by SHA256; no original export/workbook/identity document becomes available through these projections.

For chunk sources the manifest gives documentPointer `/chunks/N/payload`, decodedPointer `/M`, payload SHA256, file SHA256, source record ID and raw canonical record hash. Exact field location is decodedPointer plus JSON-pointer-escaped field name; nested details follow the observed shape properties. For plain arrays the pointer is `/programs/N`; recovered root array is `/N`. Selector `rows` in the machine spec is an internal root-array label, never an asserted source key. Original source bytes stay in immutable evidence; raw record is retained by the proposed occurrence table, while report comparison strings are separate. Reports do not replace original labels with normalized labels.

| Exact source fields | Live target considered | Proposed conditional target/meaning |
|---|---|---|
| accountsCash.name, employeePhone | site_cash_archive.name/employeePhone do not provide HR identity | ep_employee_history.value with name/contact kind, independently approved employee and effective dates. Historical label only until approval. No employee code is inferred. |
| motherVessel, lighterVessel | programs.motherVessel/lighterVessel are compatibility text | ep_vessel_aliases.label plus separately approved ep_program_vessels mother_id/lighter_id. Name never generates an FK. |
| escortName, escortMobile | programs.escortName/escortMobile are compatibility text | Employee name/contact assertions only. Assignment FK/event requires independent person/program/lighter/date evidence. |
| startDate, endDate, shift | programs.startDate/endDate/shift text | ep_programs typed date/date/text after exact ISO calendar validation and independent business approval. Blank end remains unknown; D/N only, no fabricated shift. These dates do not prove actual duty. |
| destination | programs.destination text | Approved exact registration destination; legacy releasePoint substitution is a review defect, never corrected by guessing. |
| status | programs.status text | Preserve raw source status. ep_programs.lifecycle requires separate approved state assertion; Recorded is not Active, Escort change requires event chain, Release review/Released does not prove completion. |
| id, createdAt, duplicateOf, revision, source, notes | Existing columns are display/parser state, not import identity/approval | Preserve under ep_source_occurrences.raw_record; source id stays lineage, parser-createdAt is not assignment/import time, duplicateOf is not operational dedupe approval. |
| aliases, evidence, conflicts; links.alias/id; conflicts.programId/field/existing/incoming/sourceRow | No typed existing binding/decision authority | Preserve all original values and append explicit approved source bindings/decisions only when supplied. No alias edge resolves physical vessel/program/person identity. |
| details.* | Existing programs.details text whitelist is lossy | Preserve full object including recordKind, sourceMessageId/date/line, sender, rawPhones, sourceSha256, sourceChat, sourceStatus, documentKind, endShift, releaseConfirmed, releaseDate/Point, issues, legacyMisprojectedDestination, location and observed older metadata. No release, completion, contact or location fact inferred. |
| All other accountsCash fields, including identityVerified, identityRule, identityProofKind, receiverIdentity, payoutPhone, senderPhone, date/time, sourceId/Line, amountCents/method/category/purpose/status/issues | Financial/source attestations are not employee identity | PROVENANCE_ONLY complete raw preservation. identityVerified qualifies historical instruction interpretation, not employment. No amount is accepted into finance; payout/JID/sender never becomes person ID. |

All accepted preservation fields target candidate `ep_source_occurrences.raw_record` jsonb; nested original fields are preserved intact. Comparison-v1 is NFC, Bengali digit translation, trim and lowercase only; it does not strip vessel prefixes, transliterate or merge identities. No phone-to-E.164 promotion is currently enabled. Unknown top-level or nested source keys produce UNKNOWN_SOURCE_KEY and remain in original evidence; type mismatches and missing shape-required keys produce SOURCE_TYPE/MISSING_SOURCE_KEY. Unknown array items are rejected, never dropped.

Missing proposed semantic tables are SCHEMA_GAP. Independent authority gaps are BLOCKED. Reference/assertion records are MANUAL_REVIEW/EVIDENCE_ONLY and are not operational import candidates. Missing six required program fields, dates/shift, future dates, date order, source conflicts, cross-version payload conflicts and unverified FK bindings get explicit row reasons. Shape-valid does not mean business-valid. Contact ownership/history and alias periods remain unproven. Multi-name-phone and multi-phone-name groups are candidate signals, not distinct employee counts or approved merges.

Approvals are passive synthetic inputs to pure validation tests only. The actual dry-run CLI explicitly refuses external approval ingestion: there is no authorizing reviewer UI or independently attested approved-binding dataset in current evidence. Even reviewed identities alone cannot manufacture assignment/business proof. Eligibility intentionally remains zero until that workflow is separately implemented and qualified; this preparation must not be advertised as an import-ready verified historical batch.

Occurrence idempotency hashes source version + exact pointer + payload hash + source ID. Record content hash uses recursively sorted object keys, preserved array order, JSON.stringify UTF-8; absent/null/blank differ. Same occurrence receives a duplicate reason, changed source version gets a different occurrence, same ID with differing assertions receives conflict reasons. Target business identity must use an independently approved reference, never source labels. Future SQL bindings add unique occurrence/role and exact typed FK protection, with insert-only no-op/hash mismatch semantics described in the schema proposal.
