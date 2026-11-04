# Release & Conveyance Evidence Automation — design record

**Owner decision, 2026-11-04.** A missing Travel/Office-Return date must not block
an otherwise valid Release. Historical travel dates are not always provable, so an
amount without a date is preserved as **unresolved**, never allocated to an
invented month. No AI provider is involved.

**Status:** extraction rules and tests are in source (commit history);
database fields are a **candidate** (`db/migration-candidates/0074_…`), not applied;
nothing is wired into the running pipeline yet.

---

## 1. Does Python need new code? — No

The event-driven path already exists and is TypeScript:

| Need | Existing component | Evidence |
|---|---|---|
| Message arrival event | `scripts/message-ingestion-worker.ts` — per-chat native cursor loop, 15 s cycle, backoff, 11/11 cursors | running as PID 23 in `al-rifai-app-1` |
| Only new release-group records trigger work | `if (chatJid === RELEASE_GROUP_JID && page.records.length)` | `message-ingestion-worker.ts` |
| Release parsing + matching | `lib/release-parser.ts`, `lib/release-scan.ts`, `lib/release-apply.ts` | 140 candidates, 37 applied |
| Atomic apply + audit | `alrifai_vessel_program_release()` + candidate update | `release_candidates` / `release_apply` |
| WhatsApp transport | Go bridge `/api/send` + Python MCP `send_message` (same container) | `whatsapp-bridge/main.go:2520`, `whatsapp-mcp-server/whatsapp.py:1244` |

A Python listener would have to open the **same** WA-01 MCP socket and keep its
own cursor, which duplicates the ingestion worker and creates a competing consumer
of the release group — explicitly forbidden. The Go bridge has
`WEBHOOK_ENABLED=false`, so there is no push channel to subscribe to either.

**Therefore:** the Python capability the Owner asked for is delivered as a
deterministic rule orchestrator in the existing pipeline's language
(`lib/release-evidence.ts`), with this document as the shared interface a future
Python (or AI) component can consume. If a Python component is still wanted later,
the smallest compatible role is a *read-only* caller of the same functions via the
existing HTTP/MCP surface — never a second session, mirror or parser.

## 2. Trigger

```
WA-01 native message (release group 120363408741101070@g.us)
  → ingestion worker detects new records for that chat
  → scanReleaseGroup()  (re-reads the group; dedupe index makes it idempotent)
  → parseMessage()      (existing: escort, food bill, conveyance, message-date)
  → release-evidence.extractReleaseFacts()   ← new, pure
  → existing MATCHED/confidence/apply flow   ← unchanged
```

`messageTriggersParse()` exists but the scan is not gated on it: the whole group is
rescanned on new records, which is cheaper and safer than a second parser.

## 3. Facts kept separate

| Fact | Storage today | Note |
|---|---|---|
| Release date | `release_candidates.end_date` | stated `End date:` preferred, else the approved message-date rule |
| Release date source | candidate `release_date_source` (new) | `STATED_END_DATE` / `MESSAGE_TIMESTAMP` |
| Release shift | `release_candidates.end_shift` | from `(D)/(N)` in the message, else the message clock |
| Conveyance amount | `release_candidates.conveyance` | BDT, informational; the pay rate stays `escort_rate_config` |
| Actual travel date | candidate `conveyance_date` (new) | only when the message states it |
| Office return date | candidate `office_return_date` (new) | preferred month source |
| Evidence message | `release_candidates.source_msg_id` | plus `source_text` |
| Matched program | `release_candidates.program_id` | existing matcher decides |
| Extraction status | candidate `extraction_status` (new) | `COMPLETE` / `PARTIAL` / `UNRESOLVED_CONVEYANCE` / `INVALID_DATES` |
| Rule trace | candidate `rule_trace` (new) | e.g. `R-STATED-END-DATE`, `R-OFFICE-RETURN-DATE` |
| The event itself | `vessel_conveyance_event` (candidate 0072 + 0074) | one row per candidate (`candidate_id` unique) |

