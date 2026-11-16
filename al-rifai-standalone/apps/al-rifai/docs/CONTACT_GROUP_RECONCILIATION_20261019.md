# AL-RIFA'I Contact & Group Reconciliation

**Date:** 19 October 2026  
**Status:** Review-only evidence report; no operational registry or activation.

## A. Executive summary

Contact/group evidence exists in the application source, the B04 preparation
artifacts, candidate identity-review files, saved workflow metadata, historical
handoff entries, and supplied exports. The previous Bridge1 audit did not find
a **verified direct `escort_client` registry** because none of those records,
as reviewed, combines an authoritative person identity, exact current native
PN/LID/JID binding, account scope, and applicable Owner-approved authority.
This is not a finding that contact data is absent.

There is a current source-code path for a narrow set of Escort contacts:
database rows in `public.escort_client_contacts` are read by the reconciliation
producer and authenticated API; the Vessel dashboard displays the API's
contact list. The checked-in migration seeds three `wa-01` contacts, but its
presence does not prove it was applied. Its schema has no explicit native
binding, verification evidence, validity interval, or approval record.

The three group discoveries are candidate-only; two additional group records
are retained only in historical evidence. No group is Owner-approved or
currently verified. The B04 inventory's 24 `ESCORT_CLIENT` labels remain
unverified preparation candidates. Two candidates have a source-only normalized
phone overlap with two app-source contact IDs; this does not establish current
database membership or native identity.

## B. Contact source inventory

| Source | What is present | Path through app | Evidence status |
|---|---|---|---|
| B04 supplied source | 168 supplied source rows; digest recorded separately. | Read by the B04 preparation adapter, not directly by the operational API. | Historical/supplied data present; not native identity proof. |
| B04 preparation adapter | Normalizes supported local phone forms, groups input by normalized phone, classifies names, and adds explicit preparation overrides. | Produces preparation artifacts only. It has no DB, broker, credentials, or activation API. | Preparation behavior confirmed in `qualification/b04-identity-20261014/owner-contacts.mjs`; names/classifications confer no authority. |
| B04 inventory and results | 170 candidate identities; 24 are classified `ESCORT_CLIENT`; all candidate native-binding and grant arrays are empty; activation is false. | No import or runtime consumer from the inventory was found in the app source. | Candidate-only; status `PREPARATION_PASS_B04_NOT_CLOSED`. |
| Static app-source contact list | Three `OWNER_ESCORT_CLIENTS` entries for `wa-01`: `escort-client-hridoy-wa01`, `escort-client-rezaul-karim-wa01`, and `escort-client-tcis-wa01`. | `lib/escort-register.mjs:18-22`; no use of this exported constant was found elsewhere in the repository search. The reconciliation producer instead reads the database table. | Source-present; not proof of deployed rows or native verification. |
| Operational contact schema/seed | `public.escort_client_contacts` has `id`, `account_id`, display name, username, phone, source, active, and creation time; the migration seeds the same three contact IDs. | `db/migrations/0018_escort_order_register.sql:3-12,73-82`. | Schema/seed definition present only. Applied state is blocked from verification. |
| Producer read path | If the Escort register table exists, the producer reads `escort_client_contacts WHERE active=true`, then calls `deriveEscortRegisterOps`. | `scripts/reconcile-ingest.mjs:72-78`; `lib/escort-register.mjs:29-35,82-85`. | Source path confirmed. The helper matches a direct chat, account and resolved phone, and excludes group chats; it does not consult the candidate inventory. This is not live execution evidence. |
| Authenticated API | GET checks authentication and for the register table, then returns active contacts and register rows. Non-GET operations are denied. | `app/api/escort-register/route.ts:5-23`. | API contract confirmed in source; live response and rows unverified. The contact query does not return native-binding or approval evidence. |
| UI | Vessel dashboard mounts the Escort register panel; it fetches `/api/escort-register` and displays the returned contact names, usernames, phones and account IDs. | `app/vessel-dashboard.tsx:11,52`; `app/escort-register-panel.tsx:5-16,20`. | UI wiring confirmed in source; production rendering/data unverified. |
| Candidate identity-review layer | Generic candidate schema includes registry, native-binding and identity-claim collections. Candidate README says this area is inactive/unmounted and has no live registry or route integration. | `candidates/identity-review/migrations/0001_identity_review_candidate.sql`; `candidates/identity-review/README.md`. | Candidate schema and components present; no evidence the schema was applied or is the operational contact registry. |
| Historical exports | `chat-archive.json`, `conversation-snapshot.json`, `accounts-snapshot.json`, and `operations.json` exist under the supplied v10 data directory. | Historical app paths read imported snapshots; `lib/conversation-snapshot.ts:9-17`; historical conversation API labels source as preserved exports with live feeds disabled. | Historical provenance only. Export bodies were not opened for this report. |

