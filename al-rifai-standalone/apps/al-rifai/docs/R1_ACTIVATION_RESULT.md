# R1 repair result — 16 October 2026 (Asia/Dhaka)

**NOT ACCEPTED — permission blocker repaired and same candidate live; genuine source-authorized confirmation still absent.**

The Owner explicitly approved the prepared column-scoped program correction and
receipt plus reactivation of the same candidate. Fresh preflight found ledger 13,
unchanged 0012 and the expected read-only runtime program rights. Applied
`0013_program_command_permissions.sql`, SHA256
`ca9044bd197808d1141b8fcc7cbdf86b9dbcaeb6aecafa987e213d2fc144ef65`, and its
receipt in one transaction. Ledger is now 14. The 17 INSERT and 12 UPDATE columns
match `executeCanonicalProgramCommand` exactly. No UPDATE to id/source/notes/
duplicateOf/createdAt, DELETE/TRUNCATE, registry/financial authority, role membership,
password/pool bypass or trigger disablement was added. Actual ir_review_runtime
login verified row locking, exact insert/update, revision CAS, immutable history
and rollback of its labelled SQL fixture; that fixture is not operational acceptance.

App is healthy on the SAME approved candidate
`sha256:f88af2ed49cef8bfeea237f3449ce9f14f14c6ea67e901c11c1d0b1e96b0c097`.
Only app was recreated. Financial is OFF. PostgreSQL and both WhatsApp container
IDs/images/start/restart counts match the pre-repair snapshot. Existing 0012 hash
`f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8`, actor
guard and program history trigger are unchanged. Original 24 REVIEW cash rows
retain their full-row digest; all distinct/repeated Accountant instructions remain.
Cash postings/movements and assignments are zero.

Live Client acceptance: only the approved 30-message range was scanned. Seven
real source facts now link five canonical Draft programs and two unlinked Review
confirmations. Exact 30-message replay extracted zero new facts and replayed seven;
source operation IDs/native progress were preserved. These facts predate current
role-effective bindings; historical admission is false. Two outgoing confirmations
remain unmatched and historically unauthorized. Confirmed programs = 0. Neither
Draft count nor HTTP 200 counts as operational confirmation acceptance. The Owner
said they will supply an existing historical-evidence reference; no reference has
yet been supplied and no binding was backdated or role manufactured.

The first browser request stopped at the existing Basic gate (zero checks/import).
The next Client attempt rolled back on repository advisory-lock timeout during UI
loading. An isolated API run completed the bounded range and exact replay. These
attempts are retained in attempt1/attempt2 evidence, not silently reclassified PASS.
A subsequent actual Chromium run completed 44 checks on real desktop (1366px) and
mobile layout (390px): trusted HTTPS, named login/logout, anonymous denial, source-
revalidated Cash (24 rows), Roster (7 visible rows: 5 Draft + 2 Review), details,
search, CSV/print rechecks, layout and mixed v1/v2 generic reader. No intercepted
API responses, new browser installation, new app/test DB or synthetic conversation.
Physical phone and business-confirmation acceptance remain unverified.

Reader/rollback compatibility: the old image
`sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2`
fails on retained v2. It is NOT a supported operational rollback target. Actual
runtime contracts checked all retained 51 v1 + 24 v2 assertions before activation;
the live generic reader now displays both versions. The compatible recovery reader
is pinned to the approved candidate above. Old image restoration is emergency
login-only recovery with a declared v2 outage. Additive schema/grants/receipts and
source facts remain on app rollback; no destructive SQL or fabricated revocation.
Any different fallback image requires its exact source diff/pin and approval.

Source follow-up prepared, NOT deployed: preserve source-link historical authority
warnings on canonical roster rows (live candidate currently omits those warnings
from its canonical row projection); align OFFICE/RELEASE projection and final row
admission; tighten effective-date/money/rate provenance validation in the existing
duty calculator; disclose that permitted subject choices do not constitute native
saved/unsaved/unregistered inventory. Six targeted regression tests and 12 existing
business tests pass; typecheck passes. These are limited R2–R4 source increments,
not completed media/OCR, predecessor release, verified feeders, send-result ingest
or full contact directory. No new image built/deployed for these changes.

