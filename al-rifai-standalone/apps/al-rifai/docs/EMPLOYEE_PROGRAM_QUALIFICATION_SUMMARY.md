> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Employee/program integrated qualification — 9 October 2026, Asia/Dhaka

Accepted working baseline: **employee-program-v4-lifecycle**. Business rules are approved and isolated SQL qualification passed. Historical operational readiness remains blocked by sender authority, release media/OCR, operational bindings and reader integration. No approved business rule needs reapproval.

| Gate | Current status |
|---|---|
| Business rules | APPROVED |
| Historical evidence | PARTIAL; no historical candidate promoted to an operational record |
| Release OCR | BLOCKED; original media unavailable |
| Isolated SQL | PASS; 30 tests passed, 0 failed, 0 skipped |
| Reader integration | UNRESOLVED; nine qualification tests passed, production defects remain |
| Production migration / historical import | NOT AUTHORIZED |
| Deployment / service restart | NOT AUTHORIZED |

## Reconciliation of retained reports

The [dry-run report](EMPLOYEE_PROGRAM_DRY_RUN_REPORT.md) preserves preparation, identity-policy and lifecycle history. Its earlier 28/71-test results, 822-block classifier, unqualified-SQL statements and superseded identity conclusions are historical. The [lifecycle verification report](PROGRAM_LIFECYCLE_VERIFICATION_REPORT.md) advances the classifier to 957 blocks and 113 tests. Its pending-SQL statements are superseded by the later [isolated SQL qualification report](ISOLATED_SQL_QUALIFICATION_REPORT.md). The [historical evidence reconciliation report](HISTORICAL_EVIDENCE_RECONCILIATION_REPORT.md) supplies the latest evidence triage and limited finance sender attestation.

The [owner policy](OWNER_BUSINESS_POLICY.md), [machine register](owner-business-rules.json) and [lifecycle implementation](PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md) remain authoritative for business meaning. Normalized Employee Ledger mobile is the operational identity key; internal relational IDs remain separate. Same-mobile names are preserved aliases; same-name/different-mobile identities remain separate unless explicitly linked by the owner. Sender, Master, Client, payout and JID/LID values cannot substitute for employee-mobile evidence.

## Historical evidence and import status

| Measurement | Qualified result |
|---|---|
| Selected source occurrences | 11,583 = 7,038 employee + 1,318 programme + 3,227 evidence/reference |
| Structural validation | 11,583 valid; zero unknown-key rows or exact duplicate selected occurrences |
| Import classification | 8,356 BLOCKED; 3,227 evidence-only MANUAL_REVIEW; zero eligible |
| Employee Ledger matching | 7,007/7,038 occurrences match 1,457 normalized mobile keys; no employee inserted |
| Names and unresolved mobiles | 2,270 original name facts; 417 same-mobile alias groups; 300 same-name/different-mobile groups remain separate; 31 missing-mobile occurrences unresolved |
| Current programme projections | 646 historical projections; 50 conflicts retained |
| Lifecycle extraction | 957 blocks; 111 complete confirmation-field blocks; zero verified programme confirmations |
| Independent operational target bindings | 0/11,583 selected occurrences |
| Release helper evidence | 68 candidates; zero verified releases; zero original media files available |
| Ghat review evidence | 2,507 BDT 200 instruction occurrences; 145 groups; 101 strong consecutive-three-day review groups; zero verified transfers |

These units overlap or describe different views and must not be summed as unique people/programmes. Evidence-triage labels such as INCOMPLETE_DRAFT, CANCELLATION_REVIEW and CORRECTION_CANDIDATE do not establish accepted orders or transitions. The eleven candidate tables remain absent from production in the recorded catalog; isolated schema success does not resolve that production schema gap or authorize migration.

One existing owner-attested, export/sender-scoped finance Admin binding covers 9,002 original payment-instruction messages. Native sender transport identifiers are absent. This authority cannot be extended to programme confirmation or other chats. Of 23 sender groups, one has that limited attestation and 22 remain pending; verified programme Admin, Client, Requester and Employee sender bindings remain zero.

All 31 missing-mobile occurrences were examined at their source lines; recovery remains 0/31. Original release media was not found in documented evidence/staging/application roots or the original ZIP. Actual OCR has not run or been qualified; synthetic extraction tests establish only the offline contract. Release, completion, settlement approval and payment completion remain distinct. No dates, totals, employment facts or financial postings were fabricated. Native WhatsApp message URLs remain unavailable; archive references are retained without inventing URLs.

