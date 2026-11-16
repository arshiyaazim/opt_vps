// Targeted reconciliation for Vessel assignment evidence that the parser could
// not read at intake time (for example a malformed shift suffix "22/10/26 ((N)").
//
// It re-parses the ORIGINAL stored source text, fills only the fields that were
// missing, links the confirmation to the original order through the existing
// matcher and creates one confirmed program per Lighter. Nothing is invented:
// a row is only reconciled when the source text itself contains the fields.
//
//   node --experimental-strip-types scripts/reconcile-vessel-assignments.mjs [--apply] [--from=2026-10-11]
//
// Default is a dry run. --apply is a production data write and needs Owner
// authorization. The operation is idempotent (deterministic program ids).

import {createPool} from '../db/postgres.mjs';
import {parseEscortOrder} from '../lib/escort-intake-candidate.mjs';
import {persistConfirmedProgram} from '../lib/vessel-ops.ts';
import {analyzeMobile} from '../lib/mobile-identity.mjs';
import {matchConfirmation, vesselKey} from '../lib/vessel-match.ts';

const apply = process.argv.includes('--apply');
const fromArg = process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] ?? '2026-10-11';
const EPOCH = 'CANONICAL_BACKFILL_20261026';

const loader = createPool({readOnly: true});
const writer = createPool({readOnly: false, user: 'ir_review_runtime'});

const tally = {
  apply, from: fromArg, scanned: 0, sourceComplete: 0, stillIncomplete: 0,
  confirmable: {EXACT: 0, VARIANT: 0, CORRECTED: 0}, unmatched: 0,
  programsCreated: 0, programsExisting: 0, updatedRows: 0,
};

