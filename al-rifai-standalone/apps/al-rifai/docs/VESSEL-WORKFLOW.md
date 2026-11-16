# Al-Rifa'i Vessel Workflow — Complete README

**Status:** Owner-confirmed business rules consolidated; implementation audited
read-only. This document changes no code, database record, WhatsApp permission or
deployment.

**Owner-confirmed rule set:** 2026-10-27 (Vessel Order and Outgoing Confirmation
Rules). Where this document and an older reference disagree, the Owner-confirmed
rule wins.

**Sources:** `legacy-reference/` (4 rule documents + index),
`docs/PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md` (candidate lifecycle, not
production), `docs/OWNER_BUSINESS_POLICY.md`, and the current code/schema.

---

## 0. সারসংক্ষেপ (Bengali summary)

- **অর্ডার শুধু তিনজন অনুমোদিত Escort Client থেকে আসে** (Hridoy, Rezaul, TCIS —
  বর্তমান configuration-এ থাকা identities; নতুন কেউ যোগ নয়)।
- একটি inbound order → একটি **Draft**; একাধিক Lighter থাকলে একটি **grouped Admin
  Draft**, কিন্তু **প্রতিটি Lighter আলাদা Vessel Program**।
- Admin শুধু চারটি field পূরণ করেন: **Escort Name, Escort Mobile, Start Date,
  Shift**। এর বাইরে অতিরিক্ত mandatory field বা 별도 approval নেই।
- **Confirmation = WA-01/Bridge-1-এর verified Admin account থেকে একই client
  চ্যাটে পাঠানো প্রকৃত outgoing WhatsApp বার্তা**, যা original order-এর সঙ্গে
  linked এবং সংশ্লিষ্ট Lighter-এর সম্পূর্ণ assignment ধারণ করে। এই বার্তাটিই
  confirmation; client acknowledgement, button বা দ্বিতীয় approval লাগে না।
- যা confirmation **নয়**: unsent draft, UI copy, ভুল প্রাপককে পাঠানো বার্তা,
  অসম্পূর্ণ assignment, সম্পর্কহীন outbound।
- একই Mother + একই Lighter + start date ±১ দিন = potential duplicate; ভিন্ন
  Lighter ভিন্ন program (একই escort/তারিখ হলেও)।
- বর্তমান implementation-এ **confirmation→program কিছুই persist হয় না**:
  `confirmation_message_id` ০টি, canonical program ০টি, register-এ শুধু DRAFT ও
  REVIEW। নিচে read-only audit ও নিরাপদ implementation ক্রম দেওয়া আছে।

---

## 1. Purpose, precedence and non-negotiables

Precedence:

1. **Owner-confirmed rules (this document).**
2. Owner-approved conversation scope, identities and financial controls.
3. The reference pack in `legacy-reference/`.
4. Existing code is evidence of behaviour, never authority.

Non-negotiables:

- `MV`, `M.V.`, `M. V.`, `Mv.`, `MV.`, `mv.` are **generic prefixes used by both
  Mother and Lighter**. The prefix alone never classifies a vessel.
- Draft creation ≠ Admin approval ≠ outbound send ≠ delivery ≠ confirmed program.
  The **only** confirmation is the actual outgoing Admin message defined in §6.
- Nothing is auto-confirmed, auto-posted, auto-sent or auto-settled by a machine.
- Unresolved, conflicting or incomplete evidence stays in **REVIEW**.
- Source messages, raw text and provenance are never deleted or overwritten.
- Cash and Vessel remain separate domain processors; neither ingests the other's
  conversations.

---

## 2. Domain model and states

| Entity | Meaning |
|---|---|
| Authorized client | One of the three verified Escort Client identities (config, not source code) |
| Order | Inbound vessel order from an authorized client: Mother, one or more Lighters, each Lighter's Master Mobile, Destination when present, other evidenced details |
| Draft | The order as recorded before assignment; one per Lighter, optionally grouped by one inbound message |
| Admin Draft | The grouped draft presented to Admin (one message may contain several Lighter blocks) |
| Assignment | Escort Name, Escort Mobile, Start Date, Shift for one Lighter |
| Confirmation | The actual outgoing WhatsApp message from the verified Admin on WA-01 to the same client chat, linked to the order, containing the completed assignment |
| Vessel Program | One Lighter's confirmed duty record (stable internal id) |
| Release evidence | Release slip/text candidate for Admin review |
| Payment draft | Review-only draft after an authorized release |