## SQL, reader qualification and integrity

The corrected eleven-table SQL candidate passed **30 isolated tests** after fixing a PostgreSQL CHECK predicate that admitted JSON `eventType: null` through UNKNOWN. The fix uses `COALESCE(..., false)` without changing owner rules or table architecture. Corrected candidate SHA256: `3d98b7cf26d131842aa5e23ece1b786e5bc094c810807e81bf8e8dbb92f7efff`.

Qualification covered constraints, immutable records, source/block replay, rollback, concurrency and compatibility with the existing `programs(id)` anchor. Both disposable PostgreSQL instances and their private credential were removed; no persistent test volume was created. Completed SQL rehearsal should not be repeated without a new change or unresolved failure that requires it.

The existing lifecycle suite recorded **113 PASS, 0 FAIL, 0 SKIP**; three existing workflow/source-register/phase1 assertion scripts also passed. **Nine reader qualification tests passed**, reproducing unchanged-reader defects and validating a limited proposal. Remaining defects are same-name/different-mobile heuristic merging, ambiguous overlays displaying three rows instead of two, and unique overlays retaining source identity/status rather than authoritative accepted programme identity/status. The [reader compatibility patch](employee-program-reader-compatibility.patch) remains unapplied and addresses only the mobile-aware name fallback guard; canonical rendering still needs explicit approved source-to-target binding integration.

Recorded production before/after read-only frames were byte-identical: nine tables, six migration ledger entries and 54 unchanged snapshots. Evidence checksums and migrations 0000–0005 were preserved. These are prior qualification results, not a new live inspection performed for this summary rewrite. No production business writes, import, live WhatsApp operation, outbound message, deployment, restart or recovery execution occurred during qualification.

## Next todos — smallest useful sequence

1. **Resolve one programme sender authority scope.** Review an exact export hash, chat key, sender, role, business scope, effective validity and owner-attested evidence. Start with a sender responsible for a complete confirmation block. Preserve the existing finance-only attestation without widening it. Deliverable: one traceable authority decision, with conflicts and remaining groups explicitly pending.
2. **Resolve one programme/event binding.** Pair the selected source occurrence and original block/event key with authoritative vessel, programme and assignment references. Record approved target identities, effective dates and distinct confirmation/assignment/actual-start or transition evidence. Keep the 31 missing employee mobiles unresolved unless explicit employee-role evidence becomes available. Deliverable: one reviewable source-to-target decision; no invented database IDs or accepted import batch.
3. **Obtain one original release document.** Tie exact image/PDF bytes and checksum to its archived message and any page reference. Once extraction work is explicitly approved, qualify the actual OCR/extractor on those bytes, retain raw output and review mobile, chronology, release fields and unique programme linkage. Deliverable: verified release evidence or documented ambiguity; completion and payment require their own evidence. Media acquisition can proceed alongside sender/binding review.
4. **Implement reader integration only after explicit code-change approval.** Apply or refine the minimal mobile-aware guard, then integrate approved bindings so accepted programme IDs/statuses render authoritatively and ambiguous evidence stays reviewable. Verify different-mobile name separation, ambiguous row counts, accepted identity/status and existing fallback behaviour. Deliverable: a reviewable reader change with focused validation; the existing nine-test result is not deployment acceptance.
5. **Review one bounded candidate end to end.** After relevant evidence and reader work are ready and separately authorized, extend the passive review/validation path as needed to evaluate that exact authority/binding package. The historical CLI currently refuses external approvals; private manifests are not accepted batches. Confirm provenance, policy version, event scope, lifecycle reconstruction, replay/conflict handling and remaining blockers. Broaden only after this small case is reviewable.
6. **Prepare a separate production approval package when gates are satisfied.** Specify exact schema/migration hash, bounded reviewed manifest, approval ingestion/import validation, least-privilege migrator/writer, reader acceptance, rollback/recovery and deployment checks. Obtain explicit authorization for production migration, import and any deployment/restart before executing them. Those actions are not authorized by this documentation update or isolated SQL PASS.

No repeated business-rule approval, recovery expansion or completed qualification rerun is planned. WhatsApp installation remains a separate README priority and approval scope; it does not verify historical sender roles or release documents.

Private manifests/test artifacts contain personal historical evidence and must remain private. The [qualification file inventory](employee-program-file-changes.json) records earlier implementation/qualification changes; this documentation-only rewrite does not refresh that inventory or its hashes.
