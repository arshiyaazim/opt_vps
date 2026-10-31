import hashlib
import json
import sqlite3

import pytest

import capabilities
import main
import native_reader
from native_reader import DisposableNativeReader, NativePrincipal, NativeReadError

ACCOUNT = "wa-01"
CHAT = "15551234567@s.whatsapp.net"
SENDER = "15557654321@s.whatsapp.net"
STREAM = "12345678-1234-1234-1234-123456789abc"
BINDING = {
    "accountId": ACCOUNT,
    "streamId": STREAM,
    "pairedJid": "15550000001:1@s.whatsapp.net",
    "pairedLid": "15550000000001:1@lid",
}


def configure(monkeypatch, tmp_path, scopes):
    token = "synthetic-live-mirror-token"
    token_path = tmp_path / "consumer-token"
    token_path.write_text(token)
    token_path.chmod(0o600)
    policy_path = tmp_path / "policy.json"
    policy_path.write_text(
        json.dumps(
            {
                "consumers": [
                    {
                        "id": "mirror-reader",
                        "account": ACCOUNT,
                        "token_sha256": hashlib.sha256(token.encode()).hexdigest(),
                        "capabilities": scopes,
                    }
                ]
            }
        )
    )
    policy_path.chmod(0o600)
    monkeypatch.setenv("WHATSAPP_AUTH_POLICY", str(policy_path))
    monkeypatch.setenv("WHATSAPP_ACCOUNT_ALIAS", ACCOUNT)
    monkeypatch.setenv("WHATSAPP_CONSUMER_ID", "mirror-reader")
    monkeypatch.setenv("WHATSAPP_CONSUMER_TOKEN_FILE", str(token_path))


def add_event(
    db, sequence, message_id, body, source_time, *, chat=CHAT, sender=SENDER, direction="incoming", participant=None
):
    payload = {"message": {"fields": [{"value": body}]}}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    payload_hash = hashlib.sha256(payload_bytes).digest()
    header = {
        "scope": {"accountId": ACCOUNT},
        "account": {"streamId": STREAM},
        "event": {
            "chatJid": {"state": "present", "value": chat},
            "senderJid": {"state": "present", "value": sender},
            "direction": {"state": "present", "value": direction},
        },
        "content": {
            "text": {
                "state": "present",
                "value": {"ref": "/message/fields/0/value"},
            }
        },
        "flags": {"forwarded": {"state": "present", "value": False}},
        "relations": {},
        "target": {},
        "media": [],
    }
    if participant is not None:
        header["event"]["participantJid"] = {"state": "present", "value": participant}
    db.execute(
        """INSERT INTO native_events VALUES (
            ?, ?, ?, ?, ?, ?, ?, 'message', 'bridge', ?, ?, NULL, ?, ?, NULL, ?, ?
        )""",
        (
            sequence,
            f"event-{sequence}",
            f"occurrence-{sequence}",
            f"native-{sequence}",
            message_id,
            chat,
            sender,
            source_time,
            source_time,
            payload_hash,
            hashlib.sha256(f"envelope-{sequence}".encode()).digest(),
            json.dumps(header),
            STREAM,
        ),
    )
    db.execute(
        "INSERT INTO native_payloads VALUES (?, ?)",
        (payload_hash, payload_bytes.decode()),
    )


def make_reader(tmp_path, monkeypatch, participants=None, chats=None):
    database_dir = tmp_path / "disposable"
    database_dir.mkdir()
    path = database_dir / "messages.db"
    with sqlite3.connect(path) as db:
        db.executescript(
            """
            CREATE TABLE native_stream (
                singleton INTEGER, account_id TEXT, stream_id TEXT, paired_jid TEXT,
                paired_lid TEXT, identity_state TEXT, schema_version INTEGER
            );
            CREATE TABLE native_events (
                event_seq INTEGER, event_key TEXT, occurrence_key TEXT, native_event_id TEXT,
                message_id TEXT, original_chat_jid TEXT, original_sender_jid TEXT, kind TEXT,
                origin TEXT, source_time TEXT, ingested_at TEXT, semantic_hash BLOB,
                payload_hash BLOB, envelope_hash BLOB, prior_event_seq INTEGER,
                header_json TEXT, stream_id TEXT
            );
            CREATE TABLE native_payloads (payload_hash BLOB, evidence_blob TEXT);
            CREATE TABLE p1_privacy_barriers (chat_jid TEXT, message_id TEXT);
            CREATE TABLE messages (
                chat_jid TEXT, id TEXT, sender TEXT, content TEXT, timestamp TEXT,
                is_from_me INTEGER, deleted_at TEXT, resolved_sender_jid TEXT,
                identity_state TEXT
            );
            """
        )
        db.execute(
            "INSERT INTO native_stream VALUES (1, ?, ?, ?, ?, 'verified_native', 1)",
            (ACCOUNT, STREAM, BINDING["pairedJid"], BINDING["pairedLid"]),
        )
        add_event(db, 1, "pre-activation", "old message body", "2026-10-22T00:00:00Z")
    principal = NativePrincipal(
        "mirror-reader",
        1,
        ACCOUNT,
        frozenset({CHAT} if chats is None else chats),
        True,
        tuple(sorted((chat, frozenset(members)) for chat, members in (participants or {}).items())),
    )
    reader = DisposableNativeReader(
        str(path),
        ACCOUNT,
        BINDING,
        lambda: principal,
        profile_mode="simulated-live",
    )
    monkeypatch.setattr(native_reader, "_reader", reader)
    return path


