# Next Handoff — 2026-11-04 (CURRENT STATE)

> **Scope note.** This is the short, current-state handoff. The long-form
> historical record remains `/opt/vps/NEXT-SESSION-HANDOFF.md` (3,383 lines,
> referenced by `AGENTS.md` §0 and §12). Where they disagree, `AGENTS.md` §0 and
> this file describe the running system; the older file is an evidence archive,
> not a status page. `docs/VPS_MAP.md` is an infrastructure map with dated
> audits — its dated sections are history too.

---

## Current position — 2026-11-04 (Target 02 deployed)

Verified read-only at `2026-11-04T20:12Z`. Every number below is a **measurement
at that timestamp**, not a permanent constant.

| Item | Value |
|---|---|
| Running image | `sha256:b058dd4810d7830a9b2ac8e289c1358b7d4cb5668c474e9f4e19563a3ab9cae4` (`local/al-rifai:target02-final`) |
| Source commit | `ddbd3d5cfa4b3c58eff53c56013665608ecccb93` |
| Deployment pin commit | `91124c0` |
| Container | `al-rifai-app-1`, started `2026-11-04T18:28:17Z`, `RestartCount=0`, healthy |
| PostgreSQL | `721873c3…`, restarts 0, healthy (started 2026-10-31) |
| WA‑01 / WA‑02 | `28a646d2…` / `d36ca851…`, restarts 0 |
| Migration ledger | **75** rows, through `0071_release_apply_atomic.sql` |
| Programs / Assignments / Pay | 98 / 93 / 93 (39 `CALCULATED`, 54 `UNRESOLVED`) |
| Register | 616 `DRAFT` / 411 `REVIEW` / **0 `CONFIRMED`** |
| Release candidates | 145 total, 39 applied |
| Cash | 3,726 instructions (2,140 `REVIEW`, 1,586 `MANUAL_READY`), **0 postings** |
| Ingestion | 11/11 cursors, 0 errors; scope 7 conversations / 11 addresses |
| Reconciliation | timer **inactive**, producer dormant, 157 historical runs |
| Rollback images | `sha256:066c9a1c…` (Target 01), `sha256:924b0525…` (pre-Target 01) |
| Latest backup | `/var/lib/vps/al-rifai/backups/pre-target02-20261104-1927.dump` (64,420,714 B, sha256 verified) |

### What Target 01 delivered (deployed 2026-11-04T17:34Z as `066c9a1c`)

1. **Logical Vessel order identity** — `orderIdentity` / `orderBusinessDay` /
   `motherCompatible` / `groupLogicalOrders` collapse repeated order fragments
   into one order without merging genuine duties (a different Lighter, Master,
   shift, day or fleet stays separate). The ±1‑day tolerance was **removed**
   during release review: the duty day must match exactly.
2. **Runtime packaging** — `scripts/reconcile-ingest.mjs` and
   `lib/reconciliation-core.mjs` are copied into the runtime image, and
   `scripts/check-runtime-imports.mjs` now requires both entry points, so the
   omission that broke the reconciliation producer on 2026‑10‑17 cannot recur.
3. **Historical recovery** — Rahman Asif (`7030dfe2…`) and Fardin‑7
   (`e6b961f7…`) were created from their real Admin confirmations, one
   transaction each, payroll `UNRESOLVED / END_DATE_REQUIRED`. Fardin‑7 keeps
   `employeeLink=UNRESOLVED` (no verified Employee Master record).
4. **Borkot Jidan** was deliberately **excluded** and has no Program; its
   cancellation (`AC762397…`) and reinstatement (`AC492FC1…`) evidence is
   preserved for the future event model.

### What Target 02 delivered (deployed 2026-11-04T18:28Z as `b058dd48`)

1. **P1 — free-text order parsing.** `parseEscortOrder` recognises the shape
   `Mother vessel <name>, <prose> / Mv <lighter> / Capacity … / K/a to … /
   master / <phone>` (line-separated or pipe-separated), gated so ordinary
   messages never match. It parses the Owner‑authorized Ritaj order correctly in
   offline evaluation; **no live free-text order has arrived yet**.
2. **P2 — register transition.** `persistConfirmedProgram` sets
   `status='CONFIRMED'` — a value the schema CHECK, the API summary and the UI
   already support — in the same transaction as the Program insert.
3. **Fail-closed link.** When a `reviewRowId` is named, the register UPDATE must
   match exactly one row belonging to that order and confirmation; otherwise
   `REGISTER_ROW_NOT_MATCHED` aborts the transaction. Callers with no register
   row pass an empty id and are unaffected.
4. **Tests:** 660 total / 649 pass / 7 environment-dependent failures (the same
   seven as the Target 01 baseline) / 4 skipped; typecheck and lint clean.

### Target 02 live verification — PENDING

No eligible order or confirmation has occurred since deployment. P1 and P2 are
**not** live-verified. The procedure and pass criteria are below under
"Live verification procedure" (multi-lighter drafts, event-specific deltas and
derived PN/LID scope).

### Git and deployment risks

- `target01-release` (`bd04e94`) and `target02-p1-p2` (`91124c0`) are **local
  only**; `origin/main` is `8096ed8`. Seven commits are unpushed.
- The primary `/opt/vps` worktree is on `target01-vessel-fragment-merge`
  (`cfdcc06`) with 20 dirty entries; local `main` is `6a71c8f`, nine commits
  behind `origin/main`.
- The running container's Compose labels record
  `config_files=/tmp/opencode/target02/...` with the same `working_dir`. The
  runtime never reads that file, but a future `docker compose` from the recorded
  path fails once `/tmp` is cleaned. `/opt/vps/apps/al-rifai/compose.yaml` already
  pins the same digest, so the risk is operational, not a downgrade.
- Fixing the labels requires recreating the app container (Docker labels are
  immutable) — a separate authorized deploy window.

### Immediate next actions (Owner‑gated)

1. Observe the next eligible event and run the verification procedure.
2. Publish `target01-release` and `target02-p1-p2`, tag the deploys, then
   fast‑forward `main`.
3. Normalise the deployment path (persistent worktree + one recreation).
4. Refresh `AGENTS.md` §0/§14.1 and this file when the next release lands.

---

## Business policy summary (2026-11-04)

**Vessel order intake.** Only the three verified Escort Client one-to-one WA-01
conversations (Hridoy, TCIS, Rezaul, including each PN/LID alias) are authorised
order sources. Approved groups are **evidence**, never order-originating. A valid
order needs Mother Vessel, Lighter Vessel and Master Mobile; a single message may
list several Lighters and each independently identifiable Lighter gets its **own
Draft**. Missing dates or shifts are never invented.

