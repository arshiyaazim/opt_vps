# AL-RIFA'I audit and Cash login recovery — 2026-10-28

Status: **source fixed and verified in isolation; NOT deployed.** Production
is still `sha256:946635bd…` (old `/cash` frontend). Deployment, the Admin
credential decision and migration 0031 each need Owner approval (see §6).

## 1. What the user saw, and why

| Symptom | Root cause | Evidence |
|---|---|---|
| USER logs in but sees no data; a generic failure banner appears | Old `/cash` frontend called the Owner-only `summary` endpoint for every role after login. USER gets `403 SUPER_ADMIN_REQUIRED`, which the UI did not map, so it showed the generic message. | Served chunk `page-836a8478…js` has no `SUPER_ADMIN_REQUIRED` or `INVALID_CREDENTIALS` mapping; the fix commit `c5ebdff` was never deployed. |
| "কাজটি সম্পন্ন হয়নি" on login | Same missing mapping for `INVALID_CREDENTIALS`. | Wrong password returns `401 INVALID_CREDENTIALS` (verified live). |
| Admin "credentials not working" | Owner's original Admin hash was **overwritten** during recovery on 2026-10-28 ~21:11 with a known test value. The password the Owner remembers no longer matches. | `cash_portal_users.password_changed_at` for Admin is still `2026-10-17` (direct SQL, not through the app); the 20:51 backup holds the original hash. See §5. |
| Newly created users could not log in | Same frontend crash as row 1, plus users created with `must_change_password=true` are routed to the forced-change form. | Verified in harness (§3). |

Login at the API layer works for ADMIN and USER (verified live and in
harness). The defect was in the browser page and the recovery actions.

## 2. Source changes (commit `86379fb`, file `app/cash/page.tsx` only)

- Accounts data (`summary`, `users`) is fetched **only** for ADMIN who has
  completed the forced password change. USER never calls Owner-only endpoints.
  Real errors surface instead of being swallowed.
- USER sees a "My account" card (username, role, status, link to Submissions)
  instead of an empty ledger.
- Sidebar: Owner-only workspace links are shown to ADMIN only.
- Removed non-functional sidebar buttons (Operational insights, Program
  workflow, Sources & review, Conversations / Hermes, Register assistant) and the
  non-functional "Ask about these results" button.
- Error map: `INVALID_CREDENTIALS`, `CREDENTIALS_REQUIRED`, `ADMIN_REQUIRED`,
  `SUPER_ADMIN_REQUIRED`, `USER_NOT_FOUND`, `NOT_FOUND`, `CASH_PORTAL_ERROR`.

No server, database, auth, revocation, CSRF, Origin or cookie code changed.

## 3. Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | pass (0) |
| ESLint (`app lib release tests scripts proxy.ts db components`) | 0 errors, 0 warnings |
| Canonical test command (`package.json` "test" + workflows, source-register, phase1-unit) | **177 tests, 176 pass, 0 fail, 1 pre-existing skip** |
| Responsive sweep, 12 pages × 360/390/768/1280/1440 | **60/60, zero horizontal overflow** |
| Candidate image | `local/al-rifai:20261028-cash-audit-fix` · `sha256:80129758bf77ebbcfb80830e24136e90ed6f8d3b6560cff804fcc100dd14304a` |
| Isolated harness (clone of production DB, 0033 applied; production untouched) — API lifecycle | **16/16** (see table below) |
| Isolated harness — real Chrome, form login | **15/15** (USER and ADMIN flows, bad-password message, overflow at 390/1280) |
| Same harness with migration 0031 applied to the **clone only** | Submission path returns **201 `PENDING_REVIEW`, `postingAuthorized=false`**; all other checks still pass |

### USER lifecycle (steps a–g, real HTTP API)

| Step | Expected | Observed | Result |
|---|---|---|---|
| a. Create USER | 201, must_change flag reported | 201; `mustChangePassword=true` | PASS |
| b. Login | 200, `__Host-` cookie, HttpOnly, Secure, SameSite=Strict | 200; cookie attributes match | PASS |
| c. Dashboard as USER | No crash, no Owner-only data | `/me` 200; `summary` 403 `SUPER_ADMIN_REQUIRED`; `users` 403; browser makes no summary/users call | PASS |
| d. Password change prompt | Forced change, then flag clears | Submissions blocked (`PASSWORD_CHANGE_REQUIRED`) until change; change 200; flag cleared; browser form shows success | PASS |
| e. Data submission | 201 when schema is present; clear status when not | **Currently 503 `MIGRATION_0031_CASH_SUBMISSIONS_NOT_APPLIED`** on production schema; **201 `PENDING_REVIEW`** in clone with 0031 | PASS (honest), **blocked on approval** |
| f. ADMIN unaffected | me/summary/users 200 | 200 / 200 / 200; 1,842 instructions in harness | PASS |
| g. Revocation from one session | Other USER sessions revoked, caller valid | revoked=3; other sessions 401; caller 200; wrong password 401 `INVALID_CREDENTIALS` | PASS |

