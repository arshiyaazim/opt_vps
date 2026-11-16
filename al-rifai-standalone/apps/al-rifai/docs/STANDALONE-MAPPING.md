# Feature → Code → Database map

The runtime is `app/`, `lib/standalone/`, `db/standalone/schema.sql`.
`legacy-runtime/` is the preserved original UI/API and is **not** built.

| Module | UI | API | Service | Tables |
|---|---|---|---|---|
| Auth / session | `app/login/*`, `app/(workspace)/layout.tsx` | `app/api/auth/[...path]` | `lib/unified-auth*.ts`, `lib/cash-portal.ts` | `cash_portal_users`, `cash_portal_sessions`, `cash_portal_audit`, `login_throttle_state` |
| Dashboard | `app/(workspace)/dashboard` | `_shared` (server) | direct SQL | `employees`, `programs`, `program_pay`, `cash_instructions`, `review_items`, `attendance`, `audit_events` |
| Employees | `app/(workspace)/employees`, `employees/[mobile]` | `/api/employees` | `lib/standalone/employees.ts` | `employees`, `programs`, `attendance` |
| Attendance | `app/(workspace)/attendance` | `/api/attendance` | `lib/standalone/attendance.ts` | `attendance` |
| Vessel programs | `app/(workspace)/vessel` | `/api/programs` | `lib/standalone/programs.ts` | `programs`, `program_assignments`, `program_events`, `program_pay`, `employees` |
| Payroll | `app/(workspace)/payroll` | `/api/payroll` | `lib/standalone/payroll.ts`, `lib/shift-boundary.ts` | `rate_config`, `program_pay`, `programs` |
| Cash & accounts | `app/(workspace)/cash` | `/api/finance` | `lib/standalone/finance.ts` | `cash_accounts`, `cash_instructions`, `cash_postings`, `ledger_entries`, `cash_submissions`, `cash_submission_reviews` |
| Review | `app/(workspace)/review` | `/api/review` | `lib/standalone/review.ts` | `review_items`, `review_decisions` |
| Reports | `app/(workspace)/reports` | `/api/reports` | `lib/standalone/audit.ts` + list services | `audit_events` + all |
| Settings / relay | `app/(workspace)/settings` | `/api/whatsapp` | `lib/standalone/whatsapp.ts` | `whatsapp_accounts`, `whatsapp_chats`, `whatsapp_messages`, `whatsapp_cursors`, `app_settings` |
| Audit | `reports`, all services | — | `lib/standalone/audit.ts` | `audit_events` (append-only) |

## Unified business logic

The WhatsApp adapter and the web API call **the same services**:

```
web form  → /api/programs      → lib/standalone/programs.createProgram ─┐
WhatsApp  → adapter.process   → lib/standalone/programs.createProgram ─┴→ programs
```

Rules live in the services, not in the routes or the adapter:

* mobile normalization (`lib/standalone/db.ts`) and SQL `normalize_mobile`;
* exact duplicate rejection + ±1-day warning (`programs.potentialDuplicates`);
* one program per lighter; same mother/different lighter stays distinct;
* escort assignment files the employee before writing the program;
* release requires an end date ≥ start and recalculates pay by trigger;
* cash postings require approval by a **different** administrator and write an
  immutable ledger entry;
* every mutation appends an audit event.
