// Owner-approved Vessel Register backfill.
//
// Applies exactly the changes approved on 2026-11-04 and nothing else:
//
//   * 4 new Drafts that the old parser could not read;
//   * 2 corrections of Draft rows whose Lighter name the old parser polluted;
//   * 6 confirmed Programs, two of which are the same Lighter on different start
//     dates linked by "Escort Change" (the release date is left unknown).
//
// Default is a dry run. `--apply` performs the writes, one transaction per item,
// with the business/block identity guard and deterministic Program ids, so a
// second run inserts nothing.
//
//   node --experimental-strip-types scripts/apply-vessel-backfill.mjs [--apply]
//
// Safety: every write is constrained to an explicit allowlist below. If the
// derived plan differs from the approved plan in any way, the script aborts
// before writing.

import {createPool} from '../db/postgres.mjs';
import {classifyBusinessSource, deriveEscortRegisterOps, scopePhoneAliases} from '../lib/escort-register.mjs';
import {isDuplicateRegisterRow, persistConfirmedProgram, persistOperationIfNew} from '../lib/vessel-ops.ts';
import {analyzeMobile} from '../lib/mobile-identity.mjs';
import {matchConfirmation, masterCorrections, programIdFor, vesselKey} from '../lib/vessel-match.ts';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {CASH_SCOPE_CHATS, isCashScopeOwner} from '../lib/cash-scope.ts';

const apply = process.argv.includes('--apply');
const EPOCH = 'CANONICAL_BACKFILL_20261026';
const WINDOW_DAYS = 30;

// ── The approved plan ────────────────────────────────────────────────────────
const APPROVED = {
  inserts: [
    ['AC2919C330D82303BCBD4012FEDF888E', '11:kslbulker3'],
    ['AC93B8667565AC03D7717B2F8E254880', '11:nishad2'],
    ['AC432D8B770DAD5DF70A108CF6B431DF', '6:zl1'],
    ['AC57161B823236D8AEB6F16CC0040268', '11:safroz1'],
  ],
  // [row id, polluted Lighter prefix, block ordinal, clean Lighter, clean block key]
  repairs: [
    ['40ed08cdbf70', 'HADIZ', '8', 'HADIZ', '8:hadiz'],
    ['c3b9e09aebcb', 'AL BADRA', '7', 'AL BADRA', '7:albadra'],
  ],
  // Confirmation message ids, in creation order.
  programs: [
    'ACC5D30AAD5C5CC5F79048002A031A7E', // HADIZ 13.07 D - Md Shahidullah
    '3EB03BC88860D817D88E7B',           // HADIZ 15.07 D - Sajibul Islam (Escort Change)
    'AC0545EE1266DB1240A6751DD581B8CC', // AL BADRA 19.07 N
    '3EB065457E4D408DF6DEED',           // Nishad-2 02.09 N
    '3EB0CD0A0ACC9A57DE35FA',           // ZL-1 04.09 N
    'ACD9BA5C619CA7AFF659DACBBBA67E3A', // S-Afroz 05.09 D
  ],
  escortChange: {
    newer: '3EB03BC88860D817D88E7B',
    older: 'ACC5D30AAD5C5CC5F79048002A031A7E',
    reason: 'ESCORT_CHANGE',
  },
};

const loader = createPool({readOnly: true});
const writer = createPool({readOnly: false, user: 'ir_review_runtime'});

const dhaka = (iso) => new Date(Date.parse(iso) + 6 * 3600 * 1000).toISOString().slice(0, 10);
const fail = (message) => { throw new Error(message); };

const pick = (row, snake, camel) => row[snake] ?? row[camel];

function buildPool(rows) {
  return rows
    .filter((r) => pick(r, 'status', 'status') === 'DRAFT')
    .map((r) => ({
      id: String(r.id), messageId: pick(r, 'source_message_id', 'sourceMessageId'),
      chatJid: pick(r, 'chat_jid', 'chatJid'),
      mother: pick(r, 'mother_vessel', 'motherVessel') ?? '',
      lighter: pick(r, 'lighter_vessel', 'lighterVessel') ?? '',
      masterRaw: String(r.parsed?.fields?.masterMobile ?? pick(r, 'master_mobile', 'masterMobile') ?? ''),
      sourceTime: new Date(pick(r, 'source_time', 'sourceTime')).toISOString(),
      contactId: pick(r, 'client_contact_id', 'clientContactId'),
    }));
}

