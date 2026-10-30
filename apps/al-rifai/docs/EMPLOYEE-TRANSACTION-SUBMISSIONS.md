# Employee and Cash Transaction Submissions

**Status: source implemented; database schema candidates remain unapplied.**
Production was not changed.

## Cash transaction submissions

The Transactions drawer now submits to the existing `POST /api/cash/submissions`
path. It uses the Cash Portal session, refreshed CSRF token, same-origin
mutation guard, and the existing `validateSubmission()` rules. Employee mobile
and payout mobile remain separate. The result is `PENDING_REVIEW`; it does not
insert into `cash_postings` or `cash_movements`. Existing migration candidate
0031 is required for storage and the existing `/cash/submissions` page remains
the review surface.

The drawer deliberately has no Save Draft action because the API implements
submission, not a draft lifecycle. File uploads remain disabled; only an
optional reference string is accepted.

## Employee record requests

The Employees drawer submits to `POST /api/cash/employee-submissions`. The
route uses the same authenticated Cash Portal session, CSRF/Origin guard,
first-login password gate and `ir_review_runtime` database pool. Users can read
their own requests; authenticated Admins can read the bounded queue.

Requests are stored in the dedicated append-only
`employee_submission_requests` table proposed by candidate migration 0035.
Submissions are idempotent per submitter and normalized payload, and the
request plus audit event are committed in one database transaction. A request
is always `PENDING_APPROVAL`; it does not create an `employee_master` row,
activate employment, create an assignment, or invoke Vessel or Cash posting
logic. `employee_master` remains the payment-derived identity projection and
is not repurposed for web HR submissions.

An Admin other than the request creator can make one final `APPROVED` or
`REJECTED` decision on a pending request. The API rejects self-review even when
the creator has the Admin role. Rejection requires a nonblank reason; approval
notes remain optional. The decision, actor, note and timestamp are stored in
the append-only `employee_submission_decisions` table, and the same decision
and note are included in the Cash Portal audit event in one transaction.
Candidate 0035 also enforces a nonblank rejection reason with a database check.
Duplicate decisions are refused by the API and unique constraint. Approval
only changes the projected request state to `APPROVED`; it never activates an
employee.

Activation is a distinct POST action, requires the configured Super Admin and
the explicit `ACTIVATE_EMPLOYEE` confirmation. It is allowed only after
approval. It creates one immutable `employee_directory_records` entry plus an
audit event; a database trigger independently refuses activation for pending
or rejected requests. Unique request and employee-mobile constraints prevent
repeat activation and duplicate active identities. This portal directory is
separate from payment-derived `employee_master` and does not create Cash
postings, Vessel programs or assignments. The review UI exposes decision
actions to Admins and activation only to the configured Super Admin.

### Existing Employee page integration

The existing `/employees` page loads `/api/operations?view=employees`, which
builds `employeeStatements()` from the selected Cash snapshot. Its table,
totals and profile remain payment-instruction statements. Activated
`employee_directory_records` are shown in a separate Portal Activated
Employees table with explicit source and `ACTIVE` status; they are not joined
into the payment-derived Employee master/table. A matching mobile is displayed
as a collision, and the two records remain separate; no automatic identity
merge or write to `employee_master` occurs.

The portal directory's unique mobile constraint prevents a second active
portal record with the same normalized mobile; that conflict is rejected, not
merged. Mobile equality with a payment-derived Employee is not a database
relationship and does not change either source.

Only the minimal employee identity and request fields are collected:
employee name, normalized employee mobile/ID, optional assignment reference,
requested joining date and review note. NID, salary and emergency-contact
details are not collected because the application has no protected HR
storage/review lifecycle for them. The assignment is plain text evidence only;
it does not create or update a Vessel program.

Candidate 0035 is not in automatic migration discovery, and must not be applied
without separate Owner approval. Until it is approved and applied, the
Employee endpoints fail closed with a migration dependency response. No
production write or migration was performed for this change.

## Employee identity qualification test repair

`tests/employee-program-qualification.mjs` previously patched a literal
expression from an older `vessel-source.ts` implementation before it could
execute its tests. The current reader uses `buildHistoricalRoster()` and
explicit source references, scoped account/chat provenance, and normalized
employee-mobile conflict checks. The test now invokes that current pure
projection directly with synthetic records and verifies that:

