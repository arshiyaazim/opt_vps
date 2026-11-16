> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# AL-RIFA’I Native Message Intake and Storage Inventory

Recorded 17 October 2026 (Asia/Dhaka). This is a source/runtime inventory, not a claim that every listed capability is live-qualified. Runtime counts below are bounded observations retained in the 12 October WhatsApp foundation evidence and the 17 October handoff; the current source tree is also marked separately where it differs.

## 1. WhatsApp bridge stores

wa-01 and wa-02 each have two separate SQLite files under the account-owned bridge store. wa-03 is retained/inactive and is not part of this intake scope.

### `messages.db` — bridge-owned operational projection

Both active bridges have the same three tables:

- `chats`: `jid` primary key; display `name`; `last_message_time`; ephemeral settings; `last_read_time`.
- `messages`: composite primary key `(id, chat_jid)`; `sender`; `content`; `timestamp`; `is_from_me`; `media_type`; `filename`; `url`; `media_key`; `file_sha256`; `file_enc_sha256`; `file_length`; `deleted_at`; `quoted_message_id`.
- `calls`: composite primary key `(call_id, chat_jid)`; `from_jid`; timestamp; direction; group flag; call type; mutable lifecycle result/duration/end/reason.

Observed 12 October row counts were wa-01: `chats 726`, `messages 14,541`, `calls 11`; wa-02: `chats 1,225`, `messages 12,604`, `calls 5`. Counts are not a complete-history guarantee.

The message key is intentionally `(id, chat_jid)`, never `id` alone. The chat JID identifies the conversation; a group chat JID is not the participant sender. The bridge resolves some PN/LID values before storing the projection, so the current table is not a lossless original protobuf/event archive. Edits/revokes can update the compatibility row; an immutable event journal is not deployed in the current bridge source.

Media columns are metadata/reference fields. A non-null `media_type`, filename, URL, key, hash or length does not prove that original bytes exist. The bridge's media download path and retained media files are separate from this table; unavailable bytes must remain unavailable rather than being reported as successfully ingested.

### `whatsapp.db` — whatsmeow session/contact/LID store

The active bridge schemas contain these 17 tables, independently for each account:

`whatsmeow_app_state_mutation_macs`, `whatsmeow_app_state_sync_keys`, `whatsmeow_app_state_version`, `whatsmeow_chat_settings`, `whatsmeow_contacts`, `whatsmeow_device`, `whatsmeow_event_buffer`, `whatsmeow_identity_keys`, `whatsmeow_lid_map`, `whatsmeow_message_secrets`, `whatsmeow_nct_salt`, `whatsmeow_pre_keys`, `whatsmeow_privacy_tokens`, `whatsmeow_retry_buffer`, `whatsmeow_sender_keys`, `whatsmeow_sessions`, `whatsmeow_version`.

`whatsmeow_contacts` can provide first/full/push/business names and redacted phone metadata. It is latest-value contact state, not immutable per-message provenance. `whatsmeow_lid_map` can support a LID↔PN mapping where present; absence is not permission to invent a phone. `whatsmeow_device` identifies the paired account technically, not the human author of every outgoing message.

## 2. AL-RIFA’I PostgreSQL inventory

The canonical database is `alrifai`; the application uses the existing PostgreSQL architecture and does not create a second business database. Current source migrations define these groups:

- Legacy/source snapshot: `programs`, `reviews`, `datasets`, `site_source_snapshots`, `site_cash_archive`, `site_operation_notes`, `site_payment_drafts`, `site_settlement_drafts`.
- Source/evidence foundation: `business_commands`, `source_refs`, `domain_events`.
- Workflow/cash/roster: `cash_instructions`, `employee_mobile_evidence`, `roster_source_links`, `program_assignments`, `cash_postings`, `cash_movements`.
- Reconciliation: `reconciliation_runs`, `reconciliation_sources`, `reconciliation_originals`, `reconciliation_cases`, `reconciliation_decisions`, `reconciliation_links`, `reconciliation_policies`, `reconciliation_files`, `reconciliation_progress`.
- Current cash-portal candidate additions in the working tree: `cash_live_sync_state`, `cash_portal_users`, `cash_portal_sessions`, `cash_portal_audit`.
- Identity-review schema: `identity_review_candidate.records`, `identity_review_candidate.operator_decisions`.

The last retained production evidence reports a canonical PostgreSQL database with existing ledger/source/cash data and zero accepted financial posting for the R1 scope. The current working-tree migrations `0015`–`0017` are not treated as newly applied by this task; no migration or production write was run.

## 3. Native-to-AL-RIFA’I coverage

The existing read-only history adapter can preserve account, chat, native message ID, sender, direction, source timestamp, body hash, quoted-message reference, forwarding state when exposed, media metadata and source references for bounded pages. It uses account/chat/cursor scope and evidence-before-progress rules.

The following remain `UNVERIFIED` or incomplete in the live chain: continuous all-message consumer startup, stable live cursor/replay after restart, immutable edit/revoke/origin journal in the deployed bridge, complete original sender namespace and membership provenance, authoritative Owner/Accountant binding in every production path, native media-byte availability/retention, and durable source projection for every wa-01/wa-02 inbound/outbound message. The bridge caches and offline qualification fixtures are not proof of those live properties.

## 4. Business safety boundaries

- Identity fields remain separate: contact/profile/group name, normalized mobile, WhatsApp JID, LID, employee mobile, payout number and Employee ID are not interchangeable.
- Group name or membership does not grant a business role.
- Cash intent parsing requires the exact configured wa-01 Owner → Accountant chat, outgoing Owner-side source identity, payment intent, employee mobile, separate payout mobile, method, amount and source timestamp. Name-only input is ignored.
- Source identity is `(account_id, chat_jid, message_id, block_key)` for replay protection. Different valid instructions are not merged merely because employee/amount match.
- The current live cash intake candidate is review-only. It does not call the financial posting function; posting remains a separately authorized action. No production deployment, migration, restart, WhatsApp send or financial posting was performed for this task.

## 5. Evidence status

`PASS` — schema/table inventory documented for both bridge databases and the AL-RIFA’I source schema; composite message identity preserved; cash API source traceability and fixed `wa-01`/`Cash Payment` scope implemented in source; name-only and replay safety tests added.

`UNVERIFIED` — complete live native intake coverage, all media original bytes, live restart/replay qualification, production migration state for the working-tree cash portal additions, and current human authorship/Owner authority of every outgoing packet.
