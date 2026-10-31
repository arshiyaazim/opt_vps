"""Bounded P1 native reads with explicit disposable/simulated/live admission.

No path, credentials, network or production bootstrap is inferred from environment.
Native SQLite owns bodies. The two read tools share the existing MCP process.
"""

import hashlib
import json
import os
import re
import sqlite3
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

PAGE_BYTES = 80_000
WIRE_BYTES = 250_000
TEXT_BYTES = 64_000
SEQUENCE_MAX = 2**63 - 1


class NativeReadError(ValueError):
    """Fixed public error codes, never raw database/content diagnostics."""


def bare_identity(value):
    """Return a JID/LID without its WhatsApp device suffix (``:27``), else ``None``."""
    if not isinstance(value, str) or "@" not in value:
        return None
    user, server = value.rsplit("@", 1)
    if not user or not server:
        return None
    return f"{user.split(':', 1)[0]}@{server}"


class WhatsmeowSessionIdentityReader:
    """Read only the paired account identity from the existing whatsmeow store."""

    def __init__(self, path: str, account: str):
        if path != "/runtime/store/whatsapp.db":
            raise NativeReadError("NATIVE_IDENTITY_SOURCE_DENIED")
        target = Path(path).resolve(strict=True)
        if Path(path).is_symlink() or account not in {"wa-01", "wa-02"} or not target.is_file():
            raise NativeReadError("NATIVE_IDENTITY_SOURCE_DENIED")
        self.path = target
        self.account = account

    def identity(self):
        until = time.monotonic() + 3
        db = None
        try:
            db = sqlite3.connect(self.path.as_uri() + "?mode=ro", uri=True, timeout=1)
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA query_only=ON")
            db.execute("PRAGMA busy_timeout=1000")
            rows = db.execute("SELECT jid,lid FROM whatsmeow_device LIMIT 2").fetchall()
            if time.monotonic() > until:
                raise NativeReadError("NATIVE_READ_TIMEOUT")
            if len(rows) != 1:
                raise NativeReadError("NATIVE_ACCOUNT_MISMATCH")
            jid, lid = rows[0]["jid"], rows[0]["lid"]
            if (
                not isinstance(jid, str)
                or not re.fullmatch(r"[0-9]{1,30}(?::[0-9]+)?@s\.whatsapp\.net", jid)
                or not isinstance(lid, str)
                or not re.fullmatch(r"[0-9]{1,30}(?::[0-9]+)?@lid", lid)
            ):
                raise NativeReadError("NATIVE_ACCOUNT_MISMATCH")
            return {
                "version": "native-account-v1",
                "accountId": self.account,
                "nativeScope": {"accountId": self.account, "pairedJid": jid, "pairedLid": lid},
                "evidenceState": "PERSISTED_NATIVE",
                "operationalAuthority": "NONE",
            }
        except sqlite3.Error:
            raise NativeReadError(
                "NATIVE_READ_TIMEOUT" if time.monotonic() > until else "NATIVE_STORAGE_UNAVAILABLE"
            ) from None
        finally:
            if db is not None:
                db.close()


@dataclass(frozen=True)
class NativePrincipal:
    subject: str
    epoch: int
    account: str
    chats: frozenset[str]
    content: bool
    participants: tuple[tuple[str, frozenset[str]], ...] | None = None