### Contact-source flow and distinction

`CONTACT_SOURCE.json` → B04 preparation adapter → `CONTACT_INVENTORY.json` /
`PENDING_PERSON_CANDIDATES.json` is a candidate-preparation flow, not an import
into the database.

Separately, migration 0018 defines/seeds the operational table →
`scripts/reconcile-ingest.mjs` reads active rows → `lib/escort-register.mjs`
matches direct messages by account and phone → authenticated API returns
database rows → Vessel dashboard displays them. Whether that migration and
these rows exist in the deployed database is **BLOCKED_FROM_VERIFICATION**.

`OWNER_PROVIDED` is a source label, and `active` is an operational flag; neither
field is an explicit native identity verification or approval record. The
schema has no `native_jid`, LID/PN namespace, verification evidence, validity
period, or approving decision column. The API/UI therefore expose the limited
configured contact projection, not proof of a verified Bridge1 directory.

## C. Five-group reconciliation

Status labels describe evidence in the reviewed sources. For all five groups,
current native binding, current membership and live permissions remain
`BLOCKED_FROM_VERIFICATION`; no live lookup was performed. The first three
appear in the inactive candidate catalog / review-only plan, not an operational
group registry or API. Group participant observations are not person
verification or permission.

| Group label | Exact historical JID | Provenance/account observations | Status and app use |
|---|---|---|---|
| Al-Rifa'i Integrated Services Office | `120363426895117693@g.us` | Candidate catalog lists `wa-01` and `wa-02`, domain `OFFICE`; `workflow-group-read.json` contains a bounded sample; handoff records observations on both accounts. | `FOUND_BUT_UNVERIFIED`. Candidate-only; no current binding, membership or approval proof. |
| Al-Aqsa Escort Program Group | `120363428977781821@g.us` | Candidate catalog lists `wa-01`, domain `ESCORT`; bounded sample exists. Handoff says `wa-02` history was not established. | `FOUND_BUT_UNVERIFIED`. No inference about `wa-02` membership or non-membership. |
| Escort Release Slip | `120363408741101070@g.us` | Candidate catalog lists `wa-01`, domain `RELEASE`; bounded sample exists. Handoff records wa-02 cache/read limitations. | `FOUND_BUT_UNVERIFIED`. Distinct from Release Slip; no inference about `wa-02`. |
| Office Management | `120363408231246659@g.us` | Historical handoff records wa-01/wa-02 observations and an empty sampled sender query. | `HISTORICAL_ONLY` in the reviewed candidate inventory; not in the current three-entry catalog or scope plan. |
| Release Slip | `120363404086068154@g.us` | Historical handoff records wa-01/wa-02 observations and an empty sampled sender query. | `HISTORICAL_ONLY` in the reviewed candidate inventory; preserve as distinct from Escort Release Slip. |

Exact IDs/provenance are retained in `data/workflow-group-read.json`,
`data/workflow-scope-plan.json`, `candidates/identity-review/catalog.ts`, and
the earlier handoff records. The bounded evidence says `completeHistory:false`
and `participantAuthority: NONE; source evidence scope only`.

No group-specific operational API or active group registry was found in the
reviewed app paths. `GROUP_DISCOVERY` and the scope plan are candidate/review
artifacts. In addition, `contactFor` in `lib/escort-register.mjs` accepts only
direct PN/LID chat JIDs and returns null for group JIDs; the current Escort
contact projection does not consume the group candidate catalog.

## D. B04 `ESCORT_CLIENT` candidate review

The table below accounts for all 24 entries in
`qualification/b04-identity-20261014/CONTACT_INVENTORY.json`. Stable contact
IDs and source-row references are retained to permit Owner review without
copying personal names or phone numbers into another document. CSV row numbers
are one-based file row references including the header; the source digest in
the reference is
`25d993f5c24dd078f8b7bfaa7783922ee2dca39f43163e160e50343663010475`.

All 24 entries have `identityStatus=UNVERIFIED_NATIVE`,
`nativeBindings=[]`, and `activeGrants=[]`. None has a verified PN/LID/JID,
verified account binding, verified client role, group membership, or
permission recorded in this artifact. The 23 CSV-derived records each have
one name and one raw phone in the prepared inventory; the explicit
owner-override record has no CSV phone row. No within-candidate alias set is
recorded for these entries. Two source-only phone overlaps with app contact
IDs are noted below; no production database comparison was performed.

