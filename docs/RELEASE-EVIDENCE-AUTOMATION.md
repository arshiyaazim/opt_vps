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
| `DAY_COUNT_MISMATCH` (flag) | `amount / 150` differs from the stated `N-day` | audit only — never a review reason |

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

---

# Food Bill and same-day conveyance (Owner rules B and C, 2026-11-04)

## What the authorized traffic actually contains

Read-only inspection of the Escort Release Slip group (1,043 messages):

| Pattern | Count | Example shape |
|---|---|---|
| English food-bill wording | 34 | `900/- food bill`, `food bill master bkah no`, `Ship to Office back---Convance bill` |
| Bangla food-bill wording | 35 | `কাবার বিলের টাকা যাবে`, `খাবার বিল` |
| `6-day` / `To duty:-6` day counts | in the same messages | `900/- food bill 6-day`, `End date:-28-1026-(D) | To duty:-6` |
| Sukani / Master numbers | 64 / 32 | `sukano bkash no`, `master no food bill` |
| Ghat wording | 88 | `ghat duty man 200/-` |
| Salary / Advance wording | 3 / 5 | rare, and therefore usable as exclusions |

The Cash instruction table shows the same-day pattern directly: many escorts
receive two or three payments on one Dhaka date with no parsed purpose
(`Owner direct payment instruction`), with amounts such as 20,000 / 40,000 /
60,000 paisa (BDT 200 / 400 / 600). Three instructions carry
`ghat duty man` at BDT 200. **Amount alone is never proof** — the same table
also contains `Salary` at BDT 1,989.

## Food Bill as release evidence (rule B)

`release_date_source` may be:

| Value | When |
|---|---|
| `STATED_END_DATE` | the message states an End/Release date (highest precedence) |
| `FOOD_BILL_EVENT` | no stated date, and the food bill is a valid duty-ending bill |
| `MESSAGE_TIMESTAMP` | legacy fallback only |

A food bill establishes the release date only when all of these hold:

1. it is a food bill (English, Bangla or transliterated wording, or an explicit
   `N-day` / `To duty` count);
2. the message does not label it Salary or Advance;
3. it is not described as an old/previous bill or a future one;
4. the date is not before the matched Program's start (it would be another duty);
5. the day count is **supporting evidence only** (Owner rule, 2026-11-04): an
   agreeing count adds `R-DAY-COUNT-AGREES`; a mismatch is recorded as
   `DAY_COUNT_MISMATCH` in `evidence_flags` and never blocks on its own. A
   message does not need to state a day count at all;
6. the Program match is unique.

If an explicit Release Date exists, it always wins; the food-bill date never
silently overwrites it. A conflict is flagged for review only when the food-bill
message is dated later than a date stated by a **different** message.

## Same-day additional money as conveyance evidence (rule C)

| Evidence | Result |
|---|---|
| explicit transport wording (`গাড়ি ভাড়া`, `convance`, `ghat`, office return) | `conveyance_status` = `VERIFIED` or `UNRESOLVED` |
| unlabelled second payment, same escort, same Dhaka date | `CANDIDATE` — never verified |
| Salary / Advance label | excluded, never conveyance |

Purpose is taken from the evidence: `OFFICE_RETURN_CONVEYANCE`,
`GHAT_DUTY_CONVEYANCE`, `OTHER_VERIFIED_TRANSPORT` (default when only transport
wording exists), `UNKNOWN_CONVEYANCE_PURPOSE` (conflicting or no purpose words).

The conveyance month comes from the **actual travel date** only:

| Source | Meaning |
|---|---|
| `EXPLICIT_TRAVEL_DATE` | a date on the transport line or an Office return date |
| `SAME_DAY_ESTABLISHED` | transport wording in the same message as the completed duty, with no payment-routing-only wording |
| none | `payment_instruction_date` is preserved, the month stays unresolved |

`টাকা যাবে` / “will go” is money routing, not travel, and can never establish a
travel date. A payment instruction is not proof of payment.

## Retry and checkpoint safety

