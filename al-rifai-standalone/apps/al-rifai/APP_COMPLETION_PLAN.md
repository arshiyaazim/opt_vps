## Stored-history extraction verified — 2026-10-15

This update supersedes earlier blocked/pending statuses below. Owner explicitly approved the verified-actor guard SECURITY DEFINER correction and PUBLIC execution revocation. It is now applied, preserving the existing predicate, FOR SHARE row lock and pg_catalog search_path; app registry privileges did not expand. Exact correction is retained in data/history-actor-guard-fix.sql; original migration 0011 checksum/receipt remain unchanged and ledger stays 12.

Bounded live extraction PASSED: 20 stored messages across two approved chats yielded 17 source-linked proposals. source_refs/business_commands/domain_events counts are each 17. The current-source-verified extraction API returns 17 rows. Replaying the first 10-message page twice produced 10 replays and zero inserts each time. Login, four authorized scopes and /review HTTP pass; visual/browser acceptance is not claimed. This is not full-history import, approved orders or financial posting.

No service restarted for this correction. PostgreSQL and wa-02 remain unchanged. No payment posting, message sending or business-data deletion. Current evidence: data/history-activation-status.json and data/history-live-verification.json. Existing MCP named-user ACL must be restored if its socket is recreated; call-control socket was not modified/accepted. Continue with bounded history coverage, verified Employee linkage, operational order/roster and financial writer; opening balance is not a prerequisite.

## Stored-history live increment — 2026-10-15

Migration 0011 is applied with its original checksum and receipt (ledger 12). App and wa-01 run the prepared history-increment images; app health, named login, four approved scopes, extraction read API and /review HTTP pass. PostgreSQL and wa-02 were not restarted. No new qualification workspace/database, payment posting, message send or business-data deletion.

Extraction is blocked: the new verified-actor trigger uses SELECT FOR SHARE under the runtime role; existing registry RLS returns zero locked verified actors although six are readable. The attempted extraction rolled back; source_refs/business_commands/domain_events counts remain 0/0/0. Do not report live extraction completion.

A proposed correction changes only alrifai_foundation_verified_actor() to SECURITY DEFINER and revokes PUBLIC execution, preserving its verified-person predicate, row lock and fixed search_path. Automatic approval review rejected that exact privilege change pending specific Owner approval. It has NOT been applied. No app registry grant expansion is proposed. After approval, fix the guard and repeat bounded extraction/replay/current-source checks; no restart is needed.

App UID 10001 access to the recreated MCP socket was restored with a named rw ACL. Future socket recreation needs this ACL restored until lifecycle handling is implemented. Separate call socket was not modified or accepted. Opening balance does not gate development. Full business workflow and financial writer remain unfinished.

# AL-RIFA’I — app সম্পন্ন করার কর্মপরিকল্পনা

14 October 2026, Asia/Dhaka. বর্তমান live entry: https://app.al-rifai.iamazim.com/review — named `admin` login; আগের password ব্যবহার হবে। পুরোনো Sites page ও তার D1 database আলাদা রয়েছে।

এই session-এ অনুমোদিত B04/B05 কাজ production-এ এগিয়েছে: নির্ধারিত পরিচয়ের exact PN/LID bindings, scoped review/draft access, নাম দিয়ে ব্যক্তি নির্বাচন, real native intake/replay, named HTTPS/session security এবং call-setting controls পরীক্ষা হয়েছে। বিস্তারিত বর্তমান ফল: [completion report](qualification/b04-b05-completion-20261014/REPORT.md)। **এটি পুরো ব্যবসায়িক app সম্পন্ন হওয়া বা বাস্তব call rejection/delivery প্রমাণ নয়।**

## প্রথমে যে acceptance শেষ করতে হবে

- মালিকের নিজের PC/mobile-এ login, table, ব্যক্তি নির্বাচন ও message review দেখা। Automated Chromium desktop/mobile layout পরীক্ষা বাস্তব ফোনের সব আচরণের বিকল্প নয়।
- B04-এর পূর্ণ acceptance: actual service/employee scope-এর প্রমাণ, বর্তমান shared/reassigned phone/mapping conflict এবং অনুমোদিত participant bindings যেখানে প্রযোজ্য। এখন group authority ও Employee grants স্বয়ংক্রিয়ভাবে তৈরি হয়নি।
- Unknown নতুন chat-এর জন্য বিদ্যমান native journal থেকে ছোট header-only discovery/inbox proposal: account/event/chat/sender/direction/time, content বা broad contacts/store নয়; verification-এর আগে clarification/review। বর্তমান app reader পাঁচ পরিচয়ের দশটি exact PN/LID direct chat-এ সীমিত।
- Ordinary native forwarding এখন অনেক ক্ষেত্রে unknown থাকে; সেটি message capture/clarification-এ যায়। Transport presence/mapping compatibility যাচাই ছাড়া false বানানো যাবে না। Settings command-এর জন্য positively known non-forwarded provenance প্রয়োজন।