**Order confirmation.** The verified Admin’s **outgoing** WA-01 message in the
**same** client conversation, carrying the completed order with Escort Name,
Escort Mobile, Start Date and Shift, **is** the confirmation — no client
acknowledgement or second confirmation is required. It links to the original
Draft and yields exactly one Program and one Assignment per eligible Lighter,
with `confirmationMessageId` and `orderMessageId` provenance.

**Duplicates.** Unique WhatsApp message identity, `(account, epoch, source_hash,
block_key)` for drafts, business-key uniqueness, a deterministic Program id,
Program/Assignment primary keys, `ON CONFLICT DO NOTHING`, advisory locking and
PN/LID normalisation are enforced by the database plus code and covered by tests.
The Owner’s ±1-day potential-duplicate rule is implemented **only at staging
level** (`POTENTIAL_DUPLICATE_WITHIN_ONE_DAY_REQUIRES_REVIEW`) — it is not a
database constraint, and the release matcher still auto-applies pass 2. The same
escort on different Lighters the same day is legitimate; different Lighters under
one Mother Vessel are separate Programs.

**Release vs confirmation.** An order confirmation never ends a duty. Release
evidence comes from the approved Escort Release Group (messages and images), is
matched to an Escort and Program, and only then persists a verified End Date.
Image/OCR is an interface without an engine: release candidates carry
`image_ref` but no OCR extraction exists. Payroll is `UNRESOLVED /
END_DATE_REQUIRED` without a verified End Date and `CALCULATED` only once the End
Date and required inputs exist; `CALCULATED` is **not** `PAID` and cannot create a
Cash posting.

**Office Group.** Operational evidence only — program assignments, Ghat-duty
staffing, attendance, advances, transport and salary discussions. Attendance is
stored (`attendance_entries` 439, summary 216) but was backfilled from Programs,
not extracted from group messages; staffing/loans/salary extraction is planned.
Office Group messages never authorise a Program confirmation or a Cash posting.

**Cash.** A verified Admin’s outgoing instruction to the designated Accountant in
the authorised WA-01 direct conversation is the only authoritative payment
instruction. It is captured as a `REVIEW` instruction. `MANUAL_READY` means
“eligible for manual handling” — **not** a posting. There is no posting,
approval or settlement execution path (`cash_instruction_postings` does not
exist), which is why Cash Freeze stays in force and unfreezing is not
recommended.

**WA-02.** Identity-only in production: no cursors, no messages, no outbound
send capability anywhere in the codebase. Outbound notifications, employee
verification, AI conversations and recruitment answering are **PLANNED** and
require separate authorisation.

---

## Live verification procedure (Target 02 P1/P2)

Run only when an eligible event appears. Read-only; never send or replay.

1. **Scope (derived, never hard-coded).** Union of `conversation_scope`
   `canonical_chat_jid` + `alias_chat_jids`, `escort_roster_channel.chat_jid` and
   `escort_roster_channel.participant_jid` (`@lid`) → currently **11 addresses /
   7 conversations**. `conversation_scope.alias_chat_jids` alone misses the
   Rezaul and TCIS LIDs, which exist only as roster participants.
2. **Discovery.** New rows in those addresses since the last check; ignore Cash,
   release-group, office-group, media-only and staffing content.
3. **Classify before asserting deltas:** new order · new valid confirmation ·
   duplicate confirmation · already-confirmed Program · ambiguous (multiple
   drafts) · unmatched (no draft) · invalid/unauthorised. Only a new valid
   confirmation may add one Program + one Assignment.
4. **P1 (per Lighter).** Draft count = number of identifiable Lighters; each has
   correct mother/lighter/master, no invented date or shift, a `logicalOrderId`,
   one row per `(account, epoch, source_hash, block_key)`, and classification
   `ORDER_DRAFT_CREATED`. **P1 is only live-verified by a new free-text order** —
   a structured list does not count.
5. **P2.** Outgoing Admin in the same conversation, correct escort/mobile/date/
   shift, linked to the original Draft (a pre-deployment Draft is acceptable),
   exactly one Program and one Assignment, register row `CONFIRMED` with
   `parsed.programId` and `programCreatedAt`, payroll `UNRESOLVED` when the End
   Date is absent, Cash drafts unchanged.
6. **Verdict:** LIVE VERIFIED · FAILED · AMBIGUOUS (Owner review). Application
   health or passing tests never substitute for these criteria.

---

## READ THIS FIRST — a new agent's contract

1. **Read, in this order:** `AGENTS.md` (all of it, especially §0, §7, §13,
   §14) → this file → `docs/VPS_MAP.md` (paths, permissions, containers) →
   `apps/al-rifai/docs/MIGRATION-READINESS-0031-0032.md` only if working on
   Vessel command SQL.
2. **Do not start a destructive edit or change.** No production migration, no
   deploy, no image build, no container restart, no `app.env` edit, no
   `evidence/` write, no `git add -A`. A plan being discussed is not approval;
   approval of a plan is not approval of an unlisted destructive step inside it.
3. **Verify before you trust any number in a document.** Image digest, ledger
   count, row counts and cursor counts all drift. Re-read them (commands are in
   "Read-only verification" below) and report the timestamp with the figure.
4. **Do not re-run applied migrations.** The ledger is at **74** rows and
   migrations `0042`–`0070` are applied. `node scripts/database.mjs migrate`
   only validates/reconciles; never re-execute a numbered SQL file by hand.
5. **The ingestion worker writes business data.** It auto-applies
   high-confidence release candidates from the Escort Release Slip group
   (`RELEASE_GROUP_JID`) and recalculates `program_pay`. Do not disable,
   re-point or "test" that hook in production, and do not replay candidates.
6. **Stop-and-ask triggers:** failed build, missing mount, unexpected diff/block
   on an observation window, permission error on a production table, a route
   that 404s through the TLS entry, or any request that requires reading message
   bodies or credentials.
7. **Report per step, not per batch.** One commit per step; conventional
   message; explicit paths only. Include the deployed commit SHA and image
   digest in every deploy note.
8. **Nothing here authorises RBAC-3.** RBAC-3 has not been started and needs an
   explicit new Owner instruction.

---

## Cash parser correction and approved backfill — 2026-11-03

The shared live/historical Cash parser and source gate were corrected and
deployed in the Cash parser release described below. The exact source remains verified WA-01
Admin outgoing → designated Accountant direct chat. Forwarded, quoted, copied,
pasted or manually typed content is accepted; `B` and `N` are the only method
markers. Employee ID remains text and is the match key; payout number is
separate. Distinct source messages/blocks remain distinct.

