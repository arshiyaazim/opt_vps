import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyBusinessSource,OWNER_ESCORT_CLIENTS} from "../lib/escort-register.mjs";

const route = readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
const cashProcessor = readFileSync(new URL("../scripts/process-cash.ts", import.meta.url), "utf8");
const vesselProcessor = readFileSync(new URL("../scripts/process-vessel.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../scripts/message-ingestion-worker.ts", import.meta.url), "utf8");
const markerStatements = [...worker.matchAll(
  /`(INSERT INTO public\.whatsapp_messages_processing\s*\(original_id,domain,status\)\s*SELECT original\.id,'vessel','pending'[\s\S]*?ON CONFLICT \(original_id,domain\) DO NOTHING)`/g,
)].map((match) => match[1]);

assert.doesNotMatch(route, /identity-review\/host|integrationQualificationHealth/);
assert.doesNotMatch(route, /ALRIFAI_(?:INTEGRATION_QUALIFICATION|REVIEW_PROFILE)/);
assert.match(route, /database\(\)\.first\("SELECT 1 AS ready"\)/);
assert.doesNotMatch(route, /startLiveOwnerAccountantCashSync|alrifai_post_owner_accountant_cash/);
assert.match(cashProcessor,/p\.domain='cash' AND p\.status='pending' AND o\.wa_account='wa-01'/);
assert.match(vesselProcessor,/p\.domain='vessel' AND p\.status='pending' AND o\.wa_account='wa-01'/);
assert.match(vesselProcessor,/SELECT phone_number,jid FROM public\.whatsapp_wa01_contact_aliases/);
assert.doesNotMatch(vesselProcessor,/FROM public\.whatsapp_contacts\b/);
assert.equal(markerStatements.length,2,"both direct and authorized-group Vessel marker inserts must remain covered");
for (const statement of markerStatements) {
  assert.match(statement,/WHERE original\.wa_account='wa-01'/);
  assert.match(statement,/ON CONFLICT \(original_id,domain\) DO NOTHING/);
}
assert.match(markerStatements[0],/NOT original\.chat_jid=ANY\(\$2::text\[\]\)/);
assert.match(markerStatements[0],/contact\.account_id='wa-01' AND contact\.active=true/);
assert.match(markerStatements[0],/contact\.id=ANY\(\$3::text\[\]\) AND contact\.phone=ANY\(\$4::text\[\]\)/);
assert.match(markerStatements[0],/original\.direction='outgoing'\s+OR \(original\.direction='incoming' AND \(/);
assert.match(markerStatements[0],/original\.sender_jid=original\.chat_jid/);
assert.match(markerStatements[0],/original\.sender_phone IN \(/);
assert.match(markerStatements[1],/JOIN public\.escort_client_group_authorizations authz/);
assert.match(markerStatements[1],/authz\.account_id='wa-01'/);
assert.match(markerStatements[1],/authz\.participant_jid=original\.sender_jid/);
assert.match(markerStatements[1],/original\.direction='incoming'/);
assert.match(markerStatements[1],/NOT original\.chat_jid=ANY\(\$1::text\[\]\)/);
assert.match(markerStatements[1],/\(contact\.id=ANY\(\$2::text\[\]\) OR contact\.source=\$3\)/,"group participants must be Owner-approved contacts, never any contact");
assert.doesNotMatch(markerStatements.join("\n"),/original\.wa_account\s*(?:IN|=)\s*\([^)]*wa-02/);

const unknownLid = {
  accountId:"wa-01",
  chatJid:"unlisted-contact@lid",
  text:"MV Example\nLighter: Example 2\nMaster Mobile: 01712345678",
  direction:"INCOMING",
  nativeSenderJid:"unlisted-contact@lid",
};
assert.deepEqual(
  classifyBusinessSource({accountId:"wa-01"},unknownLid,OWNER_ESCORT_CLIENTS,{},[],[]),
  {domain:null,outcome:"UNAPPROVED_SOURCE"},
  "an empty alias set must leave an unresolved LID unauthorized",
);

console.log("PASS: health readiness is isolated from candidate-host and Cash startup");
console.log("PASS: Vessel markers enforce WA-01, Cash exclusion, source authorization, and idempotency");
console.log("PASS: Vessel identity lookup is WA-01-view-only and unresolved empty-alias LIDs fail closed");