পূর্ণ B04/B05 register খোলা থাকবে যতক্ষণ তার সব acceptance evidence সম্পন্ন না হয়; technical live checks এবং মালিকের device/পূর্ণ business acceptance আলাদা লেখা হবে।

## পর্যায় ও শেষ হওয়ার প্রমাণ

| ক্রম | কাজ | পুনর্ব্যবহার / dependency | সম্পন্ন হওয়ার প্রমাণ |
|---|---|---|---|
| 1 | পরিচয়/inbox ও B04/B05 শেষ acceptance | বর্তমান registry/session, native journal, exact consumer scope; যাচাইকৃত live configuration | Known/unknown/conflict/revocation, direct/participant separation, owner PC/mobile, একই frontend/native permission; broad grants বা contact-name login নয় |
| 2 | Escort ও Security Guard request → order | Existing parser, shared adapter, Program command boundary ও canonical PostgreSQL; verified client/service context | বাস্তব অনুমোদিত client order; incomplete/correction/cancellation/multiple-intent handling; one canonical order under replay/concurrency; security request Escort-এ যায় না; qualification drafts operational order হয় না |
| 3 | Staff, recruitment, duty, attendance ও release | employee-mobile-v3, বর্তমান approved roster/assignment ও lifecycle helpers; পর্যায়2-এর order | Applicant থেকে Employee/duty তৈরি নয়; duty কেবল approved employee/assignment scope-এ; start/completion/release আলাদা; client/Master/worker/payee পৃথক; phone-only বা cash-only Employee inference নয় |
| 4 | Admin–Accountant accounts, cash, payroll, settlement | Existing PAY-001–012, same canonical writer/receipts, exact Admin/Accountant scopes | Controlled authorized transaction and replay/reconciliation; valid designated Admin→Accountant attributable successful sending existing confirmation rule বজায় রাখে; নতুন acknowledgment gate নয়; payment/release/settlement মিলিয়ে এক milestone নয় |
| 5 | Call auto-reject ও fallback-এর controlled pilot | বর্তমান setting/service/single bridge/sender/outbox; আলাদা controlled phone ও exact300s slot | Fresh direct offer, reject request, phone behavior, termination, fallback send ও caller-phone delivery পৃথক; cooldown; OFF/manual-answer/expiry/revoke; শেষে saved/effective OFF; zero-ringing/exactly-once দাবি নয় |
| 6 | Reply draft, AI/provider ও attributable sending | Existing integration/prompt/context assets যেখানে কাজ করে; scoped retrieval ও durable send operation | Synthetic context/privacy tests আগে; real provider inputs পরে অনুমোদিত scope-এ; অন্য client/personal data leak নয়; unknown status/টাকা/duty confirmation বানানো নয়; generate/send/delivery পৃথক; uncertain send reconcile, blind retry নয় |
| 7 | পূর্ণ PC/mobile business frontend | Existing pages/forms/tables/API; উপরোক্ত business workflows | Role অনুযায়ী সহজ navigation/client selection, actual status/history/linked records, field-level errors ও corrections; implementation flags/fixture text ব্যবহারকারীর flow-তে নয়; public Sites link token-free, private APIs same-origin authentication/CSRF ছাড়া যুক্ত নয় |
| 8 | দৈনন্দিন operation, recovery ও final acceptance | Existing backup/checkpoint/receipt/runtime tools; নতুন infrastructure প্রয়োজন না হলে নয় | Recovery/restart preserves source/history; exact socket recreation/admission; session/credential/capability revocation; bounded load/capacity; certificate renewal; complete end-to-end trace for authorized roles |

Call pilot ছোট আলাদা acceptance কাজ; অন্য business development-এর জন্য সেটিকে নতুন blanket prerequisite বানানো হবে না। প্রথম implementation batch পর্যায়1-এর প্রয়োজনীয় acceptance ও পর্যায়2-এর একটি অনুমোদিত client order-এ সীমিত রাখা উচিত।

## Call pilot-এর প্রস্তুত অংশ

wa-01 only; saved/effective OFF; action consumer-এর `calls.reject`/`calls.fallback.send` এখনও নেই। Named frontend ON/OFF save কাজ করে; saved ON ও effective OFF আলাদা দেখানো পরীক্ষিত। Current caller allowlist empty, all-trusted-direct false, cooldown600; owner/wife/daughter/Accountant-এর আটটি PN/LID exceptions saved। Fallback:

“এই মুহূর্তে WhatsApp কল নেওয়া যাচ্ছে না। অনুগ্রহ করে এখানে আপনার নাম ও প্রয়োজন লিখে পাঠান।”

পরের physical test-এর জন্য অন্য owner-controlled ফোনের exact caller ও নতুন Asia/Dhaka start/end300seconds লাগবে। পুরোনো17:05–17:10 slot expired এবং চালানো হয়নি;01958122300 একই owner device-এ থাকায় সেটি বাধ্যতামূলক caller নয়। Ready হলে bounded action admission ও deadline containment স্থাপন করে পরীক্ষা হবে; ON policy অনুমোদিত হওয়ার পরে প্রতি call-এ নতুন human confirmation নয়।

