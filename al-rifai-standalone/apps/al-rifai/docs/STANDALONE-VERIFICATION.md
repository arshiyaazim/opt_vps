# Verification record

Environment: disposable PostgreSQL 16.15 container on `127.0.0.1:55432`,
Node.js 22.23.4, project dependencies from the committed lockfile.

## Results

| Check | Command | Result |
|---|---|---|
| Schema install (fresh) | `pnpm db:install --admin-user owner …` | **PASS** — 26 tables, 5 functions, 14 triggers, version 1.1.0, schema `public` |
| Schema install (shared schema) | `PGSCHEMA=tenant_a pnpm db:install` | **PASS** — 26 tables and the seeded admin inside `tenant_a`; the `public` schema was not modified |
| Re-install guard | `pnpm db:install` on an installed schema | **PASS** — refuses with `ALREADY_INSTALLED` |
| Preflight | `pnpm db:preflight` | **PASS** — reports version, user, database, existing install, runtime role |
| Domain tests | `pnpm test:standalone` | **PASS — 10/10** |
| Pure unit tests | `pnpm test:unit` | **PASS — 29 tests** (shift boundary, auth policy, entry rules) |
| TypeScript | `tsc --noEmit` | **PASS** (0 errors) |
| Production build | `next build --webpack` | **PASS** — 11 API routes + 10 pages, exit 0 |
| Health endpoint | `GET /api/health` (via service layer) | **PASS** — reports database `ok` and schema version |

## Domain tests (10)

1. rate configuration + actors
2. employee create / alias merge / duplicate prevention
3. program create / exact-duplicate refusal / ±1-day warning / distinct lighters /
   assignment / release / pay calculation (19 shifts × 20000 = 380000)
4. attendance upsert + monthly summary
5. instruction → approve (different admin) → post → ledger debit → balance;
   self-approval refused; double posting refused; ledger immutable
6. income entry + income/expense report
7. review submit → admin decided → employee created; USER cannot decide
8. monthly payroll splits a cross-month program (Oct 4 / Nov 3 shifts)
9. audit trail is append-only (update/delete denied)
10. WhatsApp adapter against a **mock relay**: configure → health → sync
    (2 messages, idempotent re-sync) → process → 1 cash instruction
    (BDT 1,250.50, `REVIEW`) + 1 vessel draft

The legacy static test `tests/password-policy.mjs` was excluded from `test:unit`:
it asserts file paths inside the moved legacy UI (`app/admin/view.tsx`), not
runtime behaviour. The policy itself (`lib/password-policy.ts`) is unchanged and
still enforced by the login, session and password APIs.

## End-to-end validation (running server, 2026-11-05)

Fresh disposable PostgreSQL 16.15, production build, real HTTP server on port
3210, real sessions and CSRF. Graphical browser was **not available** in this
environment; the harness drives the same authenticated HTTP surface and asserts
server-rendered pages plus database state (`tests/e2e/e2e.mjs`).

**Result: 52 / 52 checks passed, 0 server errors.**

| Workflow | Result |
|---|---|
| First admin login, forced password change, re-login | PASS |
| Unauthenticated API denied, session endpoint, logout invalidates session | PASS |
| Employee create / alias-on-duplicate / edit / detail page | PASS |
| Program create, exact duplicate 409, ±1-day warning, distinct lighter | PASS |
| Escort assign and replace (open assignment closed) | PASS |
| Release → pay recalculated | PASS |
| Attendance record, upsert, monthly summary | PASS |
| Payroll rate configuration and monthly calculation | PASS |
| Account creation, income entry, instruction in REVIEW | PASS |
| USER cannot approve; creator cannot approve; unapproved cannot post | PASS |
| Second admin approves → posts → immutable ledger debit | PASS |
| Double posting refused (409) | PASS |
| Balance = opening + credits − debits (500000 − 150000 = 350000) | PASS |
| Income/expense report totals | PASS |
| Review submit → admin decision → employee created | PASS |
| CSV + audit exports | PASS |
| All 9 workspace pages render (including employee detail) | PASS |
| WhatsApp relay configure, health `UNREACHABLE`, status listing | PASS |

