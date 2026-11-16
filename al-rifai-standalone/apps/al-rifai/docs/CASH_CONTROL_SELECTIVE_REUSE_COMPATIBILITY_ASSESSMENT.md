> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Cash Control → AL-RIFA’I Selective Reuse & Compatibility Assessment

**START AUDIT — 11 October 2026, Asia/Dhaka. Assessment and design only.**

This is the single consolidated assessment. Canonical target: `/opt/vps/apps/al-rifai`; organization: `/opt/vps`. Cash Control is reference functionality, never a second production financial authority. No implementation, source merge, migration, integration, deactivation or ownership transfer is authorized. Existing Fazle-Core/FPE writers and frozen payment relay remain protected.

Finding labels apply throughout: **VERIFIED** = directly inspected source/catalog/runtime fact, not a claim of deployed functional correctness; **PARTIAL** = some implementation/evidence exists but required guarantees are incomplete; **PROPOSED** = future design/recommendation; **MISSING** = absent from the inspected source/catalog scope; **UNVERIFIED** = runtime/behavior/evidence unavailable. Each schema row inherits its subsection's finding label; classification is a separate reuse judgment.

## 1. Executive summary

**VERIFIED:** Owner-approved architecture is AL-RIFA’I as future authoritative business application and financial command boundary. Current Phase 1 AL-RIFA’I remains private, historical/read-only, with integrations disabled. D12 target approval does not transfer production ownership. This task's **Option B selective reuse** means adapting useful Cash Control functionality inside that target; it does not reopen target selection. Existing README/specification/D12 call their target choice **Option A**. These labels refer to different option lists; no register or production behavior was changed to reconcile naming.

**PROPOSED:** Adapt accountant review queue layouts, draft/evidence context, explicit action audit concepts, and interface separation. Retain AL-RIFA’I's existing history/search/CSV/provenance/mobile-based statement workspace. Reject Cash Control's payout/name identity inference, verify-as-approve behavior, aggregate balance formulas and independent employee/ledger authority. Defer posting, recovery allocation, receipt/payment account balances and live message ingestion until financial policy, verified external FPE contract, single-writer continuity and actor approvals are reviewable.

**VERIFIED:** Cash Control is an initial standalone FastAPI/SQLAlchemy application with vanilla frontend and nine declared tables. All 37 files in its pinned complete repository tree were fetched through the existing authorized GitHub connection. No migrations exist despite README Alembic claims. Integration adapters are abstract/mock; integration factories raise `NotImplementedError`; posting integration returns `pending_integration` without submitting anything.

**PARTIAL:** Financial workflow contains pending transactions, admin approval/rejection and compensating reversals, but does not implement Draft → Verified → Approved → Posted. Accountant verification directly sets Approved/Final without updating the employee ledger. Admin approval updates the ledger without requiring accountant verification. There is no distinct Posted state, verified receipt proof, cash/bank/MFS account model, advance-recovery allocation or robust concurrent command replay contract.

**UNVERIFIED:** External FPE deployment/schema/current clients/health and runtime flag values remain unavailable. Repository source establishes dependencies, not their live operational inventory. Cash Control tests were inspected statically, not run; no coverage percentage or successful API/browser qualification is established.

## 2. Source and version inventory / START operational state

