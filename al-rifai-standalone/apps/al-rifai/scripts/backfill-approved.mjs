// Historical backfill for the Owner-approved WA-01 conversations.
//
// Stage first, reconcile, then publish canonical records. Cash publication uses
// the same code path as live capture (lib/cash-publish.ts), so a message can
// never produce two financial instructions. Nothing is approved or financially
// posted here.
//
// Default: read-only dry run. Apply is separately guarded and must not be used
// until the Owner's reconciliation go/no-go has been recorded.
// Run: node --experimental-strip-types scripts/backfill-approved.mjs [--dry-run] [batch-id]
// Apply: CASH_BACKFILL_APPLY=APPROVED_AFTER_GO_NO_GO node --experimental-strip-types scripts/backfill-approved.mjs --apply --expected-write-set-sha256=<dry-run-hash> [batch-id]

import {createHash} from 'node:crypto';
import {createPool} from '../db/postgres.mjs';
import {loadConversationScope} from '../lib/conversation-scope.ts';
import {parseLivePaymentBlocks,employeeReviewReasons} from '../candidates/identity-review/live-cash.ts';
import {parsePaymentBlocks,reconcileCashSourceCopies} from '../lib/history-extraction.mjs';
import {publishCashBlock,CASH_EPOCH_CURRENT} from '../lib/cash-publish.ts';
import {CASH_SCOPE_ACCOUNT,CASH_SCOPE_CHATS,CASH_SCOPE_NAME,isCashScopeOwner} from '../lib/cash-scope.ts';
import {cashSourceEligibility} from '../lib/cash-source-eligibility.ts';

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const expectedWriteSetSha256=args.find((arg)=>arg.startsWith('--expected-write-set-sha256='))?.slice('--expected-write-set-sha256='.length)??null;
if (args.some((arg) => arg.startsWith('--')
  && arg !== '--apply' && arg !== '--dry-run'
  && !arg.startsWith('--expected-write-set-sha256='))) {
  throw new Error('BACKFILL_ARGUMENT_INVALID');
}
if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('BACKFILL_MODE_CONFLICT');
if(expectedWriteSetSha256!==null&&!/^[a-f0-9]{64}$/.test(expectedWriteSetSha256))throw new Error('BACKFILL_WRITE_SET_HASH_INVALID');
if(applyMode&&!expectedWriteSetSha256)throw new Error('BACKFILL_WRITE_SET_HASH_REQUIRED');
if(!applyMode&&expectedWriteSetSha256)throw new Error('BACKFILL_WRITE_SET_HASH_APPLY_ONLY');
const batchId = args.find((arg) => !arg.startsWith('--')) ?? 'backfill-20261026';
const hex = (value) => createHash('sha256').update(value).digest('hex');
const sha = (value) => hex(JSON.stringify(value, Object.keys(value).sort()));

// The bridge-resolved JID is authoritative when present. The original LID/PN is
// always retained in raw_content, so nothing is lost by preferring the resolved
// form here.
const senderJidOf = (row) => {
  const raw = row.raw_content ?? {};
  const resolved = typeof raw.resolvedSenderJid === 'string' ? raw.resolvedSenderJid : null;
  if (resolved && resolved.includes('@')) return resolved;
  const sender = typeof row.sender_jid === 'string' ? row.sender_jid : row.sender_bare;
  if (!sender) return null;
  if (sender.includes('@')) return sender;
  const bridge = typeof raw.bridgeSender === 'string' ? raw.bridgeSender : '';
  if (bridge.includes('@')) return bridge;
  // A 13-digit 8801… value is a subscriber number; a longer numeric identifier is
  // a LID and must never be rewritten into a phone number.
  return sender.length <= 13 ? `${sender}@s.whatsapp.net` : `${sender}@lid`;
};

const loader = createPool({readOnly: true, user: 'ir_review_runtime'});
const publisher = applyMode ? createPool({readOnly: false, user: 'ir_review_runtime'}) : null;
const runWriter = applyMode ? createPool({readOnly: false}) : null;

const tally = {
  scanned: 0, inserted: 0, cashEligible: 0, cashPublished: 0,
  cashDuplicate: 0, vesselQueued: 0, archiveQueued: 0, unmatched: 0, reviewQueued: 0,
};
let runStarted=false;

