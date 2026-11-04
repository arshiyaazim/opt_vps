# AL-RIFA'I Development and Production Safety

**Project:** `/opt/vps/apps/al-rifai`
**App configuration:** `/etc/vps/apps/al-rifai/app.env`
**PostgreSQL container:** `vps-infra-postgres-1`
**Database:** `alrifai`
**App container:** `al-rifai-app-1`
**Runtime (inside container):** Node.js 22.23.3 (verified from `al-rifai-app-1` at 2026-10-21 07:05 CEST)
**Package manager (build stage):** pnpm (pinned via `package.json` `packageManager` field)

---

## 0. Current Production Position (verified 2026-11-04)

> **Current production position — 2026-11-04, after the Target 01 and Target 02
> releases (authoritative; supersedes every banner below).**
> Verified read-only at `2026-11-04T20:12Z`.
> app image `sha256:b058dd4810d7830a9b2ac8e289c1358b7d4cb5668c474e9f4e19563a3ab9cae4`
> (tag `local/al-rifai:target02-final`; source commit `ddbd3d5cfa4b3c58eff53c56013665608ecccb93`;
> compose pin commit `91124c0`; deployed 2026-11-04T18:28:17Z with
> `docker compose -f compose.yaml up -d --no-deps app`, app service only).
> Container healthy, `RestartCount=0`; PostgreSQL `721873c3…` and both WhatsApp
> bridges (`28a646d2…` / `d36ca851…`) untouched, `RestartCount=0`.
> **Migration ledger 75 rows** in `public.alrifai_schema_migrations`, through
> `0071_release_apply_atomic.sql`. Candidate migrations `0072`–`0076` (and the
> older `0006`, `0011`) remain **unapplied**; `0031`–`0036` and `0071` are
> applied even though they live under `db/migration-candidates/`.
> **Vessel state:** 98 Programs · 93 Assignments · 93 `program_pay` rows
> (39 `CALCULATED` / 54 `UNRESOLVED`) · 145 release candidates (39 applied) ·
> register 616 `DRAFT` / 411 `REVIEW` / **0 `CONFIRMED`**.
> **Cash Freeze active:** 3,726 instructions (2,140 `REVIEW`, 1,586
> `MANUAL_READY`) and **0 postings**. `MANUAL_READY` is **not** a posting; no
> posting/approval/settlement execution path exists and the
> `cash_instruction_postings` table does not exist. (Older banners below that say
> "1,586 postings" mean `MANUAL_READY` instructions — no financial posting has
> ever occurred.)
> **Ingestion 11/11 cursors, 0 errors; authorized scope 7 conversations /
> 11 addresses; reconciliation timer inactive** (the producer is dormant).
> **Target 02 live verification is PENDING.** P1 (free-text order parser) and P2
> (register row → `CONFIRMED`) are implemented and tested but no eligible live
> order or confirmation has occurred since the deployment.
> **Rollback images retained:** `sha256:066c9a1c…` (Target 01) and
> `sha256:924b0525…` (pre-Target 01), plus the older tags listed in §14.1.
> **Latest backup:** `/var/lib/vps/al-rifai/backups/pre-target02-20261104-1927.dump`
> (64,420,714 bytes, mode 600, sha256 sidecar verified, 785 archive TOC entries).
> **Source is not yet published.** `target01-release` (`bd04e94`) and
> `target02-p1-p2` (`91124c0`) are local only; `origin/main` is `8096ed8`. A clean
> clone of the remote cannot reproduce the running image, and the running
> container's Compose labels still reference `/tmp/opencode/target02` — see
> `docs/NEXT-HANDOFF.md` "Git and deployment risks".
>
> **Superseded banner — 2026-11-03, post-password-policy deploy (retained as evidence):**
> app image `sha256:103f59f27321a93cb59fb72a1b3dce20ac176da5dd5bb046a68366f8c00a24a5`
> (tag `local/al-rifai:20261103-cash-parser-38ce0da`, source `38ce0da`,
> compose pin `81f385f`; deployed via
> `docker compose -f compose.yaml up -d --no-deps app`; verified with
> `docker inspect al-rifai-app-1`). Mode `on`. Container healthy,
> `RestartCount=0`. **Migration ledger 74 rows** in
> `public.alrifai_schema_migrations`, through `0070_cash_review_mirror.sql`.
> `app.env` `600 root:root`, 557 bytes, mtime 2026-11-02 (no change this work).
> **Rollback images retained:** `sha256:a3e53997…` (tag `20261103-rbac2b-fix2`,
> immediate) and `sha256:69ccb8f6…` (tag `20261103-rbac2b-hotfix`), plus
> `e93005db…` / `87a46169…` / `ad590773…` / `2ca12a94…` / `7792e489…` /
> `d382b6da…` / `895ad208…` and the older tags listed under §14.1.
> **Latest backup:** `/var/lib/vps/al-rifai/backups/pre-cash-parser-20261103-2353.dump`
> (64,371,520 bytes, sha256
> `0da75c439af5a224a2ecf5f9e45af0d2d027a9831069d52ceff71505fd5e533d`, 765
> archive TOC entries, mode 600 + `.sha256` sidecar).
> **This work (2026-11-02 → 2026-11-03) delivered, in order:** the B5 vessel pay
> model and register operations (`0042`–`0050`), the R1 release parser
> (`0051`–`0055`), the R2 release review UI + auto-apply (`0056`), the
> employee-master phases 1–5 (`0057`–`0063`), RBAC-2A (`0064`–`0068`), RBAC-2B
> (`0069`), the RBAC-2B hotfix, fix batch 2 (`0070`), and the password-policy
> change, and the Cash parser/live intake release (`38ce0da`). See
> `docs/NEXT-HANDOFF.md` for the per-phase record and the read-first
> contract; this section is the authoritative *position*, that file is the
> actionable *handoff*.
> **Vessel pay is live.** `public.escort_rate_config` holds the **Owner-confirmed**
> schedule of **BDT 200.00 per shift** (uniform; a shift is half a day, so BDT
> 400.00/day) plus per-destination conveyance, effective `2025-01-01`. Pay is
> **derived** state in `public.program_pay`, never a stored column on `programs`
> and never a posting: `programs` is under an immutability trigger, and every pay
> row is reproducible by `recalculate_program_pay(program_id)`. The shift model
> (Owner, 2026-11-02) is `D`/`N` per day, `start(date,shift)` →
> `end(date,shift)` **inclusive**, `days = shifts / 2`. **While `endDate` is
> empty the duty is ongoing, so nothing is calculated** — `UNRESOLVED /
> END_DATE_REQUIRED` and the register shows `৳—`, which is the intended
> fail-closed state. Current: **90** programs (85 `Confirmed` / 5 `Draft`), **37**
> released with an `endDate`; `program_pay` has **37 `CALCULATED`** (818 shifts =
> 409 days, BDT 163,600 salary + BDT 5,200 conveyance = **BDT 168,800**) and **48
> `UNRESOLVED`**. `0050` adds the `fled` status and `FLEE_PROGRAM` command
> ("Fleed A"), modelled on the void command. **Never filter
> `escort_order_register.status='CONFIRMED'`** — it never matches.
> **Release pipeline is live and writes business data.** `release_candidates`
> holds **140** rows (37 `APPLIED`, 13 `MATCHED`, 6 `NO_PAYMENT`, 84
> `ROSTER_MISMATCH`). The ingestion worker, on new records in the Escort Release
> Slip group `120363408741101070@g.us`, scans candidates and **auto-applies only**
> `MATCHED` + `confidence='high'` + `match_pass IN (1,2)` candidates whose program
> is lower-case `confirmed` with an empty `endDate`; everything else queues on
> `/platform/release-review`. Each application appends a `RELEASE_PROGRAM`
> command event and a row in `release_auto_apply_log` (`0056`; deliberately not
> the migration ledger). `release_auto_apply_log` is currently **empty**, so the
> 37 applications came from the review/CLI flow, not the hook — but the hook is
> armed. Do not disable, re-point, replay or "test" it, and do not re-run
> `scripts/apply-high-releases.ts` or `scripts/backfill-releases.ts` without an
> exact Owner instruction.
> **Employee master — the canonical employee identity now exists.**
> `public.employee_master` holds **216** rows, all `CONFIRMED`; **75**
> `duty_type='escort'` and **75** `designation='escort'`. PK is
> `(scope_account, employee_mobile)`. `alrifai_app` has **SELECT only**;
> `ir_review_runtime` has SELECT/INSERT/UPDATE. `program_with_employee` is a
> read view granted via `0063`. A duplicate-identity trigger (`0061`) and an
> idempotent `create_employee_if_new` (`0062`) guard the write paths. The Vessel
> program route auto-creates an employee **fail-closed** — if it cannot resolve
> one, the program write is refused with a 400, never silently skipped.
> **RBAC / review workflow.** Roles stay in `cash_portal_users` (name retained on
> purpose): 1 `ADMIN`, 2 `USER`. Capabilities live in
> `lib/unified-auth-policy.ts`; USER holds no direct-write capability and stages
> work for review. Implemented review domains are `VESSEL_PROGRAM`,
> `ATTENDANCE`, `EMPLOYEE`; `VESSEL_EDIT`, `CASH` and `PROGRAM_RELEASE` accept a
> submission but refuse approval with `DOMAIN_NOT_IMPLEMENTED:<domain>`.
> `workflow_decide()` refuses with `ADMIN_REQUIRED`, `REVIEWER_IS_SUBMITTER`,
> `VERSION_CONFLICT` or `ITEM_NOT_PENDING`. **Cash keeps its own two-step
> authority** (`cash_submissions` → `cash_submission_reviews`); migration `0070`
> only *mirrors* Cash submissions into `review_items` (`domain='CASH'`) for
> visibility and closes the mirror through `cash_review_mirror_close()` when the
> Cash decision is recorded, so `/review` never shows a stale PENDING item.
> `review_items` holds **0** live rows (workflow tests ran in rolled-back
> transactions). **Every write route resolves the caller's user id from the
> `__Host-alrifai_cash` session cookie — never from the request body.** With a
> single ADMIN, an admin's own submission still cannot be approved
> (`REVIEWER_IS_SUBMITTER`), from both `/review` and `/cash/submissions`; that is
> intentional, not a defect.
> **Password policy changed (Task A, commit `5a72404`).** The current-password
> prompt is removed from `/admin`, the forced change at `/login`, and `/cash`.
> The minimum length is **8**, defined once in `lib/password-policy.ts`
> (`MIN_PASSWORD_LENGTH`, `isAcceptablePassword()`) and used by `hashPassword`,
> both password routes and all three forms, and pinned by
> `tests/password-policy.mjs`. The **one documented exception** is the `/admin`
> "Change username" flow, which still verifies the current password (login
> identity is more sensitive than a password; 5 remaining `currentPassword`
> occurrences are asserted by the test). **Security consequence, disclosed to
> the Owner and not mitigated:** a password change now needs only a live session
> cookie plus CSRF token, so a stolen session can set a password and lock the
> Owner out. Any mitigation (second factor or step-up check) needs a new, exact
> Owner instruction.
> **UI surfaces added:** `/attendance`, a rebuilt `/review`, `/submissions`,
> the shared `EmployeeLookup` picker, and `/api/employees/lookup`. `/review`,
> `/attendance` and `/submissions` are in `WORKSPACE_PATHS`
> (`release/entry-rules.mjs`) — without that entry a page works in Next but
> **404s through the TLS private entry** before Next sees it.
> **Verified after the 2026-11-03 deploy:** health `roster_mode="DB"` and
> `roster_shadow.mode="DB"`; `migrate` completed and reconciled ledger **74**;
> ingestion **11/11** cursors with 0 errors; zero module/runtime/5xx signatures;
> all workspace nav answers **401** on both hosts; `/login` **200**; `/cash*`
> **404** on the main host and **200** on the cash host; unknown paths
> **403**/0 bytes (main) and **404**/0 bytes (cash); unauthenticated
> `POST /api/cash/password` and `POST /api/auth/password` return **401
> `AUTHENTICATION_REQUIRED`**. Three accounts unchanged (1 ADMIN / 2 USER, 0
> must-change, last change 2026-10-28/29).
> **Bridges and PostgreSQL untouched by this work:** WA-01 `sha256:28a646d2…`
> (last restart `2026-11-02T07:17:09Z`, profile-only), WA-02
> `sha256:d36ca851…` (start `2026-10-31T13:20:03Z`), PostgreSQL
> `vps-infra-postgres-1` (start `2026-10-31T10:45:58Z`); all `RestartCount=0`.
> Cash Freeze intact: **0** current postings (1,586 archive-epoch postings
> only); no financial posting in this work. The parser release changes
> `lib/cash-publish.ts` to retain unmatched/name-conflicting Employee IDs in
> REVIEW and preserve replay idempotency; it does not post or reset instructions.
> The deployed runtime passes all 11 Owner parser examples (BDT 6,800), source
> gate checks, and the 29-module runtime import guard. Cash processing remains
> review-only; no genuine new eligible message arrived for end-to-end testing,
> so live message-to-instruction completion remains pending.
> **Open:** RBAC-3 (NOT STARTED — needs explicit Owner instruction), Task B
> (never received; only Task A was supplied), Phase E, attendance↔pay
> reconciliation (not started; see §14.3), the deferred `/cash/archive` +
> `/cash/submissions` typeahead, and the pending authenticated visual check of
> the new UI (no headless browser on the host).
>
> **Superseded banner — 2026-11-02, post-B4 deploy (superseded by the block above; retained as evidence):**
> app image `sha256:c2759c80e712439be80ae8e38f08f9b19fe275bcd8021e3f38614dfeac44f3a1`
> (tag `local/al-rifai:20261102-b4-cash-page`, source `dd21806`; built with
> `--build-context evidence=/var/lib/vps/al-rifai/evidence`, pinned in
> `apps/al-rifai/compose.yaml` by commit `d9168aa`, deployed via
> `docker compose up -d --no-deps app`; verified via `docker inspect
> al-rifai-app-1`). Mode `on`. Ledger **41** rows (unchanged — no migration).
> `app.env` `600 root:root`, 14 lines. **Rollback image `sha256:7735007b…`**
> (tag `20261102-b2-employee-txn`).
> **Item B4 DEPLOYED** (commit `dd21806`): `/cash` now matches
> `/transactions` after B1/B2 — the Method column renders the shared
> `methodAbbreviation()` with the raw value in a `title`, a new **Total**
> column shows each employee's lifetime instruction total across the full
> Current scope, a new **Actions** column carries a "Show All" link to
> `/transactions/employee/{employee_mobile}` (only when the mobile is present),
> and the CSV export gains Total. The per-row **Source evidence button is
> deliberately kept** — Show All was added beside it, not in place of it.
> Because `/api/cash/summary` is server-paginated (100/page, hard cap 200) over
> 1,964 Current instructions, the lifetime total is built from one
> `GET /api/operations?view=cash&export=1` call, which is reachable with the same
> Cash session (`currentIdentity` reads the same `__Host-alrifai_cash` cookie)
> and reads the same CURRENT epoch; the map is keyed by
> `normalizeEmployeePhone`. If that call fails the column shows `—` rather than a
> wrong figure. **No new endpoint, no migration, no `app.env` change.** Verified:
> `tsc` and ESLint clean, `/cash` serves 200 (it renders its own login form),
> the built client chunk contains the Show All link, the abbreviation and the
> totals call, health `roster_mode="DB"`, scope 11 chat addresses, ingestion 11/11
> cursors with 0 errors, no new error signatures, 1,586 postings unchanged.
> Authenticated visual check still pending Owner login.
> **Item B2 DEPLOYED** (commits `fa389c1` + `5541d12`):
> `/transactions/employee/[phone]` shows one employee's Cash instruction history
> with 20-row pagination, Print and employee-filtered CSV, reached by a
> "Show All" link in each `/transactions` row. Server page wrapping a
> `"use client"` view, mirroring the existing route so the AppShell and the
> server-side auth redirect survive; reuses `GET /api/operations?view=cash&export=1`
> and filters client-side — **no new endpoint, no migration, no `app.env`
> change**. Method/Source abbreviations now live in `lib/transaction-format.ts`
> (one implementation for both tables). Verified: `tsc` and ESLint clean, route
> in `app-paths-manifest.json` with the shared util bundled, both paths answer
> 401 unauthenticated (no 5xx), health `roster_mode="DB"`, scope 11 chat
> addresses, ingestion 11/11 cursors with 0 errors, no new error signatures.
> Authenticated visual check still pending Owner login.
> Roster **10** persons / **28** channels / epoch **4**; bridge profile
> **11** chats (D2 deployed, profile `1a967be7…`).
> **Phase C SHADOW is COMPLETE and PROMOTED.** The 36 h period ran 60 cycles with
> `diffs_found=0` throughout, and auto-promotion fired on its own 10-minute tick
> at **2026-11-02T03:50:59Z** (due `03:47:18Z`) with no restart, deploy or manual
> step: `roster_shadow.mode="DB"`, `cycles_completed=60`,
> `auto_promote_blocked=false`, worker log `ROSTER_AUTO_PROMOTED after 36 hours,
> 0 diffs`.
> **Phase D1 cutover COMPLETE** (Owner-authorized 2026-11-02):
> `ALRIFAI_ROSTER_SOURCE=SHADOW → DB` — a single-line change in
> `/etc/vps/apps/al-rifai/app.env`; file verified `600 root:root` with unchanged
> line count and no duplicate keys — then the app recreated with
> `docker compose -f compose.yaml up -d --no-deps app` on the **same pinned
> image** (no rebuild, no re-cut). Verified after restart: `/api/health` shows
> `roster_mode="DB"` **and** `roster_shadow.mode="DB"`; **zero** `ROSTER_SHADOW*`
> log lines (the shadow path is off in DB mode); `Approved scope loaded: 9 chat
> addresses across 7 conversations`; ingestion **9/9 cursors, 0 errors**.
> Pre-cutover backups: `/var/lib/vps/al-rifai/backups/pre-d1-cutover-20261102-0415.dump`
> (sha256 `c87a20e9…`, 75 table-data sections, mode 600) and
> `app.env.pre-d1-cutover-20261102.bak` (mode 600); earlier same-session
> `pre-d1-lid-channels-20261102-0401.dump` (sha256 `c9102f3a…`, 75 sections).
> **D1 Part 1 (LID channels) + Phase D2 — COMPLETE 2026-11-02.** Part 1 was
> first attempted and reverted: the bridge's `native-reader-profile.json`
> allowlisted only 9 chats, so both new LID cursors failed
> `NATIVE_READER_UNAVAILABLE` and the ingestion loop backed off from 15 s toward
> its 60 s cap; Owner directed a revert. No message was lost or duplicated.
> D2 then established that the renderer derives `chats` from
> `escort_roster_channel`, so the roster rows must exist **before** the profile
> can contain them — the reverse of the original sequencing. A dry run with the
> rows absent produced a formatting-only diff (`functional_drift=false`), i.e. a
> no-op. After the two LID rows were re-added, regeneration yielded exactly
> `chats_added=[155508031901923@lid, 243103839576097@lid]`, `chats_removed=[]`,
> `participants_changed=[]`, `bridge_restart_required=true`.
> **Deployed:** roster **28** active channels / 10 persons / epoch **4**; bridge
> profile sha256 `1a967be73390340b814c92afb2ab227150e326d90561f5c1687fbe0246c7b200`
> (11 chats, epoch 4) installed `root:whatsapp-wa-01` `0440`, from backup
> `native-reader-profile-pre-d2-lid-20261102-0717.json` (sha256 `4708cd0c…`,
> 600). WA-01 restarted **once** (`docker restart`); WA-02, PostgreSQL and the
> app were **not** restarted. Verified: bridge reconnected
> (`✓ Connected to WhatsApp!`), **11/11** native cursors with `last_error=NULL`,
> **zero** `NATIVE_READER_UNAVAILABLE` after `07:17:09Z`, and **no backfill**
> (neither LID chat holds historic message rows). All four contacts now carry
> LID identity mappings.
> **Bridges:** WA-01 `sha256:28a646d2…` **restarted once** at
> `2026-11-02T07:17:09Z` to load the new profile (authorized); WA-02
> `sha256:d36ca851…` **untouched** (`RestartCount=0`, start
> `2026-10-31T13:20:03Z`); PostgreSQL `vps-infra-postgres-1` untouched
> (`RestartCount=0`, start
> `2026-10-31T10:45:58Z`). Cash Freeze intact: **0** current postings (1,586
> archive-epoch postings only), no financial posting. The single WA-01 restart
> was profile-only and touched no Cash state.
> Open: B5 (blocked — see §14.3), Phase E.
> Deferred under B3: typeahead on `/cash/archive` and `/cash/submissions`
> requires a new read-only employee lookup API endpoint.
>
> **Superseded banner — 2026-11-01, post-shadow-recheck (superseded by the block above; retained as evidence):**
> app image `sha256:381fd22f85f16c43f54f90607a89f1697aebc804885f53d97c1e65d96ea94fc3`
> (tag `local/al-rifai:20261101-shadow-recheck`, source `6b457a6`; verified via
> `docker inspect al-rifai-app-1` and pinned in `apps/al-rifai/compose.yaml` by
> commit `836e8b1`). Mode `on`. Ledger **41** rows (unchanged — no migration).
> **Phase C SHADOW recheck + canonical personRef fix deployed** (Owner-authorized
> against the frozen roster path, 2026-11-01): the comparison and the
> auto-promotion check now run every 10 minutes inside the worker loop instead of
> once per process start, and the roster emits `COALESCE(canonical_person_ref, id)`
> so attribution keys match the legacy scope; `compareScopes` gained a
> `person_ref_mismatch` bucket. Verified: **two real recheck cycles 10 min apart**
> (`18:41:04Z`, `18:51:09Z`), `cycles_completed` 5 → 7, `diffs_found=0`
> throughout, `auto_promote_blocked=false`, auto-promotion still due
> `2026-11-02T03:47:18Z` and now fires **automatically** on its own tick — no
> restart or manual step. Pre-deploy backup
> `/var/lib/vps/al-rifai/backups/pre-shadow-recheck-20261101-1827.dump`
> (sha256 `c9e42086…`, 75 table-data sections, mode 600). Immediate rollback
> image `sha256:61ccaf56…` (tag `20261101-b3-typeahead`); also retained
> `sha256:8e4383a9…` (tag `20261031-b1-columns`), `sha256:1911fdfd…` (tag
> `20261031-typeahead`) and the older rollbacks listed below.
> Bridges **untouched**: WA-01 `sha256:28a646d2…`, WA-02 `sha256:d36ca851…`
> (`RestartCount=0`, same start times); PostgreSQL `vps-infra-postgres-1`
> untouched. Cash Freeze intact: **0** current postings (1,586 archive-epoch
> postings only), no financial posting, no bridge restart. Ingestion 9/9 cursors
> fresh with 0 errors. `app.env` still `600 root:root`.
> Deferred to **Phase D1**: add Rezaul LID `155508031901923` and TCIS LID
> `243103839576097` to the roster — absent today, but the bridge normalizes LID
> traffic to the paired PN, so there is **no live message loss** (see §14.1).
> Open: B2, B4, B5 (blocked — see §14.3), Phase D1 (after promotion), Phase E.
> Deferred under B3: typeahead on `/cash/archive` and `/cash/submissions`
> requires a new read-only employee lookup API endpoint.

