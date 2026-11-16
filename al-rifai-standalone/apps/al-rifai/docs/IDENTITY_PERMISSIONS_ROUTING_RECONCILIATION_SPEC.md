# AL-RIFA’I — Identity, Permissions & Routing Reconciliation Specification

Planning baseline: **12 October 2026, Asia/Dhaka**. Implementation qualification:
11 October UTC / 12 October Asia/Dhaka. Authority: the Owner's subsequent
**“PLEASE IMPLEMENT THIS PLAN”** instruction authorizes offline implementation;
the plan's production approval/integration gates remain in force.

**Delivered:** an inactive identity/capability, named-authentication,
registry/evidence/review, API/UI and read-adapter candidate within the existing
Next.js application. **Production activation and integration remain BLOCKED.**
No parallel Escort parser, operational ledger or Python service was introduced.

Normative precedence: current versioned Owner policy → approved application/data
contracts → verified implementation → historical Core/reference documentation →
proposed defaults. [Owner policy](OWNER_BUSINESS_POLICY.md),
[machine register](owner-business-rules.json) and the
[WhatsApp application contract](../../../services/whatsapp/qualification/application-contract-20261011/specification.md)
are unchanged. PAY-001–012 and employee-mobile-v3 are preserved exactly in those
sources. **Historical Level B remains CLOSED BY OWNER — HISTORICAL REFERENCE ONLY.**

## A. Verified architecture and delivered boundary

| Component | Verified runtime position | Delivered offline consequence |
|---|---|---|
| AL-RIFA’I | Existing Next.js app, shared validation authentication, archive readers and preview APIs | New files under `candidates/identity-review/`; active routes, proxy, package commands and legacy helpers unchanged |
| PostgreSQL `alrifai` | Approved future owner; six migrations, 54 snapshots, seven empty operational tables | Additive schema **preview** tested only in disposable PostgreSQL; qualification repository refuses production database names |
| WhatsApp | Independent account-scoped bridge/MCP; wa-01/wa-02 connected; no AL-RIFA’I consumer | Injected read-only client contract prepared; no consumer, socket client, token loader or second bridge |
| Corrected Escort candidate | `lib/escort-intake-candidate.mjs`, `escort-intake-candidate-v2`, inactive | Imported by the new inactive routing adapter without byte changes; existing suites retained |
| Fazle-Core | GitHub source pinned to `1838619b644dc83f4ca723d3442d94435e6050f1` | Compatible patterns selectively adapted; no whole repository import or dependency installation |
| Hermes/conversation integration | Disabled locally; Notion describes reported offline work; runner unverified | Deterministic first release works without models, credentials or external Core |
| Sites | Separate publication/data boundary | Unchanged; no second ledger or deployment |

Candidate dependencies are existing Node crypto/util, Zod, React, the unchanged
pure Escort/validation modules and an explicitly injected `pg` pool. No production
database connector, provider, Core FastAPI/settings dependency, network/socket
implementation or business writer enters the graph. The React panel imports a
browser-safe catalog, with server contracts imported as types only.

The unregistered `createCandidateApi()` factory and unmounted
`ui/IdentityReviewPanel.tsx` provide reviewable implementation. Neither is added
to `app/`, the proxy, a consumer, startup or a package command. The offline build
introduced a temporary preview page only inside a private copied source tree.
Its successful compile is not a published route or browser-integration proof.

### Evidence pins

All SHA-256 pins below are checked by the fixture preflight in
`candidates/identity-review/evidence-baseline.json` except the historical handoff,
whose complete bytes are retained beneath the new handoff entry.

