# SOURCE TO OPERATIONAL SCHEMA AUDIT

Audit date: 9 October 2026, Asia/Dhaka. **AUDIT ONLY — NO IMPORT.**
Evidence confidence: live catalog/counts/hash comparison verified; business completion and identity authority remain limited. No source, application, schema, runtime or service changes were made.

## Authority, instructions and inspection boundary

Canonical application: `/opt/vps/apps/al-rifai`; overview: `/opt/vps/apps/al-rifai/README.md`; infrastructure authority: `/opt/vps/docs/VPS_MAP.md`; Phase 1 inventory: `/opt/vps/apps/al-rifai/docs/phase1-file-changes.json` (read). Existing Phase 2A gap/decision documents and Phase 2 implementation plan were reviewed and are referenced, not replaced. No equivalent of these three mapping deliverables existed.

Applicable parent/application AGENTS.md, entry/exit notes and designated agent activity log were searched in /, /opt, /opt/vps, application and its .agents/.github, plus relevant root instruction locations. No applicable policy or designated log was found; /opt/vps/.agents is empty. Dependency AGENTS.md files are not applicable to this documentation audit. The README's handoff and VPS map were read before database inspection. No new activity-log convention was invented. Entry: authorized read-only mapping audit. Exit: these three documents; implementation awaits explicit owner approval.

Authoritative deployment is the existing alrifai database, public schema, on vps-infra PostgreSQL; application role alrifai_app. Configuration names/paths were checked without reporting secret values. /etc/vps/apps/al-rifai/app.env selects PGHOST=vps-infra-postgres-1 and the private evidence directory. db/postgres.mjs fixes database alrifai/user alrifai_app and defaults sessions to read-only. Docker metadata access required sandbox escalation and was approved; SQL used BEGIN READ ONLY (catalog inspection also REPEATABLE READ) and SELECT only, ending in COMMIT or ROLLBACK. No migrator/importer/recovery command ran.

`/opt/vps/infra/compose.yaml` binds existing PG state /var/lib/vps/postgres; its on-disk contents could not be listed under the sandbox and were not needed to inspect the live catalog. App compose mounts evidence read-only. /var/lib/vps/whatsapp exists and is empty; no session/messages database was found there. Proposed account-specific WhatsApp paths do not exist under /var/lib/vps/al-rifai. This audit inspected historical exported projections, not a live WhatsApp session. No remote Core, hosting database, original Library file or unavailable document was fetched.

## Verified source inventory

All six evidence-file checksums match docs/evidence-checksums.json. Four JSON files match the original v10 data files byte-for-byte. Staging and canonical SOURCE-MANIFEST identify v10 source export, not a live D1 backup. The export's manifest commit is 3425b13f640016fdd7171ea1fda1c2d20c13f038; operations.analysis.repositoryCommit is d5551931a53b7b10bd89072ac1b48c72a4fcf8d9 (separate extraction provenance, not asserted to be deployment commit).

| Exact source path | Bytes | SHA-256 | Classification / duplicate location |
| --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json | 3804967 | e41b24393a6822c74e9f8f87dca538e9dc0e2f38c93c1e8791907d805d6a8547 | Historical derived evidence; identical /opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source/data/operations.json |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | 2731 | 5b1761598fe4619ab416b6ead7c3502b8670a8eda9fd103ce6a55b40fde3bf86 | Five recovered historical seed projections; not confirmed current programs |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | 6000862 | e8bb01f520f035362acd1284419e6929ec02547edaef1b0ebcfcf2c0a914e5c2 | Historical derived evidence; identical /opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source/data/accounts-snapshot.json |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | 9428183 | 63cd86a078268046deb2ce0e3186dba7ebda0cf323ed7e5e7e58df6f2fb0d8d4 | Historical derived evidence; identical /opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source/data/conversation-snapshot.json |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | 1878416 | 9f2ba5c0e881e19bb1a7df50ac86c25fc479550dc707bc0737b20c22a46ec872 | Historical derived evidence; identical /opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source/data/chat-archive.json |
| /var/lib/vps/al-rifai/evidence/seed-source.ts | 1138 | 1e6e1566e6c2baf4f2b0bd2d0bd1a4e05d33ab90400ee374ef5c7f27071bdc52 | Retained seed source; identical hash to v10 lib/seed.ts manifest entry |
Format: UTF-8 JSON, except seed-source.ts (TypeScript provenance). Snapshot chunks.payload is a JSON string containing an array, not an already decoded object. Counts below were computed by decoding every available array. Chunk counts are 36 conversation + 16 accounts; manifests add 2 PostgreSQL rows. JSON document totals are not unique business events; references, aliases, reviews and earlier/later exports overlap.


| Source dataset / exact array selector | Observed count | Purpose / authority |
| --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json#cash | 4607 | Unverified legacy instruction/workbook extraction |
| /var/lib/vps/al-rifai/evidence/operations.json#excel | 1024 | Unverified legacy instruction/workbook extraction |
| /var/lib/vps/al-rifai/evidence/operations.json#summaries | 1005 | Historical accountant summary statements; not balances |
| /var/lib/vps/al-rifai/evidence/operations.json#reviews | 3715 | Derived unresolved review items; not owner decisions |
| /var/lib/vps/al-rifai/evidence/operations.json#programs | 85 | Historical vessel/program projection; review before operational promotion |
| /var/lib/vps/al-rifai/evidence/operations.json#bills | 23 | 23 extracted BillGenerate snippets; not issued invoices |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json#rows | 5 | Historical vessel/program projection; review before operational promotion |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsCash | 7038 | Source-attested Admin instructions; receipt unverified; not HR identity proof |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsReviews | 2047 | Derived unresolved review items; not owner decisions |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsExcluded | 1798 | Reference IDs/evidence only |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#messages | 6221 | Historical message envelopes; event timestamp ≠ business-event date |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programs | 646 | Historical vessel/program projection; review before operational promotion |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programEvidence | 1668 | Underlying new parsing evidence; overlaps linked programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#conflicts | 94 | Source disagreement objects; 94 entries, plus dateOrder in program.conflicts |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#maritimeReviews | 399 | Derived unresolved review items; not owner decisions |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountReviews | 9002 | Derived unresolved review items; not owner decisions |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountantNotes | 1431 | Reference IDs/evidence only |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountMessages | 10434 | Historical message envelopes; event timestamp ≠ business-event date |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#links | 843 | Alias-to-projection edges; many-to-one target IDs are intentional |
| /var/lib/vps/al-rifai/evidence/chat-archive.json#messages | 3677 | Historical message envelopes; event timestamp ≠ business-event date |
| /var/lib/vps/al-rifai/evidence/chat-archive.json#programs | 1204 | Historical vessel/program projection; review before operational promotion |
| /var/lib/vps/al-rifai/evidence/chat-archive.json#entries | 162 | 149 payment-record labels + 13 Release notes; no payout/completion proof |
### Original inputs and business documents

The original TXT exports, XLSX workbooks, Release Slip images, receipts, employee identity documents and a live D1 backup were not present in the inspected canonical/staging/evidence trees. Original filenames, hashes and workbook statistics below are retained metadata, not proof this audit inspected the originals. Library IDs are historical references; no connected Library content was accessed.


| Retained metadata location | Original category / source key | Reported messages / rows | Reported period / availability |
| --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json $.summary.files[key=office] | office | 2458 | 2026-07-08 to 2026-10-06; original TXT absent; 597 unavailable-media messages |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json $.summary.files[key=hr] | hr | 2841 | 2022-11-20 to 2026-10-05; original TXT absent; 335 unavailable-media messages |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json $.summary.files[key=rs] | rs | 922 | 2026-01-17 to 2026-10-04; original TXT absent; 285 unavailable-media messages |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json $.summary.files[key=mamun] | mamun | 10434 | 2024-10-27 to 2026-10-06; original TXT absent; 27 unavailable-media messages |
| /var/lib/vps/al-rifai/evidence/chat-archive.json $.summary.files[0] | Earlier export 0 | 2792 | 2022-11-20 to 2026-09-30; original absent |
| /var/lib/vps/al-rifai/evidence/chat-archive.json $.summary.files[1] | Earlier export 1 | 885 | 2026-01-17 to 2026-10-01; original absent |
| /var/lib/vps/al-rifai/evidence/operations.json $.analysis.workbooks[0].sheets[0] | Cashbook 010126 to 090226 Master.xlsx / MasterBook | 2025 | Metadata only; 0 formulas; original XLSX absent |
| /var/lib/vps/al-rifai/evidence/operations.json $.analysis.workbooks[1].sheets[0] | Escort Program and Bill Generation.xlsx / SanMarineTCIS | 999 | Metadata only; 0 formulas; original XLSX absent |
| /var/lib/vps/al-rifai/evidence/operations.json $.analysis.workbooks[1].sheets[1] | Escort Program and Bill Generation.xlsx / BillGenerate  | 1055 | Metadata only; 122 formulas; original XLSX absent |
The current four conversation envelopes total 16,655 observed records (6,221 non-accounts + 10,434 accounts), with summary reporting 1,244 unavailable-media messages. The earlier chat archive has 3,677 observed messages; operations.analysis reports 10,310 original messages but operations.json does not retain a complete standalone message array. Those counts must not be summed as distinct conversations.

