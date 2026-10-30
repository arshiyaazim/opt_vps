# AL-RIFA'I VPS Application Audit

**Audit date:** 2026-10-30  
**Scope:** Source, migrations, tests, and the dated operational records in
`AGENTS.md` and `NEXT-SESSION-HANDOFF.md`. This was a read-only audit: no
Production APIs or database were queried, no secrets or business rows were
read, and no service, migration, configuration, or business data was changed.

## Summary

The application has substantial Cash, Vessel, unified-authentication, and
employee-request safeguards, with recent isolated test and migration-rehearsal
evidence. The principal concerns are release/source ambiguity, features whose
schema is still unapplied, missing login throttling, and incomplete live
WhatsApp processing. These are mostly release-readiness and operational gaps;
the evidence reviewed does not establish a current Production runtime defect
or a financial data-integrity incident.

## Findings

### 1. Production release identity and source state are not reconciled — High

The operational records disagree about the latest Production image: the
authoritative current-position banner in `AGENTS.md` names image `cace72…`
(source `67ec02b`), while the later provenance reconciliation in
`NEXT-SESSION-HANDOFF.md` records image `ef06c2…` (source `9bc9f85`) as running.
Neither report was rechecked during this audit. Meanwhile, local `main` is at
`76183e9`, four commits ahead of `origin/main`, with 38 pre-existing modified
or untracked paths. The current source therefore cannot be assumed to match
Production, and much of it is not committed.

**Fix:** Reconcile the two production records using an authorized, read-only
image/config/runtime check, then update the authoritative record. Review and
commit/push source changes through the normal process. For any future release,
record the exact source SHA and verified image digest; deploy only the exact
tested artifact, with the required backup and rollback images. Do not deploy
or restart without separate Owner approval.

**Update (Phase 4.4 — 2026-10-31):**
The image discrepancy noted above (cace72… vs ef06c2…) was resolved
in the Phase 2 deploy cycle. Current production image is
`sha256:ca27d77c…` (local/al-rifai:20261030-phase4, source a07c57f),
deployed 2026-10-31. Rollback: `sha256:1d4602c3…`.

### 2. Signup, employee-request, and Vessel command features are migration-blocked — High

The current source implements signup requests and employee request/decision/
activation APIs, but their schemas are prepared as migration candidates
`0034` and `0035`, not normal applied migrations. The routes explicitly return
`503` when their schema or grants are unavailable. Vessel command endpoints
also depend on migration `0032`, which the Production record says is
unapplied. The normal migration runner does not discover files under
`db/migration-candidates/`. Isolated PostgreSQL rehearsals are useful evidence,
but do not prove Production grants, ordering, or endpoint behavior.

**Fix:** Treat these workflows as unavailable until each candidate has a
reviewed migration plan, supported-base rehearsal, verified backup/restore and
rollback plan, and separate Owner approval. Promote candidates through the
reviewed migration path; then verify the exact deployed artifact and endpoints.
Do not apply migrations as an automatic fix.

### 3. Login endpoints have no effective rate limiting — Medium/High

Both unified login (`lib/unified-auth.ts`, `POST /api/auth/login`) and Cash
Portal login (`app/api/cash/[...path]/route.ts`) verify credentials without a
throttle. The operational notes record that the former limiter was removed;
the latest documented Production check saw repeated invalid logins all return
`401`, not `429`. The app's session metadata helper reads `x-forwarded-for`,
while the entry proxy strips forwarded headers and injects a different
client-IP header; that value is not yet a verified limiter key.

**Fix:** First establish and test a trusted ingress identity contract. Then
add a shared, database-backed limiter with progressive delays, bounded
retention, monitoring, and tests for spoofed headers and distributed requests.
Avoid account lockout and process-local or client-controlled IP limits; preserve
the Owner's ability to sign in.

