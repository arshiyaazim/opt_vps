# Next Handoff — 2026-11-02

> **Scope note.** This file is a short, current-state handoff created after the
> Item A and Item B1 deploys. The long-form historical record remains
> `/opt/vps/NEXT-SESSION-HANDOFF.md` (3,383 lines, referenced by `AGENTS.md` §0
> and §12). Where the two disagree, `AGENTS.md` §0 and this file describe the
> running system; the older file is an evidence archive, not a status page.

## Production State

| Field | Value |
|---|---|
| App image | `sha256:c2759c80e712439be80ae8e38f08f9b19fe275bcd8021e3f38614dfeac44f3a1` (tag `20261102-b4-cash-page`, source `dd21806`, compose pin `d9168aa`) |
| App mode | `on` |
| SHADOW | **PROMOTED 2026-11-02** — `mode=DB`, `cycles_completed=60`, `diffs_found=0`, `auto_promote_blocked=false` |
| SHADOW started | `2026-10-31T15:47:18Z` |
| Auto-promote at | `2026-11-02T03:47:18Z` |
| Ledger | **41** rows (`0037`–`0041`) |
| Roster | 10 active persons / **28** active channels / **epoch 4** |
| Bridge profile | sha256 `1a967be7…` — 11 chats, epoch 4, `root:whatsapp-wa-01` `0440` (generated, deployed 2026-11-02) |
| Ingestion | **11/11** chats fresh, 0 errors |
| Bridges | WA-01 `sha256:28a646d2…` restarted **once** at `2026-11-02T07:17:09Z` for the D2 profile; WA-02 `sha256:d36ca851…` **untouched** |
| PostgreSQL | `vps-infra-postgres-1` untouched |
| Health | `{"status":"ok","roster_mode":"DB","roster_shadow":{"mode":"DB",…}}` |

**Rollback images available**

- `sha256:7735007b…` — tag `20261102-b2-employee-txn` (immediate rollback, pre-B4)
- `sha256:381fd22f…` — tag `20261101-shadow-recheck` (pre-B2)
- `sha256:61ccaf56…` — tag `20261101-b3-typeahead` (pre-recheck-fix)
- `sha256:8e4383a9…` — tag `20261031-b1-columns`
- `sha256:1911fdfd…` — tag `20261031-typeahead` (Item A)
- `sha256:d2c2e675…` — tag `20261031-shadow-v2-fix1`
- `sha256:d7a96b1e…` — tag `20261031-shadow-v2`
- `sha256:ca27d77c…` — tag `20261030-phase4` (pre-SHADOW)
- `sha256:1d4602c3…` — tag `rollback-app-phase2`

## Completed This Session

- **Item B4 — `/cash` parity with `/transactions` (DEPLOYED 2026-11-02)**
  Image `sha256:c2759c80…` (tag `20261102-b4-cash-page`, source `dd21806`),
  compose pin `d9168aa`.
  - **Method** column renders the shared `methodAbbreviation()` with the raw
    value in a `title` tooltip (previously raw `row.method`).
  - **Total** column: each employee's lifetime instruction total across the full
    Current scope, matching B1's semantics.
  - **Actions** column with a "Show All" link to
    `/transactions/employee/{employee_mobile}`, rendered only when the mobile is
    present. The per-row **Source** evidence button is deliberately retained —
    Show All was added beside it, not in place of it.
  - **CSV export** gains the Total column.

  **Why the Total needed a second data source.** `/api/cash/summary` is
  server-paginated (100 rows/page) and hard-caps `limit` at 200, while the
  Current scope holds 1,964 instructions, so the page cannot aggregate a
  lifetime total from its own rows — a `useMemo` over `rows` would total only the
  loaded page and change as the operator pages. The total is therefore built
  from one `GET /api/operations?view=cash&export=1` call, which returns the
  complete Current set and is reachable with the same Cash session
  (`getChatGPTUser` → `currentIdentity` reads the same `__Host-alrifai_cash`
  cookie), from the same `public.cash_instructions` CURRENT epoch. The map is
  keyed by `normalizeEmployeePhone` so `0…` and `+880…` spellings agree. If that
  call fails the column renders `—` rather than a wrong figure, and nothing else
  on the page depends on it.

  **Accepted deviation:** `className="num"` was not applied. The cash table has
  no `.num` rule and no stacked mobile layout, and its Amount column is not
  right-aligned, so `num` would have been either a no-op or a single
  right-aligned cell among left-aligned ones. `data-label="Total"` was kept;
  Owner approved this on 2026-11-02.

  Verified: `tsc` and ESLint clean; `/cash` serves 200 (it renders its own login
  form client-side); the built client chunk contains the Show All link, the
  abbreviation and the totals call; health `roster_mode=DB`; scope 11 chat
  addresses; 11/11 cursors with 0 errors; no new error signatures; 1,586
  postings unchanged. Authenticated visual check still pending Owner login.

