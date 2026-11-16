import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {routeMirroredMessage} from "../lib/whatsapp-archive.ts";
import {CASH_SCOPE_CHAT, CASH_SCOPE_OWNER} from "../lib/cash-scope.ts";
import {OWNER_ESCORT_CLIENTS} from "../lib/escort-register.mjs";
import {Pool} from "pg";
import {fileURLToPath} from "node:url";
import {createMirrorWorkerDbPool} from "../scripts/ingestion-db.ts";
import {
  applyMirrorMigration,
  assertEvidenceOnlySql,
  canonicalMessageIdentity,
  createEvidenceOnlyPool,
  ensureActivationCheckpoint,
  messageNameFields,
  mirrorBridgeMayReadMessages,
  parseNativeCursor,
  persistPage,
  savedContactNameFromContact,
  validateEvidenceOnlyConfig,
  validatePage,
  verifyMirrorMigration,
} from "../scripts/message-mirror-worker.ts";

const chatJid = "120363000000000001@g.us";
const senderJid = "8801000000001@s.whatsapp.net";
const stream01 = "12345678-1234-1234-1234-123456789abc";
const stream02 = "87654321-4321-4321-4321-cba987654321";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const chatHash = hash(chatJid).slice(0, 24);
const cursor = (stream, sequence) => `n1:${stream}:${chatHash}:${sequence}:0`;

const testDatabaseUrl = process.env.MIRROR_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const testDatabase = new URL(testDatabaseUrl);
  const databaseName = decodeURIComponent(testDatabase.pathname.slice(1));
  if (testDatabase.hostname !== "mirror-test-db" || !databaseName.startsWith("alrifai_mirror_test_")) {
    throw new Error("MIRROR_TEST_DATABASE_URL must target mirror-test-db/alrifai_mirror_test_* on an isolated test network.");
  }
}

function envelope(accountId, nativeMessageId, text, media = []) {
  return {
    version: "native-message-envelope-v1",
    provider: "WHATSAPP",
    accountId,
    nativeMessageId,
    chatJid,
    chatType: "group",
    senderJid,
    senderPhone: null,
    senderLid: null,
    direction: "INCOMING",
    sourceTimestamp: "2026-10-25T00:00:00.000Z",
    eventType: media.length ? "MEDIA" : "TEXT",
    payload: {text, sha256: hash(text), reference: `native:${accountId}:${nativeMessageId}`},
    media,
  };
}

function pages(bridgeId, streamId, previous, sequence, nativeMessageId, text, media = []) {
  const eventKey = hash(`${bridgeId}:${sequence}:${nativeMessageId}`);
  const item = {
    sequence: String(sequence),
    eventKey,
    chatJid,
    senderJid,
    messageId: nativeMessageId,
    sourceTime: "2026-10-25T00:00:00.000Z",
    kind: "message",
    status: "CONTENT",
  };
  const nextCursor = cursor(streamId, sequence);
  return {
    events: {
      accountId: bridgeId,
      chatJid,
      previousCursor: previous,
      nextCursor,
      complete: true,
      records: [item],
    },
    content: {
      accountId: bridgeId,
      chatJid,
      previousCursor: previous,
      nextCursor,
      complete: true,
      records: [{
        sequence: String(sequence),
        status: "CONTENT",
        envelope: envelope(bridgeId, nativeMessageId, text, media),
      }],
    },
  };
}

test("native cursors are scoped to the source stream and chat", () => {
  assert.deepEqual(parseNativeCursor(cursor(stream01, 14), stream01, chatJid), {
    sequence: 14n,
    through: 0n,
  });
  assert.throws(() => parseNativeCursor(cursor(stream01, 14), stream02, chatJid), /MIRROR_CURSOR_SCOPE_INVALID/);
  assert.throws(() => parseNativeCursor(cursor(stream01, 14), stream01, "120363000000000002@g.us"), /MIRROR_CURSOR_SCOPE_INVALID/);
});