**Resolution (Phase 1 — committed `d74f91e`, 2026-10-30):** A username-keyed,
hash-only, database-backed progressive-delay throttle was implemented in
`apps/al-rifai/lib/login-throttle.ts` and integrated into both the unified
login (`lib/unified-auth.ts`) and the Cash Portal login
(`app/api/cash/[...path]/route.ts`). The throttle has a 30-second hard cap,
is never a lockout, and fails open when its backing table is absent so a
missing migration cannot lock the Owner out. The backing table is prepared
as migration candidate `db/migration-candidates/0036_login_throttle.sql`
and was **applied 2026-10-30** (Phase 2.1); the throttle is now active.

**Update (Phase 2.1 — applied 2026-10-30):** Migration 0036 has been
applied to the production database. The `public.login_throttle_state`
table now exists with `ir_review_runtime` CRUD permissions. The Phase 1
throttle code (`lib/login-throttle.ts`) is now active and will enforce
progressive delays on repeated login failures. Client-IP headers remain unused as a throttle key
until the entry-peer trust contract is enforced at the application
boundary; this future enhancement is tracked in the roadmap.

### 4. Unified login is still in `shadow` mode — rollout incomplete

The last dated Production records say `ALRIFAI_UNIFIED_AUTH_MODE=shadow`.
In this mode, a Cash session does not authorize protected workspace pages;
the legacy Basic validator remains required. This is a deliberate safe rollout
state, but it means the unified login experience is not yet the production
workspace authentication path.

**Fix:** Complete the documented Owner login/browser confirmation and obtain
explicit approval for each cutover step before enabling `on`. Keep the legacy
guard as the documented fallback unless separately authorized. Do not change
Production configuration as part of this source audit.

### 5. WhatsApp workflow is degraded and the message mirror is disabled — High
for workflow completeness

The current-position record says WA-01 has one failing chat out of nine, with
the diagnosis recorded and the bridge fix deferred. The mirror worker is
documented as disabled in `EVIDENCE_ONLY` mode. This prevents a claim that the
full receive-to-application workflow is currently complete, even though prior
bounded ingestion checks passed for other approved chats.

**Fix:** Resume the documented diagnosis only with Owner direction. After an
approved bridge fix, verify the affected approved chat through bounded,
read-only function-level checks. Enable mirroring or perform any historical
reprocessing only under separate explicit approval; do not broaden chat scope
or alter cursors.

### 6. Some request/review lists stop at 200 records — Low/Medium

The signup-request and employee-submission GET handlers use `LIMIT 200` with
no cursor, page parameter, or total count (`app/api/cash/[...path]/route.ts`).
Once either set exceeds that limit, older records are not reachable through
those endpoints. Other handoff notes also identify incomplete pagination in
review surfaces.

**Fix:** Add stable keyset pagination (for example, timestamp plus unique ID),
an explicit result count or continuation token, and tests that traverse more
than 200 synthetic records. Retain the current authorization and self-scope
filters in every page query.

### 7. Recent verification is isolated, not Production end-to-end

The latest handoff records a canonical suite and production build passing with
disposable synthetic fixtures, plus focused checks after the Employee UI
pagination change. It explicitly says the full canonical suite/build were not
rerun for that last UI-only change. The recent candidate-schema rehearsals
were also synthetic and disposable. No authenticated browser or live
Production workflow was verified in this audit.

**Fix:** Before release, run the full canonical suite/build on the final
committed tree, rerun focused checks for the final delta, and use an approved
non-production environment for authenticated browser/API integration. Treat
Production acceptance as a separate Owner-controlled step; never use private
business data to fill test fixtures.

## Existing safeguards to preserve

- Cash submissions remain review-only and are separate from financial posting.
- Employee request approval and explicit Super Admin activation are separate;
  portal employee records are not silently merged into payment-derived
  `employee_master`.
- Cash Freeze and the rule against automatic approval/posting remain in force.
- WA-02 remains identity-only; do not use its message/contact tools.
- Migrations, deployments, restarts, live-sync activation, historical
  reprocessing, and Production business-data writes require separate
  authorization.