There is no observed authoritative employee roster, employment history, actual duty/attendance register, versioned salary policy, client master, service agreement, issued-invoice register or transfer receipt dataset. Counts of those real-world entities are UNKNOWN, not zero. Eleven conversation-policy profiles in /opt/vps/apps/al-rifai/data/conversation-policy.json are behavioral reference configuration, not personnel, salary policy or live relationship records. No salary promise/rate is promoted from free text.

## Live PostgreSQL schema

Catalog found exactly nine public base tables, no additional user-schema tables/views/materialized views/foreign tables. Eight application tables + migration ledger. All seven non-snapshot application tables contain 0 observed rows. Snapshot table has 54, migration ledger 6. Application-owned does not imply fully operational business coverage.

| Actual table | Class / actual purpose | Observed rows |
| --- | --- | --- |
| programs | Operational register/draft support. Sparse program register/correction overlay; denormalized vessel/escort labels; not an assignment or employee master. | 0 |
| reviews | Operational register/draft support. Pairwise program duplicate decisions (aId/bId), not source parsing-review objects. | 0 |
| datasets | Infrastructure. Dataset import marker; not a source record or provenance ledger. | 0 |
| site_cash_archive | Historical archive. Historical cash extraction archive; no posted money-transfer authority. | 0 |
| site_operation_notes | Operational register/draft support. Operator annotations on review IDs; not message bodies or source facts. | 0 |
| site_payment_drafts | Operational register/draft support. Application payment instruction drafts; not completed transactions. | 0 |
| site_settlement_drafts | Operational register/draft support. Application settlement calculation drafts; not completed Release Slips or payroll. | 0 |
| site_source_snapshots | Historical protected snapshot. Protected immutable historical chunks/manifests. | 54 |
| alrifai_schema_migrations | Infrastructure. Infrastructure migration checksum ledger. | 6 |
### Every actual column (live, not inferred)


| Table | Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- | --- |
| alrifai_schema_migrations | id | text | NO | none |
| alrifai_schema_migrations | sha256 | text | NO | none |
| alrifai_schema_migrations | applied_at | timestamp with time zone | NO | now() |
| datasets | id | text | NO | none |
| datasets | importedAt | text | NO | none |
| programs | id | text | NO | none |
| programs | motherVessel | text | NO | ''::text |
| programs | lighterVessel | text | NO | ''::text |
| programs | masterMobile | text | NO | ''::text |
| programs | destination | text | NO | ''::text |
| programs | escortName | text | NO | ''::text |
| programs | escortMobile | text | NO | ''::text |
| programs | startDate | text | NO | ''::text |
| programs | endDate | text | NO | ''::text |
| programs | shift | text | NO | ''::text |
| programs | status | text | NO | 'Recorded'::text |
| programs | source | text | NO | 'Manual entry'::text |
| programs | notes | text | NO | ''::text |
| programs | duplicateOf | text | YES | none |
| programs | createdAt | text | NO | none |
| programs | revision | integer | NO | 0 |
| programs | details | text | NO | '{}'::text |
| reviews | id | text | NO | none |
| reviews | aId | text | NO | none |
| reviews | bId | text | NO | none |
| reviews | decision | text | NO | none |
| reviews | note | text | NO | ''::text |
| reviews | createdAt | text | NO | none |
| site_cash_archive | id | text | NO | none |
| site_cash_archive | date | text | NO | none |
| site_cash_archive | source | text | NO | none |
| site_cash_archive | employeePhone | text | NO | none |
| site_cash_archive | name | text | NO | none |
| site_cash_archive | method | text | NO | none |
| site_cash_archive | amountCents | integer | NO | none |
| site_cash_archive | details | text | NO | none |
| site_operation_notes | id | text | NO | none |
| site_operation_notes | status | text | NO | none |
| site_operation_notes | note | text | NO | none |
| site_operation_notes | actor | text | NO | none |
| site_operation_notes | updatedAt | text | NO | none |
| site_payment_drafts | id | text | NO | none |
| site_payment_drafts | details | text | NO | none |
| site_payment_drafts | actor | text | NO | none |
| site_payment_drafts | createdAt | text | NO | none |
| site_settlement_drafts | id | text | NO | none |
| site_settlement_drafts | details | text | NO | none |
| site_settlement_drafts | actor | text | NO | none |
| site_settlement_drafts | createdAt | text | NO | none |
| site_source_snapshots | id | text | NO | none |
| site_source_snapshots | datasetId | text | NO | none |
| site_source_snapshots | kind | text | NO | none |
| site_source_snapshots | payload | text | NO | none |
| site_source_snapshots | contentHash | text | NO | none |
### Constraints, relationships, indexes and protections

Every table has only PRIMARY KEY(id) with its named *_pkey UNIQUE btree index. No foreign keys, other unique constraints, CHECK constraints, user enums or secondary indexes were found. In particular reviews.aId/bId, programs.duplicateOf, snapshot.datasetId and operation-note IDs have no database-enforced relation. Program date/status/phone values and JSON details/payload are text, so catalog types alone do not validate meaning or JSON structure. Actual program/review/cash relationship counts are zero because those tables are empty.


| Table | Actual constraint | Definition |
| --- | --- | --- |
| alrifai_schema_migrations | alrifai_schema_migrations_pkey | PRIMARY KEY (id) |
| programs | programs_pkey | PRIMARY KEY (id) |
| reviews | reviews_pkey | PRIMARY KEY (id) |
| datasets | datasets_pkey | PRIMARY KEY (id) |
| site_cash_archive | site_cash_archive_pkey | PRIMARY KEY (id) |
| site_operation_notes | site_operation_notes_pkey | PRIMARY KEY (id) |
| site_payment_drafts | site_payment_drafts_pkey | PRIMARY KEY (id) |
| site_settlement_drafts | site_settlement_drafts_pkey | PRIMARY KEY (id) |
| site_source_snapshots | site_source_snapshots_pkey | PRIMARY KEY (id) |

| Protection | Live definition |
| --- | --- |
| alrifai_snapshot_no_truncate | CREATE TRIGGER alrifai_snapshot_no_truncate BEFORE TRUNCATE ON public.site_source_snapshots FOR EACH STATEMENT EXECUTE FUNCTION alrifai_reject_snapshot_change() |
| alrifai_snapshot_immutable | CREATE TRIGGER alrifai_snapshot_immutable BEFORE DELETE OR UPDATE ON public.site_source_snapshots FOR EACH ROW EXECUTE FUNCTION alrifai_reject_snapshot_change() |
Function alrifai_reject_snapshot_change() is PL/pgSQL and always raises "Evidence snapshots are immutable". Both BEFORE UPDATE/DELETE row trigger and BEFORE TRUNCATE statement trigger exist. They were inspected, not exercised. No other public functions/triggers were found. Snapshot INSERT is not prevented by these triggers. alrifai_app owns all nine tables, is login-enabled, non-superuser, cannot create databases/roles; read-only pool settings are an application guard, not privilege separation.

All 54 stored snapshot IDs, dataset IDs, kinds, contentHash values and independently calculated payload SHA-256 values match the two source snapshots. No mismatch. The two manifest.contentHash values are chunk counts ("36" and "16"), not cryptographic hashes; this existing compatibility field must not be treated as a general integrity signature.