class DisposableNativeReader:
    def __init__(
        self,
        path: str,
        account: str,
        binding: dict,
        authorize: Callable[[], NativePrincipal],
        *,
        deadline_seconds: float = 5,
        profile_mode: str = "disposable",
    ):
        target = Path(path).resolve(strict=True)
        if (
            Path(path).is_symlink()
            or profile_mode not in {"disposable", "simulated-live", "live"}
            or profile_mode != "live"
            and "disposable" not in target.parts
            or profile_mode == "live"
            and str(target) != "/runtime/store/messages.db"
            or account not in {"wa-01", "wa-02", "wa-03"}
            or profile_mode == "disposable"
            and not str(binding.get("accountId", "")).startswith("synthetic-")
            or profile_mode == "simulated-live"
            and binding.get("accountId") != account
            and not str(binding.get("accountId", "")).startswith("synthetic-")
            or profile_mode == "live"
            and binding.get("accountId") != account
            or set(binding) != {"accountId", "streamId", "pairedJid", "pairedLid"}
            or not re.fullmatch(r"[a-f0-9-]{36}", binding["streamId"])
            or not 0 < deadline_seconds <= 5
        ):
            raise NativeReadError("DISPOSABLE_NATIVE_BINDING_REQUIRED")
        self.mode = profile_mode
        self.path, self.account, self.binding = target, account, dict(binding)
        self.authorize, self.deadline = authorize, deadline_seconds
        self._slot = threading.Lock()

    def _principal(self, chat=None):
        p = self.authorize()
        if (
            not isinstance(p, NativePrincipal)
            or not p.subject
            or p.epoch < 1
            or p.account != self.account
            or chat is not None
            and chat not in p.chats
        ):
            raise NativeReadError("NATIVE_ACCESS_DENIED")
        return p

    def _paired_identities(self):
        """The account's own PN/LID, device suffix removed."""
        return frozenset(
            identity
            for identity in (
                bare_identity(self.binding.get("pairedJid")),
                bare_identity(self.binding.get("pairedLid")),
            )
            if identity
        )

    def _group_identity_allowed(self, db, message_id, sender, participant, direction, allowed):
        """Gate group senders against the profile participant allowlist.

        Three narrow admissions:
        * sender and participant are both listed (unchanged behaviour);
        * the paired account itself authored the message, so its own PN/LID is
          admitted even though it is not a group participant;
        * the bridge resolved the author's LID to a listed phone identity in its
          own store for this same message, on an incoming event.
        Every other sender stays denied.
        """
        sender_bare, participant_bare = bare_identity(sender), bare_identity(participant)
        if sender in allowed and participant in allowed:
            return True
        if sender_bare is None or sender_bare != participant_bare:
            return False
        if direction == "outgoing" and sender_bare in self._paired_identities():
            return True
        return direction == "incoming" and self._resolved_identity_allowed(db, message_id, allowed)

    @staticmethod
    def _resolved_identity_allowed(db, message_id, allowed):
        """Admit a LID author only when the bridge itself resolved it to a listed PN."""
        if not message_id or not allowed:
            return False
        try:
            row = db.execute(
                "SELECT resolved_sender_jid FROM messages WHERE id=? AND identity_state='RESOLVED'",
                (message_id,),
            ).fetchone()
        except sqlite3.Error:
            return False
        resolved = bare_identity(row[0] if row else None)
        if resolved is None or not resolved.endswith("@s.whatsapp.net"):
            return False
        return resolved in {bare_identity(entry) for entry in allowed}

    def _db(self, until):
        remaining = until - time.monotonic()
        if remaining <= 0:
            raise NativeReadError("NATIVE_READ_TIMEOUT")
        # Bounded contention allowance inside the existing five-second read deadline.
        db = sqlite3.connect(self.path.as_uri() + "?mode=ro", uri=True, timeout=min(1.0, remaining))
        try:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA query_only=ON")
            db.set_progress_handler(lambda: int(time.monotonic() > until), 500)
            db.execute("BEGIN")
            actual = db.execute(
                "SELECT account_id,stream_id,paired_jid,paired_lid,identity_state,schema_version FROM native_stream WHERE singleton=1"
            ).fetchone()
            if time.monotonic() > until:
                raise NativeReadError("NATIVE_READ_TIMEOUT")
            if (
                actual is None
                or {
                    "accountId": actual["account_id"],
                    "streamId": actual["stream_id"],
                    "pairedJid": actual["paired_jid"],
                    "pairedLid": actual["paired_lid"],
                }
                != self.binding
                or actual["identity_state"] != "verified_native"
                or actual["schema_version"] != 1
            ):
                raise NativeReadError("NATIVE_ACCOUNT_MISMATCH")
            return db
        except BaseException:
            db.close()
            raise

    def identity(self):
        p = self._principal()
        db = self._db(time.monotonic() + self.deadline)
        try:
            result = {
                "version": "native-account-v1",
                "accountId": self.account,
                "nativeScope": dict(self.binding),
                "evidenceState": {
                    "disposable": "DISPOSABLE_NATIVE",
                    "simulated-live": "SIMULATED_NATIVE",
                    "live": "LIVE_NATIVE",
                }[self.mode],
                "operationalAuthority": "NONE",
            }
            if p != self._principal():
                raise NativeReadError("NATIVE_ACCESS_REVOKED")
            return result
        finally:
            db.close()

    def _cursor(self, chat, after, through):
        digest = hashlib.sha256(chat.encode()).hexdigest()[:24]
        return f"n1:{self.binding['streamId']}:{digest}:{after}:{through}"

    def _parse_cursor(self, chat, cursor):
        if cursor is None:
            return 0, 0
        if not isinstance(cursor, str) or len(cursor) > 200:
            raise NativeReadError("NATIVE_CURSOR_INVALID")
        pieces = cursor.split(":")
        if (
            len(pieces) != 5
            or pieces[:3] != self._cursor(chat, 0, 0).split(":")[:3]
            or any(not re.fullmatch(r"0|[1-9][0-9]{0,18}", n) for n in pieces[3:])
        ):
            raise NativeReadError("NATIVE_CURSOR_SCOPE_MISMATCH")
        after, through = map(int, pieces[3:])
        if max(after, through) > SEQUENCE_MAX or through and after > through:
            raise NativeReadError("NATIVE_CURSOR_INVALID")
        return after, through

    @staticmethod
    def _value(field):
        return field.get("value") if isinstance(field, dict) and field.get("state") in {"present", "empty"} else None

    @staticmethod
    def _json_path(pointer):
        if not isinstance(pointer, str) or not re.fullmatch(r"/message(?:/fields/[0-9]{1,4}/value){1,24}", pointer):
            return None
        return "$" + re.sub(r"/fields/([0-9]+)/value", r".fields[\1].value", pointer[8:]).join([".message", ""])

    def _leaf(self, db, payload, field, maximum=TEXT_BYTES):
        if not payload or not isinstance(field, dict):
            return None, "BODY_UNAVAILABLE"
        value = self._value(field)
        pointer = value.get("ref") if isinstance(value, dict) else None
        path = self._json_path(pointer)
        if path is None:
            return None, "BODY_UNAVAILABLE"
        # Never SELECT the complete native blob or quoted body into Python.
        size = db.execute(
            "SELECT length(evidence_blob) FROM native_payloads WHERE payload_hash=?", (payload,)
        ).fetchone()
        if size is None or size[0] > 4 * 1024 * 1024:
            return None, "NATIVE_PAYLOAD_INVALID"
        shape = db.execute(
            "SELECT json_type(evidence_blob,?),length(CAST(json_extract(evidence_blob,?) AS BLOB)),length(evidence_blob) FROM native_payloads WHERE payload_hash=?",
            (path, path, payload),
        ).fetchone()
        if shape is None or shape[2] > 4 * 1024 * 1024:
            return None, "NATIVE_PAYLOAD_INVALID"
        if shape[0] in ("true", "false"):
            return shape[0] == "true", None
        if shape[0] != "text":
            return None, "BODY_UNAVAILABLE"
        if shape[1] > maximum:
            return None, "CONTENT_OVER_64000_BYTES"
        return db.execute(
            "SELECT json_extract(evidence_blob,?) FROM native_payloads WHERE payload_hash=?", (path, payload)
        ).fetchone()[0], None

    def _quote(self, db, payload, field):
        value = self._value(field)
        pointer = value.get("ref") if isinstance(value, dict) else None
        path = self._json_path(pointer)
        if not path or not payload:
            return None
        size = db.execute(
            "SELECT length(evidence_blob) FROM native_payloads WHERE payload_hash=?", (payload,)
        ).fetchone()
        if size is None or size[0] > 4 * 1024 * 1024:
            return None
        result = {"messageId": None, "participantJid": None, "chatJid": None}
        for name, key in [("stanzaID", "messageId"), ("participant", "participantJid"), ("remoteJID", "chatJid")]:
            row = db.execute(
                "SELECT json_extract(value,'$.value') FROM native_payloads,json_each(json_extract(evidence_blob,?)) WHERE payload_hash=? AND json_extract(value,'$.name')=? AND json_type(value,'$.value')='text' AND length(CAST(json_extract(value,'$.value') AS BLOB))<=256 LIMIT 1",
                (path + ".fields", payload, name),
            ).fetchone()
            if row:
                result[key] = row[0]
        return result

    def _record(self, db, row, principal, *, metadata_only=False):
        record = {
            "sequence": str(row["event_seq"]),
            "eventKey": row["event_key"],
            "envelopeHash": row["envelope_hash"].hex(),
            "semanticHash": row["semantic_hash"].hex() if row["semantic_hash"] else None,
            "occurrenceKey": row["occurrence_key"],
            "nativeEventId": row["native_event_id"],
            "messageId": row["message_id"],
            "chatJid": row["original_chat_jid"],
            "senderJid": row["original_sender_jid"],
            "sourceTime": row["source_time"],
            "observedAt": row["ingested_at"],
            "origin": row["origin"],
            "kind": row["kind"],
            "priorSequence": str(row["prior_event_seq"]) if row["prior_event_seq"] else None,
            "status": "HELD",
            "reason": "BODY_UNAVAILABLE",
            "envelope": None,
            "target": None,
        }
        if row["header_size"] > 16384:
            record["reason"] = "NATIVE_HEADER_BUDGET"
            return record
        h = json.loads(row["header_json"])
        event = h.get("event", {})
        if (
            h.get("scope", {}).get("AccountID", h.get("scope", {}).get("accountId"))
            not in (None, self.binding["accountId"])
            or h.get("account", {}).get("streamId") != self.binding["streamId"]
            or self._value(event.get("chatJid")) not in (None, row["original_chat_jid"])
            or self._value(event.get("senderJid"))
            not in (
                None,
                row["original_sender_jid"],
                "" if row["original_sender_jid"] is None else row["original_sender_jid"],
            )
        ):
            raise NativeReadError("NATIVE_EVENT_SCOPE_MISMATCH")
        if principal.participants is not None and row["original_chat_jid"].endswith("@g.us"):
            allowed = dict(principal.participants).get(row["original_chat_jid"], frozenset())
            group_message_id = (
                self._value(h.get("target", {}).get("messageId")) if row["kind"] == "edit" else row["message_id"]
            )
            if not self._group_identity_allowed(
                db,
                group_message_id,
                row["original_sender_jid"],
                self._value(event.get("participantJid")),
                self._value(event.get("direction")),
                allowed,
            ):
                # A denial is a terminal verdict for this one event, not a
                # transient error. Record it as a skippable non-content record
                # so the caller advances the cursor and later events in the
                # chat keep flowing. Raising here would stall every later
                # event behind a single unauthorized sender.
                record["status"], record["reason"] = "DENIED", "PARTICIPANT_NOT_AUTHORIZED"
                return record
        content_allowed = principal.content and not metadata_only
        record["quote"] = (
            self._quote(db, row["payload_hash"], h.get("relations", {}).get("quote")) if content_allowed else None
        )
        participant = event.get("participantJid", {"state": "unknown"})
        record["participant"] = {"state": participant.get("state", "unknown"), "value": self._value(participant)}
        target = h.get("target", {})
        record["target"] = {
            "messageId": self._value(target.get("messageId")),
            "chatJid": self._value(target.get("chatJid")),
            "fromMe": self._value(target.get("fromMe")),
            "participantJid": self._value(target.get("participantJid")),
        }
        privacy = self._value(h.get("flags", {}).get("privacyAction")) is True
        suppression_id = record["target"]["messageId"] if row["kind"] == "edit" else row["message_id"]
        suppressed = db.execute(
            "SELECT 1 FROM p1_privacy_barriers WHERE chat_jid=? AND message_id=?",
            (row["original_chat_jid"], suppression_id),
        ).fetchone()
        if suppressed:
            record["status"], record["reason"] = "SUPPRESSED", "OWNER_CONTENT_SUPPRESSED"
            return record
        if row["kind"] in {
            "revoke",
            "control",
            "projection_attempt",
            "receipt",
            "reaction",
            "undecryptable",
            "unsupported",
            "invalid_identity",
            "group_observation",
            "call",
        }:
            record["status"], record["reason"] = "CONTROL", "PRIVACY_ACTION" if privacy else "TYPED_NATIVE_EVENT"
            return record
        if not content_allowed:
            record["reason"] = "METADATA_ONLY" if metadata_only else "NATIVE_CONTENT_SCOPE_DENIED"
            return record
        direction = self._value(event.get("direction"))
        message_id = record["target"]["messageId"] if row["kind"] == "edit" else row["message_id"]
        sender, chat = row["original_sender_jid"], row["original_chat_jid"]
        if (
            not message_id
            or len(message_id) > 200
            or not sender
            or not re.fullmatch(r"[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid)", sender)
            or direction not in {"incoming", "outgoing"}
            or not row["source_time"]
        ):
            record["reason"] = "NATIVE_IDENTITY_UNRESOLVED"
            return record
        body, reason = self._leaf(db, row["payload_hash"], h.get("content", {}).get("text"))
        if reason == "BODY_UNAVAILABLE":
            body, reason = self._leaf(db, row["payload_hash"], h.get("content", {}).get("caption"))
        media = []
        for i, m in enumerate(h.get("media", [])[:10]):
            typ = self._value(m.get("kind"))
            if typ in {"imageMessage", "audioMessage", "documentMessage", "videoMessage", "stickerMessage"}:
                media.append(
                    {
                        "id": f"native-media-{row['event_seq']}-{i}",
                        "kind": {"imageMessage": "IMAGE", "audioMessage": "AUDIO", "documentMessage": "DOCUMENT"}.get(
                            typ, "DOCUMENT"
                        ),
                        "available": False,
                        "evidenceRef": None,
                    }
                )
        if reason and not media:
            record["reason"] = reason
            return record
        if reason == "CONTENT_OVER_64000_BYTES":
            record["reason"] = reason
            return record
        forwarded, _ = self._leaf(db, row["payload_hash"], h.get("flags", {}).get("forwarded"), 32)
        if not isinstance(forwarded, bool):
            forwarded = None
        text = body if isinstance(body, str) else ""
        record["envelope"] = {
            "version": "native-message-envelope-v1",
            "provider": "WHATSAPP",
            "accountId": self.account,
            "nativeMessageId": message_id,
            "chatJid": chat,
            "chatType": "group" if chat.endswith("@g.us") else "direct",
            "senderJid": sender,
            "senderPhone": None,
            "senderLid": sender if sender.endswith("@lid") else None,
            "direction": direction.upper(),
            "sourceTimestamp": row["source_time"],
            "sourceTimestampOriginal": row["source_time"],
            "observedAt": row["ingested_at"],
            "eventType": "EDIT" if row["kind"] == "edit" else "MEDIA" if media else "TEXT",
            "payload": {
                "text": text,
                "sha256": hashlib.sha256(text.encode()).hexdigest(),
                "reference": f"native:{self.binding['streamId']}:{row['event_seq']}",
            },
            "quotedMessageId": record["quote"]["messageId"] if record.get("quote") else None,
            "forwarded": forwarded,
            "media": media,
            "groupDisplayName": None,
            "membershipEvidence": None,
        }
        record["status"], record["reason"] = "CONTENT", None
        return record

    @staticmethod
    def _wire_size(records):
        # Conservative SDK duplicated text + structured-result encoding; the
        # copied dispatcher also checks the exact final CallToolResult bytes.
        value = {"records": records}
        text = json.dumps(value, ensure_ascii=True, indent=2)
        return (
            len(
                json.dumps(
                    {"content": [{"type": "text", "text": text}], "structuredContent": value},
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode()
            )
            + 4000
        )

    def visibility(self, chat, sequences):
        p = self._principal(chat)
        if (
            not isinstance(sequences, list)
            or not 1 <= len(sequences) <= 10
            or len(set(sequences)) != len(sequences)
            or any(
                not isinstance(n, str) or not re.fullmatch(r"[1-9][0-9]{0,18}", n) or int(n) > SEQUENCE_MAX
                for n in sequences
            )
        ):
            raise NativeReadError("NATIVE_VISIBILITY_INPUT_INVALID")
        if not self._slot.acquire(blocking=False):
            raise NativeReadError("NATIVE_READ_BUSY")
        db = None
        try:
            db = self._db(time.monotonic() + self.deadline)
            results = []
            for sequence in sequences:
                row = db.execute(
                    "SELECT original_sender_jid,CASE WHEN length(header_json)<=16384 THEN json_extract(header_json,'$.event.participantJid.value') ELSE NULL END AS participant,CASE WHEN length(header_json)<=16384 THEN json_extract(header_json,'$.event.direction.value') ELSE NULL END AS direction,message_id,kind,CASE WHEN length(header_json)<=16384 THEN json_extract(header_json,'$.target.messageId.value') ELSE NULL END AS target FROM native_events WHERE stream_id=? AND original_chat_jid=? AND event_seq=?",
                    (self.binding["streamId"], chat, int(sequence)),
                ).fetchone()
                state = "UNKNOWN"
                if row:
                    message = row["target"] if row["kind"] == "edit" else row["message_id"]
                    if p.participants is not None and chat.endswith("@g.us"):
                        allowed = dict(p.participants).get(chat, frozenset())
                        if not self._group_identity_allowed(
                            db, message, row["original_sender_jid"], row["participant"], row["direction"], allowed
                        ):
                            raise NativeReadError("NATIVE_PARTICIPANT_SCOPE_DENIED")
                    suppressed = db.execute(
                        "SELECT 1 FROM p1_privacy_barriers WHERE chat_jid=? AND message_id=?", (chat, message)
                    ).fetchone()
                    revoked = db.execute(
                        "SELECT deleted_at FROM messages WHERE chat_jid=? AND id=?", (chat, message)
                    ).fetchone()
                    state = "SUPPRESSED" if suppressed else "REVOKED" if revoked and revoked[0] else "VISIBLE"
                results.append({"sequence": sequence, "state": state})
            if p != self._principal(chat):
                raise NativeReadError("NATIVE_ACCESS_REVOKED")
            return {
                "version": "native-visibility-v1",
                "accountId": self.account,
                "chatJid": chat,
                "nativeScope": dict(self.binding),
                "results": results,
            }
        finally:
            if db is not None:
                db.close()
            self._slot.release()

    def page(self, chat, cursor=None, limit=10, *, metadata_only=False):
        if (
            not isinstance(chat, str)
            or not re.fullmatch(r"[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)", chat)
            or type(limit) is not int
            or not 1 <= limit <= 10
            or type(metadata_only) is not bool
        ):
            raise NativeReadError("NATIVE_INPUT_INVALID")
        p = self._principal(chat)
        after, through = self._parse_cursor(chat, cursor)
        if not self._slot.acquire(blocking=False):
            raise NativeReadError("NATIVE_READ_BUSY")
        try:
            until = time.monotonic() + self.deadline
            db = self._db(until)
            try:
                top = db.execute(
                    "SELECT COALESCE(MAX(event_seq),0) FROM native_events WHERE stream_id=? AND original_chat_jid=?",
                    (self.binding["streamId"], chat),
                ).fetchone()[0]
                if after > top or through > top:
                    raise NativeReadError("NATIVE_CURSOR_AHEAD")
                through = through or top
                rows = db.execute(
                    "SELECT event_seq,event_key,occurrence_key,native_event_id,message_id,original_chat_jid,original_sender_jid,kind,origin,source_time,ingested_at,semantic_hash,payload_hash,envelope_hash,prior_event_seq,length(CAST(header_json AS BLOB)) AS header_size,CASE WHEN length(CAST(header_json AS BLOB))<=16384 THEN header_json ELSE NULL END AS header_json FROM native_events WHERE stream_id=? AND original_chat_jid=? AND event_seq>? AND event_seq<=? ORDER BY event_seq LIMIT ?",
                    (self.binding["streamId"], chat, after, through, limit),
                ).fetchall()
                records, last = [], after
                for row in rows:
                    if time.monotonic() > until:
                        raise NativeReadError("NATIVE_READ_TIMEOUT")
                    record = self._record(db, row, p, metadata_only=metadata_only)
                    probe = json.dumps(records + [record], ensure_ascii=False, separators=(",", ":")).encode()
                    if (
                        len(json.dumps(record, ensure_ascii=False).encode()) > PAGE_BYTES - 4000
                        or self._wire_size([record]) > WIRE_BYTES - 4000
                    ):
                        record["envelope"], record["status"], record["reason"] = None, "HELD", "WIRE_CONTENT_BUDGET"
                        probe = json.dumps(records + [record], ensure_ascii=False, separators=(",", ":")).encode()
                    if len(probe) > PAGE_BYTES - 4000 or self._wire_size(records + [record]) > WIRE_BYTES - 4000:
                        break
                    records.append(record)
                    last = row["event_seq"]
                has_more = (
                    db.execute(
                        "SELECT 1 FROM native_events WHERE stream_id=? AND original_chat_jid=? AND event_seq>? AND event_seq<=? LIMIT 1",
                        (self.binding["streamId"], chat, last, through),
                    ).fetchone()
                    is not None
                )
                result = {
                    "version": "native-read-page-v1",
                    "accountId": self.account,
                    "chatJid": chat,
                    "nativeScope": ({"accountId": self.account} if metadata_only else dict(self.binding)),
                    "previousCursor": cursor,
                    "nextCursor": self._cursor(chat, last, through if has_more else 0),
                    "complete": not has_more,
                    "records": records,
                }
                if p != self._principal(chat):
                    raise NativeReadError("NATIVE_ACCESS_REVOKED")
                if len(json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode()) > PAGE_BYTES:
                    raise NativeReadError("NATIVE_PAGE_BUDGET")
                return result
            finally:
                db.close()
        except sqlite3.Error:
            raise NativeReadError(
                "NATIVE_READ_TIMEOUT" if time.monotonic() > until else "NATIVE_STORAGE_UNAVAILABLE"
            ) from None
        finally:
            self._slot.release()


_reader = None
_session_identity_reader = None


def install_disposable_reader(reader):
    global _reader
    if not isinstance(reader, DisposableNativeReader):
        raise NativeReadError("DISPOSABLE_NATIVE_READER_REQUIRED")
    _reader = reader


def authorize_contact(jid: str) -> NativePrincipal:
    if _reader is None:
        raise NativeReadError("NATIVE_READER_NOT_CONFIGURED")
    if not isinstance(jid, str) or not re.fullmatch(r"[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)", jid):
        raise NativeReadError("NATIVE_INPUT_INVALID")
    principal = _reader._principal()
    allowed = set(principal.chats)
    if principal.participants is not None:
        for _, participants in principal.participants:
            allowed.update(participants)
    if jid not in allowed:
        raise NativeReadError("NATIVE_ACCESS_DENIED")
    return principal


def verify_contact_scope(jid: str, principal: NativePrincipal) -> None:
    if _reader is None or _reader._principal() != principal:
        raise NativeReadError("NATIVE_ACCESS_REVOKED")
    if authorize_contact(jid) != principal:
        raise NativeReadError("NATIVE_ACCESS_REVOKED")


def configure_session_identity_reader(path=None, account=None):
    global _session_identity_reader
    path = os.environ.get("WHATSMEOW_DB_PATH") if path is None else path
    account = os.environ.get("WHATSAPP_ACCOUNT_ALIAS") if account is None else account
    if account not in {"wa-01", "wa-02"} or not path:
        return
    _session_identity_reader = WhatsmeowSessionIdentityReader(path, account)


def get_native_account_identity():
    if _reader is not None:
        return _reader.identity()
    if _session_identity_reader is not None:
        return _session_identity_reader.identity()
    raise NativeReadError("NATIVE_READER_NOT_CONFIGURED")


def list_native_events(chat_jid, cursor=None, limit=10, visibility_sequences=None):
    if _reader is None:
        raise NativeReadError("NATIVE_READER_NOT_CONFIGURED")
    if visibility_sequences is not None:
        if cursor is not None or limit != 10:
            raise NativeReadError("NATIVE_VISIBILITY_INPUT_INVALID")
        return _reader.visibility(chat_jid, visibility_sequences)
    return _reader.page(chat_jid, cursor, limit, metadata_only=True)


def list_native_messages(chat_jid, cursor=None, limit=10):
    """Read authorized message envelopes after a durable native event cursor.

    A null cursor snapshots the current high-water mark and returns no messages,
    so callers can activate without reading or importing earlier events.
    """
    if _reader is None:
        raise NativeReadError("NATIVE_READER_NOT_CONFIGURED")
    if not isinstance(chat_jid, str) or not re.fullmatch(
        r"[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)", chat_jid
    ):
        raise NativeReadError("NATIVE_INPUT_INVALID")
    if type(limit) is not int or not 1 <= limit <= 10:
        raise NativeReadError("NATIVE_INPUT_INVALID")
    principal = _reader._principal(chat_jid)
    if not principal.content:
        raise NativeReadError("NATIVE_CONTENT_SCOPE_DENIED")

    if cursor is not None:
        page = _reader.page(chat_jid, cursor, limit, metadata_only=False)
        if _reader._principal(chat_jid) != principal:
            raise NativeReadError("NATIVE_ACCESS_REVOKED")
        return {
            **page,
            "version": "native-live-message-page-v1",
            "records": [
                record for record in page["records"] if record["status"] == "CONTENT" and record["envelope"] is not None
            ],
        }

    if not _reader._slot.acquire(blocking=False):
        raise NativeReadError("NATIVE_READ_BUSY")
    db = None
    try:
        db = _reader._db(time.monotonic() + _reader.deadline)
        boundary = db.execute(
            "SELECT COALESCE(MAX(event_seq),0) FROM native_events WHERE stream_id=? AND original_chat_jid=?",
            (_reader.binding["streamId"], chat_jid),
        ).fetchone()[0]
        if _reader._principal(chat_jid) != principal:
            raise NativeReadError("NATIVE_ACCESS_REVOKED")
        boundary_cursor = _reader._cursor(chat_jid, boundary, 0)
        return {
            "version": "native-live-message-page-v1",
            "accountId": _reader.account,
            "chatJid": chat_jid,
            "nativeScope": dict(_reader.binding),
            "previousCursor": None,
            "nextCursor": boundary_cursor,
            "boundarySequence": str(boundary),
            "complete": True,
            "records": [],
        }
    except sqlite3.Error:
        raise NativeReadError("NATIVE_STORAGE_UNAVAILABLE") from None
    finally:
        if db is not None:
            db.close()
        _reader._slot.release()
