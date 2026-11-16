> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Isolated SQL qualification — 2026-10-09

## Isolation gate

Both disposable containers used the already cached PostgreSQL 16.15 image. Test database `alrifai_qualification`, test-only role `qualification_admin`, fresh private credentials, network `none`, no host ports, no production data mount, no restart policy, CPU 1 and RAM 256 MB. Endpoint was a container-local Unix socket `/var/run/postgresql:5432`; storage was separate `/var/lib/postgresql/data` tmpfs (192 MB). Before SQL, the guarded runner checked container identity/label/network/storage/credentials, zero public tables, absence of database `alrifai` and production roles. No production connection string or business records were copied.

Production container ID: `63b70ddf47f20b7836f860d7819acc273a3e66b2bd96febbde0cbf1339ac6bd6`.
First test container: `alrifai-sql-qualification-20261009`, ID `2f7fdce3391b525200123f41db3df36df266d64a3c11d1655b6a5fd063764fbb`.
Fresh corrected test container: `alrifai-sql-qualification-20261009-r2`, ID `012b0874eb68dd4f9dc035aa2e88038d0171b8bd691577df1995b9ef398a0035`; cluster identity `7694583898351992866`.
Neither is a database within production PostgreSQL. The gate passed before application SQL.

## Baseline and candidate execution

Existing migrations 0000–0005 were replayed verbatim with their checksum-ledger/transaction convention: six migration rows, nine baseline tables, no production records/snapshots. Application production-writer scripts were not invoked. The eleven-table candidate was then tested transactionally and committed only in the disposable instance. Catalog checks: 29 foreign keys, 55 CHECK constraints, 29 indexes, 22 immutability triggers. Existing `programs(id)` references and synthetic Program Register compatibility were exercised.

First run: 29 PASS, 1 FAIL, 0 SKIP. Exact defect: `db/migration-candidates/0006_employee_program_identity.sql:23`, event assertion CHECK accepted JSON `eventType: null`, because PostgreSQL CHECK permits UNKNOWN. Smallest correction wraps the existing predicate in `COALESCE(..., false)`. No event taxonomy, owner policy, table architecture or existing migration was changed.
Original candidate SHA256: `733cbd6bf9996e06e94117036d7dab38d4e299dcb07dcbe3bc9737c57c20130f`.
Corrected SHA256: `3d98b7cf26d131842aa5e23ece1b786e5bc094c810807e81bf8e8dbb92f7efff`.
Fresh-instance final run: **30 PASS, 0 FAIL, 0 SKIP**. Private reports retain each SQLSTATE and catalog result: `/tmp/alrifai-sql-qualification-first.json` and `/tmp/alrifai-sql-qualification-final.json`.

## Constraint, transaction and concurrency coverage

Tests cover controlled migration rollback and forced failure rollback, duplicate source/event rejection, multiple lighter blocks per message, missing foreign keys, invalid lifecycle/assignment/approval references, conflicting binding decisions, mobile and alias uniqueness, immutable occurrence update/delete/truncate rejection, replay checks, transaction atomicity and existing programs compatibility. Raw repeated candidate execution rejects existing objects (42P07); migration-ledger guarded execution remains the intended future mechanism. It does not silently rerun schema creation.

Two overlapping transactions attempted the same occurrence: one committed, one rejected with unique violation 23505. Atomic replay/conflict failures rolled back synthetic fixture effects. No historical operational data was imported. Constraints were not weakened.

## Reader/fallback qualification

Nine isolated reader tests PASS, 0 FAIL, 0 SKIP; these reproduce defects in the unchanged reader and test a patch proposal, not a blanket compatibility PASS. Nonempty operational programmes suppress seed fallback; source aliases suppress known legacy IDs. Defects remain for future accepted operational rows: same-name/different-mobile heuristic merging violates EMP-005; ambiguous overlays can display three rows instead of two; unique overlays can retain a source ID/status instead of the authoritative accepted program identity/status.

`docs/employee-program-reader-compatibility.patch` proposes only the minimal mobile-aware name fallback guard and is NOT applied. Canonical accepted-row rendering still needs explicit approved source-to-target binding integration before future import. Production reader behaviour was not modified.

## Regression and cleanup

Existing deterministic suite: 113 PASS, 0 FAIL, 0 SKIP. Three existing workflow/source-register/phase1 assertion scripts PASS (not invented test-case totals). SQL: 30 PASS; reader qualification: 9 PASS. Initial SQL failure remains disclosed above.

The first disposable container was removed after preserving its report. The corrected container and its private credential file are scheduled for exact-resource cleanup after preservation of this report; final cleanup status is recorded below. No Docker prune or production/shared-volume cleanup is permitted.

Final cleanup: both exact disposable container IDs removed; private test credential removed; tmpfs storage disappeared with the instances. No persistent test data volume was created. Production PostgreSQL remained running with the same identity.