def test_null_cursor_snapshots_high_water_without_returning_history(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path, ["native.events.read", "native.content.read"])
    path = make_reader(tmp_path, monkeypatch)

    boundary = main.list_native_messages(CHAT, limit=10)

    assert boundary["version"] == "native-live-message-page-v1"
    assert boundary["boundarySequence"] == "1"
    assert boundary["records"] == []
    assert boundary["complete"] is True

    with sqlite3.connect(path) as db:
        add_event(db, 2, "post-activation", "new message body", "2026-10-22T00:00:02Z")

    page = main.list_native_messages(CHAT, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    envelope = page["records"][0]["envelope"]
    assert envelope["nativeMessageId"] == "post-activation"
    assert envelope["payload"]["text"] == "new message body"
    assert envelope["media"] == []
    assert "old message body" not in json.dumps(page)
    assert page["nextCursor"] != boundary["nextCursor"]


@pytest.mark.asyncio
async def test_content_tool_requires_both_native_capabilities(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path, ["native.events.read"])

    names = {tool.name for tool in await main.mcp.list_tools()}
    assert "list_native_messages" not in names
    assert "list_native_events" in names
    with pytest.raises(PermissionError):
        await main.mcp.call_tool(
            "list_native_messages",
            {"chat_jid": CHAT},
        )


def test_content_tool_rejects_out_of_scope_chat(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path, ["native.events.read", "native.content.read"])
    make_reader(tmp_path, monkeypatch)

    with pytest.raises(NativeReadError, match="NATIVE_ACCESS_DENIED"):
        main.list_native_messages("15550000000@s.whatsapp.net")


def test_native_contact_lookup_is_limited_to_profile_chat_and_participants(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path, ["native.events.read", "native.contacts.read"])
    make_reader(tmp_path, monkeypatch, {CHAT: [SENDER]})

    looked_up = []
    monkeypatch.setattr(main, "whatsapp_get_chat", lambda jid, **kwargs: looked_up.append(jid) or {"name": "Scoped"})
    monkeypatch.setattr(main, "whatsapp_get_sender_name", lambda jid: jid)
    monkeypatch.setattr(main, "whatsapp_get_saved_contact_name", lambda jid: "Saved")

    result = main.get_contact(identifier=SENDER)
    assert result["jid"] == SENDER
    assert result["saved_contact_name"] == "Saved"
    assert looked_up == [SENDER]

    looked_up.clear()
    with pytest.raises(NativeReadError, match="NATIVE_CONTACT_SCOPE_DENIED"):
        main.get_contact(identifier="15559999999@s.whatsapp.net")
    assert looked_up == []


def test_native_message_tool_grant_is_narrow():
    assert capabilities.TOOL_CAPABILITIES["list_native_messages"] == {
        "native.events.read",
        "native.content.read",
    }


def test_wa03_is_accepted_by_generic_native_reader(tmp_path):
    database_dir = tmp_path / "disposable"
    database_dir.mkdir()
    path = database_dir / "messages.db"
    path.touch()
    binding = {
        "accountId": "wa-03",
        "streamId": STREAM,
        "pairedJid": "15550000001:1@s.whatsapp.net",
        "pairedLid": "15500000000001:1@lid",
    }

    reader = DisposableNativeReader(
        str(path),
        "wa-03",
        binding,
        lambda: NativePrincipal("mirror-reader", 1, "wa-03", frozenset(), True),
        profile_mode="simulated-live",
    )

    assert reader.account == "wa-03"


GROUP = "120363426895117693@g.us"
PARTICIPANT = "15551112222@s.whatsapp.net"
PAIRED_PN = "15550000001@s.whatsapp.net"
PAIRED_LID = "15550000000001@lid"


def group_reader(tmp_path, monkeypatch, members=None):
    return make_reader(
        tmp_path,
        monkeypatch,
        {GROUP: [PARTICIPANT] if members is None else members},
        chats={CHAT, GROUP},
    )


def group_boundary(monkeypatch, tmp_path, members=None):
    configure(monkeypatch, tmp_path, ["native.events.read", "native.content.read"])
    path = group_reader(tmp_path, monkeypatch, members)
    return path, main.list_native_messages(GROUP, limit=10)


def test_group_paired_admin_outgoing_lid_message_is_accepted(monkeypatch, tmp_path):
    """Event 1327 case: the paired Admin LID sends into an allowlisted group."""
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "self-outgoing-lid",
            "office group outgoing note",
            "2026-10-27T05:31:05Z",
            chat=GROUP,
            sender=PAIRED_LID,
            direction="outgoing",
            participant=PAIRED_LID,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    record = page["records"][0]
    assert record["senderJid"] == PAIRED_LID
    assert record["envelope"]["direction"] == "OUTGOING"
    assert record["envelope"]["senderLid"] == PAIRED_LID
    assert record["envelope"]["chatType"] == "group"
    assert record["envelope"]["payload"]["text"] == "office group outgoing note"
    assert page["complete"] is True


def test_group_paired_admin_outgoing_pn_message_is_accepted(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "self-outgoing-pn",
            "paired phone number variant",
            "2026-10-27T05:32:00Z",
            chat=GROUP,
            sender=PAIRED_PN,
            direction="outgoing",
            participant=PAIRED_PN,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    assert page["records"][0]["envelope"]["senderPhone"] is None


def test_group_authorized_participant_message_is_accepted(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "participant-incoming",
            "client participant message",
            "2026-10-27T05:33:00Z",
            chat=GROUP,
            sender=PARTICIPANT,
            direction="incoming",
            participant=PARTICIPANT,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    assert page["records"][0]["envelope"]["direction"] == "INCOMING"


def test_group_unauthorized_participant_is_denied_and_cursor_advances(monkeypatch, tmp_path):
    """A denial is a terminal per-event verdict, never a page-level error."""
    path, boundary = group_boundary(monkeypatch, tmp_path)
    stranger = "15559998888@s.whatsapp.net"
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "stranger",
            "unknown participant",
            "2026-10-27T05:34:00Z",
            chat=GROUP,
            sender=stranger,
            direction="incoming",
            participant=stranger,
        )

    raw = native_reader._reader.page(GROUP, boundary["nextCursor"], 10)
    denied = [record for record in raw["records"] if record["sequence"] == "2"]
    assert denied[0]["status"] == "DENIED"
    assert denied[0]["reason"] == "PARTICIPANT_NOT_AUTHORIZED"
    assert denied[0]["envelope"] is None

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)
    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"
    assert page["complete"] is True


def test_group_paired_sender_with_foreign_participant_is_denied(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "paired-sender-foreign-participant",
            "spoofed participant",
            "2026-10-27T05:35:00Z",
            chat=GROUP,
            sender=PAIRED_LID,
            direction="outgoing",
            participant=PARTICIPANT,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_paired_identity_incoming_direction_is_denied(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "paired-incoming-direction",
            "incoming self identity",
            "2026-10-27T05:36:00Z",
            chat=GROUP,
            sender=PAIRED_LID,
            direction="incoming",
            participant=PAIRED_LID,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_replayed_cursor_returns_no_duplicate_records(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "replay-self",
            "outgoing once",
            "2026-10-27T05:37:00Z",
            chat=GROUP,
            sender=PAIRED_LID,
            direction="outgoing",
            participant=PAIRED_LID,
        )

    first = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)
    replay = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)
    advanced = main.list_native_messages(GROUP, cursor=first["nextCursor"], limit=10)

    assert [record["sequence"] for record in first["records"]] == ["2"]
    assert replay["records"] == first["records"]
    assert advanced["records"] == []
    assert advanced["complete"] is True


def test_group_denial_does_not_stall_later_authorized_events(monkeypatch, tmp_path):
    """Head-of-line: a denied event must never block the events behind it."""
    path, boundary = group_boundary(monkeypatch, tmp_path)
    stranger = "15559997777@s.whatsapp.net"
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "blocked",
            "denied participant",
            "2026-10-27T05:38:00Z",
            chat=GROUP,
            sender=stranger,
            direction="incoming",
            participant=stranger,
        )
        add_event(
            db,
            3,
            "after-denial",
            "authorized message",
            "2026-10-27T05:39:00Z",
            chat=GROUP,
            sender=PARTICIPANT,
            direction="incoming",
            participant=PARTICIPANT,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["3"]
    assert page["nextCursor"].split(":")[3] == "3"
    assert page["complete"] is True


def test_group_denial_is_terminal_and_never_retried(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path)
    stranger = "15559996666@s.whatsapp.net"
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "terminal-denial",
            "denied once",
            "2026-10-27T05:41:00Z",
            chat=GROUP,
            sender=stranger,
            direction="incoming",
            participant=stranger,
        )

    first = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)
    replay = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)
    advanced = main.list_native_messages(GROUP, cursor=first["nextCursor"], limit=10)

    assert first["records"] == []
    assert replay["records"] == []
    assert replay["nextCursor"] == first["nextCursor"]
    assert advanced["records"] == []
    assert advanced["nextCursor"] == first["nextCursor"]


