# Migration Readiness — 0031 Cash Submissions & 0032 Vessel Commands

Status: **READY FOR OWNER APPROVAL — PREPARED, REHEARSED, NOT APPLIED**.

Verified 2026-10-27 (final handoff):
- Production backup `/var/backups/vps/alrifai-pre-0031-0032-20261027T203833Z.dump`,
  sha256 `e38086b30390426b756054b6900634fa250b30b667dd5ee37498245f433d10e0`
  (checksum re-verified against the recorded file).
- Isolated restore rehearsal succeeded; live counts matched; applying both
  migrations to the restored clone changed no business row.
- Migration file hashes:
  - 0031 `f803dbc6d7a5e49bf96a95c2cab2b92d2c88c457a258e912302c5d3338109202`
  - 0032 `25ee46143f1841ccc894cad099d8734f350641390122b807d64410b428ac3a3c`
- Production schema unchanged: 30 ledger rows; `cash_submissions` and the
  vessel command functions are absent; Cash Freeze intact (0 current postings).

## 1. Exact schema changes

### 0031 — `db/migration-candidates/0031_cash_submissions_and_reviews.sql`
| Object | Change |
|---|---|
| `public.cash_submissions` | New table: 64-hex id, scope `wa-01/wa-02`, submitter FK → `cash_portal_users`, role, employee name/mobile, **separate** payout mobile, method, amount minor, purpose, transaction date, note, evidence ref, payload jsonb, unique payload hash, created_at |
| `public.cash_submission_reviews` | New table: decision `APPROVED/REJECTED/CORRECTION_REQUESTED`, ADMIN-only actor FK, submitter FK, note, payload hash, decided_at, `reviewer_not_submitter` CHECK |
| Triggers | `*_append_only` BEFORE UPDATE/DELETE/TRUNCATE on both tables (function `alrifai_foundation_append_only`, migration 0011) |
| Grants | `REVOKE ALL … FROM PUBLIC`; `GRANT SELECT, INSERT` to `ir_review_runtime` only |
| View | `cash_submission_review_state` (latest decision; `PENDING_REVIEW` default); SELECT to runtime |
| Ledger impact | **None** — no inserts/updates to `cash_instructions`, `cash_postings`, `cash_movements` |

### 0032 — `db/migration-candidates/0032_vessel_program_commands.sql`
| Object | Change |
|---|---|
| `alrifai_vessel_actor_verified(text)` | Verified-person check against `identity_review_candidate.records` |
| `alrifai_vessel_idempotent_event(jsonb,text)` | Command-key replay lookup inside the program ledger |
| `alrifai_vessel_program_add(...)` | Insert Draft program + first ledger event; deterministic id; idempotent replay |
| `alrifai_vessel_program_update(...)` | Whitelisted fields only; expected-revision check; one appended event |
| `alrifai_vessel_program_release(...)` | `endDate`/release metadata; expected revision; one event |
| `alrifai_vessel_program_assign(...)` | New `program_assignments` revision; predecessor chaining; replace guard |
| `alrifai_vessel_program_void(...)` | Status `Voided` + reason event; **no DELETE** |
| Grants | EXECUTE to `ir_review_runtime` only; no PUBLIC; **no table UPDATE/DELETE** |

## 2. Compatibility with current production schema
- Requires migrations 0000–0030 applied (verified by full isolation rehearsal).
- 0031 references `cash_portal_users` (0017). 0032 references `programs.details`
  (0000/0001), `program_assignments` (0012), the 0007 command-history trigger,
  and `alrifai_foundation_append_only()` (0011).
- Both are additive: new tables/functions/views; no existing column is altered,
  no existing grant is revoked, no row is rewritten.

## 3. Migration ordering
1. Backup + integrity verification (§5–6).
2. Apply 0031, verify (§9).
3. Apply 0032, verify (§9).
They are independent; 0032 does not depend on 0031. Neither touches Cash facts.

## 4. Roles and privileges
- Apply as the migration owner (production: `vps_pg_admin` via reviewed runner),
  not as the runtime role.
- Runtime roles: `ir_review_runtime` (EXECUTE on command functions; SELECT/INSERT
  on the new cash tables), `alrifai_app` (unchanged read role).
- `alrifai_app` gains nothing; public gains nothing.
- Application actor: server-resolved `ALRIFAI_VESSEL_COMMAND_ACTOR`
  (falls back to `ALRIFAI_CASH_OWNER_PERSON_REF`); never client-supplied.

## 5. Pre-migration backup procedure
```bash
# Logical backup, custom format, outside the container.
docker exec vps-infra-postgres-1 pg_dump -U postgres -Fc alrifai \
  > /var/backups/vps/alrifai-pre-0031-0032-$(date +%Y%m%dT%H%M%S).dump
```
Also record `pg_dump --schema-only` separately for diff review.

## 6. Backup integrity verification
```bash
sha256sum /var/backups/vps/alrifai-pre-0031-0032-*.dump   # record separately
pg_restore --list <file>.dump | head -50                   # archive readable
pg_restore --list <file>.dump | wc -l                      # compare to expectation
```

## 7. Isolated restore rehearsal (required before production)
```bash
docker run -d --name alrifai-restore-check -e POSTGRES_PASSWORD=... -e POSTGRES_DB=alrifai postgres:16-alpine
docker exec -i alrifai-restore-check psql -U postgres -d alrifai -c "CREATE ROLE alrifai_app LOGIN" || true
pg_restore -vc --no-owner --no-privileges -d alrifai <backup>.dump   # via docker exec
# then apply 0031 + 0032 and run tests/sql/0031_*.sql and tests/sql/0032_*.sql
```
The Session 3 rehearsal script `tests/sql/rehearsal_bootstrap.sh` reproduces the
full 0000–0032 chain on a throwaway container on every run.

## 8. Execution commands (after approval; not run in this session)
```bash
cd /opt/vps/apps/al-rifai
# Each file already wraps BEGIN/COMMIT — do NOT add -1 (it nests transactions).
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migration-candidates/0031_cash_submissions_and_reviews.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migration-candidates/0032_vessel_program_commands.sql
```
Each file aborts on the first error and rolls back its own transaction.

## 9. Post-migration verification
- `to_regclass('public.cash_submissions')`, `to_regclass('public.cash_submission_reviews')`,
  `to_regprocedure('public.alrifai_vessel_program_update(...)')` non-null.
- `information_schema.role_table_grants` shows INSERT,SELECT only for the runtime
  role; no UPDATE/DELETE anywhere.
- Append-only triggers present and enabled (`pg_trigger.tgenabled='O'`).
- `select count(*) from cash_postings` unchanged; Cash Freeze intact.
- Application: `/cash/submissions` no longer returns the dependency 503;
  `/vessel-register` reports `available:true`, commands remain gated by the app
  role and server-side actor configuration.
- Run `tests/sql/*` assertions against the migrated clone.

## 10. Recovery strategy
- There is **no down migration**: both migrations create append-only objects.
  Reversing them would destroy audit evidence and is not supported.
- Prefer **forward recovery**: fix forward with a new additive migration, or
  restore the verified backup into a fresh database and repoint the app.
- If a migration fails inside its transaction, PostgreSQL rolls it back; nothing
  is partially applied. If verification fails afterwards, restore from the
  verified dump (§5–7) — do not edit append-only rows.
- Destructive cleanup (`DROP TABLE …`) is a last-resort, separately authorized
  action with a fresh backup and a post-restore integrity check.
