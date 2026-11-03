import Link from "next/link";
import {redirect} from "next/navigation";
import {requireChatGPTUser} from "@/app/chatgpt-auth";
import {database} from "@/db/raw";

export const dynamic = "force-dynamic";

type MirrorMessage = {
  logicalMessageId: string;
  originalMessageId: string | null;
  chatJid: string;
  senderJid: string | null;
  direction: string | null;
  messageText: string | null;
  messageType: string;
  sourceTimestamp: string | null;
  identityStatus: string;
  sources: string[];
};

type BridgeStatus = {
  bridgeId: string;
  connectionStatus: string;
  messageAccessStatus: string;
  syncEnabled: boolean;
  activationAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export default async function MessageMirrorPage({
  searchParams,
}: {
  searchParams: Promise<{ bridge?: string }>;
}) {
  const mirrorUser = await requireChatGPTUser("/message-mirror");
  // Admin-only surface (RBAC-2): the mirror exposes raw ingestion evidence.
  if (!(mirrorUser.role === "ADMIN" || mirrorUser.source === "validation" || mirrorUser.superAdmin === true)) redirect("/dashboard");
  const params = await searchParams;
  const bridge = params.bridge && ["wa-01", "wa-02", "wa-03"].includes(params.bridge)
    ? params.bridge
    : null;
  const db = database();

  const result = await Promise.all([
      db.all<BridgeStatus>(
        `SELECT bridge_id AS "bridgeId", connection_status AS "connectionStatus",
          message_access_status AS "messageAccessStatus", sync_enabled AS "syncEnabled",
          activation_at::text AS "activationAt", last_sync_at::text AS "lastSyncAt",
          last_error AS "lastError"
         FROM whatsapp_mirror.bridges ORDER BY bridge_id`,
      ),
      db.all<MirrorMessage>(
        `SELECT m.logical_message_id::text AS "logicalMessageId",
          m.original_message_id AS "originalMessageId", m.chat_jid AS "chatJid",
          m.sender_jid AS "senderJid", m.direction, m.message_text AS "messageText",
          m.message_type AS "messageType", m.source_timestamp::text AS "sourceTimestamp",
          m.identity_status AS "identityStatus",
          COALESCE(array_agg(DISTINCT s.bridge_id ORDER BY s.bridge_id)
            FILTER (WHERE s.bridge_id IS NOT NULL), ARRAY[]::text[]) AS sources
         FROM whatsapp_mirror.messages m
         LEFT JOIN whatsapp_mirror.message_sources s
           ON s.logical_message_id = m.logical_message_id
         WHERE ($1::text IS NULL OR EXISTS (
           SELECT 1 FROM whatsapp_mirror.message_sources f
           WHERE f.logical_message_id = m.logical_message_id AND f.bridge_id = $1
         ))
         GROUP BY m.logical_message_id
         ORDER BY m.source_timestamp DESC NULLS LAST, m.logical_message_id DESC
         LIMIT 100`,
        [bridge],
      ),
  ]).then(
    ([bridges, messages]) => ({ok: true as const, bridges, messages}),
    (error: unknown) => ({ok: false as const, error}),
  );

  if (!result.ok) {
    console.error("WhatsApp Message Mirror query failed.", result.error);
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
         <Link className="text-sm underline" href="/">← Workspace</Link>
         <h1 className="my-5 text-2xl font-bold">WhatsApp Message Mirror</h1>
         <p role="alert">The Message Mirror database is not available. No source messages were changed.</p>
      </main>
    );
  }

  const {bridges, messages} = result;
  return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
         <div className="mx-auto max-w-6xl">
           <Link className="text-sm text-slate-600 underline" href="/">← Workspace</Link>
          <header className="my-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">AL-RIFA’I</p>
            <h1 className="mt-1 text-3xl font-bold">WhatsApp Message Mirror</h1>
            <p className="mt-2 text-slate-600">Read-only view of newly mirrored source messages.</p>
          </header>

          <section aria-label="Bridge synchronization status" className="grid gap-3 sm:grid-cols-3">
            {bridges.results.map((item) => (
              <article className="rounded-lg border bg-white p-4" key={item.bridgeId}>
                <h2 className="font-semibold">{item.bridgeId.toUpperCase()}</h2>
                <p className="mt-2 text-sm">Connection: {item.connectionStatus}</p>
                <p className="text-sm">Message access: {item.messageAccessStatus}</p>
                <p className="text-sm">Live sync: {item.syncEnabled ? "Enabled" : "Disabled"}</p>
                <p className="text-sm">Last sync: {item.lastSyncAt ?? "Not yet synced"}</p>
                {item.lastError && <p className="mt-2 text-sm text-red-700">Status: {item.lastError}</p>}
              </article>
            ))}
          </section>

          <nav aria-label="Filter by source bridge" className="my-5 flex flex-wrap gap-3 text-sm">
            <Link className={!bridge ? "font-bold underline" : "underline"} href="/message-mirror">All</Link>
            {["wa-01", "wa-02", "wa-03"].map((id) => (
              <Link
                className={bridge === id ? "font-bold underline" : "underline"}
                href={`/message-mirror?bridge=${id}`}
                key={id}
              >
                {id.toUpperCase()}
              </Link>
            ))}
          </nav>

          <section aria-label="Mirrored messages" className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Sender / chat</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Sources</th>
                  <th className="p-3">Identity</th>
                </tr>
              </thead>
              <tbody>
                {messages.results.map((message) => (
                  <tr className="border-t align-top" key={message.logicalMessageId}>
                    <td className="whitespace-nowrap p-3">{message.sourceTimestamp ?? "—"}</td>
                    <td className="p-3">
                      <div>{message.senderJid ?? "Unknown sender"}</div>
                      <div className="text-xs text-slate-500">{message.chatJid}</div>
                    </td>
                    <td className="max-w-xl whitespace-pre-wrap break-words p-3">
                      {message.messageText ?? `[${message.messageType}]`}
                    </td>
                    <td className="p-3">{message.sources.join(", ") || "Unresolved source"}</td>
                    <td className="p-3">{message.identityStatus}</td>
                  </tr>
                ))}
                {!messages.results.length && (
                  <tr><td className="p-4 text-slate-500" colSpan={5}>No mirrored messages.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </main>
  );
}
