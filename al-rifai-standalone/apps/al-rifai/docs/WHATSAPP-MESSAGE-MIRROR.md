# WhatsApp Message Mirror

The Message Mirror stores new source events in the independent PostgreSQL
schema `whatsapp_mirror`. It does not read legacy business tables, create
business instructions, or backfill stored WhatsApp history.

## Activation boundaries

Live synchronization is opt-in with `ALRIFAI_MESSAGE_MIRROR_ENABLED=1`.
For each configured bridge/chat pair, the worker first requests the native
reader's null-cursor high-water boundary. That response contains no messages.
The timestamp, stream ID, boundary sequence, and cursor are committed as that
pair's activation checkpoint before any later page is read. A stream identity
change is an error; the worker does not reset a cursor or start from an archive.

`ALRIFAI_MESSAGE_MIRROR_CHAT_JIDS_WA01` and
`ALRIFAI_MESSAGE_MIRROR_CHAT_JIDS_WA02` are JSON arrays of explicitly
authorized chat JIDs. They must be supplied only after the corresponding
native-reader content capability and chat scope have been verified. The WA-03
connector uses the same per-bridge socket, token-file, and chat-list settings;
it remains `READY_FOR_CONNECTION` until a real source is configured.

The production Compose setting is deliberately `0` until chat-scope review is
complete. WA-02 policy is never widened by this worker. The worker records
permission or connection errors and keeps WA-01, WA-02, and WA-03 checkpoints
independent.

## Bridge consumer policy and native allowlist

The Mirror's WA-01 consumer needs `native.identity.read`,
`native.events.read`, `native.content.read`, and `native.contacts.read`.
`native.contacts.read` exposes only `get_contact`; it does not expose broad
contact search. Native contact lookup is limited to JIDs in the consumer's
approved chat list or explicit participant lists. Do not grant the broad
`contacts.read` capability to the Mirror consumer.

The native-reader profile uses an account-bound `consumers` entry with a
positive `epoch`, an explicit `chats` array, and a `participants` object keyed
by an approved chat JID. Group chats require a non-empty participant list.
For a direct chat where the sender's JID differs from the chat JID (including
LID/phone identity pairs), both identities must be owner-verified and scoped;
do not infer or invent JIDs. The Mirror's app-level chat setting must match the
profile's chat scope.

The canonical WA-01 profile is
`/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json`; retain its
existing verified account binding and use only this consumer-entry shape:

```json
{
  "consumers": {
    "<designated-mirror-consumer-id>": {
      "epoch": 1,
      "chats": ["<owner-approved-chat-jid>"],
      "participants": {
        "<owner-approved-group-or-direct-chat-jid>": [
          "<owner-approved-participant-jid>"
        ]
      }
    }
  }
}
```

These are placeholders, not usable identities. Every participant-map key
must also appear in `chats`; direct-chat participant entries are needed only
when an authorized sender identity differs from the chat JID.

The app configuration is declared in `apps/al-rifai/compose.yaml` and the
file-backed environment at `/etc/vps/apps/al-rifai/app.env`. Compose currently
sets `ALRIFAI_MESSAGE_MIRROR_ENABLED=0` and points
`WHATSAPP_WA01_READER_TOKEN_FILE` at
`/etc/vps/apps/al-rifai/auth/wa-01.token`. The live worker credential must
authenticate as the dedicated native Mirror consumer; the current runtime
tool discovery did not show that consumer's native tool set. Set
`ALRIFAI_MESSAGE_MIRROR_CHAT_JIDS_WA01` only to the same owner-approved JIDs
as the native profile. Keep WA-02 unconfigured for message synchronization.

WA-02 remains identity-only: its designated consumer should have only
`native.identity.read`, with no message, content, contact, or media grants.
The current runtime policy files are service-owned
(`/etc/vps/services/whatsapp/wa-01-consumer-policy.json` and
`wa-02-consumer-policy.json`); source changes do not update those mounted
policies. Before activation, an operator must update the WA-01 grants and bind
the Mirror to that scoped consumer, reduce the WA-02 designated consumer to
identity-only, and populate the profile/app allowlists with owner-approved
identities. No live values or credentials are stored here.

## Migration and testing

The worker's `--migrate-only` mode applies only
`db/migrations/0025_whatsapp_message_mirror.sql`; it does not invoke the
legacy migration runner. The Docker build runs the Mirror unit tests before
the application build. The optional PostgreSQL integration test requires
`MIRROR_TEST_DATABASE_URL` to point to an explicitly disposable database whose
name begins with `alrifai_mirror_test_`.

Example isolated migration test invocation (use a disposable PostgreSQL
instance, never the production database):

```sh
MIRROR_TEST_DATABASE_URL=postgresql://.../alrifai_mirror_test_local \
  node --experimental-strip-types --test tests/message-mirror.mjs
```

The worker uses the existing authenticated Unix-socket MCP relay and
file-backed reader tokens. It never sends WhatsApp messages, downloads media
binaries, or writes to Cash, ledger, Vessel, Escort, Employee, or other legacy
business tables.

## Contact-name fields

`messages.saved_contact_name` is populated only from the existing authorized
`get_contact` MCP capability's explicit `saved_contact_name` field, which is
resolved from locally saved `full_name` or `first_name` contact data. If the
Bridge does not expose that capability, the lookup fails, the returned JID
does not match the message sender, or no saved name exists, this column stays
NULL. A contact lookup failure does not discard a message.

`sender_name` is the selected display name and `sender_name_source` records
its provenance (`SOURCE_CONTACT` or `SOURCE_PUSH_NAME`). A source push name may
be used only as a display fallback; it is never treated as a saved contact
name. The original name fields remain distinct.
