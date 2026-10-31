# Contact Name Sync Architecture — Investigation

**Date:** 2026-10-31
**Type:** Read-only investigation (no code, data, deploy or configuration change)
**Scope:** WA-01 bridge (Go + whatsmeow), WhatsApp MCP server (Python), AL-RIFA'I app (TypeScript)
**Question owner:** Owner
**Status:** Findings accepted 2026-10-31; remediation deferred to the roster-unification design

---

## Summary

WhatsApp contact-name updates **already reach this VPS** and are already stored, but **nothing in
the application consumes them**. `escort_client_contacts` is written only by hand (superuser SQL).
There is no contact-sync pipeline, no event stream, and no app-side consumer.

A pipeline is buildable with **no protocol work**: the transport and the data already exist.

---

## Q1 — Does the WhatsApp protocol send contact sync to the linked device? Does the bridge handle it?

**Protocol: yes. Bridge: no handler.**

whatsmeow (pinned `v0.0.0-20260917111002-2e338d0ee73d`) defines the events:

| Event | Library description |
|---|---|
| `events.Contact` | "emitted when an entry in the user's contact list is modified from another device" (app-state sync) |
| `events.PushName` | "emitted when a message is received with a different push name than the previous value cached for the same user" |
| `events.PushNameSetting` | push-name self setting change |
| `events.BusinessName` | "emitted when a message is received with a different verified business name" |
| `events.AppStateSyncComplete` | "emitted when app state is resynced" |

The bridge registers exactly **one** handler (`whatsapp-bridge/main.go:3153`) and switches on:

`Message`, `UndecryptableMessage`, `HistorySync`, `Receipt`, `GroupInfo`, `CallOffer`,
`CallOfferNotice`, `CallAccept`, `CallReject`, `CallTerminate`, `Connected`, `LoggedOut`,
`Disconnected`, `ConnectFailure`, `StreamError`, `StreamReplaced`, `ClientOutdated`.

There is **no case for `Contact`, `PushName`, `BusinessName`, or `AppStateSyncComplete`**. Those
events are emitted by the library and silently dropped by the bridge.

**However, the data still arrives**, because whatsmeow maintains its own internal store regardless of
the bridge's handlers. Live evidence from the WA-01 store (`whatsapp.db`):

```
whatsmeow_contacts: 2,504 rows
  with push_name     : 1,606
  with full_name     : 1,042
  with business_name :   133
```

Schema (`whatsmeow_contacts`): `our_jid`, `their_jid`, `first_name`, `full_name`, `push_name`,
`business_name`, `redacted_phone`.

The nine authorized escort clients are already present, including the name the Owner supplied on
2026-10-31:

| JID | full_name | push_name | first_name | business_name |
|---|---|---|---|---|
| `8801880414177@s.whatsapp.net` | Escort Sezan | SEZAN | Escort Sezan | — |
| `8801670535255@s.whatsapp.net` | Escort Hridoy | Md Nurul Huda Hridoy | Escort Hridoy | — |
| `8801836743754@s.whatsapp.net` | Escort REZAUL KARIM | REZAUL KARIM POLASH | Escort REZAUL KARIM | — |
| `8801757622300@s.whatsapp.net` | TCIS W/A | KH NAHID HASAN | TCIS W/A | — |
| `8801790103900@s.whatsapp.net` | *(none)* | Sahil | — | Sahil |
| `8801817201596@s.whatsapp.net` | Alim | Alim | *(empty)* | — |
| `8801958122301@s.whatsapp.net` | Al-Aqsa AK Khan | Rai | Al-Aqsa AK Khan | — |
| `8801958122303@s.whatsapp.net` | Operation Jasim | F. Alim | Operation Jasim | — |
| `8801755627557@s.whatsapp.net` | *(none)* | Md Faruk Hosen | — | — |

**Conclusion:** when the Owner renames a contact in their phone, the new name already lands in the
bridge's store. Nothing consumes it.

---

## Q2 — Does the MCP server expose contact name updates to the app?

**Yes, but pull-only, one JID at a time. There is no event stream.**