> **Superseded banner — 2026-11-01, post-B3 (superseded by the block above):**
> app image `sha256:61ccaf56e4ba5d38484ba54348ca38e90ca12925925246ee0022101806103a80`
> (tag `local/al-rifai:20261101-b3-typeahead`, source `c98e57e`; verified via
> `docker inspect al-rifai-app-1` and pinned in `apps/al-rifai/compose.yaml` by
> commit `8bc7017`). Mode `on`. Ledger **41** rows (unchanged — no migration).
> Item B3 (employee typeahead on the Add Transaction drawer and `/cash` search)
> deployed and healthy. Pre-deploy backup
> `/var/lib/vps/al-rifai/backups/pre-b3-typeahead-20261101-0825.dump`
> (sha256 `7c585057…`, 75 table-data sections, mode 600). Immediate rollback
> image `sha256:8e4383a9…` (tag `20261031-b1-columns`); also retained
> `sha256:1911fdfd…` (tag `20261031-typeahead`) and the older rollbacks listed below.
> **Phase C SHADOW unchanged and NOT promoted:** `roster_shadow.mode="SHADOW"`,
> `cycles_completed=4`, `diffs_found=0`, `auto_promote_blocked=false`,
> auto-promotion still due `2026-11-02T03:47:18Z`. No frozen roster path touched.
> Bridges **untouched**: WA-01 `sha256:28a646d2…`, WA-02 `sha256:d36ca851…`
> (`RestartCount=0`, same start times); PostgreSQL `vps-infra-postgres-1`
> untouched. Cash Freeze intact: **0** current postings (1,586 archive-epoch
> postings only), no financial posting, no bridge restart. Ingestion 9/9 cursors
> fresh with 0 errors, 61 messages in the last 24 h.
> Open: B2, B4, B5 (blocked — see §14.3), Phase D1 (after promotion), Phase E.
> Deferred under B3: typeahead on `/cash/archive` and `/cash/submissions`
> requires a new read-only employee lookup API endpoint.