- **Item B2 — per-employee transaction history (DEPLOYED 2026-11-02)**
  New route `/transactions/employee/[phone]` plus a "Show All" link in each
  `/transactions` row. Image `sha256:7735007b…` (tag `20261102-b2-employee-txn`,
  source `5541d12`), compose pin `df1e2a6`.
  - **Server page → client view**, mirroring `app/transactions/page.tsx`. A
    single `"use client"` route was rejected: `PlatformPage` is an async server
    function, so a client page would lose the AppShell and the server-side
    `requireChatGPTUser` redirect.
  - Reuses `GET /api/operations?view=cash&export=1` and filters by employee
    phone client-side — no new endpoint, no server-side DB access, no migration.
  - Header carries employee name, employee ID, total instructed and count; the
    table deliberately omits a Total column because the aggregate is already in
    the header. Sort `date DESC, time DESC, id DESC`; 20 rows/page with
    Previous/Next and "Page X of Y" (page number clamped, not reset in an
    effect). Distinct empty state when the phone matches no Current-scope row.
  - Print via `window.print()` with scoped CSS hiding the shell and the page
    controls; CSV export mirrors `/transactions`, filtered to this employee.
  - Phone matching uses `normalizeEmployeePhone`, so `+880…` and `0…` URLs
    resolve to the same person.
  - Method/Source abbreviations extracted to `lib/transaction-format.ts`
    (commit `fa389c1`) so both tables share one implementation.
  - Verified: `tsc` clean, ESLint clean, route registered in
    `app-paths-manifest.json` and compiled with the shared util bundled;
    `/transactions` and the new route both answer 401 unauthenticated (no 5xx);
    health `roster_mode=DB`; scope loaded as 11 chat addresses; 11/11 cursors
    with 0 errors; no new error signatures versus the pre-deploy baseline.
    **Authenticated visual check is still pending Owner login.**

- **Phase C SHADOW — promoted; Phase D1 cutover — done (2026-11-02)**
  Auto-promotion fired on its own 10-minute tick at `03:50:59Z` (due
  `03:47:18Z`, no restart or manual step) after 60 cycles with `diffs_found=0`:
  `roster_shadow.mode` `SHADOW → DB`. Phase D1 then set
  `ALRIFAI_ROSTER_SOURCE=DB` in `app.env` (single key; file stayed
  `600 root:root`) and recreated the app with
  `docker compose up -d --no-deps app` on the **same pinned image**
  `sha256:381fd22f…` — no rebuild. Verified: `roster_mode="DB"`,
  `roster_shadow.mode="DB"`, zero `ROSTER_SHADOW*` lines, `Approved scope
  loaded: 9 chat addresses across 7 conversations`, 9/9 cursors with 0 errors,
  bridges and PostgreSQL untouched. Part 1 (LID channels) was attempted and then
  reverted as bridge-blocked — see "Phase D1 Part 1" below. This is the first
  change session in which the roster tables are the only ingestion scope.