async function loadCashSourceRows() {
  return (await loader.query(
    `SELECT 'original'::text AS source_store,o.wa_account AS account_id,o.chat_jid,o.chat_type,
            o.message_id,o.direction,o.sender_jid,o.receiver_jid,o."timestamp" AS source_time,
            o.message_type,o.text_content,o.raw_content
       FROM public.whatsapp_messages_original o
      WHERE o.wa_account=$1 AND o.chat_jid=ANY($2::text[])
     UNION ALL
     SELECT 'staging'::text,st.account_id,st.chat_jid,st.chat_type,st.message_id,st.direction,
            st.sender_bare,st.receiver_jid,st.source_time,st.message_type,st.text_content,st.raw_content
       FROM public.wa01_backfill_staging st
      WHERE st.account_id=$1 AND st.chat_jid=ANY($2::text[])
      ORDER BY chat_jid,source_time,message_id,source_store`,
    [CASH_SCOPE_ACCOUNT,[...CASH_SCOPE_CHATS]],
  )).rows;
}

function deduplicateSourceRows(rows) {
  const ambiguityReasons = new Map();
  const result = reconcileCashSourceCopies(rows,(row) => [
      new Date(row.source_time).toISOString(),
      String(row.direction).toLowerCase(),
      row.text_content ?? null,
      isCashScopeOwner(senderJidOf(row)),
    ]);
  for (const group of result.unresolvedGroups) {
    const signatures = group.map((row) => [
      new Date(row.source_time).toISOString(),
      String(row.direction).toLowerCase(),
      row.text_content ?? null,
      isCashScopeOwner(senderJidOf(row)),
    ]);
    const differentFields = ['SOURCE_TIME','DIRECTION','TEXT','OWNER_IDENTITY'].filter((_,index) =>
      new Set(signatures.map((signature) => signature[index])).size > 1);
    for (const reason of differentFields) ambiguityReasons.set(reason,(ambiguityReasons.get(reason)??0)+1);
  }
  return {
    ...result,
    ambiguousGroups:result.unresolvedGroups.length,
    ambiguityReasons:Object.fromEntries(ambiguityReasons),
  };
}

function eligibilityOf(row, conversation) {
  return cashSourceEligibility({
    accountId: row.account_id,
    chatJid: row.chat_jid,
    direct: row.chat_type === 'individual' && conversation?.conversationType === 'DIRECT',
    direction: row.direction === 'outgoing' ? 'OUTGOING' : String(row.direction).toUpperCase(),
    senderJid: senderJidOf(row),
    recipientJid: row.receiver_jid || row.chat_jid,
  });
}

function needsSourceVerificationReview(group, scope) {
  return group.some((row) => {
    const conversation = scope.byChat(row.chat_jid);
    if (!conversation) return true;
    const eligibility = eligibilityOf(row, conversation);
    return eligibility === 'ELIGIBLE' || eligibility.endsWith('_UNRESOLVED');
  });
}

function writeSetManifestFor(items,employees) {
  return items.map(({row,block})=>{
    const employee=employees.get(block.fields.employeeMobile);
    const reasons=employeeReviewReasons(employee,block.fields.employeeName);
    return [
      row.account_id,row.chat_jid,row.message_id,block.blockKey,
      new Date(row.source_time).toISOString(),
      sha({
        accountId:row.account_id,chatJid:row.chat_jid,id:row.message_id,
        sender:senderJidOf(row),text:row.text_content??'',
        sourceTime:new Date(row.source_time).toISOString(),direction:'OUTGOING',
      }),
      block.fields.employeeId??'',block.fields.employeeMobile,block.fields.employeeName,
      block.fields.payoutNumber??'',block.fields.payoutMobile,block.fields.methodMarker??'',
      block.fields.method,block.fields.amountMinor,
      !employee?'UNMATCHED':reasons.length?'CONFLICT':'MATCHED',reasons,
    ];
  }).sort((a,b)=>`${a[0]}\u0000${a[2]}\u0000${a[3]}`.localeCompare(`${b[0]}\u0000${b[2]}\u0000${b[3]}`));
}

