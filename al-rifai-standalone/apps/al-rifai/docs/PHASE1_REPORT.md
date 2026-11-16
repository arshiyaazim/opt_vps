> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Phase 1 implementation report

Verified 8 October 2026 (Asia/Dhaka). Phase 1 is complete and running privately.
No public deployment, Git initialization, external live integration or foundation replacement occurred.

## 1. Files and directories

Canonical source is `/opt/vps/apps/al-rifai`, copied from the single audited root.
`phase1-file-changes.json` enumerates every canonical source file and directory,
every modification relative to v10, every retired/moved path and external files.
Important additions: Dockerfile, compose.yaml, proxy.ts, private authentication/origin
helpers, external evidence loader/types/checksums, PostgreSQL pool/access/schema,
six migrations, explicit migration/import/state-verification tools, adapted tests,
and a historical conversations component. The four private JSON files are absent
from source. Cloudflare/Sites runtime scaffolding is retired; original SQL and
upstream documentation are retained as provenance under docs. Legacy Worker tests
are retained separately and excluded from active checks. Generated dependencies,
Next output and package cache are ignored, not canonical Git source.

External configuration: `/etc/vps/apps/al-rifai/app.env`, `database_password`,
`validation_password`; passwords are root-owned, GID 10001, mode 0440; directory
mode 0700. Evidence directory/root are root-owned, GID 10001, mode 0750; evidence
files are mode 0440. No credential values appear in this report or source.

The authoritative `/opt/vps/docs/VPS_MAP.md` is updated. The requested
`/opt/vps/VPS_MAP.md` is a relative symlink to that same map, avoiding divergent copies.

## 2. Final application architecture

One Next.js 16.3.4 / React 19.2.6 full-stack App Router application on Node 22.23.3,
with pnpm 11.25.0. Pages, API routes and business modules retain v10 boundaries.
Wrangler, D1 bindings, `cloudflare:workers` and Sites environment assumptions are
absent from serving code. PostgreSQL access uses pg 8.16.3; Drizzle 0.45.2 schema
is translated to PostgreSQL. Existing dependency versions were preserved;
lockfile additions are limited to the required PostgreSQL driver/types/dependencies.

Production: `pnpm build` (`next build --webpack`), Docker standalone `node server.js`.
Checkout `pnpm start` uses `next start --hostname 127.0.0.1 --port 3000`.
Build succeeds without mounting evidence or credentials. Node/pnpm are in Docker;
no host Node, Python-package or system-package installation was performed.

## 3. PostgreSQL schema and migration status

The existing `alrifai` database was initially empty. Six PostgreSQL migrations
were first validated in a transaction-scoped test schema, including replay and
idempotent imports, then rolled back; no test schema remains. A restricted logical
backup was made before canonical changes. Migrations were then explicitly applied
as existing role `alrifai_app` into `public`.

Created tables: programs, reviews, datasets, site_cash_archive,
site_operation_notes, site_payment_drafts, site_settlement_drafts,
site_source_snapshots, and alrifai_schema_migrations.
Text IDs, quoted camel-case columns, text dates/JSON/details, integer amounts,
revision/default behavior and original payloads are retained. One trigger function
and two triggers prevent snapshot update/delete/truncation. Six migration hashes
are recorded. No DROP, DELETE, TRUNCATE or overwrite operation was executed.

## 4. Evidence preservation/import

Four historical JSON files were copied byte-for-byte to the evidence directory,
with before/after checksums recorded in `evidence-checksums.json`. Original seed
source is preserved privately and its five exact recovered objects are in
`recovered-programs.json`. ZIP SHA-256 remains:
`5993a1014f0dd913b465a3d85b92eb5e4f41ed7ee30bf251e9c92f474560ede8`.
All 183 staging manifest files still match their original hashes.

Explicit transactional import inserted 52 original conversation/accounts chunks
plus two completion markers: 54 immutable snapshot rows. All IDs, content hashes
and payload strings match exactly. Repeat import makes no changes; conflicts fail.
The seven operational tables remain empty; no active program/payment records were
fabricated. Original v10 historical projection/overlay behavior remains a read
operation and does not deduplicate or rewrite imported evidence. All four original
files remain available externally, including legacy records, exclusions and reviews.
There is no supplied live D1 backup, original workbook/export collection or media
bytes; preservation is complete for supplied material, not unprovided hosting state.

## 5. Authentication

