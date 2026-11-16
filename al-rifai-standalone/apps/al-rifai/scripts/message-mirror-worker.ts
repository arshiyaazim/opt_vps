import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createMirrorWorkerDbPool, type IngestionDbPool} from "./ingestion-db.ts";
import {McpStdioClient} from "./message-ingestion.ts";

type JsonObject = Record<string, unknown>;
type BridgeId = "wa-01" | "wa-02" | "wa-03";
type DbPool = Pick<IngestionDbPool, "connect" | "query">;
type SourcePage = {
  accountId: string;
  chatJid: string;
  previousCursor: string | null;
  nextCursor: string;
  complete: boolean;
  records: JsonObject[];
};
type NativeIdentity = {
  accountId: BridgeId;
  streamId: string;
  pairedJid: string;
  pairedLid: string;
};
type CanonicalIdentity = {
  canonicalIdentity: string | null;
  possibleDuplicateIdentity: string | null;
  identityStatus: "VERIFIED" | "UNRESOLVED";
};

const MIGRATION_ID = "0025_whatsapp_message_mirror.sql";
const MIGRATION_PATH = fileURLToPath(new URL(`../db/migrations/${MIGRATION_ID}`, import.meta.url));
const BRIDGES: BridgeId[] = ["wa-01", "wa-02", "wa-03"];
const PAGE_LIMIT = 10;
const PAGES_PER_CYCLE = 5;
const CHAT_PATTERN = /^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)$/;
const STREAM_PATTERN = /^[a-f0-9-]{36}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const EVIDENCE_ONLY_TABLES = new Set([
  "whatsapp_mirror.messages",
  "whatsapp_mirror.message_sources",
  "whatsapp_mirror.message_events",
  "whatsapp_mirror.sync_checkpoints",
]);

class MirrorFault extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function record(value: unknown, code = "MIRROR_SOURCE_INVALID"): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new MirrorFault(code);
  return value as JsonObject;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function name(value: unknown): string | null {
  const result = string(value)?.trim();
  return result || null;
}