| Candidate ID | Existing evidence reference | Source-only app contact overlap |
|---|---|---|
| `contact-12a5e4254865f3d18810` | CSV row 51 | None of the three app-source IDs |
| `contact-0369a8ed3b4bcacc09be` | CSV row 102 | None |
| `contact-8d1c51ac2d8c433984f4` | CSV row 103 | None |
| `contact-694a0e6b9a93a2fc0797` | CSV row 104 | None |
| `contact-67f18b31485cf382fca1` | CSV row 105 | None |
| `contact-adbff37a145504fcbc38` | CSV row 106 | None |
| `contact-e103f0ca88547f12c5bf` | CSV row 107 | None |
| `contact-73ee590f60154128c311` | CSV row 108 | None |
| `contact-a1a435a5d00584d8ca46` | CSV row 109 | None |
| `contact-9b61510c5dbe6c441a42` | CSV row 110 | None |
| `contact-d7b53c6a9615e01d3c87` | CSV row 111 | None |
| `contact-f64e7f31d5bb1dc7fb45` | CSV row 112 | None |
| `contact-b2ce2d6e87d897355984` | CSV row 113 | None |
| `contact-f3db0e004d6abb2bd914` | CSV row 114 | `escort-client-rezaul-karim-wa01` (source-only mobile match) |
| `contact-0eff86639813adf60f16` | CSV row 115 | None |
| `contact-24e4c2a38c2f77b06748` | CSV row 116 | None |
| `contact-d206903d4d2417924e1a` | CSV row 117 | None |
| `contact-3603662a7d6c3c39281d` | CSV row 118 | None |
| `contact-cc3469841131cd7120b5` | CSV row 119 | None |
| `contact-1591db28506679d94316` | CSV row 120 | None |
| `contact-57c3103feadb62aa5d8a` | CSV row 121 | None |
| `contact-7382135830e992217a4a` | CSV row 122 | None |
| `contact-184dc26963fc5ba63340` | CSV row 123 | None |
| `contact-382ce0d9f972e47fde09` | `owner-chat:2026-10-14:B04-identities` | `escort-client-hridoy-wa01` (source-only mobile match) |

The remaining app-source contact `escort-client-tcis-wa01` has no phone match
among these 24 B04 candidates. The two matches are deterministic
normalized-mobile matches between source artifacts; under the supplied
same-normalized-mobile rule, they identify the same operational phone identity
at the source-data level. They still do not prove a current Bridge1 PN/LID/JID
binding, deployed database row, account ownership or authorization. A
same-name/different-mobile merge was not performed.

## E. Data-flow diagnosis and evidence classification

| Question / stage | Finding | Classification |
|---|---|---|
| Is contact information present? | Yes: app-source list, schema seed, supplied B04 source/inventory, and historical exports are present. | `CONFIRMED` |
| Does B04 flow into the current app contact API? | No importer/caller for B04 inventory was found. The preparation adapter explicitly has no DB/activation interface. | `CONFIRMED` |
| Does a current app contact flow exist? | Source code reads active database rows into the producer and authenticated API; UI renders API contacts. | `CONFIRMED` (source only) |
| Is the API reading the table named by the Escort schema? | Yes: it selects `public.escort_client_contacts`; it checks only for `escort_order_register` before the paired queries. | `CONFIRMED` |
| Are deployed migration/rows verified? | No production database query was made. | `UNKNOWN/BLOCKED` |
| Are seeded contacts equivalent to Owner-approved native bindings? | No such proof is represented by `source='OWNER_PROVIDED'` or `active=true`; native-binding/decision evidence is absent from this table's schema. | `CONFIRMED` (schema distinction); actual Owner intent per row is `UNKNOWN/BLOCKED` |
| Is the B04 identity-review catalog the operational registry? | No: its README describes it as inactive/unmounted, with no live registry route. | `CONFIRMED` |
| Can current contact intake use group-catalog records? | No: contact matching rejects group chats; group catalog is not wired into the producer/API. | `CONFIRMED` |
| Is a direct client’s current native identity/account/permission verified? | Not by the reviewed artifacts; live verification was unavailable/not attempted. | `UNKNOWN/BLOCKED` |
| Are group approvals/routing active? | No active registry evidence; catalog/plan status is pending/review-only. | `CONFIRMED` for candidate status; live permissions are `UNKNOWN/BLOCKED` |

The proven issue is a **representation and integration boundary**, not evidence
that all data is missing: candidate preparation, narrow seeded app contacts,
and native identity/authorization are separate layers. The existing API
correctly queries the app's contact table, but cannot present proof the schema
does not store. The current producer's direct-contact match uses active row,
account and resolved phone; this shared ingestion script also handles Cash.
Changing its matching or verification behavior would require review of the
shared consumer and protected schema, and is not a safe documentation-only
correction.