> **Superseded banner — 2026-10-31, post-B1:**
> app image `sha256:8e4383a9544f567dbaaefb59af5e6167378c67817836b194c91c661df3448f25`
> (tag `local/al-rifai:20261031-b1-columns`, source `6165f35`; verified via
> `docker inspect al-rifai-app-1` and pinned in `compose.yaml` by commit `6d95083`).
> Mode `on`. Ledger **41** rows (0037 roster schema, 0038 seed, 0039 compatibility
> views, 0040 shadow state, 0041 CASH accountant). `escort_roster` = 10 active
> persons, `escort_roster_channel` = 26 active channels, `escort_roster_epoch` = 2.
> **Phase C SHADOW is LIVE** with `ALRIFAI_ROSTER_SOURCE=SHADOW`,
> `ALRIFAI_ROSTER_SHADOW_START=2026-10-31T15:47:18Z`,
> `ALRIFAI_ROSTER_SHADOW_DURATION_HOURS=36`; `roster_shadow_state` holds
> `mode=SHADOW, cycles_completed=3, diffs_found=0,
> auto_promote_blocked=false`, auto-promotion at `2026-11-02T03:47:18Z`.
> Promotion signal is **`roster_shadow.mode == "DB"`**, not `roster_mode`:
> `roster_mode` reports the configured env value and stays `SHADOW` until the env
> var itself changes.
> Bridges **untouched**: WA-01 `sha256:28a646d2…`
> (tag `local/vps-whatsapp:20261031-denied-record`), WA-02 `sha256:d36ca851…`
> (tag `local/vps-whatsapp:20261020-ingestion`). PostgreSQL `vps-infra-postgres-1`
> untouched.
> Rollback images retained: `sha256:1911fdfd…` (tag `20261031-typeahead`, Item A),
> `sha256:d2c2e675…` (tag `20261031-shadow-v2-fix1`), `sha256:d7a96b1e…` (tag
> `20261031-shadow-v2`), `sha256:ca27d77c…` (tag `20261030-phase4`, pre-SHADOW),
> and `local/al-rifai:rollback-app-phase2` (`sha256:1d4602c3…`).
> Phase D2 (`scripts/generate-bridge-profile.ts`, `scripts/check-profile-drift.ts`)
> is code-complete and execution-verified; the regenerated profile is **not
> deployed**, because it differs from the live file only in chat ordering.
> WA-01 healthy (9/9 chats ingesting, 0 cursor errors). Cash Freeze intact: **no**
> `CASH_SCOPE_*` change, no financial posting, no bridge restart.
> Superseded below: the `d2c2e675…` and `ca27d77c…` app-image banners, the
> "ledger 36 rows" figure, and the Phase 4.4 rollback note.

> **Current production position — 2026-10-31 (superseded by the block above):**
> app image `sha256:ca27d77cb55e5b48a351a64ae7d2117f732f3926988348e1050e336440d351a4`
> (tag `local/al-rifai:20261030-phase4`, source `a07c57f`; verified 2026-10-31
> via `docker inspect al-rifai-app-1`), mode `on` (Phase 3.1, 2026-10-30), 3 Cash Portal users (Owner `Admin`, USER
> `officeassistant`, USER `officeazzistant2`), ledger 36 rows (0031-0036 schema objects applied and all ledger rows recorded — 0032/0034/0035/0036 reconciled 2026-10-31; see the Migration ledger note in `docs/VPS_MAP.md`), 0 current postings, freeze intact. Legacy IP-bucket login rate limiter removed; new username-keyed throttle in `apps/al-rifai/lib/login-throttle.ts` (migration 0036 applied 2026-10-30, throttle deployed).
> Phase 4.4 deploy 2026-10-31 (compose pin commit `bfe81f1`); rollback image `sha256:1d4602c3…` (tag `local/al-rifai:20261030-phase2`).
> WA-01 healthy (9/9 approved chats ingesting, 0 cursor errors). The 2026-10-28 stall was cleared 2026-10-31 by Owner authorizing participant `8801880414177` (deferred item 1, step 1). The structural head-of-line-blocking defect is **fixed and deployed 2026-10-31** (step 2): bridge image `sha256:28a646d2…` (tag `local/vps-whatsapp:20261031-denied-record`, source `6e13a8e`) turns a denied participant into a skippable `DENIED` record instead of a page-level error, so a denial can never stall a chat again. Rollback image `sha256:ae009303…`. Step 3 (app must preserve bridge error codes) remains open.
> Full state, open items and deferred triggers: `NEXT-SESSION-HANDOFF.md` → "PHASE 4.4 DEPLOYED — 2026-10-31" and "CURRENT STATE — 2026-10-29".

> **UI visibility repair — 2026-10-27:** commit `a157f58` exposes the workspace
> routes through boundary-exact private-entry allowlists and adds the
> “PLATFORM WORKSPACE” groups to the legacy Cash/Vessel sidebars. Deployed image
> `sha256:5f3e2aad…` (app-only, healthy). Authenticated browser verification is
> pending Owner login. Details in NEXT-SESSION-HANDOFF.md.
>
> **Release — 2026-10-27 (application-only, FINAL):** release commit `2881926`
> deployed as image `sha256:34ce3060…` (candidate `d6f274…` superseded; first
> attempt rolled back over a missing worker module, fixed and redeployed).
> Migrations 0031/0032 are READY FOR OWNER APPROVAL and NOT applied; Cash Freeze
> intact (1,842 instructions / 0 current postings). Verified DB backup sha256
> `e38086b3…`, compose backup, rollback image `049627fa…`, and exact next steps
> are in the FINAL SYSTEM STATE section of NEXT-SESSION-HANDOFF.md. Source
> pushed to origin; working tree clean. Do not start a new implementation cycle
> without Owner direction.
>
> **Implementation update — 2026-10-27 (session 3):** source `main` at
> `2881926` (feature commits `6df2352`, `53b7ae3`; release fix `2881926`). Added the Vessel command API (`/api/vessel-programs`) and
> `/vessel-register` UI with server-resolved actor, revision/idempotency guards,
> append-only audit and migration-dependency gating; 0032 revised + rehearsed.
> Migration readiness pack: `apps/al-rifai/docs/MIGRATION-READINESS-0031-0032.md`.
> No production deployment, migration, WhatsApp, permission or Cash Freeze change.
>
> **Implementation update — 2026-10-27 (session 2):** source `main` is at
> `765835c` (feature commits `b8bd93d`, `1c604be`, `2805879`). Added: Cash
> submission/approval API + `/cash/submissions` queue UI
> (returns a migration-dependency response until the prepared schema is applied),
> rehearsed candidate migrations `0031` (append-only submissions/reviews) and
> `0032` (Vessel SECURITY DEFINER command layer), shadow duplicate classifier
> (`ALRIFAI_DUPLICATE_CLASSIFIER=SHADOW`, default off), and a vessel report panel.
> No production image, database, WhatsApp, permission or Cash Freeze change.
>
> **Implementation update — 2026-10-27 (post-audit session):** source `main` was
> `c93762d` (base `d5dfef28…`). New tested modules: Cash user policy guards,
> verified-Admin + shift confirmation evidence, duplicate classification,
> configurable payroll engine, Admin order-draft review UI, WhatsApp TXT format
> coverage, vessel report aggregates, and a **prepared but unapplied** Cash
> review migration candidate. No production image, database, WhatsApp,
> permission or Cash Freeze change occurred; the previously built candidate
> `sha256:d6f274…` remains undeployed. See `NEXT-SESSION-HANDOFF.md` header
> section for the full record.
> **Staleness corrections:** `ALRIFAI_CASH_SUPER_ADMIN_IDS` is present (1 id);
> §0.2 row counts drift daily; the Vessel confirmation writer exists and
> `confirmation_message_id` is populated (123 rows) — see §0.3 rules which still
> govern behaviour.

This section is the current authority for agent behaviour. Later sections remain
valid safety policy; where an older section contradicts this one, this section
wins.

> **Session-revocation parity DEPLOYED — 2026-10-28 20:53:** Cash Portal password
> changes now revoke other sessions through the shared `revokeOtherSessions`
> helper, audit the count and keep the caller signed in. Running image
> `sha256:946635bd…` (source `c113784`), mode `shadow`; rollback `sha256:d405d54f…`.
> Owner-side end-to-end confirmation of the change flow is still pending.

> **UI release DEPLOYED — 2026-10-28 19:59:** app image
> `sha256:d405d54f…` (source `8e23fff`, HEAD `77cbcef`) is live; `shadow`
> unchanged; PostgreSQL/WA untouched; identity and Cash Freeze verified after
> deploy. Rollback `sha256:2c0833c4…`. Account surface = Cash Portal
> (password only); `/admin` still unreachable in shadow; `on` not approved.
> Decision note: `apps/al-rifai/docs/DECISION-2026-10-28-UI-RELEASE.md`.

> **UI redesign — 2026-10-28 (source only, NOT deployed):** shared workspace
> design system (`app/workspace.css`, `PlatformPage` primitives) and responsive
> passes over dashboard, employees, transactions, admin, cash and vessel. Browser
> verified 60/60 (12 pages × 360/390/768/1280/1440, zero overflow) plus an
> authenticated Cash Portal HTTPS run. Candidate `sha256:d405d54f…` built, **not
> deployed**; production stays `sha256:2c0833c4…`
> in `shadow`. Known: `/admin` is unreachable in shadow mode. Record:
> `apps/al-rifai/docs/UI-REDESIGN-20261028.md`.

> **Owner suite — 2026-10-28 (source only, NOT deployed):** public homepage at
> `/` and `/signup` (no credential, no business data), instruction totals fixed to
> divide minor units (the Dipongkar "BDT 4,030,600" was a display error; true
> BDT 40,306.00), and password changes now revoke other sessions. Candidate image
> `sha256:c64d92a1…` built but **not deployed**; production remains
> `sha256:2c0833c4…` in `shadow`. Details: `NEXT-SESSION-HANDOFF.md`,
> `apps/al-rifai/docs/DIPONGKAR-AUDIT-20261028.md`.

> **Shadow redirect-loop repair — 2026-10-28 (deployed, `shadow` retained):** the
> 2026-10-28 `ERR_TOO_MANY_REDIRECTS` defect (a signed-in visitor was forwarded
> from `/login` to `/dashboard` while shadow refused to authorise it) is fixed in
> `cc10ed8`. A second shadow defect — browser navigations answered with a redirect
> instead of the `401` Basic challenge, which made every protected page
> unreachable by click — is fixed in `a32c9ef`: the `/login` redirect now applies
> only in `on` mode. Deployed image `sha256:2c0833c4…`; `shadow` unchanged;
> identity (1 `Admin` row, fingerprint `e4d99a36…`) and Cash Freeze (0 current
> postings) preserved. **`on` mode still NOT authorized.**

> **Production activation — 2026-10-28 (stages 1–3 done; `shadow` live; `on` NOT
> enabled):** Owner-authorized `0033` is applied (ledger 31 rows) and the verified
> candidate `sha256:52105520…` (commit `47f7e11`) is the running app image with
> `ALRIFAI_UNIFIED_AUTH_MODE=shadow`. Identity preserved exactly: id
> `81a73b32…c79`, `Admin`, ADMIN, version 2, fingerprint `e4d99a36…`, 24 sessions
> intact. Cash Freeze intact (1,842 current instructions / 0 current postings).
> Pre-migration backup `pre-0033-20261028.dump` (`2093fadf…`) restore-verified.
> Rollback image `sha256:5f3e2aad…` retained. **`on` mode, retiring the `validator`
> guard, and any credential change remain unauthorized and undone.** Owner login
> confirmation is the gate. Record: `apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md`.