function safeTimestamp(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function parseNativeCursor(cursor: string, streamId: string, chatJid: string): {
  sequence: bigint;
  through: bigint;
} {
  const chatDigest = createHash("sha256").update(chatJid).digest("hex").slice(0, 24);
  const pieces = cursor.split(":");
  if (pieces.length !== 5 || pieces[0] !== "n1" || pieces[1] !== streamId || pieces[2] !== chatDigest
    || !/^(0|[1-9][0-9]{0,18})$/.test(pieces[3] ?? "")
    || !/^(0|[1-9][0-9]{0,18})$/.test(pieces[4] ?? "")) {
    throw new MirrorFault("MIRROR_CURSOR_SCOPE_INVALID");
  }
  const sequence = BigInt(pieces[3]!);
  const through = BigInt(pieces[4]!);
  if (sequence > 9223372036854775807n || through > 9223372036854775807n
    || (through !== 0n && sequence > through)) {
    throw new MirrorFault("MIRROR_CURSOR_INVALID");
  }
  return {sequence, through};
}

export function canonicalMessageIdentity(
  sourceRecord: JsonObject,
  envelopeValue: unknown,
): CanonicalIdentity {
  const envelope = typeof envelopeValue === "object" && envelopeValue !== null && !Array.isArray(envelopeValue)
    ? envelopeValue as JsonObject
    : null;
  const chatJid = string(envelope?.chatJid) ?? string(sourceRecord.chatJid);
  const senderJid = string(envelope?.senderJid) ?? string(sourceRecord.senderJid);
  const messageId = string(envelope?.nativeMessageId) ?? string(sourceRecord.messageId);
  const sourceChat = string(sourceRecord.chatJid);
  const sourceSender = string(sourceRecord.senderJid);
  const sourceMessageId = string(sourceRecord.messageId);
  const isGroup = chatJid?.endsWith("@g.us") === true;
  if (isGroup && messageId && senderJid && CHAT_PATTERN.test(chatJid) && CHAT_PATTERN.test(senderJid)) {
    if (sourceChat !== chatJid || sourceSender !== senderJid || sourceMessageId !== messageId) {
      return {
        canonicalIdentity: null,
        possibleDuplicateIdentity: sourceChat && sourceMessageId
          ? digest(["possible-whatsapp-group-duplicate-v1", sourceChat, sourceMessageId])
          : null,
        identityStatus: "UNRESOLVED",
      };
    }
    return {
      canonicalIdentity: digest(["whatsapp-group-message-v1", chatJid, senderJid, messageId]),
      possibleDuplicateIdentity: null,
      identityStatus: "VERIFIED",
    };
  }

  return {
    canonicalIdentity: null,
    possibleDuplicateIdentity: isGroup && sourceChat && sourceMessageId
      ? digest(["possible-whatsapp-group-duplicate-v1", sourceChat, sourceMessageId])
      : null,
    identityStatus: "UNRESOLVED",
  };
}

export function savedContactNameFromContact(value: unknown, expectedJid: string): string | null {
  const contact = record(value);
  if (contact.jid !== expectedJid) return null;
  return name(contact.saved_contact_name);
}

export function messageNameFields(
  envelopeValue: unknown,
  savedContactName: string | null,
): {savedContactName: string | null; senderName: string | null; senderNameSource: string | null} {
  const envelope = record(envelopeValue);
  const savedName = name(savedContactName);
  if (savedName) {
    return {savedContactName: savedName, senderName: savedName, senderNameSource: "SOURCE_CONTACT"};
  }
  const pushName = name(envelope.senderPushName);
  if (pushName) {
    return {savedContactName: null, senderName: pushName, senderNameSource: "SOURCE_PUSH_NAME"};
  }
  return {savedContactName: null, senderName: null, senderNameSource: null};
}

export function mirrorBridgeMayReadMessages(bridgeId: BridgeId): boolean {
  return bridgeId !== "wa-02";
}

export function validateEvidenceOnlyConfig(
  enabled: string | undefined,
  mode: string | undefined,
): boolean {
  if (enabled !== undefined && enabled !== "0" && enabled !== "1") {
    throw new MirrorFault("MIRROR_ENABLE_FLAG_INVALID");
  }
  if (mode !== undefined && mode !== "EVIDENCE_ONLY") {
    throw new MirrorFault("MIRROR_MODE_INVALID");
  }
  if (enabled === "1" && mode !== "EVIDENCE_ONLY") {
    throw new MirrorFault("MIRROR_MODE_REQUIRED");
  }
  return enabled === "1";
}

export function assertEvidenceOnlySql(sql: string): void {
  const statement = sql.trim();
  if (!statement || /;\s*\S/.test(statement)) throw new MirrorFault("MIRROR_WRITE_SCOPE_DENIED");
  const firstToken = /^([A-Za-z]+)/.exec(statement)?.[1]?.toUpperCase();
  if (firstToken === "BEGIN" || firstToken === "COMMIT" || firstToken === "ROLLBACK") {
    if (/^(BEGIN|COMMIT|ROLLBACK)(?:\s+TRANSACTION)?$/i.test(statement)) return;
    throw new MirrorFault("MIRROR_WRITE_SCOPE_DENIED");
  }
  if (firstToken === "SELECT") {
    if (/\bINTO\b|\b(nextval|setval|pg_advisory_[a-z_]+)\s*\(/i.test(statement)) {
      throw new MirrorFault("MIRROR_WRITE_SCOPE_DENIED");
    }
    return;
  }

  let target: string | undefined;
  if (firstToken === "INSERT") {
    target = /^INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\b/i.exec(statement)?.[1];
  } else if (firstToken === "UPDATE") {
    target = /^UPDATE\s+([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\s+SET\b/i.exec(statement)?.[1];
  }
  if (!target || !EVIDENCE_ONLY_TABLES.has(target.toLowerCase())) {
    throw new MirrorFault("MIRROR_WRITE_SCOPE_DENIED");
  }
}

export function createEvidenceOnlyPool(pool: DbPool): DbPool {
  return {
    async query(sql, values) {
      assertEvidenceOnlySql(sql);
      return pool.query(sql, values);
    },
    async connect() {
      const client = await pool.connect();
      return {
        async query(sql, values) {
          assertEvidenceOnlySql(sql);
          return client.query(sql, values);
        },
        release() {
          client.release();
        },
      };
    },
  };
}

function validateIdentity(value: unknown, bridgeId: BridgeId): NativeIdentity {
  const identity = record(value);
  const scope = record(identity.nativeScope);
  if (identity.version !== "native-account-v1" || identity.accountId !== bridgeId
    || identity.evidenceState !== "LIVE_NATIVE" || identity.operationalAuthority !== "NONE"
    || scope.accountId !== bridgeId || typeof scope.streamId !== "string"
    || !STREAM_PATTERN.test(scope.streamId) || typeof scope.pairedJid !== "string"
    || typeof scope.pairedLid !== "string") {
    throw new MirrorFault("MIRROR_LIVE_SOURCE_NOT_VERIFIED");
  }
  return {
    accountId: bridgeId,
    streamId: scope.streamId,
    pairedJid: scope.pairedJid,
    pairedLid: scope.pairedLid,
  };
}

function validateIdentityOnly(value: unknown, bridgeId: BridgeId): void {
  const identity = record(value);
  const scope = record(identity.nativeScope);
  if (identity.version !== "native-account-v1" || identity.accountId !== bridgeId
    || !["LIVE_NATIVE", "PERSISTED_NATIVE"].includes(String(identity.evidenceState))
    || identity.operationalAuthority !== "NONE" || scope.accountId !== bridgeId) {
    throw new MirrorFault("MIRROR_IDENTITY_ONLY_SOURCE_INVALID");
  }
}

export function validatePage(
  value: unknown,
  bridgeId: BridgeId,
  chatJid: string,
  streamId: string,
  expectedCursor: string | null,
  expectedVersion: string,
  requireBinding: boolean,
): SourcePage {
  const page = record(value);
  if (page.version !== expectedVersion || page.accountId !== bridgeId || page.chatJid !== chatJid
    || page.previousCursor !== expectedCursor || typeof page.nextCursor !== "string"
    || typeof page.complete !== "boolean" || !Array.isArray(page.records) || page.records.length > PAGE_LIMIT) {
    throw new MirrorFault("MIRROR_PAGE_SCOPE_INVALID");
  }
  const scope = record(page.nativeScope);
  if (scope.accountId !== bridgeId || (requireBinding && scope.streamId !== streamId)) {
    throw new MirrorFault("MIRROR_PAGE_IDENTITY_MISMATCH");
  }
  const next = parseNativeCursor(page.nextCursor, streamId, chatJid);
  const previous = expectedCursor === null ? null : parseNativeCursor(expectedCursor, streamId, chatJid);
  if (previous && next.sequence < previous.sequence) throw new MirrorFault("MIRROR_CURSOR_REGRESSION");
  if (page.complete && next.through !== 0n) throw new MirrorFault("MIRROR_CURSOR_INCOMPLETE");
  if (!page.complete && (next.through === 0n || page.records.length === 0)) {
    throw new MirrorFault("MIRROR_CURSOR_STALLED");
  }

  let last = previous?.sequence ?? 0n;
  const records = page.records.map((item) => record(item));
  for (const item of records) {
    const sequence = item.sequence;
    if (typeof sequence !== "string" || !/^[1-9][0-9]{0,18}$/.test(sequence)
      || BigInt(sequence) <= last || BigInt(sequence) > next.sequence
      || item.chatJid !== chatJid || typeof item.eventKey !== "string"
      || !HASH_PATTERN.test(item.eventKey)) {
      throw new MirrorFault("MIRROR_EVENT_IDENTITY_INVALID");
    }
    last = BigInt(sequence);
  }
  if (last !== next.sequence && (records.length > 0 || next.sequence !== (previous?.sequence ?? 0n))) {
    throw new MirrorFault("MIRROR_PAGE_PROGRESS_INVALID");
  }
  return {
    accountId: bridgeId,
    chatJid,
    previousCursor: expectedCursor,
    nextCursor: page.nextCursor,
    complete: page.complete,
    records,
  };
}

function parseChatScope(bridgeId: BridgeId): string[] {
  const value = process.env[`ALRIFAI_MESSAGE_MIRROR_CHAT_JIDS_${bridgeId.toUpperCase().replace("-", "")}`];
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new MirrorFault("MIRROR_CHAT_SCOPE_INVALID");
  }
  if (!Array.isArray(parsed) || parsed.length > 200
    || parsed.some((chat) => typeof chat !== "string" || !CHAT_PATTERN.test(chat))
    || new Set(parsed).size !== parsed.length) {
    throw new MirrorFault("MIRROR_CHAT_SCOPE_INVALID");
  }
  return parsed as string[];
}

function sourceConfig(bridgeId: BridgeId): {socket: string; tokenFile: string} | null {
  const suffix = bridgeId.toUpperCase().replace("-", "");
  const socket = process.env[`WHATSAPP_${suffix}_MCP_SOCKET`];
  const tokenFile = process.env[`WHATSAPP_${suffix}_READER_TOKEN_FILE`];
  return socket && tokenFile ? {socket, tokenFile} : null;
}

export async function applyMirrorMigration(pool: DbPool, migrationPath = MIGRATION_PATH): Promise<void> {
  const sql = readFileSync(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(716003)");
    await client.query("CREATE SCHEMA IF NOT EXISTS whatsapp_mirror");
    await client.query(
      `CREATE TABLE IF NOT EXISTS whatsapp_mirror.schema_migrations (
        id text PRIMARY KEY,
        sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
        applied_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    const prior = await client.query(
      "SELECT sha256 FROM whatsapp_mirror.schema_migrations WHERE id = $1",
      [MIGRATION_ID],
    );
    const appliedHash = prior.rows?.[0]?.sha256;
    if (typeof appliedHash === "string") {
      if (appliedHash !== checksum) throw new MirrorFault("MIRROR_MIGRATION_CHECKSUM_MISMATCH");
    } else {
      await client.query(sql);
      await client.query(
        "INSERT INTO whatsapp_mirror.schema_migrations (id, sha256) VALUES ($1, $2)",
        [MIGRATION_ID, checksum],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      throw new MirrorFault("MIRROR_MIGRATION_ROLLBACK_FAILED");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyMirrorMigration(pool: DbPool, migrationPath = MIGRATION_PATH): Promise<void> {
  const sql = readFileSync(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const result = await pool.query(
    "SELECT sha256 FROM whatsapp_mirror.schema_migrations WHERE id = $1",
    [MIGRATION_ID],
  );
  if (result.rows?.[0]?.sha256 !== checksum) throw new MirrorFault("MIRROR_MIGRATION_CHECKSUM_MISMATCH");
}

function validateBoundary(
  value: unknown,
  bridgeId: BridgeId,
  chatJid: string,
  identity: NativeIdentity,
): {cursor: string; sequence: bigint} {
  const page = record(value);
  if (page.version !== "native-live-message-page-v1" || page.accountId !== bridgeId
    || page.chatJid !== chatJid || page.previousCursor !== null
    || page.complete !== true || !Array.isArray(page.records) || page.records.length !== 0
    || typeof page.boundarySequence !== "string"
    || !/^(0|[1-9][0-9]{0,18})$/.test(page.boundarySequence)) {
    throw new MirrorFault("MIRROR_ACTIVATION_BOUNDARY_INVALID");
  }
  const scope = record(page.nativeScope);
  if (scope.accountId !== bridgeId || scope.streamId !== identity.streamId) {
    throw new MirrorFault("MIRROR_PAGE_IDENTITY_MISMATCH");
  }
  const cursor = string(page.nextCursor);
  if (!cursor) throw new MirrorFault("MIRROR_ACTIVATION_BOUNDARY_INVALID");
  const parsed = parseNativeCursor(cursor, identity.streamId, chatJid);
  const sequence = BigInt(page.boundarySequence);
  if (parsed.sequence !== sequence || parsed.through !== 0n) {
    throw new MirrorFault("MIRROR_ACTIVATION_BOUNDARY_INVALID");
  }
  return {cursor, sequence};
}

export async function ensureActivationCheckpoint(
  pool: DbPool,
  client: McpStdioClient,
  bridgeId: BridgeId,
  chatJid: string,
  identity: NativeIdentity,
): Promise<{cursor: string; streamId: string}> {
  const existing = await pool.query(
    `SELECT stream_id AS "streamId", last_committed_cursor AS cursor
     FROM whatsapp_mirror.sync_checkpoints
     WHERE bridge_id = $1 AND chat_jid = $2`,
    [bridgeId, chatJid],
  );
  const row = existing.rows?.[0];
  if (row) {
    if (row.streamId !== identity.streamId || typeof row.cursor !== "string") {
      throw new MirrorFault("MIRROR_STREAM_ID_CHANGED");
    }
    return {cursor: row.cursor, streamId: identity.streamId};
  }

  const boundary = validateBoundary(
    await client.callTool("list_native_messages", {chat_jid: chatJid, limit: PAGE_LIMIT}),
    bridgeId,
    chatJid,
    identity,
  );
  const activationAt = new Date().toISOString();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      `INSERT INTO whatsapp_mirror.sync_checkpoints
       (bridge_id, chat_jid, stream_id, activation_at, activation_cursor,
        activation_boundary_sequence, last_committed_cursor)
       VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $5)
       ON CONFLICT (bridge_id, chat_jid) DO NOTHING`,
      [bridgeId, chatJid, identity.streamId, activationAt, boundary.cursor, boundary.sequence.toString()],
    );
    const check = await db.query(
      `SELECT stream_id AS "streamId", last_committed_cursor AS cursor
       FROM whatsapp_mirror.sync_checkpoints WHERE bridge_id = $1 AND chat_jid = $2 FOR UPDATE`,
      [bridgeId, chatJid],
    );
    const saved = check.rows?.[0];
    if (saved?.streamId !== identity.streamId || saved.cursor !== boundary.cursor) {
      throw new MirrorFault("MIRROR_ACTIVATION_RACE");
    }
    await db.query("COMMIT");
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      throw new MirrorFault("MIRROR_CHECKPOINT_ROLLBACK_FAILED");
    }
    throw error;
  } finally {
    db.release();
  }
  return {cursor: boundary.cursor, streamId: identity.streamId};
}

function mediaMetadata(envelope: JsonObject): JsonObject[] {
  if (!Array.isArray(envelope.media) || envelope.media.length > 10) return [];
  return envelope.media.map((value) => {
    const item = record(value);
    const result: JsonObject = {};
    for (const key of ["id", "kind", "available", "evidenceRef", "mimeType", "filename", "size"]) {
      if (item[key] !== undefined) result[key] = item[key];
    }
    return result;
  });
}

export async function persistPage(
  pool: DbPool,
  bridgeId: BridgeId,
  expectedCursor: string,
  eventPage: SourcePage,
  contentPage: SourcePage,
  savedContactNames: ReadonlyMap<string, string> = new Map(),
): Promise<void> {
  if (eventPage.accountId !== bridgeId || contentPage.accountId !== bridgeId
    || eventPage.chatJid !== contentPage.chatJid || eventPage.nextCursor !== contentPage.nextCursor
    || eventPage.complete !== contentPage.complete) {
    throw new MirrorFault("MIRROR_PAGE_PAIR_MISMATCH");
  }
  const contentBySequence = new Map<string, JsonObject>();
  for (const content of contentPage.records) {
    if (typeof content.sequence !== "string" || contentBySequence.has(content.sequence)) {
      throw new MirrorFault("MIRROR_CONTENT_SEQUENCE_INVALID");
    }
    contentBySequence.set(content.sequence, content);
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const current = await db.query(
      `SELECT last_committed_cursor AS cursor, stream_id AS "streamId"
       FROM whatsapp_mirror.sync_checkpoints
       WHERE bridge_id = $1 AND chat_jid = $2 FOR UPDATE`,
      [bridgeId, eventPage.chatJid],
    );
    const checkpoint = current.rows?.[0];
    if (!checkpoint || checkpoint.cursor !== expectedCursor) throw new MirrorFault("MIRROR_CHECKPOINT_STALE");
    const streamId = checkpoint.streamId;
    if (typeof streamId !== "string") throw new MirrorFault("MIRROR_CHECKPOINT_INVALID");

    for (const sourceEvent of eventPage.records) {
      const sequence = sourceEvent.sequence as string;
      const contentRecord = contentBySequence.get(sequence);
      const envelope = contentRecord ? record(contentRecord.envelope) : null;
      if (contentRecord && (contentRecord.status !== "CONTENT" || envelope?.accountId !== bridgeId
        || envelope.chatJid !== eventPage.chatJid)) {
        throw new MirrorFault("MIRROR_CONTENT_IDENTITY_INVALID");
      }
      const sourceId = string(sourceEvent.eventKey);
      if (!sourceId) throw new MirrorFault("MIRROR_EVENT_IDENTITY_INVALID");
      const sourceTimestamp = safeTimestamp(sourceEvent.sourceTime);
      const eventType = string(sourceEvent.kind)?.toUpperCase() ?? "UNKNOWN";
      const sourceIdentity = canonicalMessageIdentity(sourceEvent, envelope);
      const senderJid = string(envelope?.senderJid);
      const nameFields = envelope
        ? messageNameFields(envelope, senderJid ? savedContactNames.get(senderJid) ?? null : null)
        : null;
      const sourceEvidence = {
        event: sourceEvent,
        envelope,
        contact: nameFields ? {savedContactName: nameFields.savedContactName} : null,
      };
      const insertedSource = await db.query(
        `INSERT INTO whatsapp_mirror.message_sources
         (bridge_id, stream_id, source_event_id, source_sequence, identity_status,
          possible_duplicate_identity, original_chat_jid,
          original_sender_jid, original_message_id, source_timestamp, source_event_ref,
          raw_source_metadata)
         VALUES ($1, $2, $3, $4::bigint, $5, $6, $7, $8, $9, $10::timestamptz, $11, $12::jsonb)
         ON CONFLICT (bridge_id, stream_id, source_event_id) DO NOTHING
         RETURNING source_record_id`,
        [
          bridgeId, streamId, sourceId, sequence, sourceIdentity.identityStatus,
          sourceIdentity.possibleDuplicateIdentity, eventPage.chatJid,
          string(sourceEvent.senderJid), string(sourceEvent.messageId), sourceTimestamp,
          `native:${streamId}:${sequence}`, JSON.stringify(sourceEvidence),
        ],
      );
      const sourceRecordId = insertedSource.rows?.[0]?.source_record_id;
      if (sourceRecordId === undefined) continue;

      let logicalMessageId: unknown = null;
      if (envelope && sourceEvent.kind === "message") {
        const identity = sourceIdentity;
        const payload = record(envelope.payload);
        const text = typeof payload.text === "string" ? payload.text : null;
        const contentHash = createHash("sha256").update(text ?? "").digest("hex");
        const payloadHash = string(payload.sha256);
        if (payloadHash && (!HASH_PATTERN.test(payloadHash) || payloadHash !== contentHash)) {
          throw new MirrorFault("MIRROR_CONTENT_HASH_MISMATCH");
        }
        const media = mediaMetadata(envelope);
        const messageType = string(envelope.eventType) ?? (media.length ? "MEDIA" : "TEXT");
        const insertedMessage = await db.query(
          `INSERT INTO whatsapp_mirror.messages
           (canonical_identity, possible_duplicate_identity, identity_status,
            original_message_id, chat_jid, sender_jid, sender_lid, sender_phone,
            saved_contact_name, sender_name, sender_name_source, chat_type,
            direction, message_text, message_type, media_metadata,
            source_timestamp, content_sha256, processing_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                   $13, $14, $15, $16::jsonb, $17::timestamptz, $18, $19)
           ON CONFLICT (canonical_identity) DO NOTHING
           RETURNING logical_message_id`,
          [
            identity.canonicalIdentity, identity.possibleDuplicateIdentity, identity.identityStatus,
            string(envelope.nativeMessageId), eventPage.chatJid,
            string(envelope.senderJid), string(envelope.senderLid), string(envelope.senderPhone),
            nameFields?.savedContactName ?? null, nameFields?.senderName ?? null,
            nameFields?.senderNameSource ?? null,
            eventPage.chatJid.endsWith("@g.us") ? "GROUP" : "DIRECT",
            string(envelope.direction), text, messageType, JSON.stringify(media),
            safeTimestamp(envelope.sourceTimestamp), contentHash,
            identity.identityStatus === "VERIFIED" ? "RECEIVED" : "UNRESOLVED",
          ],
        );
        logicalMessageId = insertedMessage.rows?.[0]?.logical_message_id;
        if (logicalMessageId === undefined && identity.canonicalIdentity) {
          const existing = await db.query(
            `SELECT logical_message_id, content_sha256, saved_contact_name
             FROM whatsapp_mirror.messages WHERE canonical_identity = $1 FOR UPDATE`,
            [identity.canonicalIdentity],
          );
          const existingMessage = existing.rows?.[0];
          if (!existingMessage) throw new MirrorFault("MIRROR_DEDUP_RESOLUTION_FAILED");
          logicalMessageId = existingMessage.logical_message_id;
          if (existingMessage.content_sha256 !== contentHash) {
            await db.query(
              `UPDATE whatsapp_mirror.messages
               SET identity_status = 'CONFLICT', processing_status = 'CONFLICT',
                   saved_contact_name = COALESCE(saved_contact_name, $2),
                   sender_name = CASE WHEN saved_contact_name IS NULL AND $2 IS NOT NULL
                     THEN $2 ELSE sender_name END,
                   sender_name_source = CASE WHEN saved_contact_name IS NULL AND $2 IS NOT NULL
                     THEN 'SOURCE_CONTACT' ELSE sender_name_source END,
                   last_updated_at = now()
               WHERE logical_message_id = $1`,
              [logicalMessageId, nameFields?.savedContactName ?? null],
            );
          } else if (existingMessage.saved_contact_name === null && nameFields?.savedContactName) {
            await db.query(
              `UPDATE whatsapp_mirror.messages
               SET saved_contact_name = $2, sender_name = $2,
                   sender_name_source = 'SOURCE_CONTACT', last_updated_at = now()
               WHERE logical_message_id = $1`,
              [logicalMessageId, nameFields.savedContactName],
            );
          }
        }
        if (logicalMessageId === undefined || logicalMessageId === null) {
          throw new MirrorFault("MIRROR_MESSAGE_PERSISTENCE_FAILED");
        }
        const linked = await db.query(
          `UPDATE whatsapp_mirror.message_sources
           SET logical_message_id = $2 WHERE source_record_id = $1`,
          [sourceRecordId, logicalMessageId],
        );
        if (linked.rowCount !== 1) throw new MirrorFault("MIRROR_SOURCE_LINK_FAILED");
      }

      await db.query(
        `INSERT INTO whatsapp_mirror.message_events
         (source_record_id, logical_message_id, event_type, event_metadata, occurred_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
         ON CONFLICT (source_record_id) DO NOTHING`,
        [
          sourceRecordId, logicalMessageId, eventType,
          JSON.stringify(sourceEvidence), sourceTimestamp,
        ],
      );
    }

    const advanced = await db.query(
      `UPDATE whatsapp_mirror.sync_checkpoints
       SET last_committed_cursor = $4, retry_count = 0, last_error = NULL,
           last_successful_sync_at = now(), updated_at = now()
       WHERE bridge_id = $1 AND chat_jid = $2 AND last_committed_cursor = $3`,
      [bridgeId, eventPage.chatJid, expectedCursor, eventPage.nextCursor],
    );
    if (advanced.rowCount !== 1) throw new MirrorFault("MIRROR_CHECKPOINT_ADVANCE_FAILED");
    await db.query("COMMIT");
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      throw new MirrorFault("MIRROR_PAGE_ROLLBACK_FAILED");
    }
    throw error;
  } finally {
    db.release();
  }
}

async function recordFailure(
  pool: DbPool,
  bridgeId: BridgeId,
  chatJid: string | null,
  code: string,
): Promise<void> {
  if (!chatJid) return;
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      `UPDATE whatsapp_mirror.sync_checkpoints
       SET retry_count = retry_count + 1, last_error = $3, updated_at = now()
       WHERE bridge_id = $1 AND chat_jid = $2`,
      [bridgeId, chatJid, code],
    );
    await db.query("COMMIT");
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      throw new MirrorFault("MIRROR_FAILURE_RECORD_ROLLBACK_FAILED");
    }
    throw error;
  } finally {
    db.release();
  }
}

function errorCode(error: unknown): string {
  if (error instanceof MirrorFault) return error.code;
  return "MIRROR_SYNC_FAILED";
}

async function syncChat(
  pool: DbPool,
  client: McpStdioClient,
  bridgeId: BridgeId,
  chatJid: string,
  identity: NativeIdentity,
  contactLookupEnabled: boolean,
): Promise<void> {
  const checkpoint = await ensureActivationCheckpoint(pool, client, bridgeId, chatJid, identity);
  let cursor = checkpoint.cursor;
  for (let pageNumber = 0; pageNumber < PAGES_PER_CYCLE; pageNumber += 1) {
    const eventPageValue = await client.callTool("list_native_events", {
      chat_jid: chatJid, cursor, limit: PAGE_LIMIT,
    });
    const contentPageValue = await client.callTool("list_native_messages", {
      chat_jid: chatJid, cursor, limit: PAGE_LIMIT,
    });
    const eventPage = validatePage(
      eventPageValue, bridgeId, chatJid, identity.streamId, cursor,
      "native-read-page-v1", false,
    );
    const contentPage = validatePage(
      contentPageValue, bridgeId, chatJid, identity.streamId, cursor,
      "native-live-message-page-v1", true,
    );
    for (const content of contentPage.records) {
      if (!eventPage.records.some((source) => source.sequence === content.sequence)) {
        throw new MirrorFault("MIRROR_CONTENT_EVENT_NOT_FOUND");
      }
    }
    const savedContactNames = new Map<string, string>();
    if (contactLookupEnabled) {
      const senders = new Set(contentPage.records.map((content) => {
        const envelope = record(content.envelope);
        return string(envelope.senderJid);
      }).filter((sender): sender is string => sender !== null));
      for (const senderJid of senders) {
        try {
          const contact = await client.callTool("get_contact", {identifier: senderJid});
          const savedName = savedContactNameFromContact(contact, senderJid);
          if (savedName) savedContactNames.set(senderJid, savedName);
        } catch {
          console.warn("Message Mirror saved-contact lookup failed; name left unavailable.");
        }
      }
    }
    await persistPage(pool, bridgeId, cursor, eventPage, contentPage, savedContactNames);
    const unchanged = cursor === eventPage.nextCursor;
    cursor = eventPage.nextCursor;
    if (eventPage.complete || unchanged) break;
  }
}

async function syncBridge(pool: DbPool, bridgeId: BridgeId): Promise<void> {
  const chats = parseChatScope(bridgeId);
  if (!chats.length) return;
  const config = sourceConfig(bridgeId);
  if (!config) return;

  const client = new McpStdioClient(config.socket, config.tokenFile);
  try {
    await client.initialize();
    const result = record(await client.request("tools/list", {}));
    const tools = Array.isArray(result.tools) ? result.tools : [];
    const names = new Set(tools.map((tool) => string(record(tool).name)).filter((name): name is string => name !== null));
    if (!names.has("get_native_account_identity")) {
      return;
    }
    if (!mirrorBridgeMayReadMessages(bridgeId)) {
      validateIdentityOnly(await client.callTool("get_native_account_identity", {}), bridgeId);
      return;
    }
    if (!names.has("list_native_events") || !names.has("list_native_messages")) {
      return;
    }
    const identity = validateIdentity(
      await client.callTool("get_native_account_identity", {}),
      bridgeId,
    );
    const contactLookupEnabled = names.has("get_contact");
    for (const chatJid of chats) {
      try {
        await syncChat(pool, client, bridgeId, chatJid, identity, contactLookupEnabled);
      } catch (error) {
        await recordFailure(pool, bridgeId, chatJid, errorCode(error));
      }
    }
  } catch (error) {
    await recordFailure(pool, bridgeId, null, errorCode(error));
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  let basePool: IngestionDbPool | null = null;
  try {
    const enabled = validateEvidenceOnlyConfig(
      process.env.ALRIFAI_MESSAGE_MIRROR_ENABLED,
      process.env.ALRIFAI_MESSAGE_MIRROR_MODE,
    );
    if (process.argv.length > 2) throw new MirrorFault("MIRROR_ARGUMENTS_INVALID");
    if (!enabled) {
      console.log("Message Mirror worker disabled.");
      return;
    }
    basePool = createMirrorWorkerDbPool();
    const pool = createEvidenceOnlyPool(basePool);
    await verifyMirrorMigration(pool);
    let stopping = false;
    process.on("SIGINT", () => { stopping = true; });
    process.on("SIGTERM", () => { stopping = true; });
    while (!stopping) {
      for (const bridgeId of BRIDGES) {
        if (stopping) break;
        try {
          await syncBridge(pool, bridgeId);
        } catch (error) {
          await recordFailure(pool, bridgeId, null, errorCode(error));
        }
      }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  } catch (error) {
    console.error(`Message Mirror worker failed: ${errorCode(error)}.`);
    process.exitCode = 1;
  } finally {
    await basePool?.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