async function main() {
  const scope = (await loader.query(
    "SELECT canonical_chat_jid,alias_chat_jids FROM public.conversation_scope WHERE account_id='wa-01' AND domain='VESSEL' AND conversation_type='DIRECT' AND active=true",
  )).rows;
  const chatAliases = {};
  for (const row of scope) {
    const canonical = String(row.canonical_chat_jid);
    chatAliases[canonical] = canonical;
    for (const alias of row.alias_chat_jids ?? []) chatAliases[String(alias)] = canonical;
  }
  const chats = [...new Set(Object.values(chatAliases))];
  const contacts = (await loader.query("SELECT * FROM public.escort_client_contacts WHERE account_id='wa-01' AND active=true")).rows;
  const aliases = {
    ...Object.fromEntries((await loader.query('SELECT phone_number,jid FROM public.whatsapp_wa01_contact_aliases')).rows
      .map((r) => [String(r.jid).split('@')[0], r.phone_number])),
    ...scopePhoneAliases(scope),
  };
  const groupAuthorizations = (await loader.query("SELECT * FROM public.escort_client_group_authorizations WHERE account_id='wa-01' AND active=true")).rows;
  const messages = (await loader.query(
    `SELECT id,chat_jid,chat_type,message_id,direction,sender_jid,sender_phone,"timestamp",text_content
       FROM public.whatsapp_messages_original WHERE wa_account='wa-01' AND chat_jid = ANY($1::text[])
      ORDER BY "timestamp", id`, [chats],
  )).rows;
  const rows = (await loader.query("SELECT * FROM public.escort_order_register WHERE account_id='wa-01'")).rows;
  const programs = (await loader.query('SELECT id FROM public.programs')).rows;
  const programIds = new Set(programs.map((p) => p.id));
  const employees = (await loader.query("SELECT employee_mobile,preferred_name,state FROM public.employee_master WHERE scope_account='wa-01'")).rows;
  const employeeByMobile = new Map();
  for (const employee of employees) {
    const digits = analyzeMobile(employee.employee_mobile).digits;
    if (digits) employeeByMobile.set(digits, {name: employee.preferred_name ?? null, state: employee.state});
  }

  const correctionInput = [];
  for (const row of messages) {
    if (row.direction !== 'incoming') continue;
    for (const block of parseEscortOrder(row.text_content ?? '', {messageDate: dhaka(row.timestamp)})) {
      if (!block.fields?.lighterVessel) continue;
      correctionInput.push({
        chatJid: chatAliases[row.chat_jid] ?? row.chat_jid,
        mother: block.fields.motherVessel ?? '', lighter: block.fields.lighterVessel,
        masterRaw: block.masterMobileRaw ?? '', sourceTime: new Date(row.timestamp).toISOString(),
      });
    }
  }
  const corrections = masterCorrections(correctionInput);

  // ── derive the plan (mirrors scripts/backfill-vessel-canonical.mjs) ────────
  const inserts = [];
  const duplicates = [];
  for (const row of messages) {
    if (row.direction === 'incoming' && !row.sender_jid) continue;
    const message = {
      accountId: 'wa-01', id: row.message_id, chatJid: row.chat_jid, text: row.text_content ?? '',
      sourceTime: new Date(row.timestamp).toISOString(),
      direction: row.direction === 'outgoing' ? 'OUTGOING' : 'INCOMING',
      sender: row.sender_jid, nativeSenderJid: row.sender_jid,
      senderPhoneTransport: row.sender_phone, deletedAt: null,
    };
    if (classifyBusinessSource({accountId: 'wa-01'}, message, contacts, aliases, groupAuthorizations, [...CASH_SCOPE_CHATS]).domain !== 'vessel') continue;
    const known = new Set(rows.filter((r) => !r.dataset_epoch || r.dataset_epoch === EPOCH).map((r) => r.id));
    for (const operation of deriveEscortRegisterOps(
      {accountId: 'wa-01'}, [message], contacts, rows, aliases, groupAuthorizations, [...CASH_SCOPE_CHATS],
      {epoch: EPOCH, chatAliases, corrections, windowDays: WINDOW_DAYS},
    )) {
      if (known.has(operation.row.id)) continue;
      const sameMessage = rows.filter((r) => r.account_id === operation.row.accountId && r.source_message_id === operation.row.sourceMessageId);
      if (isDuplicateRegisterRow(sameMessage, operation)) {
        duplicates.push(operation);
        continue;
      }
      inserts.push(operation);
      // A derived row participates in later matches exactly as the backfill's
      // in-memory pool does.
      rows.push({
        ...operation.row, account_id: operation.row.accountId,
        client_contact_id: operation.row.clientContactId, client_phone: operation.row.clientPhone,
        chat_jid: operation.row.chatJid, source_time: operation.row.sourceTime,
        block_key: operation.row.blockKey, dataset_epoch: EPOCH,
      });
    }
  }

  const approvedInsertKeys = new Set(APPROVED.inserts.map(([source, block]) => `${source}|${block}`));
  const plannedInserts = new Map(inserts.map((op) => [`${op.row.sourceMessageId}|${op.row.blockKey}`, op]));
  for (const key of plannedInserts.keys()) {
    if (!approvedInsertKeys.has(key)) fail(`PLAN_DRIFT: unapproved insert ${key}`);
  }
  // Idempotency: an approved insert may already be registered (a second run).
  const alreadyPresent = [];
  for (const key of approvedInsertKeys) {
    if (plannedInserts.has(key)) continue;
    const [source, block] = key.split('|');
    const registered = rows.some((r) => r.source_message_id === source && String(r.block_key) === block);
    if (!registered) fail(`PLAN_DRIFT: approved insert missing and not registered ${key}`);
    alreadyPresent.push(key);
  }

  // ── the two approvals: repair exactly the polluted Drafts HADIZ/AL BADRA ───
  const repairs = [];
  const alreadyRepaired = [];
  for (const [rowId, expectedName, expectedOrdinal, cleanName, cleanBlock] of APPROVED.repairs) {
    const row = rows.find((r) => String(r.id).startsWith(rowId));
    if (!row) fail(`PLAN_DRIFT: repair row ${rowId} not found`);
    if (String(row.block_key ?? '').split(':')[0] !== expectedOrdinal && String(row.block_key ?? '') !== cleanBlock) {
      fail(`PLAN_DRIFT: repair row ${rowId} block ordinal`);
    }
    if (row.lighter_vessel === cleanName && String(row.block_key) === cleanBlock) {
      alreadyRepaired.push(rowId); // a second run
      continue;
    }
    if (!String(row.lighter_vessel ?? '').toUpperCase().startsWith(expectedName)) {
      fail(`PLAN_DRIFT: repair row ${rowId} Lighter is "${row.lighter_vessel}" not ${expectedName}`);
    }
    repairs.push({rowId: String(row.id), sourceMessageId: row.source_message_id, lighter: cleanName,
      blockKey: cleanBlock, mother: row.mother_vessel, master: row.master_mobile});
  }

  // ── the six Programs, matched against the post-change Draft pool ───────────
  // The derivation loop already added each planned Draft to `rows`, so the pool
  // must not add them a second time. Repairs are applied to the in-memory copy.
  for (const repair of repairs) {
    const index = rows.findIndex((r) => r.id === repair.rowId);
    if (index >= 0) rows[index] = {...rows[index], lighter_vessel: repair.lighter, block_key: repair.blockKey};
  }
  const pool = buildPool(rows.filter((r) => r.dataset_epoch === EPOCH));

  const messageById = new Map(messages.map((m) => [m.message_id, m]));
  const programPlan = [];
  for (const confirmationId of APPROVED.programs) {
    const row = rows.find((r) => r.source_message_id === confirmationId && r.dataset_epoch === EPOCH && r.confirmation_message_id);
    if (!row) fail(`PLAN_DRIFT: confirmation ${confirmationId.slice(0, 10)} not registered`);
    const confirmationMessage = messageById.get(confirmationId);
    if (!confirmationMessage || confirmationMessage.direction !== 'outgoing'
      || !isCashScopeOwner(String(confirmationMessage.sender_jid ?? ''))) {
      fail(`PLAN_DRIFT: ${confirmationId.slice(0, 10)} is not a verified Admin outgoing message`);
    }
    if ((chatAliases[confirmationMessage.chat_jid] ?? confirmationMessage.chat_jid)
      !== (chatAliases[row.chat_jid] ?? row.chat_jid)) {
      fail(`PLAN_DRIFT: ${confirmationId.slice(0, 10)} is not in its Order conversation`);
    }
    const blocks = parseEscortOrder(row.source_text ?? '', {messageDate: dhaka(new Date(row.source_time).toISOString())});
    const wanted = vesselKey(row.lighter_vessel);
    const block = blocks.find((b) => vesselKey(b.fields?.lighterVessel) === wanted) ?? blocks[0];
    if (!block) fail(`PLAN_DRIFT: confirmation ${confirmationId.slice(0, 10)} does not parse`);
    const match = matchConfirmation(pool, {
      messageId: row.source_message_id, chatJid: row.chat_jid,
      mother: block.fields?.motherVessel ?? row.mother_vessel ?? '',
      lighter: block.fields?.lighterVessel ?? row.lighter_vessel ?? '',
      masterRaw: block.masterMobileRaw ?? block.masterMobile ?? row.master_mobile ?? '',
      sourceTime: new Date(row.source_time).toISOString(), contactId: null,
      shift: block.shift || null,
    }, {windowDays: WINDOW_DAYS, canonicalChat: (jid) => chatAliases[jid] ?? jid});
    if (!['EXACT', 'VARIANT', 'CORRECTED'].includes(match.state) || !match.orderId) {
      const candidates = pool.filter((d) => vesselKey(d.lighter) === wanted)
        .map((d) => `${d.id.slice(0, 8)}@${d.sourceTime}(${d.messageId.slice(0, 8)})`);
      fail(`PLAN_DRIFT: confirmation ${confirmationId.slice(0, 10)} matches ${match.state}; candidates=${candidates.join(',')}`);
    }
    if (!block.employeeMobile || !block.assignmentDate || !['D', 'N'].includes(block.shift)) {
      fail(`PLAN_DRIFT: confirmation ${confirmationId.slice(0, 10)} incomplete`);
    }
    const programId = programIdFor({
      account: 'wa-01', clientChat: chatAliases[row.chat_jid] ?? row.chat_jid,
      mother: block.fields?.motherVessel ?? row.mother_vessel ?? '',
      lighter: block.fields?.lighterVessel ?? row.lighter_vessel ?? '',
      startDate: block.assignmentDate, shift: block.shift,
    });
    const employee = employeeByMobile.get(analyzeMobile(block.employeeMobile).digits);
    programPlan.push({
      confirmationMessageId: row.source_message_id, reviewRowId: String(row.id), chatJid: row.chat_jid,
      programId, exists: programIds.has(programId), matchState: match.state,
      mobileEvidence: String(match.mobileEvidence ?? 'EXACT'),
      orderId: String(match.orderId), orderMessageId: String(match.orderMessageId ?? ''),
      mother: block.fields?.motherVessel ?? row.mother_vessel ?? '',
      lighter: block.fields?.lighterVessel ?? row.lighter_vessel ?? '',
      masterMobile: block.masterMobile ?? row.master_mobile ?? '',
      destination: block.fields?.destination ?? '',
      escortName: block.fields?.escortName ?? row.escort_name ?? '',
      escortMobile: block.employeeMobile, startDate: block.assignmentDate, shift: block.shift,
      employeeLink: employee ? {state: 'RESOLVED', employeeId: block.employeeMobile, name: employee.name}
        : {state: 'UNRESOLVED', employeeId: block.employeeMobile, name: null},
      replacementOf: confirmationId === APPROVED.escortChange.newer ? APPROVED.escortChange.older : undefined,
      replacedBy: confirmationId === APPROVED.escortChange.older ? APPROVED.escortChange.newer : undefined,
      replacementReason: confirmationId === APPROVED.escortChange.newer ? APPROVED.escortChange.reason : undefined,
    });
  }
  // The link is recorded with Program ids, not confirmation ids.
  const idByConfirmation = new Map(programPlan.map((p) => [p.confirmationMessageId, p.programId]));
  for (const item of programPlan) {
    if (item.replacementOf) item.replacementOf = idByConfirmation.get(item.replacementOf);
    if (item.replacedBy) item.replacedBy = idByConfirmation.get(item.replacedBy);
  }
  if (programPlan.some((p) => p.replacementOf && !p.replacementOf)) fail('PLAN_DRIFT: Escort Change link unresolved');

  const plan = {
    dryRun: !apply,
    alreadyPresent,
    alreadyRepaired,
    inserts: inserts.map((op) => ({sourceMessageId: op.row.sourceMessageId, blockKey: op.row.blockKey,
      lighter: op.row.lighterVessel, mother: op.row.motherVessel, masterMobile: op.row.masterMobile,
      destination: op.row.destination, dutyDate: op.row.dutyDate, shift: op.row.shift})),
    duplicatesSkipped: duplicates.map((op) => ({sourceMessageId: op.row.sourceMessageId, blockKey: op.row.blockKey,
      lighter: op.row.lighterVessel})),
    repairs,
    programs: programPlan.map((p) => ({confirmationMessageId: p.confirmationMessageId, programId: p.programId,
      exists: p.exists, lighter: p.lighter, startDate: p.startDate, shift: p.shift, escort: p.escortName,
      matchState: p.matchState, replacementOf: p.replacementOf ?? null, replacedBy: p.replacedBy ?? null})),
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  // ── apply ──────────────────────────────────────────────────────────────────
  const written = {inserted: 0, skipped: 0, repaired: 0, programsCreated: 0, programsExisting: 0};
  for (const operation of inserts) {
    const client = await writer.connect();
    try {
      await client.query('BEGIN');
      const result = await persistOperationIfNew(client, operation);
      if (result === 'inserted') written.inserted += 1; else written.skipped += 1;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  for (const repair of repairs) {
    const client = await writer.connect();
    try {
      await client.query('BEGIN');
      const current = (await client.query(
        'SELECT lighter_vessel,block_key FROM public.escort_order_register WHERE id=$1 AND account_id=$2 FOR UPDATE',
        [repair.rowId, 'wa-01'],
      )).rows[0];
      if (!current) fail(`APPLY_DRIFT: repair row ${repair.rowId} disappeared`);
      if (current.lighter_vessel === repair.lighter && current.block_key === repair.blockKey) {
        await client.query('COMMIT');
        continue; // already repaired
      }
      const result = await client.query(
        `UPDATE public.escort_order_register
            SET lighter_vessel=$3, block_key=$4, updated_at=now(),
                reasons = CASE WHEN reasons::text LIKE '%LIGHTER_NAME_REPAIRED_FROM_SOURCE%' THEN reasons
                               ELSE reasons::jsonb || '["LIGHTER_NAME_REPAIRED_FROM_SOURCE"]'::jsonb END
          WHERE id=$1 AND account_id=$2`,
        [repair.rowId, 'wa-01', repair.lighter, repair.blockKey],
      );
      if (result.rowCount !== 1) fail(`APPLY_DRIFT: repair row ${repair.rowId} not updated`);
      written.repaired += 1;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  for (const item of programPlan) {
    const client = await writer.connect();
    try {
      await client.query('BEGIN');
      const result = await persistConfirmedProgram(client, {
        account: 'wa-01', clientChat: chatAliases[item.chatJid] ?? item.chatJid,
        mother: item.mother, lighter: item.lighter, masterMobile: item.masterMobile,
        destination: item.destination, escortName: item.escortName, escortMobile: item.escortMobile,
        startDate: item.startDate, shift: item.shift,
        orderId: item.orderId, orderMessageId: item.orderMessageId,
        confirmationMessageId: item.confirmationMessageId,
        confirmationSourceHash: String(rows.find((r) => r.source_message_id === item.confirmationMessageId)?.source_hash ?? ''),
        reviewRowId: item.reviewRowId, matchState: item.matchState, mobileEvidence: item.mobileEvidence,
        employeeLink: item.employeeLink,
        replacementOf: item.replacementOf, replacedBy: item.replacedBy, replacementReason: item.replacementReason,
      });
      if (result.created) written.programsCreated += 1; else written.programsExisting += 1;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  console.log(JSON.stringify({applied: true, ...written}, null, 2));
}

main()
  .then(async () => { await loader.end(); await writer.end(); })
  .catch(async (error) => {
    console.error(error.message);
    await loader.end().catch(() => undefined);
    await writer.end().catch(() => undefined);
    process.exitCode = 1;
  });