```
client order ──► DRAFT (per Lighter, grouped per message)
                   │
                   │ Admin completes 4 fields and sends the reply in the same chat
                   ▼
             CONFIRMED PROGRAM (one per Lighter)
                   │  approved attendance
                   ▼
                RUNNING ──authorized release──► COMPLETED
```

A date passing, a keyword, a prepared draft, a UI copy action or a queued send is
never a transition.

---

## 3. Authorized clients and intake authority

1. **Only the three verified Escort Client identities may originate Vessel
   Orders.** Their approved names, phone identities and chat mappings are read
   from the current configuration (`conversation_scope`,
   `whatsapp_identity_aliases`, `escort_client_contacts`). They are not invented,
   replaced or expanded here.
2. **Direction:** orders are inbound from those clients. Confirmations are
   outbound from the verified Admin account to the same client chat.
3. **Groups are evidence, not order origin.** A message in an approved vessel
   group may support matching (for example an assignment posted in the office
   group), but it does not create a client order and cannot replace the client
   chat requirement of §6.
4. **Excluded inputs:** unauthorized senders, out-of-scope chats, forwarded
   messages, media-only messages and operational chatter never become orders.
5. **Aliases:** a client's PN and LID addresses are one conversation. An order
   received on one alias and confirmed on the other still belongs to the same
   client chat.

---

## 4. Order and draft

1. An authorized client's inbound order is parsed into a Draft containing Mother
   Vessel, one or more Lighter Vessels, each Lighter's Master Mobile, Destination
   when present, and any other evidenced order details (cargo, capacity,
   importer, booking date).
2. A **multi-lighter order produces one grouped Admin Draft** containing multiple
   Lighter blocks. Each Lighter is a **distinct Vessel Program**.
3. Minimum complete order: Mother Vessel + Lighter Vessel + that Lighter's Master
   Mobile. Incomplete order-like messages are retained as evidence/review; fields
   are never invented.
4. Multiple Lighters under one Mother remain distinct; the Mother is recorded
   once per group.

---

## 5. Parsing rules

### 5.1 Labels

| Field | Recognised forms |
|---|---|
| Mother vessel | `Mother Vessel:`, `Mather Vessel:`, `Mother Vessel Name:`, `Mother Ship:`; Bangla `মাদার ভেসেল`, `মাদার ভেসেলের নাম`, `মাদার শিপ` |
| Lighter vessel | `Lighter Vessel:`, `Lighter Name:`, `Lighter:`; Bangla `লাইটার ভেসেল`, `লাইটার নাম`, `লাইটার` |
| Master mobile | `Master Mobile:`, `Master Mob:`, `Mst Mob:`, `Mobile Number:`; Bangla `মাস্টার মোবাইল`, `মোবাইল নম্বর` |
| Destination | `Destination:`, `Dest:`; Bangla `গন্তব্য`, `ডেস্টিনেশন` |
| Trip / duty | `Trip:`; Bangla `ট্রিপ` |
| Assignment | `Escort Name:`, `Escort Mobile:`, `Employee ID:`, `Assignment Date:`, `Start Date:`, `Shift:` |
| Optional | `Cargo:`, `Capacity:`, `Importer:`/`A/C:`, `Booking Date:` |

A generic `ভেসেল নেম` / `ভেসেলের নাম` never identifies a Mother on its own.

### 5.2 Disambiguation and normalisation

1. Explicit labels decide the role; the prefix never does.
2. A valid mobile anchors a **Lighter** block. A block carrying the Master Mobile
   is never classified as Mother on prefix alone.
3. A nearby vessel block without Master Mobile may be the Mother, subject to
   context. Parenthesised trailing names are candidates, not proof.