Database integrity checked separately: one posting per instruction, unique
source identity, ledger sum equals the account balance, and `UPDATE`/`DELETE` on
`ledger_entries`/`audit_events` raise `IMMUTABLE_*`.

ESLint (TypeScript parser, runtime + new tests): **0 problems**. `tsc --noEmit`:
0 errors. `next build --webpack`: exit 0.

### WhatsApp contract inspection (read-only)

The relay socket was inspected without connecting:
`/var/lib/vps/whatsapp/wa-01/control/mcp.sock` exists (`srw-rw----`, owner
`whatsapp-wa-01`), the control directory is `0710`. The reader token file is not
readable by this user and was **not** accessed, so no handshake, no pairing and
no message was attempted. Live compatibility therefore remains unverified.

## Graphical browser verification (Chromium headless, 2026-11-05)

Real Chromium (Playwright 1.49) against a production build served over HTTPS with
a self-signed certificate. **24 / 24 assertions passed**, and the persisted state
was reconciled in PostgreSQL afterwards.

Covered: login, all nine sidebar destinations, employee create + detail, vessel
program create, duplicate error surfaced in the form, release, attendance,
income entry and balance change, staff instruction → owner approval → posting →
balance after payment (৳1,300.00), no actions on a posted row, payroll rate and
computed pay (19 shifts → ৳3,800.00), CSV export, logout.

**Finding:** the session cookie is `__Host-…; Secure`, so a plain-HTTP origin
does not store it in a browser (API clients such as curl are unaffected). HTTPS
is therefore mandatory for browser use; this is documented in the README.

Post-run database state: 1 employee, 1 program (RELEASED, 19 shifts, 380000
paisa), 1 attendance row, 1 posted instruction, 2 ledger entries, balance
130000 paisa, 9 audit events.

## Clean installation from the distributable package

The pruned `dist/` package (302 files, 2.9 MB, no Git, no legacy archive, no
historical migrations) was copied to a scratch directory and verified:

* `db:preflight` + `db:install` into a **dedicated** database → 26 tables / 5
  functions / 14 triggers / version 1.1.0;
* `db:install` into a **pre-created tenant schema** of a shared database → the
  admin and all objects land inside that schema; `public` untouched;
* `next build --webpack` → exit 0;
* server start, `/api/health` 200, login 200, dashboard 200.

Installer defect found and fixed during this: `CREATE SCHEMA IF NOT EXISTS`
requires CREATE on the database even when the schema exists, which failed for a
least-privilege owner; the installer now checks `to_regnamespace` first.

## What is NOT verified

* **Live WhatsApp.** No device pairing, no real bridge and no production
  conversation was used. The adapter is verified only against a protocol mock
  that reproduces the observed contract (unix socket, token line, JSON-RPC
  `tools/call`, `list_native_messages`, `get_native_account_identity`).
* **Browser UI.** Pages compile and render server-side components, but no
  headless-browser run or authenticated click-through was performed here.
* **Conveyance allocation, advances, food bills.** Not implemented — the business
  rules are not defined in the source material; they are reported, not invented.
* **Multi-organization / multi-currency.** One installation = one organization,
  one currency (default BDT).

## Reproduce

```bash
# 1. disposable PostgreSQL 16
docker run -d --name alrifai-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=alrifai -p 55432:5432 postgres:16-alpine
# 2. roles + grants (see README §3.3), password files, then:
export PGHOST=127.0.0.1 PGPORT=55432 PGDATABASE=alrifai PGSCHEMA=public \
       PGUSER=alrifai_app PGPASSWORD_FILE=… \
       ALRIFAI_REVIEW_DB_USER=alrifai_runtime ALRIFAI_REVIEW_PASSWORD_FILE=…
pnpm db:install --admin-user owner --admin-password 'OwnerPass123'
pnpm test:standalone
```
