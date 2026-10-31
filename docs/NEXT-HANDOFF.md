# Next Handoff — 2026-10-31

> **Scope note.** This file is a short, current-state handoff created after the
> Item A and Item B1 deploys. The long-form historical record remains
> `/opt/vps/NEXT-SESSION-HANDOFF.md` (3,383 lines, referenced by `AGENTS.md` §0
> and §12). Where the two disagree, `AGENTS.md` §0 and this file describe the
> running system; the older file is an evidence archive, not a status page.

## Production State

| Field | Value |
|---|---|
| App image | `sha256:8e4383a9544f567dbaaefb59af5e6167378c67817836b194c91c661df3448f25` (tag `20261031-b1-columns`, source `6165f35`, compose pin `6d95083`) |
| App mode | `on` |
| SHADOW | `mode=SHADOW`, `cycles_completed=3`, `diffs_found=0`, `auto_promote_blocked=false` |
| SHADOW started | `2026-10-31T15:47:18Z` |
| Auto-promote at | `2026-11-02T03:47:18Z` |
| Ledger | **41** rows (`0037`–`0041`) |
| Roster | 10 active persons / 26 active channels / epoch 2 |
| Ingestion | 9/9 chats fresh, 0 errors |
| Bridges | **untouched** — WA-01 `sha256:28a646d2…`, WA-02 `sha256:d36ca851…` |
| PostgreSQL | `vps-infra-postgres-1` untouched |
| Health | `{"status":"ok","roster_mode":"SHADOW",…}` |

**Rollback images available**

- `sha256:1911fdfd…` — tag `20261031-typeahead` (Item A)
- `sha256:d2c2e675…` — tag `20261031-shadow-v2-fix1`
- `sha256:d7a96b1e…` — tag `20261031-shadow-v2`
- `sha256:ca27d77c…` — tag `20261030-phase4` (pre-SHADOW)
- `sha256:1d4602c3…` — tag `rollback-app-phase2`

## Completed This Session

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
- **Signal:** `roster_shadow.mode` in `/api/health` flips to `"DB"`.
  `roster_mode` stays `"SHADOW"` because it reports the configured env value;
  it only becomes `"DB"` when `ALRIFAI_ROSTER_SOURCE` is changed in Phase D1.
- Once promoted the process will not revert on its own. Reverting requires a
  deploy and an explicit `DELETE FROM roster_shadow_state` to restart the period.
- **SHADOW code path is FROZEN.** Do not touch `lib/conversation-scope.ts`, the
  scope-loading path in `scripts/message-ingestion-worker.ts`, migrations
  `0037`–`0041`, `public.roster_shadow_state`, or the `ALRIFAI_ROSTER_*` values
  in `app.env`. A diff or block is reported, never remediated.

## Pending Work (Priority Order)

1. Verify SHADOW auto-promotion after `2026-11-02T03:47Z` — report
   `roster_shadow.mode == "DB"`.
2. **Phase D1** — app cutover: set `ALRIFAI_ROSTER_SOURCE=DB` in `app.env`,
   deploy, verify 9/9 chats, then retire the static list.
3. **Item B2** — Show All → `/transactions/employee/[phone]` page.
4. **Item B3** — Typeahead on the Add Transaction sidebar and `/cash` pages.
5. **Item B4** — `/cash` page Total + Show All.
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