The bounded historical apply was explicitly approved for write-set digest
`d7fe95c1334bc3b6417501b498d18eff0da3566e64baac4aae1ea0ca8e231387` and
completed as batch `backfill-20261103-cash-d7fe95c1` at
**2026-11-03T21:59:16.709Z UTC**. It inserted **90** source-linked Current
Cash instructions, all `REVIEW`: **65** exact Employee ID matches and **25**
employee-review cases (**18** unmatched IDs, **7** Employee ID/name conflicts).
The approved set totals **BDT 45,400.00**. No employee was created or changed.
The batch also verified **1,997** pre-existing source-linked instructions as
duplicates; the applied run completed with 2,087 eligible blocks, 90 written,
1,997 duplicates, 25 queued for review, and no unresolved source-verification
groups. The run is `PUBLISHED` with `inserted=90`, `cash_published=90`,
`cash_duplicate=1997`.

A fresh pre-write dump was verified at
`/var/lib/vps/al-rifai/backups/pre-cash-backfill-20261103-2156.dump`
(64,311,053 bytes, mode `600`, SHA-256
`78e27c3b7831b4cac9c1b25d6c0edba7ba6d7dcc4379ee07a2b356163819efff`; custom
archive listing and sidecar checksum both passed). The final post-apply
read-only reconciliation cutoff was **2026-11-03T21:59:46.915Z UTC**. It found
0 newly eligible blocks and the same 90 approved source identities linked to
90 `REVIEW` instructions. Current totals are **2,094 instructions / 0
postings**; this includes 7 pre-existing Current records without parsed source
keys. Legacy totals remain **1,586 instructions / 1,586 postings totaling
BDT 852,259.00**. No posting, approval, settlement, migration, deployment,
configuration change or restart occurred. Total parsed historical instruction
amount is **BDT 1,046,499.00**, not a paid or posted amount. The 11 Owner
samples parse as 11 blocks / 9 Employee IDs / 8 bKash / 3 Nagad and total
**BDT 6,800**, not BDT 7,100.

**Native history coverage remains partial.** The existing WA-01 native event
reader was accessible for metadata. Across 45 bounded pages it returned 445
events in the designated LID chat, including 409 unique Admin-sent message
IDs; the PN address returned no events. All 409 native IDs matched PostgreSQL,
with no native-only IDs. PostgreSQL has another **1,892 authorized outgoing
IDs** absent from the exposed native event stream; no date attribution for
those IDs was established. The exposed stream begins
**2026-10-14T14:58:16Z**, while PostgreSQL originals span
**2026-07-12T14:26:32Z–2026-11-03T18:00:28Z**. `list_native_messages` is
cursor-bound and a null cursor snapshots the current high-water mark rather
than returning historical messages. Direct access to the service-owned WA-01
SQLite store was not used. Thus the backfill is complete for the verified
PostgreSQL write set, not proof of complete native-history coverage. No message
bodies were read during native metadata comparison.

The latest source-message timestamp is **2026-11-03T18:00:28Z**; native cursor
observation reached **21:56:42.845Z** and both Cash channels were enabled and
error-free. The source set covered **2,491** designated-chat originals plus
**2,278** staging copies (4,769 storage rows), resolving to 2,491 distinct
messages. All **19** conflicting source-copy groups selected one canonical
PostgreSQL original; 2,278 duplicate storage copies were skipped. Of the 2,301
authorized Admin outgoing messages, 84 were other authorized messages and 130
had invalid/missing Cash fields. There are no unauthorized-chat Cash
instructions in the audited instruction set. The 7 Current and 5 legacy
records without parsed source keys remain separate reconciliation items.

### Cash parser release — deployed 2026-11-03
## Cash parser release — deployed 2026-11-03

Source commit `38ce0da8c9623b4b099b5bad87003b9c257e88c8` was pushed to
`cash-parser-release-20261103`; compose pin commit
`81f385f36fbf00b8abc0770ed4c1adeb8e2314cb` pins image
`sha256:103f59f27321a93cb59fb72a1b3dce20ac176da5dd5bb046a68366f8c00a24a5`
(tag `local/al-rifai:20261103-cash-parser-38ce0da`). The release includes only
the 10 reviewed parser, source-gate, live processor/publisher, Docker packaging,
backfill-safety and regression-test files; unrelated Cash USER permission/UI
changes were excluded and remain uncommitted in the main worktree.

Verification on the committed source: 42 focused tests passed / 2 skipped;
typecheck, full lint (0 errors/warnings), production build and the 29-module
runtime import check passed. The deployed container passed all 11 Owner parser
examples (BDT 6,800), Employee ID/payout separation, and source-gate assertions
(authorized WA-01 Admin → Accountant eligible; WA-02 and incoming rejected).
The Cash continuation started in review-only mode; 13,905 Cash processing rows
had no errors, and all 11 native cursors were error-free. No new authorized
message arrived during verification, so genuine message-to-instruction
completion and creation of a new `REVIEW` instruction remain **PENDING**.
Production smoke checks: `/login` and `/api/health` 200; unauthenticated
`/vessel`, `/api/vessel-programs`, and `/api/cash/summary` 401. No new error
signature appeared; app healthy, `RestartCount=0`.

Post-deploy counts are unchanged: Current **2,094 REVIEW instructions / 0
postings**; Legacy **1,610 instructions / 1,586 postings**. The approved
backfill remains `PUBLISHED`, 90 inserted. Fresh pre-deploy backup
(tag `local/al-rifai:20261103-cash-parser-38ce0da`). The release contains only
the 10 reviewed parser, source-gate, live processor/publisher, Docker packaging,
backfill-safety and regression-test files; unrelated Cash USER permission/UI
changes were excluded.

Verification on committed source: 42 focused tests passed / 2 skipped;
typecheck, lint (0 errors/warnings), production build and the 29-module runtime
import check passed. The deployed container passed all 11 Owner parser examples
(BDT 6,800), Employee ID/payout separation and source-gate assertions
(authorized WA-01 Admin → Accountant eligible; WA-02 and incoming rejected).
Cash continuation started in review-only mode; 13,905 Cash processing rows had
no errors, and all 11 native cursors were error-free. No new authorized message
arrived, so genuine message-to-instruction completion remains **PENDING**.
`/login` and `/api/health` returned 200; unauthenticated `/vessel`,
`/api/vessel-programs` and `/api/cash/summary` returned 401. No new error
signature appeared; app healthy, `RestartCount=0`.

Post-deploy counts: Current **2,094 REVIEW instructions / 0 postings**; Legacy
**1,610 instructions / 1,586 postings**. Backfill remains `PUBLISHED`, 90
inserted. Fresh backup
`/var/lib/vps/al-rifai/backups/pre-cash-parser-20261103-2353.dump` is
64,371,520 bytes, mode `600 root:root`, SHA-256
`0da75c439af5a224a2ecf5f9e45af0d2d027a9831069d52ceff71505fd5e533d`; checksum
and 765-entry PostgreSQL archive catalog verified. Rollback images
`sha256:a3e53997…` and `sha256:69ccb8f6…` are present. No migration, financial
posting, bridge restart, permission change, or Cash Freeze change occurred.

---

## Production State (verified 2026-11-03)
## Production State

