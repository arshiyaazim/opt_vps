/**
 * D2 — render the WA-01 bridge native-reader profile from the roster.
 *
 * The renderer is READ-ONLY against everything it touches. It never writes the
 * bridge control directory: that directory is `0710` owned by the bridge UID and
 * the app UID (10001) only has group execute, so no in-app writer is possible.
 * Deploy is a separate root-owned step on the host (see below).
 *
 * HOW TO RUN
 * ----------
 * The host has Node 12 and PostgreSQL is not published to the host, so this
 * script runs inside a throwaway container on the backend network. Nothing is
 * installed on the host and nothing is written outside stdout.
 *
 *   docker run --rm \
 *     --network vps-backend \
 *     -v /opt/vps/apps/al-rifai:/app:ro \
 *     -v /var/lib/vps/whatsapp/wa-01/control:/var/lib/vps/whatsapp/wa-01/control:ro \
 *     -v /etc/vps/apps/al-rifai/native:/etc/vps/apps/al-rifai/native:ro \
 *     -v /etc/vps/apps/al-rifai/auth:/etc/vps/apps/al-rifai/auth:ro \
 *     -e PGHOST=vps-infra-postgres-1 \
 *     -e PGDATABASE=alrifai \
 *     -e PGUSER=alrifai_app \
 *     -e PGPASSWORD_FILE=/etc/vps/apps/al-rifai/auth/pg-password \
 *     node:22-bookworm-slim \
 *     node --experimental-strip-types /app/scripts/generate-bridge-profile.ts \
 *     > /tmp/native-reader-profile.json.generated
 *
 * Then diff with scripts/check-profile-drift.ts, and only after Owner approval:
 *
 *   cp /tmp/native-reader-profile.json.generated \
 *      /var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json
 *   chown root:whatsapp-wa-01 /var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json
 *   chmod 440                /var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json
 *   docker restart vps-whatsapp-wa-01-cap4-20261011   # only if chats changed
 *
 * Changing `chats` revokes a running reader (native_profile.py:60 compares the
 * on-disk chats array to the startup snapshot and raises NATIVE_ACCESS_REVOKED),
 * so the deploy step must restart the bridge whenever the chat set changes.
 *
 * WHAT IT DERIVES
 * ---------------
 *   chats        every active channel chat_jid; a DIRECT row's participant_jid
 *                also becomes its own chat entry (alias)
 *   participants GROUP  -> member participant_jids, alphabetical ascending
 *                DIRECT -> [chat_jid] for ESCORT_CLIENT/OWNER roles,
 *                          [owner PN] for ACCOUNTANT role
 *                alias  -> [participant_jid] except ACCOUNTANT -> [owner PN]
 *   epoch        max(roster epoch, current profile epoch) so it never regresses
 *   binding      copied verbatim from the current profile, cross-checked against
 *                the native manifest; a disagreement is a hard error
 *
 * Everything the bridge enforces in native_profile.py is validated before the
 * JSON is emitted, so a bad render fails here instead of failing closed at the
 * bridge and stopping ingestion.
 */
import {readFileSync} from "node:fs";
import pg from "pg";

const EXPECTED_MODE = "live";
const EXPECTED_ACCOUNT = "wa-01";
const EXPECTED_RUNTIME_PATH = "/runtime/store/messages.db";
const MAX_PROFILE_BYTES = 32000;
const MAX_CHATS = 200;
const MAX_MEMBERS = 1000;

const PROFILE_PATH = process.env.ALRIFAI_PROFILE_PATH
  ?? "/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json";
const MANIFEST_PATH = process.env.ALRIFAI_NATIVE_MANIFEST_FILE
  ?? "/etc/vps/apps/al-rifai/native/manifest.json";

const JID_PATTERN = /^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net|lid|g\.us)$/;

type Binding = {accountId: string; streamId: string; pairedJid: string; pairedLid: string};
type Profile = {
  mode: string;
  account: string;
  path: string;
  binding: Binding;
  consumers: Record<string, {epoch: number; chats: string[]; participants: Record<string, string[]>}>;
};
type PersonRow = {id: string; role: string; phone: string | null};
type ChannelRow = {
  roster_id: string;
  chat_jid: string;
  participant_jid: string | null;
  channel_role: string;
};

class RenderError extends Error {}