> **Release candidate prepared — 2026-10-28 (source pushed, NOT deployed, NOT
> enabled):** `main` is at `47f7e11` on `origin`; candidate image
> `local/al-rifai:20261028-unified-auth`
> `sha256:52105520…` was built from it and **is not in use** — `compose.yaml` still
> pins `sha256:5f3e2aad…` and no container was recreated. Pre-change backup
> `pre-unified-auth-20261028.dump` (`b1f8c8fa…`) restore-verified. Identity unchanged
> (single `Admin` row, fingerprint `e4d99a36…`). Migration `0033` rehearsed twice,
> including guard-trigger and rollback, and remains **unapplied**. Record:
> `apps/al-rifai/docs/RELEASE-CANDIDATE-20261028.md`.

> **Unified Super Admin authentication — 2026-10-28 (source only, NOT deployed,
> NOT enabled):** the Owner's existing Cash Portal credential is now the unified
> identity in source. Added `/login`, `POST /api/auth/*`, `/admin` (server-gated
> on the configured Super Admin), a fail-closed dual path in `proxy.ts` gated by
> `ALRIFAI_UNIFIED_AUTH_MODE` (default `off` = deployed behaviour), and a prepared
> unapplied migration candidate `0033`. No user row, hash, session, container,
> database, WhatsApp or permission was changed; the legacy `validator` Basic guard
> is retained as the fallback. Report and cutover/rollback plan:
> `apps/al-rifai/docs/UNIFIED-AUTH-DESIGN.md`. Enabling `shadow`/`on`, applying
> 0033 and deploying all require exact Owner approval.

### 0.1 Architecture
- One application (`/opt/vps/apps/al-rifai`), one PostgreSQL database (`alrifai`),
  one app container (`al-rifai-app-1`) running the pinned image in `compose.yaml`.
- WA-01 / Bridge-1 is the authorized WhatsApp source for Cash and Vessel. Its
  verified paired account is the WhatsApp Admin identity. WA-02 is identity-only;
  never call its message/contact tools.
- Bridge SQLite (`/runtime/store/messages.db`) is transport evidence; the
  PostgreSQL mirror (`whatsapp_messages_original`) is the application source.

### 0.2 Verified data (2026-10-27, after Cash/Vessel recovery)
- Cash Current: 1,819 instructions / BDT 939,889.00, 0 postings, all REVIEW.
  Cash Archive: 1,610 instructions / 1,586 postings (legacy epoch).
- Vessel Current: 377 register rows (206 DRAFT / 171 REVIEW), 75 confirmed
  programs, 75 assignments; newest confirmed `startDate` 2026-10-25.
  Archive: 608 register rows, 5 draft programs.
- 37 REVIEW rows still carry `ASSIGNMENT_EVIDENCE_INCOMPLETE`; the 11 verified
  October assignments were reconciled into confirmed programs (6 EXACT, 5
  VARIANT) and 3 unmatched candidates remain in REVIEW.
- The reported Owner figure "BDT 945,890" is not reproducible from any canonical
  row, posting, candidate or duplicate; the ledger total is BDT 939,889.

### 0.2.1 Resolved defects and current verification state (2026-10-27)
- **Cash UI (RESOLVED):** the deployed app image contains the Cash aggregates,
  pagination and `ALRIFAI_CASH_SUPER_ADMIN_IDS`; the Owner confirmed the new
  frontend is visible (1,819 rows, BDT 939,889, Posted BDT 0, 19 pages).
- **Vessel freshness (RESOLVED):** the UI now shows canonical confirmed
  programs, latest program start, latest register activity and Draft/Review
  counts with working intake navigation.
- **WA-01 group identity (RESOLVED):** the native reader admits (a) the paired
  Admin PN/LID for its own outgoing group messages and (b) a client LID only
  when the bridge store resolved that same message to an allowlisted PN.
  Deployed bridge image `sha256:ae009303de09f564390d14a5ef1f7c30018040b52a73074f273a8dd67683bb33`;
  all 9 approved chats ingest with no error.
- **GitHub (COMPLETED):** repository architecture repaired and source pushed;
  see §2.4 and `NEXT-SESSION-HANDOFF.md` (GitHub section). Commits are now
  expected for source changes; production deployment still requires Owner
  approval and must record the deployed commit.

### 0.3 Business rules that must not be re-litigated
- Only the three authorized Escort Clients originate Vessel Orders; only the
  verified Admin → verified Accountant direct chat qualifies for Cash.
- The actual outgoing Admin WhatsApp message in the same client conversation is
  the Vessel confirmation. One program per Lighter.
- `MV`/`M.V.` prefixes are generic; spelling variants are matched by
  conversation + vessel context + Master Mobile + chronology, never by name
  alone. Never pad/truncate/fabricate a phone number.
- Escort Mobile is the Employee ID reference; `payout_mobile` is a payment
  destination and never creates or identifies an employee.
- Current vs Archive is separated by `dataset_epoch` / `dataset_scope`. Do not
  clear tables, mix Archive into Current, or rewrite statuses for display.

### 0.4 Prohibited without exact Owner authorization
- Production migrations or business-data writes; write-mode backfills;
  reprocessing the historical corpus; deployment/image release; app or Bridge
  restart; Live Sync activation; WA-02 permission changes; Cash posting,
  approval or settlement; WhatsApp sends; re-pairing; cursor resets; table
  clears; employee merges; scope expansion.

### 0.5 Mandatory before any production write
1. Identify the exact rows and source evidence. 2. Verify a usable backup.
3. Run a read-only dry run. 4. Confirm idempotency. 5. Confirm no Archive or
canonical row is silently overwritten. 6. Confirm no financial posting or
auto-confirmation.

### 0.6 Verification state
- Authenticated Owner Cash UI is **VERIFIED** by Owner confirmation (new
  frontend, 75 Vessel programs, updated Cash dashboard).
- Live WhatsApp E2E is **VERIFIED** for capture → identity → mirror → domain
  routing: Office-group event 1327 and client events 1328/1329 were recovered,
  and a genuinely new Owner message (event 1333) plus three new Accountant
  messages (events 1330–1332) were mirrored once each and classified
  `NOT_VESSEL_INTENT` / `NOT_OWNER_OUTGOING` with no business row created.
- Review age (presentation-only, source timestamps): 95 recent / 12 legacy /
  0 date-unknown among 107 actionable rows; unresolved employee links remain.
- Repositories: monorepo `/opt/vps` (branch `main`, remote
  `git@github.com:arshiyaazim/opt_vps.git`). Application and WhatsApp source are
  ordinary tracked directories; nested `.git` directories were archived under
  `/var/lib/vps/al-rifai/backups/git-20261027/`. See §2.4.
- Deployed app image:
  `sha256:049627fa8eb3c95aaed45b0fa2ac29b97965ca74e8bf44b6541a696f687a3963`.
  Deployed WA-01 image:
  `sha256:ae009303de09f564390d14a5ef1f7c30018040b52a73074f273a8dd67683bb33`.
  Both were built from the working tree before the source commit; record the
  commit SHA in every future deployment note.
- Source integrity: `docs/SOURCE_INTEGRITY_MANIFEST.txt` (plus `.sha256`,
  `.sha1`, `.md5`) covers source snapshot commit `06356b6`.
- Remaining limitation: the deployed images predate the source commit, so
  image-to-commit traceability is still NOT VERIFIED for the currently running
  containers.
- Reference documents: `docs/VESSEL-WORKFLOW.md` (business rules),
  `NEXT-SESSION-HANDOFF.md` (state), `docs/VPS_MAP.md` (infrastructure).

### Deployment procedure guardrails (verified 2026-10-31, Phase 4.4)

These rules were established or confirmed during the Phase 4.4 deploy
cycle. Any future deploy that violates them will fail or silently
produce false evidence. Agents must follow these verbatim unless the
Owner explicitly suspends a rule for a specific action.

**1. Compose image pin sed — keep the `sha256:` prefix on both sides.**

The deploy pin edit must preserve the `sha256:` prefix:

```bash
# CORRECT
sed -i "s|sha256:$OLD_HEX|sha256:$NEW_HEX|" compose.yaml
```

```bash
# WRONG — strips the prefix from the replacement side, breaks resolution
sed -i "s|sha256:$OLD_HEX|$NEW_HEX|" compose.yaml
sed -i "s|$OLD_PIN|${NEW_IMAGE_ID#sha256:}|" compose.yaml
```

A bare 64-hex string without the `sha256:` prefix is not a valid image
reference. Compose will try to resolve it as a repository name and
fail. The container may continue running from cache, but the next
`docker compose up -d` will fail. Always verify immediately with:

```bash
grep '^    image:' compose.yaml   # must start with sha256:
docker compose config -q          # must exit 0
```

**2. Deploy gate = TAP block 0 failures, not `pnpm test` exit 0.**

`pnpm test` cannot exit 0 in an isolated container because
`tests/source-register.mjs` is a post-TAP script that requires real
Owner evidence. The canonical gate (Owner ruling, 2026-10-30) is:

- TAP block: 0 failures (expected 237/240 pass, 3 skip)
- Full glob suite (`node --test tests/*.mjs`) subtest-level failures: 0
- File-level failures acceptable only if they match the known
  evidence/DB/server-dependent set (see NEXT-SESSION-HANDOFF.md
  "Expected test failures").

Post-TAP exit code is ignored for the deploy gate.

**3. Runtime Docker image does NOT ship `tests/`.**

The Dockerfile runtime stage is a Next.js standalone output and
contains only `lib/`, `scripts/`, `db/`, `candidates/identity-review/`,
build output, and `node_modules`. Running `node --test tests/*.mjs`
inside the production image yields `1..0` and exits 0, which is NOT
evidence of passing tests — it's evidence of zero test files found.

Verify tests at the source commit level using the isolated harness:

```bash
mkdir -p /tmp/alrifai-synthetic-evidence
echo '[]' > /tmp/alrifai-synthetic-evidence/chat-archive.json
docker run --rm \
  -v /opt/vps/apps/al-rifai:/app \
  -v /tmp/alrifai-synthetic-evidence:/var/lib/vps/al-rifai/evidence:ro \
  -w /app node:22.23.3-alpine \
  sh -c "node --test tests/*.mjs"
```

Pair this with image provenance (byte-identical source files vs
`git show <commit>:<path>`) to prove the deployed artifact matches the
tested commit.

**4. Log-based rollback rule — baseline-then-diff.**

Before any restart or deploy, capture a baseline:

```bash
docker logs al-rifai-app-1 --since 15m 2>&1 \
  | sed 's/[0-9T:.-]\{10,\}//g' | sort -u > /tmp/alrifai-log-baseline.txt
```

Roll back only for error signatures ABSENT from the baseline. Known
baseline lines that are NEVER rollback triggers:

- `WA-01 approved chat ingestion failed; cursor retained (NATIVE_READER_UNAVAILABLE).`
  (Phase 3.2, deferred by Owner.)

**5. Pre-deploy artifacts stored in `/tmp/` are not durable.**

DB dumps and compose backups written to `/tmp/` survive container
restarts but NOT host reboots or disk cleanup. If a backup is intended
as a long-term rollback artifact, copy it to persistent storage
(outside `/var/lib/vps/al-rifai/evidence/`) with Owner-approved
destination and mode 600 preserved.

**6. Image digest and short SHA conventions.**

- Full digest: `sha256:<64 hex>` — use in compose.yaml, `docker inspect`
  outputs, and the authoritative production position banner.
- Short SHA: first 8 hex chars (e.g. `ca27d77c`) — use in commit
  messages, chat, log table rows, and informal references.
- Tag: `local/al-rifai:<YYYYMMDD>-<label>` plus
  `local/al-rifai:<label>-<git-short-sha>` for source traceability.

---

## 1. Cash Domain Development Unfreeze and Owner Boundaries

The Owner has removed the previous Cash development freeze for the explicitly
authorized Cash, WhatsApp, Message Mirror, Vessel, and UI integration work.
This permits source and isolated-test changes; it does **not** remove business
security controls or authorize production actions.