- **Phase D2 — bridge profile generated and deployed (2026-11-02)**
  The bridge profile is now a generated artifact rather than hand-maintained.
  `check-profile-drift.ts` reported `functional_drift=true`, `chats_added=2`
  (the two LID aliases), `chats_removed=0`, `participants_changed=0`,
  `bridge_restart_required=true`. Deployed as profile sha256 `1a967be7…`
  (11 chats, epoch 4, `root:whatsapp-wa-01` `0440`) with exactly one WA-01
  restart. Verified 11/11 native cursors clean, no `NATIVE_READER_UNAVAILABLE`
  after `07:17:09Z`, and no backfill. This also completed D1 Part 1: the Rezaul
  and TCIS LID channels are now live.

- **Item A — Typeahead search on `/transactions`**
  Unified search + employee picker: one field both filters the table across all
  searchable fields and suggests employees by name or mobile. 300 ms debounce,
  ↑ ↓ Enter Esc navigation, full ARIA combobox/listbox wiring, local pure
  `buildSuggestions` (dedupe to newest name per phone, four-bucket ordering,
  cap 10, empty-phone rows excluded). 17 unit assertions.
  File: `app/transactions/view.tsx`. Commit `8fb3327`, deployed as
  `20261031-typeahead`.

- **Item B1 — Table column improvements on `/transactions`**
  Method abbreviated to one character (`bkash→B`, `nagad/nagod→N`, `cash→C`,
  `hotel→H`, else initial); Source abbreviated (`WhatsApp*`/`chat→WA`,
  `review→RV`, `excel→XL`, submission username → last 3 chars, else first 2
  uppercased); new per-employee **Total** column aggregated over the full
  dataset rather than the filtered view; CSV export gained `Total`; Method 40 px
  and Source 50 px with `data-label` preserved for the stacked mobile layout.
  Full raw values kept in `title`. 23 unit assertions.
  File: `app/transactions/view.tsx`. Commit `6165f35`, pin `6d95083`, deployed
  as `20261031-b1-columns`.

- **Item B3 — Employee typeahead on the Add Transaction drawer and `/cash`**
  (**DEPLOYED 2026-11-01** — image `sha256:61ccaf56…`, tag `20261101-b3-typeahead`,
  source `c98e57e`, pin `8bc7017`). The Item A suggestion logic moved to a single
  shared module and a single ARIA combobox component, so all three pickers now
  share one implementation:
  - `lib/employee-suggest.ts` — `buildSuggestions`, `normalizeSearchText`,
    300 ms debounce constant, cap 10; identity-only surface (name + employee ID).
  - `app/platform/employee-typeahead.tsx` — combobox/listbox wiring, keyboard
    navigation, debounce, `suppressSuggestions` guard.
  - `app/transactions/view.tsx` — table search now uses the shared component
    (behaviour unchanged); the drawer receives the loaded rows as candidates.
  - `app/platform/ui.tsx` — `AddTransactionDrawer({employees})`; picking a
    suggestion fills employee name **and employee ID only**, never the payout
    number (business rule preserved and stated in the form).
  - `app/cash/page.tsx` — the Cash search field is the shared combobox;
    candidates come from the loaded, authorized result page only, and a pick
    filters on the employee ID.
  - `tests/employee-suggest.mjs` — 12 tests (ranking, dedupe, caps, ordering,
    identity-surface rejection, single-implementation guards), added to the
    canonical `test` command.
  Validation: `tsc --noEmit` clean; canonical TAP block 252 tests / 0 fail /
  3 skip; full glob matches the known expected 7 file-level failures only.
  In-image gates at build: message-mirror test, `typecheck`, `Lint: 0 errors,
  0 warnings`, built output contains the B3 strings in server and client chunks.
  Post-deploy: health `ok`, SHADOW unchanged (`mode=SHADOW`, 0 diffs, not
  blocked), 9/9 cursors observed 25 s after restart with 0 errors, DB counts
  identical (ledger 41, instructions 3,552, postings 1,586, users 3), WA-01 /
  WA-02 / PostgreSQL untouched (same image IDs, `RestartCount=0`, same start
  times), `app.env` still `600 root:root`, no new error signatures vs the
  24 h log baseline.
  Not browser-verified. No migration, `app.env`, evidence, or bridge change.

  **Deferred sub-task (Owner decision 2026-11-01):** typeahead on
  `/cash/archive` and `/cash/submissions` requires new employee lookup API
  endpoint — deferred. Neither page currently loads an employee candidate set
  (`/cash/archive` pages server-side; `/cash/submissions` is self-scoped), so a
  typeahead there needs a read-only lookup endpoint and is out of B3 scope.

