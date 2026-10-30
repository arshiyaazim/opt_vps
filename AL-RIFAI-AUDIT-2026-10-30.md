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