WhatsApp toggle এখন disabled: self/outgoing account direction একজন মানুষের authority প্রমাণ করে না। Existing named session থেকে short-lived/single-use account/action/source-bound attribution prototype আছে; actual integration/provenance অসম্পূর্ণ থাকলে frontend control চলবে। General AI reply/send সম্পন্ন হয়েছে বলা যাবে না।

## Owner-এর প্রকৃত তথ্য/নির্বাচন

1. নিজের device-এ current URL/login দেখা; পরে অন্য controlled phone এবং test window।
2. প্রথম actual Security Guard client এবং current approved Employee roster/duty/assignment source নির্বাচন যেখানে বর্তমান verified registry-তে প্রমাণ নেই। টাকা পাওয়া বা নাম মিল থেকে এটি বানানো হবে না।
3. বাস্তব business writer/financial posting, provider-এ ব্যক্তিগত তথ্য এবং সাধারণ outbound sending-এর exact rollout scope, যখন reviewable package প্রস্তুত। Existing business policy নতুন করে অনুমোদন করতে হবে না; প্রযুক্তিগত activation ও permitted real inputs নির্দিষ্ট করতে হবে।

## অপরিবর্তিত ভিত্তি ও operating limits

WhatsApp/frontend → verified identity + intent → same scoped workflow → same authoritative database। Account/chat/person/operator provenance পৃথক; native stores transport evidence। Existing authorized writers/FPE transition-এর আগে অক্ষত। Historical Level B CLOSED BY OWNER — historical reference only; import/reopening completion prerequisite নয়।

Current tables: programs/cash/payment/settlement0, source snapshots54; emptiness কোনো missing historical import-এর নির্দেশ নয়। Current candidate records bounded5,000/32MiB, page10 native/25 review; capacity/retention policy qualify করতে হবে, evidence অযথা delete নয়।

Trusted certificate expires12 January2027,19:19:02 Asia/Dhaka, prior live readiness evidence অনুযায়ী। Renewal এখন manual DNS01; unattended renewal বা নতুন daemon ধরে নেওয়া যাবে না। Before expiry existing issuance/verification/reload procedure ব্যবহার করতে হবে।

Final app acceptance-এ source → identity → intent → authorization → workflow → durable outcome → draft/write/send/delivery আলাদা প্রমাণ থাকবে। পুরোনো isolated PASS নতুন live PASS হিসেবে ব্যবহার করা হবে না।


## 15 October 2026 — implementation increment, activation pending

Prepared source-linked Cash table/API and canonical programs linkage in the existing frontend; v2 source admission/direction/role/operation identity, additive 0012, one exact-money writer default OFF, narrow group reader and socket inode ACL. Focused Node/Python checks, typecheck/build and exact-image synthetic desktop/mobile browser checks pass. No production schema execution, new business persistence or deploy. [Concrete release and unresolved acceptance gates](docs/WORKFLOW_RELEASE.md). SQL bodies/constraints/concurrency, media OCR integration, effective rate/attendance feeder, full contact directory and live end-to-end acceptance remain open; these are not silently marked complete. Next action is reviewed-checksum rollback-only SQL rehearsal, requiring specific Owner approval before any production SQL execution.


AL-RIFA’I R1 repair — 16 October 2026 (Asia/Dhaka): **NOT ACCEPTED**.
Owner-approved column-scoped 0013_program_command_permissions.sql + receipt
committed (sha256 ca9044bd197808d1141b8fcc7cbdf86b9dbcaeb6aecafa987e213d2fc144ef65),
ledger14, 0012 checksum preserved. Same f88af2ed49ce candidate app live/healthy,
financial OFF, WhatsApp/PostgreSQL identities/start/restarts unchanged. Actual
runtime boundary/trigger/CAS PASS; old v1-only image is incompatible with retained
v2 and is not an operational rollback target. Compatible reader recovery pin is
the same approved f88 candidate; retain additive schema/facts on app recovery.
Bounded30 Client messages =>7 source facts,5 canonical Draft +2 Review,0 Confirmed,
0 assignments/postings; exact replay0 new facts. All7 historical authority false;
Owner will supply an existing proof reference, not yet provided. Never backdate
bindings or count synthetic conversations/HTTP200 as confirmation acceptance.
All24 original REVIEW Accountant cash rows retain their full-row digest.
Real desktop/mobile-layout browser44 PASS with live API, trusted TLS and no mocks;
physical phone and operational confirmation NOT accepted. Limited source-only
R2–R4 fixes prepared/tests6+12/typecheck PASS, not built/deployed; full group/media,
predecessor release, verified rate/attendance/send-result and directory remain.
Do not rerun either initial-ledger12 or repair-ledger13 activation script.
Current evidence/report: apps/al-rifai/docs/R1_ACTIVATION_RESULT.md,
apps/al-rifai/data/workflow-release.json and workflow-r1-current-state.json.