The ingestion checkpoint advances when a page is read, so a failure inside the
release pass would otherwise wait for the next new message. The worker now keeps
a small backoff state (`lib/release-retry.ts`: 1, 2, 4 … min, capped at 30) and
retries the pass on its own timer while the group is quiet. The pass is
idempotent (`ON CONFLICT DO NOTHING` + the candidate dedupe index), so a retry
never duplicates a candidate.

## Isolated PostgreSQL rehearsal (2026-11-04)

Throwaway PostgreSQL 16 container, minimal fixture schema, candidates applied in
order 0073 → 0072 → 0074 → 0075 → 0071:

| Check | Result |
|---|---|
| 0073 | `kacpur` row inserted, resolves to `kachpur` |
| 0072 | duty-shift view counted 27 shifts for a 2025-12-20 D → 2026-01-02 D program; monthly split `2025-12:24, 2026-01:3` |
| 0072 | conveyance event on 2026-02-05 attributed to `2026-02`; reconciliation `true` once the event existed, `false` before (fail closed) |
| 0074 | second event for the same candidate rejected by the unique index |
| 0075 | invalid `conveyance_purpose` rejected; `release_evidence_review` returned the open row |
| 0071 | apply once → endDate set, revision 1, pay recalculated, candidate APPLIED, 1 audit row; replay → `alreadyApplied`, still 1 audit row; candidate without shift → rejected, no partial state |

The container was removed afterwards; production was never touched.

## Still not applied

`0071`, `0072`, `0073`, `0074`, `0075` are candidates under
`db/migration-candidates/`. The orchestrator is not yet wired into
`release-scan`, so no new column is written in production and no historical
candidate was reprocessed.

---

# Pipeline integration (2026-11-04)

`analyseReleaseBundle()` is now called by the existing release pass:

```
ingestion worker → scanReleaseGroup() → persistRows() → persistEvidence()
                                                        ↘ (same try) autoApplyHigh()
```

* `persistEvidence()` probes `information_schema` once per pass. If migrations
  0074/0075 are absent it writes nothing and returns `skipped` — the deployed
  behaviour is unchanged and an image can ship before the migrations.
* When the columns exist it updates the candidate by its **own dedupe key**
  (`source_msg_id + escort_phone + end_date + amount`), so no new identity is
  introduced, and writes one `vessel_conveyance_event` per candidate
  (`ON CONFLICT DO NOTHING`, deterministic id, amount converted BDT → paisa,
  `verified` true only for VERIFIED evidence).
* A failure throws, so the worker's retry state machine re-runs the pass. Both
  writes are idempotent, so a retry cannot duplicate a candidate or an event.
* `office_return_date`, `food_bill_*`, `additional_*`, `travel_date`,
  `payment_instruction_date`, `employee_identity_source`, `rule_trace`,
  `review_reasons` and `evidence_message_ids` stay separate columns.

## Full-chain rehearsal (second run, same day)

Fresh PostgreSQL 16 with the minimal fixture schema, candidates applied in order
0073 → 0072 → 0074 → 0075 → 0071, then the whole chain executed:

| Step | Result |
|---|---|
| candidate insert + evidence update | `COMPLETE`, food bill 2026-01-20 / BDT 900, travel 2026-02-05, BDT 500 |
| conveyance event | 1 row, 50,000 paisa, verified |
| replay of candidate + event | still 1 candidate, 1 event |
| `apply_release_candidate` | endDate 2026-01-20, revision 1, candidate APPLIED, **1** audit row, pay 62 shifts / 1,240,000 + 50,000 |
| monthly split | salary `2025-12:23`, `2026-01:39`; conveyance `2026-02` only |
| reconciliation | `reconciles = true`, 62 = 62 shifts, 0 unresolved |
| replay apply | `alreadyApplied`, still **1** audit row |
| **audit atomicity** | a pre-existing conflicting audit row aborted the apply: program revision/endDate unchanged, candidate not applied, no pay row written |

The audit proof is the important one: because the release command, the pay
recalculation, the candidate update and the audit insert live in one function
body, a missing or conflicting audit record cannot be committed without the rest.