| Finding | Source/version | Provenance and inspection boundary |
|---|---|---|
| VERIFIED | Cash Control commit `fa1c81979c74835277e42a912150002bdf583434`, 8 October 2026 22:44:46 UTC; tree `aa9961f6b97ab3ca8d5118d9c7d80bec51ec6667`; version 0.1.0 | Existing arshiyaazim GitHub connector; recursive tree `truncated=false`, 37 blobs, all fetched at SHA. Commit unsigned; provenance does not mean production qualification. [Pinned repository](https://github.com/arshiyaazim/cash-control/tree/fa1c81979c74835277e42a912150002bdf583434) |
| VERIFIED | Fazle-Core commit `1838619b644dc83f4ca723d3442d94435e6050f1`, remote latest observed; 3 October 2026 | Existing authorized connector; pinned FPE/relay/financial source inspected. Full tree read for locating dependencies; selected files inspected, not a whole-Core implementation audit. [Pinned source](https://github.com/arshiyaazim/fazle-core/tree/1838619b644dc83f4ca723d3442d94435e6050f1) |
| PARTIAL | Canonical AL-RIFA’I source is local working export with qualified later adaptations, no usable Git HEAD | `/opt/vps` Git commands report not a Git repository. `SOURCE-MANIFEST.json` records original v10 source commit `3425b13f640016fdd7171ea1fda1c2d20c13f038`, exported 7 October; that is provenance for the original export, not current code SHA. Local SHA256 baseline covers 2,955 non-cache files before report edits. |
| VERIFIED | Next.js 16.3.4, React 19.2.6, Drizzle 0.45.2, pg 8.16.3, Zod 3.25.76 range | `apps/al-rifai/package.json`; PostgreSQL 16 infrastructure per VPS_MAP. No packages installed/upgraded. |
| VERIFIED | Cash Control dependency declarations | `requirements.txt`: FastAPI 0.95.2, Pydantic 1.10.8, SQLAlchemy 1.4.53, Alembic 1.12.1. PostgreSQL drivers commented out. `tests/conftest.py` imports `async_sessionmaker`, a SQLAlchemy 2.x API inconsistent with its 1.4 pin. |
| VERIFIED | Live public schema: nine tables, 54 columns | SELECT-only `information_schema`/`pg_catalog` query; no business rows read, no migration executed. Full table/column inventory in §6. No `ep_*`, `cash_transactions`, `employees` or `employee_ledger` present. |
| VERIFIED | Four running containers; six retained stopped containers | Docker read-only inventory. wa-01 `11facf3b9c88…`, wa-02 `1d9ed658c18d…`, same CAP-4 image `sha256:b76c837c435364011307859f8c04bc4aee02b3e3c97ae75e13a149e7a2584f83`, restart count 0. AL-RIFA’I `fefc2793d28d…` image `sha256:948e9f44bfc143cfd848cb9e68c1503b08ac35f60c70b5e41ecf13c06a73bc98`; PostgreSQL `63b70ddf47f2…` image `sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`, both healthy. |
| UNVERIFIED | Fresh wa-01 connectivity / native FD-FLOCK ownership / external FPE production | Deliberately no wa-01 connection, MCP consumption, WhatsApp/native SQLite inspection or external production API access. Prior handoff's connected/sole-writer evidence is historical; Docker identities were freshly inspected. No unsupported new connectivity or 24-hour claim. |

**VERIFIED mandatory sources read:** `/opt/vps/README.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`, `/opt/vps/docs/VPS_MAP.md`, `services/whatsapp/qualification/application-contract-20261011/specification.md`, `apps/al-rifai/docs/OWNER_BUSINESS_POLICY.md`, `owner-business-rules.json`, `PHASE2A_DECISIONS_REQUIRED.md`, `EMPLOYEE_PROGRAM_QUALIFICATION_SUMMARY.md`. No applicable local AGENTS instruction was found in the AL-RIFA’I ancestry; WhatsApp source AGENTS is outside this task's source-edit scope.

**VERIFIED audit method:** individual SHA-pinned file retrieval and temporary inspection material under `/tmp`, not a clone/checkout/deployment. No application import or test startup: Cash Control's lifespan calls `create_all`, so executing it would violate this assessment's no-schema-write boundary. Workspace hashes exclude Git/cache/build/dependency directories; all 11 protected `/etc/vps` files hashed without printing secrets. Docker access initially denied in sandbox; authorized read-only escalation succeeded. Initial Docker template expected Health on bridges, which have no Health field; corrected to identity/start/restart fields without a runtime action.

## 3. Accountant workspace comparison

All Cash Control paths below are relative to its pinned repository; all local paths are relative to `/opt/vps/apps/al-rifai`.

| Finding/domain | Cash Control implemented evidence | AL-RIFA’I evidence | Assessment |
|---|---|---|---|
| PARTIAL — identity/roles/login | `app/auth.py::AuthService`, `require_role`, `require_any_role`; bcrypt/JWT, active user lookup; hierarchical and explicit allowlists differ | `proxy.ts`, `lib/validation-auth.mjs`, `app/chatgpt-auth.ts`: one private validator identity; not production per-user accountant RBAC | Keep current auth. Design capability/actor adapter after owner selection; never replace with Cash Control JWT by assumption. |
| PARTIAL — entry and verification | `frontend/index.html#create-transaction-form`, `frontend/js/app.js::handleCreateTransaction/displayVerificationList`, `module_z_posting.py::submit_payment_intent`, `module_d_accountant.py::verify_transaction` | `app/accounts-panel.tsx::AccountsPanel`, read-only `app/api/operations/route.ts`; `lib/operations.ts::validateDraft` is a helper, not a live write grant | Adapt review UI patterns, rebuild action semantics; no receipt-entry flow or safe verification-to-approval pipeline available to copy. |
| PARTIAL — approval/rejection queues | `module_e_admin.py::get_pending_approval/approve_transaction/reject_transaction`; same pending_review set as accountant queue | Historical parsing/duplicate review exists; `canWrite:false`; POST/PUT/PATCH/DELETE return 405 | Introduce guarded target workflow only after approval; do not duplicate historical review. Frontend has API methods for admin actions but no equivalent complete approval/rejection workspace rendering. |
| VERIFIED/PARTIAL — employee search | `module_b_identity.py::search_employees/lookup_by_phone`; `CashControlAPI.searchEmployees`; transaction form accepts employee ID, no evidence-bound selector | Existing name/Employee ID/payout/purpose filters and statement navigation in accounts panel | Retain local UI; candidate search may assist selection but cannot establish employee identity. |
| VERIFIED — history/filter concepts | `module_c_cash.py::get_transactions`, category/status/method/date/amount/reference filters; employee history route | `lib/cash-data.ts::cashFilterSchema/filterCash/employeeStatements/cashDaily`; dates/method/source/search, source detail, aliases, pagination | Retain existing features; adapt only approved status/category/account filters when posted data exists. |
| PARTIAL — reports/exports | `module_c_cash.py::export_transactions_csv`, module G daily cash/advances/reconciliation/audit reports | Source-scoped CSV/history metrics; `accounts-panel.tsx::exportRows`, `lib/vessel-data.ts::csv` | Retain local CSV and source labels; adapt discrepancy presentation after correct accounting model. Cash Control export is date-only while list supports more filters. |
| PARTIAL — audit/correction | Audit model and admin audit query; service before/after logs; reversal action | Raw source display, immutable snapshots, historical operation notes; no active financial correction engine | Adapt append-linked correction/reversal review concepts. Cash Control CORRECTION enum/CORRECTED state are not a implemented correction workflow. |
| PARTIAL — mobile usability | `frontend/style.css` 768px responsive rules; stacked cards/filter flex | Existing Next.js bilingual tables/dialogs, loading/retry/stale labels and responsive CSS | No browser/touch/accessibility qualification performed. Retain established UI; assess queue cards at 360/768/desktop after authorized implementation. |

**VERIFIED source defects affecting portability:** backend login takes scalar query parameters while `frontend/js/api.js::login` sends JSON. Ingest, payment submission, rejection/reversal and optional notes have the same scalar/body mismatch; required scalar fields will be missing and optional notes can be silently ignored. Several list routes call `selectinload` without importing it (modules C/D/E/F/G); C/E use `func` without importing it; inbox stats lacks `func`; posting status lacks `select`. `app/database.py::get_db` is decorated `@asynccontextmanager` but used directly in FastAPI `Depends`, rather than yielding an injected session through an async-generator dependency. `User.created_transactions/approved_transactions` omit `foreign_keys` despite multiple CashTransaction→users FKs, risking ambiguous ORM joins. These are static defects; exact runtime failure ordering is UNVERIFIED.

**VERIFIED security mismatch:** frontend uses unescaped source/name strings in `innerHTML` (`displayMessages`, `displayTransactions`, audit renderers) and stores JWT in localStorage. `showApp` displays the role but does not implement action-specific role hiding. README XSS protection, comprehensive role-based UI, CSRF protection and secure headers are not substantiated by the inspected implementation. Logout only removes the client token; generated API keys are not persisted/validated. Do not port these patterns. React text rendering and existing private auth are retained pending scoped production identity design.

## 4. Cash transaction workflow comparison

| Finding | Cash Control actual behavior/source | AL-RIFA’I / required compatibility |
|---|---|---|
| MISSING — receipt vs payment/account separation | Categories only salary/advance/bonus/deduction/correction; methods cash/bank/bKash/Nagad/Rocket/unknown. No direction, account ID, account balance/opening record or currency on CashTransaction (`models.py`) | `site_cash_archive.method` is historical text; no live account ledger. D11 must define accounts/direction/currency/opening evidence; payment method is not an account. |
| PARTIAL — advance/recovery | `_update_employee_ledger` increments advances; no recovery allocation or remaining-advance accounting. Employee-advances report is a listing, not recovery enforcement | D08/D11 pending; historical instruction totals cannot establish outstanding advance. Prevent double recovery/over-allocation through qualified single-ledger allocation logic. |
| POLICY CONFLICT / VERIFIED — state machine | Service create = Pending/PendingReview. Accountant verify = Final/Approved, no ledger update; admin service approve = Final/Approved plus aggregate ledger update. Neither requires separate Verified/Posted states | Proposed target separates five facts: draft, identity/evidence verification, authorized approval, authoritative posting result, payment completion. Accountant verification never posts or approves implicitly. |
| PARTIAL — rejection/correction | Admin rejects pending_review, stores actor/time/reason audit; transaction stays Pending. No versioned corrected-draft/resubmission endpoint | Append correction with predecessor/evidence/version; invalidate stale approvals, preserve rejection and posted originals. No automatic payroll/settlement recalculation. |
| PARTIAL — reversal | `TransactionService.reverse_transaction`: negative same-category entry, `REV-<ref>`, marks original Reversed, today's date/current month, audit, aggregate update | FPE reversal retains original financial row/date/period and uses `reversed_txn_id`; future effective-period policy unresolved. Must preserve FPE history and qualify replay/concurrency; no use of current-month default by assumption. |
| PARTIAL — transaction reference | `generate_txn_ref`: `cc-` + first 16 SHA256 hex chars of message ID, numeric employee FK, Decimal string, month, method, source | Omits day/category/account/payout/block/account namespace; no stable manual operation ID, no Idempotency-Key handling. Distinct same-amount manual payments in a month can collide; `5000` vs `5000.00` can differ; changed payload can get new key. Retain FPE refs and require operation key + canonical payload conflict rules. |
| PARTIAL — duplicates | Accountant groups Final rows by employee/float amount/method within created-at lookback; flag stored in JSON | This is review evidence, not identity or posting suppression. Existing local same-date source review remains. Multiple legitimate equal payments remain separate. Reprocessing inbox can create multiple drafts; no processed-state uniqueness guard. |
| PARTIAL — atomicity/concurrency | SQLAlchemy session context intends commit/rollback; approval/reversal select-then-mutate, no row lock/CAS; `PaymentDraft.version` unused; ledger read-modify-write | Unique txn_ref helps inserts, does not fix lost aggregate updates/concurrent approval. Ledger unique `(employee_id, period, transaction_id)` allows multiple rows per employee/month and NULL duplicates, while service expects exactly one. Target command/state/audit/allocation must commit atomically with concurrent replay acceptance. |
| POLICY CONFLICT / VERIFIED — financial correctness | Aggregate balance = opening + salary + bonus − advance − deduction + correction; opening hardcoded zero; statements add every signed amount; daily cash treats all positive payments as income; admin cash balance calls salary/bonus income | Example salary 5000 + advance 1000 gives aggregate 4000 but statement/reconciliation sum 6000. No justified office cash/employee payable model. Formula cannot be adopted or used as current balance. |
| POLICY CONFLICT / VERIFIED — reversal reporting | Original marked Reversed and excluded from FINAL-only daily/reconciliation reports; negative reversal stays Final | Report then includes −5000 without +5000 original, while aggregate can be zero. Month-changing reversal also breaks opening/history. Require ledger-derived balanced reversal inclusion and business-date rules. |
| PARTIAL — audit trail | Audit records and actor FKs exist but no append-only triggers/privileges; not all employee/inbox actions audit; ledger audit attributes creator, not approval actor | Retain raw historical provenance; proposed command audit binds verified actor, evidence hash, policy, approved version, state change and posting reference. No claim of immutable Cash Control audit. |

**VERIFIED AL-RIFA’I limits:** `app/api/operations/route.ts::writer` returns false; all mutation exports return 405. `db/postgres.mjs::createPool` defaults database sessions to read-only. `lib/integrations.ts::integrationConfig` is frozen empty. Existing `site_payment_drafts`/`site_settlement_drafts` can be read but contain no structured approval/posting guarantees. `lib/operations.ts::calculateSettlement` contains a fixed food assumption; D08 explicitly says it is not approved payroll policy. No financial module was deactivated.

## 5. Employee Ledger comparison

**VERIFIED approved rule:** EMP-001–006 / employee-mobile-v3: normalized established employee/escort-role mobile is operational `employee_id`; technical relational ID stays separate. Same mobile = one operational employee with all original name aliases; same name/different mobiles remains separate absent explicit owner linkage. Sender phone, payout number, master/client and opaque JID/LID cannot establish employee identity. Normalize approved Bengali/ASCII BD forms to +880; preserve original values; ambiguous/missing/reassigned/international identities require review.

| Finding | Cash Control | AL-RIFA’I and disposition |
|---|---|---|
| POLICY CONFLICT / VERIFIED — identification | `Employee.id` numeric PK, required unique employee_code and unique primary_phone; optional nonunique employee_id_phone | Technical FK may be mapped, never relabeled operational Employee ID. Existing historical `employeePhone` is approved employee-role evidence. Candidate `ep_employees.employee_id` is unique +880 mobile, separate text `id`. Reuse that candidate boundary after acceptance, not a second employees master. |
| POLICY CONFLICT / VERIFIED — lookup | `IdentityService.find_employee_by_phone` OR-matches primary/ID/payout; resolver single exact-name returns confidence .85, fuzzy first-name match .70 | Reject payout/name identity resolution. Inbox confidence >.7 accepts unique exact-name match even if phone unmatched. Search may show candidates, never bind authoritatively by name. |
| PARTIAL — aliases | `employee_aliases` globally unique `(alias_type,alias_value)`, no source/hash/effective period; employee creation aliases payout phone | Candidate `ep_employee_history` is employee-scoped with decision/effective provenance and source bindings. Existing statement names preserve variants. Global name uniqueness prevents legitimate same-name employees and violates EMP-005; payout-as-alias violates EMP-006. |
| PARTIAL — normalization | `normalize_phone` strips nondigits and emits national 01…; accepts broader 01 pattern, lacks approved +880 output and source-role checks | Use existing `lib/employee-program-validation.mjs` normalization/review policy. Raw phone display may remain national historical value; normalize matching without rewriting original evidence. |
| PARTIAL — financial history/linkage | Numeric employee FK and raw name/ID/contact/payout fields on transaction; EmployeeLedger stores one initial transaction_id per monthly aggregate | Retain all posted FPE IDs/refs, evidence and reversal links; history/read model may derive balances but cannot become independent writer. Existing statements summarize source instructions, not verified earnings/payment/advance balances. |
| MISSING — historical authority bridge | No export hash/chat/sender binding/versioned original alias evidence in CC models | `accounts-snapshot.ts::accountsCash` uses exact source snapshot and source sender; policy attestation covers the original export only. Qualification summary records 9,002 finance instruction messages, no native sender transport identifiers. That cannot attest a new wa-01 conversation or payment completion. |

**VERIFIED candidate, not deployment:** `db/migration-candidates/0006_employee_program_identity.sql` contains eleven candidate tables, with mobile-valued employee identity/history/source decisions/bindings. Isolated SQL report records 30 PASS, lifecycle 113 PASS, reader qualification nine PASS; production reader defects and sender/media/binding gaps remain. No candidate table or import is present in the fresh live catalog. Original approved rules need no reapproval; reader acceptance and operational identity bindings do.

## 6. Exact table/column schema mapping

**VERIFIED** schema distinction: Cash Control entries below are exact **source model declarations**, not an inspected deployed catalog. Its SQLite default and SQLAlchemy dialect alter physical Enum/Boolean/JSON/autoincrement DDL; no database was started to infer missing migrations. `SQLEnum` uses Python member names (e.g. `SALARY`, `PENDING`) under SQLAlchemy defaults, not necessarily the lower-case `.value` used by JSON. With its 1.4 defaults no enum CHECK is explicitly requested; PostgreSQL native enum constraints and SQLite enforcement must be qualified later. `default` means ORM/client insert default, not a server default; nullable remains YES unless explicitly forbidden or primary key. `onupdate` is an ORM update expression, not a DB trigger. Column indexes are default SQLAlchemy `ix_<table>_<column>` declarations; explicit indexes/unique/check constraints and relationships are listed per table. FK delete/update actions are unspecified; ORM cascade is not DB cascade. No hidden constraint or deployment status is inferred.

**PROPOSED** mapping classifications apply to every Cash Control table and column: REUSE LOGIC, ADAPT TO AL-RIFAI, ALREADY EXISTS, NOT REQUIRED, POLICY CONFLICT, NEEDS OWNER DECISION. ALREADY EXISTS means a matching concept/field in historical projection/storage, not financial authority or equal SQL type. No column is implicitly authorized for creation. Table dispositions do not override stricter column judgments.


### Cash Control `users` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::User](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L80). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: NOT REQUIRED.

Table constraints and explicit composite indexes: `Index("idx_users_username_active", "username", "is_active")`.

Relationships (ORM declarations, not additional SQL constraints): `audit_logs = relationship("AuditLog", back_populates="user")`; `created_transactions = relationship("CashTransaction", back_populates="created_by_user")`; `approved_transactions = relationship("CashTransaction", back_populates="approved_by_user")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_users_id | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 84 |
| username | String(50) | — | — | unique index | NO | — | ix_users_username | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 85 |
| email | String(100) | — | — | unique index | NO | — | ix_users_email | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 86 |
| full_name | String(100) | — | — | — | NO | — | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 87 |
| hashed_password | String(255) | — | — | — | NO | — | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 88 |
| role | SQLEnum(UserRole) | — | — | — | NO | client UserRole.VIEWER | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 89 |
| is_active | Boolean | — | — | — | YES | client True | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 90 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 91 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | NOT REQUIRED | Use AL-RIFA’I actor/auth boundary; no duplicate local credential store | 92 |

### Cash Control `employees` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::Employee](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L104). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: POLICY CONFLICT.

Table constraints and explicit composite indexes: `Index("idx_employees_phone_status", "primary_phone", "status")`; `Index("idx_employees_id_phone", "employee_id_phone")`.

Relationships (ORM declarations, not additional SQL constraints): `aliases = relationship("EmployeeAlias", back_populates="employee", cascade="all, delete-orphan")`; `transactions = relationship("CashTransaction", back_populates="employee")`; `ledger_entries = relationship("EmployeeLedger", back_populates="employee")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_employees_id | ADAPT TO AL-RIFAI | Reuse candidate ep_employees technical id / ep_employee_history facts; not a live employee table | 108 |
| employee_code | String(20) | — | — | unique index | NO | — | ix_employees_employee_code | NEEDS OWNER DECISION | Candidate ep_employees.authoritative_code is optional; Cash Control requires a code | 109 |
| full_name | String(100) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | Reuse candidate ep_employees technical id / ep_employee_history facts; not a live employee table | 110 |
| primary_phone | String(20) | — | — | unique index | NO | — | ix_employees_primary_phone | POLICY CONFLICT | Candidate ep_employees.employee_id is one +880 mobile-valued key; do not duplicate primary/ID matching numbers | 111 |
| employee_id_phone | String(20) | — | — | — | YES | — | ix_employees_employee_id_phone | POLICY CONFLICT | Candidate ep_employees.employee_id is one +880 mobile-valued key; do not duplicate primary/ID matching numbers | 112 |
| payout_phone | String(20) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | CashRow.payoutPhone exists in projection; separate verified destination, never employee identity | 113 |
| status | String(20) | — | — | — | YES | client active | — | NEEDS OWNER DECISION | Approved effective employment/rate evidence; candidate ep_employee_history, no default active/salary authority | 114 |
| hire_date | Date | — | — | — | YES | — | — | NEEDS OWNER DECISION | Approved effective employment/rate evidence; candidate ep_employee_history, no default active/salary authority | 115 |
| basic_salary | Numeric(12, 2) | — | — | — | YES | client 0 | — | NEEDS OWNER DECISION | Approved effective employment/rate evidence; candidate ep_employee_history, no default active/salary authority | 116 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ADAPT TO AL-RIFAI | Reuse candidate ep_employees technical id / ep_employee_history facts; not a live employee table | 117 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | ADAPT TO AL-RIFAI | Reuse candidate ep_employees technical id / ep_employee_history facts; not a live employee table | 118 |

### Cash Control `employee_aliases` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::EmployeeAlias](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L131). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: POLICY CONFLICT.

Table constraints and explicit composite indexes: `UniqueConstraint("alias_type", "alias_value", name="uq_employee_alias")`; `Index("idx_employee_aliases_value", "alias_type", "alias_value")`.

Relationships (ORM declarations, not additional SQL constraints): `employee = relationship("Employee", back_populates="aliases")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_employee_aliases_id | ADAPT TO AL-RIFAI | Candidate ep_employee_history plus ep_source_bindings; retain every source-bound original name | 135 |
| employee_id | Integer | — | employees.id | — | NO | — | — | ADAPT TO AL-RIFAI | Candidate ep_employee_history plus ep_source_bindings; retain every source-bound original name | 136 |
| alias_type | String(20) | — | — | — | NO | — | — | POLICY CONFLICT | Candidate ep_employee_history stores employee-scoped names/aliases with evidence; payout phone aliases and global name uniqueness rejected | 137 |
| alias_value | String(100) | — | — | — | NO | — | — | POLICY CONFLICT | Candidate ep_employee_history stores employee-scoped names/aliases with evidence; payout phone aliases and global name uniqueness rejected | 138 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ADAPT TO AL-RIFAI | Candidate ep_employee_history plus ep_source_bindings; retain every source-bound original name | 139 |

### Cash Control `cash_transactions` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::CashTransaction](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L150). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: ADAPT TO AL-RIFAI.

Table constraints and explicit composite indexes: `Index("idx_cash_txn_employee_date", "employee_id", "txn_date")`; `Index("idx_cash_txn_status", "transaction_status", "approval_status")`; `Index("idx_cash_txn_period", "accounting_period")`; `Index("idx_cash_txn_ref", "txn_ref")`; `CheckConstraint("amount != 0", name="ck_amount_nonzero")`.

Relationships (ORM declarations, not additional SQL constraints): `employee = relationship("Employee", back_populates="transactions")`; `created_by_user = relationship("User", foreign_keys=[created_by], back_populates="created_transactions")`; `approved_by_user = relationship("User", foreign_keys=[approved_by], back_populates="approved_transactions")`; `reversal_of = relationship("CashTransaction", remote_side=[id], backref="reversals")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_cash_transactions_id | ADAPT TO AL-RIFAI | Preserve FPE id/txn_ref/reversed_txn_id; target financial continuity contract, no independent cash_transactions | 154 |
| txn_ref | String(64) | — | — | unique index | NO | — | ix_cash_transactions_txn_ref | ADAPT TO AL-RIFAI | Preserve FPE id/txn_ref/reversed_txn_id; target financial continuity contract, no independent cash_transactions | 155 |
| employee_id | Integer | — | employees.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 156 |
| employee_name_raw | String(100) | — | — | — | YES | — | — | ALREADY EXISTS | CashRow.name / site_cash_archive.name; meaning must remain historical, never automatically posted | 157 |
| employee_id_phone | String(20) | — | — | — | YES | — | — | ALREADY EXISTS | CashRow.employeePhone / site_cash_archive.employeePhone; meaning must remain historical, never automatically posted | 158 |
| employee_phone | String(20) | — | — | — | YES | — | — | POLICY CONFLICT | No additional employee identity phone; separately typed contact only if justified | 159 |
| amount | Numeric(12, 2) | — | — | — | NO | — | — | ALREADY EXISTS | site_cash_archive.amountCents (integer cents; historical only); meaning must remain historical, never automatically posted | 160 |
| payout_phone | String(20) | — | — | — | YES | — | — | ALREADY EXISTS | CashRow.payoutPhone (projection only); meaning must remain historical, never automatically posted | 161 |
| payout_method | SQLEnum(PaymentMethod) | — | — | — | YES | — | — | ALREADY EXISTS | site_cash_archive.method / CashRow.method; meaning must remain historical, never automatically posted | 162 |
| txn_date | Date | — | — | — | NO | — | — | ALREADY EXISTS | site_cash_archive.date; meaning must remain historical, never automatically posted | 163 |
| txn_category | SQLEnum(TransactionCategory) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 164 |
| accounting_period | String(7) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 165 |
| transaction_status | SQLEnum(TransactionStatus) | — | — | — | YES | client TransactionStatus.PENDING | — | POLICY CONFLICT | Implement separately guarded Draft/Verified/Approved/Posted; Final/Approved conflation rejected | 166 |
| approval_status | SQLEnum(ApprovalStatus) | — | — | — | YES | client ApprovalStatus.PENDING_REVIEW | — | POLICY CONFLICT | Implement separately guarded Draft/Verified/Approved/Posted; Final/Approved conflation rejected | 167 |
| source | String(50) | — | — | — | NO | — | — | ALREADY EXISTS | site_cash_archive.source; meaning must remain historical, never automatically posted | 170 |
| source_channel | String(50) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 171 |
| source_message_id | String(100) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 172 |
| source_message_text | Text | — | — | — | YES | — | — | ALREADY EXISTS | CashRow.sourceText (details/projection); meaning must remain historical, never automatically posted | 173 |
| approved_by | Integer | — | users.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 176 |
| approved_at | DateTime(timezone=True) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 177 |
| submitted_by | Integer | — | users.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 178 |
| submitted_at | DateTime(timezone=True) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 179 |
| is_reversal | Boolean | — | — | — | YES | client False | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 182 |
| reversal_of_txn_id | Integer | — | cash_transactions.id | — | YES | — | — | ADAPT TO AL-RIFAI | Preserve FPE id/txn_ref/reversed_txn_id; target financial continuity contract, no independent cash_transactions | 183 |
| reversal_reason | Text | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 184 |
| created_by | Integer | — | users.id | — | NO | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 187 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 188 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 189 |
| deleted_at | DateTime(timezone=True) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 190 |
| deleted_by | Integer | — | users.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 191 |
| metadata | JSON | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I proposed financial boundary; preserve FPE equivalent provenance/actor/reversal facts; schema decision pending | 192 |

### Cash Control `employee_ledger` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::EmployeeLedger](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L209). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: POLICY CONFLICT.

Table constraints and explicit composite indexes: `UniqueConstraint("employee_id", "accounting_period", "transaction_id", name="uq_ledger_entry")`; `Index("idx_ledger_employee_period", "employee_id", "accounting_period")`.

Relationships (ORM declarations, not additional SQL constraints): `employee = relationship("Employee", back_populates="ledger_entries")`; `transaction = relationship("CashTransaction")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_employee_ledger_id | ADAPT TO AL-RIFAI | Retain employeeStatements historical view; future read model over single authoritative FPE-compatible ledger, no second writer | 213 |
| employee_id | Integer | — | employees.id | — | NO | — | — | ADAPT TO AL-RIFAI | Retain employeeStatements historical view; future read model over single authoritative FPE-compatible ledger, no second writer | 214 |
| accounting_period | String(7) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | Retain employeeStatements historical view; future read model over single authoritative FPE-compatible ledger, no second writer | 215 |
| transaction_id | Integer | — | cash_transactions.id | — | YES | — | — | POLICY CONFLICT | First-transaction-only aggregate link loses later postings; retain all authoritative transaction references | 216 |
| salary_earned | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 219 |
| advances_taken | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 220 |
| bonuses_received | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 221 |
| deductions_applied | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 222 |
| corrections_made | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 223 |
| opening_balance | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 226 |
| closing_balance | Numeric(12, 2) | — | — | — | YES | client 0 | — | POLICY CONFLICT | Do not adopt aggregate formula/defaults; derive qualified authoritative FPE-compatible balances after accountant decision | 227 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ADAPT TO AL-RIFAI | Retain employeeStatements historical view; future read model over single authoritative FPE-compatible ledger, no second writer | 230 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | ADAPT TO AL-RIFAI | Retain employeeStatements historical view; future read model over single authoritative FPE-compatible ledger, no second writer | 231 |

### Cash Control `payment_drafts` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::PaymentDraft](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L243). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: ADAPT TO AL-RIFAI.

Table constraints and explicit composite indexes: `Index("idx_drafts_status", "status", "created_at")`; `Index("idx_drafts_employee", "employee_id", "status")`.

Relationships (ORM declarations, not additional SQL constraints): `employee = relationship("Employee")`; `reviewed_by_user = relationship("User", foreign_keys=[reviewed_by])`; `created_by_user = relationship("User", foreign_keys=[created_by])`; `transaction = relationship("CashTransaction")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_payment_drafts_id | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 247 |
| draft_type | String(50) | — | — | — | NO | — | — | NEEDS OWNER DECISION | Approved D08/D11 scope; no implied default salary or multi-currency ledger | 248 |
| employee_id | Integer | — | employees.id | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 249 |
| employee_name | String(100) | — | — | — | NO | — | — | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 250 |
| employee_mobile | String(20) | — | — | — | NO | — | — | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 251 |
| expected_amount | Numeric(12, 2) | — | — | — | NO | — | — | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 252 |
| currency | String(3) | — | — | — | YES | client BDT | — | NEEDS OWNER DECISION | Approved D08/D11 scope; no implied default salary or multi-currency ledger | 253 |
| status | String(20) | — | — | — | YES | client pending | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 256 |
| reviewed_by | Integer | — | users.id | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 257 |
| reviewed_at | DateTime(timezone=True) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 258 |
| rejected_reason | Text | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 259 |
| transaction_id | Integer | — | cash_transactions.id | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 262 |
| txn_ref | String(64) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 263 |
| created_by | Integer | — | users.id | — | NO | — | — | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 266 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ALREADY EXISTS | site_payment_drafts.id/details/actor/createdAt and PaymentDraft projection; read-only, no approval engine | 267 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 268 |
| version | Integer | — | — | — | YES | client 0 | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 269 |
| before_state | JSON | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 272 |
| after_state | JSON | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 273 |
| metadata | JSON | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Extend qualified AL-RIFA’I draft boundary with durable versions, review state and FPE result links only after approval | 274 |

### Cash Control `message_inbox` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::MessageInbox](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L288). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: ADAPT TO AL-RIFAI.

Table constraints and explicit composite indexes: `Index("idx_inbox_status", "extraction_status", "message_timestamp")`; `Index("idx_inbox_sender", "sender_phone", "message_timestamp")`; `Index("idx_inbox_type", "message_type", "extraction_status")`.

Relationships (ORM declarations, not additional SQL constraints): `processed_by_user = relationship("User")`; `linked_transaction = relationship("CashTransaction")`; `linked_draft = relationship("PaymentDraft")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_message_inbox_id | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 292 |
| message_type | SQLEnum(MessageType) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 293 |
| source_channel | String(50) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | Application evidence envelope: account/provider/chat/stanza/original sender/time; no bridge-store writes | 294 |
| source_account | String(100) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Application evidence envelope: account/provider/chat/stanza/original sender/time; no bridge-store writes | 295 |
| sender_identity | String(100) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Application evidence envelope: account/provider/chat/stanza/original sender/time; no bridge-store writes | 296 |
| sender_phone | String(20) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | Application evidence envelope: account/provider/chat/stanza/original sender/time; no bridge-store writes | 297 |
| message_text | Text | — | — | — | NO | — | — | ALREADY EXISTS | site_source_snapshots.payload / historical message body; immutable raw occurrence required for future live evidence | 300 |
| message_timestamp | DateTime(timezone=True) | — | — | — | NO | — | — | ADAPT TO AL-RIFAI | Application evidence envelope: account/provider/chat/stanza/original sender/time; no bridge-store writes | 301 |
| extraction_status | String(20) | — | — | — | YES | client pending | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 304 |
| extracted_amount | Numeric(12, 2) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 305 |
| extracted_phone | String(20) | — | — | — | YES | — | — | POLICY CONFLICT | Typed Employee ID/sender/payout roles; confidence never establishes identity or authority | 306 |
| extracted_name | String(100) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 307 |
| extraction_confidence | Numeric(3, 2) | — | — | — | YES | — | — | POLICY CONFLICT | Typed Employee ID/sender/payout roles; confidence never establishes identity or authority | 308 |
| processed_at | DateTime(timezone=True) | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 311 |
| processed_by | Integer | — | users.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 312 |
| linked_transaction_id | Integer | — | cash_transactions.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 313 |
| linked_draft_id | Integer | — | payment_drafts.id | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 314 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 317 |
| metadata | JSON | — | — | — | YES | — | — | ADAPT TO AL-RIFAI | AL-RIFA’I evidence/extraction/review boundary, proposed versioned occurrence/block mapping; no independent inbox authority | 318 |

### Cash Control `audit_logs` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::AuditLog](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L332). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: ADAPT TO AL-RIFAI.

Table constraints and explicit composite indexes: `Index("idx_audit_entity", "entity_type", "entity_id", "performed_at")`; `Index("idx_audit_user", "performed_by", "performed_at")`; `Index("idx_audit_action", "action", "performed_at")`.

Relationships (ORM declarations, not additional SQL constraints): `user = relationship("User", back_populates="audit_logs")`.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_audit_logs_id | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 336 |
| entity_type | String(50) | — | — | — | NO | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 337 |
| entity_id | Integer | — | — | — | NO | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 338 |
| action | String(50) | — | — | — | NO | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 339 |
| before_state | JSON | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 342 |
| after_state | JSON | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 343 |
| changes | JSON | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 344 |
| performed_by | Integer | — | users.id | — | NO | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 347 |
| performed_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 348 |
| ip_address | String(45) | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 349 |
| user_agent | Text | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 350 |
| reason | Text | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 353 |
| metadata | JSON | — | — | — | YES | — | — | REUSE LOGIC | Before/after/actor/reason concept; adapt to append-only financial audit in AL-RIFA’I, preserve FPE history and string actor identities | 354 |

### Cash Control `integration_config` — VERIFIED model declaration; deployed status UNVERIFIED

Source: [app/models.py::IntegrationConfig](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py#L366). Migration: **MISSING** (no migration/Alembic configuration in the complete pinned tree); startup uses `Base.metadata.create_all`. Whole-table disposition: NOT REQUIRED.

Table constraints and explicit composite indexes: `UniqueConstraint("service_name", name="uq_integration_service")`.

Relationships (ORM declarations, not additional SQL constraints): none.

| Column | Declared type | PK | FK | Column unique | Nullable | Default/update | Column index | Classification | Existing/target mapping | Source line |
|---|---|---|---|---|---|---|---|---|---|---|
| id | Integer | yes | — | — | NO | —; integer PK autoincrement convention | ix_integration_config_id | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 370 |
| service_name | String(50) | — | — | — | NO | — | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 371 |
| endpoint_url | String(255) | — | — | — | YES | — | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 372 |
| api_key_hash | String(64) | — | — | — | YES | — | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 373 |
| is_active | Boolean | — | — | — | YES | client False | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 374 |
| last_verified | DateTime(timezone=True) | — | — | — | YES | — | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 375 |
| config_data | JSON | — | — | — | YES | — | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 376 |
| created_at | DateTime(timezone=True) | — | — | — | YES | server func.now() | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 377 |
| updated_at | DateTime(timezone=True) | — | — | — | YES | —; onupdate func.now() | — | NOT REQUIRED | Retain lib/integrations.ts disabled configuration; scoped deployment configuration only after approval | 378 |

### AL-RIFA’I live catalog — VERIFIED SELECT-only inspection

Every table below is present in `public`. All PK indexes are unique B-tree on `id`. **No foreign keys, secondary unique constraints, CHECK constraints or secondary indexes exist in this live catalog.** Logical source/draft/program links are application conventions or JSON/text, not enforced relationships. Candidate `ep_*` tables are absent.

#### `alrifai_schema_migrations`

Source: `apps/al-rifai/scripts/database.mjs`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | alrifai_schema_migrations_pkey |
| sha256 | text | — | — | none | NO | none | none |
| applied_at | timestamp with time zone | — | — | none | NO | now() | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `datasets`

Source: `apps/al-rifai/db/migrations/0000_gorgeous_the_executioner.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | datasets_pkey |
| importedAt | text | — | — | none | NO | none | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `programs`

Source: `apps/al-rifai/db/migrations/0000_gorgeous_the_executioner.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | programs_pkey |
| motherVessel | text | — | — | none | NO | ''::text | none |
| lighterVessel | text | — | — | none | NO | ''::text | none |
| masterMobile | text | — | — | none | NO | ''::text | none |
| destination | text | — | — | none | NO | ''::text | none |
| escortName | text | — | — | none | NO | ''::text | none |
| escortMobile | text | — | — | none | NO | ''::text | none |
| startDate | text | — | — | none | NO | ''::text | none |
| endDate | text | — | — | none | NO | ''::text | none |
| shift | text | — | — | none | NO | ''::text | none |
| status | text | — | — | none | NO | 'Recorded'::text | none |
| source | text | — | — | none | NO | 'Manual entry'::text | none |
| notes | text | — | — | none | NO | ''::text | none |
| duplicateOf | text | — | — | none | YES | none | none |
| createdAt | text | — | — | none | NO | none | none |
| revision | integer | — | — | none | NO | 0 | none |
| details | text | — | — | none | NO | '{}'::text | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `reviews`

Source: `apps/al-rifai/db/migrations/0000_gorgeous_the_executioner.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | reviews_pkey |
| aId | text | — | — | none | NO | none | none |
| bId | text | — | — | none | NO | none | none |
| decision | text | — | — | none | NO | none | none |
| note | text | — | — | none | NO | ''::text | none |
| createdAt | text | — | — | none | NO | none | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `site_cash_archive`

Source: `apps/al-rifai/db/migrations/0002_flashy_nico_minoru.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | site_cash_archive_pkey |
| date | text | — | — | none | NO | none | none |
| source | text | — | — | none | NO | none | none |
| employeePhone | text | — | — | none | NO | none | none |
| name | text | — | — | none | NO | none | none |
| method | text | — | — | none | NO | none | none |
| amountCents | integer | — | — | none | NO | none | none |
| details | text | — | — | none | NO | none | none |

Relationships: `details` holds CashRow JSON; employeePhone is historical employee-role text, not a personnel FK.

#### `site_operation_notes`

Source: `apps/al-rifai/db/migrations/0003_wide_exodus.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | site_operation_notes_pkey |
| status | text | — | — | none | NO | none | none |
| note | text | — | — | none | NO | none | none |
| actor | text | — | — | none | NO | none | none |
| updatedAt | text | — | — | none | NO | none | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `site_payment_drafts`

Source: `apps/al-rifai/db/migrations/0003_wide_exodus.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | site_payment_drafts_pkey |
| details | text | — | — | none | NO | none | none |
| actor | text | — | — | none | NO | none | none |
| createdAt | text | — | — | none | NO | none | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `site_settlement_drafts`

Source: `apps/al-rifai/db/migrations/0003_wide_exodus.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | site_settlement_drafts_pkey |
| details | text | — | — | none | NO | none | none |
| actor | text | — | — | none | NO | none | none |
| createdAt | text | — | — | none | NO | none | none |

Relationships: No declared FK; references in text/JSON do not establish relational authority.

#### `site_source_snapshots`

Source: `apps/al-rifai/db/migrations/0004_wonderful_warlock.sql`; model `db/schema.ts` except migration ledger. `programs.details` added by migration 0001. Current implementation: historical/read-only application; migration ledger is administrative metadata.

| Column | Live type | PK | FK | Unique/check | Nullable | Live default | Index |
|---|---|---|---|---|---|---|---|
| id | text | yes | — | PK only | NO | none | site_source_snapshots_pkey |
| datasetId | text | — | — | none | NO | none | none |
| kind | text | — | — | none | NO | none | none |
| payload | text | — | — | none | NO | none | none |
| contentHash | text | — | — | none | NO | none | none |

VERIFIED triggers from migration 0005: `alrifai_snapshot_immutable` rejects UPDATE/DELETE; `alrifai_snapshot_no_truncate` rejects TRUNCATE. `datasetId` is not an FK; `contentHash` is not unique.

Relationships: No declared FK; references in text/JSON do not establish relational authority.


### Existing candidate target boundary — exact relevant schema, PROPOSED/unapplied

Source: `apps/al-rifai/db/migration-candidates/0006_employee_program_identity.sql` (corrected SHA256 recorded in qualification summary: `3d98b7cf26d131842aa5e23ece1b786e5bc094c810807e81bf8e8dbb92f7efff`; fresh hash inventory retained). These are reviewed target candidates, **absent live**, not newly proposed duplicate employee/ledger tables. Exact financial-relevant candidate definitions are reproduced for comparison; remaining vessel/program/assignment candidates are outside this financial assessment. No employee-ledger/posting table is introduced by that candidate.

#### `ep_source_occurrences` — PROPOSED, absent production

Source line 4. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_source_occurrences (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 source_file text NOT NULL, file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
 document_pointer text NOT NULL, decoded_pointer text NOT NULL DEFAULT '',
 payload_sha256 text, source_record_id text, record_sha256 text NOT NULL CHECK (record_sha256 ~ '^[a-f0-9]{64}$'),
 mapping_version text NOT NULL, raw_record jsonb NOT NULL CHECK (jsonb_typeof(raw_record)='object'),
 UNIQUE (file_sha256,document_pointer,decoded_pointer),
 CHECK (payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$')
);
```

#### `ep_review_decisions` — PROPOSED, absent production

Source line 13. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_review_decisions (
 id text PRIMARY KEY, occurrence_id text NOT NULL REFERENCES ep_source_occurrences(id),
 event_key text NOT NULL DEFAULT '' CHECK (event_key='' OR event_key ~ '^[a-f0-9]{64}$'),
 role text NOT NULL CHECK (role IN ('employee','employee_history','employee_name','employee_alias','employee_contact','employee_employment','vessel','mother','lighter','vessel_alias','mother_alias','lighter_alias','program','program_vessel','assignment','program_event','release','settlement','payment')),
 decision text NOT NULL CHECK (decision IN ('approved','rejected','manual_review','blocked')),
 approver text NOT NULL CHECK (length(approver)>0), approved_at timestamptz NOT NULL,
 evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
 evidence_basis text NOT NULL CHECK (evidence_basis IN ('independent_authority','owner_verified_escort_field_role','owner_verified_message_role','owner_verified_ledger_mobile','verified_release_document','verified_settlement_decision','verified_payment_receipt')),
 evidence_reference text NOT NULL CHECK (length(evidence_reference)>0),
 assertion jsonb NOT NULL CHECK (jsonb_typeof(assertion)='object'), supersedes text REFERENCES ep_review_decisions(id),
 CHECK (role NOT IN ('program_event','release','settlement','payment') OR COALESCE(assertion ? 'eventType' AND assertion->>'eventType' IN ('client_order','admin_confirmation','duplicate','corrected','cancelled','restarted','escort_replaced','assigned','duty_started','release_evidence','released','program_completed','ghat_review','settlement_approved','payment_completed'), false)),
 UNIQUE (id,decision), UNIQUE (id,decision,evidence_basis), UNIQUE (id,occurrence_id,role,event_key)
);
```

#### `ep_employees` — PROPOSED, absent production

Source line 30. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_employees (
 id text PRIMARY KEY,
 employee_id text NOT NULL UNIQUE CHECK (employee_id ~ '^\+8801[3-9][0-9]{8}$'),
 authoritative_code text UNIQUE,
 identity_basis text NOT NULL CHECK (identity_basis IN ('independent_authority','owner_verified_escort_field_role','owner_verified_ledger_mobile')),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval,identity_basis) REFERENCES ep_review_decisions(id,decision,evidence_basis),
 CHECK (authoritative_code IS NULL OR length(authoritative_code)>0)
);
```

#### `ep_employee_history` — PROPOSED, absent production

Source line 39. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_employee_history (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES ep_employees(employee_id),
 kind text NOT NULL CHECK (kind IN ('name','alias','contact','employment')),
 value text NOT NULL CHECK (length(value)>0), comparison_value text,
 valid_from date, valid_to date,
 verification text NOT NULL CHECK (verification IN ('verified','unverified','disputed')),
 contact_ownership text CHECK (contact_ownership IN ('personal','shared','reassigned','unknown')),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to>valid_from),
 CHECK (kind<>'employment' OR valid_from IS NOT NULL),
 CHECK ((kind='contact')=(contact_ownership IS NOT NULL)),
 CHECK (kind<>'employment' OR value IN ('applicant','confirmed','inactive','former'))
);
```

#### `ep_import_batches` — PROPOSED, absent production

Source line 105. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_import_batches (
 id text PRIMARY KEY, manifest_sha256 text NOT NULL UNIQUE CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
 manifest jsonb NOT NULL, schema_sha256 text NOT NULL CHECK (schema_sha256 ~ '^[a-f0-9]{64}$'),
 mapping_version text NOT NULL, owner_approval_reference text NOT NULL CHECK (length(owner_approval_reference)>0),
 accepted_count integer NOT NULL CHECK (accepted_count>=0), committed_at timestamptz NOT NULL
);
```

#### `ep_source_bindings` — PROPOSED, absent production

Source line 113. PK, FKs, unique/check constraints, nullable/default behavior are exact in this unexecuted DDL:

```sql
CREATE TABLE ep_source_bindings (
 id text PRIMARY KEY, occurrence_id text NOT NULL REFERENCES ep_source_occurrences(id),
 event_key text NOT NULL DEFAULT '' CHECK (event_key='' OR event_key ~ '^[a-f0-9]{64}$'),
 role text NOT NULL, decision_id text NOT NULL,
 approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 batch_id text NOT NULL REFERENCES ep_import_batches(id), target_sha256 text NOT NULL CHECK (target_sha256 ~ '^[a-f0-9]{64}$'),
 employee_id text REFERENCES ep_employees(employee_id), employee_history_id text REFERENCES ep_employee_history(id),
 vessel_id text REFERENCES ep_vessels(id), vessel_alias_id text REFERENCES ep_vessel_aliases(id),
 program_id text REFERENCES ep_programs(program_id), relationship_id text REFERENCES ep_program_vessels(id),
 assignment_id text REFERENCES ep_assignment_events(id),
 UNIQUE(occurrence_id,role,event_key),
 FOREIGN KEY (decision_id,occurrence_id,role,event_key) REFERENCES ep_review_decisions(id,occurrence_id,role,event_key),
 CHECK ((role='employee' AND employee_id IS NOT NULL) OR (role IN ('employee_history','employee_name','employee_alias','employee_contact','employee_employment') AND employee_history_id IS NOT NULL) OR (role IN ('vessel','mother','lighter') AND vessel_id IS NOT NULL) OR (role IN ('vessel_alias','mother_alias','lighter_alias') AND vessel_alias_id IS NOT NULL) OR (role IN ('program','program_event','release','settlement','payment') AND program_id IS NOT NULL) OR (role='program_vessel' AND relationship_id IS NOT NULL) OR (role='assignment' AND assignment_id IS NOT NULL)),
 CHECK (num_nonnulls(employee_id,employee_history_id,vessel_id,vessel_alias_id,program_id,relationship_id,assignment_id)=1)
);
```

PROPOSED candidate indexes: primary-key/UNIQUE B-tree indexes follow the exact constraints above; `ep_employee_alias_once(employee_id,value) WHERE kind IN (name,alias)` and `ep_employee_history_period(employee_id,kind,valid_from)` are explicit. All six tables are included in the candidate append-only UPDATE/DELETE and TRUNCATE trigger loop, using existing `alrifai_reject_snapshot_change`. Other candidate indexes relate to vessel/program/assignment scope. Relationships are the exact FKs above: every identity/history/promotion binding is decision/source scoped; no ledger or monetary authority follows from those relationships.

**PROPOSED schema conclusion:** Reuse qualified `ep_employees`/`ep_employee_history` and occurrence/decision/binding design if separately approved. `site_cash_archive` is intentionally historical and cannot serve a posted ledger: it lacks direction/accounts/currency/state/approval/immutable posting reference/allocations/reversals and source FKs. `site_payment_drafts.details` can support existing archived drafts, but needs a qualified versioned command boundary for active reviews; opaque JSON does not enforce financial state. Target storage for active ledger/allocations must be decided through FPE continuity, preserving current authoritative FPE structures/references; do not create Cash Control's parallel `cash_transactions`/`employee_ledger`.

## 7. RBAC, authentication, identity and source-level compatibility

| Finding | Compatibility issue | Required adaptation |
|---|---|---|
| VERIFIED | Python/FastAPI async ORM + vanilla DOM differs from Next.js App Router/React/Drizzle/pg | Port selected concepts into TypeScript server domain services/client components. No embedded FastAPI production authority or direct SQLAlchemy model copy. Use existing UI primitives and Zod validation. |
| VERIFIED | CC `/api/v1/*` request/response contracts differ from AL `/api/operations`; CC docs' `/intents/*`, `/evidence/inbox`, `/authz/check` are proposed, not implemented real Core adapters | Specify versioned typed JSON envelopes and explicit error codes for denied/invalid/conflict/stale/replayed/unavailable outcomes; preserve existing archival endpoints. Never treat `pending_integration` as accepted/posted. |
| PARTIAL | CC minimum-role hierarchy lets admin/superadmin verify and approve; explicit lists omit superadmin on many reads | Owner must approve capability grants and separation-of-duties/self-approval policy. Check server-side read/draft/verify/approve/post/reverse/export/raw-evidence permissions independently; do not copy rank-based blanket grants. |
| VERIFIED | Current private AL validator is not individual financial actor; original ChatGPT trust headers removed by proxy | Retain current authentication unchanged. Future actor boundary derives trusted user ID, allowed scope and resource access; no role/approver from request body or WhatsApp sender inference. Service delegation must not distribute Core master key. |
| VERIFIED | CC numeric actor/employee FKs vs AL text actors/candidate text IDs and +880 mobile vs national/digits-only source forms | Separate `internalId`, mobile-valued `employee_id`, original sender and payout destination. Explicit source↔target bindings, raw/normalized values and actor provenance; preserve FPE numeric IDs as legacy authority references. |
| PARTIAL | Decimal model storage is better than float arithmetic but API accepts floats, emits floats, parser accepts unchecked precision; Numeric(12,2) rounding/range unvalidated | Use exact string Decimal or bounded integer minor units; reject nonfinite/out-of-range/excess-precision and ambiguous values before posting. Currency/rounding policy supplied by owner; safe integer aggregate checks required. |
| PARTIAL | Plain optional statuses/metadata, mutable JSON, no policy/approval-version binding | Schema validation and atomic expected-version command guards; append-only evidence/audit; superseding extraction/correction rather than overwrite. SQLAlchemy JSON dict in-place edits are not configured MutableDict, so flags/verification metadata persistence is uncertain. |
| PARTIAL | Broad exception→400 string leakage in posting; others only ValueError, generic 500; no stable replay/conflict semantics | Safe error envelope, private logs without credentials/raw source leakage, explicit ambiguous posting outcome/reconciliation; bounded retry retaining same key. |
| MISSING | No qualified route/RBAC/browser/concurrent posting/integration tests in CC repository | Acceptance §14 required; source tests alone cannot establish API security or financial correctness. |

**VERIFIED test/source limitations:** three test modules contain 49 test definitions (16 identity, 20 parser, 13 transaction service), inspected statically; they cover identity/parser/transaction-service concepts. `tests/conftest.py::test_transaction` builds Final/Approved while approval tests assert Pending/PendingReview; `test_approve_transaction_success` references undefined `transaction.id`; raw SQL strings conflict with stricter SQLAlchemy APIs; auth headers fixture returns `{}`. Parser tests expect a no-phone advance result whereas parser explicitly continues when phone absent; classification tests include `Pay…` while keyword set excludes `pay`, and employee claim classification also requires a phone. These demonstrate unqualified fixture/assertion alignment, not a measured runtime test result. CI requests coverage but no verified result/percentage was retrieved; security checks use `|| true`. No tests were run because application/test startup creates databases/tables and dependency installation is prohibited.

## 8. FPE ledger continuity assessment

**VERIFIED authority contract / UNVERIFIED live external state:** Preserve current Fazle-Core FPE authority and clients wherever deployed. FPE canonical source is `fpe_cash_transactions`; `wbom_cash_transactions` is legacy archive. Future AL-RIFA’I target approval changes no current writer, worker, relay flag or client grant.

| Finding | Source-level continuity fact | Compatibility requirement |
|---|---|---|
| VERIFIED | `modules/fazle_payroll_engine/accounting.py::create_transaction/_build_txn_ref`: `fpe-` + 16 SHA hex over source_message_id-or-text, fpe_wa_message_id, employee numeric ID, Decimal amount, period, method, source; existing row returned on replay | Preserve stored refs/IDs exactly. Never rehash history with `cc-` or new mobile/internal IDs. Add explicit namespace/operation/payload conflict contract for future intents without rewriting old keys. |
| PARTIAL | `create_transaction(conn=...)` can join caller transaction; default path separates insert/audit and ledger connection. `_upsert_ledger` atomic ON CONFLICT per employee/month, not complete multi-step command atomicity by itself | Qualify actual call sites and crash/concurrent duplicate outcomes; no blanket FPE exactly-once/atomicity claim. Target must preserve externally observed behavior while closing design gaps only under later approval. |
| VERIFIED | FPE buckets total_earned/total_paid/total_advance; placeholder nonadvance earned=paid; opening from latest earlier period | CC salary_earned−advances formula not equivalent. FPE buckets also do not prove approved payroll entitlement; carry forward actual references/history and obtain accountant reconciliation before new semantics. Backdated propagation remains qualification issue. |
| VERIFIED | FPE reverse creates negative entry with `REV-<original-ref>`, `reversed_txn_id`, original date/period; original financial row retained; financial_operations wrapper checks explicit reference and existing reversal | CC original-status mutation/current-date reversal incompatible. Preserve original/reversal/audit linkage, deletion metadata and pending review links; unchanged replay wrappers may refuse/no-op differently from accounting service. |
| VERIFIED | Frozen relay `modules/payment_relay_accounting/__init__.py::on_relay_send_success/_account_relay_send`: source_message_id `payment-relay-send:<queue_id>:<line_index>`, source_channel `owner-accountant-payment-relay` | Preserve queue IDs/line indexes, canonical booked rows and explicit existing-transaction reconciliation links. Account for already committed sibling lines and retry only unbooked lines. |
| VERIFIED | Relay per-line `conn.transaction()` contains employee resolve/create + transaction + audit + activation + ledger. Echo suppression uses exact stanza equality against `relay_inbound_message_ref` or `relay_send_stanza_id`; body hash is forensic only | Future wa-01 draft cannot independently book the same relay event. Queue/body/employee/amount/date similarity alone cannot suppress or merge genuine payments. Carry exact lineage, review unknown correlation. |
| VERIFIED | Existing metadata `relay_reconciled_queue_id` links owner-established prior transaction; `link_existing_transaction_to_relay_queue` alters provenance only | Preserve explicit link and original money/audit; never infer historical link from amount/body/time. No linking action executed here. |
| VERIFIED | Source's frozen 30 August relay policy equates authorized relay send success with payment completion and activation; current task says received message is not completion | Preserve the existing special trigger unchanged. Future inbound evidence uses independent completion proof and cannot broaden this frozen exception. Obtain explicit transition disposition before combining semantics; no rule overwrite or relay deactivation. |
| PARTIAL | FPE `reconcile.py` compares parser amount to nonreversal cash + eligible pending review; source filter applies to parser/review but not ledger; ledger query lacks FINAL/deleted filters | Treat as source-specific diagnostic, not cash account balance or complete cutover reconciliation. Reconcile same scope/currency/status/reversal/direction/period, including missing/ambiguous history. |

**VERIFIED source financial clients:** `modules/fazle_payroll_engine/routes.py` exposes `/api/fpe/transactions`, `/transactions/manual`, `/transactions/{txn_id}/reverse`, `/employees/search`, `/employees/{emp_id}/transactions`, `/ledger/{emp_id}`, unmatched/admin review operations under `X-Internal-Key` and role checks; `financial_operations.py` wraps explicit `cash_approve/cash_reject/cash_reverse/cash_details`; `payment_ingest/fpe_bridge.py` and `wbom_fpe_sync.py` delegate canonical creation; frozen outbound relay hook and reconcile worker depend on FPE lineage. README describes `/payroll` UI. These are source clients, **not a verified inventory of live callers, endpoint traffic or deployed versions**. A live approval/cutover must establish every deployed worker, UI, bot, importer and API consumer from authorized owner-provided evidence.

**PROPOSED controlled cutover prerequisites:** owner-attested deployed FPE source/schema/roles/flags/writer and client inventory; complete reference/employee/account/state mapping; signed accountant opening and balance reconciliation; pending/reversal/advance-allocation inventory; exact relay/booked/echo lineage; compatibility acceptance; separate implementation, migration and deployment approval. Fence current writer under a specifically authorized cutover before target writes; never dual-post. Pending/ambiguous commands retain original keys and authority result queries. No fence, cutover or service control performed.

**PROPOSED rollback/reconciliation requirements:** define authority per cutover epoch and watermark; record unresolved commands, in-flight relay lines, posted IDs/refs and approval versions. Rollback cannot replay target-committed money into FPE blindly or delete postings. Reconcile posted deltas and counterpart mappings, prove single-writer handback, preserve append-only corrections/reversals and reader compatibility. Recovery execution remains under existing owner gates; no new backup infrastructure/key/restart policy proposed or created.

## 9. Financial message / wa-01 readiness

**PROPOSED future path only:** wa-01 → designated authorized Admin/Accountant direct conversation → durable Raw Evidence → versioned Extraction → Employee Identity Verification → Cash Draft → Accountant Verification → Authorized Approval → Single Ledger Posting. Payment completion is independently evidenced; posting/approval/message receipt are distinct facts.

| Finding | Cash Control gap | Safe future requirement |
|---|---|---|
| MISSING | Inbox accepts arbitrary source_channel/account/sender strings, timestamps ingestion with utcnow, sender_role hardcoded unknown | Verify wa-01 account/provider/exact chat/sender/effective role binding before financial extraction/draft eligibility. Group chats and unrelated contacts create zero cash drafts/postings; general evidence retention, if approved, remains separate from financial eligibility. |
| MISSING | No transport stanza/chat key/received-vs-original time/hash/version/unique occurrence constraint | Immutable raw occurrence with account+provider+chat+stanza identity; original sender and source timestamp retained; conflicting same-ID payload quarantined. Do not use body hash to collapse genuine resends. |
| POLICY CONFLICT / VERIFIED | Parser returns one ambiguous phone; inbox resolves by payout/primary/name; threshold creates draft | Extract explicit role fields/block spans and parser version; sender, employee ID and payout stay separate. Review unknown/multiple role values; confidence cannot promote identity/approval. |
| PARTIAL | Generic MFS regexes preserve raw_text and trxid; hardcoded confidence and default Cash; no proof of correct financial direction/completion | Consider method-specific parser fixtures only if they improve bounded evidence extraction over local parser. Unknown method remains unknown; transfer reference needs independent verification. Receipt text is evidence, not payment completion. |
| MISSING | Reprocess has no once-only draft linkage guard; adapters mock; no account/pagination/budget-aware real connector | Stage idempotency and occurrence/block/action keys; bounded read contract compatible with current MAX4 and one outstanding request/client. No consumer registered or traffic sent in this task. |
| VERIFIED | No direct WhatsApp SQLite write implementation or live listener in fetched CC tree | Retain that separation; future adapter reads authorized bridge results, never opens/writes native SQLite or owns WhatsApp ingestion. Bridge owns native stores; AL-RIFA’I owns future application evidence. |
| MISSING | No qualified actor delegation, authorized approval chain or financially safe parser-to-post adapter | No autonomous WhatsApp replies, financial approvals or retries of ambiguous posting. Human-approved command invokes exactly one authority; service/AI can prepare sourced drafts only within granted scope. |

**UNVERIFIED readiness:** no live wa-01 financial conversation binding/transport evidence has been supplied. Historical finance-only export attestation does not establish current chat identity or native stanza mapping. Existing application integration configuration stays empty; WhatsApp grants, native stores, bridge owners and denied outbound/history operations remain unchanged. Readiness for activation is **not established**.

## 10. Selective reuse decision matrix and implementation complexity

Every decision is **PROPOSED**, with source implementation status in Evidence. ADOPT would mean demonstrably compatible logic without behavioral redesign; **no production component qualifies for unmodified ADOPT at present**. Complexity is relative: L=one bounded read/UI concern; M=several contracts/UI/validation changes; H=identity/financial/concurrency/continuity work. No estimates imply authorization or elapsed-time commitment.

| Component / original source and symbol | Decision / evidence | Required AL target module/boundary | Dependencies / adaptation / owner compatibility | Risk / complexity | Acceptance |
|---|---|---|---|---|---|
| `frontend/js/app.js::displayVerificationList/loadPendingVerification`; module D `get_pending_verification/get_employee_financial_history` | ADAPT; PARTIAL | Existing accounts panel + proposed accountant review service | React/UI primitives, trusted actors, exact-money DTOs; evidence/payout/employee context and separate Verified state; remove raw innerHTML and FINAL mutation | High / M | T1,T2,T4,T9,T11 |
| `module_e_admin.py::get_pending_approval/reject_transaction`; API client admin methods | ADAPT; PARTIAL | Proposed finance approval command/review UI | Verified candidate/version, authorized actor, reason and immutable predecessor; no inherited blanket hierarchy/self-approval | High / H | T1,T4,T6,T9 |
| `module_c_cash.py::get_transactions/export_transactions_csv`, frontend displayTransactions | RETAIN AL-RIFAI; VERIFIED local feature overlap | `lib/cash-data.ts`, accounts panel, `/api/operations` | Existing source separation, CSV sanitization, employee/payout display; add only approved posted-status/account/category filters | Medium / L–M | T2,T8,T11 |
| `IdentityService.normalize_phone/resolve_employee_identity`; module B creation/lookup | REJECT matching behavior; VERIFIED conflict | Existing employee-mobile-v3 helper + candidate identity boundary | No payout/name inference, no duplicate primary/ID phone; normalized +880 and source-role/effective bindings | Critical / H | T2,T3 |
| `EmployeeAlias`; module B `add_employee_alias` | RETAIN AL-RIFAI candidate; VERIFIED conflict | Candidate `ep_employee_history` + source bindings | Employee-scoped original names and provenance; not global alias uniqueness or payout-phone identity | High / M | T2,T3,T9 |
| `MessageParser.parse_payment_message/detect_payment_method/extract_amount`, parser tests | DEFER selective ADAPT; PARTIAL | Proposed pure extraction helper beside existing historical parser | Proven improvement required on approved synthetic fixtures; typed roles, unknown method, exact cents, multiple blocks, preserve raw/version; no auto draft/approval | High / M | T2,T3,T5,T10 |
| Module A `ingest_message/process_message`; `MessageEvidenceAdapter` | ADAPT interface concept only; MISSING transport guarantees | AL application evidence→extraction→review boundary | Account/chat/stanza/effective actor evidence; immutable occurrence, replay keys; no bridge-native SQL | Critical / H | T3,T5,T6,T10 |
| `TransactionPostingAdapter`, `EmployeeLedgerAdapter`, `AuthorizationAdapter`, `AdapterFactory` | ADAPT contract separation; PARTIAL/mock | Proposed AL financial command/query/actor contracts | Versioned typed commands, exact verified FPE API adapter, current authority vs target epoch; no placeholder success | Critical / H | T1,T6,T7,T12 |
| `TransactionService.generate_txn_ref/create_transaction` | REJECT current key algorithm; retain reference concept | Existing FPE lineage / proposed target idempotency boundary | Existing refs unchanged; operation+payload+source block/account keys, conflict/replay result; atomic posting/audit | Critical / H | T5,T6,T7 |
| `TransactionService.approve_transaction`, module D `verify_transaction` | REJECT existing transition logic | Proposed guarded financial workflow | Verification ≠ approval ≠ posting; approval bound to immutable candidate; trusted single writer | Critical / H | T1,T4,T6 |
| `TransactionService.reverse_transaction` | ADAPT negative linked-entry concept only; PARTIAL | Current FPE reversal boundary / future compatible command | Retain original FPE date/period/refs/reversed_txn_id; reviewed reason/authority, no original financial rewrite; effective-date policy | Critical / H | T6,T7,T8,T9 |
| `TransactionService._update_employee_ledger`; module F statement/admin cash-balance/module G reconciliation formulas | REJECT formulas; VERIFIED contradictions | Retain source statement; proposed authoritative finance query | FPE-qualified bucket/account/direction semantics and allocation rules; no new aggregate authority | Critical / H | T7,T8 |
| `module_d_accountant.py::get_duplicate_candidates/flag_duplicate` | ADAPT review concept, retain local historical review | Proposed duplicate review query/action | Exact cents, explicit occurrence/version/provenance and genuine repeated payment distinction; no silent suppression/auto rejection | High / M | T5,T9 |
| `AuditLog`, module E `get_audit_log`, module G `get_audit_trail_report` | ADAPT audit concept; PARTIAL | Proposed append-only command audit/query | Verified actor/evidence/policy/version/FPE result; no sensitive cross-scope reads; immutable controls | High / H | T1,T6,T9 |
| `User/AuthService`, JWT/localStorage/default secret/API-key placeholder | RETAIN AL-RIFAI current auth; REJECT unreviewed replacement | Existing proxy/auth; proposed capability adapter | Owner chooses production audience/auth; no credentials created, no CC auth store installed | Critical / H | T1,T11 |
| Standalone app/database/init_db/config/seed and IntegrationConfig | REJECT production deployment/schema duplication | Existing Next.js/PG/infrastructure | No second ledger/server/startup DDL/demo personnel; preserve disabled integrations and approved policies | Critical / H | T12 |
| Mobile card/responsive presentation in `frontend/style.css`, source/audit drilldown concepts | ADAPT only demonstrated usability improvement; PARTIAL | Existing accounts UI | React escaping, bilingual labels, keyboard/touch/focus, 360px responsive review layout; existing functionality preferred | Medium / M | T11 |

## 11. Proposed target module boundaries

**PROPOSED logical boundaries, not existing endpoints/new files:**

1. **Historical financial query** — retain `lib/cash-data.ts`, `cash-source.ts`, `accounts-snapshot.ts`, `app/accounts-panel.tsx` and existing read-only `/api/operations`. Preserve source labels and original historical values.
2. **Employee identity query/command** — approved employee-mobile-v3 helper and accepted candidate identity/history/source bindings; source-role mobile lookup only. One authoritative employee boundary; numeric FPE IDs remain explicit cross-system references.
3. **Application evidence and extraction** — one AL-RIFA’I evidence owner, immutable occurrence/hash and versioned extraction. Bridge transport stays external. Candidate `ep_source_occurrences` is historical-import design, not sufficient live wa-01 envelope without adapter qualification.
4. **Financial draft and accountant review** — exact money, account/direction/currency, employee/payout/evidence and version; guarded Draft→Verified, rejected/corrected predecessor history. Existing draft storage reuse subject to reviewed schema design.
5. **Authorized financial approval** — trusted actor capabilities and candidate/evidence version, explicit owner separation rules; no sender/AI auto-approval.
6. **Single financial posting command** — current FPE retained; future AL target command only after qualified authority transition. Atomic idempotency/state/audit/allocations, authoritative result/ref and ambiguous-outcome query; no independent Cash Control writer.
7. **Ledger/reconciliation/audit query** — derived single-authority posting data with as-of/completeness/source scope; historical instructions displayed separately. Export/raw evidence access require separate capabilities.

**PROPOSED future command envelope:** operation ID, action, current authority/epoch, authenticated actor/scope, candidate ID/version/hash, expected state/version, policy version, occurrence/block IDs, mobile-valued employee ID plus mapped internal/FPE ID, independent payout destination, account/direction/currency, exact amount, effective date, evidence references and explicit approval/completion facts. Return existing or committed authoritative result/ID/ref/status/version, replay indicator, conflict or ambiguous outcome. These fields are design, not claims that endpoints/tables currently exist.

## 12. Risks, blockers and unresolved decisions

| Finding/risk | Blocker / consequence |
|---|---|
| VERIFIED / critical | Accountant verify bypasses approval; two independent approval paths produce inconsistent ledger effects. Cannot copy workflow. |
| VERIFIED / critical | Payout/name employee matching and global aliases violate approved identity rules. Cannot reuse resolver without replacement semantics. |
| VERIFIED / critical | CC monthly aggregate uniqueness/concurrency and contradictory reports cannot establish balances. New writer would risk double posting with FPE relay/worker. |
| UNVERIFIED / critical | Live external FPE schema/writers/clients/flags and current data reconciliation unavailable; prevents production continuity acceptance. |
| PARTIAL / high | Historical export identity attestation lacks native transport IDs and current wa-01 conversation binding; not payment proof. |
| VERIFIED / high | CC scalar request contracts, session dependency, missing imports, ambiguous ORM relationships and dependency/test mismatch; README completeness/high coverage unsubstantiated. |
| VERIFIED / high | Raw innerHTML/localStorage and incomplete auth UI/audit controls; no unmodified frontend/auth adoption. |
| MISSING / high | Approved active finance account/currency/direction/opening/recovery allocation/backdating/negative-balance policy and per-actor grants still required. No monetary thresholds or rates invented. |
| PARTIAL / high | Candidate identity source binding/reader integration and original receipt/release evidence unresolved. Historical amounts cannot be opening balance. |
| UNVERIFIED / medium | Runtime Cash Control API/browser/mobile/test coverage and proprietary reuse rights acceptance. README proprietary notice requires owner-confirmed reuse scope before code adoption. |

## 13. Suggested implementation sequence

**PROPOSED; each stage requires its own explicit authorization, this report authorizes none.** Review owner gates and current-FPE evidence first. Then finalize typed finance/actor/identity/state contracts and schema choices reusing candidate identity and existing historical UI. Implement a bounded isolated accountant draft/review slice with synthetic evidence, no financial writer or wa-01 consumer. Qualify identity, source eligibility, separate verification/approval, money/state/replay/audit tests. Implement a qualified current-authority FPE adapter only after actual contract evidence, with posting isolated for tests. Qualify complete ledger/reversal/allocation/reconciliation/rollback and existing clients. Request distinct migration/deployment/cutover authorization with one-writer plan and acceptance evidence. Live wa-01 financial evidence activation is a separately approved final integration scope; no independent Cash Control deployment in this sequence.

## 14. Acceptance criteria and test plan

**PROPOSED future acceptance, not tests run here.** Run writes only in an explicitly approved isolated target; never production fixtures, application startup DDL or native WhatsApp stores. Do not repeat previously completed SQL qualification without a relevant change/failure. Criteria:

| ID | Required acceptance |
|---|---|
| T1 — actors/RBAC | Viewer/operator/accountant/admin/owner-approved grants tested server-side for every read/draft/verify/approve/post/reverse/export/raw-evidence action; inactive/expired/forged actors denied; self-approval and delegated service scope follow approved rule. No body role override. |
| T2 — identity | Bengali/ASCII approved BD forms normalize to one +880 employee mobile; same mobile/different names retains source aliases; same name/different mobile separate; missing/multiple/invalid/reassigned/international remain review; technical ID and payout/original sender separate. |
| T3 — source eligibility | Exact approved wa-01 direct conversation/account/sender/effective period only; groups/unrelated/forged role/forwarded author claims yield zero financial draft/postings. Historical attestation cannot expand scope. Unresolved LID has no inferred phone/authority. |
| T4 — lifecycle | Draft→Verified→Approved→Posted guarded and distinct; no ledger effects before posting. Verification cannot approve; approved instruction is not completion. Rejection/correction revokes stale approvals and preserves predecessor/evidence. |
| T5 — duplicates/replay | Same occurrence/block/action yields one draft/result; identical retry one posting; changed payload under same operation key conflicts; distinct genuine equal payments survive; multi-block messages stay separate; exact relay stanza/queue lineage prevents dual booking. |
| T6 — atomicity/concurrency | Concurrent same-key calls, approvals/reversal races, aggregate updates, state/version conflicts and injected failure at every stage yield one authoritative result or full rollback; no orphan employee/audit/ledger/allocation. Crash after commit/timeout recovered by same-key result query. |
| T7 — FPE/client continuity | Preserve every existing stored FPE ref/ID/source/employee/reversal/deletion/audit link; accepted client routes and trusted actor attribution remain compatible; queue line replay and later echo do not repost. Current writer unchanged until authorized fence/cutover. |
| T8 — money/reconciliation | Exact precision/range/currency, receipt/payment direction and account separation; accountant-approved opening; advances/recoveries allocated once with no over-consumption; salary/advance/reversal example reconciles across statement/account/period; include both original/reversal effect and backdating policy. No historical instruction totals as balance. |
| T9 — audit/provenance | Append-only actor/reason/source hash/policy/candidate version/state/posted result; attempted overwrite/delete denied; original names/raw messages retained; corrected extraction appended; exports scoped/redacted and formula injection safely handled. |
| T10 — extraction | Approved representative synthetic fixtures for ID/payout roles, method/ref, Bengali digits, multi-line/multi-block and ambiguity; unknown method stays unknown; precision preserved; extraction failure retains evidence; parser never grants completion/approval. |
| T11 — API/UI/mobile | Typed JSON backend/frontend round trips incl. required notes, 401/403/400/409/503/error/replay/stale states; no source XSS; no token exposure; 360/768/desktop keyboard/touch/focus and bilingual context; filters/CSV same intended scope; UI cannot activate unauthorized action. |
| T12 — production protection/cutover | Source/schema/config/runtime before-after evidence, existing reader acceptance, independently reviewed single-writer fence/rollback/delta reconciliation, current clients and frozen relay preserved. Deployment/restart/migration/wa activation separate explicit approvals; no autonomous replies. |

**VERIFIED assessment-only validation:** static source/schema comparison, complete pinned CC tree and 130 column extraction, live nine-table/54-column catalog, mandatory owner/contract documents and existing reports, documentation link/inventory checks and before/after non-interference checks. **UNVERIFIED:** actual proposed implementation acceptance, Cash Control runtime tests/coverage, fresh wa connectivity and external FPE operational state.

## 15. Owner approval gates

**PROPOSED review decisions, no implicit execution authorization:**

1. Review component decisions in §10 and confirm bounded reuse scope/proprietary source permission. Architecture and employee-mobile-v3 are already approved and are not requested again.
2. Resolve D01/D02 production actor authentication/audience/delegation, action capabilities and self-approval/separation policy.
3. Resolve D08/D11 finance scope: account/currency/direction/opening evidence, recovery/allocation/backdating/reversal period/negative balance/rounding and payment completion proof. No payroll default imported from either app.
4. Supply or authorize read-only external FPE deployed evidence and accountant reconciliation, including all writers/clients/flags/relay references/audit/reversals. Approve continuity contract before implementation/cutover planning can be accepted.
5. Resolve exact future wa-01 authorized direct conversation/account/sender/effective role binding and raw evidence access/retention; historical export scope remains unchanged.
6. Separately approve any isolated code/test/schema scope, then migration/deployment/authority transition and live integration. Target approval alone authorizes none of these.

**Exactly ONE independently recommended best next task — PROPOSED:** Prepare a documentation-only owner review package for the bounded accountant draft/verification slice, resolving actor grants and verification-versus-approval semantics and listing required current-FPE continuity evidence. It must select a reviewable scope from this report without code, migrations, production writes or wa-01 processing. This recommendation does not authorize that task or implementation.

## Source references and audit closure

Cash Control file inventory below provides pinned path/blob identities for every fetched file. Symbols in sections 3–10 refer to those files. FPE reference list identifies the exact inspected sources; local file hashes identify working-tree evidence independently of export provenance.

### Cash Control pinned source inventory

| Finding | Path | Git blob SHA | Bytes |
|---|---|---|---|
| VERIFIED | [.env.example](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/.env.example) | `d2d5f1ff79a345b8de3e0d3efb4e3f9467b6b51a` | 914 |
| VERIFIED | [.github/workflows/ci.yml](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/.github/workflows/ci.yml) | `2c656342297f7f2eba32dd32eaf185a5bdb7254d` | 2268 |
| VERIFIED | [.gitignore](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/.gitignore) | `2de76156284ea6f5b522eb472cfc947b2ee93561` | 941 |
| VERIFIED | [README.md](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/README.md) | `1314cdb5d1da295866eeada1768573274da24c00` | 10164 |
| VERIFIED | [app/__init__.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/__init__.py) | `12ea2578ac5951bb503215e3001c3178c9611a5b` | 544 |
| VERIFIED | [app/adapters.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/adapters.py) | `6120f64d640a186a8f907cb6a2d88e035429a2f7` | 13047 |
| VERIFIED | [app/auth.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/auth.py) | `05b4a22b52ba1c2a9d3a6cae4b16b4bc9bbf8df4` | 7880 |
| VERIFIED | [app/config.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/config.py) | `20c888b0015aeeef39e4831875417cbb75c4ce50` | 2784 |
| VERIFIED | [app/database.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/database.py) | `506cf1ae4da064b304e42949373b66a31e644bfa` | 2657 |
| VERIFIED | [app/main.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/main.py) | `8271863f12d70a7bb7bd6c84759c9f7f68c55849` | 3810 |
| VERIFIED | [app/models.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/models.py) | `8fde0ba277159f4de42776467912c71d1347a728` | 15395 |
| VERIFIED | [app/routes/__init__.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/__init__.py) | `8d615587e33b2a5ea536c37b7c14f91716b70f63` | 445 |
| VERIFIED | [app/routes/module_a_inbox.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_a_inbox.py) | `9f276a4ffde5de397392edb6e16770bfe21f20ed` | 8053 |
| VERIFIED | [app/routes/module_b_identity.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_b_identity.py) | `0ec0ac430d6066e8f43467f4d95cd038ff30fc2c` | 9504 |
| VERIFIED | [app/routes/module_c_cash.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_c_cash.py) | `00319ae4e9ad382f7d2d79a6450cdc31e992e9d2` | 12877 |
| VERIFIED | [app/routes/module_d_accountant.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_d_accountant.py) | `a3726d9b0d1da365ddf821b46a88442340e1475d` | 12111 |
| VERIFIED | [app/routes/module_e_admin.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_e_admin.py) | `43c31a424fab9bbac8b721f6d704f8c5d8450204` | 11733 |
| VERIFIED | [app/routes/module_f_ledger.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_f_ledger.py) | `f945d3a0a46ef8474efa70fdbca5df515e57a63d` | 10388 |
| VERIFIED | [app/routes/module_g_reports.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_g_reports.py) | `5e76b0f1570ed911dd0d2a0c7f10499fe9eae8d7` | 15120 |
| VERIFIED | [app/routes/module_z_posting.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/routes/module_z_posting.py) | `89fa3d8bf016855fd7f65b0bb3e87d79ddc3adcc` | 6706 |
| VERIFIED | [app/services.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/app/services.py) | `958826fa5016ab3ba550be1bfa634666d7eccaca` | 22749 |
| VERIFIED | [docs/ARCHITECTURE.md](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/docs/ARCHITECTURE.md) | `b78a5e0471eac7b895a09d4b55e46efd5b728d22` | 11695 |
| VERIFIED | [docs/INTEGRATION_CONTRACTS.md](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/docs/INTEGRATION_CONTRACTS.md) | `ff16b9043b59ae3e22fb5d37b84dfcfbb5b320fe` | 8052 |
| VERIFIED | [frontend/index.html](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/frontend/index.html) | `e24ad3418019772c5f71836bbaafdd2c6e7bf4b9` | 16370 |
| VERIFIED | [frontend/js/api.js](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/frontend/js/api.js) | `e12424c0030f5108c67add3c93618086a9adbd05` | 9339 |
| VERIFIED | [frontend/js/app.js](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/frontend/js/app.js) | `fd632162f27ddc106d9002fbabee082f7a68b04d` | 29522 |
| VERIFIED | [frontend/style.css](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/frontend/style.css) | `702f0ac6d5e76849d491c88b843738d45a72855e` | 9407 |
| VERIFIED | [requirements-minimal.txt](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/requirements-minimal.txt) | `abf94241ffe22ba12b6e000b2dbf342c31a07ef6` | 526 |
| VERIFIED | [requirements.txt](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/requirements.txt) | `8f04b3ab8f56ad7506d542e0e2198dad30a93236` | 501 |
| VERIFIED | [scripts/dev_server.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/scripts/dev_server.py) | `9f3dad130becbb3773d65c68842ca1543f205a57` | 1200 |
| VERIFIED | [scripts/run_tests.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/scripts/run_tests.py) | `97aa80ae68e6e59d3063cfc10fd49690ebc76f40` | 3045 |
| VERIFIED | [scripts/seed_data.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/scripts/seed_data.py) | `16ef4d7d7f6cadfb64bbac5a70e246c2c3201ddd` | 12832 |
| VERIFIED | [scripts/setup_db.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/scripts/setup_db.py) | `bf610974fd798bee06555f067d2f9b18b9433c88` | 1162 |
| VERIFIED | [tests/conftest.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/tests/conftest.py) | `1de40e48410b9157acd6f989829535bd4725723f` | 4321 |
| VERIFIED | [tests/test_identity_service.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/tests/test_identity_service.py) | `6d0e913351f15584b86605eb0512555be31e6c58` | 8050 |
| VERIFIED | [tests/test_message_parser.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/tests/test_message_parser.py) | `58908e24a5b8f78c2c1e3fa5c7c54e3ecec0f988` | 8872 |
| VERIFIED | [tests/test_transaction_service.py](https://github.com/arshiyaazim/cash-control/blob/fa1c81979c74835277e42a912150002bdf583434/tests/test_transaction_service.py) | `c930232e792f12994dee7cf3b936a85b0ac38fbc` | 13402 |


### Fazle-Core pinned inspected source inventory

All links use commit `1838619b644dc83f4ca723d3442d94435e6050f1`; VERIFIED source inspection, UNVERIFIED deployment.

- [README.md](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/README.md).
- [db/migrations/023_c0d_001_fpe_soft_delete_columns.sql](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/db/migrations/023_c0d_001_fpe_soft_delete_columns.sql).
- [db/migrations/023_c0d_003_fpe_missing_indexes.sql](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/db/migrations/023_c0d_003_fpe_missing_indexes.sql).
- [db/migrations/063_ai_read_cash_transactions.sql](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/db/migrations/063_ai_read_cash_transactions.sql).
- [modules/fazle_payroll_engine/accounting.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/accounting.py).
- [modules/fazle_payroll_engine/migrations/001_fpe_schema.sql](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/migrations/001_fpe_schema.sql).
- [modules/fazle_payroll_engine/migrations/010_fpe_cash_transactions_canonical.sql](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/migrations/010_fpe_cash_transactions_canonical.sql).
- [modules/fazle_payroll_engine/models.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/models.py).
- [modules/fazle_payroll_engine/payment_event.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/payment_event.py).
- [modules/fazle_payroll_engine/reconcile.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/reconcile.py).
- [modules/fazle_payroll_engine/replay.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/replay.py).
- [modules/fazle_payroll_engine/routes.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/fazle_payroll_engine/routes.py).
- [modules/financial_operations.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/financial_operations.py).
- [modules/payment_ingest/fpe_bridge.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/payment_ingest/fpe_bridge.py).
- [modules/payment_ingest/wbom_fpe_sync.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/payment_ingest/wbom_fpe_sync.py).
- [modules/payment_relay/__init__.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/payment_relay/__init__.py).
- [modules/payment_relay_accounting/__init__.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/modules/payment_relay_accounting/__init__.py).
- [tests/unit/test_payment_relay_accounting.py](https://github.com/arshiyaazim/fazle-core/blob/1838619b644dc83f4ca723d3442d94435e6050f1/tests/unit/test_payment_relay_accounting.py).

### Local evidence file identity (START SHA256)

VERIFIED working-file hashes; paths relative to `/opt/vps`. The original export commit does not describe all local changes.

| Path | SHA256 |
|---|---|
| [README.md](/opt/vps/README.md) | `195c89576c794b0930694de4f70b7efe245895ea37ac3952ecf9f98e35609cc7` |
| [NEXT-SESSION-HANDOFF.md](/opt/vps/NEXT-SESSION-HANDOFF.md) | `b0c22662ba505e86b9bf6824f122d445d53738fa33cba2cf5faaada0947a63b8` |
| [docs/VPS_MAP.md](/opt/vps/docs/VPS_MAP.md) | `b304799dc784c2dbf08f6b13e3706ae040f4225550253a8b64aff7060db56496` |
| [services/whatsapp/qualification/application-contract-20261011/specification.md](/opt/vps/services/whatsapp/qualification/application-contract-20261011/specification.md) | `a4fca24afa506f1ea4b52a1577fe076748c14c009434f5b90f67afc58d8633f5` |
| [apps/al-rifai/SOURCE-MANIFEST.json](/opt/vps/apps/al-rifai/SOURCE-MANIFEST.json) | `1ee70b73d337bac0c2043227dd8a6170d732b2402e916ac90e2e256df2371233` |
| [apps/al-rifai/package.json](/opt/vps/apps/al-rifai/package.json) | `213877e7afb19dad8b38b78158d11fcc104872e4ec0b104c6260710fe7b92ed6` |
| [apps/al-rifai/proxy.ts](/opt/vps/apps/al-rifai/proxy.ts) | `f3b463cd146b963229ef1ba26d2979182493064bac06203a0735694fb01eb431` |
| [apps/al-rifai/lib/validation-auth.mjs](/opt/vps/apps/al-rifai/lib/validation-auth.mjs) | `28bb9494c47f9ca4e49f90ded32e75c321ee15f08eeec8c2a8d264082fa0de4c` |
| [apps/al-rifai/lib/integrations.ts](/opt/vps/apps/al-rifai/lib/integrations.ts) | `2dbead2575e9b7bac1775c0a9ba36ab053f2ca734da6eb50143467747f5a61bc` |
| [apps/al-rifai/lib/cash-data.ts](/opt/vps/apps/al-rifai/lib/cash-data.ts) | `81603379a3970158037dd40b8b455e03acb9bb7fbf51dd52b78fce3890123c7a` |
| [apps/al-rifai/lib/cash-source.ts](/opt/vps/apps/al-rifai/lib/cash-source.ts) | `5346f34f8e6c310a22bf68334530235de62b01fd6074b7dcfc883e21103e2776` |
| [apps/al-rifai/lib/accounts-snapshot.ts](/opt/vps/apps/al-rifai/lib/accounts-snapshot.ts) | `4c2a2b9db298b75601396e4bd4757069d43f36250ffe6cdb12a61cb9efd4b8d1` |
| [apps/al-rifai/lib/operations.ts](/opt/vps/apps/al-rifai/lib/operations.ts) | `5ee3c91b7b4f6c7f04387250a704901521bb93c796a303a6a3ceeaea9bbfb3b8` |
| [apps/al-rifai/lib/employee-program-validation.mjs](/opt/vps/apps/al-rifai/lib/employee-program-validation.mjs) | `dd5c3a3ddd0bab96a1a14dc315b5bedb5ba86db019d1591158bc6249b67b78ce` |
| [apps/al-rifai/lib/vessel-data.ts](/opt/vps/apps/al-rifai/lib/vessel-data.ts) | `da1fa75cb181ea972f9fa23979ee3a43dfa3d0521c654a89759ef786a2fc52b7` |
| [apps/al-rifai/app/accounts-panel.tsx](/opt/vps/apps/al-rifai/app/accounts-panel.tsx) | `4597c485e179ff2f6c8c44e01cc81a6f69859f7b831dde18c0b74108b466eda7` |
| [apps/al-rifai/app/api/operations/route.ts](/opt/vps/apps/al-rifai/app/api/operations/route.ts) | `923a29f8049f54a55f1551d1e3e19f33181d2028449fc4babed95290a337b60b` |
| [apps/al-rifai/db/schema.ts](/opt/vps/apps/al-rifai/db/schema.ts) | `5316c49032a5d12db686ddaa3fad31cd3eaf578c75cdb94140cab7669afb016d` |
| [apps/al-rifai/db/postgres.mjs](/opt/vps/apps/al-rifai/db/postgres.mjs) | `cf7aff9a56a898e29838c7f96b9fe9939a02b9ddfa35b40014974323bd697e40` |
| [apps/al-rifai/db/migration-candidates/0006_employee_program_identity.sql](/opt/vps/apps/al-rifai/db/migration-candidates/0006_employee_program_identity.sql) | `3d98b7cf26d131842aa5e23ece1b786e5bc094c810807e81bf8e8dbb92f7efff` |
| [apps/al-rifai/docs/OWNER_BUSINESS_POLICY.md](/opt/vps/apps/al-rifai/docs/OWNER_BUSINESS_POLICY.md) | `e0bdc96e44843c2b71ee19c986fe1e86d37fb977a7dff6acdd8aaff571b3b29d` |
| [apps/al-rifai/docs/owner-business-rules.json](/opt/vps/apps/al-rifai/docs/owner-business-rules.json) | `adc9fe19d22f16a16749f0c03b9c160d28c3dcabc0e1904f01b291cff4a5d1f4` |
| [apps/al-rifai/docs/PHASE2A_DECISIONS_REQUIRED.md](/opt/vps/apps/al-rifai/docs/PHASE2A_DECISIONS_REQUIRED.md) | `6cc88b58bebdc508de5fa82961f9ebc6e0771a589657c82cc270ca1987a0ad58` |
| [apps/al-rifai/docs/EMPLOYEE_PROGRAM_QUALIFICATION_SUMMARY.md](/opt/vps/apps/al-rifai/docs/EMPLOYEE_PROGRAM_QUALIFICATION_SUMMARY.md) | `8287b99d6ab3848b915affd54f17dc915e5da7f9fa1f566f5ff20e2711f484f6` |


## END AUDIT — documentation assessment completed; production non-interference VERIFIED

END checks at 2026-10-11 08:13:51 Asia/Dhaka (2026-10-11 02:13:51 UTC). Workspace START hash frame: 2026-10-11 02:04:14 UTC / 08:04:14 Asia/Dhaka, 2,955 files excluding Git/caches/build/dependencies. Before handoff write, no baseline file differed and exactly the assessment report was added. Final workspace comparison after the authorized handoff update must contain exactly these documentation changes:

- Added `apps/al-rifai/docs/CASH_CONTROL_SELECTIVE_REUSE_COMPATIBILITY_ASSESSMENT.md` (this consolidated report).
- Updated existing `NEXT-SESSION-HANDOFF.md` with assessment findings/gates and one next task; historical operational evidence retained.

VERIFIED final operational checks: all four running container full IDs/images/start times/restart counters/state match the START sanitized frame; both application/PostgreSQL health reports healthy; six retained containers remain stopped and wa-03 inactive. All 11 protected configuration hashes unchanged. Live public schema JSON byte-equivalent after parsing: nine tables, 54 columns, nine PK constraints, nine PK indexes, two snapshot protection triggers; no candidate/new tables. Existing policies, migrations, source, Compose, documentation contracts and other inventoried files unchanged. No new deployed application, package installation, credential, SQL write/migration, writer change, relay modification, service restart, configuration change, consumer registration, wa-01 connection, message/history/media operation, send or autonomous approval initiated. No business-data byte-identity assertion: business rows and native stores were not inspected; independent transport may continue normally.

VERIFIED documentation validation: all fifteen required sections, nine Cash Control model tables/130 columns, nine live tables/54 columns and six relevant unapplied candidate definitions present; complete 37-file SHA-pinned source inventory; 24 local source links resolve; no unresolved placeholders. Recommendations and future test criteria explicitly separated from implemented/deployed evidence. UNVERIFIED external FPE runtime, fresh WhatsApp connectivity/native ownership and Cash Control execution/coverage remain named limits. Temporary source/schema/hash material is confined to `/tmp`, not a canonical second report or repository clone.

**STOP after this report. Await explicit owner approval before implementation, deactivation, migration, integration or production authority transfer.**