- **Phase C SHADOW recheck + canonical personRef fix — deployed 2026-11-01**
  Two defects found by an audit of the SHADOW observation window, fixed in one
  commit (`6b457a6`, image `20261101-shadow-recheck`, pin `836e8b1`).

  1. **The comparison ran only at worker start.** `loadConversationScopeWithShadow`
     was called once before `while(true)`, so `cycles_completed` counted process
     starts, not observation cycles, and `auto_promote_at` could pass without
     ever being evaluated. The worker now re-loads the scope on a wall-clock
     `SHADOW_RECHECK_MS = 10 * 60 * 1000` throttle inside the loop, logging
     `ROSTER_SHADOW_RECHECK cycles=N diffs=D`. A recheck failure is caught and
     keeps the current scope (two independent try/catch layers: the outer keeps
     the scope, the inner only guards the diagnostic state read), so a roster or
     state defect can never stop ingestion.
  2. **The roster emitted the wrong person reference.** `loadRosterScope` used the
     roster row id (`escort-person-hridoy-wa01`) where the legacy scope uses
     `canonical_person_ref` (`escort-hridoy-wa01`), and no comparison bucket
     covered that field — so a real attribution divergence still reported zero
     differences. The loader now selects `COALESCE(canonical_person_ref, id)`
     for both the conversation and identity keys, and `compareScopes` gained a
     `person_ref_mismatch` bucket included in `total`.

  Validation: `tsc --noEmit` clean; canonical TAP block 252 tests / 0 fail /
  3 skip; full glob matches the same 6 file-level failures as pristine `HEAD`
  (proven by re-running them against a clean `HEAD` tree — historical
  hash-pin drift on `lib/escort-intake-candidate.mjs` plus DB/HTTP-dependent
  files, unrelated to this change); `Lint: 0 errors, 0 warnings` on the
  build-context tree.
  Post-deploy: health `ok`, `mode=SHADOW`, **two consecutive real recheck
  cycles 10 min apart** (`18:41:04Z`, `18:51:09Z`), `cycles_completed` 5 → 6 → 7,
  `diffs_found=0` throughout, `auto_promote_at` unchanged. Pre-deploy backup
  `pre-shadow-recheck-20261101-1827.dump` (sha256 `c9e42086…`, 75 table-data
  sections, mode 600). Bridges, PostgreSQL, `app.env` and the roster tables
  untouched.

- **Phase C SHADOW v2 deployed and healthy** — roster-backed comparison reading
  the roster tables (not the Phase B views), state persisted in
  `public.roster_shadow_state`, health reporting configured and effective mode
  separately. Zero diffs across 3 cycles.

- **D2 bridge profile generator — code complete, not deployed**
  `scripts/generate-bridge-profile.ts` renders the WA-01 native-reader profile
  from the roster; `scripts/check-profile-drift.ts` compares generated against
  live (set-based, restart required only when the chat set changes). Execution
  verified in a throwaway container: identical chat set, identical per-chat
  members including order, identical binding; only top-level ordering differs.
  Deliberately not deployed — regenerating would change production bytes for no
  functional gain.

- **Documentation audit** — `AGENTS.md` guardrails extended (§13.13–§13.20),
  `docs/VPS_MAP.md` current-state pointer, design doc §12 implementation status.

## SHADOW Promotion Schedule

- Started: `2026-10-31T15:47:18Z`
- Auto-promote at: `2026-11-02T03:47:18Z` (~09:47 Asia/Dhaka, 2 Nov)
- **Recheck cadence: every 10 minutes, on a wall clock timer inside the worker
  loop** (since `6b457a6`, 2026-11-01). Each tick re-loads the approved scope,
  runs the SHADOW comparison, and evaluates the auto-promotion predicate, so
  `cycles_completed` advances on real observation cycles rather than process
  starts. Confirmed live: `18:41:04Z` and `18:51:09Z`, 10 min apart,
  `cycles_completed` 5 → 6 → 7 with `diffs_found=0`.