| Applied migration | Checksum matches current file | SHA-256 | Applied timestamp (UTC) |
| --- | --- | --- | --- |
| 0000_gorgeous_the_executioner.sql | Yes | fb2d9661657b954201adb7a6c7d6798b1c860a9f427f82b4cb8dddeee96eb6bf | 2026-10-07T21:05:59.743047+00:00 |
| 0001_loud_monster_badoon.sql | Yes | 32c8c1e5945d2a2e7b9a43469710f83e7a767d573680340b711abc16fb52044a | 2026-10-07T21:05:59.743047+00:00 |
| 0002_flashy_nico_minoru.sql | Yes | 2c72a9a3cf03675856ae96d8a0a37ec12023d84c09f7775dbb525181d9978552 | 2026-10-07T21:05:59.743047+00:00 |
| 0003_wide_exodus.sql | Yes | c1b8ccde321efbf92c2c4baaaa6abae6212b546474aade69541d0b5e821fc706 | 2026-10-07T21:05:59.743047+00:00 |
| 0004_wonderful_warlock.sql | Yes | 541123a96038c7ca77cbeccd43c1d46d6bac0b6aacf9a65d3ffa0a9f3e601f57 | 2026-10-07T21:05:59.743047+00:00 |
| 0005_snapshot_immutability.sql | Yes | 1163d1f86f205aad01d813d4d7e962a573551cbad9aa09f820e1f458b7b36b8e | 2026-10-07T21:05:59.743047+00:00 |
Current applied version: 0005_snapshot_immutability.sql; all six local SQL migration hashes match the ledger. No migration was applied.

## Existing models, validators and consumers

- db/schema.ts matches live columns; db/raw.ts exposes reads; db/postgres.mjs selects the one existing database.
- lib/programs.ts validateProgram accepts Recorded, Active, Completed, Cancelled, Released, Escort change. Database has no status enum or transition guard. Historical Date review (2) and Release review (19) do not pass that validator. Do not translate them into Completed.
- validateProgram trims labels, normalizes Bengali digits, validates calendar dates and D/N shift, accepts permissive phone syntax; missingFields lists mother/lighter/escort/destination/startDate/shift. Its minimal nonempty-label acceptance is weaker than operational completeness. Details whitelist drops unknown keys, including releaseConfirmed, endShift, rawPhones and other current evidence metadata. Its returned record also omits source evidence/aliases/conflicts and historical createdAt/duplicateOf. Reuse validation portions only with loss-accounting; do not run historical rows through it as an unconditional importer.
- lib/vessel-source.ts historicalRecord/historicalSnapshot overlays 646 source projections with stored programs or five fallback seed rows, aliases and candidate matching. Display reads truncate strings and interpret status/fields. No same-phone/name matching algorithm here is an approved employee/program resolver.
- lib/accounts-snapshot.ts resolves instruction.sourceId against retained accountMessages; observed orphan source refs: 0. Source attestation verifies sender/export context, not the employee beneficiary or receipt.
- lib/cash-source.ts merges legacy cash/excel by source ID, lets stored details override same IDs, and then concatenates accountsCash. Different IDs describing one payment remain distinct. Legacy rows are explicitly identityVerified=false.
- lib/program-workflows.ts releaseState requires endDate/endShift/releasePoint and verified completion context. The 646 current source programs have releaseConfirmed=false; 0 verified releases observed. The formatter is preview/copy only.
- lib/operations.ts validateDraft requires name, separate employee/payout phone, amount, method, purpose, date; calculateSettlement uses caller days/rate and fixed BDT 150 food deduction per day. That constant is not historical salary authority and must never be applied automatically.
- app/api/register, vessels, operations, import-audit expose historical reads; their mutation exports return 405. operations reviews use site_operation_notes, bills use source.bills, draft views parse details. APIs were inspected in source; no operational API writes executed.
- scripts/database.mjs only imports immutable snapshot chunks; its checksum checks, transaction handling, conflict-on-content and advisory-lock pattern are reusable. It is not an operational importer.
- scripts/update_accounts.py and update_conversations.py parse original exports and write a newly selected offline directory; scripts/operations/import_sources.py and ingest_chats.py also write extracted files. Inspected only; not executed. Missing original inputs prevent full reconstruction qualification.

## Mapping specification and universal controls

Each row below has all required mapping attributes. Exact JSON selectors identify fields actually observed. A parent object serialization maps bytes to an existing text field; it does not supply missing employee/finance semantics. UNMAPPED means there is no safe semantic target in the current operational schema. MISSING SOURCE means an actual target column cannot be filled from trustworthy available business evidence.

Rules used in tables:
P1 = preserve original spelling; normalize Bengali digits/phone into a separate comparison value only; Bangladesh E.164 candidate +8801[3-9] plus 8 digits only when source country/role is established. Shared/reassigned phone/name is never a match. No transliteration aliases without owner-reviewed evidence.
P2 = source-version-qualified record identity (file SHA-256, JSON pointer, retained id); target ID must remain stable after retries and cross-version linkage needs explicit decisions. Do not generate by vessel/name/date alone.
P3 = date/start/end/shift kept as separate facts; exact ISO calendar/date order checked; message dates, createdAt and importedAt never substitute for duty/attendance/payment dates.
P4 = archive-only instructions remain receipt-unverified; integer minor units must be positive and <=2147483647; BDT is application display convention, not a source currency field.
P5 = owner-approved source-to-target binding plus provenance/alias preservation required before promotion. Existing empty target does not waive business verification.

A verified syntactic column mapping is distinct from an eligible business record. All operational promotion remains review required or blocked. No foreign-key links are inferred from names.

### Vessel/program field mappings