async function dryRun() {
  const scope = await loadConversationScope({query: (sql, values) => loader.query(sql, values)});
  const sourceRows = await loadCashSourceRows();
  const {
    unique:rows,duplicateCopies,resolvedConflictGroups,unresolvedGroups,
    ambiguousCopies,ambiguousGroups,ambiguityReasons,
  } = deduplicateSourceRows(sourceRows);
  const sourceVerificationReviewGroups = unresolvedGroups.filter((group) =>
    needsSourceVerificationReview(group,scope)).length;
  const excludedUnauthorizedConflictGroups = ambiguousGroups - sourceVerificationReviewGroups;
  const instructionKeys = new Set((await loader.query(
    `SELECT s.message_id,s.block_key
       FROM public.source_refs s
       JOIN public.cash_instructions i ON i.scope_account=s.scope_account AND i.source_ref=s.id
      WHERE s.scope_account='wa-01' AND s.chat_jid=ANY($1::text[])`,
    [[...CASH_SCOPE_CHATS]],
  )).rows.map((row) => `${row.message_id}\u0000${row.block_key}`));
  const postingKeys = new Set((await loader.query(
    `SELECT s.message_id,s.block_key
       FROM public.source_refs s
       JOIN public.cash_instructions i ON i.scope_account=s.scope_account AND i.source_ref=s.id
       JOIN public.cash_postings p ON p.scope_account=i.scope_account AND p.instruction_id=i.id
      WHERE s.scope_account='wa-01' AND s.chat_jid=ANY($1::text[])`,
    [[...CASH_SCOPE_CHATS]],
  )).rows.map((row) => `${row.message_id}\u0000${row.block_key}`));
  const unauthorized = Number((await loader.query(
    `SELECT count(*)::int AS count
       FROM public.cash_instructions i
       JOIN public.source_refs s ON s.id=i.source_ref AND s.scope_account=i.scope_account
      WHERE s.scope_account='wa-01' AND NOT (s.chat_jid=ANY($1::text[]))`,
    [[...CASH_SCOPE_CHATS]],
  )).rows[0]?.count ?? 0);
  const sourceTotals = (await loader.query(
    `SELECT count(*)::int AS all_wa01,
            count(*) FILTER(WHERE chat_jid=ANY($2::text[]))::int AS cash_chat
       FROM public.whatsapp_messages_original WHERE wa_account=$1`,
    [CASH_SCOPE_ACCOUNT,[...CASH_SCOPE_CHATS]],
  )).rows[0] ?? {};
  const instructionRows = (await loader.query(
    `SELECT s.message_id,s.block_key,i.dataset_epoch,i.employee_mobile,i.employee_name,
            i.payout_mobile,i.purpose,i.method,i.amount_minor::text AS amount_minor
       FROM public.source_refs s
       JOIN public.cash_instructions i ON i.scope_account=s.scope_account AND i.source_ref=s.id
      WHERE s.scope_account='wa-01' AND s.chat_jid=ANY($1::text[])`,
    [[...CASH_SCOPE_CHATS]],
  )).rows;
  const existingByKey = new Map();
  for (const row of instructionRows) {
    const key=`${row.message_id}\u0000${row.block_key}`;
    const matches=existingByKey.get(key)??[];
    matches.push(row);
    existingByKey.set(key,matches);
  }
  const existingRun = (await loader.query(
    `SELECT status,scanned,inserted,cash_eligible,cash_published,cash_duplicate,
            vessel_queued,unmatched,review_queued,started_at,finished_at
       FROM public.wa01_backfill_runs WHERE batch_id=$1 ORDER BY started_at DESC LIMIT 1`,
    [batchId],
  )).rows[0] ?? null;

  const byReason = new Map();
  const blocks = [];
  let authorizedOutgoingMessages = 0;
  let idMessagesMissingRequiredFields = 0;
  let invalidPaymentBlocks = 0;
  let otherAuthorizedMessages = 0;
  for (const row of rows) {
    const conversation = scope.byChat(row.chat_jid);
    const eligibility = eligibilityOf(row, conversation);
    if (eligibility !== 'ELIGIBLE') {
      byReason.set(eligibility, (byReason.get(eligibility) ?? 0) + 1);
      continue;
    }
    authorizedOutgoingMessages += 1;
    const text=row.text_content??'';
    const candidates=parsePaymentBlocks(text);
    const parsed = parseLivePaymentBlocks(text);
    const malformed=candidates.filter((candidate)=>candidate.reasons.length>0);
    invalidPaymentBlocks+=malformed.length;
    for(const candidate of malformed)for(const reason of candidate.reasons) {
      byReason.set(reason,(byReason.get(reason)??0)+1);
    }
    if (!parsed.length) {
      if (candidates.length || /^\s*(?:ID|Employee\s*ID|আইডি)\b/im.test(text)) {
        idMessagesMissingRequiredFields += 1;
        byReason.set('ID_MESSAGE_MISSING_REQUIRED_FIELDS',(byReason.get('ID_MESSAGE_MISSING_REQUIRED_FIELDS')??0)+1);
      } else {
        otherAuthorizedMessages += 1;
        byReason.set('NO_CASH_INSTRUCTION_FORMAT',(byReason.get('NO_CASH_INSTRUCTION_FORMAT')??0)+1);
      }
      continue;
    }
    for (const block of parsed) blocks.push({row, block});
  }
  const employeeMobiles = [...new Set(blocks.map(({block}) => block.fields.employeeMobile))];
  const employees = employeeMobiles.length
    ? new Map((await loader.query(
      `SELECT employee_mobile,state,preferred_name,name_aliases FROM public.employee_master
        WHERE scope_account='wa-01' AND employee_mobile=ANY($1::text[])`,
      [employeeMobiles],
    )).rows.map((row) => [row.employee_mobile,row]))
    : new Map();
  let matchedEmployees = 0;
  let missingEmployees = 0;
  let conflictingEmployees = 0;
  for (const {block} of blocks) {
    const employee = employees.get(block.fields.employeeMobile);
    if (!employee) missingEmployees += 1;
    else if (employeeReviewReasons(employee,block.fields.employeeName).length) conflictingEmployees += 1;
    else matchedEmployees += 1;
  }
  const existingForBlock=({row,block})=>existingByKey.get(`${row.message_id}\u0000${block.blockKey}`)??[];
  const alreadyImportedBlocks = blocks.filter(({row,block}) => instructionKeys.has(`${row.message_id}\u0000${block.blockKey}`)).length;
  const currentExistingBlocks = blocks.filter((item) =>
    existingForBlock(item).some((existing)=>existing.dataset_epoch===CASH_EPOCH_CURRENT)).length;
  const legacyExistingBlocks = blocks.filter((item) =>
    existingForBlock(item).some((existing)=>existing.dataset_epoch!==CASH_EPOCH_CURRENT)).length;
  const bothEpochBlocks=blocks.filter((item)=>{
    const epochs=new Set(existingForBlock(item).map((existing)=>existing.dataset_epoch));
    return epochs.has(CASH_EPOCH_CURRENT)&&epochs.size>1;
  }).length;
  const conflictFields={
    employeeId:({row,block})=>existingForBlock({row,block}).some((existing)=>existing.employee_mobile!==block.fields.employeeMobile),
    employeeName:({row,block})=>existingForBlock({row,block}).some((existing)=>existing.employee_name!==block.fields.employeeName),
    payoutNumber:({row,block})=>existingForBlock({row,block}).some((existing)=>existing.payout_mobile!==block.fields.payoutMobile),
    purpose:({row,block})=>existingForBlock({row,block}).some((existing)=>
      (existing.purpose==='Owner direct payment instruction'?'':existing.purpose.trim())
      !==(block.fields.purpose==='Owner direct payment instruction'?'':block.fields.purpose.trim())),
    method:({row,block})=>existingForBlock({row,block}).some((existing)=>existing.method!==block.fields.method),
    amount:({row,block})=>existingForBlock({row,block}).some((existing)=>existing.amount_minor!==block.fields.amountMinor),
  };
  const existingSourceInstructionConflictDimensions=Object.fromEntries(Object.entries(conflictFields)
    .map(([field,matches])=>[field,blocks.filter(matches).length]).filter(([,count])=>count));
  const sourceInstructionConflicts=blocks.filter((item)=>
    Object.values(conflictFields).some((matches)=>matches(item))).length;
  const postingMatches = blocks.filter(({row,block}) => postingKeys.has(`${row.message_id}\u0000${block.blockKey}`)).length;
  const amountMinor = blocks.reduce((sum,{block})=>sum+BigInt(block.fields.amountMinor),0n);
  const identicalTextCounts = new Map();
  for(const row of rows)if(row.text_content)identicalTextCounts.set(row.text_content,(identicalTextCounts.get(row.text_content)??0)+1);
  const distinctMessagesWithRepeatedText=[...identicalTextCounts.values()].filter(count=>count>1).reduce((sum,count)=>sum+count,0);
  const sourceTimes=rows.map((row)=>new Date(row.source_time)).filter((date)=>Number.isFinite(date.getTime()));
  const coverageDays=new Set(sourceTimes.map((date)=>date.toISOString().slice(0,10)));
  const sourceCoverage={
    firstAt:sourceTimes.length?new Date(Math.min(...sourceTimes.map((date)=>date.getTime()))).toISOString():null,
    lastAt:sourceTimes.length?new Date(Math.max(...sourceTimes.map((date)=>date.getTime()))).toISOString():null,
    activeDays:coverageDays.size,
  };
  const storedTotals=(await loader.query(
    `SELECT i.dataset_epoch,count(DISTINCT i.id)::int AS instructions,
            count(p.id)::int AS postings,
            coalesce(sum(abs(p.amount_minor)),0)::text AS posted_minor
       FROM public.cash_instructions i
       LEFT JOIN public.cash_postings p
         ON p.scope_account=i.scope_account AND p.instruction_id=i.id
      WHERE i.scope_account='wa-01' AND i.cash_account='Cash Payment'
      GROUP BY i.dataset_epoch ORDER BY i.dataset_epoch`,
  )).rows;
  const nativeCursorHealth=(await loader.query(
    `SELECT count(*)::int AS cursor_count,
            count(*) FILTER(WHERE cursor IS NOT NULL)::int AS active_cursors,
            count(*) FILTER(WHERE last_error IS NOT NULL)::int AS cursors_with_error,
            max(last_observed_at) AS latest_observed_at
       FROM public.whatsapp_native_sync_state WHERE account_id=$1`,
    [CASH_SCOPE_ACCOUNT],
  )).rows[0]??{};
  const cashChannelHealth=(await loader.query(
    `SELECT chat_jid,enabled,native_cursor IS NOT NULL AS cursor_active,
            last_processed_at,last_error IS NOT NULL AS has_error
       FROM public.cash_live_sync_channels
      WHERE scope_account=$1 ORDER BY chat_jid`,
    [CASH_SCOPE_ACCOUNT],
  )).rows;
  const employeeOutcomeByKey=new Map();
  for(const {row,block} of blocks){
    const employee=employees.get(block.fields.employeeMobile);
    const reasons=employeeReviewReasons(employee,block.fields.employeeName);
    employeeOutcomeByKey.set(`${row.message_id}\u0000${block.blockKey}`,
      reasons.includes('EMPLOYEE_ID_UNMATCHED')?'UNMATCHED':reasons.length?'CONFLICT':'MATCHED');
  }
  const newBlocks=blocks.filter(({row,block})=>
    !instructionKeys.has(`${row.message_id}\u0000${block.blockKey}`));
  const writeSetManifest=writeSetManifestFor(newBlocks,employees);
  const writeSetSha256=createHash('sha256').update(JSON.stringify(writeSetManifest)).digest('hex');
  const newlyEligibleEmployeeMatches={
    matched:newBlocks.filter(({row,block})=>employeeOutcomeByKey.get(`${row.message_id}\u0000${block.blockKey}`)==='MATCHED').length,
    unmatched:newBlocks.filter(({row,block})=>employeeOutcomeByKey.get(`${row.message_id}\u0000${block.blockKey}`)==='UNMATCHED').length,
    conflicting:newBlocks.filter(({row,block})=>employeeOutcomeByKey.get(`${row.message_id}\u0000${block.blockKey}`)==='CONFLICT').length,
  };

  console.log(JSON.stringify({
    mode: 'READ_ONLY_DRY_RUN',
    batchId,
    cutoffAt: new Date().toISOString(),
    cutoffTimezone: 'UTC',
    allWa01OriginalMessages: Number(sourceTotals.all_wa01??0),
    designatedCashChatOriginalMessages: Number(sourceTotals.cash_chat??0),
    sourceRowsAcrossOriginalAndStaging: sourceRows.length,
    distinctSourceMessages: rows.length,
    duplicateStorageCopiesSkipped: duplicateCopies,
    conflictingSourceGroupsResolvedFromOriginal: resolvedConflictGroups,
    conflictingSourceCopies: ambiguousCopies,
    conflictingSourceGroups: ambiguousGroups,
    sourceVerificationReviewGroups,
    excludedUnauthorizedConflictGroups,
    sourceConflictDimensions: ambiguityReasons,
    excludedOutsideCashChatMessages: Number(sourceTotals.all_wa01??0)-Number(sourceTotals.cash_chat??0),
    historicalCoverage: sourceCoverage,
    nativeCursorHealth,
    cashChannelHealth,
    authorizedAdminOutgoingMessages: authorizedOutgoingMessages,
    otherAuthorizedMessages: otherAuthorizedMessages,
    idMessagesMissingRequiredFields,
    invalidPaymentBlocks,
    distinctMessagesWithRepeatedText,
    eligibleBlocks: blocks.length,
    successfullyMatchedEmployeeIds: matchedEmployees,
    missingEmployeeIds: missingEmployees,
    employeeIdentityConflicts: conflictingEmployees,
    alreadyExistingInstructions: alreadyImportedBlocks,
    existingCurrentInstructions:currentExistingBlocks,
    existingLegacyInstructions:legacyExistingBlocks,
    sourceBlocksPresentInBothEpochs:bothEpochBlocks,
    existingSourceInstructionConflicts:sourceInstructionConflicts,
    existingSourceInstructionConflictDimensions,
    currentRecordsWithoutParsedSourceKey:Math.max(0,Number(storedTotals.find((row)=>row.dataset_epoch===CASH_EPOCH_CURRENT)?.instructions??0)-currentExistingBlocks),
    legacyRecordsWithoutParsedSourceKey:Math.max(0,Number(storedTotals.find((row)=>row.dataset_epoch!==CASH_EPOCH_CURRENT)?.instructions??0)-legacyExistingBlocks),
    storedInstructionAndPostingTotals:storedTotals,
    newlyEligibleBlocks: blocks.length - alreadyImportedBlocks,
    newlyEligibleEmployeeMatches,
    writeSet:{
      count:writeSetManifest.length,
      matchedEmployeeCount:newlyEligibleEmployeeMatches.matched,
      employeeReviewCount:newlyEligibleEmployeeMatches.unmatched+newlyEligibleEmployeeMatches.conflicting,
      sha256:writeSetSha256,
      state:'REVIEW_ONLY_NO_POSTINGS',
    },
    duplicateSourceInstructions: alreadyImportedBlocks,
    existingPostingMatches: postingMatches,
    parsedAmountMinor:amountMinor.toString(),
    parsedAmountBDT:(Number(amountMinor)/100).toFixed(2),
    totalExistingPostingRows:Number((await loader.query('SELECT count(*)::int AS count FROM public.cash_postings')).rows[0]?.count??0),
    ambiguousOrRejectedByReason: Object.fromEntries([...byReason.entries()].sort(([a],[b]) => a.localeCompare(b))),
    unauthorizedChatCashInstructions: unauthorized,
    priorRun: existingRun,
    writesPerformed: 0,
    sourceToInstruction: {
      eligibleBlocks: blocks.length,
      alreadyImported: alreadyImportedBlocks,
      notYetImported: blocks.length - alreadyImportedBlocks,
    },
  }, null, 2));
}