- **Auto-promotion therefore fires automatically** at the due time on the first
  tick after it, with **no restart, deploy, or manual step required**. Do not
  restart the container to force a check — restarting is unnecessary and
  `cycles_completed` now advances on its own. Two log lines per tick are
  expected: `ROSTER_SHADOW_OK` (loader) and `ROSTER_SHADOW_RECHECK` (worker).
- **Signal:** `roster_shadow.mode` in `/api/health` flips to `"DB"`.
  `roster_mode` reports the configured env value, so it stayed `"SHADOW"` until
  Phase D1 changed `ALRIFAI_ROSTER_SOURCE`; it has read `"DB"` since the
  2026-11-02 cutover.
- Once promoted the process will not revert on its own. Reverting requires a
  deploy and an explicit `DELETE FROM roster_shadow_state` to restart the period.
- **Observation window is intact.** The 36 h period, `diffs_found=0` and
  `auto_promote_at` were not reset by the 2026-11-01 fix; only the sampling rate
  changed.
- **SHADOW code path is FROZEN.** Do not touch `lib/conversation-scope.ts`, the
  scope-loading path in `scripts/message-ingestion-worker.ts`, migrations
  `0037`–`0041`, `public.roster_shadow_state`, or the `ALRIFAI_ROSTER_*` values
  in `app.env`. A diff or block is reported, never remediated. The single
  exception on record is the Owner-authorized 2026-11-01 fix above; the freeze
  resumed on completion. **Lifted 2026-11-02:** the `=SHADOW` condition no longer
  holds (promoted, then `ALRIFAI_ROSTER_SOURCE=DB`), so the freeze is over by its
  own terms — see `AGENTS.md` §13.20 (`RESOLVED`). The paths stay subject to the
  normal rules; unfrozen does not mean freely editable.

**Promotion result — 2026-11-02.** The predicate fired on its own tick at
`03:50:59Z`, ~3 min 40 s after the `03:47:18Z` deadline, with no restart,
deploy or manual step. `roster_shadow.mode` = `DB`, `cycles_completed` = 60,
`diffs_found` = 0, `auto_promote_blocked` = false, and the worker logged
`ROSTER_AUTO_PROMOTED after 36 hours, 0 diffs`. The app began routing from
`escort_roster`/`escort_roster_channel` on the next scope load while
`roster_mode` still reported `SHADOW` (the configured env value) until the Phase
D1 cutover below.

### Phase D1 Part 1 + D2 — LID channels: reverted, then activated via a generated profile

Promotion was confirmed first, then Part 1 ran on **2026-11-02** and was reverted
in the same session once a blocker was proven.

| Person | PN | LID | LID↔PN evidence | Roster channel |
|---|---|---|---|---|
| Rezaul Karim | `8801836743754` | `155508031901923` | WA-01 `whatsmeow_lid_map` | **reverted** |
| TCIS W/A | `8801757622300` | `243103839576097` | WA-01 `whatsmeow_lid_map` | **reverted** |

- **What was written, then undone.** Two `escort_roster_channel` DIRECT rows
  (`ch-rezaul-direct-lid`, `ch-tcis-direct-lid`), and in
  `whatsapp_identity_aliases` the `lid_bare` value plus `verification`
  `BRIDGE_LID_MAP` for both people. `escort_roster_epoch` went 2 → 3. Both
  LID↔PN pairs were confirmed against the bridge store's authoritative
  `whatsmeow_lid_map`, not taken from the plan text
  (`155508031901923 → 8801836743754`, `243103839576097 → 8801757622300`; the
  TCIS LID appears in no other source in the repo or the mirror).
- **The plan SQL was not run verbatim — it would have failed or silently
  no-opped.** (a) the alias `INSERT` omitted `scope_account`, which is `NOT
  NULL`; (b) worse, both people already had an alias row on the unique
  `(scope_account, pn_bare)` index with an empty `lid_bare`, so
  `INSERT … ON CONFLICT DO NOTHING` would have changed **nothing** while an
  insert-then-count check reported success. It was replaced with an idempotent
  `UPDATE … WHERE lid_bare IS DISTINCT FROM …`; (c) the epoch bump was made
  conditional so a re-run could not inflate it. A re-run produced
  `channels_present=2 aliases_updated=0 epoch_rows=0`.