| Source file | Source field | Source type | Target table | Target column | Target type | Transformation | Identity resolution | Validation | Null handling | Deduplication | Source provenance | Confidence | Import eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].id | str | programs | id | text | Retained source id → stable P2 binding; no new random ID | P5; employee/program/vessel authority separately verified | Nonempty; <=100; collision/content comparison | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].motherVessel | str | programs | motherVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].lighterVessel | str | programs | lighterVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].masterMobile | str | programs | masterMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].destination | str | programs | destination | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].escortName | str | programs | escortName | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].escortMobile | str | programs | escortMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].startDate | str | programs | startDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].endDate | str | programs | endDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].shift | str | programs | shift | text | Preserve D/N/blank; normalize only explicit label | P5; employee/program/vessel authority separately verified | D/N; blank requires review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].status | str | programs | status | text | Preserve historical status in provenance; no automatic current-state promotion | P5; employee/program/vessel authority separately verified | Owner approves effective state; Date/Release review cannot be passed to current validator | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].source | str | programs | source | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].notes | str | programs | notes | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].duplicateOf | NoneType | programs | duplicateOf | text | Preserve null; nonnull allowed only approved existing ID binding | P5; employee/program/vessel authority separately verified | Referenced record exists; no self/cyclic duplicate chain | Preserve null | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].createdAt | str | programs | createdAt | text | Preserve as source projection timestamp only; never claim actual operational creation/duty | P5; employee/program/vessel authority separately verified | Parser-derived vs genuine timestamp identified; timezone unknown strings stay unknown | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].revision | int | programs | revision | integer | Preserve nonnegative integer as historical revision; new operational revision policy must be approved | P5; employee/program/vessel authority separately verified | Integer 0..2147483647 | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/operations.json | $.programs[*].details | dict | programs | details | text | Canonical JSON serialization of original details; preserve every key; do not use destructive whitelist | P5; employee/program/vessel authority separately verified | Object parses; complete source lineage retained externally | Missing object → review; no silent loss | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/operations.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].id | str | programs | id | text | Retained source id → stable P2 binding; no new random ID | P5; employee/program/vessel authority separately verified | Nonempty; <=100; collision/content comparison | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].motherVessel | str | programs | motherVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].lighterVessel | str | programs | lighterVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].masterMobile | str | programs | masterMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].destination | str | programs | destination | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].escortName | str | programs | escortName | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].escortMobile | str | programs | escortMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].startDate | str | programs | startDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].endDate | str | programs | endDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].shift | str | programs | shift | text | Preserve D/N/blank; normalize only explicit label | P5; employee/program/vessel authority separately verified | D/N; blank requires review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].status | str | programs | status | text | Preserve historical status in provenance; no automatic current-state promotion | P5; employee/program/vessel authority separately verified | Owner approves effective state; Date/Release review cannot be passed to current validator | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].source | str | programs | source | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].notes | str | programs | notes | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].duplicateOf | NoneType | programs | duplicateOf | text | Preserve null; nonnull allowed only approved existing ID binding | P5; employee/program/vessel authority separately verified | Referenced record exists; no self/cyclic duplicate chain | Preserve null | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].createdAt | str | programs | createdAt | text | Preserve as source projection timestamp only; never claim actual operational creation/duty | P5; employee/program/vessel authority separately verified | Parser-derived vs genuine timestamp identified; timezone unknown strings stay unknown | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].revision | int | programs | revision | integer | Preserve nonnegative integer as historical revision; new operational revision policy must be approved | P5; employee/program/vessel authority separately verified | Integer 0..2147483647 | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/recovered-programs.json | $[*].details | dict | programs | details | text | Canonical JSON serialization of original details; preserve every key; do not use destructive whitelist | P5; employee/program/vessel authority separately verified | Object parses; complete source lineage retained externally | Missing object → review; no silent loss | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/recovered-programs.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].id | str | programs | id | text | Retained source id → stable P2 binding; no new random ID | P5; employee/program/vessel authority separately verified | Nonempty; <=100; collision/content comparison | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].motherVessel | str | programs | motherVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].lighterVessel | str | programs | lighterVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].masterMobile | str | programs | masterMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].destination | str | programs | destination | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].escortName | str | programs | escortName | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].escortMobile | str | programs | escortMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].startDate | str | programs | startDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].endDate | str | programs | endDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].shift | str | programs | shift | text | Preserve D/N/blank; normalize only explicit label | P5; employee/program/vessel authority separately verified | D/N; blank requires review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].status | str | programs | status | text | Preserve historical status in provenance; no automatic current-state promotion | P5; employee/program/vessel authority separately verified | Owner approves effective state; Date/Release review cannot be passed to current validator | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].source | str | programs | source | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].notes | str | programs | notes | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].duplicateOf | NoneType | programs | duplicateOf | text | Preserve null; nonnull allowed only approved existing ID binding | P5; employee/program/vessel authority separately verified | Referenced record exists; no self/cyclic duplicate chain | Preserve null | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].createdAt | str | programs | createdAt | text | Preserve as source projection timestamp only; never claim actual operational creation/duty | P5; employee/program/vessel authority separately verified | Parser-derived vs genuine timestamp identified; timezone unknown strings stay unknown | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].revision | int | programs | revision | integer | Preserve nonnegative integer as historical revision; new operational revision policy must be approved | P5; employee/program/vessel authority separately verified | Integer 0..2147483647 | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].details | dict | programs | details | text | Canonical JSON serialization of original details; preserve every key; do not use destructive whitelist | P5; employee/program/vessel authority separately verified | Object parses; complete source lineage retained externally | Missing object → review; no silent loss | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].evidence | list | UNMAPPED | — | — | No dedicated target; preserve originals and approved provenance ledger before promotion | Alias is not employee/program identity proof | No dropping multi-source conflict/evidence | Preserve array | Source-version pointer | SHA-256 + retained program id | Unresolved semantic target | Blocked until provenance design approved |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].aliases | list | UNMAPPED | — | — | No dedicated target; preserve originals and approved provenance ledger before promotion | Alias is not employee/program identity proof | No dropping multi-source conflict/evidence | Preserve array | Source-version pointer | SHA-256 + retained program id | Unresolved semantic target | Blocked until provenance design approved |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programs].payload(JSON)[*].conflicts | list | UNMAPPED | — | — | No dedicated target; preserve originals and approved provenance ledger before promotion | Alias is not employee/program identity proof | No dropping multi-source conflict/evidence | Preserve array | Source-version pointer | SHA-256 + retained program id | Unresolved semantic target | Blocked until provenance design approved |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].id | str | programs | id | text | Retained source id → stable P2 binding; no new random ID | P5; employee/program/vessel authority separately verified | Nonempty; <=100; collision/content comparison | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].motherVessel | str | programs | motherVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].lighterVessel | str | programs | lighterVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].masterMobile | str | programs | masterMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].destination | str | programs | destination | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].escortName | str | programs | escortName | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].escortMobile | str | programs | escortMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].startDate | str | programs | startDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].endDate | str | programs | endDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].shift | str | programs | shift | text | Preserve D/N/blank; normalize only explicit label | P5; employee/program/vessel authority separately verified | D/N; blank requires review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].status | str | programs | status | text | Preserve historical status in provenance; no automatic current-state promotion | P5; employee/program/vessel authority separately verified | Owner approves effective state; Date/Release review cannot be passed to current validator | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].source | str | programs | source | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].notes | str | programs | notes | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].duplicateOf | NoneType | programs | duplicateOf | text | Preserve null; nonnull allowed only approved existing ID binding | P5; employee/program/vessel authority separately verified | Referenced record exists; no self/cyclic duplicate chain | Preserve null | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].createdAt | str | programs | createdAt | text | Preserve as source projection timestamp only; never claim actual operational creation/duty | P5; employee/program/vessel authority separately verified | Parser-derived vs genuine timestamp identified; timezone unknown strings stay unknown | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].revision | int | programs | revision | integer | Preserve nonnegative integer as historical revision; new operational revision policy must be approved | P5; employee/program/vessel authority separately verified | Integer 0..2147483647 | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.programs[*].details | dict | programs | details | text | Canonical JSON serialization of original details; preserve every key; do not use destructive whitelist | P5; employee/program/vessel authority separately verified | Object parses; complete source lineage retained externally | Missing object → review; no silent loss | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/chat-archive.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].id | str | programs | id | text | Retained source id → stable P2 binding; no new random ID | P5; employee/program/vessel authority separately verified | Nonempty; <=100; collision/content comparison | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].motherVessel | str | programs | motherVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].lighterVessel | str | programs | lighterVessel | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].masterMobile | str | programs | masterMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].destination | str | programs | destination | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].escortName | str | programs | escortName | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].escortMobile | str | programs | escortMobile | text | P1; preserve raw; valid explicit phone normalized only after role/country verification | P5; employee/program/vessel authority separately verified | Not payout fallback, no guessed digits; person link separately verified | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].startDate | str | programs | startDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].endDate | str | programs | endDate | text | P3: validate exact ISO date, retain blank unknown; no inferred dates | P5; employee/program/vessel authority separately verified | Real calendar date; end>=start; future/outlier review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].shift | str | programs | shift | text | Preserve D/N/blank; normalize only explicit label | P5; employee/program/vessel authority separately verified | D/N; blank requires review | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].status | str | programs | status | text | Preserve historical status in provenance; no automatic current-state promotion | P5; employee/program/vessel authority separately verified | Owner approves effective state; Date/Release review cannot be passed to current validator | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].source | str | programs | source | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].notes | str | programs | notes | text | Preserve exact source string; P1; no truncation | P5; employee/program/vessel authority separately verified | Text length/semantics reviewed; P5 | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].duplicateOf | NoneType | programs | duplicateOf | text | Preserve null; nonnull allowed only approved existing ID binding | P5; employee/program/vessel authority separately verified | Referenced record exists; no self/cyclic duplicate chain | Preserve null | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].createdAt | str | programs | createdAt | text | Preserve as source projection timestamp only; never claim actual operational creation/duty | P5; employee/program/vessel authority separately verified | Parser-derived vs genuine timestamp identified; timezone unknown strings stay unknown | Preserve empty as unknown historical value; operational required empty → review | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].revision | int | programs | revision | integer | Preserve nonnegative integer as historical revision; new operational revision policy must be approved | P5; employee/program/vessel authority separately verified | Integer 0..2147483647 | Reject missing | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=programEvidence].payload(JSON)[*].details | dict | programs | details | text | Canonical JSON serialization of original details; preserve every key; do not use destructive whitelist | P5; employee/program/vessel authority separately verified | Object parses; complete source lineage retained externally | Missing object → review; no silent loss | P2; aliases/overlaps never auto-merge | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json + SHA-256 + selector + source id | Verified column compatibility; business identity ambiguous | Review required; programEvidence/reference rows blocked as independent programs |
### Cash/instruction field mappings