| Source | SHA-256 |
|---|---|
| Existing Escort candidate | `891fe6e72d15da603a75c66a669157b34371dac5d4a3af9c2754d5d759a0d485` |
| Existing Escort tests | `ac3bb2e6ece86acd62e722ab0bf23ea29a204eeca8e735c5ee2ba84e6d63cea5` |
| Legacy validation helper | `dd5c3a3ddd0bab96a1a14dc315b5bedb5ba86db019d1591158bc6249b67b78ce` |
| Owner policy | `4971ebb051d911e203caebaab7e8a9b7d6fc2008620215d540f05f31c81f9f5b` |
| Machine policy register | `1127430d3c8444e158dd4b4a2ab1891c60ae9200d538fca8fab896f531196732` |
| Approved WhatsApp application contract | `dbaa9aa2873ec5a6f57a7f84a332aeb9b5f2f32c84134d745f6378410531374b` |
| Original Owner fixtures | `d649e6075004aeba326b7818f9254bbf626365a29c026cf20a949f2747f530a3` |
| Matched native fixtures | `e8aea755cdf897f230ec8e5b1ff9912f04d66d21d55feb0284ce82afb904715a` |
| Safe Handoff before this task | `decebf9da6a3e219568b488309c38f8fbae7ae98597f84bb1abecff4034cbc6a` |

The original Owner texts include Escort Hridoy's **MV HARVEST UNITY / MV
HABIBULLAH**, the **Md. Osman Goni** confirmation and the actual multiple-Lighter
message. Native IDs, account, chat, sender, direction, quote and text are retained.
The native fixture stores some senders as bare phone digits; the adapter preserves
that representation and does not fabricate a JID suffix. Source timestamps are
normalized to ISO while their original native strings remain retained.

Test grants, named staff, verification decisions, observation clocks, group
registrations and the Harvest-Uinity spelling alias approval are explicitly
synthetic controls. They prove code behavior, not actual business authority.
Derived negative cases are labeled controls and do not replace Owner originals.

## B. Reuse decision matrix