| Field | Value |
|---|---|
| App image | `sha256:103f59f27321a93cb59fb72a1b3dce20ac176da5dd5bb046a68366f8c00a24a5` (tag `local/al-rifai:20261103-cash-parser-38ce0da`, source `38ce0da`, compose pin `81f385f`) |
| App mode | `on` |
| App container | `al-rifai-app-1`, healthy, `RestartCount=0` |
| Migration ledger | **74** rows in `public.alrifai_schema_migrations` (through `0070_cash_review_mirror.sql`) |
| Roster source | `DB` (Phase D1 cutover 2026-11-02); health reports `roster_mode="DB"` and `roster_shadow.mode="DB"`, `cycles_completed=60`, `diffs_found=0` |
| Roster | 10 active persons / 28 active channels / epoch 4 |
| Bridge profile | sha256 `1a967be7…` — 11 chats, epoch 4, `root:whatsapp-wa-01` `0440` |
| Ingestion | **11/11** native cursors, `last_error=NULL`, 0 errors |
| Employee master | **216** rows, all `CONFIRMED`; **75** `duty_type='escort'`, **75** `designation='escort'` |
| Programs | **90** (`85` Confirmed / `5` Draft); **37** carry an `endDate` (released) |
| Derived vessel pay | `program_pay` = **85** rows: **37** `CALCULATED` (818 shifts = 409 days, salary BDT 163,600 + conveyance BDT 5,200 = **BDT 168,800**), **48** `UNRESOLVED` (ongoing duty, no `endDate` → UI shows ৳—) |
| Rates | `escort_rate_config`: **BDT 200.00 per shift** (uniform; half-day unit, so BDT 400/day) + per-destination conveyance, effective `2025-01-01` |
| Release candidates | **140** rows: **37** `APPLIED`, **13** `MATCHED`, **6** `NO_PAYMENT`, **84** `ROSTER_MISMATCH` |
| Review queue | `review_items` = 0 live rows (all workflow test items rolled back) |
| Cash accounts | 3 (1 `ADMIN` / 2 `USER`), 0 must-change, last password change 2026-10-28/29 |
| Bridges | WA-01 `sha256:28a646d2…` (profile restart `2026-11-02T07:17:09Z`); WA-02 `sha256:d36ca851…` untouched |
| PostgreSQL | `vps-infra-postgres-1` untouched (`RestartCount=0`) |
| `app.env` | `600 root:root`, 557 bytes, mtime 2026-11-02 |
| Cash Freeze | intact — **0** current postings (1,586 archive-epoch postings only); no financial write in this work |

Health shape:

```json
{"status":"ok","roster_mode":"DB","roster_shadow":{"mode":"DB","cycles_completed":60,"diffs_found":0,"auto_promote_blocked":false}}
```

**Rollback images (local, verified present):**

- `sha256:a3e53997…` — tag `20261103-rbac2b-fix2` (immediate rollback)
- `sha256:69ccb8f6…` — tag `20261103-rbac2b-hotfix`
- `sha256:e93005db…` — tag `20261103-rbac2b`
- `sha256:87a46169…` — tag `20261103-rbac2a`
- `sha256:ad590773…` — tag `20261103-p5-skin`
- `sha256:2ca12a94…` — tag `20261103-vessel-12col`
- `sha256:7792e489…` — tag `20261103-emp-master-p3`
- `sha256:d382b6da…` — tag `20261103-emp-master-p2`
- `sha256:895ad208…` — tag `20261103-emp-master-p1`
- older: `20261102-b4-cash-page` (`c2759c80…`), `20261102-b2-employee-txn` (`7735007b…`), `20261101-shadow-recheck` (`381fd22f…`), `20261101-b3-typeahead` (`61ccaf56…`), `20261031-b1-columns` (`8e4383a9…`), `20261031-typeahead` (`1911fdfd…`), `20261030-phase4` (`ca27d77c…`), `rollback-app-phase2` (`1d4602c3…`)

**Backups (mode 600 + `.sha256` sidecar, `/var/lib/vps/al-rifai/backups/`):**

| Phase | File |
|---|---|
| Employee master P1/P2 | `pre-r1-candidates-20261102-2057.dump`, `pre-r1-passes-20261102-2106.dump`, `pre-r1-seq-20261102-2130.dump`, `pre-r1-stepd-20261102-2159.dump` |
| Vessel page | `pre-r1-deploy-20261102-2206.dump`, `pre-r2-deploy-20261102-2231.dump`, `pre-a3-deploy-20261102-2257.dump`, `pre-toolbar-fix-20261102-2306.dump` |
| Phase 5 skin | `pre-0063-20261103-090136.dump` |
| RBAC-2A | `pre-rbac2-20261103-120642.dump` (64,243,998 B) |
| RBAC-2B | `pre-rbac2b-20261103-123406.dump` (64,302,468 B) |
| Password policy (latest) | `pre-password-policy-20261103-1733.dump` — 64,309,318 B, sha256 `4f864c2c82786b5f312c521042d40a063860aee19d2ed8efe4bc10a866bbfdac`, 83 table-data sections |

Every phase took its own `pg_dump` before any migration or deploy. Keep that
rule: a new phase starts with a new dump, hash recorded in the commit message or
handoff, never `/tmp`.

---

## What changed in this work (2026-11-02 → 2026-11-03)

### B5 — vessel pay model and register operations (migrations `0042`–`0050`)

The Owner decided the data model on 2026-11-02, so B5 is no longer blocked. What
was built:

- `0042_escort_rate_config.sql` — `escort_rate_config` + destination aliases.
  Only 21 of 83 programs carried a destination and the spellings disagreed
  (`Narayanganj`, `Narayongonj`, `N. Gonj`, `N.Para`, …), so pricing goes through
  a normalized `destination_key`, never a raw string join. Money is **bigint
  paisa**, consistent with `cash_instructions.amount_minor`.
- `0046_vessel_rate_seed.sql` — the real, **Owner-confirmed** schedule:
  **BDT 200.00 per shift, uniform across every destination** (a shift is half a
  day, so BDT 400.00/day) plus per-destination conveyance (BDT 600–1,000),
  effective `2025-01-01`. `N. Gonj` is the umbrella name; individual ghats
  (Murapara, Habib Ghat, Nitaigonj, …) carry their own conveyance.
- `0043_program_pay.sql` — `program_pay`, a **derived** table. It cannot live on
  `programs`: that table is under an immutability trigger
  (`program_command_history`), so a later rate correction could not rewrite a
  stored salary without fabricating a command. Every row is reproducible by
  `recalculate_program_pay(program_id)`; cascading deletes keep it aligned.
- `0044` / `0045` / `0047` / `0049` — pay functions, first backfill, recalculation
  under the Owner rates, recalculation under the corrected shift model.
