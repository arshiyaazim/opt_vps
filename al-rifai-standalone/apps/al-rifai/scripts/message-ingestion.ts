import {readFileSync} from "node:fs";
import {createConnection, type Socket} from "node:net";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createIngestionDbPool} from "./ingestion-db.ts";

type JsonObject = Record<string, unknown>;
type McpResult = {structuredContent?: unknown; content?: Array<{type?: string; text?: string}>; isError?: boolean};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseArgs(): {account: "wa-01" | "wa-02"; chatJid: string; afterRowid: string; maxMessages: number} {
  const values = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    if (!key?.startsWith("--") || !value || values.has(key)) throw new Error("Invalid command-line arguments.");
    values.set(key, value);
  }
  const account = values.get("--account");
  const chatJid = values.get("--chat-jid");
  const afterRowid = values.get("--after-rowid") ?? "0";
  const maxMessages = Number(values.get("--max-messages") ?? "10");
  if ((account !== "wa-01" && account !== "wa-02")
    || !chatJid || !/^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)$/.test(chatJid)
    || !/^(0|[1-9][0-9]{0,18})$/.test(afterRowid)
    || !Number.isSafeInteger(maxMessages) || maxMessages < 1 || maxMessages > 100) {
    throw new Error("Provide --account wa-01|wa-02, a valid --chat-jid, and a message limit from 1 to 100.");
  }
  return {account, chatJid, afterRowid, maxMessages};
}

function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("MCP returned an invalid object.");
  return value as JsonObject;
}

function resultValue(result: McpResult): unknown {
  if (result.isError) {
    // Keep only a bridge error code (never message content) so callers can
    // distinguish a denied chat scope from an unavailable reader.
    const text = result.content?.find((item) => item.type === "text")?.text ?? "";
    const code = /\b([A-Z][A-Z0-9_]{3,80})\b/.exec(text)?.[1];
    throw new Error(code ?? "WhatsApp MCP request failed.");
  }
  if (result.structuredContent !== undefined) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("WhatsApp MCP returned no structured result.");
  return JSON.parse(text) as unknown;
}

export class McpStdioClient {
  private readonly socket: Socket;
  private readonly pending = new Map<number, {
    resolve(value: JsonObject): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private readonly ready: Promise<void>;
  private buffered = "";
  private nextId = 1;

  constructor(socketPath: string, tokenFile: string) {
    this.socket = createConnection({path: socketPath});
    this.socket.setTimeout(30_000);
    this.ready = new Promise((resolve, reject) => {
      this.socket.once("connect", () => {
        const token = readFileSync(tokenFile, "utf8").trim();
        if (!token) {
          reject(new Error("WhatsApp consumer token file is empty."));
          this.socket.destroy();
          return;
        }
        this.socket.write(`${token}\n`, (error) => {
          if (error) reject(new Error("Could not authenticate to the WhatsApp MCP relay."));
          else resolve();
        });
      });
      this.socket.once("error", () => reject(new Error("Could not connect to the WhatsApp MCP relay.")));
      this.socket.once("close", () => reject(new Error("WhatsApp MCP relay closed before connecting.")));
    });
    this.socket.on("timeout", () => {
      this.failAll(new Error("WhatsApp MCP request timed out."));
      this.socket.destroy();
    });
    this.socket.on("data", (chunk: Buffer) => {
      this.buffered += chunk.toString("utf8");
      if (this.buffered.length > 1_000_000) {
        this.failAll(new Error("WhatsApp MCP response exceeded the protocol limit."));
        this.socket.destroy();
        return;
      }
      let end = this.buffered.indexOf("\n");
      while (end >= 0) {
        const line = this.buffered.slice(0, end);
        this.buffered = this.buffered.slice(end + 1);
        this.handleLine(line);
        end = this.buffered.indexOf("\n");
      }
    });
    this.socket.on("error", () => this.failAll(new Error("WhatsApp MCP connection failed.")));
    this.socket.on("close", () => this.failAll(new Error("WhatsApp MCP connection closed.")));
  }

  private handleLine(line: string): void {
    let message: JsonObject;
    try {
      message = asObject(JSON.parse(line));
    } catch {
      this.failAll(new Error("WhatsApp MCP returned malformed protocol data."));
      return;
    }
    const id = message.id;
    if (typeof id !== "number") return;
    const waiter = this.pending.get(id);
    if (!waiter) return;
    this.pending.delete(id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error("WhatsApp MCP request failed."));
    else {
      try {
        waiter.resolve(asObject(message.result));
      } catch {
        waiter.reject(new Error("WhatsApp MCP returned an invalid protocol result."));
      }
    }
  }

  private failAll(error: Error): void {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
  }

  async request(method: string, params: JsonObject): Promise<JsonObject> {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer=setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("WhatsApp MCP request timed out."));
        this.socket.destroy();
      }, 30_000);
      this.pending.set(id, {resolve, reject, timer});
      this.socket.write(`${JSON.stringify({jsonrpc: "2.0", id, method, params})}\n`, (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(new Error("Could not write to the WhatsApp MCP relay."));
        }
      });
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {name: "al-rifai-message-ingestion", version: "1.0"},
    });
    this.socket.write(`${JSON.stringify({jsonrpc: "2.0", method: "notifications/initialized", params: {}})}\n`);
  }

  async callTool(name: string, args: JsonObject): Promise<unknown> {
    try {
      return resultValue(await this.request("tools/call", {name, arguments: args}) as McpResult);
    } catch (error) {
      const code = error instanceof Error && /^[A-Z][A-Z0-9_]{3,80}$/.test(error.message) ? error.message : null;
      throw new Error(code ?? `WhatsApp MCP tool call failed: ${name}.`);
    }
  }

  async close(): Promise<void> {
    this.socket.end();
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function phoneFromJid(jid: string | null): string | null {
  if (!jid) return null;
  const match = /^([0-9]{1,30})@s\.whatsapp\.net$/.exec(jid);
  return match?.[1] ?? null;
}

function sourceTimestamp(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("Visible source record has no valid timestamp.");
  }
  return new Date(value).toISOString();
}