test("evidence-only mode is disabled by default and rejects invalid startup configuration", () => {
  assert.equal(validateEvidenceOnlyConfig(undefined, undefined), false);
  assert.equal(validateEvidenceOnlyConfig("0", "EVIDENCE_ONLY"), false);
  assert.equal(validateEvidenceOnlyConfig("1", "EVIDENCE_ONLY"), true);
  assert.throws(() => validateEvidenceOnlyConfig("1", undefined), /MIRROR_MODE_REQUIRED/);
  assert.throws(() => validateEvidenceOnlyConfig("1", "LIVE"), /MIRROR_MODE_INVALID/);
  assert.throws(() => validateEvidenceOnlyConfig("true", "EVIDENCE_ONLY"), /MIRROR_ENABLE_FLAG_INVALID/);
  assert.equal(mirrorBridgeMayReadMessages("wa-02"), false);
});

test("dedicated worker database pool fails closed without its own credential path", () => {
  const priorPath = process.env.ALRIFAI_MIRROR_WORKER_PASSWORD_FILE;
  delete process.env.ALRIFAI_MIRROR_WORKER_PASSWORD_FILE;
  try {
    assert.throws(
      () => createMirrorWorkerDbPool(),
      /Dedicated Mirror Worker password file is required/,
    );
  } finally {
    if (priorPath !== undefined) process.env.ALRIFAI_MIRROR_WORKER_PASSWORD_FILE = priorPath;
  }
});

test("worker startup is disabled by default and validates mode before starting services", () => {
  const workerPath = fileURLToPath(new URL("../scripts/message-mirror-worker.ts", import.meta.url));
  const disabled = spawnSync(process.execPath, ["--experimental-strip-types", workerPath], {
    encoding: "utf8",
    env: {PATH: process.env.PATH ?? ""},
  });
  assert.equal(disabled.status, 0, disabled.stderr);
  assert.match(disabled.stdout, /Message Mirror worker disabled/);

  const invalidMode = spawnSync(process.execPath, ["--experimental-strip-types", workerPath], {
    encoding: "utf8",
    env: {PATH: process.env.PATH ?? "", ALRIFAI_MESSAGE_MIRROR_ENABLED: "1"},
  });
  assert.equal(invalidMode.status, 1);
  assert.match(invalidMode.stderr, /MIRROR_MODE_REQUIRED/);
});

test("evidence-only SQL guard permits only Mirror evidence and checkpoint writes", async () => {
  const forwarded = [];
  const client = {
    async query(sql) {
      forwarded.push(sql);
      return {rows: [], rowCount: 0};
    },
    release() {},
  };
  const guarded = createEvidenceOnlyPool({
    async query(sql) {
      forwarded.push(sql);
      return {rows: [], rowCount: 0};
    },
    async connect() {
      return client;
    },
  });
  for (const table of [
    "whatsapp_mirror.messages",
    "whatsapp_mirror.message_sources",
    "whatsapp_mirror.message_events",
    "whatsapp_mirror.sync_checkpoints",
  ]) {
    assertEvidenceOnlySql(`INSERT INTO ${table} (id) VALUES (1)`);
    await guarded.query(`INSERT INTO ${table} (id) VALUES (1)`);
  }
  for (const sql of [
    "INSERT INTO public.whatsapp_messages_original (id) VALUES (1)",
    "INSERT INTO public.whatsapp_messages_processing (id) VALUES (1)",
    "INSERT INTO public.cash_business_records (id) VALUES (1)",
    "INSERT INTO public.escort_order_register (id) VALUES (1)",
    "UPDATE whatsapp_mirror.bridges SET sync_enabled = true",
    "DELETE FROM whatsapp_mirror.messages",
    "CREATE TABLE public.unexpected_table (id INTEGER)",
  ]) {
    await assert.rejects(guarded.query(sql), /MIRROR_WRITE_SCOPE_DENIED/);
  }
  assert.equal(forwarded.length, 4);
});

test("only matching WhatsApp group protocol identity deduplicates", () => {
  const source = {chatJid, messageId: "protocol-id-1", senderJid};
  const first = canonicalMessageIdentity(source, envelope("wa-01", "protocol-id-1", "same text"));
  const second = canonicalMessageIdentity(source, envelope("wa-02", "protocol-id-1", "same text"));
  const differentId = canonicalMessageIdentity(
    {...source, messageId: "protocol-id-2"},
    envelope("wa-02", "protocol-id-2", "same text"),
  );
  assert.equal(first.identityStatus, "VERIFIED");
  assert.equal(first.canonicalIdentity, second.canonicalIdentity);
  assert.notEqual(first.canonicalIdentity, differentId.canonicalIdentity);
  const mismatchedSource = canonicalMessageIdentity(
    {...source, chatJid: "8801000000002@s.whatsapp.net"},
    envelope("wa-01", "protocol-id-1", "same text"),
  );
  assert.equal(mismatchedSource.canonicalIdentity, null);
  assert.equal(mismatchedSource.identityStatus, "UNRESOLVED");
  const direct = canonicalMessageIdentity(
    {chatJid: "8801000000003@s.whatsapp.net", messageId: "direct-id", senderJid},
    {chatJid: "8801000000003@s.whatsapp.net", nativeMessageId: "direct-id", senderJid},
  );
  assert.equal(direct.canonicalIdentity, null);
  assert.equal(direct.identityStatus, "UNRESOLVED");
});