- `0048_vessel_shift_model.sql` — **the correct shift model** (Owner, 2026-11-02):
  each day has shift `D` and `N`; a program runs `start(date,shift)` →
  `end(date,shift)` **inclusive**; `days = shifts / 2`. Example:
  `2026-11-02(N) → 2026-11-20(D)` = 36 shifts = 18 days = BDT 7,200.
  **While `endDate` is empty the duty is ongoing, so nothing is calculated** —
  `UNRESOLVED / END_DATE_REQUIRED`, and the register honestly shows `৳—`.
- `0050_vessel_fled_command.sql` — `fled` status + `FLEE_PROGRAM` command
  ("Fleed A" / absconded), modelled exactly on the void command (same guards,
  optimistic revision check, idempotent command key, append-only event log).
- UI: `/vessel` shows derived pay (b33464e), Actions column + per-employee
  program history (45871ec), status control and the flee command (d41e0f2),
  shift columns and the sidebar edit flow (b005c01), plus the filter toolbar and
  employee-history toolbar (`ff8540f`, `55fdd2c`) with the URL-sync remount bug
  fixed in `3cefa9f` and a temporal-dead-zone crash fixed in `bbda96a`.

**Current result:** 37 programs have been released (`endDate` set) and are
`CALCULATED`; 48 remain `UNRESOLVED` because they are still running. Totals:
818 shifts = 409 days, BDT 163,600 salary + BDT 5,200 conveyance = **BDT
168,800**.

### R1 — Escort Release Parser (migrations `0051`–`0055`)

- `0051_release_candidates.sql` — `release_candidates` staging table. Adapted to
  reality: the register is `public.programs` with a TEXT id (not
  `vessel_programs` with an integer key); `REJECTED` added to the status CHECK
  (the reject endpoint needs it); dedupe is per `(source_msg_id, escort)`
  because one message can describe several escorts.
- Parser + roster matching (`2319890`), then three-pass matching (`e20148c`) and
  the backfill (`58e731a`, `e4dcd64`): `MATCHED`, `ROSTER_MISMATCH`,
  `NO_PAYMENT`, `PENDING_REVIEW`, `REJECTED`.
- `0052` pass tracking, `0053` `mismatch_kind`, `0054` `APPLIED` +
  `confidence` (`high` for Steps A/B/C, `medium` for Step D lump-sum
  settlements), `0055` makes the apply flow recalculate pay.
- `942c03f` — the backfill verifies its source and reports mismatch kinds
  instead of inventing a match; `d9a85c3` — a payment after a release is a new
  duty, not a partial.
- API `GET/POST /api/release-candidates`, per-candidate `[id]`, and
  `apply-all-high`; CLI `scripts/apply-high-releases.ts`.
- Ingestion hook (`e97b3a9`): **only** the Escort Release Slip group
  `120363408741101070@g.us`, only when new records arrived, and any parser error
  is logged and swallowed so it can never disturb ingestion.

### R2 — release review UI and auto-apply (migration `0056`)

- `/platform/release-review` (`f48a5a3`) — admin review surface for candidates.
- `0056_release_auto_apply_log.sql` — dedicated audit table. The specification
  said "migration_ledger", but that is `alrifai_schema_migrations`, which
  `scripts/database.mjs migrate` validates; polluting it would break validation.
- `c3ac84f` — the ingestion hook auto-applies **only** candidates that are
  `MATCHED`, `confidence='high'`, `match_pass IN (1,2)`, with a program that is
  lower-case `confirmed` and has an empty `endDate`, and with `end_shift`
  present. Everything else queues for review. Each application appends a
  `RELEASE_PROGRAM` command event; the log table adds the machine-triggered
  context. Failures are counted and queued, never retried blindly.
- `70a2b83` — `vessel-command-policy` had to be shipped in the runtime image;
  the build-time assertion from `b6fbbf0` now guards this class of missing-module
  bug.

**Current result:** 140 candidates — **37 APPLIED**, 13 MATCHED, 6 NO_PAYMENT,
84 ROSTER_MISMATCH. `release_auto_apply_log` is **empty**, i.e. the 37 were
applied through the review/CLI flow, not by the ingestion hook. The hook is
live, so the next new high-confidence release message can apply a release
without a human step — that is an intentional production write authority and
must not be "fixed" without an Owner instruction.

### Phase 1 — employee master: fields, statuses, duty types

- Migration `0057_employee_master_fields.sql`: adds the master columns
  (`designation`, `duty_type`, `status`, `confirmed_by`, `confirmed_at`, …) to
  `public.employee_master`.
- **191** register rows moved `REVIEW → CONFIRMED` under
  `confirmed_by='owner_bulk_confirm_phase1'` (explicit Owner authorization).
- **50** rows set `duty_type='escort'`; final distribution **75 escort / 141
  NULL** out of 216. `duty_type` is a *duty* discriminator, not a rank.
- Commits `0a3cb2e` + `1411d1c`, image `895ad208…`.

### Phase 2 — mobile normalization, escorts backfilled, readable view, duplicate guard

- `0058_normalize_mobile.sql`: normalization function + index.
- `0059_backfill_program_escorts.sql`: **25** additional escorts backfilled →
  216 total.
- `0060_program_with_employee_view.sql`: read-only view joining program rows to
  the master (**85/90** join at the time; cash join 191/191).
- `0061_prevent_duplicate_employee.sql`: trigger preventing a duplicate identity
  for the same `(scope_account, employee_mobile)`.
- Commits `a429cb5`, `7f69dd0`, `651af4a`, `0b78724`, `8c75bf5`; image
  `d382b6da…`.

### Phase 3 — employee auto-create from vessel programs

- `0062_create_employee_if_new.sql`: idempotent create-if-new used by the
  Vessel program write path.
- Hook in `app/api/vessel-programs/route.ts` (add + edit paths), **fail-closed**:
  if the employee cannot be resolved, the program write is refused and mapped to
  a 400, never silently skipped.
- Added the `sonner` `<Toaster>` used by the new UI surfaces.
- Commits `8136bff`, `6dd1e70`, `f60ce25`, `61f1db0`; image `7792e489…`.
- **Disclosed mistake:** a synthetic row `+8801799887766 / "priv test"` was
  created during a privilege test and deleted immediately. Zero rows remain with
  `confirmed_by='vessel_auto'`. Treat synthetic business data as prohibited.

### Phase 4 — unified `/vessel` table

- One table, **11 headers / 11 cells**, Mother vessel + Lighter split, columns
  End / Days / Salary / Conv. / Total, `data-record-id` on every row,
  responsive min-width 720 → 1100 px.
- Commits `1ec95aa`, `73f706c`; image `2ca12a94…`.

### Phase 5 — design skin

- `0063_grant_program_view.sql`: durable grant of `program_with_employee` to
  `ir_review_runtime` (runtime role used by the Cash read path).
- `app/register-skin.css` applied to `/vessel-register` and
  `/employee/[phone]/programs`.