- Tool `get_contact(identifier)` (`whatsapp-mcp-server/main.py:126`) returns a `saved_contact_name`
  field.
- Source: `whatsapp-mcp-server/whatsapp.py:414 get_saved_contact_name()`, which opens
  `whatsmeow_contacts` **read-only** and selects `full_name`, `first_name`.
- It **deliberately excludes `push_name`**. Function docstring: *"Return only locally saved
  contact-name fields, never WhatsApp push_name."* This is a privacy control, not an oversight.
- LID inputs are resolved to PN first (`_resolve_lid_to_phone`) and return `None` if unresolvable.
- Capability: `get_contact` is granted through the alternative
  `{"native.events.read", "native.contacts.read"}` (`capabilities.py:48`).

WA-01's MCP tool surface remains: `get_native_account_identity`, `list_native_events`,
`list_native_messages`, `get_contact`.

**There is no push channel** — no MCP notification, no SSE, no webhook for contact changes. A
consumer must poll.

---

## Q3 — Does the app ever consume contact name updates and write them to `escort_client_contacts`?

**No. That table is entirely manual.**

A full search for `INSERT`/`UPDATE`/`DELETE` against `escort_client_contacts` across `.ts`, `.mjs`
and `.sql` returns exactly one hit:

- `db/migrations/0018_escort_order_register.sql:73` — the one-time seed `INSERT`.

Every runtime reference is a `SELECT` (`app/api/escort-register/route.ts`, `scripts/process-vessel.ts`,
`scripts/reconcile-ingest.mjs`, `scripts/backfill-vessel-canonical.mjs`,
`scripts/reprocess-approved-groups.mjs`, `lib/whatsapp-archive.ts`, `scripts/message-ingestion-worker.ts`).

The only caller of `get_contact` in the app is `scripts/message-mirror-worker.ts:743`, which attaches
saved names to **mirror** rows (not `escort_client_contacts`). That worker is **disabled**
(`ALRIFAI_MESSAGE_MIRROR_ENABLED=0`).

The 2026-10-31 authorization of `8801880414177` worked because the row was written by hand with
superuser SQL. That is the only mechanism that exists.

---

## Q4 — Is the WhatsApp "push name" captured anywhere? Can we read it?

**Captured in two places; one of them is dead.**

| Location | Status |
|---|---|
| `whatsmeow_contacts.push_name` (bridge `whatsapp.db`) | **Live** — 1,606 populated rows. Deliberately **not** exposed by `get_contact` (privacy control). |
| Bridge `chats.name` (`messages.db`) | Set from PushName for **direct chats only** (`main.go:2047-2051`); the guard explicitly excludes `@g.us` group chats. |
| `public.whatsapp_messages_original.sender_push_name` (PostgreSQL) | Column exists but **0 of 10,952 WA-01 rows are populated** — a dead column, never written by any code path. |

Semantics that matter for a roster:

- `full_name` — the name **the Owner saved** for that contact (what changes when the Owner edits a
  contact in their phone). **This is the correct roster source.**
- `push_name` — the name **the contact set for themselves**. Subject to change without notice and not
  owner-controlled.
- `business_name` — verified WhatsApp Business name, present for 133 contacts.

`get_contact` already returns the correct one (`full_name`, falling back to `first_name`).

---

## Verdict and recommended direction

A contact-sync pipeline is **buildable with no protocol work**. A scheduled job calling `get_contact`
for each active roster entry and diffing `saved_contact_name` into `escort_client_contacts` would
close the gap using existing transport and existing data.

**What is missing is not the transport — it is a single roster owner.** Per the companion audit
(`2026-10-31-review-backend-audit.md`), four independent sources of truth currently govern escort
authorization and none of them is reconciled. Adding a name-sync job on top of four sources would
make the problem worse, not better.

**Therefore: name sync is deferred** until roster unification lands. See the roster-unification
design document.

---

## Method note

All queries were read-only. `whatsmeow_contacts` and `messages.db` were opened with
`?mode=ro` SQLite URIs. No message bodies were read; only contact-name metadata and counts. No
credential, token or secret value was printed. No container was restarted, no file modified.