4. Serial numbers (`(1)`, `1)`, `1.`) and WhatsApp markup (`*`, `_`, emoji) are
   stripped from names.
5. Bangladesh phone forms (`01…`, `8801…`, `+8801…`, spaced/dashed) normalise to
   one value; Master Mobile and Escort Mobile stay distinct fields.
6. Destination comes from an explicit label or a recognisable place near the
   Lighter block. Historical display aliases (`Local`/`CTG` → Chattogram,
   `N.Bari` → Nagarbari, `Rupshi` → Narayanganj) are presentation only; raw text
   is retained.
7. Date and shift are parsed only when stated (`D`/`N`, `Day`/`Night`); missing
   values stay unknown.
8. Bangla digits normalise to ASCII before parsing.
9. Conflicting values, ambiguous Mother, invalid mobile, implausible dates and
   date/shift conflicts become explicit reasons; the record stays in REVIEW.

### 5.3 Multi-message evidence

Complementary evidence from the same client conversation (for example Lighter +
Master + Destination first, Mother later, or the reverse) may be linked into one
candidate when client, conversation, vessel identity and time support it.
Different Master Mobiles/Lighters are never merged; conflicting Mother values are
flagged, not overwritten; replay is idempotent; an expired partial conversation
does not absorb unrelated later messages. A linked candidate is review evidence,
not a confirmation.

---

## 6. Confirmation — Owner-confirmed rule

### 6.1 Definition

**The confirmation is the actual outgoing WhatsApp message from the verified
Admin account on WA-01 / Bridge-1 to the SAME original authorized client chat
that supplied the order.** That message must:

1. be a real, sent outbound message (present in the mirrored WA-01 outbound
   stream with a stable native message id);
2. originate from the verified Admin identity on WA-01;
3. be addressed to the same client conversation that supplied the order
   (PN/LID aliases count as the same conversation);
4. be linked to that original order/draft;
5. contain the completed assignment for the relevant Lighter: **Escort Name,
   Escort Mobile, Start Date, Shift**;
6. identify the Lighter (and Mother) it assigns.

**That outgoing reply itself is the order confirmation.** No client
acknowledgement, no separate confirmation button and no second approval is
required.

### 6.2 What is not a confirmation

- An unsent draft, a template preview or a UI copy action.
- An outbound message to a different recipient or a different client chat.
- An unrelated outbound message in the same chat (chatter, price, release, a
  repeat of the order without assignment fields).
- An assignment missing any of the four fields.
- A group post, a forwarded message or a message from an unverified sender.
- A queued send that was never actually sent.

Such cases stay in **REVIEW** (or are ignored as non-business chatter); none of
them creates a confirmed program.

### 6.3 Matching and persistence

- Link inbound order → draft → outgoing confirmation using existing message IDs,
  chat identity (alias-aware), vessel identities, Master Mobile and temporal
  evidence. Do not trust a phone number copied into the body as the recipient.
- **Grouped multi-lighter confirmations create one program per Lighter**, not one
  per WhatsApp message. The same applies when two separate confirmation messages
  cover two Lighters of one order.
- Keep stable internal Program IDs and source references; derive them
  deterministically from account, client conversation, Mother, Lighter, start
  date and shift so replay cannot duplicate.
- Replaying the same order, draft or confirmation must be idempotent; changed
  content for the same message is a conflict for review.
- **Duplicate rule:** same Mother + same Lighter + start dates within ±1 calendar
  day is a potential duplicate. Different Lighters remain separate programs even
  with the same Escort and date.
- Spelling variants (for example `Europe` / `Eurupe`) are preserved in raw text
  and matched through supporting identifiers and evidence; uncertain names are
  never silently overwritten.

### 6.4 Examples

| # | Order | Confirmation | Result |
|---|---|---|---|
| 1 | Poavosa-Wisdom → Jafnun-Julfa-1 | one outgoing assignment for Jafnun-Julfa-1 | **one program** |
| 2 | Poavosa-Wisdom → Europe-1 **and** Deowan-Jobayer-1 | one outgoing confirmation containing both assignments (or two messages) | **two programs**, one order, one client chat |