- `app/sidebar-dark.css` + `AppShell` `variant='light'|'dark'`.
- Contrast corrected to WCAG AA (verified by computed ratios, not by eye).
- Commits `e30f137`, `73ab260`, `89d3bdd`, `ea627e9`; image `ad590773…`.

### RBAC-2A — attendance, review queue schema, capabilities

- `0064_designation_check.sql` — designation CHECK + backfill (**75**).
- `0065_attendance_entries.sql`, `0065b_attendance_summary.sql`,
  `0065c_attendance_summary_owner_rights.sql` — attendance table + summary view
  and its owner rights.
- Backfill `db/backfills/0065_attendance_from_programs.sql` — **439** entries
  across **35** employees, derived from existing program rows (no invented data).
- `0066_review_queue.sql` — `review_items` + `review_decisions` (append-only).
- `0067_workflow_functions.sql`, `0067b_workflow_decide_audit_id.sql` —
  `workflow_submit()`, `workflow_decide()`, `workflow_withdraw()` and the domain
  appliers.
- `0068_capabilities.sql` — capability vocabulary/backfill.
- New `GET /api/employees/lookup` (read-only employee search).
- `PlatformPage` gains `access='user'|'admin'`; nav entries gain `adminOnly`.
- Commits `49a1a48`, `4457d1f`, `6880407`, `a7ecae2`, `3d92718`, `4bd2dfc`;
  image `87a46169…`.

### RBAC-2B — attendance page, review queue UI, submissions, submit paths

- `0069_attendance_direct.sql` — hours/notes columns + `attendance_create_direct`
  for ADMIN.
- New UI: `/attendance`, rebuild of `/review`, `/submissions`.
- Shared `EmployeeLookup` component (one picker, no duplicated suggestion code).
- Vessel USER path: USER can create/edit a program and **submit it for review**
  rather than write it confirmed.
- Routes: `POST /api/review/submit`, `POST /api/review/decide`,
  `POST /api/review/withdraw`, `GET /api/review/list`,
  `GET /api/attendance/summary`, `POST /api/attendance/add`.
- `lib/review-api.ts` — thin client for those routes.
- Integration flows verified inside rolled-back transactions (no residual rows).
- Commits `3e32021`, `b99f85c`, `76abf0a`, `8076871`, `b5c1259`, `4c972fc`,
  `282218e`, `b0b2658`; image `e93005db…`.

### RBAC-2B hotfix — pages were 404 through the TLS entry

- `a9cbcc8`: `/review`, `/attendance`, `/submissions` added to
  `WORKSPACE_PATHS` in `release/entry-rules.mjs` (Next served them; the private
  entry answered 404 first — this is the classic symptom, see constraints).
- `9eeb692`: USER "Add program" was disabled in `/vessel-register`; enabled with
  toasts.
- `a90efb1`: `.wx-page` scaffold applied to the three new pages.
- `ae26849`: deploy pin. Image `69ccb8f6…`.

### Fix batch 2 — ADMIN vessel command, Cash in the review queue

- `825c070`: `canCommandVessel` accepted only `userId === 'local-validator'`, so
  ADMIN could not add a program from `/vessel` despite the UI. Now accepts
  ADMIN + the `vessel.command` capability. **The actor env was never the
  problem** — `ALRIFAI_VESSEL_COMMAND_ACTOR` is unset and falls back to the
  verified `ALRIFAI_CASH_OWNER_PERSON_REF`.
- `4f5eeaa`: `0070_cash_review_mirror.sql` — Cash keeps its own two-step
  authority (`cash_submissions` → `cash_submission_reviews`). Submissions are
  **mirrored** into `review_items` (`domain='CASH'`) for visibility;
  `cash_review_mirror_close()` closes the mirror row when the Cash decision is
  recorded, so the queue never shows a stale PENDING item. Also backfills
  `cash.read` / `cash.submit` onto stored capability arrays (role defaults exist
  in code, but `workflow_submit()` checks the stored array).
- `5792fd1`: `/cash/submissions` uses the shared `EmployeeLookup`; `/review`
  CASH actions delegate to `/api/cash/submissions/{id}/decision`.
- `e8b1ba1`: deploy pin. Image `a3e53997…`.

### Task A — password policy

- `5a72404`: the **current-password prompt is removed** from every self-service
  change flow (`/admin`, the forced change at `/login`, `/cash`). Minimum
  password length is **8**, defined once in `lib/password-policy.ts`
  (`MIN_PASSWORD_LENGTH`, `isAcceptablePassword()`), used by `hashPassword`, both
  password routes and all three forms.
- `b01a53e`: refreshed three stale test pins RBAC-2B had left behind
  (`resolveCapabilities('USER')` defaults, `/review` allowed on the cash host,
  "Source Review" nav label).
- New `tests/password-policy.mjs`, registered in `package.json`, pins the 8-char
  rule and the one documented exception.
- `f409510`: deploy pin. Image `be6767d1…`.

**Deliberate exception:** the `/admin` **"Change username"** flow still verifies
the current password (5 remaining `currentPassword` occurrences). Changing a
login identity is more dangerous than changing a password and was not part of
the instruction. `tests/password-policy.mjs` asserts the exception so a later
refactor does not remove it silently.

**Security consequence — stated, not mitigated:** a password change now needs
only a live session cookie + CSRF token. Anyone who steals a session can set a
new password and lock the Owner out. The Owner was told before deployment; no
mitigation was implemented. If this matters, the remedy is a second factor or a
step-up check, and it needs its own Owner instruction.

The policy applies uniformly to self-change, admin reset and account creation
(temporary password). Login identity change stays password-confirmed.

---

## Migrations applied in this work

All are applied and ledgered; the ledger is **74**. Do not re-run them.