## F. Implementation log

- Added this report and a short handoff entry only.
- No source, API, UI, migration, test, dependency, configuration, credential,
  grant, runtime or deployment code changed. No code fix was made: the
  relevant producer is shared with Cash, and the schema changes needed to
  distinguish configured from verified identities are migration-protected.
- No rollback is needed for code. The two documentation additions can be
  removed independently if the Owner requests it; no historical handoff text
  was rewritten.

## G. Test and validation results

| Check | Result | Detail |
|---|---|---|
| Read-only B04 candidate extraction | `PASS` | Parsed the existing JSON offline; found 24 classified candidates, all `UNVERIFIED_NATIVE` with zero bindings/grants. Output excluded personal contact values. |
| Candidate-to-app source comparison | `PASS` | Compared canonical inventory phones to the three app-source entries without printing phone values; found two file-level matches and no match for the third app ID. This is not a database test. |
| Group evidence inspection | `PASS` | Reviewed the saved catalog, scope plan, bounded group artifact and historical handoff references. No live enumeration. |
| `tests/escort-register.mjs` | `BLOCKED` | Not run: Node.js is not installed/on PATH in this environment. |
| API/UI automated contract tests | `NOT RUN` | No targeted offline contract test was available to run without the missing Node runtime. |
| Live database/API/MCP verification | `NOT RUN` | Explicitly outside this task's live-access boundary; production database and runtime state remain unverified. |
| Cash boundary / working-tree preservation | `PASS` | No Cash behavior or protected path was edited; before/after AL-RIFA'I and WhatsApp status listings retained the pre-existing dirty/untracked changes. |

## H. Owner review requested

No blanket approval is requested. Before any follow-up implementation or live
read, the Owner should review:

1. Which exact candidate IDs in section D, if any, are intended to be current
   Escort Clients, and what existing authoritative evidence identifies each
   person and current phone. Do not resolve by name similarity.
2. Whether each selected contact is bound to `wa-01`, `wa-02`, or both, with
   exact native PN/LID/JID evidence and validity period retained in the
   approved source of record.
3. Whether the three source-seeded app contact IDs represent intended
   operational contact configuration, independently of whether deployed rows
   are present.
4. For each of the five exact group JIDs in section C, whether it is intended
   for any current domain, and the exact account/domain/purpose. Group approval
   must not imply participant authority.
5. Whether the Owner wants a verified-identity gate for the shared producer.
   Any code/schema change would require exact path review; the producer is
   shared with Cash and all migrations remain under the Cash Freeze.

No live body, media, membership, or profile check is requested or performed
here.

## I. Safety and change record

- Financial writes: **0**
- Live WhatsApp identity enumeration: **0**
- Live message-body reads: **0**
- Live media accesses: **0**
- Database reads/writes in this task: **0**
- Imports/business-record creation: **0**
- Grant or credential changes: **0**
- Restarts/deployments: **0**
- Cash Payment behavior changes: **0**

The Cash Payment Freeze remains in force. The AL-RIFA'I and WhatsApp working
trees had pre-existing dirty/untracked files; they were left unchanged.

## J. Remaining blockers

- Production migration/row state and current native account/group bindings
  require an already-authorized read-only runtime/database path. Docker access
  limitations are not evidence that those records are absent.
- Owner must confirm exact contact and group scope before identities or
  permissions can be treated as authoritative.
- A reliable verified-vs-configured distinction would require a reviewed
  schema/producer/API contract change. The migration path is protected by the
  Cash Freeze; the shared reconciliation producer must not be edited without
  separate Owner review and an explicit, narrowly scoped exception if the
  change affects Cash behavior.
- Node absence blocked the existing focused Node test. No implementation
  should proceed on the basis of this report alone.

## Current

Evidence and source-to-app path are documented above. Source-level contact
integration exists; deployed state and identity verification do not follow
from source or seed evidence.

## Done

Reviewed app, schema, API, UI, producer, B04 artifacts, candidate identity
files, saved group evidence, prior handoffs and supplied-export metadata.
Produced a privacy-minimized review-only candidate list and preserved exact
historical group JIDs.

## Unverified

Current database rows, live runtime, native identities, account ownership,
group membership, Owner approvals and active permissions.

## Blockers

Owner review and an authorized read-only production verification path are
required before live checks. Any shared consumer or migration implementation
requires a separate review under the Cash Freeze. No live action is authorized
by this report.
