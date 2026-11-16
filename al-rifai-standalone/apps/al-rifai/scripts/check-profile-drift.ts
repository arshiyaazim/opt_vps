/**
 * D2 — compare a generated bridge native-reader profile against the live one.
 *
 * Read-only. Never writes either file.
 *
 *   node --experimental-strip-types scripts/check-profile-drift.ts \
 *     --generated /tmp/native-reader-profile.json.generated \
 *     --current   /var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json
 *
 * Exit codes
 *   0  no functional drift (formatting / ordering differences are allowed)
 *   1  functional drift: chats or participants differ, or binding changed
 *   2  error: unreadable file, invalid JSON, wrong shape
 *
 * `bridge_restart_required` is true only when the chat SET changes, because
 * native_profile.py:60 compares the on-disk chats array to the reader's startup
 * snapshot and raises NATIVE_ACCESS_REVOKED. Member-only or epoch changes do not
 * revoke a running reader.
 */
import {readFileSync} from "node:fs";

type Profile = {
  mode: string;
  account: string;
  path: string;
  binding: Record<string, string>;
  consumers: Record<string, {epoch: number; chats: string[]; participants: Record<string, string[]>}>;
};

type ConsumerView = {
  consumerId: string;
  epoch: number;
  chats: string[];
  participants: Record<string, string[]>;
};

class DriftError extends Error {}

function fail(message: string): never {
  throw new DriftError(message);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") fail(`${label} must be a string`);
  return value;
}

function readProfile(path: string, label: string): {profile: Profile; consumer: ConsumerView; raw: string} {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    fail(`cannot read ${label} at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = asRecord(JSON.parse(raw) as unknown, label);
  } catch (error) {
    fail(`${label} at ${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const bindingRaw = asRecord(parsed.binding, `${label}.binding`);
  const binding: Record<string, string> = {};
  for (const [key, value] of Object.entries(bindingRaw)) binding[key] = asString(value, `${label}.binding.${key}`);

  const consumersRaw = asRecord(parsed.consumers, `${label}.consumers`);
  const ids = Object.keys(consumersRaw);
  if (ids.length !== 1) fail(`${label} must contain exactly one consumer, found ${ids.length}`);
  const consumerId = ids[0];
  const entryRaw = asRecord(consumersRaw[consumerId], `${label}.consumers.${consumerId}`);

  const epoch = entryRaw.epoch;
  if (typeof epoch !== "number" || !Number.isInteger(epoch)) {
    fail(`${label}.consumers.${consumerId}.epoch must be an integer`);
  }
  const chatsRaw = entryRaw.chats;
  if (!Array.isArray(chatsRaw)) fail(`${label}.consumers.${consumerId}.chats must be an array`);
  const chats = chatsRaw.map((chat, index) => asString(chat, `${label}.consumers.${consumerId}.chats[${index}]`));

  const participantsRaw = asRecord(entryRaw.participants, `${label}.consumers.${consumerId}.participants`);
  const participants: Record<string, string[]> = {};
  for (const [chat, members] of Object.entries(participantsRaw)) {
    if (!Array.isArray(members)) fail(`${label}.participants["${chat}"] must be an array`);
    participants[chat] = members.map((member, index) => asString(member, `${label}.participants["${chat}"][${index}]`));
  }

  const profile: Profile = {
    mode: asString(parsed.mode, `${label}.mode`),
    account: asString(parsed.account, `${label}.account`),
    path: asString(parsed.path, `${label}.path`),
    binding,
    consumers: {[consumerId]: {epoch, chats, participants}},
  };
  return {profile, consumer: {consumerId, epoch, chats, participants}, raw};
}

function setOf(values: string[]): Set<string> {
  return new Set(values);
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = setOf(a);
  for (const value of b) if (!left.has(value)) return false;
  return true;
}

function parseArgs(argv: string[]): {generated: string; current: string} {
  let generated: string | undefined;
  let current: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--generated") generated = argv[++index];
    else if (arg === "--current") current = argv[++index];
    else fail(`unknown argument: ${arg}`);
  }
  if (!generated) fail("--generated <path> is required");
  if (!current) fail("--current <path> is required");
  return {generated, current};
}

type Report = {
  generated_path: string;
  current_path: string;
  consumer: string;
  chats_added: string[];
  chats_removed: string[];
  participants_changed: Array<{chat: string; current: string[]; generated: string[]}>;
  binding_drift: string[];
  epoch_change: {current: number; generated: number} | null;
  functional_drift: boolean;
  formatting_only: boolean;
  bridge_restart_required: boolean;
};

function main(): number {
  const args = parseArgs(process.argv.slice(2));

  const current = readProfile(args.current, "current profile");
  const generated = readProfile(args.generated, "generated profile");

  if (current.consumer.consumerId !== generated.consumer.consumerId) {
    fail(`consumer id differs: ${current.consumer.consumerId} vs ${generated.consumer.consumerId}`);
  }

  const currentChats = setOf(current.consumer.chats);
  const generatedChats = setOf(generated.consumer.chats);

  const chats_added = [...generatedChats].filter((chat) => !currentChats.has(chat)).sort();
  const chats_removed = [...currentChats].filter((chat) => !generatedChats.has(chat)).sort();

  const participants_changed: Report["participants_changed"] = [];
  for (const chat of [...generatedChats].filter((chat) => currentChats.has(chat)).sort()) {
    const before = current.consumer.participants[chat] ?? [];
    const after = generated.consumer.participants[chat] ?? [];
    if (!sameSet(before, after)) {
      participants_changed.push({chat, current: [...before].sort(), generated: [...after].sort()});
    }
  }

  const bindingKeys = new Set([...Object.keys(current.profile.binding), ...Object.keys(generated.profile.binding)]);
  const binding_drift = [...bindingKeys]
    .filter((key) => current.profile.binding[key] !== generated.profile.binding[key])
    .sort();

  const epoch_change = current.consumer.epoch === generated.consumer.epoch
    ? null
    : {current: current.consumer.epoch, generated: generated.consumer.epoch};

  const functional_drift = chats_added.length > 0 || chats_removed.length > 0
    || participants_changed.length > 0 || binding_drift.length > 0;

  const report: Report = {
    generated_path: args.generated,
    current_path: args.current,
    consumer: current.consumer.consumerId,
    chats_added,
    chats_removed,
    participants_changed,
    binding_drift,
    epoch_change,
    functional_drift,
    formatting_only: !functional_drift && current.raw !== generated.raw,
    bridge_restart_required: chats_added.length > 0 || chats_removed.length > 0,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    report.functional_drift
      ? `DRIFT functional: added=${chats_added.length} removed=${chats_removed.length} participants=${participants_changed.length} binding=${binding_drift.length}`
      : "DRIFT none (formatting-only differences are not functional drift)"
  );
  process.stdout.write(report.bridge_restart_required ? " bridge_restart_required=true\n" : " bridge_restart_required=false\n");

  return report.functional_drift ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`DRIFT_FAILED ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