Preserve the verified Admin-to-designated-Accountant eligibility, separate
employee identity from payout numbers, source/sender/recipient verification,
authentication, roles, approval/review controls, duplicate protection, and
original source evidence. Route uncertain identities or intent to review.
Do not automatically approve or post financial transactions. Do not change
legacy records or reconcile the Mirror against legacy business data.

Production PostgreSQL migrations or writes, deployment/image release, service
or Bridge restart, Live Sync activation, historical backfill/reprocessing,
WA-02 permission changes, and financial posting/approval/settlement remain
prohibited unless the Owner separately authorizes the exact production action.
WA-02 remains identity-only by policy; never call its message/contact tools
from an integration worker. WA-01 now exposes only
`get_native_account_identity`, `list_native_events`, `list_native_messages` and
`get_contact`; WA-02 still exposes identity plus broader legacy message/contact
tools, which is a blocker to report — not authority to use or expand them.

The current path-specific development authorization covers the paths listed
in the Owner's “Cash Unfreeze & WhatsApp Integration Recovery” and
“Documentation Synchronization” instructions. Do not extend edits to
additional protected paths without a new exact-path Owner authorization.
Never read or print credentials or secret-file contents. Do not send WhatsApp
messages or create credentials.

The advisory path guard is at `apps/al-rifai/scripts/cash-freeze-guard.mjs`.
It is not an approval authority, a production gate, or a substitute for
repository review, CODEOWNERS, branch protection, or production approval.
Preserve approved work and report exact changed paths and validation evidence.

---

## 2. Runtime Reality — Host vs Container

**The host shell is not the AL-RIFA'I app runtime.** The canonical runtime is the Docker app container `al-rifai-app-1`. Do not assume host shell binaries are authoritative.

### 2.1 Host executables (verified)
| Tool | Status | Path / Version |
|---|---|---|
| Node.js | **not installed on host** | — |
| npm | **not installed on host** | — |
| pnpm | **not installed on host** | — |
| npx | **not installed on host** | — |
| Corepack | **not installed on host** | — |
| Python 3 | installed | `/usr/bin/python3` (3.10.12) |
| pip / uv / pytest | not installed | — |
| Docker | installed | `/usr/bin/docker` (v29.8.2) |
| Docker Compose | installed | `/usr/bin/docker compose` (v5.6.0) |
| psql | not installed on host | use via `docker exec` |

### 2.2 Container runtimes (verified)
- **App container `al-rifai-app-1`:** Node 22.23.3 (verified 2026-10-21), built from `node:22.23.3-bookworm`.
- **Build stage:** uses pinned `pnpm` with `--frozen-lockfile`. **Production runtime image does not contain pnpm or python3.** Do not treat the running container as a build/test environment.
- **PostgreSQL container `vps-infra-postgres-1`:** `postgres:16-alpine`.
- **WhatsApp bridges:** `vps-whatsapp-wa-01-cap4-20261011` (UID 10002) runs
  `local/vps-whatsapp:20261027-native-writer`; `vps-whatsapp-wa-02-cap4-20261011`
  (UID 10003) runs `local/vps-whatsapp:20261020-ingestion`.

### 2.3 Python
- AL-RIFA'I app runtime does **not** use Python.
- Host Python exists for VPS tooling only; there is no project venv.

### 2.4 Git and GitHub source control
- **Repository:** `/opt/vps` is the single monorepo; remote
  `git@github.com:arshiyaazim/opt_vps.git`, branch `main`.
- **Tracked source:** `apps/al-rifai/` (Next.js app, Cash/Vessel domain, db
  migrations, scripts, tests), `services/whatsapp/source/` (Go bridge + Python
  MCP server), `services/whatsapp/compose.yaml`, `infra/`, `docs/` and the root
  operational documents.
- **Not tracked (must stay local):** runtime data, credentials, WhatsApp
  session/message stores, `apps/al-rifai/data/*`, `import/`, `staging/`,
  `qualification/` evidence, `node_modules`, `.next`, `.venv`, `.pnpm-store`,
  dumps, logs and archives. `.gitignore` encodes this.
- **Nested histories:** the former nested repositories (`apps/al-rifai`,
  `services/whatsapp/source`) were flattened. Their full histories are preserved
  as verified bundles and bare clones in
  `/var/lib/vps/al-rifai/backups/git-20261027/`. Do not delete that directory.
- **Commands:**
  ```bash
  cd /opt/vps
  git status --short
  git add <explicit paths>          # NEVER `git add -A`
  git commit -m "<scope>: <change>"  # source change
  git push origin main
  ```
- **Staging rule (established 2026-10-31):** never run `git add -A` or
  `git add .`. Stage explicit paths only. A blanket add once swept 16 junk files
  (`.bak`, `compose.yaml.bak`, and copies of Production evidence JSON) into a
  commit whose message described unrelated work, and it had to be reverted.
  Always read `git status --short` before committing and confirm every staged
  path belongs to the change.
- **Rules:** never commit `.env`/secrets or runtime data; never force-push;
  never rewrite published history; production deploy/restart still needs Owner
  approval and must record the deployed commit SHA and image digest.
- **Integrity:** `docs/SOURCE_INTEGRITY_MANIFEST.txt` (SHA-256 primary, SHA-1 and
  MD5 supplementary) with companion `.sha256`/`.sha1`/`.md5` files; regenerate
  for each release commit.

---

## 3. Canonical Paths

| Purpose | Path |
|---|---|
| Project root | `/opt/vps/apps/al-rifai` |
| App env file | `/etc/vps/apps/al-rifai/app.env` |
| DB password file (mounted secret, never printed) | `/etc/vps/apps/al-rifai/database_password` |
| WA-01 control dir | `/var/lib/vps/whatsapp/wa-01/control` (mode `0710`, owner `10002:10002`) |
| WA-02 control dir | `/var/lib/vps/whatsapp/wa-02/control` (mode `0710`, owner `10003:10003`) |
| WA-01 / WA-02 MCP socket | `<control>/mcp.sock` (mode `0660`, group-owned by bridge GID) |
| Runtime evidence dir | `/var/lib/vps/al-rifai/evidence` |

**Permission model:** App container runs as UID `10001` with supplementary groups `10002,10003`. Control directories use mode `0710` so the app can traverse to the socket without listing the directory. **Do not weaken these permissions** (no `0777`, no public read on `store`/`outbox`/`control`).

**Current control mounts:** `apps/al-rifai/compose.yaml` mounts both control
directories with `read_only: false` so the app can use the existing Unix
sockets. This was an Owner-authorized, path-limited deployment exception.
The host directories remain `0710`; socket files were observed as `0660`.
Do not generalize this exception to other paths or services.

---

## 4. PostgreSQL

- **Container:** `vps-infra-postgres-1`
- **Database:** `alrifai` (hardcoded in `db/postgres.mjs`; `PGDATABASE` is not read)
- **Role:** `alrifai_app` (default in code)
- **Port:** `5432` (hardcoded in code)
- **Credentials:** supplied via mounted secret file (`PGPASSWORD_FILE`), never echoed into logs or docs.
- **Connection strategy:** existing Docker network + mounted secret. Do **not** create new DB users or change credentials.

### Environment variable NAMES (never print or copy values)
Present in `app.env` / compose:
- `ALRIFAI_EVIDENCE_DIR`, `ALRIFAI_REVIEW_PROFILE`,
  `ALRIFAI_VALIDATION_PASSWORD_FILE`, `ALRIFAI_REVIEW_PASSWORD_FILE`,
  `ALRIFAI_NATIVE_MANIFEST_FILE`, `NODE_ENV`, `PGHOST`, `PGPASSWORD_FILE`,
  `PGSCHEMA`
- Cash: `ALRIFAI_CASH_OWNER_PERSON_REF`, `ALRIFAI_CASH_OWNER_BINDING_REF`,
  `ALRIFAI_CASH_ORIGIN`, `ALRIFAI_LIVE_CASH_SYNC`,
  `ALRIFAI_LIVE_CASH_INTENT_CAPTURE`
- Vessel: `ALRIFAI_VESSEL_PROCESSING_ENABLED`
- Mirror: `ALRIFAI_MESSAGE_MIRROR_ENABLED`, `ALRIFAI_MESSAGE_MIRROR_MODE`,
  `ALRIFAI_MIRROR_WORKER_PASSWORD_FILE`
- WhatsApp: `WHATSAPP_WA01_MCP_SOCKET`, `WHATSAPP_WA01_READER_TOKEN_FILE`,
  `WHATSAPP_WA02_MCP_SOCKET`, `WHATSAPP_WA02_READER_TOKEN_FILE`
- **Expected but absent (verified 2026-10-27):** `ALRIFAI_CASH_SUPER_ADMIN_IDS`
  — its absence blocks the Cash summary API (see §0.2.1).

> `PGPORT`, `PGDATABASE`, and `PGUSER` are not read from `app.env`: port `5432`, database `alrifai`, and the default role `alrifai_app` are defined in code. `PGHOST` may override the default host. Do not copy plaintext credentials into AGENTS.md or logs.

### Compose precedence
`compose.yaml` → `env_file` (`/etc/vps/apps/al-rifai/app.env`) → explicit `environment:` overrides → bind-mounted secret files. The app relies on **file-backed secret mounts**, not workspace `.env` values in tracked source.

---

## 5. API Endpoints (AL-RIFA'I App)

Route inventory from `app/api/**/route.ts` and `app/candidate-api/[...path]/route.ts`:

| Path | Methods | Notes |
|---|---|---|
| `/api/health` | `GET` | Database-backed health check. |
| `/api/register` | `GET` | Private register read. |
| `/api/vessels` | `GET` | Private vessel register read. |
| `/api/program-tools` | `GET` | Private program workflow read. |
| `/api/escort-register` | `GET` | Private escort register read. |
| `/api/conversations` | `GET` | Private conversation/archive read. |
| `/api/import-audit` | `GET` | Private import evidence read. |
| `/api/core` | `GET` | Private integration connection state. |
| `/api/operations` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Non-GET handlers are present but return method-not-allowed. |
| `/api/assistant` | `POST` | Private read-only question endpoint. |
| `/api/cash/[...path]` | `GET`, `POST`, `PATCH` | Dynamic Cash route; endpoint inventory only. Cash source development is unfrozen within the Owner-authorized scope; production financial controls remain in force. |
| `/candidate-api/[...path]` | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` | Dynamic candidate API host route. |

Do not probe write endpoints during audits. This table describes registered route handlers, not authorization outcomes or business behavior.

---

## 6. Safe Commands for Agents

### 6.1 Application tests (isolated, non-production)
```bash
# Run only in an authorized isolated Node.js 22 environment, never in production.
# package.json pins pnpm@11.25.0; install from the committed lockfile:
cd /opt/vps/apps/al-rifai
pnpm install --frozen-lockfile
pnpm test
```

The project requires Node.js `>=22.13.0`. Use the pnpm version pinned in
`package.json`; do not use npm/npx or the production container for tests.

### 6.2 Typecheck, lint, build
```bash
# Use the same authorized isolated Node.js 22 environment and installed dependencies:
cd /opt/vps/apps/al-rifai
pnpm typecheck
pnpm lint
pnpm build
```

Do not build or redeploy production images unless separately authorized.

### 6.3 Read-only health & inventory
```bash
# App health (local, non-mutating):
curl -fsS http://127.0.0.1:3000/api/health

# App DB verification (bounded, read-only):
docker exec -i vps-infra-postgres-1 psql -U alrifai_app -d alrifai -At \
  -c "SELECT count(*) FROM public.whatsapp_messages_original;"

# Container status:
docker ps --format '{{.Names}}\t{{.Status}}' \
  | grep -E 'al-rifai-app|wa-01|wa-02|postgres'