## Recommended order

1. Reconcile the Production image/source record and review the dirty worktree.
2. Resolve login throttling using a trusted ingress identity design.
3. Decide whether to release the migration-backed features; review and approve
   each migration and deployment independently.
4. Address the deferred WA-01 chat issue under Owner direction and verify the
   workflow without historical replay.
5. Add pagination to the capped queues and complete final-tree validation
   before any release.

---

## Execution Roadmap (Phases 2–5)

**Appended 2026-10-30.** Phase 1 (login throttle + server-side pagination)
is committed locally as `d74f91e`. No migration applied, no deployment, no
configuration change. Each phase below requires separate Owner approval and
must leave the system working if the next phase never starts.

### Phase 2 — Migration-backed features

The migration candidates in this phase add database objects. **Migration 0032 is applied (2026-10-30)**.
Migration 0032 creates command functions that can write to existing Vessel tables when
invoked; candidates 0034–0036 add tables and supporting views, functions, and
triggers. The migration SQL does not drop or truncate existing objects or data.

Common gate for every migration in this phase:
1. Backup: `docker exec vps-infra-postgres-1 pg_dump -U <user> alrifai > /root/backup-<name>-$(date +%Y%m%d-%H%M).sql`
2. Record the backup checksum (`sha256sum`) in `NEXT-SESSION-HANDOFF.md`.
3. Confirm rollback path in one sentence (restore from the backup).
4. Apply with `ON_ERROR_STOP=1` inside a transaction (pattern from 0033).
5. Verify: `\dt`, `\d <table>`, `pg_roles`, `pg_proc` as applicable.
6. Record applied date + checksum in `NEXT-SESSION-HANDOFF.md`.

#### Phase 2.1 — Throttle table (unlocks live throttle)
- Migration: `apps/al-rifai/db/migration-candidates/0036_login_throttle.sql`
- Pre-verify (read-only): confirm the `ir_review_runtime` role exists and
  `public.login_throttle_state` does not exist before requesting approval.
- Apply → verify `\d public.login_throttle_state` and grants.
- Test: 6+ wrong passwords → `429 LOGIN_THROTTLED`; correct password after
  brief delay succeeds; Owner always reachable (30s cap enforced).
- Commit: "ops: applied migration 0036 login_throttle".
- Rollback: restore from backup. No application change to revert because
  the throttle is fail-open.

#### Phase 2.2 — Vessel command schema (+ vessel code commit)
- Migration: `apps/al-rifai/db/migration-candidates/0032_vessel_program_commands.sql`
  (applied 2026-10-30).

  **Update:** 7 SECURITY DEFINER functions created. `ir_review_runtime` has EXECUTE.
- Pre-verify SQL against a synthetic restored clone.
- Apply → verify command functions and grants.
- Commit pending vessel code:
  - `apps/al-rifai/lib/vessel-command-policy.ts`
  - `apps/al-rifai/app/api/vessel-programs/route.ts`
  - `apps/al-rifai/tests/vessel-commands.mjs`
- Test: `/api/vessel-programs` command endpoint → 200 (was 503).
- Commit: "feat(vessel): activate command API against migration 0032".
- Rollback: revert commits + restore DB from backup.

#### Phase 2.3 — Signup requests (+ signup code commit)
- Migration: `apps/al-rifai/db/migration-candidates/0034_signup_requests.sql`
- Pre-verify: `alrifai_foundation_append_only` function exists (verified);
  `ir_review_runtime` role exists (verified).
- Apply → verify `account_signup_requests`,
  `account_signup_request_decisions`, view `account_signup_request_state`,
  both triggers, and grants.
- Commit pending signup code:
  - `apps/al-rifai/app/signup/request-form.tsx`
  - `apps/al-rifai/app/signup/page.tsx`
  - `apps/al-rifai/app/api/auth/[...path]/route.ts` (signup handler)
  - `apps/al-rifai/app/api/cash/[...path]/route.ts` (signup review handlers)
  - `apps/al-rifai/tests/signup-requests.mjs`