- equal names do not link different mobile identities;
- equal employee mobile may share aliases but does not merge separate programs;
- conflicting mobiles and provenance remain review-only;
- missing employee mobile is never promoted into identity or assignment.

No behavior was changed in the source reader to satisfy the stale assertion.

## Earlier verification — 2026-10-29

Focused offline source tests passed 50/50 across Employee qualification,
submission validation/API boundaries, Cash submission/review policy and Vessel
match/command policy. Node.js 22.23.3 ran with networking disabled and the
repository mounted read-only; `tsc --noEmit` also passed with its incremental
cache redirected to container tmpfs.

Candidate 0035 was applied only to a disposable PostgreSQL 16 container using
synthetic users/requests. Container inspection showed `network=none`, zero
mounts, and a read-only root filesystem; its database used ephemeral tmpfs.
The rehearsal verified the schema/grants, per-submitter idempotency, bounded
User/Admin read scopes, audit insertion, API-projected `PENDING_APPROVAL`, and
append-only UPDATE/DELETE/TRUNCATE guards. The state is projected by the API;
it is not a column in the request table. The test container was removed and
no matching rehearsal container remained. These checks are isolated synthetic
evidence only, not Production schema or runtime evidence.

Production remains in `shadow`. The authoritative current handoff records
migration 0031 applied and 0032 unapplied; this implementation session did not
recheck Production. Candidate 0035 remains unapplied and requires separate
Owner approval before any Production migration/deployment. No deployment or
Production access was part of this verification.

The base foreign-key and audit dependencies in candidate 0035 are defined by
`db/migrations/0017_cash_portal_auth.sql`. Candidate 0035 is independent of
candidate 0034 and migration 0032. In the current Production ledger context,
the planned sequence is after applied 0031 and 0033; 0032 and 0034 are not
prerequisites. The normal migration runner only scans `db/migrations/*.sql`;
it does not discover migration candidates, so 0035 must be included explicitly
in a separately reviewed migration plan. Before any Production migration,
take and hash a separately named `pg_dump`, verify restore/rollback procedure,
confirm role grants and exact ordering, and obtain separate Owner approval.
Deployment remains a separately authorized action; Production stays in
`shadow`.

## Owner-approved policy implementation — 2026-10-30

- Admin self-review is denied by comparing the authenticated actor reference
  with the request creator on the server. Another Admin can decide once.
- A rejection reason is mandatory, trimmed, bounded, and persisted in both the
  append-only decision record and the matching audit event. The candidate
  schema independently rejects a blank rejection reason. Approval notes are
  optional.
- The existing payment-derived Employee master and `employee_master` remain
  untouched. Portal activations are shown in a separate source/status section.
  Mobile collisions are labeled and retained as two records; no merge occurs.
- Super-Admin-only activation and explicit confirmation remain unchanged.
  Employee lifecycle code does not invoke Cash posting or Vessel writers.
- Candidate 0035 remains unapplied. Isolated migration rehearsal, tests,
  canonical suite and build results are recorded in the current
  `NEXT-SESSION-HANDOFF.md` entry; these provide no Production evidence.

## Decision/activation lifecycle verification — 2026-10-30

The focused offline lifecycle suite covers Admin-only single decisions,
approval without activation, Super-Admin-only explicit activation, rejected
and pending activation denial, duplicate requests/identities, audit ordering,
and Cash/Vessel writer isolation. The expanded candidate 0035 was rehearsed in
a disposable PostgreSQL 16 container with synthetic users and requests. The
container had `network=none`, no mounts, a read-only root filesystem and an
ephemeral tmpfs database; it was removed after the rehearsal. Database checks
confirmed the decision and activation uniqueness constraints, approved-only
activation trigger, and append-only UPDATE/DELETE/TRUNCATE guards. This is
synthetic isolated evidence only; it is not evidence that candidate 0035 is
applied or that the endpoints work against Production. Production remains in
`shadow`, and candidate 0035 remains unapplied pending separate Owner approval.