Example 2 is the grouped case: the message count does not determine the program
count; the Lighter count does.

---

## 7. Duty, release, completion and payment review

These rules are unchanged by the confirmation clarification; they begin **after**
a program exists.

- **Confirmed → Running** only on the first accepted, Admin-approved attendance
  for the assigned escort. A date passing does not establish attendance.
- **Release intent** keywords (`ডিউটি শেষ`, `রিলিজ`, `কাজ শেষ`, `ভেসেল ছেড়েছি`,
  `release`, `duty finished`, `off duty`) identify a candidate, not a release.
- **Release slip review:** extract a Release Draft (Escort, Lighter, Release
  Point, Start/End Date, End Shift, Duty Days, Conveyance, Food, Transport), flag
  missing/implausible/uncertain data, never auto-send or auto-settle.
- **Completion:** after an authorized release, mark Completed once, compute
  duration, reconcile attendance, create a payment **draft** for review.
- **Financial controls:** no historical rate import, no automatic posting.

---

## 8. Cash analogy and domain separation

The gating principle matches Cash: a verified Admin outbound message to the
designated authorized recipient. Vessel reuses that direction/identity principle
but keeps its own identity set, scope and processor:

- Cash conversations and Vessel conversations are disjoint; neither processor
  reads the other's chats.
- Cash identity checks (`isCashScopeOwner`) are not a substitute for a Vessel
  Admin check; the Vessel side needs its own verified Admin identity binding.
- Cash instructions and Vessel programs never share a write path.

---

### Command API and UI (2026-10-27, session 3)

`app/api/vessel-programs` exposes authenticated add/edit/release/assign/replace/
void plus program detail, audit history and linked WhatsApp source. The actor is
resolved server-side (`ALRIFAI_VESSEL_COMMAND_ACTOR`, fallback
`ALRIFAI_CASH_OWNER_PERSON_REF`), never from the request. The SQL functions now
enforce `expected_revision` (409 on conflict) and `command_key` idempotency, and
append exactly one ledger event per command. `/vessel-register` wires the UI and
shows commands disabled until the migration is available (`available:true`).
**Production remains read-only: 0032 is not applied.**

### Command layer (prepared 2026-10-27, session 2)

`db/migration-candidates/0032_vessel_program_commands.sql` prepares five narrowly
scoped SECURITY DEFINER functions — add, edit, release, assign/replace, void —
that require a VERIFIED person actor, bump `revision` by exactly one, append one
`programCommand` ledger event, and expose EXECUTE only (no table UPDATE/DELETE
grant). `tests/sql/0032_vessel_commands_rehearsal.sql` proves ledger integrity,
denial of direct writes, unverified-actor rejection and zero Cash side effects in
an isolated PostgreSQL. **Not applied to production; the register stays
read-only until Owner approval.** Removal is implemented as VOID (status
`Voided` + ledger event), never deletion.

## 8a. Implementation update — 2026-10-27 (post-audit session)

The §9/§10 snapshot below is **historical and partially stale**. Verified current
state at source `c93762d`:

- A confirmation→program writer exists (`lib/vessel-ops.ts:persistConfirmedProgram`
  called from `scripts/process-vessel.ts`); 79 canonical `Confirmed` programs and
  123 rows with `confirmation_message_id` exist. `persistOperation` still blocks
  any transition other than DRAFT/REVIEW (append-only evidence).
- Confirmation senders are now gated to the verified Admin identity (paired
  Owner PN/LID) in the live processor; other outgoing rows are ignored.
- Shift is compared as supporting evidence in `lib/vessel-match.ts`: agreement
  may break a tie, disagreement routes to `AMBIGUOUS`/review; it never creates a
  match on its own.
- New programs persist `details.sourceMessageId` for source traceability.
- An Admin draft composer (`lib/order-draft.ts`) powers a read-only review and
  Copy surface in Sources & Review. **No WhatsApp sending is enabled.**
- Duplicate classification is consolidated in `lib/duplicate-identity.ts`
  (EXACT/PROBABLE/AMBIGUOUS/DISTINCT, ±1-day rule preserved, aliases supported).
