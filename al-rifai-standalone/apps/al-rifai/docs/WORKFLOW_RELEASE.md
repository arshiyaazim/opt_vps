> **HISTORICAL REFERENCE — NOT ACTIVE OPERATIONAL INSTRUCTIONS.** This document records an earlier plan, candidate/qualification design or superseded architecture. Current rules and state: `VESSEL-WORKFLOW.md`, `/opt/vps/AGENTS.md`, `/opt/vps/NEXT-SESSION-HANDOFF.md`.

# Current production verification — 17 October 2026 (Asia/Dhaka)

**healthy private VPS deployment with listed acceptance limits.** Updated `2026-10-16T19:19:59.833281+00:00` UTC / `2026-10-17T01:19:59.833281+06:00` Dhaka. This section supersedes previous operational status headings; retained Owner Constitution/business policies remain applicable. No application defect was demonstrated in this verification; **no application-code, image, deployment, service/timer configuration, migration or financial/outbound-control change** was made.

Existing private production: `https://app.al-rifai.iamazim.com/review`, `al-rifai-app-1`. Running application code `6791a4ba954034b85f3dc26f6926292f61078f98`; image `sha256:626b0ab8c62e60d4fdc8c838630dd566316973d7df3dd44af6fdb6e741923d85`; actual container start `2026-10-16T18:11:00.59493116Z` / `2026-10-17T00:11:00.594931+06:00`. Initial checkout HEAD `a243f9d849232f69b0de3f10c38db283b4de7838` was a documentation commit with no app-code difference from6791; later documentation edits/commits are not running app revisions.