- Test: `POST /api/auth/signup` → 202 `PENDING_REVIEW` (was 503).
- Commit: "feat(signup): activate signup request flow against migration 0034".
- CRITICAL: public signup never creates a Cash Portal account; approval is
  a separate decision record; account creation still requires the existing
  explicit workflow.
- Rollback: revert commits + restore DB from backup.

#### Phase 2.4 — Employee submission requests (+ employee code commit)
- Migration: `apps/al-rifai/db/migration-candidates/0035_employee_submission_requests.sql`
- Pre-verify: `ir_review_runtime` role exists; schema explicitly avoids
  `employee_master` (audit rule preserved).
- Apply → verify `employee_submission_requests`,
  `employee_submission_decisions`, `employee_directory_records`, function
  `alrifai_employee_submission_immutable`, all triggers, grants.
- Commit pending employee code:
  - `apps/al-rifai/lib/employee-submission.ts`
  - `apps/al-rifai/lib/employee-submission-policy.ts`
  - `apps/al-rifai/lib/employee-directory-view.ts`
  - `apps/al-rifai/app/employees/view.tsx`
  - `apps/al-rifai/app/api/cash/[...path]/route.ts` (employee handlers)
  - `apps/al-rifai/tests/employee-submission-lifecycle.mjs`
  - `apps/al-rifai/tests/employee-directory-view.mjs`
  - `apps/al-rifai/docs/EMPLOYEE-TRANSACTION-SUBMISSIONS.md`
- Test: submit → admin approve → super-admin activate (full lifecycle).
- Commit: "feat(employee): activate employee submission lifecycle against migration 0035".
- CRITICAL: approval ≠ activation (separate record + DB trigger); silent
  merge into `employee_master` impossible; Cash Freeze intact.
- Rollback: revert commits + restore DB from backup.

### Phase 3 — Configuration cutover

#### Phase 3.1 — Unified auth shadow → on
- Pre-requisite: Phase 2.1 complete (throttle table live).
- Owner logs in via browser to confirm workspace access with the existing
  legacy Basic credential (current state).
- Owner explicitly approves the mode change.
- Change `ALRIFAI_UNIFIED_AUTH_MODE=on` in `/etc/vps/apps/al-rifai/app.env`.
- Restart app service only (documented compose command; separate approval).
- Test: Owner login → `/dashboard` → Cash portal → logout.
- CRITICAL: legacy Basic validator remains first in `proxy.ts`; instant
  rollback by editing the env var and restarting.
- Rollback: revert env var + restart.

#### Phase 3.2 — WA-01 bridge fix (Owner direction only)
- Owner directs diagnosis; each step separate approval.
- Bridge-side safe error codes; consumer restart or container recreate.
- Verify: 9/9 approved chats ingesting (bounded, read-only).
- Do NOT: broaden chat scope, alter cursors, replay history, enable the
  mirror worker (each requires its own approval).
- Rollback: restore previous consumer image (`ae009303de09` as of
  2026-10-30), documented in `NEXT-SESSION-HANDOFF.md`.

### Phase 4 — Remaining dirty files review

All uncommitted worktree changes at the time of Phase 1 commit, excluding
paths consumed in Phase 2. Each file reviewed independently; no bulk commit.

#### Phase 4.1 — Pre-existing UI changes
- `apps/al-rifai/app/login/page.tsx`, `app/login/view.tsx`
- `apps/al-rifai/app/dashboard/view.tsx`
- `apps/al-rifai/app/page.tsx`
- `apps/al-rifai/app/platform/app-shell.tsx`, `nav.ts`, `ui.tsx`
- `apps/al-rifai/app/workspace.css`
- `apps/al-rifai/app/sources-review/page.tsx`
- Method: read diff → confirm no business or authorization change → focused
  tests → commit each logical group separately.

