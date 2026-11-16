# Removed / preserved files

Nothing was deleted. Everything that left the runtime was **moved** into
`legacy-runtime/` inside this workspace, and the original production tree was
never modified.

## 1. Moved to `legacy-runtime/app/` (97 files)

Legacy pages and their private components:

```
admin, archive, assistant, attendance(old), candidate-api, cash(old),
conversations, dashboard(old), employee, employees(old), income-expenditure,
insights, login(old), message-mirror, platform, public-site, register, review(old),
signup, sources-review, submissions, transactions, vessel(old), vessel-register
```

Legacy API routes (all replaced by `/api/{auth,employees,programs,attendance,finance,payroll,review,whatsapp,reports,health}`):

```
api/assistant, api/cash, api/conversations, api/core, api/escort-register,
api/import-audit, api/operations, api/program-tools, api/register,
api/release-candidates, api/review/{submit,decide,withdraw,list},
api/vessel-programs, api/vessels, api/employees/lookup,
api/attendance/{add,summary}
```

Why: they are bound to the historical schema (84 tables), WhatsApp-specific
identities and the original organization's scope. Keeping them in the build
would have meant shipping a second, incompatible application. They stay
available as reference for future ports.

## 2. Excluded from the package (never copied)

```
services/**                     WhatsApp MCP server and Go bridge
infra/**                        PostgreSQL stack (not bundled)
/var/lib/vps/**                 sessions, message stores, evidence archives
*.dump, *.pem, *.key, *.log     backups, keys, logs
/etc/vps/**                     production credentials and configuration
.git/**, node_modules, .next    version-control and build artefacts
qualification/, import/, staging/  untracked evidence workspaces
```

No credential, token, private key or message body is present in this package.

## 3. Replaced runtime

| Old | New |
|---|---|
| 75-migration historical schema | `db/standalone/schema.sql` (26 tables, one file) |
| `db:import` evidence pipeline | not required by the new app |
| `release/start-private-app.mjs` (TLS + WhatsApp workers) | `pnpm start` (Next only) |
| `release/private-entry.mjs` (hard-coded production hosts) | customer reverse proxy |
| `tests/*` legacy suite in `pnpm test` | `test:unit` + `test:standalone`; legacy tests remain on disk for reference |

## 4. Unchanged and still used

* `lib/unified-auth*.ts`, `lib/cash-portal.ts`, `lib/login-throttle.ts` — the
  session, password and throttle implementation (SQL made schema-agnostic).
* `lib/shift-boundary.ts`, `lib/history-extraction.mjs`,
  `lib/escort-intake-candidate.mjs` — verified duty-shift and message parsers,
  reused by the new services and the relay adapter.
* `components/ui/*`, `lib/utils.ts` — UI primitives.
* `db/postgres.mjs` — configurable pool factory (previous task).