- Still missing: register `CONFIRMED` state/event, Running/attendance, draft
  persistence/delivery columns, program write UI/grants.

## 9. Current implementation map

| Concern | Implementation | State |
|---|---|---|
| Approved scope/identities | `conversation_scope`, `whatsapp_identity_aliases`, `escort_client_contacts` | live |
| Client sender authority | `lib/escort-register.mjs` (`resolveEscortSourceContact`) | live |
| Admin sender authority (Vessel) | — | **missing** |
| Order parser | `lib/escort-intake-candidate.mjs` (`parseEscortOrder`) | live |
| Draft/assignment derivation | `lib/escort-register.mjs` (`deriveEscortRegisterOps`) | live (DRAFT/REVIEW only) |
| Persistence guard | `lib/vessel-ops.ts` (`persistOperation`) | live (blocks CONFIRMED) |
| Register storage | `escort_order_register`, `escort_order_sources`, `escort_order_events` | live |
| Draft→confirmation link | `confirmation_message_id`, `confirmation_source_hash`, `parsed.candidateDraftIds` | **never populated** |
| Confirmation → program | `programs`, `program_assignments`, `domain_events` | **no writer** |
| Intake UI | `app/escort-register-panel.tsx` | read-only |
| Program workflow UI | `app/program-tools.tsx`, `lib/program-workflows.ts` | read-only preview |
| Lifecycle engine (pure) | `lib/employee-program-validation.mjs` | offline only |
| Lifecycle commands | `lib/program-command-boundary.ts` | `/candidate-api` qualification only |
| Attendance | — | **missing** |
| Release/payment persistence | — | **missing** |

The `/candidate-api` host is a private qualification surface; it is not the
Owner-facing register and is not the production confirmation path.

---

## 10. Coverage matrix (audited 2026-10-27)

### 10.1 Parser and draft rules (23 executable probes)

| # | Rule | Status |
|---|---|---|
| P1 | `MV` prefix generic, role from labels | ✅ |
| P2 | Unlabelled lines + mobile anchor the Lighter | ✅ |
| P3 | Mother block with Master Mobile flagged | ✅ |
| P4 | Serial/markup stripping (`(1)-M.V.`) | ❌ |
| P5 | Phone representations normalise | ✅ |
| P6a | Destination label captured | ✅ |
| P6b/c | Destination aliases (CTG, N.Bari, Rupshi) | ❌ |
| P7 | Date/shift only from evidence | ✅ |
| P8 | Minimum complete order → draft | ✅ |
| P9 | Multiple Lighters → distinct drafts | ✅ |
| P10 | Bangla labels | ❌ |
| P11 | Bangla digits | ✅ |
| P12 | Multi-message reconstruction | ❌ |
| P13 | Office assignment → review; wrong direction not confirmation | ✅ |
| P14 | ±1-day potential duplicate | ✅ |
| P15 | Same escort/date, different Lighter distinct | ✅ |
| P16 | Replay idempotent | ✅ |
| P17 | Unauthorized sender contributes nothing | ✅ |
| P18 | Release keyword → release candidate | ❌ |
| P19 | Confirmation reuses the original draft | ❌ |
| L1 | `Lighter Name:` / `Mother Ship:` / `Mother Vessel Name:` / `Trip:` | ❌ |
| L2 | `Mobile Number:` label | ❌ |
| L3 | Forwarded/media guard in the production path | ❌ |
| L4 | Parser failure does not interrupt the mirror | ✅ |
| L5 | Shadow path never writes a confirmed program | ✅ |
| L6 | Admin draft template surfaced | ❌ |
| L7 | Confirmation authority / CONFIRMED transition | ❌ |
| L8 | Confirmed → Running on attendance | ❌ |
| L9 | Release draft / completion | ❌ |
| L10 | Payment draft | ❌ |

### 10.2 Confirmation rule (Owner-confirmed) — read-only audit