- **Blocker: the bridge, not the roster, decides what is readable.** The scope
  loaded 11 chat addresses and the worker created cursors for both new LIDs, but
  both failed immediately with `NATIVE_READER_UNAVAILABLE`. Cause:
  `native-reader-profile.json` (WA-01 control dir) allowlists **exactly nine**
  chats and neither LID is among them; in the bridge store Rezaul's LID chat
  holds **0 messages** and TCIS's LID has **no chat row at all** (Hridoy's LID
  works only because it holds 38). Because the bridge normalizes LID traffic to
  the PN, these streams may never populate on their own.
- **Consequence, then outcome.** One failed per-chat read marks the whole cycle
  failed, so the loop backed off from 15 s toward its 60 s cap and logged two
  `WA-01 approved chat ingestion failed; cursor retained` lines per cycle. **No
  message was lost or duplicated** (cursors retained; activation never replays
  history). **Owner decision: revert.** The two channel rows and the two inert
  cursor rows (no cursor, no sequence, no activation, zero messages) were
  deleted; the `whatsapp_identity_aliases` LID values were kept. Roster is back
  to 26 active channels, 9/9 cursors, 0 errors.
- **Activating these LIDs requires Phase D2 plus a bridge change** — a
  regenerated `native-reader-profile.json` covering both LIDs and a WA-01
  restart. Neither is authorized. Do **not** re-add the roster channels before
  that profile exists: it yields failing cursors and slower ingestion with no
  capture benefit.
- **Do not backfill.** The mirror key is `(wa_account, chat_jid, message_id)`
  and `ensureNativeCursor` starts at the current stream boundary, so replaying
  history would create duplicates rather than recover anything.

**Resolution (2026-11-02) — activated via Phase D2.** The dry run proved the
ordering constraint: `generate-bridge-profile.ts` derives `chats` from
`escort_roster_channel`, so with the LID rows absent the regenerated profile was
byte-different only in chat ordering (`functional_drift=false`,
`bridge_restart_required=false`) — a no-op that would still have left the LIDs
unreadable. The rows were therefore re-added first, then the profile regenerated:

| Check | Result |
|---|---|
| `escort_roster_channel` active | 26 → **28** |
| `escort_roster_epoch` | 3 → **4** |
| Generated chats / epoch | **11** / 4 |
| Drift `chats_added` | `155508031901923@lid`, `243103839576097@lid` |
| Drift `chats_removed` / `participants_changed` / `binding_drift` | none / none / none |
| `functional_drift` / `bridge_restart_required` | **true** / **true** |

**Deployed.** Live profile backed up to
`/var/lib/vps/al-rifai/backups/native-reader-profile-pre-d2-lid-20261102-0717.json`
(sha256 `4708cd0c…`, mode 600); new profile sha256
`1a967be7…` installed `root:whatsapp-wa-01` `0440`; then a single
`docker restart vps-whatsapp-wa-01-cap4-20261011`. WA-02, PostgreSQL and the app
container were **not** restarted, and `systemctl restart docker` was not used.

**Verified after restart:** bridge reconnected (`✓ Connected to WhatsApp!`);
all **11** native cursors carry a valid cursor with `last_error=NULL` (the LID
cursors had failed with `NATIVE_READER_UNAVAILABLE` until this point); **zero**
`NATIVE_READER_UNAVAILABLE` lines after `07:17:09Z`; and **no backfill** —
neither LID chat has any historic `whatsapp_messages_original` row, consistent
with activation starting at the stream boundary. A nonzero drift exit code (1)
is expected here: it reports a functional change, not a failure.

**Rollback:** copy the backup back over
`/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json`, restore
`root:whatsapp-wa-01` / `0440`, and restart WA-01 once. Cursor advances are not
rewound (documented and accepted).

## Pending Work (Priority Order)