## 4. Rules (all deterministic, all evidence-backed)

| Rule id | Pattern (real authorized messages) | Result |
|---|---|---|
| `R-MESSAGE-DATE` | release slip without a stated end date | release date = message date (approved release rule) |
| `R-STATED-END-DATE` | `End date:-26-10-26-(D)`, `End dte:-28-0-26-(D)`, `Release date:` | stated release date + `(D)/(N)` shift |
| `R-STATED-START-DATE` | `Start date:-14-10-2026` | start date kept as context only |
| `R-CONVEYANCE-AMOUNT` | `গাড়ি ভাড়া`, `ভাড়া`, `Convance bill`, `gari`, `vara` + amount | conveyance amount BDT |
| `R-CONVEYANCE-DATE` | a date on the same line as a conveyance keyword | travel date |
| `R-OFFICE-RETURN-DATE` | `Office return date:`, `office back`, `অফিসে আসার/ফেরার`, `ফির`, `ফেরত` + date | return date → month source |
| `R-INVALID-STATED-DATE` | a labelled date that does not parse (`28-0-26`) | `INVALID_DATES`, review |
| `R-CORRECTION` | later message from the same escort | supersedes, keeps both message ids |

Dates are parsed by the **existing** `parseEscortDate()` (dd/mm/yy, dd-mm-yyyy,
`(D)/(N)`, trailing clock `(9:40AM)`, Bengali digits). Mobile identity, food-bill
day count and the conveyance keyword list are the **existing** `parseMessage()`.
Nothing is re-implemented.

**Never:** the message arrival timestamp as a travel date; a destination, vessel,
employee or amount that the message does not contain.

## 5. Event classes

| Class | When | Effect |
|---|---|---|
| `CONFIRMED_RELEASE` | matched program, valid release date/shift, no conveyance | existing apply workflow |
| `VERIFIED_CONVEYANCE` | matched + amount + verified travel/return date | allocate to that calendar month (`payroll_monthly_conveyance`) |
| `UNRESOLVED_CONVEYANCE` | matched + amount, no date | preserved; appears in `release_conveyance_unresolved`; no month |
| `PARTIAL_INFORMATION` | release facts only, conveyance absent | release proceeds; nothing invented |
| `NEEDS_REVIEW` | no/multiple program match, invalid or conflicting dates | nothing applied |

`classifyReleaseEvent()` returns `cashPosting: false` structurally: it cannot post,
approve or settle Cash, and it imports no Cash module.

## 6. Idempotency and audit

* `evidenceKey = messageId|escortPhone|releaseDate` — replay of the same message
  yields identical facts (`isSameEvidence`).
* DB: `release_candidates_dedupe_uk (source_msg_id, escort_phone, end_date, amount)`
  already exists; `vessel_conveyance_event_candidate_uk` (new) allows one event per
  candidate.
* Corrections keep **both** message ids in `sourceMessageIds` and add `R-CORRECTION`.
* `source_text` and `rule_trace` preserve the raw evidence and which rule produced
  each fact.

## 7. Permissions / deployment implications

* None for extraction: pure functions, no new grant, no bridge change.
* Candidate 0074 needs: `ALTER` on `release_candidates` / `vessel_conveyance_event`
  (owner), plus the existing `GRANT SELECT` on the new view.
* Wiring the orchestrator into `release-scan` (to populate the new columns and the
  event table) requires 0072 + 0074 applied **and** `lib/release-evidence.ts` added
  to the runtime image COPY whitelist — both need separate approval.
* Cash Freeze untouched: no posting, approval or settlement path exists here.

## 8. Historical messages

Not reprocessed. The 140 existing candidates keep their current columns; the new
columns stay NULL until an approved backfill. Where a historical message has no
travel date, the row is evidence — not a guessed month.