| File | Purpose |
|---|---|
| `0042_escort_rate_config.sql` | rate config + destination aliases |
| `0043_program_pay.sql` | derived `program_pay` table |
| `0044_vessel_pay_functions.sql` | pay calculation functions |
| `0045_vessel_pay_backfill.sql` | first pay backfill |
| `0046_vessel_rate_seed.sql` | Owner-confirmed rate schedule (BDT 200/shift) |
| `0047_vessel_pay_recalculate.sql` | recalculate under the Owner rates |
| `0048_vessel_shift_model.sql` | D/N shift model, inclusive, days = shifts/2 |
| `0049_vessel_pay_shift_recalc.sql` | recalculate under the corrected shift model |
| `0050_vessel_fled_command.sql` | `fled` status + `FLEE_PROGRAM` command |
| `0051_release_candidates.sql` | release candidate staging |
| `0052_release_candidate_passes.sql` | match pass tracking |
| `0053_release_mismatch_kind.sql` | mismatch kind |
| `0054_release_confidence_applied.sql` | `APPLIED` status + confidence |
| `0055_recalculate_privileges.sql` | apply flow may recalculate pay |
| `0056_release_auto_apply_log.sql` | auto-apply audit table |
| `0057_employee_master_fields.sql` | master columns, statuses, confirmation fields |
| `0058_normalize_mobile.sql` | mobile normalization + index |
| `0059_backfill_program_escorts.sql` | backfill escorts from program rows |
| `0060_program_with_employee_view.sql` | `program_with_employee` read view |
| `0061_prevent_duplicate_employee.sql` | duplicate-identity trigger |
| `0062_create_employee_if_new.sql` | idempotent create-if-new |
| `0063_grant_program_view.sql` | grant view to `ir_review_runtime` |
| `0064_designation_check.sql` | designation CHECK + backfill |
| `0065_attendance_entries.sql` | `attendance_entries` |
| `0065b_attendance_summary.sql` | attendance summary view |
| `0065c_attendance_summary_owner_rights.sql` | owner rights on the view |
| `0066_review_queue.sql` | `review_items`, `review_decisions` |
| `0067_workflow_functions.sql` | submit/decide/withdraw + appliers |
| `0067b_workflow_decide_audit_id.sql` | audit id on decisions |
| `0068_capabilities.sql` | capability backfill |
| `0069_attendance_direct.sql` | hours/notes + direct create for ADMIN |
| `0070_cash_review_mirror.sql` | Cash mirror rows + mirror-close + cash caps |

Backfill: `db/backfills/0065_attendance_from_programs.sql` — already executed;
it is a record, not a pending script.

**Ledger insertion procedure used (and required):** insert the ledger row by hand
as `vps_pg_admin` with the migration file's sha256, then let the deployed image's
`node scripts/database.mjs migrate` validate/reconcile. Never point a raw
migration file at the production database.

---

## RBAC / review workflow — how it actually behaves

- **Roles are stored in `cash_portal_users`** (table name retained on purpose;
  it is the account table for both domains). One `ADMIN`, two `USER`.
- **Capabilities** live in `lib/unified-auth-policy.ts`:
  - ADMIN: `cash.read`, `cash.submit`, `cash.review`, `vessel.read`,
    `vessel.command`, `vessel.submit`, `employee.submit`, `attendance.submit`,
    `audit.read`
  - USER: `cash.read`, `cash.submit`, `vessel.read`, `vessel.submit`,
    `employee.submit`, `attendance.submit`
  - USER never holds a direct-write capability; it stages work for review.
- **Implemented review domains:** `VESSEL_PROGRAM`, `ATTENDANCE`, `EMPLOYEE`.
  `VESSEL_EDIT`, `CASH`, `PROGRAM_RELEASE` are accepted at submit time but refuse
  approval with `DOMAIN_NOT_IMPLEMENTED:<domain>`.
- **`workflow_decide()` refusal codes:** `ADMIN_REQUIRED`,
  `REVIEWER_IS_SUBMITTER`, `VERSION_CONFLICT`, `ITEM_NOT_PENDING`,
  `DOMAIN_NOT_IMPLEMENTED:<domain>`.
- **Every write route resolves the caller's user id from the
  `__Host-alrifai_cash` session cookie.** Never accept an actor/user id from the
  request body. This is enforced by tests; do not weaken it.
- **Single-admin consequence:** with only one ADMIN, an admin's own submission
  cannot be approved (`REVIEWER_IS_SUBMITTER`) — true from both `/review` and
  `/cash/submissions`. This is intentional; do not "fix" it by allowing
  self-approval.
- **Cash keeps its own two-step authority.** `/review` is a visibility and
  delegation surface for `domain='CASH'`, never a second approval path.
- **ADMIN creates go straight to CONFIRMED.** The review workflow covers regular
  USER creates; there is no PENDING state outside the queue.
- **Employee appearing from a pending program stays `REVIEW`** and is hidden
  from staff views until confirmed.

---

## Read-only verification (safe to run)

```bash
# health
curl -fsS http://127.0.0.1:3000/api/health

# image actually running + restart count
docker inspect al-rifai-app-1 --format '{{.Config.Image}} {{.RestartCount}} {{.State.Health.Status}}'

# ledger
docker exec -i vps-infra-postgres-1 psql -U alrifai_app -d alrifai -At \
  -c "SELECT count(*) FROM public.alrifai_schema_migrations;"

# cursors
docker exec -i vps-infra-postgres-1 psql -U alrifai_app -d alrifai -At -F'|' \
  -c "SELECT count(*), count(*) FILTER (WHERE last_error IS NULL) FROM whatsapp_native_sync_state;"

# containers
docker ps --format '{{.Names}}\t{{.RunningFor}}\t{{.Status}}' \
  | grep -E 'al-rifai-app|wa-0|postgres'
```

**Through-`:443` probes are the only valid route check.** `127.0.0.1:3000` talks
to Next directly and bypasses the TLS private entry (`release/entry-rules.mjs`),
which is exactly how a previous "it works" became a 404 in production:

```bash
curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
  -H 'Host: alrifai.iamazim.com' https://127.0.0.1/vessel
```

Expected: workspace pages **401**, `/login` **200**, unknown paths **403** on the
main host and **404** on the cash host, with 0-byte bodies.

---

## Open items / next session

| Item | State | Needs |
|---|---|---|
| **RBAC-3** | NOT STARTED | explicit Owner instruction. Do not infer it from RBAC-2B. |
| **Task B** | never received | the "Two Tasks" message supplied only Task A. Ask the Owner. |
| **B5** — vessel operations page (salary, conveyance, total days) | **DELIVERED** — Owner confirmed the model 2026-11-02; rates `0042`/`0046`, derived pay `0043`–`0049`, register actions/status/flee `0050`. 37 programs released and priced; 48 ongoing show ৳— by design. | nothing blocking; extend only with a new instruction. |
| **R1/R2** — release parser, review UI, auto-apply | **DEPLOYED** — `0051`–`0056`, `/platform/release-review`, ingestion hook. 37 releases applied. | monitor; do not disable auto-apply or replay candidates without an instruction. |
| **Phase E** — wire `/review` to the roster outbox, decommission legacy paths | pending | next large work item; design first. |
| Typeahead on `/cash/archive` and `/cash/submissions` | deferred | needs a read-only employee lookup endpoint (note: `/api/employees/lookup` now exists — re-check whether this is unblocked before writing a new one). |
| Authenticated visual check of new UI | pending Owner login | no headless browser on the host; verification so far is code/data/bundle/log/metric level. |
| Password-policy risk | accepted, disclosed | theft of a session can take over the account. Mitigation needs its own instruction. |
| AI/Ollama assistant | deferred | — |

---

## Hard constraints (repeat of `AGENTS.md` §13 — follow it verbatim)