**Next up:** Phase E (`/review` wired to the roster outbox, legacy paths
decommissioned) or B5 (vessel operations page — still blocked on an Owner
data-model decision). B2 and B4 are done; D1-LID is resolved and the LID
channels are live. The bridge profile is now a generated artifact, so any future
roster change must be followed by regenerate + drift check + Owner review of the
diff + profile deploy + a single WA-01 restart.

1. ~~Verify SHADOW auto-promotion after `2026-11-02T03:47Z`~~ — **DONE
   2026-11-02**: fired at `03:50:59Z`, `roster_shadow.mode == "DB"`.
2. **Phase D1** — app cutover — **DONE 2026-11-02**: `ALRIFAI_ROSTER_SOURCE=DB`
   in `app.env`, app recreated on the same pinned image, verified
   `roster_mode="DB"`, no `ROSTER_SHADOW*` lines, 9/9 cursors, bridges and
   PostgreSQL untouched. Part 1 (LID channels) was later completed via Phase D2
   (see "Phase D1 Part 1 + D2" above).
3. ~~**Item B2** — Show All → `/transactions/employee/[phone]` page.~~ — **DONE
   2026-11-02** (image `sha256:7735007b…`, source `5541d12`).
4. **Item B3** — Typeahead on the Add Transaction sidebar and `/cash` pages —
   **DEPLOYED 2026-11-01** (image `sha256:61ccaf56…`, source `c98e57e`, pin
   `8bc7017`). Deferred sub-task: `/cash/archive` and `/cash/submissions`
   typeahead requires a new employee lookup API endpoint — deferred.
5. ~~**Item B4** — `/cash` page Total + Show All.~~ — **DONE 2026-11-02** (image
   `sha256:c2759c80…`, source `dd21806`). Source evidence button retained.
6. **Item B5** — Vessel page. **BLOCKED**: no salary/rate, attendance or
   conveyance data exists. Needs an Owner data-model decision. See
   `AGENTS.md` §14.3.
7. **Phase E** — wire `/review` to the roster outbox, decommission legacy paths.
8. **AI/Ollama** integration — deferred.

## Key Constraints

- **NEVER `systemctl restart docker`.** Bridges run `RestartPolicy=no` and do
  not come back; this caused a 2 h 34 m outage on 2026-10-31.
- **NEVER `git add -A`** — stage explicit paths only.
- No writes to `app.env` or `/var/lib/vps/al-rifai/evidence/` without
  explicit Owner authorization.
- A failed build is stop-and-ask, never a workaround. Use
  `docker build --build-context evidence=/var/lib/vps/al-rifai/evidence`.
- `/tmp` (including `/tmp/opencode`) is not durable across reboots.
- One commit per item, conventional messages, push source before deploying.
- Record the deployed commit SHA and image digest in every deployment note.

## Key File Paths

| Purpose | Path |
|---|---|
| Project root | `/opt/vps/apps/al-rifai` |
| App env | `/etc/vps/apps/al-rifai/app.env` (`600 root:root`) |
| App DB password | `/etc/vps/apps/al-rifai/database_password` → `/run/secrets/database_password` |
| Cash read credential | `/etc/vps/apps/al-rifai/auth/pg-password` (role `ir_review_runtime`) |
| Evidence (checksum-pinned) | `/var/lib/vps/al-rifai/evidence/` |
| Backups | `/var/lib/vps/al-rifai/backups/` |
| WA-01 control | `/var/lib/vps/whatsapp/wa-01/control/` |
| Bridge profile | `/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json` |
| Transactions view | `apps/al-rifai/app/transactions/view.tsx` |
| Scope loader (FROZEN) | `apps/al-rifai/lib/conversation-scope.ts` |
| Ingestion worker (FROZEN scope path) | `apps/al-rifai/scripts/message-ingestion-worker.ts` |
| Roster migrations | `apps/al-rifai/db/migrations/0037–0041` |
| Migrations applied | `public.alrifai_schema_migrations` (41 rows) |
| SHADOW state | `public.roster_shadow_state` (singleton) |
| Long-form history | `/opt/vps/NEXT-SESSION-HANDOFF.md` |