async function main(): Promise<void> {
  const {account, chatJid, afterRowid, maxMessages} = parseArgs();
  const tokenFile = requiredEnv("WHATSAPP_CONSUMER_TOKEN_FILE");
  const socket = process.env.WHATSAPP_MCP_SOCKET
    ?? `/var/lib/vps/whatsapp/${account}/control/mcp.sock`;
  const client = new McpStdioClient(socket, tokenFile);
  const pool = createIngestionDbPool();
  let stored = 0;
  let scanned = 0;
  let cursor = afterRowid;
  try {
    await client.initialize();
    const available = await client.request("tools/list", {}) as JsonObject;
    const tools = Array.isArray(available.tools) ? available.tools : [];
    if (!tools.some((tool) => asObject(tool).name === "list_archive_messages")) {
      throw new Error("Authenticated WhatsApp MCP does not expose list_archive_messages.");
    }
    const limit = Math.min(10, maxMessages);
    while (scanned < maxMessages) {
      const page = asObject(await client.callTool("list_archive_messages", {
        chat_jid: chatJid,
        after_rowid: cursor,
        limit: Math.min(limit, maxMessages - scanned),
      }));
      if (page.accountId !== account || page.chatJid !== chatJid
        || typeof page.nativeScope !== "object" || page.nativeScope === null || !Array.isArray(page.records)
        || page.previousAfter !== cursor || typeof page.nextAfter !== "string"
        || !/^(0|[1-9][0-9]{0,18})$/.test(page.nextAfter)
        || BigInt(page.nextAfter) < BigInt(cursor)
        || typeof page.complete !== "boolean") {
        throw new Error("WhatsApp MCP archive page scope or cursor is invalid.");
      }
      if (page.complete === false && BigInt(page.nextAfter) <= BigInt(cursor)) {
        throw new Error("WhatsApp MCP archive cursor did not advance.");
      }
      const nativeScope = asObject(page.nativeScope);
      const ownJid = optionalString(nativeScope.pairedJid);
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        for (const rawRecord of page.records) {
          const record = asObject(rawRecord);
          const message = record.message === null ? null : asObject(record.message);
          if (message && (message.accountId !== account || message.chatJid !== chatJid || message.id !== record.messageId)) {
            throw new Error("WhatsApp MCP archive message scope is invalid.");
          }
          if (!message) continue;
          const senderJid = optionalString(message.sender);
          if (message.direction !== "INCOMING" && message.direction !== "OUTGOING") {
            throw new Error("Visible source record has an invalid direction.");
          }
          const direction = message.direction === "OUTGOING" ? "outgoing" : "incoming";
          const isGroup = chatJid.endsWith("@g.us");
          const receiverJid = isGroup ? null : direction === "outgoing" ? chatJid : ownJid;
          const messageType = optionalString(message.messageType);
          const text = messageType === "text" && typeof message.text === "string" ? message.text : null;
          const media = message.media === null ? null : asObject(message.media);
          const sourcePayload = JSON.stringify(record);
          const inserted = await db.query(
            `INSERT INTO public.whatsapp_messages_original
             (wa_account,chat_jid,chat_type,message_id,direction,sender_jid,sender_phone,
              sender_push_name,receiver_jid,receiver_phone,group_name,"timestamp",message_type,
              raw_content,text_content,media_ref)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13,$14::jsonb,$15,$16)
             ON CONFLICT (wa_account,chat_jid,message_id) DO NOTHING
             RETURNING id`,
            [
              account, chatJid, isGroup ? "group" : "individual", String(record.messageId), direction,
              senderJid, phoneFromJid(senderJid), optionalString(message.senderPushName ?? message.pushName),
              receiverJid, phoneFromJid(receiverJid), optionalString(message.groupName ?? message.chatName),
              sourceTimestamp(message.sourceTimestamp), messageType, sourcePayload, text,
              optionalString(media?.storedFileRef),
            ],
          );
          const originalId = inserted.rows?.[0]?.id
            ?? (await db.query(
              `SELECT id FROM public.whatsapp_messages_original
               WHERE wa_account=$1 AND chat_jid=$2 AND message_id=$3`,
              [account, chatJid, String(record.messageId)],
            )).rows?.[0]?.id;
          if (originalId === undefined) throw new Error("Could not resolve the immutable original message row.");
          await db.query(
            `INSERT INTO public.whatsapp_messages_processing (original_id,domain,status)
             VALUES ($1,'archive','pending')
             ON CONFLICT (original_id,domain) DO NOTHING`,
            [originalId],
          );
          stored += inserted.rows?.length ? 1 : 0;
        }
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      } finally {
        db.release();
      }
      cursor = page.nextAfter;
      scanned += page.records.length;
      if (page.complete === true || page.records.length === 0) break;
    }
    console.log(`Scanned ${scanned} archive message(s), stored ${stored} new row(s); next source row is ${cursor}.`);
  } finally {
    await client.close();
    await pool.end();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Message ingestion failed.");
    process.exitCode = 1;
  });
}
