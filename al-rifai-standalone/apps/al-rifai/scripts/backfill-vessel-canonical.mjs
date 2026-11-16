// Canonical Vessel backfill from the WA-01 message database.
//
// Reconstructs Drafts, Review evidence and Confirmed Programs from the three
// authorized client conversations plus the approved groups (evidence only). The
// outgoing Admin message in the same client conversation is the confirmation.
//
//   node --experimental-strip-types scripts/backfill-vessel-canonical.mjs [--apply]
//
// Default is a dry run: nothing is written. --apply writes idempotently.

import {createPool} from '../db/postgres.mjs';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {
  classifyBusinessSource,
  deriveEscortRegisterOps,
  scopePhoneAliases,
} from '../lib/escort-register.mjs';
import {isDuplicateRegisterRow, persistConfirmedProgram, persistOperationIfNew} from '../lib/vessel-ops.ts';
import {analyzeMobile} from '../lib/mobile-identity.mjs';
import {masterCorrections} from '../lib/vessel-match.ts';
import {CASH_SCOPE_CHATS} from '../lib/cash-scope.ts';

const apply = process.argv.includes('--apply');
const EPOCH = 'CANONICAL_BACKFILL_20261026';
const WINDOW_DAYS = 30;

const loader = createPool({readOnly: true});
const writer = createPool({readOnly: false, user: 'ir_review_runtime'});

const tally = {
  apply, messages: 0, routed: 0, blocks: 0, drafts: 0, reviews: 0,
  match: { EXACT: 0, VARIANT: 0, CORRECTED: 0, AMBIGUOUS: 0, UNMATCHED: 0, WEAK_EVIDENCE: 0 },
  programsCreated: 0, programsExisting: 0, skippedIncomplete: 0, employeeResolved: 0, employeeUnresolved: 0, duplicatesSkipped: 0,
};

const dhakaDate = (iso) => new Date(Date.parse(iso) + 6 * 3600 * 1000).toISOString().slice(0, 10);