| # | Requirement | Can mirrored data establish it? | Persisted today? |
|---|---|---|---|
| C1 | Verified Admin sender on WA-01 | Yes — every direct outbound row carries the WA-01 paired account as sender; the same Owner PN/LID used by Cash | ❌ no Vessel Admin binding or check |
| C2 | Original client recipient/chat | Yes — `chat_jid` + `receiver_jid` on 654/654 canonical direct-chat outbound rows (657 including the LID alias); PN/LID aliases map to one client | ✅ data present, ⚠ matching uses exact chat JID |
| C3 | Order/Draft linkage | Yes — derivable from chat + vessel pair + Master Mobile + time | ❌ never written; the current matcher has no bounded time window |
| C4 | Completed assignment fields | Yes — 128 of 203 outbound blocks are complete; 64 incomplete | ✅ parsed, ❌ not treated as a confirmation |
| C5 | Persisted Confirmation Message ID | — | ❌ 0 of 677 register rows |
| C6 | Confirmed program per Lighter | — | ❌ 0 canonical programs; `persistOperation` blocks CONFIRMED |

Evidence-derivable matching (same client chat, same Mother + Lighter + Master,
inbound first, ≤14 days): **42 unique, 0 ambiguous, 86 unmatched**. The 86
unmatched are outbound assignments whose order came from elsewhere (mostly the
office groups) — under the Owner rule they are not confirmations and stay in
review.

Data shape observed: 4 direct addresses (3 clients; one client has PN+LID),
1,177 messages (520 in / 657 out), 231 inbound blocks of which 207 are
draft-shaped and **47 are multi-lighter orders**, 203 outbound blocks, **0
grouped outbound confirmations** (so the grouped-confirmation path is not yet
exercised by real data).

---

## 11. Gaps

| ID | Gap | Severity |
|---|---|---|
| G1 | Bangla labels unsupported | high |
| G2 | `Lighter Name:` and other label variants unrecognised (`Lighter Name:` yields no block) | high |
| G3 | Serial/markup not stripped for `(1)-M.V.` forms | high |
| G4 | No destination alias map (display only) | low |
| G5 | No multi-message reconstruction | medium |
| G6 | No forwarded/media guard in the production derivation | medium |
| G7 | Confirmation does not link to its draft; `confirmation_message_id` unused | high |
| G8 | No Vessel Admin identity/authority check; any outbound is treated as an office assignment | high |
| G9 | No confirmation → CONFIRMED program writer (one per Lighter) | high |
| G10 | Group-origin messages can currently create DRAFTs although only the three clients may originate orders | high |
| G11 | Draft matching uses exact chat JID, so a PN order confirmed on the LID alias does not link | medium |
| G12 | Matching spans Archive and Current drafts without an explicit provenance rule | medium |
| G13 | No grouped-draft identity: a multi-lighter order becomes N independent rows with no group reference | medium |
| G14 | No idempotency key for confirmation → program (message id + Lighter + start + shift) | high |
| G15 | No attendance source/store; Confirmed → Running impossible | medium |
| G16 | Release draft/completion and payment draft not persisted | medium |
| G17 | Admin draft template unused in the UI | low |
| G18 | The production draft matcher has no bounded temporal window (only "outbound after draft"), so a very late message can still link | medium |

---

## 12. Proposed implementation sequence (no code changed yet)

Phases are independent and reversible. Nothing in phases 1–3 sends a WhatsApp
message or confirms a program.

**Phase 0 — Owner decisions (blocking for phase 4+)**
1. Which config value is the verified Vessel Admin identity (the WA-01 paired
   account, as in Cash)? Where is it stored?
2. Unmatched outbound assignment (86 cases): always REVIEW, or may it create a
   program after an Admin decision?
3. Cross-provenance linkage: may a new confirmation confirm a draft that lives in
   the Archive epoch?
4. Group evidence: may a group assignment ever confirm an order that originated
   in a client chat, or is it review-only supporting evidence?

**Phase 1 — Parser hardening (safe)**
- Bangla + variant labels, serial/markup stripping, optional display alias map.
- Tests: one per label/normalisation, plus the existing duplicate suite.