test("saved contact name is distinct from push name and bound to the sender JID", () => {
  const contact = {jid: senderJid, saved_contact_name: "Saved contact", display_name: "Push name"};
  assert.equal(savedContactNameFromContact(contact, senderJid), "Saved contact");
  assert.equal(savedContactNameFromContact({jid: senderJid, display_name: "Push name"}, senderJid), null);
  assert.equal(savedContactNameFromContact({...contact, jid: "8801000000002@s.whatsapp.net"}, senderJid), null);

  assert.deepEqual(messageNameFields({senderPushName: "Source push name"}, null), {
    savedContactName: null,
    senderName: "Source push name",
    senderNameSource: "SOURCE_PUSH_NAME",
  });
  assert.deepEqual(messageNameFields({senderPushName: "Source push name"}, "Saved contact"), {
    savedContactName: "Saved contact",
    senderName: "Saved contact",
    senderNameSource: "SOURCE_CONTACT",
  });
});

test("Mirror domain routing creates only eligible WA-01 pending work", async () => {
  const routed = [];
  const makeClient = ({duplicate = false, contacts = []} = {}) => ({
    async query(sql, values = []) {
      if (sql.includes("INSERT INTO public.whatsapp_messages_original")) {
        return {rows: duplicate ? [] : [{id: 41}]};
      }
      if (sql.includes("to_regclass('public.escort_client_contacts')")) {
        return {rows: [{
          escort_contacts: contacts.length > 0,
          whatsapp_contacts: false,
          group_authorizations: false,
        }]};
      }
      if (sql.includes("SELECT id,account_id,phone,active FROM public.escort_client_contacts")) {
        return {rows: contacts};
      }
      if (sql.includes("INSERT INTO public.whatsapp_messages_processing")) {
        routed.push({sql, values});
        return {rows: []};
      }
      throw new Error("Unexpected Mirror route query.");
    },
  });
  const message = (overrides = {}) => ({
    accountId: "wa-01",
    chatJid: CASH_SCOPE_CHAT,
    messageId: "mirror-message",
    senderJid: CASH_SCOPE_OWNER,
    senderPhone: "8801880446111",
    senderPushName: "Transport name",
    receiverJid: CASH_SCOPE_CHAT,
    receiverPhone: "8801844836824",
    contactName: null,
    groupName: null,
    sourceTimestamp: "2026-10-25T00:00:00.000Z",
    direction: "OUTGOING",
    messageType: "TEXT",
    text: "Synthetic route fixture",
    mediaRef: null,
    rawContent: {provider: "whatsapp-mcp", tool: "native-live-message-mirror"},
    ...overrides,
  });

  assert.equal(await routeMirroredMessage(makeClient(), message()), true);
  assert.equal(routed.length, 1);
  assert.equal(routed[0].values[1], "cash");

  routed.length = 0;
  const vesselContact = OWNER_ESCORT_CLIENTS[0];
  const vesselChat = `${vesselContact.phone.replace(/^\+/, "")}@s.whatsapp.net`;
  assert.equal(await routeMirroredMessage(makeClient({
    contacts: [{
      id: vesselContact.id,
      account_id: "wa-01",
      phone: vesselContact.phone,
      active: true,
    }],
  }), message({
    chatJid: vesselChat,
    messageId: "mirror-vessel-message",
    senderJid: vesselChat,
    senderPhone: vesselContact.phone.replace(/^\+/, ""),
    direction: "INCOMING",
    receiverJid: "8801880446111@s.whatsapp.net",
  })), true);
  assert.equal(routed.length, 1);
  assert.equal(routed[0].values[1], "vessel");

  routed.length = 0;
  assert.equal(await routeMirroredMessage(makeClient({duplicate: true}), message()), false);
  assert.equal(routed.length, 0);
  await assert.rejects(
    routeMirroredMessage(makeClient(), message({accountId: "wa-02"})),
    /Mirror domain-routing source is invalid/,
  );
});