# WhatsApp control dir inspection (read-only):
ls -l /var/lib/vps/whatsapp/wa-01/control
ls -l /var/lib/vps/whatsapp/wa-02/control
```

### 6.4 WhatsApp bridge checks (read-only only)
- Inspect mounted control sockets and container health only.
- Do **not** restart, re-pair, reset, or wipe sessions.
- Do **not** overwrite credentials.
- Bridge health probe (via `docker exec`, uses mounted reader token — token value never printed):
  ```bash
  docker exec vps-whatsapp-wa-01-cap4-20261011 sh -c \
    'wget -qO- --timeout=5 http://127.0.0.1:8080/api/health'
  ```

---

## 7. Production Safety Restrictions

### 7.1 Absolute prohibitions (no exceptions, even with Owner authorization)
- Do not use `nsenter`, `strace`, `gdb`, or any host-level namespace/process
  attachment tool to enter a container's network, PID, or mount namespace.
- Do not `cat`, `head`, `tail`, `less`, or otherwise read the **contents** of
  any file under `/etc/vps/apps/al-rifai/auth/`,
  `/etc/vps/services/whatsapp/*.token`, or any `*_PASSWORD_FILE` /
  `*_TOKEN_FILE` path. Use `test -r <file>` to verify existence and
  readability only.
- Do not print, echo, log, or include any secret value (token, password,
  private key) in chat output, tool output, or documentation.

### 7.2 Prohibited without explicit Owner authorization
- Restart or redeploy of app or WhatsApp bridges
- Migration, reset, or schema change of PostgreSQL
- Payment posting or approval changes
- WhatsApp pairing reset, session wipe, or credential overwrite
- Production business-data writes
- Synthetic business-data creation
- Permission changes on `/var/lib/vps/whatsapp/wa-0X/{store,outbox,control}`
  beyond the documented `0710` traverse model
- Removal of any running container without verified ownership

### 7.3 Bridge health check — approved method only
- Use `docker exec <container> sh -c 'wget -qO- --timeout=5 http://127.0.0.1:8080/api/health'`
  as shown in Section 6.4.
- If the bridge container lacks an HTTP client, **report the limitation** —
  do not work around it with `nsenter` or host-network access.

---

## 8. Docker Inventory (re-verified 2026-10-31, post-cleanup)

**4 containers running** on the VPS, all Compose-managed, and **no stopped
containers** — `docker ps -a` returns exactly these four. An earlier 2026-10-21/27
observation recorded 14 (these four plus ten GitHub MCP tooling containers); the
ten tooling containers are gone. A set of 17 exited containers left by abandoned
image-build attempts was removed on 2026-10-31 with Owner authorization, after
being listed by ID. The inventory is an observation, not a permanent count:
re-run `docker ps -a` before relying on it.

### Managed by Compose (4)

| Container | Image | Project | Compose file |
|---|---|---|---|
| `al-rifai-app-1` | `sha256:8e4383a9…` (app) | `al-rifai` | `apps/al-rifai/compose.yaml` |
| `vps-infra-postgres-1` | `postgres:16-alpine` | `vps-infra` | `infra/compose.yaml` |
| `vps-whatsapp-wa-01-cap4-20261011` | `sha256:28a646d2…` (tag `local/vps-whatsapp:20261031-denied-record`) | `vps-whatsapp-cap4-wa01` (runtime label) | `services/whatsapp/compose.yaml` (declared name: `vps-whatsapp-privacy`) |
| `vps-whatsapp-wa-02-cap4-20261011` | `sha256:d36ca851…` (tag `local/vps-whatsapp:20261020-ingestion`) | `vps-whatsapp-cap4-wa01` (runtime label) | same |

> The WhatsApp Compose file declares `name: vps-whatsapp-privacy`, but containers run under project `vps-whatsapp-cap4-wa01` due to a `-p` override at deploy time. This is intentional; do not reconcile without Owner review.

> **A stopped container with an auto-generated name is build debris, not a
> service.** Failed `docker build` attempts leave them behind. List them with
> `docker ps -a --filter status=exited` and remove them by explicit ID only after
> Owner authorization (§13.18). Never `docker system prune -a` — it would take the
> retained rollback images with it.

### Formerly observed, now absent

Ten `ghcr.io/github/github-mcp-server:0.29.0` containers
(`awesome_mccarthy`, `unruffled_kepler`, `stoic_wilbur`, `dazzling_shockley`,
`strange_banach`, `loving_payne`, `wizardly_einstein`, `elegant_jang`,
`elated_ellis`, `youthful_nightingale`) were running on 2026-10-21 and
re-verified on 2026-10-27. On 2026-10-31 **none of them exists**, running or
stopped. Recorded here so their disappearance is not mistaken for a regression
by a later reader, and so nobody re-creates them from this document.

---

## 9. Troubleshooting Guide

| Symptom | First action |
|---|---|
| `node`/`npm` missing on host | Use the Dockerized app runtime or the ephemeral `node:22.23.3-bookworm` container. Do not install Node on the host. |
| App dependencies missing in a validation env | Use the checked-in lockfile; run `pnpm install --frozen-lockfile` in the authorized isolated env only. Never install into production. |
| Mounted file missing | Check `/etc/vps/apps/al-rifai/` and the Compose bind-mount targets before assuming a code defect. |
| DB access fails | Verify container is healthy (`docker ps`), check secret file path, then run bounded read-only SQL against `alrifai`. |
| App cannot reach bridge socket | Confirm control dir mode is `0710` and owned by bridge UID; confirm app UID 10001 has supplementary group matching bridge GID (10002 or 10003); confirm socket exists and mode is `0660`. **Do not `chmod 777` or widen permissions.** |
| Bridge log shows disconnect/reconnect | This is observable in logs but is **not** sufficient grounds to restart. Document and escalate to Owner. |

---

## 10. Agent Readiness Checklist

Before any action, an agent must confirm:
- [ ] The action is **read-only**, **or** it has explicit Owner authorization.
- [ ] Any protected-path edit is within the Owner's exact authorized paths.
- [ ] Cash identity, source, permission, review, and financial controls remain intact.
- [ ] The action does not restart, re-pair, or reconfigure any container.
- [ ] Secrets are not read into logs, chat, or documentation.
- [ ] If a tool/binary is missing on host, the Dockerized runtime is used instead.
- [ ] Permission model on WhatsApp control dirs (`0710` + `0660` socket) is preserved.
- [ ] Any discovered discrepancy (container count, Compose labels, env mismatch) is **reported**, not auto-fixed.

**When in doubt: stop, document, request Owner authorization.**
## 11. Control Directory Permission Persistence

### P1: systemd-tmpfiles (ACTIVE — installed Session 3)
Config: /etc/tmpfiles.d/vps-whatsapp-control.conf
Contents:
    d /var/lib/vps/whatsapp/wa-01/control 0710 10002 10002 -
    d /var/lib/vps/whatsapp/wa-02/control 0710 10003 10003 -
Apply manually: sudo systemd-tmpfiles --create
Runs automatically on boot via systemd-tmpfiles-setup.service.
After any bridge recreate, run:
    sudo systemd-tmpfiles --create /etc/tmpfiles.d/vps-whatsapp-control.conf

### P2: Bridge Entrypoint (BACKUP — not yet applied)
If P1 fails after reboot, add to
/opt/vps/services/whatsapp/source/service-entrypoint.sh:
    chmod 0710 /runtime/control 2>/dev/null || true
Then rebuild image and recreate bridges.

## 12. Al-Rifa'i live workflow and evidence rules

- The existing application at `/opt/vps/apps/al-rifai` and its single
  PostgreSQL database `alrifai` are the implementation target. Do not create
  a replacement app or database.
- **History (2026-10-25):** the Owner's Message Mirror direction identified
  WA-01 and WA-02 as intended sources and required WA-03 support; at that time
  the running artifact lacked the Mirror worker, migration 0025 was not applied,
  no activation cursor existed, the `whatsapp_mirror` schema was absent, and
  WA-01 exposed only stored/archive MCP tools. Keep this as dated history; it no
  longer describes the running system.
- **Current (2026-10-27):** migration 0025 is applied and ledgered (30 ledger
  rows) and the `whatsapp_mirror` schema exists. The Mirror worker is present in
  the image but **disabled** (`ALRIFAI_MESSAGE_MIRROR_ENABLED=0`,
  `ALRIFAI_MESSAGE_MIRROR_MODE=EVIDENCE_ONLY`). Live ingestion uses the WA-01
  native reader: 9/9 approved-scope cursors in `whatsapp_native_sync_state` and
  2/2 Cash channels in `cash_live_sync_channels`.
- **WA-01 tools (2026-10-27):** `get_native_account_identity`,
  `list_native_events`, `list_native_messages`, `get_contact`. WA-02 still
  exposes identity plus legacy message/contact tools; never call them from an
  integration worker and do not infer grants from a runtime tool list.
- **Bridge health probe:** still returns exit code 6 although `wget` exists in
  both containers. This is a known limitation; do not change permissions or use
  `nsenter`/host networking to work around it.
- Cash development is unfrozen only within the Owner-authorized scope.
  Preserve original source evidence; never automatically delete business
  records, approve uncertain cases, post Cash, replay historical ingestion,
  or backfill.
- A healthy app, database, or bridge does not establish successful
  end-to-end business processing. Perform a bounded, read-only, function-by-
  function audit before changing live ingestion; do not infer workflow
  success from health, counts, source code, or a prior Agent summary.
- Start from `NEXT-SESSION-HANDOFF.md` and its dated Current Production
  Position / issue register. Preserve prior evidence and dirty worktree state;
  record new observations with their timestamp and source rather than
  replacing older results.
- Report findings by business function: WhatsApp Receive, Native Message
  Persistence, PostgreSQL Mirroring, identity validation, Escort parsing and
  duplicate detection, Accounts parsing, Review queue, Register/Accounts
  visibility, recovery, source traceability, and end-to-end completion.
- Do not claim historical reconciliation is complete without source-level
  evidence. Historical TXT/Excel ranking, import, deduplication, correction,
  backfill, and archive-wide reprocessing require separate Owner instructions.
- Never read message bodies or Cash business rows during metadata-only
  audits. If a requested conclusion requires content, credentials, writes, or
  scope expansion, mark it NOT VERIFIED and request the required authorization.

### Current Blockers Reference

See `NEXT-SESSION-HANDOFF.md`, **GITHUB SOURCE CONTROL AND SESSION HANDOFF —
2026-10-27 (authoritative)**, for the current production snapshot, the final Git
architecture, GitHub push verification, the source integrity manifest and the
safe next steps. The 2026-10-24, 2026-10-25 and earlier 2026-10-27 sections
remain historical evidence and are superseded by that section and by §0 of this
file. Source changes now follow §2.4; production actions still require Owner
approval.

## 13. Operating rules (proven 2026-10-28 and 2026-10-29)

These rules are not negotiable. If an incident seems to require breaking one, stop and ask the Owner, even if recovery is delayed. A delayed recovery is preferable to an unauthorised one.

1. **No credential changes without explicit instruction.** This covers the Owner's account and every other account. During incident recovery, propose a disposable test account or ask first. An explicit, scoped Owner instruction is required for any reset, and the reset is limited to the named account.
2. **No session deletion without explicit instruction.** A reset that ends one named account's sessions is allowed only when the reset itself was explicitly instructed.
3. **Deploy the exact verified artifact.** Never re-cut an image to piggyback changes. The digest that passed verification is the digest that is deployed.
4. **Keep two rollback images locally at all times.** Verify both are present and id-matched before any deploy.
5. **Take a separate pg_dump before every deploy or migration.** Hash it (`.sha256` sidecar), label it `pre-<change>-<YYYYMMDD-HHMM>.dump`, and keep it even if it is never used.
6. **Static guards in tests** must assert single implementation, write-after-verify ordering, audit-field presence, and that security guards and cookie attributes are unchanged.
7. **The full canonical suite must pass before any deploy report.** Spot checks are not sufficient. Canonical means the `package.json` "test" command, run as written.
8. **Never run production services with `docker run` outside compose.** Use `docker compose -f compose.yaml up -d --no-deps app`, or `docker compose -f compose.yaml restart app` to clear in-memory state. Outside compose, HTTPS, networks, and dependencies are dropped.
9. **`app.env` must remain `600 root:root` at all times.** Verify after any container recreation.
10. **No file-permission changes on `app.env` or any secrets file.**
11. **No WhatsApp container restarts and no bridge changes without explicit approval.** Read-only diagnosis is allowed.
12. **Record the deployed commit SHA and image digest** in every deployment note, and push source before deploying.
13. **Never run `systemctl restart docker`.** The WhatsApp bridges run with
    `RestartPolicy=no`, so a daemon restart stops them and nothing brings them
    back. This caused a **2 h 34 m ingestion outage on 2026-10-31**. To restart
    one container use `docker restart <container>`; to restart the app use
    `docker compose -f compose.yaml up -d --no-deps app`. A host-level daemon
    restart requires explicit Owner authorization and a maintenance window.
14. **A failed build is a stop-and-ask event, never a workaround event.** If
    BuildKit cannot resolve a build context, or a build step fails for an
    environmental reason, stop and report. Do not restart the daemon, do not
    rewrite the `Dockerfile` to sidestep it, do not create placeholder inputs,
    and do not `mkdir` a missing mount. Three separate "fixes" of this kind on
    2026-10-31 produced a broken `Dockerfile`, a junk commit, and destroyed
    evidence files. The correct answer is `--build-context evidence=<path>
    docker build …`.
15. **No writes to `/var/lib/vps/al-rifai/evidence/` without explicit Owner
    authorization.** Those files are checksum-pinned in
    `apps/al-rifai/docs/evidence-checksums.json` and mounted read-only into the
    app; overwriting one turns every evidence-backed route into a 500. A build
    attempt on 2026-10-31 replaced five of them with `{}` placeholders. Read is
    allowed; write, move, chmod or chown is not.
16. **No edits to `/etc/vps/apps/al-rifai/app.env` without explicit Owner
    authorization**, and never as a side effect of another task. When
    authorized, change only the named keys, verify `600 root:root`, verify no
    duplicate or orphan lines, and never restart the app as part of the edit.
17. **Never `git add -A` or `git add .`.** Stage explicit paths only. Confirm
    with `git status --short` that every staged path belongs to the change. See
    §2.4.
18. **Destructive or irreversible production actions need an explicit go-ahead
    naming that action.** Deleting or overwriting rows or files, truncating,
    dropping, rotating credentials, restarting a service, and re-cutting an
    image all fall under this. Approval of a plan is not approval of an
    unlisted destructive step inside it.
19. **`/tmp` is not durable.** Artifacts written to `/tmp` (or `/tmp/opencode`)
    vanish on reboot or disk cleanup. Anything that must survive belongs in
    persistent storage with owner-approved location and mode 600.
20. **The roster SHADOW observation window is frozen.** While
    `ALRIFAI_ROSTER_SOURCE=SHADOW` (started `2026-10-31T15:47:18Z`, promotion
    `2026-11-02T03:47:18Z`), do **not** touch: `lib/conversation-scope.ts`;
    the scope-loading path in `scripts/message-ingestion-worker.ts`;
    `public.roster_shadow_state`; migrations `0037`–`0041`; or the
    `ALRIFAI_ROSTER_*` values in `app.env`. A diff or a block must be reported,
    never remediated. Unfreezing requires an Owner ruling, not an inference.
    **Recorded exception:** on 2026-11-01 the Owner authorized one bounded
    change to the two frozen source files — a wall-clock 10 minute recheck of
    the scope load (and therefore of the SHADOW comparison and the
    auto-promotion predicate) inside the worker loop in
    `scripts/message-ingestion-worker.ts`, and `COALESCE(canonical_person_ref, id)`
    as the roster person reference plus a `person_ref_mismatch` comparison
    bucket in `lib/conversation-scope.ts`. Committed as `6b457a6`, deployed as
    image `20261101-shadow-recheck` (pin `836e8b1`). The scope logic, the
    observation window, `diffs_found=0`, `auto_promote_at` and every roster
    table and env value were left unchanged; the freeze resumed on completion.
    That exception is not a precedent — no further edit to these paths is
    authorized without a new, equally explicit Owner ruling.
    **RESOLVED 2026-11-02 — the freeze is LIFTED, not extended.** The window
    closed by its own terms: the 36 h period completed with `diffs_found=0` on
    all 60 cycles, auto-promotion fired at `03:50:59Z`
    (`roster_shadow.mode="DB"`), and Phase D1 set `ALRIFAI_ROSTER_SOURCE=DB`, so
    the `=SHADOW` condition this rule was written against no longer holds. No
    further ruling is needed to resume ordinary work here. The paths remain
    protected by the normal rules: an unfrozen path is not a licence to edit the
    roster silently, `public.roster_shadow_state` stays the promotion record
    (`mode=DB`, `cycles_completed=60`, `diffs_found=0`), and the
    `ALRIFAI_ROSTER_*` values are still changed only by explicit Owner direction.

21. **A roster change is not complete until the D2 bridge-profile cycle is
    done.** Any change to `escort_roster`, `escort_roster_channel` or
    `escort_roster_epoch` — adding or removing a person, adding or removing a
    channel, or changing a domain — MUST be followed by the full D2 cycle:
    1. regenerate the profile (`scripts/generate-bridge-profile.ts`);
    2. drift-check it (`scripts/check-profile-drift.ts`);
    3. obtain Owner authorization of that exact diff;
    4. deploy the profile to the WA-01 control dir (`root:whatsapp-wa-01`,
       `0440`, backed up first);
    5. restart WA-01 **once** with `docker restart` — never
       `systemctl restart docker`, and never WA-02, PostgreSQL or the app.
    The order matters in one specific way: the renderer derives `chats` from
    `escort_roster_channel`, so the roster rows must exist **before**
    regeneration, and the bridge must be restarted **after** the deploy. A
    roster edit without this cycle leaves the bridge unable to read the new
    chats — the symptom is per-chat `NATIVE_READER_UNAVAILABLE`, a
    `15 s → 60 s` ingestion backoff, and two error lines per cycle. That
    happened on 2026-11-02 and is recorded in `docs/NEXT-HANDOFF.md`. Note also
    that a correctly-detected functional change makes the drift checker exit
    **1**; that is success, not an error.

## 14. Work items and recent history (updated 2026-11-04)

### 14.1 Item tracking

| Item | Scope | Status |
|---|---|---|
| **T01** | Target 01 — logical Vessel order identity and fragment merge, Mother-vessel compatibility, runtime packaging for the reconciliation producer, two historical Program recoveries | **DEPLOYED** ✅ image `sha256:066c9a1c…`, source `46cb23b`, pin `bd04e94` |
| **T02** | Target 02 — free-text order parser (P1), register row → `CONFIRMED` on Program creation (P2), fail-closed register link | **DEPLOYED** ✅ image `sha256:b058dd48…`, source `ddbd3d5`, pin `91124c0`; **live verification pending** |
| **A** | `/transactions` typeahead search — unified employee search, 300 ms debounce, keyboard nav, ARIA, local `buildSuggestions` | **DEPLOYED** ✅ commit `8fb3327`, image `20261031-typeahead` |
| **B1** | `/transactions` table — Method/Source abbreviation, per-employee Total column, CSV sync | **DEPLOYED** ✅ commit `6165f35`, pin `6d95083`, image `20261031-b1-columns` |
| **SHADOW-FIX** | Phase C SHADOW: recheck + auto-promotion every 10 min inside the worker loop; roster emits `COALESCE(canonical_person_ref, id)`; new `person_ref_mismatch` comparison bucket (Owner-authorized on the frozen path) | **DEPLOYED** ✅ commit `6b457a6`, pin `836e8b1`, image `20261101-shadow-recheck` (`sha256:381fd22f…`) |
| **D1-LID** | Rezaul LID `155508031901923` + TCIS LID `243103839576097` in `escort_roster_channel` | **ACTIVE 2026-11-02** ✅ added as `ch-rezaul-direct-lid` / `ch-tcis-direct-lid` after D2 proved the bridge could read them; profile now allowlists 11 chats and both LID cursors are live with `last_error=NULL` (no backfill) |
| **B2** | Show All → `/transactions/employee/[phone]` page | **DEPLOYED** ✅ commit `5541d12` (shared util `fa389c1`), pin `df1e2a6`, image `20261102-b2-employee-txn` (`sha256:7735007b…`): per-employee history, 20-row pagination, Print, employee-filtered CSV |
| **B3** | Typeahead on the Add Transaction sidebar and `/cash` pages — shared `lib/employee-suggest.ts` + `app/platform/employee-typeahead.tsx`, single implementation for all three pickers, `tests/employee-suggest.mjs` | **DEPLOYED** ✅ commit `c98e57e`, pin `8bc7017`, image `20261101-b3-typeahead` (`sha256:61ccaf56…`) |
| **B4** | `/cash` page Total + Show All | **DEPLOYED** ✅ commit `dd21806`, pin `d9168aa`, image `20261102-b4-cash-page` (`sha256:c2759c80…`): Total column (lifetime per employee), Method abbreviation, Show All Actions column, CSV with Total; Source evidence button retained |
| **B5** | Vessel operations: pay model + register actions | **DELIVERED 2026-11-02** ✅ `0042`–`0050`: Owner rate schedule (BDT 200/shift + per-destination conveyance), derived `program_pay`, corrected D/N shift model, `fled`/`FLEE_PROGRAM`, Actions column, per-employee program history, filter toolbar, status control. 37 programs released and priced (BDT 168,800); 48 ongoing show ৳— by design. See §14.3 |
| **R1** | Escort Release Parser — candidates from the release group | **DEPLOYED 2026-11-02** ✅ `0051`–`0055`: staging table, three-pass matching, mismatch kinds, `APPLIED` + confidence, apply recalculates pay; API + `scripts/apply-high-releases.ts`; ingestion hook limited to `120363408741101070@g.us` |
| **R2** | Release review UI + auto-apply | **DEPLOYED 2026-11-02** ✅ `/platform/release-review`, `0056` `release_auto_apply_log`, high-confidence auto-apply from the ingestion hook (armed; log still empty — the 37 applications came from review/CLI) |
| **EMP-MASTER** | Employee-master phases 1–5 | **DEPLOYED 2026-11-02/03** ✅ `0057`–`0063`: master fields + statuses, 191 bulk-confirm, 75 escorts, mobile normalization, program view, duplicate trigger, `create_employee_if_new` fail-closed hook, 11-column `/vessel`, register skin + dark sidebar. `employee_master` 216 rows all `CONFIRMED` |
| **RBAC-2A** | Roles, capabilities, attendance schema, review queue | **DEPLOYED 2026-11-03** ✅ `0064`–`0068`: designation CHECK + 75 backfill, `attendance_entries` + summary (439 entries / 35 employees), `review_items` + `review_decisions`, workflow submit/decide/withdraw + appliers, capability backfill, `/api/employees/lookup`, `PlatformPage access`, adminOnly nav |
| **RBAC-2B** | Attendance page, review queue, submissions, USER submit paths | **DEPLOYED 2026-11-03** ✅ `0069`: `/attendance`, rebuilt `/review`, `/submissions`, shared `EmployeeLookup`, USER vessel submit, `/api/review/*` + `/api/attendance/*`, `lib/review-api.ts` |
| **FIX2** | ADMIN vessel command gate + Cash in review queue | **DEPLOYED 2026-11-03** ✅ `825c070` (`canCommandVessel` accepts ADMIN + `vessel.command`), `0070_cash_review_mirror.sql` (mirror + `cash_review_mirror_close`, `cash.read`/`cash.submit` backfill), `/cash/submissions` uses `EmployeeLookup`, `/review` CASH delegates to the Cash decision endpoint |
| **TASK-A** | Password policy — no current-password prompt, minimum 8 | **DEPLOYED 2026-11-03** ✅ `5a72404` + `b01a53e`: single `lib/password-policy.ts` (`MIN_PASSWORD_LENGTH=8`), applied to `/admin`, `/login` forced change, `/cash`, admin reset and account creation; `tests/password-policy.mjs`. **Exception:** `/admin` "Change username" still verifies the current password. **Disclosed risk:** a stolen session can set a password and lock the Owner out — unmitigated, needs a new instruction |
| **CASH-PARSER** | Owner Cash message format, source gate, historical reconciliation | **90-ROW REVIEW-ONLY BACKFILL APPLIED 2026-11-03** — batch `backfill-20261103-cash-d7fe95c1`; 65 Employee ID matches, 25 retained for review; 1,997 duplicates skipped; 0 postings. Parser correction remains source-only/not deployed. Native-history coverage is partial; see `docs/NEXT-HANDOFF.md`. |
| **D1** | App cutover to `ALRIFAI_ROSTER_SOURCE=DB` | **DONE 2026-11-02** ✅ promotion fired `03:50:59Z` (`roster_shadow.mode="DB"`, 60 cycles, 0 diffs); `app.env` set to `DB`, app recreated on the same pinned image `sha256:381fd22f…` (no rebuild); verified `roster_mode="DB"`, 0 `ROSTER_SHADOW*` lines, 9/9 cursors. Backups `pre-d1-cutover-20261102-0415.dump` + `app.env.pre-d1-cutover-20261102.bak` |
| **D2** | Bridge profile generator | **DEPLOYED 2026-11-02** ✅ `scripts/generate-bridge-profile.ts` + `scripts/check-profile-drift.ts`; profile sha256 `1a967be7…`, 11 chats, epoch 4, `root:whatsapp-wa-01` `0440`; drift `chats_added=2`, `bridge_restart_required=true`; WA-01 restarted once; 11/11 cursors clean. Rollback: `native-reader-profile-pre-d2-lid-20261102-0717.json` (sha256 `4708cd0c…`) |
| **E** | Wire `/review` to the roster outbox, decommission legacy paths | PENDING — D1 is complete, so this is now the next large work item (see `docs/NEXT-HANDOFF.md`) |
| **AI/Ollama** | Assistant / model integration | DEFERRED |

Item A and B1 are frontend-only. Neither touched a migration, `app.env`,
`evidence/`, the roster path or a bridge.

The Cash parser correction is a separate, uncommitted source change. It accepts
forwarded/quoted content from the verified WA-01 Admin in the exact designated
Accountant direct chat, preserves repeated instructions by source-message/block
identity, and keeps missing/conflicting Employee ID matches in review. The
backfill prefers the canonical PostgreSQL original over conflicting staging
copies and isolates conflicts without a reliable original; unrelated eligible
instructions proceed. All 19 observed conflict groups resolved to one original.
After a fresh verified backup and exact digest approval, batch
`backfill-20261103-cash-d7fe95c1` inserted 90 missing Current instructions in
`REVIEW` (65 matched, 25 retained for employee review); 1,997 source-linked
duplicates were skipped. No posting, approval, migration, deployment,
configuration change or restart occurred. Parser code remains source-only and
not deployed. Native history is only partially exposed; coverage details and
the post-apply counts are in `docs/NEXT-HANDOFF.md`.

### 14.2 Recent commits (newest first)

```
f409510 deploy: pin app image to 20261103-password-policy
b01a53e test: refresh three assertions RBAC-2B left behind
5a72404 feat(auth): remove the current-password prompt and set the minimum to 8
e8b1ba1 deploy: pin app image to 20261103-rbac2b-fix2
5792fd1 feat(cash): shared employee picker and one review queue
4f5eeaa feat(db): mirror cash submissions into the review queue (0070)
825c070 fix(vessel): let a signed-in ADMIN command programs
ae26849 deploy: pin app image to 20261103-rbac2b-hotfix
a90efb1 fix(submissions): use the workspace page scaffold on the new pages
9eeb692 fix(vessel-register): add program was disabled for users
a9cbcc8 fix(routes): allow the workspace pages in the private entry (404 fix)
b0b2658 deploy: repin app image to 20261103-rbac2b
104055c fix(vessel): hide admin-only commands from a user (step 14 follow-up)
282218e deploy: pin app image to 20261103-rbac2b
4c972fc feat(nav): attendance and my submissions in the sidebar
b5c1259 feat(vessel): stage user-created programs; add My Submissions (step 14, 15)
8076871 feat(review): rebuild the review queue and its routes (step 13, 16)
76abf0a feat(attendance): attendance page and its two routes (step 12, 17)
b99f85c feat(db): attendance hours and notes, plus the admin direct write (0069)
3e32021 feat(ui): shared employee picker and CSRF writer (step 11)
4bd2dfc deploy: pin app image to 20261103-rbac2a
3d92718 feat(rbac): server-side role gates and role-aware navigation (RBAC-2A)
a7ecae2 feat(api): employee lookup endpoint for the shared picker
6880407 feat(rbac): three submit capabilities (0068)
4457d1f feat(db): review queue, workflow functions and per-domain apply (0066-0067b)
49a1a48 feat(db): designation vocabulary, attendance table and summary (0064-0065c)
ea627e9 deploy: pin app image to 20261103-p5-skin
89d3bdd style(platform): dark sidebar variant for every workspace route (5.2)
73ab260 style(vessel): legacy register skin for the two register routes (5.1)
e30f137 fix(db): make the program_with_employee grants reproducible (0063)
73f706c deploy: pin app image to 20261103-vessel-12col
1ec95aa feat(vessel): unify /vessel to the 11-column register layout (phase 4)
61f1db0 deploy: pin app image to 20261103-emp-master-p3
f60ce25 feat(vessel): toast when a vessel command creates an employee (3.4)
6dd1e70 feat(vessel): file the escort as an employee before writing the program (3.2)
8136bff feat(db): create_employee_if_new, the one app write path (0062)
8c75bf5 deploy: pin app image to 20261103-emp-master-p2
0b78724 feat(db): prevent duplicate employee rows (0061)
651af4a feat(db): program_with_employee view (0060)
7f69dd0 feat(db): backfill escorts known only from programs (0059)
a429cb5 feat(db): normalize_mobile helper and index (0058)
1411d1c deploy: pin app image to 20261103-emp-master-p1
0a3cb2e feat(db): employee master fields (0057)
ec92c09 deploy: pin app image to 20261103-col-widths
9820f59 ui: widen vessel columns, leave auto-width columns untouched
f4815e6 deploy: pin app image to 20261103-header-widths
ea8aaea ui: widen vessel register vessel columns and rename headers
be4c6b0 deploy: pin app image to 20261103-tdz-fix
bbda96a fix: vessel register crashed on a temporal dead zone
345b1cd deploy: pin app image to 20261103-toolbar-fix
3cefa9f fix: vessel toolbar did nothing because URL sync remounted the view
5b14857 deploy: pin app image to 20261102-a3-toolbar
55fdd2c feat: employee history toolbar
ff8540f feat: vessel register filter toolbar
5f06694 feat: widen mother, lighter and escort columns by ~15%
b6fbbf0 ci: add build-time assertion for worker lib imports
```

Earlier in the same work (2026-11-02), the B5 pay model and the R1/R2 release
pipeline:

```
fc5c249 deploy: pin app image to 20261102-r2-fix
70a2b83 fix: ship vessel-command-policy in the runtime image
c3ac84f feat: auto-apply high-confidence releases from the hook (R2 action 4)
a73d0d2 db: 0056 auto-apply audit log
f48a5a3 feat: release review page (R2 action 2)
fe08add feat: apply-all-high dedupes per program and gains a CLI
835d55a deploy: pin app image to 20261102-r1-fix1
51a08eb fix: ship release-parser and release-scan in the runtime image
e97b3a9 feat: shared release scanner and ingestion hook (R1 step 5)
ab15ab6 feat: release candidate review API (R1 step 4)
cb8470d db: 0055 let the apply flow recalculate pay
c47e28b feat: backfill persists confidence and reports Step D
7a5182c feat: Step D orphan program matching for lump-sum releases
26f2060 db: 0054 APPLIED status and confidence
942c03f feat: backfill verifies its source and reports mismatch kinds
d9a85c3 fix: payments after a release are new duties, not partials
a1d0c93 db: 0053 release mismatch kind
e4dcd64 feat: backfill uses three-pass matching and reports by pass
e20148c feat: three-pass release matching
7d4dadc db: 0052 release candidate pass tracking
58e731a feat: release backfill script (R1 step 3)
2319890 feat: release parser extraction and roster matching (R1 step 2)
ed907ad db: 0051 release_candidates staging table (R1 step 1)
56007ae deploy: pin app image to 20261102-b5-status
d41e0f2 feat: vessel register status control, narrow columns, flee command
334b45f deploy: pin app image to 20261102-b5-shiftfix
b005c01 feat: vessel register shift columns and sidebar edit flow
71613d8 db: 0049 recalculate under the corrected shift model
6f15f48 db: 0048 corrected shift model
24e7f57 deploy: pin app image to 20261102-b5-actions2
af918fa fix: disable program History when no escort mobile is recorded
9c5edf0 deploy: pin app image to 20261102-b5-actions
45871ec feat: vessel actions column and per-employee program history
6bd0d7e db: 0047 recalculate vessel pay under the Owner rates
4a6f694 db: 0046 vessel rate schedule (Owner-confirmed)
41a33e0 deploy: pin app image to 20261102-b5-vessel-pay
b33464e feat: show derived vessel pay on the register with an honest empty state
d504505 chore: reconcile migration ledger and pin SQL line endings
ddf7f6f db: 0045 vessel pay backfill
6eff545 db: 0044 vessel pay functions
f3de793 db: 0043 derived program pay table
a5b5d9e db: 0042 escort rate config and destination aliases
```

Older (B1–B4, D1/D2, SHADOW): `d9168aa` … `a5aaf75`, as recorded in
`/opt/vps/NEXT-SESSION-HANDOFF.md`.

### 14.3 Vessel pay / release model — resolved facts and remaining limits

**B5 is no longer blocked.** The Owner decided the data model on 2026-11-02 and
it is deployed (`0042`–`0050`). The notes below replace the earlier "no data
foundation" hold note, which is now false in several places.

- **Rates exist and are Owner-confirmed.** `public.escort_rate_config`:
  **BDT 200.00 per shift, uniform across every destination** (a shift is half a
  day, so BDT 400.00/day), plus per-destination conveyance (BDT 600–1,000),
  effective `2025-01-01`. Money is **bigint paisa**; the UI divides by 100.
- **The shift model is `D`/`N`, inclusive.** A program runs
  `start(date,shift)` → `end(date,shift)` inclusive and `days = shifts / 2`.
  `2026-11-02(N) → 2026-11-20(D)` = 36 shifts = 18 days = BDT 7,200.
- **Pay is derived, not stored on the fact.** `public.program_pay` is
  recomputable by `recalculate_program_pay(program_id)`. It is deliberately not
  a column on `programs`, which is under an immutability trigger, and it is
  never a posting or a payment.
- **Ongoing duty prices to nothing, on purpose.** With an empty `endDate` the
  row is `UNRESOLVED / END_DATE_REQUIRED` and the register shows `৳—`. Current:
  37 `CALCULATED` (818 shifts = 409 days; BDT 163,600 salary + BDT 5,200
  conveyance = BDT 168,800) and 48 `UNRESOLVED`.
- **`escort_order_register.status` never equals `'CONFIRMED'`.** Only `DRAFT`
  and `REVIEW` exist; confirmation is `confirmation_message_id IS NOT NULL`.
  **Never filter on `status='CONFIRMED'`** — it returns zero rows forever.
- **`calculateSourceDuty()` (`lib/duty-calculation.mjs`) still returns
  `UNRESOLVED` by design.** It is a separate, argument-driven calculator (needs
  verified `rates[]`, `policy`, `attendance[]`); the deployed pay path uses
  `lib/vessel-pay.ts` and `program_pay`, not this function. Do not "fix"
  `calculateSourceDuty` to read tables.
- **`program_assignments` is the multi-program-per-employee source**
  (`(program_id, revision)`, `employee_mobile`, `duty_started_on`,
  `released_on`, `predecessor_id`, `source_refs`). **`SELECT` is not granted to
  `alrifai_app`** — any reader needs a `GRANT` or a view.
- **`duty_type` now exists but is not a duty-type taxonomy.** It holds
  `'escort'` for 75 rows and NULL for the rest; there is still **no**
  security-duty / tally-duty distinction in the schema or in code. Do not
  invent one from a job title.
- **Attendance is now stored** (`attendance_entries`, 439 backfilled rows from
  programs, plus `attendance_summary`). Vessel pay still derives from program
  shift dates, **not** from attendance; the two are not yet reconciled. Do not
  make pay read attendance without an Owner decision.
- **Conveyance now comes from the rate table**, not from `programs.details`
  (which still carries no conveyance key). It is still an argument to
  `calculateSourceDuty` and still yields `CONVEYANCE_NOT_ESTABLISHED` there.
- **Two vessel UIs still exist** (`app/vessel` → `app/vessel-dashboard.tsx`, and
  `app/vessel-register` → `view.tsx`). `/vessel` is the 11-column unified view
  (`1ec95aa`); `/vessel-register` keeps the legacy register skin. Any change must
  say which one it is changing.
