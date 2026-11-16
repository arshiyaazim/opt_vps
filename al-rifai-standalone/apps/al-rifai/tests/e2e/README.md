# End-to-end validation harness

Drives a **running** instance over authenticated HTTP (real sessions, CSRF,
server-rendered pages) and verifies the persisted state.

```
# 1. disposable PostgreSQL + installer (README §3)
# 2. seed a second account so approval separation can be tested:
#    users: owner (ADMIN, forced first-login password change) and staff (USER)
# 3. start the app:  pnpm build && pnpm start
# 4. run:
E2E_BASE=http://127.0.0.1:3000 node tests/e2e/e2e.mjs
```

It asserts: login/logout/session/roles, forced password change, employee
create/edit/alias, program create/duplicate/±1-day/distinct lighter, assignment
and replacement, release, attendance, payroll, accounts, income/expense,
approval separation, posting, idempotency, balances, review decisions, CSV,
every page, WhatsApp relay configuration/health, and post-logout denial.

The staff account must have `must_change_password = false`; the owner starts with
`true` by design, and the harness performs the change as part of the flow.
It is a destructive test: run it against a disposable database only.

## Graphical browser run (Chromium)

`browser.mjs` drives a real headless Chromium: login, sidebar navigation, the
employee/vessel/attendance/cash forms, approval and posting buttons, payroll
rate form, CSV export and logout (24 assertions).

Requirements: Playwright + Chromium, and **HTTPS** — the session cookie is
`__Host-…; Secure`, so a plain-HTTP origin will not store it in a browser.

```
# TLS for a local run (self-signed), Next on 3212, proxy on 3443
node tests/e2e/tls-proxy.mjs key.pem cert.pem 3443 3212 &
E2E_BASE=https://127.0.0.1:3443 OWNER_PASSWORD=… node tests/e2e/browser.mjs
```

Fixtures: `owner` (ADMIN, `must_change_password=false`) and `staffadmin`
(ADMIN) for the approval-separation flow. Both exist only in the disposable DB.