def test_direct_chat_sender_scope_is_unaffected_by_group_participants(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path, ["native.events.read", "native.content.read"])
    path = make_reader(tmp_path, monkeypatch, {GROUP: [PARTICIPANT]})
    boundary = main.list_native_messages(CHAT, limit=10)
    with sqlite3.connect(path) as db:
        add_event(db, 2, "direct-any-sender", "direct chat body", "2026-10-27T05:40:00Z")

    page = main.list_native_messages(CHAT, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    assert page["records"][0]["envelope"]["chatType"] == "direct"


CLIENT_LID = "15554443332222@lid"
CLIENT_PN = "15554443333@s.whatsapp.net"


def add_resolution(db, message_id, resolved, state="RESOLVED", chat=GROUP):
    db.execute(
        "INSERT INTO messages (chat_jid, id, sender, content, timestamp, is_from_me, resolved_sender_jid, identity_state)"
        " VALUES (?, ?, ?, '', '2026-10-27T05:50:00Z', 0, ?, ?)",
        (chat, message_id, CLIENT_LID.split("@")[0], resolved, state),
    )


def test_group_lid_participant_resolved_to_listed_pn_is_accepted(monkeypatch, tmp_path):
    """PN-based allowlists must still admit the same participant writing as a LID."""
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "resolved-client",
            "client message via lid",
            "2026-10-27T05:50:24Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="incoming",
            participant=CLIENT_LID,
        )
        add_resolution(db, "resolved-client", CLIENT_PN)

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert [record["sequence"] for record in page["records"]] == ["2"]
    assert page["records"][0]["senderJid"] == CLIENT_LID
    assert page["records"][0]["envelope"]["direction"] == "INCOMING"