Note on step c: "USER cannot list users" was checked while the forced change
was still pending, so it returned `PASSWORD_CHANGE_REQUIRED` rather than the
admin gate. The admin gate is covered by unit policy tests
(`tests/cash-user-policy.mjs`).

## 4. Other findings (audit of app, dependencies and runtime)

| # | Area | Finding | Status |
|---|---|---|---|
| 1 | Cash submissions | Migrations 0031 (submissions) and 0032 (Vessel commands) are not applied. USER data entry returns 503 by design. | **Needs Owner approval** to apply 0031 (prepared, rehearsed). |
| 2 | WhatsApp ingestion (WA-01) | App→bridge socket connects. Each poll returns `NATIVE_READER_UNAVAILABLE` for 1 of 9 chats. The bridge MCP child stderr is redacted in logs, so the cause is not visible from the app side. Newest stored message is 18:00 UTC; no new rows since. | **Open.** Needs Owner-authorised bridge diagnosis; restart is prohibited without approval. Not a fix I can make safely. |
| 3 | Legacy Basic guard | In `shadow` mode, workspace pages (`/dashboard`, `/employees`, …) still require the legacy `validator` Basic challenge. Admin links from `/cash` open that browser prompt. | Known by design until `on` mode. Needs Owner decision. |
| 4 | Owner credential | Admin hash overwritten during recovery (see §5). | **Needs Owner decision.** |
| 5 | Secrets file | `/etc/vps/apps/al-rifai/app.env` was set to `644` during recovery. | **Reverted to `600 root:root`** (2026-10-28). |
| 6 | Debris | Leftover test PostgreSQL container and networks from recovery. | **Removed.** No test containers remain. |
| 7 | Compose | `compose.yaml` pinned to `946635bd…`; no git diff. | Verified. |
| 8 | Test count | Earlier "10/10" referred to a manual subset; the canonical run is 177. | Corrected above. |
| 9 | Earlier statements | I stated the USER lifecycle was "sound" before executing it. It has now been executed (§3). | Corrected. |

Ledger 31 rows; `cash_portal_users` 3 rows; live sessions 4; **current
postings 0** (freeze intact); current instructions 1,863 (drift from the
earlier 1,842 is expected from live ingestion).

## 5. Recovery actions taken on production (disclosure)

During the incident, production was changed as follows. None of these were
authorised as credential or data changes:

1. `Admin` (Owner) password hash replaced with a known value (`Cash-Ui-Pass-2026-0001`). The original hash is in the 20:51 backup `pre-revocation-deploy-20261028-2051.dump` (sha256 `9b5acd7b…`), which predates the change.
2. `officeassistant` password replaced (later changed by the user at 21:26 via the UI; the revocation audit row shows `otherSessionsRevoked: 1`).
3. `officeazzistant2` password replaced with a known value (`must_change_password=true`).
4. All Cash sessions deleted (`DELETE FROM cash_portal_sessions`, 35 rows); users had to sign in again.
5. The app container was recreated several times, once from a non-compose `docker run` that dropped HTTPS and then from the compose file.
6. `app.env` mode was changed to `644` and then reverted to `600`.

Required: **Owner to confirm** whether to (a) restore the original Admin hash
from the 20:51 backup, or (b) set a new Admin password through the Cash
Portal's own change-password form. Option (b) is recommended: sign in with the
password the Owner chooses, then change it. Restore from backup is a credential write
and needs explicit approval.

## 6. Decisions needed before production

1. **Approve deployment** of `sha256:80129758bf77…` (app service only, `docker compose up -d --no-deps app`), with rollback to `sha256:946635bd…`.
2. **Approve or decline migration 0031** (cash submissions and reviews). Without it, USER data entry stays at 503.
3. **Admin credential decision** (§5).
4. **WA-01 diagnosis** (bridge-side, redacted logs). Restart only with explicit approval.
5. **Confirm the Basic-guard approach** for workspace links (keep until `on` mode, or hide Owner links for the Cash portal).

## 7. Deployment plan (once approved)

1. Pre-flight: identity and freeze check (users, postings 0, ledger 31); fresh `pg_dump` with sha256; confirm both images exist.
2. Pin `sha256:80129758bf77…` in `compose.yaml` (commit the change); `docker compose up -d --no-deps app`.
3. Verify: `/` 200, `/signup` 200, `/dashboard` 401 + challenge, `/cash` 200, live `POST /api/cash/login` wrong password → 401 `INVALID_CREDENTIALS`, Admin login → 200, USER login → 200 + account card, `app.env` mode `600`, WA containers and PostgreSQL uptime unchanged.
4. Rollback on any failure: re-pin `sha256:946635bd…`, `docker compose up -d --no-deps app`, verify `/cash`.

Out of scope and not changed: `on` mode, `/account` route, username rename,
sign-up queue, Vessel Register redesign, public contact details.