Core paths are relative to the
[pinned GitHub revision](https://github.com/arshiyaazim/fazle-core/tree/1838619b644dc83f4ca723d3442d94435e6050f1).
The prior source reconciliation is retained; this implementation does not repeat
historical investigations or assert that reference modules are deployed.

| Component / Function | Current evidence | Owner policy | Decision | Required work / delivered status | Risk |
|---|---|---|---|---|---|
| AL-RIFA’I corrected Escort candidate | Pure parsing, draft and matching; 25 baseline / 29 regression passes | Review-only intake; source-backed fields | DIRECT REUSE | `routing.ts` calls `qualifyEscortIntake()` / `parseEscortOrder()` unchanged | Test binding flags alone are not authentication |
| `modules/escort/__init__.py`: `parse_escort_message()`, `is_minimum_escort_order()`, `build_admin_draft()` | Compatible extraction already adapted locally | Blank Escort fields; one draft per Lighter | ADAPTER REQUIRED | Existing local adaptation retained, raw spelling/source context stored | Whole import loads business dependencies |
| Escort client/completion handlers, `save_escort_programs()` | Legacy DB, roster, employee and send side effects | No automatic active employees/Programs | REJECT / SUPERSEDE | New adapter produces linked proposals only | Defaults, duplicate records and wrong writer |
| `modules/escort_roster/` | Upsert and shared-transaction patterns | Duty/pay rules need separate approval | ADAPTER REQUIRED | Atomic-linking pattern reused conceptually; actual roster writer deferred | Legacy rates and quantities |
| `modules/phone_normalizer/__init__.py` | Bengali handling; nine pure upstream cases pass | Raw values retained; approved +880 employee mobile | ADAPTER REQUIRED | Strict role-aware `normalizePhone()` / `normalizeEmployeeMobile()` | Bare/foreign/LID strings cannot establish employee identity |
| `modules/number_identity/__init__.py` | Variant search and raw contact logs | Exact account/person authority; privacy-safe logs | REJECT / SUPERSEDE | Exact native bindings replace last-ten-digit matching | Cross-person matches and sensitive logging |
| `modules/identity_brain/__init__.py`, `modules/identity_resolver.py`, `modules/user_role/__init__.py` | Single-role/name/content heuristics; payout lookup | Multiple relationships; no payout identity promotion | REJECT / SUPERSEDE | Many-to-many registry plus explicit scoped grants | Role escalation and identity substitution |
| `modules/identity_brain/claim_verification.py` | Useful ambiguity/inactive outcomes; legacy name/ID fallback | Names are review evidence | ADAPTER REQUIRED | Unresolved/conflicting binding outcomes retained; legacy verification not imported | Unique name is not verified authority |
| `modules/contact_roles/routes.py` | CRUD/enums/normalized lookup; shared API key | Named actors and revocable history | ADAPTER REQUIRED | Versioned proposals, exact approval digest, revocation and account visibility | Legacy single relationship/destructive delete |
| `modules/group_identity.py` | Native JIDs and separate business labels | Group and participant independent | ADAPTER REQUIRED | Three-group registry, scoped bindings and retained observations | Cached presence or display name mistaken for permission |
| `modules/rbac/__init__.py`, `shared/auth_deps.py` | Hierarchy, password/audit helpers, operator payment and bootstrap promotion | Explicit capabilities; unchanged PAY rules | REJECT / SUPERSEDE | Reviewed crypto/audit pattern adapted; role hierarchy and bootstrap excluded | Shared-key impersonation and privilege escalation |
| `modules/identity_role_authorization.py`, its adapter, `modules/outbound_authorization.py`, `modules/admin_hermes_authorization.py` | Verified identities, scopes, holds, authorization versions | Current grants and deterministic gates | ADAPTER REQUIRED | `authorize()` and epoch/version checks implement local subset | Legacy wildcard/protected-purpose bypass; sending excluded |
| `modules/message_router/__init__.py`, `modules/bridge_poller/` | Domain stages/native context; legacy group-write exception | Native and capability gates before intent/fallback | ADAPTER REQUIRED | Deterministic outer adapter; groups review-only | Content fallback or outgoing history misattribution |
| `modules/admin_commands/`, `shared/draft_reply.py`, draft approval | Exact references, queues and locks | Exact version approval; queue differs from send | ADAPTER REQUIRED | Durable operation IDs and transactional review-note updates | Time/text dedup can suppress real repeats; outbound deferred |
| `modules/conversation_memory/__init__.py` | Source-linked threads; explicit-field merge defect confirmed | Retain conflicting explicit assertions | ADAPTER REQUIRED | `mergeEvidenceField()` preserves first value, explicit flag and proposed conflicting source | Full thread/memory integration deferred |
| `modules/role_classifier/__init__.py`, `modules/conversation_policy/__init__.py`, `shared/reply_policy.py` | Persona/context and shadow classification | Persona/intent cannot grant authority | ADAPTER REQUIRED | Deterministic review-domain suggestions only | Cross-domain context and persona permission confusion |
| `modules/route_b_handoff/`, recruitment, attendance and employee workflows | Review/extraction patterns; Core DB/providers | No automatic hiring, attendance or duty posting | ADAPTER REQUIRED | Review domains present; business transitions deferred | Implicit operational transitions |
| `modules/rag/__init__.py`, KB, Hermes dispatch/kernel | Current RAG has role filters; runner unverified | Server-derived person/account/document scope | ADAPTER REQUIRED | `scopedKnowledge()` is a bounded scope filter; provider execution disabled | Actual retrieval/index/provider access unqualified |
| FPE normalizer, payment relay/accounting | Financial extraction/correlation patterns | PAY-001–012; one posting boundary | ADAPTER REQUIRED | Financial discussion becomes review; actual payment adapter deferred | Dual posting, altered confirmation rules or employee auto-creation |
| OCR/document/audio/slip modules | External media/provider dependencies | Extraction supplies evidence only | ADAPTER REQUIRED | Available/unavailable metadata retained; acquisition/extraction disabled | Missing bytes, disclosure, prompt injection |
| Named staff, multi-binding/group registry, durable evidence/review | Inadequately implemented locally | Configurable, accountable and auditable identity | NEW FEATURE | Implemented inactive candidate, isolated API/UI and disposable storage | Real provisioning, transport and activation remain gated |

No legacy route handler, DB helper, roster writer, sending module, provider or
whole Core package was copied/imported. Selective pure Core sources/tests are
retained only in private qualification evidence. The application source has no
Git revision; byte manifests identify the change.

## C. Identity, group and reliability contracts

Keep distinct: WhatsApp account; chat/group; actual sender/participant; person;
business relationships; employee operational identity; capability grants; persona;
intent/domain. No layer automatically grants another layer's authority.

One person can have multiple verified bindings and relationships. A Client's
several numbers independently bind to the same logical Client. Overlapping exact
account/chat/sender/direction bindings are rejected. Validity is checked against
the exact native source time. Unresolved phone/LID, native-phone conflict,
forwarding and ambiguous identity remain Review. Foreign/ten-digit/opaque numeric
values are not silently converted to Bangladesh employee identity.

Employee operational ID remains normalized, source-role-proven employee mobile
under employee-mobile-v3. Sender, Client, Master Mobile, internal registry ID,
Payout Number and unresolved LID are separate. The candidate stores employee
references as evidence; it creates no employee or employment state.

### Three distinct group discovery candidates

| Canonical candidate | Native JID | Observed accounts | First-release scope |
|---|---|---|---|
| Al-Rifa'i Integrated Services Office group | `120363426895117693@g.us` | wa-01 / wa-02 | OFFICE review |
| Al-Aqsa Escort Program Group | `120363428977781821@g.us` | wa-01 | ESCORT order/assignment/change review |
| Escort Release Slip | `120363408741101070@g.us` | wa-01 | RELEASE / settlement-evidence review |

These constants are **PENDING OWNER VERIFICATION**, not seeded live registrations.
The separate Release Slip JID `120363404086068154@g.us` stays distinct. A verified
group record contains canonical ID, native JID, approved account IDs, display
label, business domain, `REVIEW_ONLY` scope, evidence, version and revocation
history. Source observations retain display-name/membership changes separately.
Unknown membership remains unknown; observations cannot grant a business role.
Participant bindings are independently account/chat/sender/direction scoped.

### Strict interfaces and evidence handling

| Contract | Implemented content and gate |
|---|---|
| `NativeMessageEnvelopeV1` | Exact account/provider/native ID/chat/sender/direction; original and ISO source time; observation time; text/hash/source reference; phone/LID, quotes, forwarding, media, group observations; unknown keys/type/hash conflicts rejected |
| `IdentityResolutionV1` | Verified person, independently verified relationships/bindings, versions, ambiguity and conflicts |
| `AuthorizationDecisionV1` | Server-derived actor, capability, account/domain/chat/resource scope, current authorization epoch and reason code |
| `ReviewItemV1` | Source occurrence/revision, domain and required domain scopes, extracted fields/source spans, candidate, linked draft, reasons, review version, assignment and delivery states |

Transport uniqueness is account + provider + chat + **exact** native message ID.
Case is retained. Identical occurrence/payload replay returns existing evidence;
different IDs remain distinct even with equal text. Changed same-occurrence
payload retains immutable source revisions, marks all related drafts Review and
removes assignment proposals. Group name/membership observations append without
changing message content identity. This is evidence deduplication, never a future
cash posting decision.

Evidence is committed before progress cursor acknowledgment, in the same
transaction. Pages reject a wrong account/chat or invalid sibling atomically.
Durable operation IDs replay exact review-note payloads; conflicting payloads
return 409. Registry/review operations check expected record version and current
authorization epoch. Any binding/grant edit becomes Pending and removes its
authority; revocation blocks new actions immediately. Existing stale drafts
require review/requalification rather than silent matching.

Raw parser source context is internal only. Review DTOs/history/update replays
omit it; raw source requires `evidence.read` for every required domain on every
related review. Account visibility prevents cross-account Client/person leakage.
Editing global relationships or a multi-account group requires grants across all
affected accounts. API errors and audit events exclude bodies, phones, JIDs,
passwords, session tokens and provider exception dumps. Audit contains opaque
references, reason codes, versions and a SHA-256 chain; it is not external
tamper-proof notarization.

Persistence is a bounded pilot: `identity_review_candidate.records` has a
collection/id primary key, JSONB payloads, allowed-collection constraints and
immutable audit/registry-history/review-history/source-revision triggers. Injected
PostgreSQL transactions serialize through an advisory lock, roll back atomically
and cap state at 5,000 records / 32 MiB; SQL/lock timeouts are 5/3 seconds. Lists
page 25 rows. Full history/source views are bounded by pilot capacity; retention,
production-scale history pagination, indexing and least-privilege deployment are
unqualified. This schema exists only in the disposable test database.

## D. Named authentication and authorization

`auth.ts` implements local named accounts, PBKDF2-HMAC-SHA256 at **600,000**
iterations as selected in the approved plan, fresh salts and constant-time
comparison. There is no public registration or automatic Admin promotion.
Provisioning requires an exact manifest digest, explicit approval-purpose
verification and an empty offline registry. The verifier defaults to **deny**;
there are no real accounts or grants from this task.

Sessions are server-side opaque 256-bit random tokens; only hashes are stored.
Cookies are Secure, HttpOnly, SameSite=Strict, host-only. Mutation requests require
the configured exact Origin plus a session-bound CSRF token. Shared validator,
forwarded-host/actor headers, browser-supplied roles and verified flags never
authenticate a named person. The trusted host must supply peer address; proxy
header trust is not inferred. Login throttles by hashed account and trusted peer;
expired/revoked accounts/sessions fail closed. Technical defaults: 30-minute idle,
eight-hour absolute expiry and three sessions per account, pending activation
approval. Secure-host/browser behavior is not claimed qualified by in-memory tests.

The following remains the **proposed Owner approval matrix**, not seeded grants.
R=read, D=draft/data entry, U=own pending update, V=verify, A=approve, P=post.
Every action additionally requires an explicit domain/resource capability. `?`
means OWNER DECISION REQUIRED and denied. Review updates never update business
records. The first release exposes no operational V/A/P or sending capability.

| Domain | Admin | Office Staff | Operations | Accountant |
|---|---|---|---|---|
| Identity/group administration | Proposed R/D/V/A/U | Scoped R/D proposals | Scoped R/D proposals | Scoped R/D proposals |
| Office/Escort review | Scoped R/D/U; assignment proposal under current policy | Scoped R/D/U | Scoped R/D/U | Scoped R |
| Assignment cancellation/replacement | A/U ? | V/A ? | V/A ? | Denied |
| Recruitment/employment/attendance | Scoped R/D/U; V/A ? | Scoped R/D/U; V ? | Scoped R/D/U; V ? | Scoped R if granted |
| Release evidence | Scoped R/D/U; V/A ? | Scoped R/D/U; V ? | Scoped R/D/U; V ? | Scoped R/D; V/A ? |
| Payroll/settlement | Scoped R/D; V/A/U/P ? | Scoped evidence R/D | Scoped evidence R/D | Scoped R/D; V/A/U/P ? |
| Cash manual entry | Future R/D/U, A/P under PAY-003/004 | Future granted D/U, Pending Admin Approval | Future granted D/U, Pending Admin Approval | Future entry only if individually granted |
| KB/conversation/media | Granted R/D suggestions | Granted R/D suggestions | Granted R/D suggestions | Granted R/D suggestions |
| WhatsApp sending | Disabled | Disabled | Disabled | Disabled |

Implemented capabilities are enumerated, account/domain/chat/resource scoped,
channel-specific and current-version checked. Role labels never imply grants.
`cash.post`, business approval, employee/Program creation, cancellation,
replacement, attendance/payroll/settlement posting, sending, media acquisition and
provider execution are blocked. The identity verification API approves only
registry evidence through an injected explicit approval verifier.

Preserve the exact PAY policy: valid successfully sent designated Admin wa-01 →
approved Accountant direct-chat payments confirm without another receipt/reply/
approval; permitted Admin manual entry is directly confirmed at the future single
writer; Staff entry remains Pending Admin Approval. Group/forwarded/document
evidence cannot independently post. Technical send success, business confirmation,
posting and external disbursement are independent. This release implements no
payment confirmation/posting writer and adds no new human gate to the PAY policy.

## E. Deterministic routing decision table

Order: strict native envelope → scoped intake access → sender resolution → current
capabilities → deterministic intent suggestion → field/state validation → draft
or review. Content/persona/fallback cannot bypass earlier gates. Mixed intents
remain Review with all required domain scopes. Specialized non-Escort extraction
and explicitly delimited business-block workflows are later adapters.

| Source / intent | Required evidence | Target / disposition | Gate |
|---|---|---|---|
| Authorized direct Client order | Exact verified inbound binding, logical Client, explicit capability | ESCORT blank draft per valid Lighter | Source-backed Mother; mandatory Master Mobile |
| Unknown Client, unresolved LID, forwarding | Actual native sender/provenance | Identity/Operations Review | No names/header authority |
| Verified Admin assignment | Exact outgoing account-owner binding and current Admin assignment capability | Proposal linked to one existing draft | Explicit duty date/shift/mobile, unique match, approved spelling alias if required |
| Office group | Verified group/account; participant separately resolved | OFFICE Review | Discussion never executes a command |
| Escort Program group | Verified group/account and source fields | Unassigned/assignment/change Review | Group authority remains Owner-gated |
| Escort Release Slip group | Native group/account and media availability metadata | RELEASE/Settlement Evidence Review | No automatic release/payroll/settlement/cash |
| Recruitment / attendance / vessel duty | Source sender and employee/date distinction | Relevant Review domain | No hiring, inferred totals or posting |
| Payroll/advance/food/conveyance | Native source plus separated financial intent | Accounts/Payroll Review | Never a new Escort order |
| Admin→Accountant payment / Relay | Exact future approved direct channel and send/relay correlation | Financial evidence/review only in this release | Future canonical PAY boundary disabled |
| Client query / complaint | Relationship and scoped evidence | Office/relevant Review | Reply drafting and cross-client retrieval not activated |
| KB/Hermes request | Authenticated document/account/person scope | KNOWLEDGE review / bounded scope-filter result | Actual retrieval/provider/action integration disabled |
| Outgoing history, receipts, edits/protocol | Native event type and source | Evidence/reconciliation Review | History/HTTP/queue does not establish successful sending |

Assignment parsing retains the Owner's full dotted/hyphenated name, formatted
mobile, original vessel spelling and **`Assignment: 03/10/26 (N)`** as 3 October
night duty. It never replaces that date with the message timestamp. The spelling
alias in the real confirmation is accepted only with separately approved alias
evidence; the offline test supplies a labeled mock approval.

Equal-confidence matching returns ambiguity Review. Existing-draft linking and
durable replay prevent duplicate draft/assignment proposals; they create no active
Program, employee or roster. Assignment state and Client delivery are independent;
this candidate's delivery state is always `NOT_SENT`. The unchanged Escort
regressions reject HTTP 200 with `success:false`, timeout/rejection or missing
authoritative evidence. No live send is attempted.

`mergeEvidenceField()` preserves explicit flags and the first source assertion;
a conflicting second assertion is returned with its source for review. It rejects
system-generated context. Full thread reconstruction/conversation-memory storage
is not wired, and the upstream overwrite defect is not claimed fixed in Core.

## F. Confirmed defects, gaps and actual qualification

### Original four failures and two safety defects

| Failed test / safety case | Confirmed root cause | Core function / pattern | Local gap and reuse decision | Implemented offline correction |
|---|---|---|---|---|
| `empty-allowlist-denies-unknown` | Empty Core allowlist permits unknown | `_is_allowed_escort_client()` | Legacy gate superseded; reference defect remains | Exact verified binding + capability, otherwise Review |
| `bare-client-order-produces-draft-event` | Legacy helper drops unassigned order | `parse_escort_message()`, minimum predicate, draft builder | Reuse corrected local candidate through adapter | Blank source-linked draft per valid Lighter |
| `pasted-assignment-date-shift-recognized` | Label/date regex misses Assignment; completion loses formatted names/mobile | `parse_completed_draft()` / completion parsing | Reuse corrected parser, preserve raw source | Explicit date/N and full Osman name/mobile retained |
| `direct-and-group-parser-isolation-implemented` | Legacy role gate omits native account/group/direction | Router / client identity gate | New outer native/capability adapter | Groups Review; exact direction and actor required |
| Equal-score matching | First threshold winner chosen in Core | Pending-program match pattern | Corrected local matching reused | Ambiguity Review, no first-candidate selection |
| HTTP 200 / `success:false` | HTTP status equated with successful sending | Bridge confirmation/send handling | Corrected candidate safety retained | No confirmed-sent state; no transport sender implemented |

All six causes remain **confirmed**, not suspected. The original legacy targets
remain deliberately unchanged. Passing equivalents in the inactive candidate do
not convert the original suite to 21 PASS.

### Executed results, separately reported

| Suite / check | PASS | FAIL | Limit |
|---|---:|---:|---|
| Original unchanged 21 assertions | 17 | 4 | Same legacy targets and four failures; parser 7/1, helper 10/3; old report writes suppressed in memory |
| Existing unchanged Escort candidate | 25 | 0 | Inactive pure candidate |
| Existing six-correction Escort regressions | 29 | 0 | Actual Owner/native fixtures plus labeled negative controls |
| New identity/auth/routing/API/MCP regressions | 55 | 0 | Mock approval/grants; no live transport or user provisioning |
| Disposable PostgreSQL persistence | 10 | 0 | Network-none tmpfs database; independent repository connections, concurrent replay, rollback, history and sessions |
| React UI rendering | 3 | 0 | Server-rendered markup only; not browser interactions |
| Compatible pure Core Escort cases | 37 | 0 | AST-isolated unchanged synchronous upstream methods/parameters; not full upstream integration |
| Core Bengali phone tests | 9 | 0 | Unchanged pure source/assertions |
| TypeScript / targeted ESLint | Passed | 0 errors | Lint also 0 warnings; no output/build files written to active app |
| Existing workflow / source-register / phase1 runners | 3 runners passed | 0 runners failed | These runners do not emit atomic assertion counts |
| Isolated Next.js preview build | Passed | 0 final failures | Copy-only preview; no server/deployment; initial 768 MiB heap failure retained, 2 GiB rerun passed |

The prior negative Core memory check remains **0 PASS / 1 FAIL**, confirming the
explicit-value overwrite defect; that historical result was not rerun in this
implementation. The new local conflict-preserving adapter has a passing regression.
DB-dependent Core async handlers, actual staff authentication/browser host,
positive-content live MCP resources, media, sending and financial posting were
not qualified. No unavailable integration is marked PASS.

Reports, original result details and start/end fingerprints are private under
`/tmp/alrifai-identity-review-20261012/`. They are temporary evidence, not a backup.
See the candidate README for reproducible candidate commands. The pinned original
Core/legacy checks were executed in memory, suppressing only report writes; their
assertions were not modified. No packages were installed, commits made or pushed.

### Unresolved integration and reference limitations

- Actual approved staff names/grants, approval-verifier provenance, Client/Admin/
  phone/LID/group bindings, aliases and membership evidence are unavailable. Mock
  controls confer no production authority. Initial provisioning and revocation
  exist offline; broader staff administration/password reset is deferred.
- The prepared MCP client is injected only. Native positive-content capture,
  credentials, real metadata mapping, original payload provenance and broker-side
  bounded resource behavior remain unqualified. Its 12-second / 10-message /
  250,000-byte checks constrain the prepared client boundary, not an unseen server.
  An abort-ignoring client keeps its account busy until the request actually ends.
- API factory and UI panel compile offline; HTTPS/origin/proxy/cookie/browser
  wiring, real intake ownership and operational field-review workflows are not
  activated. No production migration, database grants or runtime consumer exists.
- Media/document/audio extraction, retrieval/index access, disclosure/retention,
  payment/relay writer correlation and native sending need separate qualification.
- The four reference files were verified at
  `knowledge_base/06_developer_system/{workflow_engine,role_permissions,identity_integration,identity_brain}.md`.
  They remain historical, subordinate to approved local policy.
- Exact `selected_contacts_normalized_unique(1).csv` is unavailable. Core's
  near-named reference has 168 rows, 167 valid normalized BD phones, no normalized
  duplicates and one unresolved non-BD numeric value; no role/account/verification/
  membership provenance. Discovery-only; no import or attachment-parity claim.
- The Notion [implementation record](https://app.notion.com/p/3f06802d2cc8816c987fdbe9ca020df4)
  reports offline work, not a verified deployed runner. Canva remains UNAUTHORIZED /
  reauthentication required; no Canva evidence or mutation was used.
- Reference descriptions conflict with actual code: current RAG has role filters;
  contact GET/DELETE already use phone variants; documented router/bootstrap
  descriptions do not capture all current behavior. Operator payment commands,
  auto-superadmin, payout-based identity and single-role precedence are rejected.

## G. Implementation dependencies and activation review packet

| Step | Current result | Remaining gate |
|---|---|---|
| Freeze evidence | Pins and checksum preflight implemented | Fixture retention/approved future pin changes |
| Identity/capability contracts | Strict types, many bindings/relationships, three groups, fail-closed grants implemented | Real Owner verification and approved named grants |
| Named auth and registry/review API/UI | Inactive implementation, server-side sessions, CSRF, expected versions/audit | Trusted HTTPS host/browser qualification and provisioning |
| Escort integration | Corrected candidate reused unchanged; source-linked drafts/matching qualified | Real source/alias binding qualification; field review/correction workflow |
| Read-only MCP preparation | Bounded interface, atomic evidence/cursor persistence, failure controls | Actual account-scoped client/resources; no consumer yet |
| Isolated persistence/access qualification | Disposable PostgreSQL concurrency/replay/rollback/revocation/isolation passed | Production-sized storage, indexes, retention and least-privilege adapter |
| Activation review packet | Schema preview, baseline pins, code/test inventory and gates supplied | Exact approved bindings/provisioning, real transport/browser evidence, production migration/rollback review and Owner activation authorization |

The current PostgreSQL class **hard refuses `alrifai`**, even if a caller supplies
`isolatedQualification:true`; no runtime switch bypasses it. Future approved
registry persistence must use a separately reviewed adapter in `alrifai`, preserving
existing operational writer authority. Schema preview is outside all current
migration scripts. No Program, employee, roster, attendance, payroll, settlement,
Cash Ledger or outbound writer is implemented.

An activation packet must add: exact versioned provisioning/binding decisions,
trusted verifier, actual MCP positive-content and resource reports, least-privilege
role/DDL preview, browser/API host proof, capacity/retention controls and rollback
instructions tied to the approved deployment. For eventual activation, rollback
must first stop the authorized consumer, revoke its credentials/sessions, remove
the new host registration and preserve immutable evidence; existing business
writers remain unaffected. No rollback/deployment command is executed here.

Future sends must correlate authenticated actor/capability/account/recipient,
operation ID, exact payload and authoritative native result. Queue/HTTP acceptance,
technical send success, recipient delivery/read and business confirmation stay
separate. Ambiguous sends require reconciliation before retry. Future payments
require one atomic operation and source-block mapping; genuine equal instructions
remain distinct, concurrent established replay posts once. These are future gates,
not implemented transport/financial behavior.

## H. Owner decisions, change inventory and Safe Handoff

| Owner decision / external evidence | Safe behavior now |
|---|---|
| Verify three JIDs and permitted account bindings | Static discovery/review only |
| Named staff and scoped role templates/delegations | No live users/grants/bootstrap promotion |
| Client/person/phone/LID/alias verification | Unknown/conflicting identity/spelling stays Review |
| Cancellation/replacement/group-origin authority | No operational transition |
| Recruitment/attendance/release/payroll/settlement approval rules | Review evidence only |
| Media access, retention/provider disclosure | No acquisition/submission/provider |
| MCP resource/client and migration/deployment scope | Prepared adapter only; activation blocked |
| Operational cutover / outbound evidence | Existing writers preserved; new posting/sending disabled |

Changed scope consists of new `candidates/identity-review/` files, four isolated
`tests/identity-review-*.mjs` files, this specification and the Safe Handoff. Exact
file SHA-256 values are recorded in the accompanying candidate `SHA256SUMS` and
the latest handoff entry. The original candidate/tests/helper/policies, active
application source/configuration, transport runtime and production schema/data
remain unchanged. Temporary compiler/database containers publish no ports and
are removed after qualification. Full production fingerprints and read-only
PostgreSQL row/schema comparisons are retained in private qualification evidence.

**Exactly one independently recommended next task:** Owner-authorize qualification
of the actual account-scoped **read-only native MCP client and exact approved
staff/Client/Admin/three-group binding evidence** against this inactive candidate,
keeping production migrations, consumer activation, sending, posting and deployment
excluded. This addresses the remaining unverified trust boundary. **Not executed.**

**END AUDIT — SAFE HANDOFF**

**STOP FOR OWNER REVIEW.**