| Source file | Source field | Source type | Target table | Target column | Target type | Transformation | Identity resolution | Validation | Null handling | Deduplication | Source provenance | Confidence | Import eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].employeePhone | str | site_cash_archive | employeePhone | text | Preserve source role label; no employee creation | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].payoutPhone | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].name | str | site_cash_archive | name | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].amountCents | int | site_cash_archive | amountCents | integer | P4; preserve minor units, never *100 again | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].method | str | site_cash_archive | method | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].issues | list | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].id | str | site_cash_archive | id | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].date | str | site_cash_archive | date | text | Preserve instruction/workbook date; not proven payment date | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].time | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].source | str | site_cash_archive | source | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].sourceId | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].sourceLine | int | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].sourceText | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].sender | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].category | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].status | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.cash[*].purpose | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].id | str | site_cash_archive | id | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].employeePhone | str | site_cash_archive | employeePhone | text | Preserve source role label; no employee creation | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].payoutPhone | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].name | str | site_cash_archive | name | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].amountCents | int | site_cash_archive | amountCents | integer | P4; preserve minor units, never *100 again | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].date | str | site_cash_archive | date | text | Preserve instruction/workbook date; not proven payment date | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].time | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].source | str | site_cash_archive | source | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].sourceId | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].sourceLine | int | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].sourceText | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].sender | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].category | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].status | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].purpose | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].method | str | site_cash_archive | method | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/operations.json | $.excel[*].issues | list | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].employeePhone | str | site_cash_archive | employeePhone | text | Preserve source role label; no employee creation | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].payoutPhone | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].name | str | site_cash_archive | name | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].amountCents | int | site_cash_archive | amountCents | integer | P4; preserve minor units, never *100 again | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].method | str | site_cash_archive | method | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].identityRule | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].issues | list | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].id | str | site_cash_archive | id | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].date | str | site_cash_archive | date | text | Preserve instruction/workbook date; not proven payment date | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].time | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].source | str | site_cash_archive | source | text | Preserve source value; P2 for id | P1/P5; source attestation ≠ employee/receiver resolution | Syntactic type + P4; no completed payment inference | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].sourceId | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].sourceLine | int | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].sender | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].senderPhone | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].receiverIdentity | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].category | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].status | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].purpose | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].identityVerified | bool | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsCash].payload(JSON)[*].identityProofKind | str | site_cash_archive | details | text | Serialize entire original CashRow into details; member preserved; no posting semantics | P1/P5; source attestation ≠ employee/receiver resolution | JSON round-trip retains this exact key | Blank preserved for historical archive; operational required blank blocks | P2 + cross-source candidate review | File hash + pointer + id + sourceId/sourceLine | Verified archive compatibility; operational finance unresolved | Review required (archive only); blocked for posted cash/advance/payroll |
The whole CashRow must also be written as details if archive materialization is ever approved: /api/operations and cash-source parse details rather than reconstructing it from scalar columns. Archive materialization is not currently needed: the app already reads the files and snapshots. Duplicate accountsCash materialization would be concatenated again by cash-source and could double-count; block it without a separately approved consumer change.

There is no source currency, account direction, posted transfer ID, transaction proof, reversal ID, advance allocation or salary-payment classification column in these datasets/targets. Those are UNMAPPED/MISSING SOURCE for real finance; a JSON blob does not establish them.
### Release, invoice, summary, conversation, review and link fields without a safe operational target

| Source file | Source field | Source type | Target table | Target column | Target type | Transformation | Identity resolution | Validation | Null handling | Deduplication | Source provenance | Confidence | Import eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].date | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].time | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].sender | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].body | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].line | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.summaries[*].accountingDate | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].date | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].time | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].sender | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].body | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].line | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.reviews[*].reason | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].id | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].motherVessel | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].lighterVessel | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].escortName | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].startDate | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].endDate | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].days | float/int | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].serviceCharge | int | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].releasePoint | str | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].conveyance | int | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].total | int | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/operations.json | $.bills[*].sourceLine | int | UNMAPPED | — | — | Retain extracted value; money unit/formula and invoice issuance unverified | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].sourceMessageId | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].reason | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].kind | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].sourceLine | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].candidate | dict | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[kind=accountsReviews].payload(JSON)[*].relatedRecords | list | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].messageDate | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].time | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].sender | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].body | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].line | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].category | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].mediaNames | list | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].sensitiveExcluded | bool | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].chatKey | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=messages].payload(JSON)[*].conversationType | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=conflicts].payload(JSON)[*].programId | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=conflicts].payload(JSON)[*].field | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=conflicts].payload(JSON)[*].existing | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=conflicts].payload(JSON)[*].incoming | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=conflicts].payload(JSON)[*].sourceRow | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=maritimeReviews].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=maritimeReviews].payload(JSON)[*].date | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=maritimeReviews].payload(JSON)[*].source | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=maritimeReviews].payload(JSON)[*].reason | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountReviews].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountReviews].payload(JSON)[*].sourceMessageId | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountReviews].payload(JSON)[*].reasonCode | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].messageDate | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].time | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].sender | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].body | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].line | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].category | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].mediaNames | list | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].sensitiveExcluded | bool | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].chatKey | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=accountMessages].payload(JSON)[*].conversationType | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=links].payload(JSON)[*].alias | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[kind=links].payload(JSON)[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].source | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].messageDate | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].time | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].sender | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].body | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].line | int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].category | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].mediaNames | list | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.messages[*].sensitiveExcluded | bool | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].id | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].kind | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].employeeId | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].name | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].paymentNumber | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].method | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].amount | NoneType/int | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].location | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].vessel | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].date | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].sourceMessageId | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].source | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].issues | list | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
| /var/lib/vps/al-rifai/evidence/chat-archive.json | $.entries[*].description | str | UNMAPPED | — | — | Retain in original historical evidence; no silent semantic conversion | Explicit owner matching only; no name/phone binding | Missing business target or proof; raw/private text not copied into reports | Preserve null/blank as evidence | File hash + array selector + retained source identity | Exact file/pointer; message/source references where present | Unresolved operational target | Blocked for independent operational import |
accountsExcluded and accountantNotes contain strings (message-reference IDs), not person or transaction objects. They are UNMAPPED to business rows and retained in protected evidence. links.id repeating across links is intentional many-to-one linkage, not a duplicate-record defect.

### Existing snapshot mapping (already materialized; protected)


| Source file | Source field | Source type | Target table | Target column | Target type | Transformation | Identity resolution | Validation | Null handling | Deduplication | Source provenance | Confidence | Import eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[*].id | string | site_source_snapshots | id | text | Preserve exact source value | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[*].kind | string | site_source_snapshots | kind | text | Preserve exact source value | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[*].payload | string | site_source_snapshots | payload | text | Preserve exact bytes of UTF-8 JSON string | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.chunks[*].contentHash | string | site_source_snapshots | contentHash | text | Compare actual payload SHA-256; manifests use count sentinel | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json | $.datasetId | string | site_source_snapshots | datasetId | text | Copy root datasetId | Source-bound dataset version | Matches retained chunk IDs | Reject missing | PK chunk id | File SHA-256 + chunk id | Verified | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[*].id | string | site_source_snapshots | id | text | Preserve exact source value | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[*].kind | string | site_source_snapshots | kind | text | Preserve exact source value | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[*].payload | string | site_source_snapshots | payload | text | Preserve exact bytes of UTF-8 JSON string | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.chunks[*].contentHash | string | site_source_snapshots | contentHash | text | Compare actual payload SHA-256; manifests use count sentinel | Source dataset + chunk id only | Full metadata and independently computed payload hash match | Reject missing | Existing PK id; same id/different content fails | File SHA-256 + chunk id | Verified (54/54 including manifests) | Already present; no write needed |
| /var/lib/vps/al-rifai/evidence/accounts-snapshot.json | $.datasetId | string | site_source_snapshots | datasetId | text | Copy root datasetId | Source-bound dataset version | Matches retained chunk IDs | Reject missing | PK chunk id | File SHA-256 + chunk id | Verified | Already present; no write needed |
Snapshot manifests use root summary serialized exactly as existing scripts/database.mjs, id=datasetId+":complete", kind="manifest", contentHash=String(chunks.length). These are existing implementation-generated values, not invented source keys. No update or replacement is permissible.

### Actual target columns with missing trustworthy sources


| Source file | Source field | Source type | Target table | Target column | Target type | Transformation | Identity resolution | Validation | Null handling | Deduplication | Source provenance | Confidence | Import eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MISSING SOURCE | No verified supplied operational value | — | datasets | id | text | New import execution timestamp would be generated only in authorized future run | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | datasets | importedAt | text | New import execution timestamp would be generated only in authorized future run | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | id | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | aId | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | bId | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | decision | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | note | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | reviews | createdAt | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_operation_notes | id | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_operation_notes | status | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_operation_notes | note | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_operation_notes | actor | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_operation_notes | updatedAt | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_payment_drafts | id | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_payment_drafts | details | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_payment_drafts | actor | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_payment_drafts | createdAt | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_settlement_drafts | id | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_settlement_drafts | details | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_settlement_drafts | actor | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
| MISSING SOURCE | No verified supplied operational value | — | site_settlement_drafts | createdAt | text | No assignment from parser review/message sender/source timestamp | Verified approver/actor and exact target binding required | Owner-approved pair decision/draft/annotation, not raw extraction | Reject required missing; SQL defaults do not prove business facts | Approved future record identity/checkpoint | Future audited approval/run provenance | Unresolved | Blocked until explicit decision/source supplied |
alrifai_schema_migrations has no business mapping: id/sha256/applied_at are migration administration, never historical transaction fields. programs.createdAt and datasets.importedAt must not be fabricated from message time as operational-event proof. Draft id/actor/createdAt are controlled execution/approval metadata, absent from historical business evidence.

## Domain acceptance and schema coverage


