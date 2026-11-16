// Reprocess the Owner-approved vessel conversations against the authorized
// participant list, deriving register DRAFT/REVIEW rows from stored evidence.
//
// Why this is a separate step: the live processor had already classified these
// messages before the group participants were authorized, and office-posted
// assignments had no author contact. Re-running through the same classifier and
// parser is safe because every write is idempotent (ON CONFLICT) and no message
// can produce an approval, release or settlement.
//
// The conversation list is read from public.conversation_scope (identifiers are
// configuration data, never source). Both directions are processed: an incoming
// participant post is attributed to its author, an office post is attributed only
// when the block names exactly one authorized participant of that group.
//
// Run: node --experimental-strip-types scripts/reprocess-approved-groups.mjs [--dry]

import {createPool} from '../db/postgres.mjs';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {classifyBusinessSource,deriveEscortRegisterOps,scopePhoneAliases} from '../lib/escort-register.mjs';
import {persistOperation} from '../lib/vessel-ops.ts';
import {CASH_SCOPE_CHATS} from '../lib/cash-scope.ts';

const dry = process.argv.includes('--dry');

const loader = createPool({readOnly: true});
const writer = createPool({readOnly: false, user: 'ir_review_runtime'});

const tally = {
  scanned: 0, incoming: 0, outgoing: 0, routedVessel: 0, parsed: 0,
  drafts: 0, reviews: 0, incompleteAssignments: 0, insertedOperations: 0,
  alreadyKnown: 0, notVessel: 0,
};

const dhakaDate = (iso) => new Date(Date.parse(iso) + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function main() {
  const scopeRows = (await loader.query(
    `SELECT canonical_chat_jid, alias_chat_jids FROM public.conversation_scope
      WHERE account_id='wa-01' AND domain='VESSEL' AND active=true`,
  )).rows;
  const chats = [...new Set(scopeRows.flatMap((r) => [r.canonical_chat_jid, ...(r.alias_chat_jids ?? [])]))];
  if (!chats.length) throw new Error('APPROVED_VESSEL_SCOPE_EMPTY');

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

  console.log(`chats=${chats.length} contacts=${contacts.length} aliases=${Object.keys(aliases).length} authorizations=${groupAuthorizations.length} existing=${existing.length}`);

  const messages = (await loader.query(
    `SELECT o.id,o.chat_jid,o.message_id,o.direction,o.sender_jid,o.sender_phone,o."timestamp",
            o.text_content,o.raw_content,o.chat_type
       FROM public.whatsapp_messages_original o
      WHERE o.wa_account='wa-01' AND o.chat_jid = ANY($1::text[])
      ORDER BY o."timestamp",o.id`,
    [chats],
  )).rows;

  const account = {accountId: 'wa-01'};
  const accountRows = [...existing];

  for (const row of messages) {
    tally.scanned += 1;
    if (row.direction === 'incoming') tally.incoming += 1; else tally.outgoing += 1;
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
    if (route.domain !== 'vessel') { tally.notVessel += 1; continue; }
    tally.routedVessel += 1;
    if (!message.text) continue;

    const parsed = parseEscortOrder(message.text, { messageDate: dhakaDate(sourceTime) });
    if (parsed.length) tally.parsed += 1;
    const operations = deriveEscortRegisterOps(
      account, [message], contacts, accountRows, aliases, groupAuthorizations, [...CASH_SCOPE_CHATS],
    );

    const known = new Set(accountRows.map((r) => r.id));
    let created = 0;
    for (const operation of operations) {
      if (known.has(operation.row.id)) { tally.alreadyKnown += 1; continue; }
      if (operation.kind === 'DRAFT') tally.drafts += 1; else tally.reviews += 1;
      if ((operation.row.reasons ?? []).some((reason) => String(reason).startsWith('ASSIGNMENT_EVIDENCE_INCOMPLETE'))) {
        tally.incompleteAssignments += 1;
      }
      if (!dry) {
        const client = await writer.connect();
        try {
          await client.query('BEGIN');
          await persistOperation(client, operation);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        } finally { client.release(); }
      }
      accountRows.push({
        ...operation.row, account_id: operation.row.accountId,
        client_contact_id: operation.row.clientContactId, client_phone: operation.row.clientPhone,
        chat_jid: operation.row.chatJid, source_time: operation.row.sourceTime,
      });
      known.add(operation.row.id);
      created += 1;
    }
    tally.insertedOperations += created;

    if (!dry) {
      const classification = operations.some((o) => o.kind === 'DRAFT') ? 'ORDER_DRAFT_CREATED'
        : operations.length ? 'ASSIGNMENT_REVIEW'
        : (parsed.length ? 'REVIEW' : 'NOT_VESSEL_INTENT');
      await writer.query(
        `UPDATE public.whatsapp_messages_processing p
            SET status='processed',processed_at=now(),processing_errors=NULL,
                processed_content=jsonb_build_object(
                  'version','vessel-review-classification-v1',
                  'classification',$2::text,
                  'reviewStatus',$3::text,
                  'sourceRouting',$4::text,
                  'source',jsonb_build_object('accountId','wa-01','chatJid',$5::text,'messageId',$6::text),
                  'sourceTimestamp',$7::text)
          WHERE p.domain='vessel' AND p.original_id=$1`,
        [row.id, classification,
          operations.some((o) => o.kind === 'REVIEW') ? 'REVIEW' : operations.length ? 'DRAFT' : 'REVIEW',
          route.outcome, row.chat_jid, row.message_id, sourceTime],
      );
    }
  }

  console.log(JSON.stringify({ dryRun: dry, ...tally }, null, 2));
}

main()
  .then(async () => { await loader.end(); await writer.end(); })
  .catch(async (error) => {
    console.error('reprocess failed:', error instanceof Error ? error.message : error);
    await loader.end().catch(() => undefined);
    await writer.end().catch(() => undefined);
    process.exitCode = 1;
  });