test("native page validation rejects wrong cursor scope and out-of-order events", () => {
  const page = pages("wa-01", stream01, cursor(stream01, 10), 11, "message-11", "test");
  const valid = {
    version: "native-read-page-v1",
    nativeScope: {accountId: "wa-01"},
    ...page.events,
  };
  assert.equal(
    validatePage(valid, "wa-01", chatJid, stream01, cursor(stream01, 10), "native-read-page-v1", false)
      .records[0].sequence,
    "11",
  );
  assert.throws(
    () => validatePage(valid, "wa-02", chatJid, stream01, cursor(stream01, 10), "native-read-page-v1", false),
    /MIRROR_PAGE_SCOPE_INVALID/,
  );
  assert.throws(
    () => validatePage(
      {...valid, records: [{...valid.records[0], sequence: "10"}]},
      "wa-01", chatJid, stream01, cursor(stream01, 10), "native-read-page-v1", false,
    ),
    /MIRROR_EVENT_IDENTITY_INVALID/,
  );
});

test("disposable PostgreSQL migration, activation, deduplication, retry and restart", {
  skip: !testDatabaseUrl,
}, async () => {
  const admin = new Pool({connectionString: testDatabaseUrl});
  try {
    await admin.query("DROP SCHEMA IF EXISTS whatsapp_mirror CASCADE");
    await admin.query("CREATE TABLE public.whatsapp_messages_original (id INTEGER PRIMARY KEY)");
    await admin.query("INSERT INTO public.whatsapp_messages_original (id) VALUES (1)");
    await admin.query("CREATE TABLE public.whatsapp_messages_processing (id INTEGER PRIMARY KEY)");
    await admin.query("INSERT INTO public.whatsapp_messages_processing (id) VALUES (1)");
    await admin.query("CREATE TABLE public.cash_business_records (id INTEGER PRIMARY KEY)");
    await admin.query("INSERT INTO public.cash_business_records (id) VALUES (1)");
    await admin.query("CREATE TABLE public.escort_order_register (id INTEGER PRIMARY KEY)");
    await admin.query("INSERT INTO public.escort_order_register (id) VALUES (1)");
    await applyMirrorMigration(admin);
    const evidenceDb = createEvidenceOnlyPool(admin);
    await verifyMirrorMigration(evidenceDb);
    const legacyCounts = async () => (await admin.query(
      `SELECT
         (SELECT count(*)::int FROM public.whatsapp_messages_original) AS originals,
         (SELECT count(*)::int FROM public.whatsapp_messages_processing) AS processing,
         (SELECT count(*)::int FROM public.cash_business_records) AS cash_records,
         (SELECT count(*)::int FROM public.escort_order_register) AS vessel_records`,
    )).rows[0];
    const legacyCountsBefore = await legacyCounts();
    const initial = await admin.query(
      "SELECT bridge_id, connection_status, message_access_status, sync_enabled FROM whatsapp_mirror.bridges ORDER BY bridge_id",
    );
    assert.deepEqual(initial.rows.map((row) => row.bridge_id), ["wa-01", "wa-02", "wa-03"]);
    assert.equal(initial.rows.find((row) => row.bridge_id === "wa-03").connection_status, "READY_FOR_CONNECTION");

    const boundary = (bridgeId, streamId, sequence) => ({
      callTool: async (name, args) => {
        assert.equal(name, "list_native_messages");
        assert.equal(args.chat_jid, chatJid);
        assert.equal(args.cursor, undefined);
        return {
          version: "native-live-message-page-v1",
          accountId: bridgeId,
          chatJid,
          nativeScope: {accountId: bridgeId, streamId, pairedJid: senderJid, pairedLid: "8801000000002@lid"},
          previousCursor: null,
          nextCursor: cursor(streamId, sequence),
          boundarySequence: String(sequence),
          complete: true,
          records: [],
        };
      },
    });
    const activation01 = await ensureActivationCheckpoint(evidenceDb, boundary("wa-01", stream01, 10), "wa-01", chatJid, {
      accountId: "wa-01", streamId: stream01, pairedJid: senderJid, pairedLid: "8801000000002@lid",
    });
    const activation02 = await ensureActivationCheckpoint(evidenceDb, boundary("wa-02", stream02, 20), "wa-02", chatJid, {
      accountId: "wa-02", streamId: stream02, pairedJid: senderJid, pairedLid: "8801000000002@lid",
    });
    assert.equal(activation01.cursor, cursor(stream01, 10));
    assert.equal(activation02.cursor, cursor(stream02, 20));
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM whatsapp_mirror.messages")).rows[0].n, 0);
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM whatsapp_mirror.message_sources")).rows[0].n, 0);

    let pair = pages("wa-01", stream01, activation01.cursor, 11, "shared-group-message", "same text");
    await persistPage(evidenceDb, "wa-01", activation01.cursor, pair.events, pair.content,
      new Map([[senderJid, "Saved contact"]]));
    const afterFirstPage = await admin.query(
      `SELECT
         (SELECT count(*)::int FROM whatsapp_mirror.messages) AS messages,
         (SELECT count(*)::int FROM whatsapp_mirror.message_sources) AS sources,
         (SELECT count(*)::int FROM whatsapp_mirror.message_events) AS events`,
    );
    await assert.rejects(
      persistPage(evidenceDb, "wa-01", activation01.cursor, pair.events, pair.content),
      /MIRROR_CHECKPOINT_STALE/,
    );
    const afterReplay = await admin.query(
      `SELECT
         (SELECT count(*)::int FROM whatsapp_mirror.messages) AS messages,
         (SELECT count(*)::int FROM whatsapp_mirror.message_sources) AS sources,
         (SELECT count(*)::int FROM whatsapp_mirror.message_events) AS events`,
    );
    assert.deepEqual(afterReplay.rows[0], afterFirstPage.rows[0]);
    pair = pages("wa-02", stream02, activation02.cursor, 21, "shared-group-message", "same text");
    await persistPage(evidenceDb, "wa-02", activation02.cursor, pair.events, pair.content);

    const dedup = await admin.query(
      `SELECT m.logical_message_id, count(*)::int AS messages,
        (SELECT count(*)::int FROM whatsapp_mirror.message_sources s
         WHERE s.logical_message_id = m.logical_message_id) AS sources
       FROM whatsapp_mirror.messages m
       WHERE m.original_message_id = 'shared-group-message'
       GROUP BY m.logical_message_id`,
    );
    assert.equal(dedup.rows.length, 1);
    assert.equal(dedup.rows[0].sources, 2);
    const sourceEvidence = await admin.query(
      `SELECT bridge_id, original_message_id, source_sequence::text AS source_sequence
       FROM whatsapp_mirror.message_sources
       WHERE original_message_id = 'shared-group-message'
       ORDER BY bridge_id`,
    );
    assert.deepEqual(sourceEvidence.rows, [
      {bridge_id: "wa-01", original_message_id: "shared-group-message", source_sequence: "11"},
      {bridge_id: "wa-02", original_message_id: "shared-group-message", source_sequence: "21"},
    ]);
    assert.equal((await admin.query(
      "SELECT count(*)::int AS n FROM whatsapp_mirror.message_events WHERE logical_message_id = $1",
      [dedup.rows[0].logical_message_id],
    )).rows[0].n, 2);
    const storedName = await admin.query(
      `SELECT saved_contact_name, sender_name, sender_name_source
       FROM whatsapp_mirror.messages WHERE original_message_id = 'shared-group-message'`,
    );
    assert.deepEqual(storedName.rows[0], {
      saved_contact_name: "Saved contact",
      sender_name: "Saved contact",
      sender_name_source: "SOURCE_CONTACT",
    });

    const different = pages("wa-01", stream01, cursor(stream01, 11), 12, "different-group-message", "same text");
    different.content.records[0].envelope.senderPushName = "Source push name";
    await persistPage(evidenceDb, "wa-01", cursor(stream01, 11), different.events, different.content);
    const pushName = await admin.query(
      `SELECT saved_contact_name, sender_name, sender_name_source
       FROM whatsapp_mirror.messages WHERE original_message_id = 'different-group-message'`,
    );
    assert.deepEqual(pushName.rows[0], {
      saved_contact_name: null,
      sender_name: "Source push name",
      sender_name_source: "SOURCE_PUSH_NAME",
    });
    const distinctCount = await admin.query(
      `SELECT count(*)::int AS n FROM whatsapp_mirror.messages
       WHERE message_text = 'same text'`,
    );
    assert.equal(distinctCount.rows[0].n, 2);

    const media = [{
      id: "media-id-1", kind: "IMAGE", available: false, evidenceRef: null,
      mimeType: "image/jpeg", filename: "photo.jpg", size: 123,
    }];
    const mediaPage = pages("wa-01", stream01, cursor(stream01, 12), 13, "media-message", "", media);
    await persistPage(evidenceDb, "wa-01", cursor(stream01, 12), mediaPage.events, mediaPage.content);
    const storedMedia = await admin.query(
      "SELECT media_metadata FROM whatsapp_mirror.messages WHERE original_message_id = 'media-message'",
    );
    assert.equal(storedMedia.rows[0].media_metadata[0].mimeType, "image/jpeg");

    const failed = pages("wa-01", stream01, cursor(stream01, 13), 14, "retry-message", "retry text");
    const failedEventKey = failed.events.records[0].eventKey;
    await admin.query(
      `CREATE FUNCTION whatsapp_mirror.reject_test_event() RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.source_event_id = '${failedEventKey}' THEN RAISE EXCEPTION 'synthetic test failure'; END IF;
         RETURN NEW;
       END $$`,
    );
    await admin.query(
      `CREATE TRIGGER reject_test_event BEFORE INSERT ON whatsapp_mirror.message_sources
       FOR EACH ROW EXECUTE FUNCTION whatsapp_mirror.reject_test_event()`,
    );
    await assert.rejects(persistPage(evidenceDb, "wa-01", cursor(stream01, 13), failed.events, failed.content));
    const rolledBack = await admin.query(
      `SELECT last_committed_cursor FROM whatsapp_mirror.sync_checkpoints
       WHERE bridge_id = 'wa-01' AND chat_jid = $1`,
      [chatJid],
    );
    assert.equal(rolledBack.rows[0].last_committed_cursor, cursor(stream01, 13));
    await admin.query("DROP TRIGGER reject_test_event ON whatsapp_mirror.message_sources");
    await admin.query("DROP FUNCTION whatsapp_mirror.reject_test_event()");
    await persistPage(evidenceDb, "wa-01", cursor(stream01, 13), failed.events, failed.content);

    const checkpoint = await admin.query(
      `SELECT activation_cursor, last_committed_cursor, retry_count
       FROM whatsapp_mirror.sync_checkpoints
       WHERE bridge_id = 'wa-01' AND chat_jid = $1`,
      [chatJid],
    );
    assert.equal(checkpoint.rows[0].activation_cursor, cursor(stream01, 10));
    assert.equal(checkpoint.rows[0].last_committed_cursor, cursor(stream01, 14));
    assert.equal(checkpoint.rows[0].retry_count, 0);
    assert.equal((await admin.query(
      "SELECT count(*)::int AS n FROM whatsapp_mirror.message_sources WHERE source_event_id = $1",
      [failedEventKey],
    )).rows[0].n, 1);

    const restartedPool = new Pool({connectionString: testDatabaseUrl});
    const restarted = createEvidenceOnlyPool(restartedPool);
    try {
      const saved = await restarted.query(
        `SELECT last_committed_cursor FROM whatsapp_mirror.sync_checkpoints
         WHERE bridge_id = 'wa-01' AND chat_jid = $1`,
        [chatJid],
      );
      assert.equal(saved.rows[0].last_committed_cursor, cursor(stream01, 14));
      const recovered = pages("wa-01", stream01, cursor(stream01, 14), 15, "after-restart", "recovered");
      await persistPage(restarted, "wa-01", cursor(stream01, 14), recovered.events, recovered.content);
      assert.equal((await restarted.query(
        "SELECT count(*)::int AS n FROM whatsapp_mirror.messages WHERE original_message_id = 'after-restart'",
      )).rows[0].n, 1);
    } finally {
      await restartedPool.end();
    }

    assert.deepEqual(await legacyCounts(), legacyCountsBefore);
    assert.deepEqual(
      (await admin.query(
        "SELECT bridge_id, connection_status, message_access_status, sync_enabled FROM whatsapp_mirror.bridges ORDER BY bridge_id",
      )).rows,
      initial.rows,
    );
  } finally {
    await admin.query("DROP SCHEMA IF EXISTS whatsapp_mirror CASCADE");
    await admin.end();
  }
});