**Phase 2 — Pure linkage (safe, no writes)**
- A pure function that, given an inbound order block and an outbound block,
  returns `{linked:true|false, reason, draftMessageId, confirmationMessageId,
  lighterKey}` using alias-aware chat identity, normalized vessel pair, Master
  Mobile, direction and time.
- Enforce: only the three client chats; only the verified Admin sender; the four
  assignment fields; same chat; inbound first.
- Tests: the full case list in §14.

**Phase 3 — Persist linkage only (review-safe)**
- On the existing REVIEW row, write `confirmation_message_id`,
  `confirmation_source_hash` and `parsed.linkedDraftId`; add a group reference for
  multi-lighter messages. No status change, no program.
- Idempotent on replay; conflicts become reasons.

**Phase 4 — Confirmation → program (after Owner approval)**
- One program per Lighter, deterministic id from (account, client conversation,
  Mother, Lighter, start date, shift); `program_assignments` + `domain_events`
  audit; duplicate rule ±1 day; replay idempotent.
- No client acknowledgement, no second approval, no outbound message.

**Phase 5 — Views and guards**
- Grouped draft view, confirmed program view, unmatched review queue.
- Restrict group-origin drafts to evidence; keep Cash/Vessel processors disjoint.

**Phase 6 — Historical reconciliation (separate approval)**
- Dry-run reprocess of the 207 draft blocks and 128 complete assignments, with a
  diff before any write.

---

## 13. Test cases for the future implementation

| # | Scenario | Expected |
|---|---|---|
| T1 | One order, one confirmation, one Lighter | 1 program, linked ids |
| T2 | One order with two Lighters, one grouped confirmation | 2 programs, 1 order, 1 confirmation |
| T3 | One order with two Lighters, two separate confirmations | 2 programs |
| T4 | Outbound assignment with no matching order | REVIEW, no program |
| T5 | Outbound assignment to a different client chat | not a confirmation |
| T6 | Draft/preview/copy only, no send | nothing |
| T7 | Assignment missing Escort Mobile / Start Date / Shift | REVIEW |
| T8 | Replay of the same confirmation | idempotent, 0 new |
| T9 | Same Mother + Lighter, start dates ±1 day | potential duplicate, no second program |
| T10 | Same Escort/date on different Lighters | 2 programs |
| T11 | Spelling variants (`Europe` / `Eurupe`) | raw preserved, linked by evidence, no overwrite |
| T12 | Order on PN, confirmation on LID alias | same conversation, links |
| T13 | Group message shaped like an order | evidence/REVIEW, no draft |
| T14 | Outbound from an unverified sender | not a confirmation |
| T15 | Forwarded/media-only assignment | REVIEW |
| T16 | Cash chat message in the Vessel pipeline | excluded, no cross-ingest |

---

## 14. Open questions

| Topic | Current state | Owner decision needed |
|---|---|---|
| Vessel Admin identity | not configured; Cash has its own | confirm the WA-01 paired account as the Vessel Admin and where it is bound |
| Unmatched confirmation | 86 real cases | REVIEW only, or Admin decision path? |
| Archive draft linkage | 382 legacy DRAFT rows | may a new confirmation confirm an archived order? |
| Group evidence | 3 approved groups | supporting evidence only, or confirmable? |
| Destination aliases | none | approve the display alias list |
| Attendance source | none | which chat/role carries attendance? |
| Payment draft | pure calculation | which rates and approver? |

---

## 15. References

- `legacy-reference/README.md` and documents 01–04
- `docs/PROGRAM_LIFECYCLE_RULES_IMPLEMENTATION.md` (candidate lifecycle)
- `docs/OWNER_BUSINESS_POLICY.md`
- Code: `lib/escort-intake-candidate.mjs`, `lib/escort-register.mjs`,
  `lib/vessel-ops.ts`, `scripts/process-vessel.ts`, `lib/program-workflows.ts`,
  `lib/employee-program-validation.mjs`, `lib/program-command-boundary.ts`
- Tables: `conversation_scope`, `whatsapp_identity_aliases`,
  `escort_client_contacts`, `escort_order_register`, `escort_order_sources`,
  `escort_order_events`, `programs`, `program_assignments`, `domain_events`