| Item | Current evidence/status | Exact next action |
|---|---|---|
| Runtime, preservation, migrations | **VERIFIED:** healthy, restart0/OOMfalse; original PG/bridge IDs and starts unchanged.42 sealed receipt hashes,6 immutable evidence hashes,15 migration checksums0000–0014 match.24 cash INSTRUCTIONS/520000 minor=BDT5200;5Programs;13old progress;23424cases/22131originals;0owner decisions/0assignments/0postings/0movements. Protected business/policy/ledger snapshots unchanged. Instructions do not prove completed payments. | Preserve newer legitimate arrivals; do not restore historical totals. |
| Previously failing Escort file | **VERIFIED:** original retained Owner/native fixture SHA pins match; `tests/escort-intake-candidate.mjs` fresh25/25PASS,0skip, exit0 with the two required fixture environment variables. | No repair needed. Five-file inventory below/in stabilization review preserves retired frozen gates honestly. |
| Prior current-release checks | **VERIFIED retained evidence**, not rerun: lint0errors/0warnings; frozen install/typecheck/npm test/build passed; Node145,SSR3,UI24,final-image91,production35. Python45run=43PASS/**2SKIP**. | Do not sum overlapping groups or label unexecuted tests PASS. |
| Supplied four original exports | **BLOCKED OWNER INPUT:** reviewer confirms all four supplied ZIP hashes match originals; the ZIP/exports are not mounted in this VPS session. Attachment directory for this request is empty. Scoped filename search,5261 small retained JSON objects and138 source/config JSON members in retained baseline/current encrypted backups found no matching original attestation. Those two backup members matched their enclosed manifests; this was an in-memory proof search, not off-host recovery. This is a transfer/access dependency, not “unrecoverable.” Neither import test was rerun without its inputs. | Supply private VPS ZIP path. Extract outside Git/web roots to0700 directories/0600 files, verify all original SHA256 values and exact filename map in protected `original-input-dependencies.json`. Run conversation test without waiting for Accounts proof; Accounts test additionally needs ORIGINAL matching private attestation. Never reconstruct it from retained summary fields. |
| Current-image acceptance window | **VERIFIED — bounded acceptance:** as of `2026-10-16T19:19:13.804365+00:00`, 68.22min since actual start and 10successful completed supervised cycles; required>=60min AND>=10cycles. Existing receipts/journals are correlated to this exact container/image, excluding old-image runs. Error/held/canonical-write counts0; restart0/OOMfalse. | Both conditions are met; retain the same producer/timer. This bounded observation is not long-term reliability or complete upstream/live-arrival acceptance. |
| Local producer, lag and replay | **VERIFIED bounded observations:** same systemd producer/flock/advisory lease;709 derived progress rows,13old cursors retained; exact accepted-source replay receipts previously PASS. Current per-cycle receipts distinguish new natural evidence from replay; all canonical-write counts0. Snapshot age/cadence/resources in protected operations receipt. VERIFIED natural live review intake:1incoming native message identity at18:59:51UTC was retained as2different projection/native source revisions and2PENDING Accounts cases in SUBSEQUENT_TAIL. Both are identity-unproven INCOMING, not Admin payment instructions; parser/ledger authority remains denied, canonical writes0. No authorized positive live Accounts/client/release arrival was observed. | Upstream backlog/completeness remains unknown; do not interpret a clean scan as complete history. Historical170.6s gap is timestamp-verified; trigger remainsUNKNOWN. |
| Review originals and authenticated SSE | **VERIFIED:** fresh targeted14checksPASS, exit0: actual named UI login; exact Accounts/Client original and filtered API/export agreement; SSE>20s refresh/reconnect; no page exception. Temporary driver failures retained separately; no app-code repair. | Actual owner decisions are still required; post-decision canonical/UI/assistant/export/replay agreement isNOT TESTED. |
| Scheduled daily backup | **NOT TESTED — NOT YET OBSERVED:** timer active, LastTrigger empty, service never started by timer; configured02:15UTC/08:15Dhaka plus<=120s jitter; current next trigger02:15:59UTC/08:15:59Dhaka on17October. Manual backup is not timer-execution proof. | After real scheduled firing, inspect journal/completion/output, decrypt-test actual bundle and repeat guarded EMPTY disposablePG16 comparison if new contents/path need validation. Keep timer unchanged. |
| Existing encrypted local recovery | **VERIFIED local evidence only:** latest `recovery-20261016_181441.tar.gpg`, SHA256 `d56efe8805f035701e01eee0b086cdad333dfb4ffaa50222882c63eb38aa3506` recomputed; prior decrypt/29-table PG16 restorePASS receipt retained. Backup ran18:14:41–18:15:26UTC and predates the later source arrivals; it is not a snapshot of newer production state. Existing key fingerprint `4BA1F3444E345E073231546EA6DC500B46CE4F6A`; keydir0700/bundle0600; latest7matching bundles plus separate baseline preserved. | No redundant backup/restore/key export was run. Reuse current key; manual bundles consume retention slots. Any independent restore must compare its enclosed fingerprints, never force newer production totals back to this recovery point. |
| Independent/off-host recovery | **BLOCKED OWNER INPUT / NOT TESTED:** no authorized destination, independently protected owner key-copy method or independent restore receipt. Local29table proof is not off-host recovery. | Owner supplies destination + authenticated access/verified host + separate protected key custody. Then follow existing root-only temporary export procedure, transfer encrypted bundle/checksum, verify key fingerprint/decrypt/EMPTY disposablePG16 enclosed fingerprints at independent target; preserve VPS key and delete export only after confirmed receipt. |
| Separate old Sites privacy finding | **BLOCKED OWNER INPUT:** exact `appgprj_6abe6addac2c8191b8bacff524762237` fresh get_site returnedNOT_FOUND404 in this connected account; list_sites sees2other projects, no exact match. Reviewer-reportedv10/PUBLIC/revision7 is not freshly reverified. AnonymousHEAD returned307; body not read, denial/data visibility not established. | Owner-connected Sites account plus explicit disposition: owner/approved users or retire. Apply only approved native access control and verify policy/anonymous denial. No redeploy, DNS workaround or claim of closure. |
| Real business acceptance | **BLOCKED OWNER INPUT:** one fully evidenced Accounts instruction and one historical Client/duty example are shown by existing Review UI and retained root-only with exact requested decisions. Accounts gate receipt verifies explicit Admin01880446111, cached paired identity/verified Admin role, direct outgoing direction and native verified Accountant role/binding before parsing; separate employee/payout fields and exact positive minor units are retained. This is not fresh remote identity or payment proof. Client still lacks historical source authority/master name; no new Draft accepted. All628release cases lack endShift;0have all endDate/endShift/releasePoint. | Owner inspects exact protected originals and acts on one case at a time. Accounts acceptance stays instruction/REVIEW, no paid/posting assertion; verify all resulting linkage/read models/replay only AFTER actual decision. Client needs source-bound identity and source-supported master name; genuine complete release evidence is missing. No bulk approval/queue deletion. |

Protected new receipts: `/var/lib/vps/al-rifai/release-evidence/20261016/stabilization/verification-gaps-20261017/` (0700,files0600). Original earlier42-file manifest is unchanged. Actual lease observation at18:53:08UTC recorded exactly1supervised scanner,1producer connection and1advisory lock held by that producer (`lease-observation.json`); no second consumer was started. Owner originals/screenshots/case IDs stay private in `owner-acceptance-packet-private.json`, `owner-review-ui-private.json` and the two `*-owner-review-private.png` files; no raw messages/proof/credentials were added to Git. Session login/logout in the targeted browser test and normal existing-producer progress are the only incidental runtime writes; no owner/business decision, WhatsApp session change, outbound action or cursor reset occurred.

July1,2026Dhaka inclusive → October17,2026Dhaka exclusive remains the historical scope; later messages are a separate live tail. Missing original media/OCR, complete upstream/pre-journal history, fresh remote WhatsApp identity and hypothetical paired-session disaster recovery remain **NOT TESTED/unavailable evidence**, not PASS. Financial/outbound restrictions are intentional and unchanged. No optional feature work was added.

See [exact verification and five-file inventory](STABILIZATION_REVIEW.md).

# Retained previous stabilization — operational status superseded; owner policies/evidence preserved

**DEPLOYED HEALTHY; bounded stabilization verified, full business/disaster-recovery acceptance remains incomplete.** Updated `2026-10-17T00:16:20.424999+06:00`. Existing private app `https://app.al-rifai.iamazim.com/review`; service `al-rifai-app-1`. Application code `6791a4ba954034b85f3dc26f6926292f61078f98`; image `sha256:626b0ab8c62e60d4fdc8c838630dd566316973d7df3dd44af6fdb6e741923d85`. Later compose/documentation commits describe this code and do not imply a different running app.

- **Verified:** exact initial lint20 errors/45warnings repaired; unchanged `node scripts/lint.mjs` exit0, **0 errors/0 warnings**. No new ignores, rule suppression, lint-command or dependency/lock changes. Frozen pnpm install, `npm test`, `tsc --noEmit`, Next webpack production build and image smoke exit0.
- **Verified:** focused Node145/145; current login SSR3/3; real-component lifecycle browser24/24. Python45 run:43PASS/**2 original-input skips**. Fresh final-image browser50, workflow/API25 and canonical agreement16PASS; auth-role/revocation controls, read-only recovery, lease contention, poison/cursor hold and two exact accepted-source replaysPASS. Final qualifying image log:0 errors/0 uncaught exceptions. Graceful disposable stop:SIGTERM143, no SIGKILL/OOM/uncaught exception. These are current runs, not reused old totals.
- **Verified production:**35 fresh trusted-TLS checksPASS (named auth, secure host-only cookie, cross-origin/missing-CSRF denial, desktop/mobile viewport, canonical reads/private originals, exports and two-session SSE/reconnect). The pre-deploy named session survives recreation. Only session operations and deliberately denied empty mutation probes were performed; no real case approval or cash grant.
- **Verified preservation at cutover:**24 cash instructions,520000minor units=BDT5200;5Programs;13old progress records;15migrations0000–0014;0owner decisions/assignments/postings/movements. Complete cash/program/progress/decision/policy/ledger snapshots matched before/after. No database migration/restore. Original PG and both bridge container IDs/images/start times/restart0 remain unchanged. Genuine later arrivals are counted separately, never overwritten to match an old total.
- **Verified operations:**63 real scanner receipts since11:04:21UTC16October; statuses `{'REVIEW_READY': 63}`; latest snapshot `2026-10-16T18:12:31.562+00:00`, status `REVIEW_READY`. See protected operational receipt for exact start/finish, lag/resources and subsequent runs. Same single systemd producer, flock/advisory lease and timer5min after finish; no competing bridge/checkpoint reset. One initial historical170.6s start gap was observed; its trigger is not proven. Later intervals follow the configured timer with systemd scheduling delay. The old-image multi-hour record is not a new-image long-duration soak. July1Dhaka inclusive→Oct17Dhaka exclusive remains fixed; later arrivals form a separate tail.
- **Verified local recovery:**New-image encrypted backup `/var/backups/vps/al-rifai/recovery-20261016_181441.tar.gpg`; SHA256 `d56efe8805f035701e01eee0b086cdad333dfb4ffaa50222882c63eb38aa3506`; actual29-table restore/decrypt PASS at `2026-10-16T18:15:26.450761+00:00`. Existing approved GPG key reused. **Owner action / Not tested:** no trusted off-host destination or independent key/backup custody receipt; same-host encryption is not off-host recovery. Root key directory0700/public export0600. Latest7 matching bundles retained, separate baseline excluded. Daily02:15UTC timer configured; its next scheduled firing is not a verified past daily run.
- **Not fully verified:** two byte-identical original-export tests (raw four-source exports and original private attestation absent); preserved historical qualification suites pin retired source/reader fixtures and are not relabelled PASS. Real owner business acceptance has not occurred. Fresh remote WhatsApp identity, complete upstream/pre-journal history, missing original media/OCR, hypothetical paired-session recovery and external disbursement remain unproven. Separate Sites PUBLIC-audience finding is supplied-review evidence, not a fresh lookup; no Sites audience/domain change occurred.

[Exact repairs, source hashes/dependencies, historical-test limits, owner-copy procedure and rollback boundaries](STABILIZATION_REVIEW.md). Protected current receipts: `/var/lib/vps/al-rifai/release-evidence/20261016/stabilization/`. Prefer qualified same-image read-only recovery when investigation is needed; retain the compatible5ab fallback with its known older defects, all newer data/session/cursors and additive schema. Never restore a stale baseline over newer production.

# Historical release records — superseded operational statuses

# Historical production state — 16 October 2026 (Asia/Dhaka)

**R1 REPAIR ACTIVE, NOT ACCEPTED.** Owner-approved 0013 column grants/receipt
committed; ledger14 and 0012 checksum preserved. Same f88 candidate live, financial
OFF. Five real-source Drafts and two Review confirmations; no historically
qualified confirmation, assignment or posting. Original24 cash rows unchanged.
Actual desktop/mobile layout live browser44 PASS, not physical-phone acceptance.
Old v1-only rollback image is incompatible; recovery baseline is the same approved
v1/v2-capable candidate. Retain additive schema/grants/receipts/source facts.
See [current execution, acceptance limits and source-only follow-ups](R1_ACTIVATION_RESULT.md)
and [sealed manifest](../data/workflow-release.json). Older preparation/rehearsal
entries below are historical evidence; they do not override this current state.

# AL-RIFA’I — source-linked Cash ও Escort Roster release

15 October 2026, Asia/Dhaka. **BUILT CANDIDATE; production migration/deployment হয়নি। পূর্ণ business completion নয়।**

এই release বিদ্যমান named login, PostgreSQL `alrifai`, source refs/events, scoped broker এবং canonical `programs`/command boundary ব্যবহার করে। নতুন app, auth, raw-message mirror, WhatsApp bridge, source-copy qualification tree বা test database তৈরি হয়নি। Historical packages read-only রাখা হয়েছে। Exact file hashes/diff: `data/workflow-release.json`, `data/workflow.patch`; task-পূর্ব source baseline: `data/workflow-before.json` ও `data/workflow-before.tar.gz`।

## প্রকৃত পরিবর্তন

- Cash register-এর default reader এখন typed `cash_instructions` ও একক `cash_postings` থেকে পড়ে; `site_cash_archive` explicit পৃথক historical scope। Outgoing paired Admin account → current approved Accountant scope ছাড়া নতুন payment intent হয় না। Incoming Accountant summary financial row নয়। Native evidenced PN/LID alias ব্যবহার হয়; display name authority নয়।
- v2 parser independent ordered blocks, exact minor-unit amounts, explicit purpose, source role/binding evidence এবং parser revision রাখে। v1 reader/facts অপরিবর্তিত থাকে। Operation identity account/chat/message/block থেকে; parser/role evidence revision সেই operation-এর দ্বিতীয় payment নয়। সমান genuine message/block আলাদা থাকে। Source edit একটি নতুন evidence revision ও linked correction review; posted fact overwrite নয়।
- Cash table-এ সময় (ঢাকা ও retained original instant), employee ID/name/alias, distinct payout, purpose/method, intent/review/posted state, evidence reason, source details, employee filter/statement, date/search/sort, pagination এবং exact page totals আছে। CSV, print ও details বর্তমান source আবার যাচাই করে। Unknown/changed/revoked source মোটেও ঢোকে না। Candidate-এর bounded verified-set limit 200 rows/400 refs; বড় scope স্পষ্টভাবে narrower filter চায়।
- একই canonical command boundary-তে incomplete Client draft allocation, unique prior draft confirmation, evidence attachment, explicit actual start/cancellation/correction/restart/replacement/release যুক্ত হয়েছে। `programs`-ই lifecycle owner; `roster_source_links` evidence linkage, বিকল্প roster নয়। Assignment snapshots predecessor ও source refs রাখে। Confirmed actual duty নয়; release payment/completion নয়। Unknown/unrelated sender source review-তে থাকে। Canonical prior source command-এর আগেও পুনর্যাচাই হয়।
- Roster table canonical records ও আলাদাভাবে labelled unlinked source reviews দেখায়। Mother/lighter/mobile/name, inclusive date overlap, incomplete/cancelled/replaced/unlinked reports, retained history ও release details আছে। Missing fields-কে missing program বলা হয় না।
- তিনটি exact wa-01 group ছাড়া group history reader খোলে না। Native principal-এর chat/content/participant allowlist ও privacy barrier দুইই বাধ্যতামূলক। Group chat বা member name নিজে Admin authority নয়। Non-release chatter lifecycle writer-এ যায় না।
- Socket creation-এ opt-in named UID10001 rw ACL পুনঃপ্রয়োগ হয়। Candidate compose app-কে dedicated socket-only directory mount করে, যাতে inode recreation দেখা যায়। Parent/store/call directory access, world-write বা TCP listener যোগ হয়নি।
- একটি SECURITY DEFINER exact-money writer আছে; web runtime-কে financial tables-এর INSERT/UPDATE grant দেওয়া হয়নি। Current actor/role/scoped capability/epoch, instruction hash, account, approval basis/version, operation lock, দুই balanced leg, replay এবং linked reversal uniqueness বাধ্যতামূলক। Admin manual entry একই writer-এ সরাসরি; Staff entry exact-version Admin action পর্যন্ত pending। Historical send-success proof ছাড়া stored-history posting স্পষ্টভাবে অস্বীকৃত। Posting feature flag default OFF এবং financial registry grants এখানে যোগ হয়নি।
- Source coverage/sync controls Cash/Roster-এ আছে; bounded/resumable scan ও old-edit rescan native cursor থেকে আলাদা। No-source-scope-কে “কোনো message নেই” বলা হয় না।

## বর্তমান runtime ও source evidence

`data/workflow-runtime.json`-এ final read-only catalog, migration ledger ও service identity। 0000–0011-এর ১২টি checksum canonical source-এর সঙ্গে মিলেছে। Actor guard SECURITY DEFINER, `search_path=pg_catalog`, PUBLIC EXECUTE নেই। Approved post-0011 correction নতুন 0012-তে forward reconciliation হিসেবে আছে; মূল 0011 বা তার checksum বদলায়নি।

Production-এ **৫১টি v1 extraction/source reference, ০ canonical program, ০ archive cash row, ৫৪ snapshot**। নতুন typed business tables/migration এখনও প্রয়োগ হয়নি; এগুলোকে live Cash/roster record বলে রিপোর্ট করা হয়নি।

Existing app reader দিয়ে দুই direct chat-এ ৩০+৩০ message read: Accountant sample-এ ২৪ labelled payment block; Client sample-এ ২ vessel block। Native cursor/DB/business state বদলায়নি। `data/workflow-runtime-read.json`।

Existing owner-reader-এর আলাদা bounded audit দিয়ে তিন exact group-এ ১০টি করে message read; ২/২/৩টি observed participant ও মোট ৭ media reference দেখা গেছে। কোনো body log, media download বা OCR হয়নি। `data/workflow-group-read.json` ও proposed scope manifest `data/workflow-scope-plan.json`। Audit reader credential app-কে দেওয়া হয়নি। এই page samples পূর্ণ stored/phone history count নয়।

## যাচাই এবং তার সীমা

- Existing compiler/typecheck এবং final Next production build pass। প্রথম 1.5GiB build worker SIGKILL হয়েছিল; 3GiB build-only envelope-এ pass। Production resource limit বদলায়নি।
- Focused Node cases: multi-block/sibling, incoming denial, distinct/replay/edit identity, paired PN/LID source authority, future Client, unrelated sender, release chatter, current-source revocation/changed hash, canonical confirmation vs actual duty, exact calculation/missing evidence। Existing workflow/source-register tests-ও pass।
- Focused Python native group/participant/privacy এবং socket configuration/new-inode ACL checks pass।
- Exact candidate image desktop/mobile Chromium-এ rendered table, ঢাকা সময়, employee filter, CSV revalidation, cached detail/count removal ও denied-user behavior pass। Screenshots `data/workflow-desktop.png`, `data/workflow-mobile.png` নিজে দেখা হয়েছে। **API synthetic ছিল; live business/browser/physical-phone acceptance নয়।**
- PostgreSQL extended-protocol **Parse-only** check pass; DDL execute হয়নি। এই check PL/pgSQL body execution, trigger/RLS integration, atomicity বা concurrent-session correctness প্রমাণ করে না। Prepared rollback-only rehearsal `scripts/workflow-sql-rehearsal.py`; এখনও চালানো হয়নি। Exact 0012 checksum release manifest-এ আছে।

## নির্দিষ্ট অবশিষ্ট সীমা

1. Production 0012/grants/schema execution এবং app/wa-01 candidate activation অনুমোদিত হয়নি। নতুন SQL bodies/constraints/RLS/atomic rollback/reversal/concurrent-session acceptance **NOT RUN**। Financial posting flag OFF রাখতেই হবে।
2. Current app native reader-এ ১০ direct scope, group scope নেই। Proposed exact groups/observed participant lists registry ও native profile-এ এখনও প্রয়োগ হয়নি। Observed participant membership কোনো business role/authority নয়। Older effective role bindings 14 October থেকে; historical authority নিঃশব্দে backdate করা হয়নি।
3. Historical `is_from_me` native SendMessage success প্রমাণ করে না। Missing transport success একটি technical evidence state; Accountant reply বা owner-এর নিয়ম পুনঃঅনুমোদনকে prerequisite করা হয়নি।
4. Source-linked text release/matching code আছে। **Media acquisition/OCR-to-release integration এই release-এ সম্পূর্ণ হয়নি**; native retained media ref পাওয়া গেলেও app reader-এর approved media tool/scope/actual bytes ছাড়া fake OCR/date বানানো হয়নি।
5. Exact dated-rate/attendance calculator আছে এবং unresolved state UI-তে যুক্ত। **বর্তমান canonical data-তে verified effective rate/attendance policy feeder নেই**; live payable calculation accepted নয়। Legacy food/duty defaults কার্যকর salary policy ধরা হয়নি। Source edit/correction reconciliation এবং predecessor-assignment-এর পৃথক late release এখনও explicit review দরকার।
6. **পূর্ণ saved/unsaved/unregistered contact directory inventory/frontend এই release-এ হয়নি**। বিদ্যমান verified subject list ও business scopes পুনর্ব্যবহৃত; unknown contact-কে Client/Employee বানানো হয়নি।

## পরের অনুমোদনযোগ্য সুনির্দিষ্ট action

প্রথমে শুধু canonical `alrifai`-এ **reviewed checksum-এর 0012 এবং synthetic fixtures-সহ এক transaction-এ rollback-only rehearsal**। Prepared command:

```sh
python3 /opt/vps/apps/al-rifai/scripts/workflow-sql-rehearsal.py --reviewed-sha256 <workflow-release.json-এর migration SHA256>
```

এই command-এ COMMIT নেই, migration ledger write নেই; temporary synthetic grant/instruction/posting/movement ও DDL একই transaction বন্ধে rollback হবে। চলমান app/wa-01/wa-02/PostgreSQL recreate হবে না। এটি Owner approval-এর বিকল্প নয়। Concurrent-session checks এই uncommitted DDL-এর ওপর সম্ভব নয়; approved persisted migration-এর পরে আলাদা bounded acceptance প্রয়োজন। আগে থেকে full completion বা financial activation দাবি করা যাবে না।

## পরবর্তী activation manifest ও recovery

`data/workflow-app.compose.yaml` ও `data/workflow-wa01.compose.yaml` **পূর্ণ candidate compose**, overlay নয়; image pin release manifest-এ। এগুলো production compose-এ প্রয়োগ হয়নি। App project `al-rifai`, service `app`; wa-01 actual project `vps-whatsapp-cap4-wa01`, service `whatsapp-wa-01`। wa-02 profile/service স্পর্শ করা যাবে না।

Socket activation-এ operator-কে `/var/lib/vps/whatsapp/wa-01/control/app-broker` socket-only directory owner10002 ও named UID10001 traverse-only ACL দিতে হবে; app-এ ওই directory read-only mount হবে। Existing broker clients-এর পুরোনো socket endpoint compatibility আলাদাভাবে যাচাই করে পুরোনো endpoint-এর approved symlink/connection config ঠিক করতে হবে। Store/parent directory ACL broad করা যাবে না। এই root/system action ও দুই service recreation আলাদা approval scope।

App/wa-01 rollback pins বর্তমান production fingerprints-এ আছে। Approved rollback-এ image/config ফিরিয়ে **শুধু সংশ্লিষ্ট service** recreate করা যাবে; paired stores, wa-02, PostgreSQL বা নতুন history restore/overwrite নয়। Additive tables রেখে writer flag OFF, current-source read fail-closed এবং forward repair নিরাপদ default। Destructive down migration/cleanup এই release-এর অংশ নয়। কোনো WhatsApp send, call reject, real payment, historical deletion বা package cleanup হয়নি।

Approval rule-এর উৎস: user-সংযুক্ত work order, Execution order 3: “Keep migration and exact grants explicit; no execution until covered by actual approval.” তাই implementation preparation-এর অনুমতি দিয়ে নতুন production DDL/rehearsal চালানো হয়নি। Exact generated transaction review-এর জন্য `data/workflow-rehearsal.sql`-এ রাখা হয়েছে।

## Rehearsal harness correction — 15 October 2026

Rehearsal preparation only; no production SQL, Parse-only database request,
migration, runtime grant change or service action ran during this correction.
`0012_business_workflows.sql` remains byte-identical at
`f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8`.

- Each original/replayed posting and successful/rejected reversal runs with the
  declared deferred constraints. Only after the complete function/DO operation
  does `SET CONSTRAINTS ALL IMMEDIATE` check pending constraints; the following
  `SET CONSTRAINTS ALL DEFERRED` restores the next operation's declared mode.
  No trigger, constraint definition or runtime privilege is weakened.
- Runtime UPDATE denial checks `ir_review_runtime`, absence of UPDATE privilege,
  expected SQLSTATE `42501`, and unchanged fixture amount. Registry RLS remains
  an independent zero-row check.
- Append-only trigger denial uses `RESET ROLE`, checks existing privileged UPDATE
  authority, then expects SQLSTATE `55000` and the exact existing append-only
  trigger message. The fixture amount must remain unchanged. No UPDATE grant is
  added to the runtime role for this check.
- Generator/runner is safely importable. `--prepare-only` generates local SQL;
  `--check-only` verifies migration/runner/SQL/manifest checksums and byte-for-byte
  generator parity without launching Docker or opening a database. Execution
  consumes the exact reviewed SQL artifact after those same checks.
- `data/workflow-release.sha256` seals the final manifest; the manifest records
  the runner and SQL hashes. `data/workflow-rehearsal-offline-tests.log` contains
  the six focused offline tests, including tamper rejection before execution.
  This validates harness preparation, not actual PostgreSQL denial/constraint
  behavior. Production rehearsal and concurrent-session acceptance remain NOT RUN.

Local preparation/check commands (neither runs SQL):

```sh
python3 scripts/workflow-sql-rehearsal.py --prepare-only
python3 scripts/workflow-manifest.py
python3 scripts/workflow-sql-rehearsal.py --check-only --reviewed-sha256 f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8
```

The separately authorized execution command is still in `nextApproval.command`;
this correction does not authorize executing it.

## Authorized canonical rollback rehearsal — 15 October 2026, 17:14 UTC

The Owner explicitly authorized one execution on canonical `alrifai`, with no
COMMIT, persistent migration, real financial posting or service restart. The
reviewed runner executed exactly once and returned `ROLLBACK_REHEARSAL_PASS`
(psql exit 0). The transaction ended with `ROLLBACK`; no retry occurred.
An observation wrapper recorded the attempt and return code without changing
runner arguments or SQL bytes. The reviewed SQL, runner and migration are
unchanged. The original manifest is preserved in
`data/workflow-rehearsal-reviewed-manifest.json` with SHA256
`3eddd3d4b6e407aa252eaf60de66e52fd8574e9ef77195e9e3435f8c6908b292`.

All ten SQL checks passed, including completed posting/reversal balance,
exact replay, runtime UPDATE permission denial (`42501`), privileged append-only
trigger denial (`55000`), registry RLS, current grant revocation, unique linked
reversal and failed reversal atomicity. Only synthetic fixture posting occurred
inside the rolled-back transaction. Concurrent sessions were not tested.

Independent before/after reads both ended with ROLLBACK. All 14 application
tables retained their row counts and complete-row digests; all nine captured
schema/ACL/role metadata categories matched. The 12-entry migration ledger and
source checksums, actor guard definition/security/ACL, and four service
IDs/images/start times/restart counts matched. All six candidate tables and both
new functions remain absent. Synthetic command and grant counts are zero.
Migration 0012 remains unapplied; runtime privileges were not increased.
These are logical state comparisons, not byte-level assertions about PostgreSQL
WAL/statistics or independently syncing WhatsApp stores.

Evidence: `data/workflow-sql-rehearsal.json`,
`data/workflow-rehearsal-execution.json`,
`data/workflow-rehearsal-before.json`, `data/workflow-rehearsal-after.json`, and
`data/workflow-rehearsal-state-comparison.json`. The read-only capture and
execution observation helpers are archived alongside the evidence. The release
manifest seals these artifacts and distinguishes this completed single-session
check from pending concurrency and live business acceptance. Its generator now
retains execution evidence only when its SQL/runner/migration hashes match.

The one-run authorization is consumed. No further rehearsal, COMMIT, persistent
migration, real posting or service action is authorized by this result.

## 2026-10-16 owner reconciliation release (current canonical runbook)

The owner's COMPLETE CURRENT VPS APP instruction supersedes earlier audit-only,
one-run and backup-deferred restrictions. This is the existing Next.js app and
canonical public/identity_review_candidate database, not the standalone reference
stack. The app source baseline is reconstructed from the current working tree,
including five pre-existing changes; baseline Git d9be28c is not a recovered
original image commit. No source or private data has been pushed externally.

Reference pins: Al-Rifai-VPS 406e8d495206897eee17a9f36abfaecf26c28586;
fazle-core 1838619b644dc83f4ca723d3442d94435e6050f1. Adapted concepts:
owner review, effective source/role management, stable import preview, protected
originals, canonical reports and read-only structured answers. No wholesale
upstream installation. Existing Escort parser retains its prior selective Core
adaptation. No top-level Core license was found; no additional wholesale copying.

### Owner operation

Open https://app.al-rifai.iamazim.com/review, retain the existing outer private
access and named owner login. Credentials remain in the established root-only
configuration; this document contains none. Review / July reconciliation is the
entry tab. Accounts precedes Client roster and group release in the producer.
Filter account/domain/status, open a case, inspect actual sender/receiver/group
participant, source time, full original/quote, revision, fields and match evidence.
Unknown identity requires a separate source-bound identity decision with a verified
person before accepting business changes. Creating a current binding does not
back-authorize old messages. Group names/membership are not verified senders.

Select Link for an established exact record; enter target revision for Program
changes. Approve New creates a Draft or REVIEW instruction, not a confirmed duty
or externally paid transfer. Correct/Close requires the existing target/current
revision. Release also requires actual end date, end shift, release point and
checked release evidence; voucher/absent bytes cannot substitute for a slip.
Reject and Clarify append decisions. Retries retain operation identity; altered
retries and stale revisions conflict. All unresolved historical cases remain
pending owner decisions; the agent does not accept real candidates for the owner.

Cash and Escort Roster show canonical database rows with search/date/status/sort,
full matching CSV and print/Save as PDF. Add and Edit use explicit Save; Cancel
writes nothing. Program cancellation/restart preserves identity/history. The old
five Drafts retain unresolved historical-authority warnings. Employee ID and payout
mobile are separate; phones alone do not establish employment. The original 24
REVIEW instructions are not paid records. Posting/reversal activation and grants
remain unchanged; missing cash.post/cash.reverse requires the owner's separately
scoped business authorization, not an agent-created blanket grant. Existing
restricted cash endpoints continue to fail closed without those grants.

Management creates verified people, Accountant/Client/other scoped roles, multiple
contacts, effective binding replacements, deactivation and history without a
redeploy. Admin/SUPER_ADMIN/staff/grant escalation is deliberately excluded. Verify
employment evidence before assigning an EMPLOYEE role. Source-bound historical
identity confirmation is separate from new role validity.

Import preserves original TXT/CSV/JSON/XLSX bytes and hash. Preview distinguishes
new/existing/changed/review, and Confirm only creates review cases. Stable CSV row
IDs are preferred. Ambiguous text anchors and edited sources require correction
review, never silent duplicate payments. Read-only assistant supports phone,
YYYY-MM-DD, status and quoted vessel/name with canonical record references.
It has no mutation, send, payment or external model tools.

Private full reconciliation JSON includes all matching cases and complete chat
coverage. Private originals contain available business phone numbers and unmodified
messages/quotes. Keep these downloads private. No credentials, QR, device/session
keys or message media acquisition secrets are included. Cached original attachment
bytes were absent at release inspection; absent media is explicitly marked and
no OCR/signature is invented. Missing cache does not mean an event never happened.
Older immutable archive scopes/hashes/rows are reviewed separately and not summed
as new live business records. Archived original source dates can be unknown.

### Recovery, supervision and readiness

Owner-approved GPG recovery key: root-only /etc/vps/recovery/al-rifai-gnupg;
public key /etc/vps/recovery/al-rifai-public.asc. Export an independent private-key
owner copy using a secure owner-controlled destination. None was supplied, so
OFF-HOST/CUSTODY NOT CONFIGURED; same-host encryption is not disaster recovery.
Baseline bundle is retained separately from daily seven-bundle retention.
Daily timer alrifai-recovery.timer runs 02:15 UTC plus up to120s jitter; service
alrifai-recovery.service. Script scripts/operations/recovery.py verifies exported
snapshot PG16 dump, WAL-aware SQLite backups and encryption/decryption checksum.
--rehearse restores ONLY a newly empty exact alrifai_restore_validation timestamp
target, single transaction/stop-on-error, compares all table multiset hashes,
ledger, cash totals/status and links, then removes that verified disposable target.
Never restore production with this rehearsal. No cloned paired session is started.

alrifai-reconciliation.timer runs one readonly-cache producer five minutes after
its previous finish. flock and PG advisory lease prevent competing producers.
It invokes the existing app container, never registers a second MCP client or
bridge. Both native stores remain owned by their original bridge. Old n1/rowid
cursors are preserved; separate reconciliation positions advance after durable
original/case receipts. Poisoned items retain encoded originals and visible retry
cases, hold that chat position and do not block other chats. Full bounded rescan
supports changed revisions, missed tail and replay, with zero automatic business
posting/closure. Only already cached local messages are read.

Use systemctl status alrifai-recovery.timer alrifai-reconciliation.timer and
python3 scripts/operations/status.py for content-free local readiness. Private
aggregate receipts: /var/lib/vps/al-rifai/reconciliation/last-success.json;
backup receipts: /var/backups/vps/al-rifai/last-success.json and last-failure.json.
A newer failure or stale success is not healthy. No external notifications.

### Deployment and rollback

Before every cutover: encrypted consistent backup, PG16 frozen migration rehearsal,
frozen lock install/security audit, tests/typecheck/build, actual container/API and
browser qualification; record current image/config/migration SHA. Apply only new
SHA-checked additive migrations in one transaction. Pin compose.yaml to the tested
immutable image; docker compose up -d --no-deps app changes this app only. Preserve
ports, TLS, Basic + named auth, private networks, all secrets/session/cache mounts.
No migration-on-startup reference command is used. Preserve incoming bridge tail.

For regression stop the reconciliation timer and inspect post-cutover receipts.
Before any new owner canonical writes, old f88af2e image/config is the preserved
baseline fallback; additive 0014 can remain. After owner writes, prefer the new
image with ALRIFAI_RECONCILIATION_READ_ONLY=1 (all non-session API mutations denied)
while repairing; it still displays the new records/evidence. This mode is tested
only in the disposable target before claiming qualification. Old UI may not display
new reconciliation semantics, so do not promise unconditional old-image rollback.
Never restore stale database/session/checkpoint backups over newer live state.
Do not restart another native writer or re-pair as routine rollback.

Release evidence is stored root-private under the dated implementation directory
and summarized below after actual cutover; synthetic mutations stay isolated.

### Verified final release evidence — 2026-10-16T17:07:15.923143+06:00

Existing service: al-rifai-app-1; code commit `24b28299092daba1409d962fb6b2a01c082299f8`; image `sha256:5ab90e01d6b00b8e53670f7798678f3103d09135f4bddf533e7934909a20d2b0`. Canonical source /opt/vps/apps/al-rifai; no remote push. Additive0014 SHA256 804336d4c6cbdd82d065c515f06f59009cbd934edb4074aa2c0d69160fc96942; ledger15, old0000–0013 unchanged. Source reconstruction is explicitly identified above. Old ignored host node_modules/.next remain preserved historical build outputs, not the serving runtime; build fresh with the frozen pnpm lock before any future release.

Production full-row preservation: {'cash': True, 'programs': True, 'progress': True}. Programs 5 Draft; assignments 0; cash24 REVIEW, 520000 minor / BDT5200, digest0332e81ab3ac99a58bf10e93e3c85917; postings 0, movements 0; verified EMPLOYEE relationships 0; agent owner decisions 0. No transfer/send/reply/automatic real historical acceptance.

First actual cached snapshot cutoff 2026-10-16T10:48:34.749Z (UTC; add6h Dhaka), requested fromJuly1Dhaka throughOct16 only up to actual snapshot. Later supervised receipts process the arriving tail; no future messages included. Complete per-chat earliest/latest/raw/candidate coverage is in the authenticated private full export, not these aggregate notes. Cache completeness is not upstream history completeness.

| Month | wa-01 raw unique messages | wa-02 raw unique messages | Accounts candidates | Client/roster candidates | Release candidates |
|---|---:|---:|---:|---:|---:|
| 2026-07 | 1994 | 730 | 397 | 394 | 145 |
| 2026-08 | 5626 | 2674 | 870 | 1433 | 196 |
| 2026-09 | 5270 | 8735 | 1213 | 3444 | 256 |
| 2026-10 | 2016 | 873 | 981 | 716 | 31 |

Raw message rows27918 across325/950 chats (wa01/wa02). wa01 has334 additional available journal envelopes/revisions. Invalid dates0. First native originals8783, native candidates10076, exact source-evidence links7; these are not seven paid transfers. Distinct historical archive cases13322 are separate/overlapping scopes, not new live payments/programs. First total23398 cases,23391 awaiting owner decisions; real canonical new business writes/closures/postings0. Current persisted counts below supersede this initial snapshot when live arrivals occur.

| Domain | Category | Status | Full case count |
|---|---|---|---:|
| ACCOUNTS | EXACT_SOURCE_MATCH | LINKED | 7 |
| ACCOUNTS | HISTORY_ONLY_NO_CACHED_SOURCE | PENDING | 11316 |
| ACCOUNTS | IDENTITY_AUTHORITY_UNRESOLVED | PENDING | 3312 |
| ACCOUNTS | NO_BUSINESS_MATCH | PENDING | 72 |
| ACCOUNTS | POSSIBLE_ARCHIVE_SOURCE_MATCH | PENDING | 1353 |
| ACCOUNTS | SOURCE_REVISION_CHANGED | PENDING | 70 |
| ESCORT | HISTORY_ONLY_NO_CACHED_SOURCE | PENDING | 653 |
| ESCORT | IDENTITY_AUTHORITY_UNRESOLVED | PENDING | 5945 |
| ESCORT | NO_BUSINESS_MATCH | PENDING | 22 |
| ESCORT | SOURCE_REVISION_CHANGED | PENDING | 20 |
| RELEASE | INCOMPLETE_RELEASE | PENDING | 628 |

Source numbers, full original text/quotes, actual sender/receiver/participant, case revision, original time, matches/differences and source policies are deliberately visible only in the authenticated owner queue/private export. Native media placeholders143, quoted-context references3 at first complete intake; both outboxes contained0 original files. No OCR or signature claims; actual media availability must be rechecked if later downloads occur. General logs contain no raw message bodies/contacts.

Actual commands/results: pnpm install --frozen-lockfile --ignore-scripts exit0 (isolated source), pnpm audit --prod --json exit0 / zero reported production JS advisories after Next16.3.8; npm test exit0; tsc --noEmit exit0; Next build --webpack exit0; docker build/smoke exit0. tests/reconciliation.mjs9 PASS (including split UTF8), tests/replay-metrics.mjs1 PASS, business-workflows PASS, Python suite44 run,42 passed/2 original-input-dependent skips; backup/scan guards PASS. PostgreSQL16 frozen0014 restored-clone rehearsal PASS. Final isolated browser 50 checks PASS; additional API 22 checks PASS; same-image read-only rollback boundary PASS. Real trusted-TLS production browser 32 checks PASS; no synthetic business mutations in production. Raw npm ci/upstream247 checks were not claimed; current project uses pnpm lock.

Lint exit1:20 inherited errors/45 warnings under patched Next/React rules (same-linter reconstructed baseline:20 errors/41 warnings;4 additional warnings remain), mostly existing ref/effect patterns and a legacy qualification test variable; introduced lint errors removed. This is an explicitly pending noncritical quality check, not a green lint claim. Long-duration soak, fresh WhatsApp remote profile lookup, upstream complete history, actual attachment/OCR availability, paired-state restore/re-pair, external bank/mobile disbursement and off-host recovery remain Not tested/not configured. Cash posting/reversal grants/activation remain owner decisions.

Recovery:29-table actual post-release PG16 restore fingerprint PASS at 2026-10-16T10:50:50.709651+00:00, SHA256 53a61f429d2232b9a03f7bd746aab853b090f4d99538866ceea650f6b29a52f9, encrypted archive /var/backups/vps/al-rifai/recovery-20261016_105040.tar.gpg. Initial20-table baseline including original f88 image also retained at /var/backups/vps/al-rifai/baseline-20261016_085021.tar.gpg. Encryption/decrypt roundtrip PASS; SQLite quick_check both accounts PASS. Daily08:15Dhaka plus<=120s jitter, retain7 daily bundles; independent baseline excluded. Off-host and owner key custody NOT CONFIGURED; owner must store independent recovery key securely.

Both original bridges connected via authenticated local health. Restart policy unless-stopped set without bridge restart; original bridge IDs/start times and restart0 preserved. App-only restart/replay verified; old13 progress records unchanged; no competing MCP client/native writer and no pairing/logout/outbound activation. Runtime producer uses flock and advisory lease; one timer five minutes after finish. Private per-run receipts and final-safe aggregate evidence reside in /var/lib/vps/al-rifai/reconciliation and /var/lib/vps/al-rifai/release-evidence/20261016. Recovery backup includes source Git bundle and scheduled units.

Use the tested same-image read-only recovery mode if newer owner writes require investigation. Previous compatible images are retained; never overwrite newer DB/session/checkpoints with baseline restores. Disposable test container/database removed after preserving test evidence; no new persistent app/PostgreSQL service created.

Final supervised receipt cutoff **2026-10-16T17:09:17.760000+06:00 (Asia/Dhaka)**: replay new cases/originals/archive cases0, processing errors0, canonical business writes0; persisted exact source-evidence links7. Current complete original count 22105; cases 23398; owner decisions0. Old cash/program/progress complete rows remain equal. App recreation retained the existing named owner session without relogin;32 real trusted-TLS/browser checks PASS after final5ab image;50 isolated browser and22 workflow checks PASS.

Native source coverage, not an upstream completeness assertion: [{"account": "wa-01", "nativeJournal": {"available": true, "kindsInWindow": {"revoke": 5, "message": 286, "unsupported": 53, "undecryptable": 6}, "eventsInWindow": 350, "olderRevisions": "Not guaranteed before journal installation", "invalidNativeDates": 0, "unprojectedOriginalKinds": {"revoke": 5, "unsupported": 8, "undecryptable": 3}}}, {"account": "wa-02", "nativeJournal": {"available": false, "kindsInWindow": {}, "eventsInWindow": 0, "olderRevisions": "Not guaranteed before journal installation", "invalidNativeDates": 0, "unprojectedOriginalKinds": {}}}]

Unprojected counts represent missing cached originals, not invented message text. These per-source nativeKinds/unprojectedNativeKinds are retained in protected complete export sourceCoverage and run snapshot evidence. wa02 has no native journal in this cache, so pre-edit originals remain unproven.

Final image-inclusive encrypted backup/29-table restore PASS at 2026-10-16T11:08:07.096079+00:00; archive /var/backups/vps/al-rifai/recovery-20261016_110744.tar.gpg; SHA256 `b41064a5f5eb6fc94e7f838fb571019478064d2c5b4c11b043807e48dea96c7e`. Original and final app images preserved. Canonical source has a later operations-only scanner coverage commit728c6ee and documentation receipts beyond runtime code24b2829; no application source mismatch is implied by docs/host scanner changes. Same-linter baseline comparison:20/41 errors/warnings, final20/45, new error locations0. Two Python skips require original private import bytes/attestation, not synthetic stand-ins.