Temporary HTTP Basic username `validator`, using a random externally stored
password and constant-time credential comparison. Pages/API reads require this
identity; Sites headers and middleware-subrequest spoofing do not establish identity.
The health endpoint returns only readiness and does not expose business data.
Assistant POST additionally requires an exact loopback Host/Origin match and
ignores forwarded-host claims. Use loopback or an SSH tunnel. Public login provider,
audience/roles, session lifetime/logout and public transport remain future decisions.

## 6. Docker/Compose

Project `al-rifai`; container `al-rifai-app-1`; image `al-rifai:phase1`.
Non-root UID/GID 10001:10001, read-only root filesystem, temporary /tmp, dropped
capabilities and no-new-privileges. Existing external network `vps-backend`.
Evidence and credentials are read-only host binds. Stdout/stderr JSON logs have
application-specific rotation. No PostgreSQL service, new shared network, host
firewall change or Docker daemon change. Original PostgreSQL container ID remained
unchanged and healthy, with no host port bindings.

## 7. Local URL

`http://127.0.0.1:3000` on the VPS. Port 3000 was checked free before startup.
Docker publishes only `127.0.0.1:3000:3000`; there is no public web binding.
Password retrieval is through an administrator's secure terminal, never chat/docs.

## 8. Validation results

- Type checks: passed, including Next-generated route validation.
- Lint: passed with 0 errors and 18 inherited frontend warnings (16 state-reset
  effects and two hook-dependency warnings). State-reset diagnostics are scoped
  warnings during this port; other hook checks remain active. No frontend rewrite.
- Production Next build and final container-image build: passed.
- JavaScript workflow/source-coverage/authentication/origin/disabled-integration/
  deterministic-query tests: passed.
- Python accounts suite: 18 tests, 17 passed and one missing-input reimport skip.
- Python conversation suite: 17 tests, 16 passed and one missing-input reimport skip.
- Existing cash parser checks and all Python syntax checks: passed without installing openpyxl.
- PostgreSQL migration replay, exact 54-row import, repeat import and test-schema rollback: passed.
- Private HTTP/SSR/API checks: passed before and after application restart.
  Register, qualified 7,038-row Accounts view, 4,607-row legacy view, 1,024-row Excel
  view, historical conversations, deterministic register/accounts assistant,
  untrusted-origin rejection and all operational mutation methods were verified.
- Spoofed Sites/middleware headers returned 401. Operational mutations returned 405.
  Live Core/conversation reads stayed unavailable. Model integration stayed disabled.
- Database state fingerprint before API tests and after restart is unchanged:
  `96f4fe553fdd54d5e10869696dd9e5ded3e9da434c4fe4cc37496599be0464ba`.
- Final container health is healthy; runtime filesystem and evidence mount are read-only.

Interactive browser automation was unavailable; validation covers HTTP/SSR/API and
source/business rules. Legacy Worker-specific tests are replaced by the current
runtime suite, not claimed as passing on Node. Excel reimport is not required for
runtime and needs its optional dependency/original inputs in a future offline phase.

## 9. Disabled integrations

Fazle Core, WhatsApp, live conversation feeds, OpenAI, Hermes/9Router and public
reverse-proxy/domain integration remain disabled. An immutable empty integration
configuration prevents ambient credentials from activating calls. No fabricated
endpoint/credential, WhatsApp send, model request, DNS or TLS setup occurred.

## 10. Remaining limits

No Phase 1 deployment blocker remains. Public authentication/audience policy,
missing original exports/attestation/media/live D1 state, inherited frontend lint
warnings and interactive browser review remain explicitly outside completed proof.
No public deployment or Git publication is authorized by this completion.

## 11. Disk usage

Filesystem use was about 7.3 GiB before work and 10.25 GiB after image builds.
Canonical checkout apparent size was about 746 MiB, including reproducible
node_modules/cache/Next build artifacts; external evidence about 20.1 MiB;
import ZIP/staging about 24.1 MiB and unchanged. Runtime image is 399,737,590 bytes.
Build caches and tooling images are reproducible, not historical/persistent evidence.

## 12. Exact canonical database changes

Yes, `alrifai` was modified after successful isolated validation and backup.
Changes: eight application tables plus migration ledger, six migration records,
one snapshot-immutability trigger function/two triggers, and 54 original snapshot
rows/markers. No operational rows were inserted; no existing information was
removed/overwritten. No other database, PostgreSQL deployment or role was changed.

STOP: Phase 1 complete. Administrator review is required before a new phase.