async function main() {
  if (!applyMode) {
    await dryRun();
    return;
  }
  if (process.env.CASH_BACKFILL_APPLY !== 'APPROVED_AFTER_GO_NO_GO') {
    throw new Error('CASH_BACKFILL_EXPLICIT_GO_NO_GO_REQUIRED');
  }
  const scope = await loadConversationScope({
    query: (sql, values) => loader.query(sql, values),
  });
  const runId = hex(`backfill|${batchId}`).slice(0, 40);
  const priorRun = (await loader.query(
    `SELECT status,notes,scanned,inserted,cash_eligible,cash_published,cash_duplicate,unmatched,review_queued
       FROM public.wa01_backfill_runs WHERE id=$1`,
    [runId],
  )).rows[0];
  if (priorRun?.status === 'PUBLISHED') throw new Error('BACKFILL_BATCH_ALREADY_PUBLISHED');
  if (priorRun && priorRun.notes?.writeSetSha256 !== expectedWriteSetSha256) {
    throw new Error('BACKFILL_WRITE_SET_APPROVAL_MISMATCH');
  }
  const sourceRows = await loadCashSourceRows();
  const {unique:rows,unresolvedGroups} = deduplicateSourceRows(sourceRows);
  const existingKeys = new Set((await loader.query(
    `SELECT s.message_id,s.block_key
       FROM public.source_refs s
       JOIN public.cash_instructions i ON i.scope_account=s.scope_account AND i.source_ref=s.id
      WHERE s.scope_account='wa-01' AND s.chat_jid=ANY($1::text[])`,
    [[...CASH_SCOPE_CHATS]],
  )).rows.map((row) => `${row.message_id}\u0000${row.block_key}`));
  const plannedBlocks=[];
  for(const row of rows){
    const conversation=scope.byChat(row.chat_jid);
    if(eligibilityOf(row,conversation)!=='ELIGIBLE')continue;
    for(const block of parseLivePaymentBlocks(row.text_content??'')){
      if(!existingKeys.has(`${row.message_id}\u0000${block.blockKey}`))plannedBlocks.push({row,block});
    }
  }
  const plannedEmployeeMobiles=[...new Set(plannedBlocks.map(({block})=>block.fields.employeeMobile))];
  const plannedEmployees=plannedEmployeeMobiles.length
    ?new Map((await loader.query(
      `SELECT employee_mobile,state,preferred_name,name_aliases FROM public.employee_master
        WHERE scope_account='wa-01' AND employee_mobile=ANY($1::text[])`,
      [plannedEmployeeMobiles],
    )).rows.map((employee)=>[employee.employee_mobile,employee]))
    :new Map();
  const plannedManifest=writeSetManifestFor(plannedBlocks,plannedEmployees);
  const plannedDigest=createHash('sha256').update(JSON.stringify(plannedManifest)).digest('hex');
  const manifestKey=(entry)=>JSON.stringify([entry[0],entry[1],entry[2],entry[3]]);
  const approvedSourceBlocks=plannedManifest.map((entry)=>({
    key:manifestKey(entry),digest:hex(JSON.stringify(entry)),
  }));
  if(!priorRun&&plannedDigest!==expectedWriteSetSha256){
    throw new Error(`BACKFILL_WRITE_SET_HASH_MISMATCH expected=${expectedWriteSetSha256} actual=${plannedDigest}`);
  }
  if(priorRun){
    const approvedBlocks=priorRun.notes?.approvedSourceBlocks;
    const approved=new Map((Array.isArray(approvedBlocks)?approvedBlocks:[]).map((item)=>[item.key,item.digest]));
    if(!Array.isArray(approvedBlocks)||plannedManifest.some((entry)=>approved.get(manifestKey(entry))!==hex(JSON.stringify(entry)))){
      throw new Error(`BACKFILL_WRITE_SET_HASH_MISMATCH expected=${expectedWriteSetSha256} actual=${plannedDigest}`);
    }
  }
  if (!priorRun) await runWriter.query(
    `INSERT INTO public.wa01_backfill_runs (id,batch_id,scope,status,notes)
     VALUES ($1,$2,$3::jsonb,'STAGED',$4::jsonb)`,
    [runId,batchId,JSON.stringify(scope.conversations.map((c)=>({
      chatJid:c.canonicalChatJid,domain:c.domain,type:c.conversationType,
    }))),JSON.stringify({
      writeSetSha256:plannedDigest,
      approvedSourceBlocks,
    })],
  );
  runStarted=true;
  const sourceVerificationReview = Array.isArray(priorRun?.notes?.sourceVerificationReview)
    ? [...priorRun.notes.sourceVerificationReview]
    : [];
  const reviewedMessages = new Set(sourceVerificationReview.map((item) => item.messageId));
  let sourceReviewAdded = 0;
  for (const group of unresolvedGroups) {
    const messageId = group[0]?.message_id;
    if (messageId && needsSourceVerificationReview(group,scope) && !reviewedMessages.has(messageId)) {
      sourceVerificationReview.push({messageId,reason:'SOURCE_COPY_CONFLICT'});
      reviewedMessages.add(messageId);
      sourceReviewAdded += 1;
    }
  }
  await runWriter.query(
    `UPDATE public.wa01_backfill_runs
        SET notes=jsonb_set(coalesce(notes,'{}'::jsonb),'{sourceVerificationReview}',$2::jsonb,true)
      WHERE id=$1`,
    [runId,JSON.stringify(sourceVerificationReview)],
  );
  const cursor = priorRun?.notes?.cursor ?? null;
  Object.assign(tally, priorRun ? {
    scanned: priorRun.scanned ?? 0, inserted: priorRun.inserted ?? 0,
    cashEligible: priorRun.cash_eligible ?? 0, cashPublished: priorRun.cash_published ?? 0,
    cashDuplicate: priorRun.cash_duplicate ?? 0,
    unmatched: priorRun.unmatched ?? 0, reviewQueued: priorRun.review_queued ?? 0,
  } : {});
  tally.reviewQueued += sourceReviewAdded;
  const cursorIndex = cursor ? rows.findIndex((row) =>
    JSON.stringify([row.account_id,row.message_id]) === cursor) : -1;
  if(cursor&&cursorIndex<0)throw new Error('BACKFILL_CHECKPOINT_INVALID');
  const resumeAfter = cursor ? cursorIndex + 1 : 0;
  const checkpoint = async (row) => {
    const lastCursor=JSON.stringify([row.account_id,row.message_id]);
    await runWriter.query(
      `UPDATE public.wa01_backfill_runs
          SET notes=jsonb_set(
                jsonb_set(coalesce(notes,'{}'::jsonb),'{cursor}',to_jsonb($2::text),true),
                '{sourceVerificationReview}',$10::jsonb,true),
              scanned=$3,inserted=$4,cash_eligible=$5,cash_published=$6,cash_duplicate=$7,
              unmatched=$8,review_queued=$9
        WHERE id=$1`,
      [runId,lastCursor,tally.scanned,tally.inserted,tally.cashEligible,tally.cashPublished,
       tally.cashDuplicate,tally.unmatched,tally.reviewQueued,JSON.stringify(sourceVerificationReview)],
    );
  };

  for (const row of rows.slice(resumeAfter)) {
    tally.scanned += 1;
    const conversation = scope.byChat(row.chat_jid);
    if (!conversation) {
      tally.unmatched += 1;
      tally.reviewQueued += 1;
      if (!reviewedMessages.has(row.message_id)) {
        sourceVerificationReview.push({messageId:row.message_id,reason:'CONVERSATION_IDENTITY_UNRESOLVED'});
        reviewedMessages.add(row.message_id);
        tally.reviewQueued += 1;
      }
      await checkpoint(row);
      continue;
    }
    const eligibility = eligibilityOf(row, conversation);
    if (eligibility !== 'ELIGIBLE') {
      if (eligibility.endsWith('_UNRESOLVED')) {
        tally.reviewQueued += 1;
        if (!reviewedMessages.has(row.message_id)) {
          sourceVerificationReview.push({messageId:row.message_id,reason:eligibility});
          reviewedMessages.add(row.message_id);
          tally.reviewQueued += 1;
        }
      }
      await checkpoint(row);
      continue;
    }
    const blocks = parseLivePaymentBlocks(row.text_content ?? '');
    if (!blocks.length) { await checkpoint(row); continue; }
    const sender=senderJidOf(row);
    if(!sender){
      tally.reviewQueued+=blocks.length;
      if(!reviewedMessages.has(row.message_id)){
        sourceVerificationReview.push({messageId:row.message_id,reason:'SENDER_IDENTITY_UNRESOLVED'});
        reviewedMessages.add(row.message_id);
      }
      await checkpoint(row);
      continue;
    }
    const sourceHash = sha({
      accountId: row.account_id, chatJid: row.chat_jid, id: row.message_id,
      sender,text: row.text_content ?? '',sourceTime: new Date(row.source_time).toISOString(),
      direction: 'OUTGOING',
    });
    for (const block of blocks) {
      tally.cashEligible += 1;
      const employee=(await loader.query(
        `SELECT state,preferred_name,name_aliases FROM public.employee_master
          WHERE scope_account='wa-01' AND employee_mobile=$1`,
        [block.fields.employeeMobile],
      )).rows[0];
      const reviewReasons=employeeReviewReasons(employee,block.fields.employeeName);
      try {
        const outcome = await publishCashBlock(publisher, {
          account: row.account_id,
          chatJid: row.chat_jid,
          messageId: row.message_id,
          sender,
          sourceTime: new Date(row.source_time).toISOString(),
          sourceHash,
          cashAccount: CASH_SCOPE_NAME,
          epoch: CASH_EPOCH_CURRENT,
          block,
          reviewReasons,
        });
        if (outcome === 'written') {
          tally.cashPublished += 1;
          tally.inserted += 1;
        } else tally.cashDuplicate += 1;
        if (reviewReasons.length) {
          tally.reviewQueued += 1;
          if (reviewReasons.includes('EMPLOYEE_ID_UNMATCHED')) tally.unmatched += 1;
        }
      } catch (error) {
        if (error instanceof Error && /LIVE_SOURCE_REPLAY_CONFLICT/.test(error.message)) {
          tally.reviewQueued += 1; continue;
        }
        throw error;
      }
    }
    await checkpoint(row);
  }

  await runWriter.query(
    `UPDATE public.wa01_backfill_runs SET status='PUBLISHED',finished_at=now(),
       scanned=$2,inserted=$3,cash_eligible=$4,cash_published=$5,cash_duplicate=$6,
       unmatched=$7,review_queued=$8
     WHERE id=$1`,
    [runId, tally.scanned, tally.inserted, tally.cashEligible, tally.cashPublished,
      tally.cashDuplicate, tally.unmatched, tally.reviewQueued],
  );
  console.log(JSON.stringify({
    mode:'APPLY',batchId,...tally,
    sourceVerificationReviewCount:sourceVerificationReview.length,
  }, null, 2));
}

main()
  .then(async () => { await loader.end(); await publisher?.end(); await runWriter?.end(); })
  .catch(async (error) => {
    console.error('backfill failed:', error instanceof Error ? error.message : 'BACKFILL_FAILED');
    if(applyMode&&typeof runStarted!=='undefined'&&runStarted){
      await runWriter.query("UPDATE public.wa01_backfill_runs SET status='FAILED',finished_at=now() WHERE id=$1 AND status<>'PUBLISHED'",[hex(`backfill|${batchId}`).slice(0,40)]).catch(()=>undefined);
    }
    await loader.end().catch(() => undefined);
    await publisher?.end().catch(() => undefined);
    await runWriter?.end().catch(() => undefined);
    process.exitCode = 1;
  });