async function main() {
  const scopeRows = (await loader.query(
    `SELECT canonical_chat_jid, alias_chat_jids, conversation_type
       FROM public.conversation_scope
      WHERE account_id='wa-01' AND domain='VESSEL' AND active=true`,
  )).rows;
  if (!scopeRows.length) throw new Error('APPROVED_VESSEL_SCOPE_EMPTY');
  const chatAliases = {};
  const chats = new Set();
  for (const row of scopeRows) {
    const canonical = String(row.canonical_chat_jid);
    chatAliases[canonical] = canonical;
    chats.add(canonical);
    for (const alias of row.alias_chat_jids ?? []) { chatAliases[String(alias)] = canonical; chats.add(String(alias)); }
  }

  const contacts = (await loader.query(
    "SELECT * FROM public.escort_client_contacts WHERE account_id='wa-01' AND active=true",
  )).rows;
  const aliases = {
    ...Object.fromEntries((await loader.query(
      'SELECT phone_number,jid FROM public.whatsapp_wa01_contact_aliases',
    )).rows.map((r) => [String(r.jid).split('@')[0], r.phone_number])),
    ...scopePhoneAliases(scopeRows),
  };
  const groupAuthorizations = (await loader.query(
    "SELECT * FROM public.escort_client_group_authorizations WHERE account_id='wa-01' AND active=true",
  )).rows;
  const existing = (await loader.query(
    "SELECT * FROM public.escort_order_register WHERE account_id='wa-01'",
  )).rows;
  const employees = (await loader.query(
    "SELECT employee_mobile,preferred_name,state FROM public.employee_master WHERE scope_account='wa-01'",
  )).rows;
  const employeeByMobile = new Map();
  for (const employee of employees) {
    const digits = analyzeMobile(employee.employee_mobile).digits;
    if (digits) employeeByMobile.set(digits, { name: employee.preferred_name ?? null, state: employee.state });
  }

  const messages = (await loader.query(
    `SELECT id,chat_jid,chat_type,message_id,direction,sender_jid,sender_phone,"timestamp",text_content
       FROM public.whatsapp_messages_original
      WHERE wa_account='wa-01' AND chat_jid = ANY($1::text[])
      ORDER BY "timestamp", id`, [[...chats]],
  )).rows;

  // Master Mobile corrections: valid numbers stated later for the same Lighter.
  const correctionInput = [];
  for (const row of messages) {
    if (row.direction !== 'incoming') continue;
    const date = dhakaDate(row.timestamp);
    for (const block of parseEscortOrder(row.text_content ?? '', { messageDate: date })) {
      if (!block.fields?.lighterVessel) continue;
      correctionInput.push({
        chatJid: chatAliases[row.chat_jid] ?? row.chat_jid,
        mother: block.fields.motherVessel ?? '',
        lighter: block.fields.lighterVessel,
        masterRaw: block.masterMobileRaw ?? '',
        sourceTime: new Date(row.timestamp).toISOString(),
      });
    }
  }
  const corrections = masterCorrections(correctionInput);

  const account = { accountId: 'wa-01' };
  const rows = [...existing];

  for (const row of messages) {
    tally.messages += 1;
    if (row.direction === 'incoming' && !row.sender_jid) continue;
    const sourceTime = new Date(row.timestamp).toISOString();
    const message = {
      accountId: 'wa-01', id: row.message_id, chatJid: row.chat_jid,
      text: row.text_content ?? '', sourceTime,
      direction: row.direction === 'outgoing' ? 'OUTGOING' : 'INCOMING',
      sender: row.sender_jid, nativeSenderJid: row.sender_jid,
      senderPhoneTransport: row.sender_phone, deletedAt: null,
    };
    const route = classifyBusinessSource(account, message, contacts, aliases, groupAuthorizations, [...CASH_SCOPE_CHATS]);
    if (route.domain !== 'vessel') continue;
    tally.routed += 1;

    const blocks = parseEscortOrder(message.text, { messageDate: dhakaDate(sourceTime) });
    tally.blocks += blocks.length;
    const operations = deriveEscortRegisterOps(
      account, [message], contacts, rows, aliases, groupAuthorizations, [...CASH_SCOPE_CHATS],
      { epoch: EPOCH, chatAliases, corrections, windowDays: WINDOW_DAYS },
    );

    const known = new Set(rows.filter((r) => !r.dataset_epoch || r.dataset_epoch === EPOCH).map((r) => r.id));
    for (const operation of operations) {
      if (known.has(operation.row.id)) continue;
      const match = operation.row.parsed?.confirmationMatch;
      // Counted only for a row that will actually exist afterwards, so a dry run
      // and an apply report the same insert/skip split.
      const countNew = () => {
        if (operation.kind === 'DRAFT') tally.drafts += 1; else tally.reviews += 1;
        if (match?.state) tally.match[match.state] = (tally.match[match.state] ?? 0) + 1;
      };

      if (apply) {
        const client = await writer.connect();
        try {
          await client.query('BEGIN');
          // Business-identity guard: the same evidence already registered (by the
          // live processor, a different generated id, or an older parser) is
          // skipped instead of duplicated.
          const persisted = await persistOperationIfNew(client, operation);
          if (persisted === 'skipped_duplicate') {
            tally.duplicatesSkipped = (tally.duplicatesSkipped ?? 0) + 1;
            await client.query('COMMIT');
            continue;
          }
          countNew();
          if (operation.kind === 'REVIEW' && match
            && ['EXACT', 'VARIANT', 'CORRECTED'].includes(match.state)
            && operation.row.escortMobile && operation.row.dutyDate
            && ['D', 'N'].includes(operation.row.shift)) {
            const digits = analyzeMobile(operation.row.escortMobile).digits;
            const employee = employeeByMobile.get(digits);
            if (employee) tally.employeeResolved += 1; else tally.employeeUnresolved += 1;
            const result = await persistConfirmedProgram(client, {
              account: operation.row.accountId,
              clientChat: chatAliases[operation.row.chatJid] ?? operation.row.chatJid,
              mother: operation.row.motherVessel,
              lighter: operation.row.lighterVessel,
              masterMobile: operation.row.masterMobile,
              destination: operation.row.destination,
              escortName: operation.row.escortName,
              escortMobile: operation.row.escortMobile,
              startDate: operation.row.dutyDate,
              shift: operation.row.shift,
              orderId: String(match.orderId ?? ''),
              orderMessageId: String(match.orderMessageId ?? ''),
              confirmationMessageId: operation.row.sourceMessageId,
              confirmationSourceHash: operation.row.sourceHash,
              reviewRowId: operation.row.id,
              matchState: match.state,
              mobileEvidence: String(match.mobileEvidence ?? 'EXACT'),
              employeeLink: employee
                ? { state: 'RESOLVED', employeeId: operation.row.escortMobile, name: employee.name }
                : { state: 'UNRESOLVED', employeeId: operation.row.escortMobile, name: null },
            });
            if (result.created) tally.programsCreated += 1; else tally.programsExisting += 1;
          } else if (operation.kind === 'REVIEW' && match
            && ['EXACT', 'VARIANT', 'CORRECTED'].includes(match.state)) {
            tally.skippedIncomplete += 1;
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        } finally { client.release(); }
      } else {
        // Dry run: the same predicate the writer uses, so the report matches.
        const sameMessage = rows.filter(
          (r) => r.account_id === operation.row.accountId && r.source_message_id === operation.row.sourceMessageId,
        );
        if (isDuplicateRegisterRow(sameMessage, operation)) {
          tally.duplicatesSkipped = (tally.duplicatesSkipped ?? 0) + 1;
          continue;
        }
        countNew();
        if (operation.kind === 'REVIEW' && match
          && ['EXACT', 'VARIANT', 'CORRECTED'].includes(match.state)) {
          if (operation.row.escortMobile && operation.row.dutyDate && ['D', 'N'].includes(operation.row.shift)) {
            tally.programsCreated += 1; // dry-run: programs that would be created
            const digits = analyzeMobile(operation.row.escortMobile).digits;
            if (employeeByMobile.has(digits)) tally.employeeResolved += 1; else tally.employeeUnresolved += 1;
          } else tally.skippedIncomplete += 1;
        }
      }

      rows.push({
        ...operation.row, account_id: operation.row.accountId,
        client_contact_id: operation.row.clientContactId, client_phone: operation.row.clientPhone,
        chat_jid: operation.row.chatJid, source_time: operation.row.sourceTime,
        block_key: operation.row.blockKey, dataset_epoch: EPOCH,
      });
      known.add(operation.row.id);
    }
  }

  console.log(JSON.stringify({ dryRun: !apply, ...tally }, null, 2));
}

main()
  .then(async () => { await loader.end(); await writer.end(); })
  .catch(async (error) => {
    console.error('vessel backfill failed:', error instanceof Error ? error.message : error);
    await loader.end().catch(() => undefined);
    await writer.end().catch(() => undefined);
    process.exitCode = 1;
  });