#### Phase 4.2 — Proxy header changes
- `apps/al-rifai/proxy.ts` (+33 lines, header stripping/injection).
- Security-relevant. Verify:
  - `oai-authenticated-*` headers still stripped
  - `x-middleware-subrequest` still stripped
  - No untrusted header leaks into `request.headers`
  - Cash Portal path passthrough correct
- Run `tests/unified-auth-integration.mjs` and
  `tests/login-rate-limit-removed.mjs` before committing.

#### Phase 4.3 — Docs and test cleanup
- `apps/al-rifai/README.md`
- `docs/VPS_MAP.md`
- `apps/al-rifai/docs/UNIFIED-AUTH-DESIGN.md`
- `apps/al-rifai/tests/employee-program-qualification.mjs`
- `apps/al-rifai/tests/public-site-and-currency.mjs`
- `apps/al-rifai/tests/unified-auth-integration.mjs`
- `apps/al-rifai/tests/vessel-commands.mjs` (if not consumed in Phase 2.2)
- Review each; commit in one or two logical groups.

### Phase 5 — Final validation & deploy

#### Phase 5.1 — Full canonical suite on final committed tree
- Isolated Node 22 container (host has no npm).
- `ALRIFAI_EVIDENCE_DIR` set to synthetic fixture directory; no private
  evidence read.
- Run `package.json` script `scripts.test` in full.
- Expected: 240+ tests, 0 fail.
- Run `next build --webpack`, `npx tsc --noEmit`, ESLint on all changed
  files, `git diff --check`.
- All must pass on the FINAL committed HEAD.

#### Phase 5.2 — Non-production integration test
- Deploy the built artifact to a non-production environment (isolated
  compose project).
- Authenticated browser flow: Owner login → workspace → Cash portal →
  submit → approve → activate → verify audit.
- Exercise throttle: 6 wrong passwords → 429; correct → 200.
- Verify WA-01 ingestion for approved chats (read-only).
- Synthetic fixtures only; never private business data.

#### Phase 5.3 — Production deploy (Owner approval, separate step)
- Backup DB, compose file, and rollback image. Record checksums.
- Build production image from final tree; tag with date and short SHA.
- Deploy `docker compose up -d --no-deps app`.
- Health check `/api/health` → 200.
- Smoke test with Owner: login, workspace, one Cash review action.
- Verify throttle active (0036 live); unified mode as approved.
- Rollback image recorded and ready. If any check fails, roll back to
  `local/al-rifai:20261029-review-nav-fix`
  (`sha256:ef06c2ef…`).

### Cross-phase invariants (must remain true at every step)

- Cash Freeze intact; no automatic approval or posting.
- Cash submissions remain review-only; separate from financial posting.
- Employee approval ≠ activation; explicit Super Admin activation only.
- Payment-derived `employee_master` is NEVER silently merged with portal
  employees.
- WA-02 remains identity-only.
- Legacy Basic validator remains a working fallback until Phase 3.1 is
  completed with Owner approval.
- No migration, deployment, restart, live sync, historical reprocessing,
  or business-data write without its own separate approval.

### Phase 3.1 status — 2026-10-30
- `ALRIFAI_UNIFIED_AUTH_MODE` flipped `shadow` → `on` in host config
  `/etc/vps/apps/al-rifai/app.env` (outside repo; not committed; 600 root:root).
- Config backup: `/etc/vps/apps/al-rifai/app.env.pre-3.1-20261030-224045`.
- First flip was rolled back because of a WA-01 log line; that line
  (`NATIVE_READER_UNAVAILABLE`) was confirmed pre-existing in `shadow` mode
  and mode-independent (Phase 3.2, deferred). Re-flip approved and applied.
- Verified: health ok; `/login`, `/signup` 200; protected API 401 without
  credentials; no new non-WA-01 errors; Owner authenticated login test passed.
- Rollback: set mode back to `shadow` in host config, `docker compose up -d`.