def test_group_lid_participant_without_bridge_resolution_is_rejected(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "unresolved-client",
            "unresolved lid",
            "2026-10-27T05:51:00Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="incoming",
            participant=CLIENT_LID,
        )

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_lid_resolved_to_unlisted_pn_is_rejected(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "resolved-stranger",
            "stranger lid",
            "2026-10-27T05:52:00Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="incoming",
            participant=CLIENT_LID,
        )
        add_resolution(db, "resolved-stranger", "15559990000@s.whatsapp.net")

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_unresolved_identity_state_is_rejected(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "unresolved-state",
            "state not resolved",
            "2026-10-27T05:53:00Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="incoming",
            participant=CLIENT_LID,
        )
        add_resolution(db, "unresolved-state", CLIENT_PN, state="UNRESOLVED")

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_resolution_does_not_admit_outgoing_spoof(monkeypatch, tmp_path):
    """Bridge resolution is only honoured for incoming events, never self-spoofed outgoing."""
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "outgoing-lid",
            "outgoing from client lid",
            "2026-10-27T05:54:00Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="outgoing",
            participant=CLIENT_LID,
        )
        add_resolution(db, "outgoing-lid", CLIENT_PN)

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"


def test_group_resolution_requires_matching_participant(monkeypatch, tmp_path):
    path, boundary = group_boundary(monkeypatch, tmp_path, [CLIENT_PN])
    with sqlite3.connect(path) as db:
        add_event(
            db,
            2,
            "mismatched-participant",
            "participant mismatch",
            "2026-10-27T05:55:00Z",
            chat=GROUP,
            sender=CLIENT_LID,
            direction="incoming",
            participant=PARTICIPANT,
        )
        add_resolution(db, "mismatched-participant", CLIENT_PN)

    page = main.list_native_messages(GROUP, cursor=boundary["nextCursor"], limit=10)

    assert page["records"] == []
    assert page["nextCursor"].split(":")[3] == "2"