| Domain | Evidence and verified limitations | Existing safe target / SCHEMA GAP | Eligibility |
| --- | --- | --- | --- |
| Employee / identity | 417 multi-name phone-label groups; 300 multi-phone exact-name groups in accounts. Legacy: 264/117. Bengali/English variation may explain some; shared/reassigned phone is NOT VERIFIED. Source phone label is not an immutable employee code. Applicants/current/former status and multiple roles have no authoritative structured roster. | SCHEMA GAP: employee master, contact/alias evidence, employment/role effective history, identity decisions. programs escort labels and cash phone strings are not foreign keys. | 0 independently verified employee rows; review identity references, do not create employees. |
| Vessel / assignment | 646 current projections, 50 conflicting programs; 67 mother/9 lighter conflicting assertions in flat conflicts. Source models represent one lighter/escort label per row, not formal multi-lighter hierarchy/replacement history. Repeated names/voyages require program ID evidence. | programs supports sparse historical register only. SCHEMA GAP: stable vessel identity, program reference/client linkage, assignment/replacement/cancellation history and guarded transitions. | 0 proven complete current operational programs; 646 review projections; no Vessel reference promotion. |
| Duty / attendance | Program dates/shifts and message time exist; no actual attendance/duty log. 508/646 lack >=1 required register field. Message-createdAt is parser-derived, not duty start time. | SCHEMA GAP: employee/assignment-linked actual duty, attendance dates and shifts, approved corrections, duration units. | Blocked; do not derive attendance or payable days. |
| Cash / advance | 12,669 extracted cash/instruction occurrences; all qualified 7,038 explicitly receipt-unverified. Purpose blank in all qualified and all 4,607 legacy instructions; 31 qualified missing employee phone label, 4,089 missing payout. 77 possible-repeat groups held in 155 review candidates. | site_cash_archive is archive only. SCHEMA GAP: accounts/currency/direction, posted transfers, receipts, reversals, advance/salary classification and allocations. | Blocked for posted finance. Archive mapping is review only, not a payable/paid claim. |
| Release Slip / settlement | 13 Release notes in old entries; 19 Release review current projections; all 646 releaseConfirmed=false. 74/162 entries have amount null; all 162 vessel/location empty. No original document bytes inspected. | site_settlement_drafts is calculated draft text, not verified Release Slip. SCHEMA GAP: document evidence, completion verifier, duty/salary/food/conveyance components and payment/settlement distinction. | Blocked for completed release or settlement; original omitted vessel stays unknown. |
| Payroll / salary | No approved policy version, training/permanent dates, role/group, incentive ledger, advance allocations or previously paid proof. Extracted bill days/rates are not payroll proof. | SCHEMA GAP: effective policy versions, payroll periods, approved inputs/incentives/deductions/payment allocations. | Blocked; neither today's policy nor obsolete historical structures used. |
| Client / invoice | 23 historical bill snippets have no client ID, agreement, invoice number, issue/payment status or program FK. Historical conversations cannot create receivables. | SCHEMA GAP: client/contract/rate rules, invoice numbering/lines/status, program-period uniqueness and receipt allocations. | Blocked; 23 snippets require manual verification. |
| Historical conversations / ancillary | 16,655 current message envelopes, earlier overlapping archives, unknown native transport/JID identity and unavailable media; no session DB inspected. | site_source_snapshots preserves existing history. SCHEMA GAP for live messages/account projection only if later explicitly approved. | Already preserved read-only; no installation/sync proposed for this audit. |
## Eligibility percentage and denominator

Confirmed safe automatic **operational promotion**: **0 / 14,172 candidate occurrences = 0%**.
Denominator = 12,669 cash/instruction occurrences (4,607 + 1,024 + 7,038) + 1,318 non-reference program occurrences (582 older escort rows + 85 workbook rows + 646 current projections + 5 seeds) + 162 release/payment entry occurrences + 23 bill snippets. The 622 Vessel reference rows are excluded. This explicitly counts occurrences, not unique real-world events; 155 duplicate-held candidates and review/message/link/evidence arrays are excluded to avoid counting review queues as an additional business domain. Identical staging copies and 54 database snapshot rows are also excluded.

0% means no record has been established as safe for unattended promotion into verified operational business facts under present identity/schema/provenance/completion gates; it does NOT mean 0% column compatibility or unusable history. Syntactic archive/program field compatibility exists. The percentage of unique real-world source records safely mappable, and the percentage after owner verification/new schema, are UNKNOWN and were not estimated. Formal dry-run validation has not been executed. Snapshot parity separately is 54/54=100%, not operational eligibility.

## Observed profiling, review references and confidence


| Check | Observed result | Interpretation |
| --- | --- | --- |
| Accounts id uniqueness | 0 duplicate IDs / 7,038 | No source-ID collision in this array; cross-source payment duplication remains. |
| Accounts source references | 0 missing / 7,038 | Existing account envelope linkage verified; no completed transfer proof. |
| Money integer bounds | 0 out-of-range/nonpositive across all 12,669 | Type compatibility only; no financial posting eligibility. |
| Program ISO/date order | 0 invalid nonblank ISO dates; 1 date-order conflict in current 646 | Blank/outlier/business-date ambiguities remain. |
| Current alias linkage | 0 aliases repeated across programs; 0 orphan link targets; 0 missing target aliases | Historical projection links are structurally consistent, not independently verified identity. |
| Current program source lineage | 521 programs have >1 evidence item; 843 extra edges | Importing each evidence item would multiply programs. |
| Snapshot parity | 54/54 full hash/metadata matches | Verified current source preservation. |
| Migration checksum parity | 6/6 match | No applied/local checksum drift. |
| Manual identity review anchors | accounts-2c82c1d342d6aeb83a322efe, accounts-43008ad2e0ac8ac95114c7da, accounts-1ee9307d66b69ec017bdfdb7, accounts-1572e081611a92b696eaec03, accounts-a7661d40c03f0d04da86a5f2 | Private source IDs only; no names/numbers disclosed. |
| Program conflict anchors | hr-2366-p1, hr-4160-p1, hr-7152-p1, hr-7231-p1, hr-7239-p1 | Compare source values privately; do not choose a mother/lighter silently. |
| Future summary date anchor | 52290732da3fc49cfe9afa3239b9 | 1 historical accountingDate beyond audit date; 2036-05-03; no correction guessed. |
## Source structural and quality appendix

Types below are observed Python/JSON equivalents: str=string, int=integer number, float=decimal number, bool=boolean, dict=object, list=array, NoneType=null. Blank/missing counters count null or empty string, not empty arrays. Date ranges are lexical metadata on the stored field, not validated chronology; bills retain DD.MM.YYYY shift text. Source counts and structural compatibility are observed, not estimated.

### /var/lib/vps/al-rifai/evidence/operations.json#cash (4607 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| employeePhone | {"str":4607} | 0 |
| payoutPhone | {"str":4607} | 0 |
| name | {"str":4607} | 0 |
| amountCents | {"int":4607} | 0 |
| method | {"str":4607} | 0 |
| issues | {"list":4607} | 0 |
| id | {"str":4607} | 0 |
| date | {"str":4607} | 0 |
| time | {"str":4607} | 0 |
| source | {"str":4607} | 0 |
| sourceId | {"str":4607} | 0 |
| sourceLine | {"int":4607} | 0 |
| sourceText | {"str":4607} | 0 |
| sender | {"str":4607} | 0 |
| category | {"str":4607} | 0 |
| status | {"str":4607} | 0 |
| purpose | {"str":4607} | 4607 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2024-10-27 | 2026-10-01 |
| time | 00:00 | 23:59 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Historical instruction | 4607 |

| issueCounts (source metadata) | Occurrences |
| --- | --- |
| Employee identity inferred from payout number | 2811 |
| Employee name missing | 1243 |
| Additional text needs review | 8 |
| Edited source message | 1 |
### /var/lib/vps/al-rifai/evidence/operations.json#excel (1024 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":1024} | 0 |
| employeePhone | {"str":1024} | 81 |
| payoutPhone | {"str":1024} | 513 |
| name | {"str":1024} | 0 |
| amountCents | {"int":1024} | 0 |
| date | {"str":1024} | 0 |
| time | {"str":1024} | 1024 |
| source | {"str":1024} | 0 |
| sourceId | {"str":1024} | 0 |
| sourceLine | {"int":1024} | 0 |
| sourceText | {"str":1024} | 0 |
| sender | {"str":1024} | 0 |
| category | {"str":1024} | 0 |
| status | {"str":1024} | 0 |
| purpose | {"str":1024} | 243 |
| method | {"str":1024} | 0 |
| issues | {"list":1024} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2026-01-01 | 2026-02-09 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Historical workbook | 1024 |