function fail(message: string): never {
  throw new RenderError(message);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) fail(`${label} must be a non-empty string`);
  return value;
}

function readJson(path: string, label: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    fail(`cannot read ${label} at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    fail(`${label} at ${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readBinding(value: unknown, label: string): Binding {
  const record = asRecord(value, label);
  return {
    accountId: asString(record.accountId, `${label}.accountId`),
    streamId: asString(record.streamId, `${label}.streamId`),
    pairedJid: asString(record.pairedJid, `${label}.pairedJid`),
    pairedLid: asString(record.pairedLid, `${label}.pairedLid`),
  };
}

function sameBinding(a: Binding, b: Binding): boolean {
  return a.accountId === b.accountId && a.streamId === b.streamId
    && a.pairedJid === b.pairedJid && a.pairedLid === b.pairedLid;
}

/** Strip the device suffix from a paired JID: "8801…:27@s.whatsapp.net" -> "8801…@s.whatsapp.net". */
function barePairedJid(pairedJid: string): string {
  const match = /^([0-9]{1,30})(?::[0-9]+)?@s\.whatsapp\.net$/.exec(pairedJid);
  if (!match) fail(`binding.pairedJid is not a device-qualified PN JID: ${pairedJid}`);
  return `${match[1]}@s.whatsapp.net`;
}

function loadCurrentProfile(): {profile: Profile; consumerId: string; entry: {epoch: number; chats: string[]; participants: Record<string, string[]>}} {
  const parsed = asRecord(readJson(PROFILE_PATH, "current profile"), "current profile");

  const mode = asString(parsed.mode, "current profile.mode");
  if (mode !== EXPECTED_MODE) fail(`current profile.mode is "${mode}", expected "${EXPECTED_MODE}"`);
  const account = asString(parsed.account, "current profile.account");
  if (account !== EXPECTED_ACCOUNT) fail(`current profile.account is "${account}", expected "${EXPECTED_ACCOUNT}"`);
  const runtimePath = asString(parsed.path, "current profile.path");
  if (runtimePath !== EXPECTED_RUNTIME_PATH) {
    fail(`current profile.path is "${runtimePath}", expected "${EXPECTED_RUNTIME_PATH}"`);
  }
  const binding = readBinding(parsed.binding, "current profile.binding");

  const consumers = asRecord(parsed.consumers, "current profile.consumers");
  const ids = Object.keys(consumers);
  if (ids.length !== 1) fail(`current profile must contain exactly one consumer, found ${ids.length}`);
  const consumerId = ids[0];
  const entryRaw = asRecord(consumers[consumerId], `consumers.${consumerId}`);

  const epoch = entryRaw.epoch;
  if (typeof epoch !== "number" || !Number.isInteger(epoch) || epoch < 1) {
    fail(`consumers.${consumerId}.epoch must be an integer >= 1`);
  }
  const chatsRaw = entryRaw.chats;
  if (!Array.isArray(chatsRaw) || chatsRaw.length === 0) {
    fail(`consumers.${consumerId}.chats must be a non-empty array`);
  }
  const chats = chatsRaw.map((chat, index) => asString(chat, `consumers.${consumerId}.chats[${index}]`));

  const participantsRaw = asRecord(entryRaw.participants, `consumers.${consumerId}.participants`);
  const participants: Record<string, string[]> = {};
  for (const [chat, members] of Object.entries(participantsRaw)) {
    if (!Array.isArray(members)) fail(`participants["${chat}"] must be an array`);
    participants[chat] = members.map((member, index) => asString(member, `participants["${chat}"][${index}]`));
  }

  const profile: Profile = {mode, account, path: runtimePath, binding, consumers: {}};
  return {profile, consumerId, entry: {epoch, chats, participants}};
}

function loadManifestBinding(): Binding {
  const parsed = asRecord(readJson(MANIFEST_PATH, "native manifest"), "native manifest");
  const accounts = asRecord(parsed.accounts, "native manifest.accounts");
  const wa01 = asRecord(accounts[EXPECTED_ACCOUNT], `native manifest.accounts.${EXPECTED_ACCOUNT}`);
  return readBinding(wa01.binding, `native manifest.accounts.${EXPECTED_ACCOUNT}.binding`);
}

async function connect(): Promise<pg.Client> {
  const password = process.env.PGPASSWORD
    ?? (process.env.PGPASSWORD_FILE ? readFileSync(process.env.PGPASSWORD_FILE, "utf8").trim() : undefined);
  if (!password) fail("PGPASSWORD or PGPASSWORD_FILE is required");
  const client = new pg.Client({
    host: process.env.PGHOST ?? "vps-infra-postgres-1",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "alrifai",
    user: process.env.PGUSER ?? "alrifai_app",
    password,
  });
  await client.connect();
  return client;
}

type Derived = {
  chats: string[];
  participants: Record<string, string[]>;
};

function derive(
  personRows: PersonRow[],
  channelRows: ChannelRow[],
  ownerPn: string,
): Derived {
  const persons = new Map(personRows.map((person) => [person.id, person]));

  const groupMembers = new Map<string, Set<string>>();
  const directs = new Map<string, {person: PersonRow; aliases: Set<string>}>();
  const conflicts: string[] = [];

  for (const channel of channelRows) {
    const person = persons.get(channel.roster_id);
    // A channel whose person is inactive is not in scope: deactivation is the switch.
    if (!person) continue;

    if (channel.channel_role === "GROUP") {
      if (!channel.participant_jid) continue;
      const set = groupMembers.get(channel.chat_jid) ?? new Set<string>();
      set.add(channel.participant_jid);
      groupMembers.set(channel.chat_jid, set);
      continue;
    }

    if (channel.channel_role !== "DIRECT") continue;

    const existing = directs.get(channel.chat_jid);
    if (existing && existing.person.id !== person.id) {
      conflicts.push(channel.chat_jid);
      continue;
    }
    const entry = existing ?? {person, aliases: new Set<string>()};
    if (channel.participant_jid) entry.aliases.add(channel.participant_jid);
    directs.set(channel.chat_jid, entry);
  }

  if (conflicts.length) {
    fail(`DIRECT chat claimed by more than one roster person: ${[...new Set(conflicts)].sort().join(", ")}`);
  }

  const directChats = [...directs.keys()].sort();
  const aliases = new Set<string>();
  for (const entry of directs.values()) for (const alias of entry.aliases) aliases.add(alias);
  const aliasAsDirect = directChats.filter((chat) => aliases.has(chat));
  if (aliasAsDirect.length) {
    fail(`alias JID is also a DIRECT chat_jid, participants would be ambiguous: ${aliasAsDirect.join(", ")}`);
  }

  // Deterministic order: groups first (sorted), then each direct with its aliases.
  const groupChats = [...groupMembers.keys()].sort();
  const chats: string[] = [...groupChats];
  for (const chat of directChats) {
    chats.push(chat);
    for (const alias of [...(directs.get(chat)?.aliases ?? new Set<string>())].sort()) chats.push(alias);
  }

  const participants: Record<string, string[]> = {};
  for (const chat of groupChats) {
    participants[chat] = [...(groupMembers.get(chat) ?? new Set<string>())].sort();
  }
  for (const chat of directChats) {
    const entry = directs.get(chat);
    if (!entry) continue;
    const accountant = entry.person.role === "ACCOUNTANT";
    participants[chat] = accountant ? [ownerPn] : [chat];
    for (const alias of [...entry.aliases].sort()) {
      participants[alias] = accountant ? [ownerPn] : [alias];
    }
  }

  return {chats, participants};
}

function validate(
  profile: Profile,
  consumerId: string,
  entry: {epoch: number; chats: string[]; participants: Record<string, string[]>},
  serialized: string,
): void {
  if (entry.chats.length === 0 || entry.chats.length > MAX_CHATS) {
    fail(`chats must contain 1..${MAX_CHATS} entries, found ${entry.chats.length}`);
  }
  const seen = new Set<string>();
  for (const chat of entry.chats) {
    if (!JID_PATTERN.test(chat)) fail(`chat is not a valid JID: ${chat}`);
    if (seen.has(chat)) fail(`duplicate chat entry: ${chat}`);
    seen.add(chat);
  }
  for (const [chat, members] of Object.entries(entry.participants)) {
    if (!seen.has(chat)) fail(`participants key is not in chats: ${chat}`);
    if (!Array.isArray(members) || members.length > MAX_MEMBERS) {
      fail(`participants["${chat}"] must be an array of at most ${MAX_MEMBERS} members`);
    }
    if (new Set(members).size !== members.length) fail(`participants["${chat}"] contains duplicates`);
    for (const member of members) if (!JID_PATTERN.test(member)) fail(`member is not a valid JID: ${member}`);
  }
  for (const chat of entry.chats) {
    if (chat.endsWith("@g.us") && !(entry.participants[chat] ?? []).length) {
      fail(`group chat has no participants: ${chat}`);
    }
  }
  if (!Number.isInteger(entry.epoch) || entry.epoch < 1) fail("epoch must be an integer >= 1");
  if (Buffer.byteLength(serialized) > MAX_PROFILE_BYTES) {
    fail(`serialized profile is ${Buffer.byteLength(serialized)} bytes, exceeds ${MAX_PROFILE_BYTES}`);
  }
  if (profile.binding.accountId !== EXPECTED_ACCOUNT) fail("binding.accountId must be wa-01");
}

async function main(): Promise<number> {
  try {
    const {profile, consumerId, entry} = loadCurrentProfile();

    const manifestBinding = loadManifestBinding();
    if (!sameBinding(manifestBinding, profile.binding)) {
      fail("native manifest binding disagrees with the current profile binding");
    }

    const ownerPn = barePairedJid(profile.binding.pairedJid);

    const client = await connect();
    let personRows: PersonRow[];
    let channelRows: ChannelRow[];
    let rosterEpoch: number;
    let outboxPending: string[];
    try {
      const persons = await client.query<PersonRow>(
        `SELECT id, role, phone
           FROM public.escort_roster
          WHERE account_id = $1 AND active = true
          ORDER BY id`,
        [EXPECTED_ACCOUNT],
      );
      const channels = await client.query<ChannelRow>(
        `SELECT roster_id, chat_jid, participant_jid, channel_role
           FROM public.escort_roster_channel
          WHERE account_id = $1 AND active = true
          ORDER BY roster_id, channel_role, chat_jid, participant_jid`,
        [EXPECTED_ACCOUNT],
      );
      const epoch = await client.query<{epoch: number}>(
        `SELECT epoch FROM public.escort_roster_epoch WHERE id = 1`,
      );
      const outbox = await client.query<{id: string}>(
        `SELECT id::text AS id
           FROM public.escort_roster_outbox
          WHERE kind = 'PROFILE_REGENERATE'
            AND completed_at IS NULL
            AND claimed_at IS NULL
          ORDER BY id`,
      );
      personRows = persons.rows;
      channelRows = channels.rows;
      rosterEpoch = Number(epoch.rows[0]?.epoch ?? 0);
      outboxPending = outbox.rows.map((row) => row.id);
    } finally {
      await client.end();
    }

    if (!Number.isInteger(rosterEpoch) || rosterEpoch < 1) {
      fail(`escort_roster_epoch.id=1 has an invalid epoch: ${rosterEpoch}`);
    }

    const derived = derive(personRows, channelRows, ownerPn);
    const epoch = Math.max(rosterEpoch, entry.epoch);

    const output = {
      mode: EXPECTED_MODE,
      account: EXPECTED_ACCOUNT,
      path: EXPECTED_RUNTIME_PATH,
      binding: {
        accountId: profile.binding.accountId,
        streamId: profile.binding.streamId,
        pairedJid: profile.binding.pairedJid,
        pairedLid: profile.binding.pairedLid,
      },
      consumers: {
        [consumerId]: {
          epoch,
          chats: derived.chats,
          participants: derived.participants,
        },
      },
    };

    const serialized = `${JSON.stringify(output, null, 1)}\n`;
    validate({...profile, consumers: {[consumerId]: {epoch, chats: derived.chats, participants: derived.participants}}}, consumerId, {epoch, chats: derived.chats, participants: derived.participants}, serialized);

    process.stdout.write(serialized);
    process.stderr.write(
      `RENDER_OK chats=${derived.chats.length} epoch=${epoch} (roster=${rosterEpoch}, current=${entry.epoch})`
      + ` owner=${ownerPn} outbox_pending=${outboxPending.length}`
      + (outboxPending.length ? ` outbox_ids=[${outboxPending.join(",")}]` : "")
      + "\n",
    );
    return 0;
  } catch (error) {
    process.stderr.write(`RENDER_FAILED ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

main().then((code) => {
  process.exitCode = code;
});