- **NEVER `systemctl restart docker`.** Bridges run `RestartPolicy=no` and do not
  come back; this caused a 2 h 34 m outage on 2026-10-31. Use
  `docker restart <container>` for one container, and
  `docker compose -f compose.yaml up -d --no-deps app` for the app.
- **NEVER `git add -A` / `git add .`.** Stage explicit paths; read
  `git status --short` before committing.
- **No writes to `app.env`** and **no writes to
  `/var/lib/vps/al-rifai/evidence/`** without explicit Owner authorization.
  `app.env` must stay `600 root:root`; evidence files are checksum-pinned and
  overwriting one turns evidence-backed routes into 500s.
- **Backup before every phase/migration/deploy**: `pg_dump`, hash, mode 600,
  `.sha256` sidecar, persistent path. `/tmp` is not durable.
- **Deploy the exact verified artifact.** Never re-cut an image to piggyback a
  change. Compose pin edits keep the `sha256:` prefix on both sides; verify with
  `grep '^    image:'` and `docker compose config -q`.
- **Build with** `--build-context evidence=/var/lib/vps/al-rifai/evidence`.
  A failed build is stop-and-ask — never a Dockerfile rewrite or a placeholder.
- **Deploy gate** is the TAP block with 0 failures (259 tests, 3 skip), not the
  `pnpm test` exit code (the post-TAP `source-register.mjs` needs Owner
  evidence). `node scripts/lint.mjs` exits 1 on the host because it walks
  untracked `data/` and `qualification/`; use per-file ESLint on changed files.
- **Roster change ⇒ full D2 cycle** (`AGENTS.md` §13.21): regenerate profile →
  drift check → Owner approves the diff → deploy profile `root:whatsapp-wa-01`
  `0440` with a backup → `docker restart` WA-01 **once**. Roster rows must exist
  before regeneration; a functional diff exits **1** and that is success.
- **No `nsenter`/`strace`/namespace attachment**, no reading secret files,
  no printing token/password values. Use `test -r` to check a secret exists.
- **No WhatsApp sends, no re-pairing, no cursor resets, no table clears, no
  employee merges, no scope expansion** without exact authorization.

---

## Known operational gotchas

- **`lib/*.ts` imported by `node --experimental-strip-types` needs the explicit
  `.ts` extension** (e.g. `./password-policy.ts`), or it fails with
  `ERR_MODULE_NOT_FOUND`.
- **`release/entry-rules.mjs` is the TLS allowlist.** A new page reachable in
  Next can still 404 in production because the private entry rejects it before
  Next sees the request. Add the path to `WORKSPACE_PATHS` (shared by both hosts)
  and cover it in `tests/entry-rules.mjs`.
- **`escort_order_register.status` never equals `'CONFIRMED'`.** Only `DRAFT` and
  `REVIEW` exist; confirmation is `confirmation_message_id IS NOT NULL`. Filtering
  on `status='CONFIRMED'` returns zero rows forever.
- **`alrifai_app` has no SELECT on `cash_portal_users`, `cash_instructions` or
  `cash_postings`.** Use the documented read paths or `vps_pg_admin` for
  inspection; a `permission denied` is not a missing table.
- **The deployed runtime image does not ship `tests/`.** Running `node --test`
  inside the container yields `1..0` — that is not evidence of passing tests.
- **Currency:** DB stores paisa; UI shows Taka (÷ 100). Do not "fix" totals by
  multiplying.
- **`lib/cash-publish.ts` is untouched** by all of this work; Cash still inserts
  `REVIEW` and never resets state.

---

## Key file paths

| Purpose | Path |
|---|---|
| Project root | `/opt/vps/apps/al-rifai` |
| App env | `/etc/vps/apps/al-rifai/app.env` (`600 root:root`) |
| App DB password | `/etc/vps/apps/al-rifai/database_password` → `/run/secrets/database_password` |
| Cash read credential | `/etc/vps/apps/al-rifai/auth/pg-password` (role `ir_review_runtime`) |
| Evidence (checksum-pinned, read-only) | `/var/lib/vps/al-rifai/evidence/` |
| Backups | `/var/lib/vps/al-rifai/backups/` |
| WA-01 control | `/var/lib/vps/whatsapp/wa-01/control/` |
| Bridge profile | `/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json` |
| TLS entry rules | `apps/al-rifai/release/entry-rules.mjs` |
| Password policy | `apps/al-rifai/lib/password-policy.ts` |
| Capabilities / roles | `apps/al-rifai/lib/unified-auth-policy.ts` |
| Vessel command gate | `apps/al-rifai/lib/vessel-command-policy.ts` |
| Vessel pay | `apps/al-rifai/lib/vessel-pay.ts`, `public.escort_rate_config`, `public.program_pay` |
| Release parser | `apps/al-rifai/lib/release-parser.ts`, `lib/release-scan.ts`, `lib/release-apply.ts` |
| Release review UI | `apps/al-rifai/app/platform/release-review/` |
| Release apply CLI | `apps/al-rifai/scripts/apply-high-releases.ts` |
| Review API client | `apps/al-rifai/lib/review-api.ts` |
| Cash API (authority, mirror, password) | `apps/al-rifai/app/api/cash/[...path]/route.ts` |
| Review routes | `apps/al-rifai/app/api/review/{submit,decide,withdraw,list}` |
| Attendance routes | `apps/al-rifai/app/api/attendance/{summary,add}` |
| Employee lookup | `apps/al-rifai/app/api/employees/lookup` |
| Migrations applied | `public.alrifai_schema_migrations` (74 rows) |
| Roster state | `public.roster_shadow_state` (singleton, `mode=DB`) |
| Long-form history | `/opt/vps/NEXT-SESSION-HANDOFF.md` |
| Infrastructure map | `/opt/vps/docs/VPS_MAP.md` |
| Authority file | `/opt/vps/AGENTS.md` |

---

## Earlier history (condensed; details in `/opt/vps/NEXT-SESSION-HANDOFF.md`)

- **Items A / B1 / B2 / B3 / B4** (2026-10-31 → 2026-11-02): `/transactions`
  typeahead, Method/Source abbreviations + Total column, per-employee history
  page, typeahead on the Add Transaction drawer and `/cash`, `/cash` Total +
  Show All. All frontend-only; no migration, no `app.env` change, no bridge
  restart. The `/cash` lifetime Total is built from one
  `GET /api/operations?view=cash&export=1` call because `/api/cash/summary` is
  paginated with a 200-row cap; on failure the cell shows `—`.
- **Phase C SHADOW → Phase D1 cutover → Phase D2 profile** (2026-10-31 →
  2026-11-02): 36 h observation, 60 cycles, `diffs_found=0`, auto-promotion at
  `2026-11-02T03:50:59Z`, then `ALRIFAI_ROSTER_SOURCE=DB`, then the generated
  bridge profile with the two LID channels (11 chats, epoch 4) and one WA-01
  restart. No backfill; cursors start at the stream boundary.