Evidence: `workflow-r1-repair-{review,preflight,result}.json`, exact transaction SQL,
`workflow-r1-runtime-boundary.json`, `workflow-r1-reader-contract.json`, reader diff,
`workflow-r1-live-client.json`, `workflow-r1-live-acceptance.json`, screenshots and
`workflow-r1-current-state.json` in data/. The original checksum-linked candidate
manifest/patch/evidence are historical and retained. Current release manifest
separately seals repair execution and pending source changes.

Do NOT run `workflow-direct-production.py --apply` (initial ledger-12 assumption)
or rerun `workflow-repair-production.py --apply` (ledger-13 assumption). Both
activations have occurred. Further confirmation depends on genuine dated source
proof, not another grant or a fabricated test chat. R2 group/socket/media actions,
R3 financial qualification and R4 inventory remain separately bounded work.

## Historical first attempt — 15 October 2026

# R1 activation result — 15 October 2026

**NOT ACCEPTED. App-only rollback completed; migration 0012 retained.**

Owner explicitly approved exact migration 0012/grants/receipt, prepared app image, failure rollback and bounded direct-chat extraction. Migration applied and ledger advanced to 13; six new tables exist. Candidate app became healthy, financial OFF, and WhatsApp/PostgreSQL services were not restarted.

Live extraction found a release blocker missed by the cash-only SQL rehearsal: `history-business.ts` queries `public.programs ... FOR UPDATE`, and canonical `program-command-boundary.ts` inserts/updates program rows under `ir_review_runtime`. The actual role has SELECT only. Migration 0012 grants the new table rights but does not grant the canonical program writer rights. Client pull failed with `permission denied for table programs` and its transaction rolled back. Do not count this as a Client/roster PASS.

Accountant's preceding 30-message scan persisted 24 cash instructions, all REVIEW. They are source-linked nonfinancial evidence; cash_postings and cash_movements remain zero. Canonical programs and roster_source_links remain zero. Preserve these facts; no destructive cleanup.

Authorized app-only rollback restored image `sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2`, healthy. Migration/receipt and evidence rows were retained. Named login returned 200. **Old generic extraction reader returned 400 INVALID_CONTRACT_INPUT after retained v2 facts.** This is a parser-version rollback compatibility gap, not source data loss; healthy/login do not mean full frontend acceptance. Current candidate reader supports v1/v2, but do not silently redeploy it or expand permissions without exact approval.

In-app browser bootstrap was unavailable. No new desktop/mobile live browser acceptance is claimed. Do not substitute previous synthetic browser acceptance for this failed live rollout.

Prepared correction: `R1_PROGRAM_PERMISSION_CORRECTION.sql`, only column-scoped INSERT on the canonical writer's 17 columns and UPDATE on its 12 command columns in public.programs, preserving existing SELECT, authorization/CAS and history trigger. This adds persistent writer authority and is NOT covered by the exact 0012-only grants approval. It has NOT been applied. No UPDATE to id/source/notes/duplicateOf/createdAt, DELETE, TRUNCATE, registry or financial capabilities are proposed.

Next exact action for review: allocate a fresh migration number after rechecking ledger (0013 expected), hash/receipt the correction, reactivate the SAME prepared candidate app image, then repeat only the previously blocked bounded Client path and source-aware Cash/Roster/legacy-reader acceptance. Retain approved app-only rollback behavior, but do not call old reader compatible until the v2 rollback gap is fixed or explicitly recorded. Financial stays OFF; WhatsApp/PostgreSQL unchanged. If a different image/code correction is needed, present that new pin before deploying.

Full workflow remains unfinished. Group/media/OCR, effective-rate/attendance, contact directory, attributable send-success and financial concurrency gates remain with the existing roadmap/handoff.
