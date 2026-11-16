#!/usr/bin/env python3
"""Read-only extraction of approved WA-01 messages as CSV on stdout.

Runs inside the WA-01 bridge container. The SQLite store is opened read-only
with query_only ON; the file is never copied out of the store and nothing is
written. Only the chat identifiers supplied on the command line are selected.

Output columns match public.wa01_backfill_staging so the CSV can be streamed
straight into PostgreSQL with \\copy (no message body is persisted on the host).

Identity handling:
  * sender_bare prefers the bridge-resolved sender JID, so a participant who is
    addressed by a LID is recorded against the resolved PN when the bridge has
    verified the mapping; the original LID is kept in raw_content.
  * chat_type is individual/group; a group's own identifier is never treated as
    a human sender.

Usage: extract-approved-py <messages.db> <batch-id> <chat_jid> [<chat_jid> ...]
"""

import csv
import json
import sqlite3
import sys

CSV_COLUMNS = [
    "batch_id", "account_id", "chat_jid", "message_id", "direction",
    "sender_bare", "sender_push_name", "sender_phone", "receiver_jid",
    "contact_name", "group_name", "chat_type", "source_time", "message_type",
    "text_content", "media_ref", "raw_content",
]


def bare(jid):
    if not jid:
        return None
    head = str(jid).split("@", 1)[0]
    head = head.split(":", 1)[0]
    return head or None


def main() -> int:
    if len(sys.argv) < 4:
        print("usage: extract-approved.py <messages.db> <batch-id> <chat_jid> ...", file=sys.stderr)
        return 2
    db_path, batch_id, chats = sys.argv[1], sys.argv[2], sys.argv[3:]
    con = sqlite3.connect("file:%s?mode=ro" % db_path, uri=True, timeout=15.0)
    con.execute("PRAGMA query_only = ON")

    names = {}
    for jid, name in con.execute("SELECT jid, name FROM chats"):
        names[jid] = name

    writer = csv.writer(sys.stdout, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)

    total = 0
    for chat in chats:
        group = chat.endswith("@g.us")
        cursor = con.execute(
            """
            SELECT id, sender, content, timestamp, is_from_me, media_type,
                   filename, deleted_at, resolved_sender_jid, identity_state,
                   chat_identity_state, original_sender_jid, group_participant_jid
            FROM messages WHERE chat_jid = ? ORDER BY rowid
            """,
            (chat,),
        )
        for (mid, sender, content, ts, from_me, media_type, filename,
             deleted_at, resolved_sender, identity_state, chat_identity_state,
             original_sender, group_participant) in cursor:
            outgoing = from_me in (1, True)
            direction = "outgoing" if outgoing else "incoming"
            sender_bare = bare(resolved_sender) or bare(sender)
            # Never attribute a group's own identifier to a human sender.
            if group and sender_bare == bare(chat):
                sender_bare = None
            writer.writerow([
                batch_id,
                "wa-01",
                chat,
                str(mid),
                direction,
                sender_bare,
                None,
                None,
                chat if (outgoing and not group) else None,
                None if group else names.get(chat),
                names.get(chat) if group else None,
                "group" if group else "individual",
                ts,
                media_type or ("text" if (content or "").strip() else "system"),
                content,
                filename or None,
                json.dumps({
                    "provider": "wa01-store-backfill",
                    "tool": "sqlite-messages",
                    "messageId": str(mid),
                    "bridgeSender": sender,
                    "resolvedSenderJid": resolved_sender,
                    "originalSenderJid": original_sender,
                    "groupParticipantJid": group_participant,
                    "identityState": identity_state,
                    "chatIdentityState": chat_identity_state,
                    "deletedAt": deleted_at,
                    "mediaType": media_type,
                    "isFromMe": outgoing,
                }, ensure_ascii=False, separators=(",", ":")),
            ])
            total += 1
    con.close()
    print("extracted %d messages" % total, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