| issueCounts (source metadata) | Occurrences |
| --- | --- |
| Payout number missing | 513 |
| Method and purpose require separation | 515 |
| Employee ID missing | 81 |
### /var/lib/vps/al-rifai/evidence/operations.json#summaries (1005 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":1005} | 0 |
| date | {"str":1005} | 0 |
| time | {"str":1005} | 0 |
| sender | {"str":1005} | 0 |
| body | {"str":1005} | 0 |
| line | {"int":1005} | 0 |
| accountingDate | {"str":1005} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2025-07-17 | 2026-10-02 |
| time | 00:00 | 23:59 |
| accountingDate | 2025-02-25 | 2036-05-03 |
### /var/lib/vps/al-rifai/evidence/operations.json#reviews (3715 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":3715} | 0 |
| date | {"str":3715} | 0 |
| time | {"str":3715} | 0 |
| sender | {"str":3715} | 0 |
| body | {"str":3715} | 0 |
| line | {"int":3715} | 0 |
| reason | {"str":3715} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2024-11-18 | 2026-09-29 |
| time | 00:00 | 23:59 |
### /var/lib/vps/al-rifai/evidence/operations.json#programs (85 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":85} | 0 |
| motherVessel | {"str":85} | 0 |
| lighterVessel | {"str":85} | 0 |
| escortName | {"str":85} | 0 |
| escortMobile | {"str":85} | 4 |
| masterMobile | {"str":85} | 85 |
| destination | {"str":85} | 19 |
| startDate | {"str":85} | 0 |
| endDate | {"str":85} | 12 |
| shift | {"str":85} | 0 |
| status | {"str":85} | 0 |
| source | {"str":85} | 0 |
| notes | {"str":85} | 0 |
| duplicateOf | {"NoneType":85} | 85 |
| createdAt | {"str":85} | 0 |
| revision | {"int":85} | 0 |
| details | {"dict":85} | 0 |

| details exact member | Observed types/counts |
| --- | --- |
| recordKind | {"str":85} |
| sourceLine | {"str":85} |
| issues | {"list":85} |
| releasePoint | {"str":85} |
| endShift | {"str":85} |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 2026-03-29 | 2026-07-19 |
| endDate | 2026-05-05 | 2026-07-21 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Recorded | 12 |
| Released | 64 |
| Cancelled | 4 |
| Escort change | 5 |

| recordKinds (source metadata) | Occurrences |
| --- | --- |
| Program | 85 |

| detailsIssues (source metadata) | Occurrences |
| --- | --- |
| Historical workbook: confirm current status | 85 |
### /var/lib/vps/al-rifai/evidence/operations.json#bills (23 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":23} | 0 |
| motherVessel | {"str":23} | 0 |
| lighterVessel | {"str":23} | 0 |
| escortName | {"str":23} | 0 |
| startDate | {"str":23} | 0 |
| endDate | {"str":23} | 0 |
| days | {"float":16,"int":7} | 0 |
| serviceCharge | {"int":23} | 0 |
| releasePoint | {"str":23} | 0 |
| conveyance | {"int":23} | 0 |
| total | {"int":23} | 0 |
| sourceLine | {"int":23} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 02.06.2026 (D) | 29.03.2026 (D) |
| endDate | 02.06.2026 (D) | 26.05.2026 (D) |
### /var/lib/vps/al-rifai/evidence/recovered-programs.json#rows (5 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":5} | 0 |
| motherVessel | {"str":5} | 0 |
| lighterVessel | {"str":5} | 0 |
| masterMobile | {"str":5} | 0 |
| destination | {"str":5} | 0 |
| escortName | {"str":5} | 0 |
| escortMobile | {"str":5} | 0 |
| startDate | {"str":5} | 0 |
| endDate | {"str":5} | 5 |
| shift | {"str":5} | 0 |
| status | {"str":5} | 0 |
| source | {"str":5} | 0 |
| notes | {"str":5} | 0 |
| duplicateOf | {"NoneType":5} | 5 |
| createdAt | {"str":5} | 0 |
| revision | {"int":5} | 0 |
| details | {"dict":5} | 0 |

| details exact member | Observed types/counts |
| --- | --- |


| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 2026-08-01 | 2026-08-10 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Recorded | 5 |

| recordKinds (source metadata) | Occurrences |
| --- | --- |
| unspecified | 5 |
### /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsCash (7038 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| employeePhone | {"str":7038} | 31 |
| payoutPhone | {"str":7038} | 4089 |
| name | {"str":7038} | 0 |
| amountCents | {"int":7038} | 0 |
| method | {"str":7038} | 0 |
| identityRule | {"str":7038} | 0 |
| issues | {"list":7038} | 0 |
| id | {"str":7038} | 0 |
| date | {"str":7038} | 0 |
| time | {"str":7038} | 0 |
| source | {"str":7038} | 0 |
| sourceId | {"str":7038} | 0 |
| sourceLine | {"int":7038} | 0 |
| sender | {"str":7038} | 0 |
| senderPhone | {"str":7038} | 0 |
| receiverIdentity | {"str":7038} | 0 |
| category | {"str":7038} | 0 |
| status | {"str":7038} | 0 |
| purpose | {"str":7038} | 7038 |
| identityVerified | {"bool":7038} | 0 |
| identityProofKind | {"str":7038} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2024-11-21 | 2026-10-06 |
| time | 00:00 | 23:59 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Admin payment instruction · receipt unverified | 7038 |

| issueCounts (source metadata) | Occurrences |
| --- | --- |
| Separate payout mobile was not provided | 4058 |
| Employee ID was not provided; no employee was created or matched | 31 |
| Payment method was not specified | 38 |
| Edited source message | 1 |
### /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsReviews (2047 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":2047} | 0 |
| sourceMessageId | {"str":2047} | 0 |
| reason | {"str":2047} | 0 |
| kind | {"str":2047} | 0 |
| sourceLine | {"int":2047} | 0 |
| candidate | {"dict":155} | 1892 |
| relatedRecords | {"list":155} | 1892 |
### /var/lib/vps/al-rifai/evidence/accounts-snapshot.json#accountsExcluded (1798 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |

### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#messages (6221 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":6221} | 0 |
| messageDate | {"str":6221} | 0 |
| time | {"str":6221} | 0 |
| sender | {"str":6221} | 27 |
| body | {"str":6221} | 184 |
| line | {"int":6221} | 0 |
| category | {"str":6221} | 0 |
| mediaNames | {"list":6221} | 0 |
| sensitiveExcluded | {"bool":6221} | 0 |
| chatKey | {"str":6221} | 0 |
| conversationType | {"str":6221} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| messageDate | 2022-11-20 | 2026-10-06 |
| time | 00:00 | 23:59 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programs (646 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| motherVessel | {"str":646} | 19 |
| lighterVessel | {"str":646} | 0 |
| masterMobile | {"str":646} | 237 |
| destination | {"str":646} | 498 |
| escortName | {"str":646} | 31 |
| escortMobile | {"str":646} | 64 |
| startDate | {"str":646} | 41 |
| endDate | {"str":646} | 564 |
| shift | {"str":646} | 66 |
| status | {"str":646} | 0 |
| source | {"str":646} | 0 |
| notes | {"str":646} | 0 |
| id | {"str":646} | 0 |
| duplicateOf | {"NoneType":646} | 646 |
| createdAt | {"str":646} | 0 |
| revision | {"int":646} | 0 |
| details | {"dict":646} | 0 |
| evidence | {"list":646} | 0 |
| aliases | {"list":646} | 0 |
| conflicts | {"list":646} | 0 |

| details exact member | Observed types/counts |
| --- | --- |
| recordKind | {"str":646} |
| sourceMessageId | {"str":623} |
| sourceMessageDate | {"str":623} |
| sourceLine | {"str":646} |
| sender | {"str":623} |
| issues | {"list":646} |
| releaseConfirmed | {"bool":646} |
| sourceStatus | {"str":21} |
| releasePoint | {"str":87} |
| endShift | {"str":197} |
| rawPhones | {"dict":15} |
| releaseDate | {"str":2} |
| location | {"str":2} |
| legacyMisprojectedDestination | {"str":22} |
| documentKind | {"str":114} |
| sourceSha256 | {"str":114} |
| sourceChat | {"str":114} |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 2024-04-23 | 2028-03-28 |
| endDate | 2025-11-23 | 2026-08-18 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Recorded | 583 |
| Cancelled | 4 |
| Escort change | 38 |
| Date review | 2 |
| Release review | 19 |

| recordKinds (source metadata) | Occurrences |
| --- | --- |
| Escort program | 623 |
| Program | 23 |

| detailsIssues (source metadata) | Occurrences |
| --- | --- |
| Completion requires an explicit end shift and release point. | 23 |
| Multiple phone numbers: escortMobile | 5 |
| Program date differs substantially from message date | 2 |
| Conflicting source fields require review; no values were silently overwritten. | 50 |
| Invalid phone format: escortMobile | 12 |
| Invalid phone format: masterMobile | 3 |
| Unrecognized date: startDate | 2 |
| Destination contains an ambiguous name; original text retained | 3 |
| Historical workbook: confirm current status | 23 |

| conflictFields (source metadata) | Occurrences |
| --- | --- |
| motherVessel | 67 |
| lighterVessel | 9 |
| escortName | 12 |
| destination | 3 |
| shift | 3 |
| dateOrder | 1 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programEvidence (1668 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| motherVessel | {"str":1668} | 28 |
| lighterVessel | {"str":1668} | 0 |
| masterMobile | {"str":1668} | 226 |
| destination | {"str":1668} | 691 |
| escortName | {"str":1668} | 865 |
| escortMobile | {"str":1668} | 904 |
| startDate | {"str":1668} | 877 |
| endDate | {"str":1668} | 1660 |
| shift | {"str":1668} | 898 |
| status | {"str":1668} | 0 |
| source | {"str":1668} | 0 |
| notes | {"str":1668} | 0 |
| id | {"str":1668} | 0 |
| duplicateOf | {"NoneType":1668} | 1668 |
| createdAt | {"str":1668} | 0 |
| revision | {"int":1668} | 0 |
| details | {"dict":1668} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 2024-04-23 | 2028-03-28 |
| endDate | 2025-11-23 | 2026-08-18 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Recorded | 1620 |
| Escort change | 44 |
| Cancelled | 4 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#conflicts (94 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| programId | {"str":94} | 0 |
| field | {"str":94} | 0 |
| existing | {"str":94} | 0 |
| incoming | {"str":94} | 0 |
| sourceRow | {"str":94} | 0 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#maritimeReviews (399 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":399} | 0 |
| date | {"str":399} | 0 |
| source | {"str":399} | 0 |
| reason | {"str":399} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2025-12-01 | 2026-10-06 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountReviews (9002 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":9002} | 0 |
| sourceMessageId | {"str":9002} | 0 |
| reasonCode | {"str":9002} | 0 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountantNotes (1431 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |

### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#accountMessages (10434 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":10434} | 0 |
| messageDate | {"str":10434} | 0 |
| time | {"str":10434} | 0 |
| sender | {"str":10434} | 1 |
| body | {"str":10434} | 383 |
| line | {"int":10434} | 0 |
| category | {"str":10434} | 0 |
| mediaNames | {"list":10434} | 0 |
| sensitiveExcluded | {"bool":10434} | 0 |
| chatKey | {"str":10434} | 0 |
| conversationType | {"str":10434} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| messageDate | 2024-10-27 | 2026-10-06 |
| time | 00:00 | 23:59 |
### /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#links (843 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| alias | {"str":843} | 0 |
| id | {"str":843} | 0 |
### /var/lib/vps/al-rifai/evidence/chat-archive.json#messages (3677 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":3677} | 0 |
| source | {"str":3677} | 0 |
| messageDate | {"str":3677} | 0 |
| time | {"str":3677} | 0 |
| sender | {"str":3677} | 15 |
| body | {"str":3677} | 156 |
| line | {"int":3677} | 0 |
| category | {"str":3677} | 0 |
| mediaNames | {"list":3677} | 0 |
| sensitiveExcluded | {"bool":3677} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| messageDate | 2022-11-20 | 2026-10-01 |
| time | 00:00 | 23:58 |
### /var/lib/vps/al-rifai/evidence/chat-archive.json#programs (1204 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| motherVessel | {"str":1204} | 7 |
| lighterVessel | {"str":1204} | 0 |
| masterMobile | {"str":1204} | 198 |
| destination | {"str":1204} | 508 |
| escortName | {"str":1204} | 616 |
| escortMobile | {"str":1204} | 644 |
| startDate | {"str":1204} | 632 |
| endDate | {"str":1204} | 1199 |
| shift | {"str":1204} | 646 |
| status | {"str":1204} | 0 |
| source | {"str":1204} | 0 |
| notes | {"str":1204} | 0 |
| id | {"str":1204} | 0 |
| duplicateOf | {"NoneType":1204} | 1204 |
| createdAt | {"str":1204} | 0 |
| revision | {"int":1204} | 0 |
| details | {"dict":1204} | 0 |

| details exact member | Observed types/counts |
| --- | --- |
| recordKind | {"str":1204} |
| sourceMessageId | {"str":1204} |
| sourceMessageDate | {"str":1204} |
| sourceLine | {"str":1204} |
| sender | {"str":1204} |
| issues | {"list":1204} |
| loadingPoint | {"str":40} |
| location | {"str":9} |
| masterName | {"str":7} |
| releasePoint | {"str":3} |
| alongside | {"str":1} |
| releaseDate | {"str":3} |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| startDate | 2024-04-23 | 2028-03-28 |
| endDate | 2025-11-23 | 2026-01-27 |

| statuses (source metadata) | Occurrences |
| --- | --- |
| Recorded | 1168 |
| Cancelled | 3 |
| Escort change | 33 |

| recordKinds (source metadata) | Occurrences |
| --- | --- |
| Vessel reference | 622 |
| Escort program | 582 |

| detailsIssues (source metadata) | Occurrences |
| --- | --- |
| Multiple phone numbers: escortMobile | 4 |
| Program date differs substantially from message date | 3 |
| Invalid phone format: masterMobile | 5 |
| Invalid phone format: escortMobile | 7 |
| Unrecognized date: startDate | 1 |
| Destination contains an ambiguous name; original text retained | 3 |
### /var/lib/vps/al-rifai/evidence/chat-archive.json#entries (162 occurrences)

| Exact field key | Observed types/counts | Missing/null/empty-string occurrences |
| --- | --- | --- |
| id | {"str":162} | 0 |
| kind | {"str":162} | 0 |
| employeeId | {"str":162} | 13 |
| name | {"str":162} | 13 |
| paymentNumber | {"str":162} | 17 |
| method | {"str":162} | 19 |
| amount | {"NoneType":74,"int":88} | 74 |
| location | {"str":162} | 162 |
| vessel | {"str":162} | 162 |
| date | {"str":162} | 0 |
| sourceMessageId | {"str":162} | 0 |
| source | {"str":162} | 0 |
| issues | {"list":162} | 0 |
| description | {"str":162} | 0 |

| Stored date/time field | Min | Max |
| --- | --- | --- |
| date | 2026-01-28 | 2026-10-01 |

| issueCounts (source metadata) | Occurrences |
| --- | --- |
| Named vessel or escort may be unavailable; source text is authoritative | 13 |
| Amount not available | 61 |
| Different amounts for the same employee/payment number/date; verify original correction | 4 |
| Correction message; do not double count with the earlier entry | 1 |
### Known version overlap

Only like-for-like program comparisons below indicate repeated source IDs. Different payloads are versioned/derived changes, not automatically corruption. Message-to-review and projection-to-link matching IDs are reference relationships, not duplicate inserts.

| Source A | Source B | Repeated program IDs | Payload differences |
| --- | --- | --- | --- |
| /var/lib/vps/al-rifai/evidence/operations.json#programs | /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programs | 23 | 23 |
| /var/lib/vps/al-rifai/evidence/conversation-snapshot.json#programs | /var/lib/vps/al-rifai/evidence/chat-archive.json#programs | 509 | 509 |
Accounts/legacy financial IDs use different parser/version schemes, so zero same-ID intersection is not proof of unique payments. See DATA_QUALITY_AND_MIGRATION_RISKS.md for 98/2,070/221 cross-source fingerprint overlaps. Full semantic conflict resolution is NOT VERIFIED.

## Exit and follow-on boundary

Read-only metadata profiling used in-memory Python/JavaScript and SELECT-only SQL; no existing importer or formal isolated dry run ran. No temporary files/database/schema/service/config were created. Only the three final audit documents were written. See [risk report](DATA_QUALITY_AND_MIGRATION_RISKS.md) and [controlled plan](CONTROLLED_OPERATIONAL_IMPORT_PLAN.md). Stop here; separate owner approval is required for implementation.

Final SELECT-only count recheck after document creation: all seven non-snapshot application tables remain 0 rows; snapshots remain 54; migration ledger remains 6. All three output Markdown tables passed delimiter consistency checks, and reports contain no Bangladesh phone-number values. No write-based qualification tests were run.