async function main() {
  const scope = (await loader.query(
    "SELECT canonical_chat_jid,alias_chat_jids FROM public.conversation_scope WHERE account_id='wa-01' AND domain='VESSEL' AND conversation_type='DIRECT' AND active=true",
  )).rows;
  const canonical = {};
  for (const row of scope) {
    const c = String(row.canonical_chat_jid);
    canonical[c] = c;
    for (const a of row.alias_chat_jids ?? []) canonical[String(a)] = c;
  }

  const drafts = (await loader.query(
    `SELECT id,source_message_id,chat_jid,mother_vessel,lighter_vessel,master_mobile,source_time,client_contact_id,parsed
       FROM public.escort_order_register
      WHERE account_id='wa-01' AND dataset_epoch=$1 AND status='DRAFT'`, [EPOCH],
  )).rows.map((r) => ({
    id: String(r.id), messageId: r.source_message_id, chatJid: r.chat_jid,
    mother: r.mother_vessel ?? '', lighter: r.lighter_vessel ?? '',
    masterRaw: String(r.parsed?.fields?.masterMobile ?? r.master_mobile ?? ''),
    sourceTime: new Date(r.source_time).toISOString(), contactId: r.client_contact_id,
  }));

  const employees = (await loader.query(
    "SELECT employee_mobile,preferred_name,state FROM public.employee_master WHERE scope_account='wa-01'",
  )).rows;
  const employeeByMobile = new Map();
  for (const employee of employees) {
    const digits = analyzeMobile(employee.employee_mobile).digits;
    if (digits) employeeByMobile.set(digits, { name: employee.preferred_name ?? null });
  }

  const rows = (await loader.query(
    `SELECT id,chat_jid,source_message_id,source_hash,source_time,mother_vessel,lighter_vessel,
            escort_name,escort_mobile,duty_date,shift,reasons,parsed,source_text
       FROM public.escort_order_register
      WHERE account_id='wa-01' AND dataset_epoch=$1 AND status='REVIEW'
        AND reasons::text LIKE '%ASSIGNMENT_EVIDENCE_INCOMPLETE%'
        AND (source_time AT TIME ZONE 'Asia/Dhaka')::date >= $2::date
      ORDER BY source_time`, [EPOCH, fromArg],
  )).rows;

  for (const row of rows) {
    tally.scanned += 1;
    if (row.parsed?.programId) continue;
    const messageDate = new Date(Date.parse(row.source_time) + 6 * 3600 * 1000).toISOString().slice(0, 10);
    const blocks = parseEscortOrder(row.source_text ?? '', { messageDate });
    const wanted = vesselKey(row.lighter_vessel);
    const block = blocks.find((b) => vesselKey(b.fields?.lighterVessel) === wanted) ?? blocks[0];
    if (!block || !block.employeeMobile || !block.assignmentDate || !['D', 'N'].includes(block.shift)) {
      tally.stillIncomplete += 1;
      continue;
    }
    tally.sourceComplete += 1;

    const match = matchConfirmation(drafts, {
      messageId: row.source_message_id,
      chatJid: row.chat_jid,
      mother: block.fields?.motherVessel ?? row.mother_vessel ?? '',
      lighter: block.fields?.lighterVessel ?? row.lighter_vessel ?? '',
      masterRaw: block.masterMobileRaw ?? block.masterMobile ?? '',
      sourceTime: new Date(row.source_time).toISOString(),
      contactId: null,
    }, { windowDays: 30, canonicalChat: (jid) => canonical[jid] ?? jid });

    if (!['EXACT', 'VARIANT', 'CORRECTED'].includes(match.state) || !match.orderId) {
      tally.unmatched += 1;
      continue;
    }
    tally.confirmable[match.state] += 1;

    if (!apply) {
      tally.programsCreated += 1; // dry run: programs that would be created
      continue;
    }

    const client = await writer.connect();
    try {
      await client.query('BEGIN');
      // Fill only the missing fields; original text, hash and identity stay.
      const reasons = (row.reasons ?? []).filter((reason) => !String(reason).startsWith('ASSIGNMENT_EVIDENCE_INCOMPLETE'));
      await client.query(
        `UPDATE public.escort_order_register
            SET duty_date=COALESCE(duty_date,$2::date),
                shift=CASE WHEN shift IN ('D','N') THEN shift ELSE $3 END,
                escort_mobile=CASE WHEN escort_mobile IS NULL OR btrim(escort_mobile)='' THEN $4 ELSE escort_mobile END,
                reasons=$5::jsonb,
                parsed=parsed||$6::jsonb,
                updated_at=now()
          WHERE id=$1 AND account_id=$7 AND dataset_epoch=$8`,
        [row.id, block.assignmentDate, block.shift, block.employeeMobile,
          JSON.stringify([...reasons, 'ASSIGNMENT_EVIDENCE_RECONCILED_FROM_SOURCE']),
          JSON.stringify({ confirmationMatch: match, reconciled: { version: 'vessel-assignment-reconcile-v1', at: new Date().toISOString() } }),
          'wa-01', EPOCH],
      );
      tally.updatedRows += 1;
      const employee = employeeByMobile.get(analyzeMobile(block.employeeMobile).digits);
      const result = await persistConfirmedProgram(client, {
        account: 'wa-01',
        clientChat: canonical[row.chat_jid] ?? row.chat_jid,
        mother: block.fields?.motherVessel ?? row.mother_vessel ?? '',
        lighter: block.fields?.lighterVessel ?? row.lighter_vessel ?? '',
        masterMobile: block.masterMobile ?? '',
        destination: block.fields?.destination ?? '',
        escortName: row.escort_name ?? block.fields?.escortName ?? '',
        escortMobile: block.employeeMobile,
        startDate: block.assignmentDate,
        shift: block.shift,
        orderId: String(match.orderId),
        orderMessageId: String(match.orderMessageId ?? ''),
        confirmationMessageId: row.source_message_id,
        confirmationSourceHash: row.source_hash,
        reviewRowId: row.id,
        matchState: match.state,
        mobileEvidence: String(match.mobileEvidence ?? 'EXACT'),
        employeeLink: employee
          ? { state: 'RESOLVED', employeeId: block.employeeMobile, name: employee.name }
          : { state: 'UNRESOLVED', employeeId: block.employeeMobile, name: null },
      });
      if (result.created) tally.programsCreated += 1; else tally.programsExisting += 1;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  console.log(JSON.stringify({ dryRun: !apply, ...tally }, null, 2));
}

main()
  .then(async () => { await loader.end(); await writer.end(); })
  .catch(async (error) => {
    console.error('reconcile failed:', error instanceof Error ? error.message : error);
    await loader.end().catch(() => undefined);
    await writer.end().catch(() => undefined);
    process.exitCode = 1;
  });
