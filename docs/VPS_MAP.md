# START AUDIT — APP CONSTITUTION DOCUMENTATION — 14 October 2026 (Asia/Dhaka)

Owner authorized root read/edit of only the three documents below. Documentation only; preserve previous content. Existing latest integration-readiness handoff reviewed (2026-10-13T20:57:56.793473+00:00 UTC). Its production findings are prior evidence, not live checks rerun here.

## App Constitution — Owner-authoritative — 14 October 2026 (Asia/Dhaka)

**Owner: Fazle Azim (aslsg). This Constitution records the Owner's business direction and governs future AL-RIFA’I work. Later explicit Owner instructions prevail. Older proposals, agent recommendations, code defaults and qualification safeguards are implementation details subordinate to this policy; they do not create business authority or new approval requirements. Documenting this policy does not activate production capabilities.**

### মালিকের সহজ মূলনীতি / Simple business workflow

WhatsApp আর frontend একই অ্যাপের দুটি প্রবেশপথ। কে তথ্য দিচ্ছে এবং কী কাজ করতে চাইছে—এই দুই বিষয় দেখে তথ্য সংশ্লিষ্ট কাজে যাবে এবং একই অনুমোদিত ব্যবসায়িক ডাটাবেসে সংরক্ষিত হবে। নিয়োগের আবেদন থেকে Escort duty তৈরি হবে না; ব্যক্তিগত কথা ব্যবসায়িক হিসাবে মিশবে না। ফোনে, সরাসরি বা ওয়েবে পাওয়া অর্ডারও একই নিয়মে গ্রহণ করা যাবে।

**WhatsApp / frontend (including phone or offline entries) → verified identity + message intent → scoped domain workflow → one authoritative business database.** AI agents and MCP are supporting interfaces to this same workflow, not separate business systems or authorities.

| Identity and intent | Business route and authority |
| --- | --- |
| Designated Admin ↔ Accountant direct chat | Authorized ledger/accounting workflow under existing Owner-approved PAY-001–012. A valid designated Admin→Accountant direct message with successful attributable sending is business confirmation; no new acknowledgment, reply, receipt or manual-approval gate. Incoming Accountant messages follow their authorized scope, not automatic Admin authority. |
| Escort Client ordering or confirming service | Escort orders/programs, preserving Client, vessel, Master and employee identities separately; existing Owner-approved assignment/confirmation rules apply. |
| Employee / operational staff | Staff records, duty, attendance and related operations within the person's approved capabilities. |
| Applicant seeking employment | Recruitment/applicant workflow; an application does not grant employee status or create Escort production/roster/duty assignments. |
| Family, relatives and other personal chats | Segregated personal context; no automatic business, recruitment or ledger write. Explicit Owner-authorized business intent is needed to enter a business workflow. |

A person can have more than one approved role or phone. Route each item by verified identity, current scoped authority AND actual intent; neither a contact name nor chat membership grants permission. wa-01 is the Owner-designated Admin WhatsApp account; operational phone/JID/account bindings must be verified against Owner authority without publishing private values. Account identity is not proof that every self-message was authored or approved by the Owner. Unknown or conflicting identity/intent stays unresolved for the applicable review path; do not guess, discard it silently or route all chats to Escort.

### One business truth, source evidence and safe access

- Apply the same domain validation, permission, approval and persistence rules to WhatsApp, frontend and Admin-entered phone/offline orders. Record the actual channel and operator; a web entry must not pretend to be a native WhatsApp message.
- AL-RIFA’I is the intended single logical authority for business records in the existing canonical database. Preserve existing authorized production writers until a separately approved transition; native WhatsApp stores remain transport evidence, not a competing business database.
- Preserve source traceability: account/chat/message IDs where available, original sender and direction, original content/reference, source and entry times, operator, linked domain record and outcome. Keep forwarded/quoted origin separate from submitter; unavailable provenance remains explicitly unknown.
- Handle exact replay idempotently by stable source/event or command identity. Do not merge distinct orders solely because names, phones or text resemble each other. Preserve revisions and conflicts; uncertain write/send outcomes require reconciliation before retry.
- Access is scoped by approved identity, role, domain, account/chat and action. Approval comes only from Owner policy: retain existing applicable rules, never invent repeated or blanket gates. A technical deficiency must be explained as a concrete implementation gap, with the smallest compatible remedy; do not silently bypass protections or treat a test restriction as an independent authority over the Owner.
- Preserve PAY-001–012, employee-mobile-v3, separate release/completion/settlement/payment milestones and immutable historical evidence. Historical Level B remains CLOSED BY OWNER — HISTORICAL REFERENCE ONLY; it is not a prerequisite for the current workflow.

### Reuse first; agent scope and timebox

Reuse compatible Fazle-Core, current VPS code/contracts/parsers/UI, existing WhatsApp MCP and the qualified integration candidate before adding code. Check provenance, business-rule compatibility and deployed-vs-candidate status; reference availability or offline PASS is not live integration proof. Use one domain routing path and canonical writer for both inputs. No unrelated infrastructure, duplicate bridge/database/service, generic platform expansion or reopening historical work.

Start each task with START AUDIT and the latest handoff; state the Owner-authorized goal, exact paths, expected result and boundaries. Use one bounded assessment pass (target 30 minutes, a working timebox rather than a business approval gate). If unfinished, report evidence, remaining uncertainty and one smallest next task; do not loop into unrelated audits or implementation. Continue already authorized work without repeated permission requests; obtain separate approval only for actions outside that scope.

Explain decisions to the Owner in ordinary business language: what works, what is missing, how it affects the business, the smallest proposed change and any decision actually required. Include exact changed paths/diff summary and evidence limits. End with END AUDIT and safe handoff distinguishing historical findings, newly checked evidence, proposed work and unexecuted actions.

### Owner decision summary

**সিদ্ধান্ত স্থির:** WhatsApp ও ওয়েবের কাজ একই নিয়মে হবে; হিসাব, Escort, কর্মী, নিয়োগ ও ব্যক্তিগত কথার কাজ আলাদা থাকবে; বিদ্যমান উপাদান আগে ব্যবহার হবে। এই নথি পরিবর্তনের জন্য নতুন ব্যবসায়িক সিদ্ধান্ত দরকার নেই। Production চালু করা, deploy/restart, migration, credential/grant provisioning বা টাকা পোস্ট করার অনুমতি এই নথি দেয় না।


## Prior verified B01/B02/B03 — none closed by this update

Latest integration-readiness definitions: B01 live native capture/reader/startup and scoped consumer unavailable; B02 fixed qualification host/database/profile guards reject real alrifai and need scoped production bootstrap compatibility; B03 CID identity/review schema, restricted role and migrations absent in production. B04 actual named bindings/grants and B05 private access remain separate dependencies. Older B-number registers are not interchangeable.

**Copy-paste next task — NOT EXECUTED / NOT AUTHORIZATION:** Start with START AUDIT, this Constitution and latest handoff. Perform one bounded read-only reuse-first compatibility assessment for B01/B02/B03. Match Fazle-Core/current VPS assets and the existing qualified integration candidate against the canonical app/database and existing WhatsApp interfaces. Identify exact reusable paths, newly verified gaps, minimum proposed startup/host-profile/schema-role changes, acceptance checks and safe transition/rollback boundaries. Explain actual Owner decisions in ordinary business language; separate prior findings from new evidence. Do not implement gates, provision grants/credentials, deploy, restart, migrate, activate consumers or post money without separate Owner approval. End with END AUDIT and safe handoff; no unrelated infrastructure expansion or historical reopening.

## END AUDIT — APP CONSTITUTION DOCUMENTATION — SAFE HANDOFF

Changed paths:
- /opt/vps/apps/al-rifai/README.md
- /opt/vps/docs/VPS_MAP.md
- /opt/vps/NEXT-SESSION-HANDOFF.md

Identical prominent Constitution and audit section added to all three. Editing procedure verifies previous bytes unchanged and ownership/mode retained. No code/configuration/runtime/database changes, deployment, restart, migration, provisioning, WhatsApp send or financial posting. No new production-readiness or regression-test claim. Next task remains proposed and requires its own authorization. Previous document bytes follow unchanged.

---

# VPS Map

**HISTORICAL LEVEL B — CLOSED BY OWNER** (11 October 2026). Historical research, reconciliation, representation qualification, Option A validator repair and related historical-only work are closed. Original acceptance and PASS/FAIL/PARTIAL/BLOCKED/UNVERIFIED findings remain reference evidence; the old validator-repair recommendation is superseded. No import, posting or registry activation is authorized. Do not reopen without new explicit Owner authorization.

> CLOSED — HISTORICAL REFERENCE ONLY.
> This document records past investigation and is not a current production health report, active implementation task or authorization to resume historical reconciliation.
> Preserve original findings. Do not reopen without explicit Owner authorization.

This notice applies to the historical-only references indexed in the [canonical Safe Handoff](../NEXT-SESSION-HANDOFF.md); current infrastructure, employee/program contracts and live PAY-001–012 remain applicable. Historical Level B is not a prerequisite for current Escort Order processing. Current priorities are authorized incoming Escort Client messages (including verified Escort Hridoy contacts) through identity/direction verification, vessel/master extraction, draft, Admin assignment, client confirmation and controlled persistence; and current/future authorized Admin-to-Accountant messages under live PAY rules. Use actual Owner-supplied WhatsApp examples and preserve original/forwarding context. No operational implementation or activation is authorized by this documentation update.


Authoritative map of the deployed VPS foundation. Update this file when ownership, paths, networks, ports, or recovery procedures change. Never record credential values here.

## Server

- Hostname: `vmi3117764`
- Operating system: Ubuntu 22.04.5 LTS
- Architecture: x86_64
- Public IPv4: `5.189.131.48`
- Administrator access: `root` over SSH (port 22); VS Code Remote SSH is in use.
- Protected operational paths: `/root/.ssh` and `/root/.vscode-server`; do not modify, move, clean, or change their permissions.

## Canonical filesystem

| Path | Purpose | Must not contain |
| --- | --- | --- |
| `/opt/vps/apps` | Application source and app-owned deployment definitions. | Runtime state, secrets, or database files. |
| `/opt/vps/services` | Code and deployment definitions for genuinely shared services. | Service state or credentials. |
| `/opt/vps/infra` | Shared infrastructure Compose definition and its operational helper scripts. | Secrets or persistent database data. |
| `/opt/vps/docs` | This authoritative operational map. | Passwords, API keys, tokens, or session credentials. |
| `/etc/vps` | Root-restricted deployment configuration and credentials. | Application source or persistent runtime state. |
| `/var/lib/vps` | Persistent runtime data that must survive container replacement. | Git checkouts or backups. |
| `/var/backups/vps` | Restricted local backup staging. Backups must later be copied off-host. | Live database files or source checkouts. |

`/var/lib/docker` remains Docker-managed storage and is not an application data location.

## Applications

### Al-Rifa'i

- Status: **PHASE 1 VALIDATED — PRIVATE LOOPBACK ONLY** (8 October 2026, Asia/Dhaka).
- Canonical source: `/opt/vps/apps/al-rifai`; no Git initialization or publication.
- Compose: `/opt/vps/apps/al-rifai/compose.yaml`, project `al-rifai`, one service `app`, container `al-rifai-app-1`.
- Runtime: Next.js 16.3.4 / React 19.2.6, Node.js 22.23.3, pnpm 11.25.0; Dockerfile pins the Node 22 image digest.
- Runtime UID/GID: 10001:10001; read-only root filesystem; bounded stdout/stderr container logs.
- Host binding: **127.0.0.1:3000:3000 only**, verified free before startup. VPS-local URL: `http://127.0.0.1:3000`.
- Network: existing external `vps-backend`; database: existing `alrifai`; role: existing `alrifai_app`. No application-owned PostgreSQL deployment.
- Configuration: `/etc/vps/apps/al-rifai/app.env`; database and temporary validation passwords are separate restricted files there. Never record values.
- Private evidence: `/var/lib/vps/al-rifai/evidence`, read-only bind mount. Four historical JSON datasets remain byte-identical to staging; recovered seed source and five recovered rows are preserved separately.
- Authentication: temporary private HTTP Basic identity, username `validator`; Sites identity headers are ignored. Public login, audience authorization and session policy remain unselected.
- Persistence: PostgreSQL schema migrations explicitly applied after a rolled-back test-schema validation. Eight application tables plus migration ledger; six migration records and 54 immutable snapshot rows. Seven operational tables remain empty. Application database sessions default to read-only; startup and reads never import or migrate.
- Snapshot updates/deletes/truncation are rejected by database triggers. Import is transactional and insert-only; same-ID mismatches fail rather than overwrite.
- Pre-change logical backup: `/var/backups/vps/postgres/alrifai-before-phase1-20261008.dump` (restricted).
- Verification: production build, type checks, lint (0 errors, 18 inherited warnings), business/parser tests, private HTTP/API tests, unchanged state fingerprint after requests and restart. Two original-source reimport tests skipped because inputs/attestation are missing; no live D1 backup was supplied.
- Disabled: live Fazle Core, WhatsApp/conversation feeds, OpenAI, Hermes/9Router. No reverse proxy, DNS, TLS or public deployment.
- Report and exact file inventory: `/opt/vps/apps/al-rifai/docs/PHASE1_REPORT.md` and `phase1-file-changes.json`.
- Audited ZIP and `/opt/vps/import/al-rifai-v10/Al-Rifai-Website-Source` remain immutable and are not runtime inputs.

## Services

### WhatsApp

- Status: **WA-01 AND WA-02 CAP-4 CUTOVERS ACCEPTED — SEPARATE BOUNDED CONTENT-FREE WINDOWS; WA-03 PREPARED/INACTIVE**. No WA-03 activation/pairing or unrestricted workload authorization.
- Independent shared service; no AL-RIFA’I, AI harness or PostgreSQL dependency.
- Source: `/opt/vps/services/whatsapp/source`, selected remote `git@github.com:arshiyaazim/whatsapp-mcp.git`, baseline `895404542017f34a900f9f572a5497c275a96440` plus qualified local patches.
- Both active account images: `sha256:b76c837c435364011307859f8c04bc4aee02b3e3c97ae75e13a149e7a2584f83`, each explicitly `MAX_MCP_CLIENTS=4`; qualified cache-seeded provenance, no byte-identical reproducibility claim. All original images/containers/logs retained. WA-01 evidence `qualification/wa01-cap4-live-20261011/`; fresh WA-02 evidence `qualification/wa02-cap4-live-20261011/`; offline95-file source/image qualification `qualification/mcp-cap4-20261011/`.
- Canonical Compose: `/opt/vps/services/whatsapp/compose.yaml`, global name `vps-whatsapp-privacy`; both active CAP-4 services use existing explicit project override `vps-whatsapp-cap4-wa01`. WA-01 ID11facf3b…/start2026-10-10T21:01:42.049036697Z unchanged; WA-02 service `whatsapp-wa-02`, container `vps-whatsapp-wa-02-cap4-20261011`, ID `1d9ed658c18d47336ddc8d8e0ba28e0697147304574ef575d0c8953ef841b13c`, start `2026-10-10T21:51:51.056487476Z`. SHA256 `f5adfcd01a9714394af3abdab71f5a75c8ee9e1a1aa99f963cf5a09c208a7478`. Old project owners retained STOPPED; never resume beside active owners. No new WA-02 project, alternate operational Compose or broad reconciliation.
- Nonlogin service identity: `whatsapp-wa-01`, UID/GID `10002:10002`; no home directory created.
- State: `/var/lib/vps/whatsapp/wa-01/{store,outbox,control}`, service-owned 0700. Store contains `whatsapp.db`, `messages.db`, journals/WAL as applicable, private token and lock. Database/token/lock files verified 0600. Container mounts store/outbox/control at `/runtime/{store,outbox,control}`.
- Policy: `/etc/vps/services/whatsapp/wa-01-consumer-policy.json`, service-readable 0600 in root-restricted configuration directory; read-only container mount. Scoped reader credential: `/etc/vps/services/whatsapp/wa-01-reader.token`, root-only 0600. No secret values recorded.
- MCP: private Unix socket `/var/lib/vps/whatsapp/wa-01/control/mcp.sock`; stdio relay `/opt/vps/services/whatsapp/source/mcp-client.py`. Initial owner reader has messages/contacts/media read, media download and calls read grants; no outbound, reaction, receipt, typing, history-request or transcription grant. No client registration or Docker privileges granted to an application/AI account. Current host relay access is root-operator-only through private parent directories.
- REST: **127.0.0.1:8080 inside container only**, authenticated with scoped policy and Host validation. No host-published ports or HTTP/SSE MCP endpoint. Dedicated network `vps-whatsapp_whatsapp-private`; not attached to `vps-backend`.
- Startup command: `service --wait-unpaired`; with persisted session it reconnects normally. Authenticated health returned HTTP 200 / connected after controlled transition from temporary owner-operated pairing container. One paired device persisted; normal history synchronization is selected (`--full-history-pair` omitted). No historical backfill requested. Scoped contact/chat and limited message retrieval passed; no send performed by the agent.
- Hardening: nonroot, read-only rootfs, all capabilities dropped, no-new-privileges, no Docker socket; bounded logs 10 MiB x3; temporary 128 MiB tmpfs. Provisional 1 CPU / 512 MiB / 128 PIDs, restart policy `no`.
- Lifecycle: inspect explicit account service with `docker compose -p vps-whatsapp-cap4-wa01 -f /opt/vps/services/whatsapp/compose.yaml ps whatsapp-wa-01` or `ps whatsapp-wa-02`. Both active services require that existing project override. All future targeted starts/stops/cutovers need account-specific owner authorization and sole-writer/restart gate. Never broad up/down/reconciliation/pruning or resume retained old project owners; WA-03 profile remains inactive.
- Recovery policy: MOBILE_BACKUP_ONLY; VPS_HISTORY_LOSS_RISK_ACCEPTED; REPAIRING_ACCEPTED; ADDITIONAL_VPS_RECOVERY_DEFERRED. No new VPS backup/key/recovery prerequisite. Mobile backup is not verified restoration of VPS linked state/SQLite/MCP history. Paired-state restore remains unqualified; never run cloned linked sessions. Any future recovery work requires fresh approval.
- Evidence: `/opt/vps/services/whatsapp/qualification/gate-d-results.json` (26 PASS), `gate-e2-results.json` (30 PASS) and current `/opt/vps/whatsapp-mcp-plan.md`. Owner-operated pairing, persistent session, reconnect without QR and scoped live retrieval passed. Snapshot: 723 chats, 14,271 messages; stored timestamps 2025-01-11 06:03:41 UTC through 2026-10-10 09:53:09 UTC. Counts may grow; full history coverage and sustained load are not qualified. Full feature code retained; consumer grants govern execution. Webhooks, automatic media download and application ingestion remain disabled.

- Historical WA-01 cap-4 live acceptance (WA-02 still original during that window): exact persisted reconnect/no QR, writer/FLOCK release before new start, private/auth boundaries,12 tools/8 denials, four sessions/fifth rejection/slot reuse and ordinary cleanup PASS;92 sequential zero-row store reads, observed602.12s, sampled peak315.95MiB/headroom196.05MiB at unchanged1CPU/512MiB/no swap/128tasks. ERROR0/WARN0/WARNING0, no WARN/WARNING records observed; no OOM/restart/logout observed. Only this content-free window qualified; one outstanding request/client and response-byte/context bounds remain unenforced. Live positive results/media/history/24h stability and paired rollback unqualified. END explicitly records authorized wa-01 changes/zero unauthorized deviations; wa-02 connected and unchanged/wa-03 inactive. See current report and canonical handoff.

- WA-02 cap-4 live acceptance: separate fresh START/gate/END PASS; persisted reconnect/no QR, old owner exit0/writer-lock release before one candidate start; private/auth boundaries/12 tools/8 denials, four consumers/fifth refusal/slot reuse/ordinary cleanup PASS;92 sequential zero-row reads over602.70s. Independent sampled peak324.04 MiB/headroom187.96 MiB, unchanged1CPU/512MiB/no swap/128tasks;128 MiB engineering reserve intact/events0, ERROR0/WARN0/WARNING0. WA-01 original accepted runtime/config/writer/socket remained unchanged and connected, no WA-01 MCP traffic; WA-03 inactive; AL-RIFA’I/PostgreSQL healthy. Premature socket check corrected by read-only readiness verification within original deadline, no runtime recovery. Only observed content-free window accepted; arbitrary concurrency/result bytes/positive content/history/media/24h/rollback remain unqualified. END explicitly records authorized WA-02 changes/zero unauthorized deviations. Report: `qualification/wa02-cap4-live-20261011/report.md`.
- Current WA-02 health command: `python3 /opt/vps/services/whatsapp/qualification/privacy-deployment-20261010/operator_check.py vps-whatsapp-wa-02-cap4-20261011 wa-02`; explicit account argument and existing scoped authentication, sanitized output only. No continuous monitor/automatic recovery service.

- Historical privacy deployment acceptance: exact image/runtime/source provenance, same private session/schema, both SQLite integrity checks,20bounded historical references, scoped MCP7checks and601.22seconds/21healthy samples PASS;0errors/disconnects/restarts, peak~90.9MiB/11PIDs. Fresh post-patch inbound NOT RUN. Unofficial-client WhatsApp policy risk HIGH, no Meta approval.
- wa-02/wa-03 preparation: nonlogin UID/GID10003/10004; own0700 store/outbox/control, native DBs initially empty at offline preparation and independent service tokens, own600 scoped policy/reader token under existing configuration directory. No copied session.37offline checks PASS including all six directed REST/MCP cross-token denials; retained offline qualification containers STOPPED/network none. wa-02 paired through owner-invoked private SSH/terminal QR; historical original container IDbb0b1401c8e3c5d6abf98269d656852490cf14549eed4ed2de3ae3cad91c0f4a, persisted reconnect start2026-10-10T18:07:21.731877599Z, approved image/restart0/no. wa-03 stays inactive/unpaired. Temporary pairing container retained STOPPED; never resume alongside normal owner. Private owner-invoked helper `/opt/vps/services/whatsapp/qualification/wa02-live-20261010/pair_wa02.py` qualified; live distinct identity/SQLite/MCP/token denials/privacy checks passed, plus 611.32seconds/21healthy health/MCP/SQLite samples; combined acceptance PARTIAL due to1wa-01stdio shutdown ERROR/2WARNs, focused read-only audit disposition B: bounded continued operation supported; shared shutdown/privacy-filter defects were corrected offline; both accounts now run the separately qualified CAP-4 image above; the following original-image evidence is historical. Historical correction candidate `vps-whatsapp:mcp-correction-candidate-20261011`, immutable ID `sha256:a5d479df520762473daf09470b468abc7d3a733b4903aebe05fb4a0757b4bd39`;202 Python/137 Go top-level tests and packaged lifecycle/privacy/isolation/compatibility/provenance gates PASS. Historical eight-client sample used~490.9MiB/95.9%; subsequent restricted4-client offline qualification and wa-01-only cutover are recorded above. wa-03 stays inactive; that historical task authorized no cutover/pairing; the later separately authorized WA-02 cutover is above, and WA-03 pairing remains unapproved. See `qualification/mcp-correction-20261011/report.md` and END AUDIT. Exact historical trigger and redacted dependency WARN causes remain uncertain. Prior counts omitted Python WARNING: corrected18:10–18:25:26UTC wa-01 ERROR1/WARN2/WARNING23, wa-02 ERROR0/WARN1/WARNING23. See `qualification/mcp-shutdown-audit-20261011/report.md`. Evidence `qualification/wa02-live-20261010/end-audit.json`; initial redacted pairing error/warnings have unknown causes, no ongoing failure observed. Canonical Compose profiles wa-02/wa-03 disabled by default; historical planned names vps-whatsapp-wa-02-privacy-20261010 and vps-whatsapp-wa-03-privacy-20261010; active WA-02 identity is above. wa-02 authorization exercised/completed; wa-03 activation/pairing still needs its own explicit confirmation. Target health: qualification/privacy-deployment-20261010/operator_check.py CONTAINER ACCOUNT. No additional public network/service/database.

- Gate E3: **PARTIAL** (10 October 2026). Owner confirms no existing backup encryption key and instructs no interruption/key creation. Session backup, encryption verification and disaster recovery are **BLOCKED**; off-host backup **PENDING**. Backup directory remains empty; no plaintext backup created. Restart policy stays `no`; `unless-stopped` is proposed only after verified encrypted backup and separate owner approval.
- E3 non-disruptive stability: 601.7 seconds / 21 healthy samples, no disconnect/restart/error or QR/token leak observed; account identity stable. Sampled peak about 79.2 MiB / 11 PIDs, within provisional limits. Final scoped read-only retrieval, write denial, SQLite integrity, lock and protected-service checks passed. E3 controlled restart/post-restart reconnect NOT RUN/NOT TESTED; prior E2 reconnect remains verified.
- Operator health command for current wa-01: `python3 /opt/vps/services/whatsapp/qualification/privacy-deployment-20261010/operator_check.py vps-whatsapp-wa-01-cap4-20261011 wa-01`. Existing utility reads auth internally and emits sanitized summaries. Historical `qualification/wa-01-health.py` targets the stopped previous container and is retained, not a current health check. No continuous monitor/automatic recovery service.

### Hermes and Router

- Hermes Runner and Router/9Router are conditional future components, not installed services. Add them only when an actual shared-runtime or multi-consumer requirement is established.

## Infrastructure and Docker

- Compose project: `vps-infra`
- Compose file: `/opt/vps/infra/compose.yaml`
- Owned infrastructure service: PostgreSQL only.
- Shared Docker network: `vps-backend` (bridge; outbound connectivity is allowed; no inbound host port is published).
- Docker data root: `/var/lib/docker`
- Container logs: Docker `json-file` driver; applications should log to stdout/stderr. No duplicate application log directories.
- Current daemon log rotation has not been configured. A future controlled change may use this `/etc/docker/daemon.json` configuration:

  ```json
  {
    "log-driver": "local",
    "log-opts": {
      "max-size": "10m",
      "max-file": "5"
    }
  }
  ```

  Applying it requires a planned Docker restart and is not part of this deployment.

## PostgreSQL

- Runtime: Docker, owned only by `vps-infra`
- Compose service: `postgres` (no fixed `container_name`)
- Image: `postgres:16-alpine`
- Database: `alrifai`
- Bootstrap/admin role: `vps_pg_admin` (initialization/administration only)
- Application role: `alrifai_app` (non-superuser, owns the `alrifai` database)
- Persistent data: `/var/lib/vps/postgres`
- Runtime directory ownership: PostgreSQL image initialized this empty bind-mounted directory as UID 70, GID 0, mode `0700`. This is the image's observed runtime ownership; do not recursively change it without checking the selected image identity.
- Backup staging: `/var/backups/vps/postgres`
- Credentials: root-only files under `/etc/vps/infra`; never commit or document values.
- Public/host port: **NONE**; port 5432 is reachable only from containers attached to `vps-backend`.
- Network: `vps-backend`
- Application/service Compose stacks MUST NOT create another PostgreSQL instance without explicit administrator approval.
- Verification completed: PostgreSQL healthcheck, database and least-privilege role checks, authenticated TCP access over `vps-backend`, and logical backup/restore into a separate temporary database. A marker also survived both container restart and forced Compose recreation using the canonical bind-mounted data. All proof tables, the temporary restore database, and the proof dump were removed afterward.

### PostgreSQL backup and restore pattern

Logical backups must be produced from PostgreSQL (not by blindly copying a running data directory). Example pattern, with the target filename chosen by the operator:

```sh
docker compose -f /opt/vps/infra/compose.yaml exec -T postgres \
  pg_dump -U vps_pg_admin -d alrifai -Fc > /var/backups/vps/postgres/alrifai-<timestamp>.dump
```

For restore verification or recovery, create a separate target database owned by the application role, then restore into that database without overwriting the canonical database:

```sh
docker compose -f /opt/vps/infra/compose.yaml exec -T postgres \
  createdb -U vps_pg_admin -O alrifai_app alrifai_restore_test
docker compose -f /opt/vps/infra/compose.yaml exec -T postgres \
  pg_restore -U vps_pg_admin --role=alrifai_app --no-owner \
  -d alrifai_restore_test < /var/backups/vps/postgres/alrifai-<timestamp>.dump
```

Verify the restored data before any cutover. Drop only the explicitly designated temporary restore database after verification. Backups are sensitive and require encryption/access controls; an off-host backup destination and retention policy remain to be selected.

## Current container identities and backups — 2026-10-29

- **Application:** `al-rifai-app-1`, compose project `al-rifai`, service `app`, file `apps/al-rifai/compose.yaml`. Image `sha256:cace72aab3bbeff80abd4eafda76b55ea0de439c0dbda4b9e0f493bbcda36ed2`. Healthy. Mode `shadow`.
- **PostgreSQL:** `vps-infra-postgres-1`, image `postgres:16-alpine`, healthy, database `alrifai`.
- **WhatsApp WA-01:** `vps-whatsapp-wa-01-cap4-20261011`, image `ae009303de09`. Degraded: 1 of 9 approved chats fails with `NATIVE_READER_UNAVAILABLE` (see `NEXT-SESSION-HANDOFF.md`).
- **WhatsApp WA-02:** `vps-whatsapp-wa-02-cap4-20261011`, image `local/vps-whatsapp:20261020-ingestion`. Identity-only by policy.
- **Backup location in use:** `/var/lib/vps/al-rifai/backups/`. It holds the current pre-change dumps (about 1.3 GB). This differs from the staging path named in the Backups section below, `/var/backups/vps/postgres`. Owner decision needed on the canonical location and the off-host copy.
- **Backup convention:**
  - Dump with `docker exec vps-infra-postgres-1 pg_dump -U vps_pg_admin -d alrifai -Fc`.
  - Name `pre-<change>-<YYYYMMDD-HHMM>.dump`, with a `.sha256` sidecar.
  - Set mode `600`, then confirm it lists with `pg_restore -l`.
  - Keep every pre-change dump. Prune only with Owner approval.
  - A compose backup is kept beside the dumps as `compose.yaml.pre-<digest-prefix>`.

## Backups

- PostgreSQL: consistent logical backups under `/var/backups/vps/postgres`.
- WhatsApp: owner-selected mobile backup only; VPS history-loss and re-pairing risks accepted, additional VPS recovery deferred. No VPS backup/key setup authorized; mobile backup does not verify VPS linked-state recovery.
- Configuration: back up required configuration under `/var/backups/vps/config`, protecting secrets.
- Off-host replication is required for disaster recovery and is not configured yet.
- Do not back up containers, images, build caches, `node_modules`, or other reinstallable generated files.

## Networking and exposure

### Current cross-service boundaries — 11 October 2026

Read-only runtime verification: AL-RIFA’I/PostgreSQL healthy on `vps-backend`; connected wa-01/wa-02 on the separate `vps-whatsapp_whatsapp-private` network, no host ports. Each account owns its isolated `store`, `outbox`, `control` mounts; AL-RIFA’I has no WhatsApp-store mount or registered MCP consumer. Webhooks and automatic media download are disabled. No live capture→application identity/parser/draft/writer connection exists. Candidate app integrations/RBAC are **PLANNED**, current workflow acceptance **BLOCKED**, stored offline helpers **IMPLEMENTED BUT UNVERIFIED** for this intake. Historical Level B is **HISTORICAL/CLOSED — CLOSED BY OWNER — HISTORICAL REFERENCE ONLY**.

The separately hosted Sites project is **RUNNING** at version 10 (`https://al-rifai.iamazim.com`), with platform access mode `public` and D1 binding `DB`; it declares no Site MCP. No public proxy or route into this VPS is verified. Its eight table names and retained version-10 source do not establish PostgreSQL ownership transfer, live operational integration or current application RBAC. Current Sites source access via MCP is unavailable; runtime overrides/application access remain unverified. Detailed responsibilities, contact/group findings and remaining gates are in the [application README](../apps/al-rifai/README.md#current-architecture-and-operations-readiness--11-october-2026) and [latest Safe Handoff](../NEXT-SESSION-HANDOFF.md#current-whatsapp-operations-foundation-and-documentation-reconciliation--11-october-2026).

```text
Internet
  |
SSH on host port 22
  |
Host (Al-Rifa'i published only on 127.0.0.1:3000; no public web/proxy ports)
  |
Docker bridge: vps-backend (private container-to-container path; outbound allowed)
  +-- postgres:5432 (no host port)
  +-- Al-Rifa'i app:3000 (host loopback only; temporary private authentication)
  +-- future authorized services only

Separate Docker network: vps-whatsapp_whatsapp-private (no published ports)
  +-- wa-01 native bridge + scoped MCP broker (one native writer)
  +-- wa-02 native bridge + scoped MCP broker (one native writer)
  +-- wa-03 inactive (no native writer)
```

PostgreSQL, WhatsApp, Hermes, and internal routing services are private by default. A future reverse proxy and web application may publish intended HTTP/HTTPS ports only after domain and firewall approval. Do not publish internal service ports for testing.

## Security rules

1. Only `vps-infra` owns PostgreSQL.
2. Application/service Compose stacks MUST NOT create another PostgreSQL instance without explicit administrator approval.
3. PostgreSQL must not expose port 5432 publicly or on a host-published port.
4. Internal services are private by default; attach only authorized services to `vps-backend`.
5. `/root/.ssh` and `/root/.vscode-server` are protected operational directories.
6. Secrets must never be committed to Git or written into this map.
7. Persistent runtime state must not live inside Git checkouts.
8. `/etc/vps` and `/var/backups/vps` are restricted to root; use least privilege for any future service-specific access.

## Startup and recovery overview

- Start/inspect infrastructure with `docker compose -f /opt/vps/infra/compose.yaml up -d` and `docker compose -f /opt/vps/infra/compose.yaml ps`.
- Confirm PostgreSQL reports healthy before enabling dependent applications.
- `/opt/vps/infra/ensure-alrifai-role.sh` creates or synchronizes the non-superuser `alrifai_app` role from its protected credential file and assigns database ownership.
- For recovery, restore a logical backup to a separate database first, verify it, then obtain administrator approval before any production cutover.
- Al-Rifa'i Phase 1 is private on loopback. No automated backups, reverse proxy, Hermes, or Router are configured. WhatsApp wa-01 and wa-02 run paired and connected independently as described above; wa-03 remains inactive.


## B04/B05 live scoped baseline and app roadmap — 2026-10-15T00:18:32.417777+06:00

Current entry https://app.al-rifai.iamazim.com/review; existing named admin credential unchanged. Package `/opt/vps/apps/al-rifai/qualification/b04-b05-completion-20261014/REPORT.md`; roadmap `/opt/vps/apps/al-rifai/APP_COMPLETION_PLAN.md`. Owner authorized this session's completion work; only app/wa-01 changed. Fixed six-person registry with ten new PN/LID incoming aliases and91 bounded grants, five-person exact native reader, named subject selection/native refresh/shared draft path and live security/replay/revocation checks verified.

Two actual incoming Hridoy events resolve to one verified Client; original native receipts and explicit qualification draft survive actual restart/replay. Unknown forwarding stays clarification. Qualification draft is held NEEDS_CLARIFICATION/NOT_ACTUAL_ORDER; preserve evidence. Named HTTPS/browser38, live native/form18, controlled scope revoke12, session boundaries5 and saved ON/effective OFF/ending OFF settings3 checks pass. Current-source synthetic workflow13groups/41traces, targeted18, policy21 and Go socket/lease/race10top-level55including subtests pass; these are not physical phone/reject/delivery proof.

Real restart stale owned call socket fixed in the reviewed bridge: only same-owner ECONNREFUSED cleanup; active/foreign/file/symlink/replaced inode refused. An execution mistake started deployment after an image-executable smoke failure, briefly making wa-01 unavailable. Corrected file mode, exact-image smoke prerequisite and socket identities/ACL/remount restored connection; failure and recovery evidence retained. Final app/wa-01 running; PostgreSQL/wa-02 ID/image/start unchanged. App image84c60c6f8359…; bridge9f34e0d6c5c5…; exact full pins in ACTIVATION_ARTIFACTS.json.

Calls saved/effective OFF, connected, caller list empty/all-trusted-direct false, cooldown600, eight owner/wife/daughter/Accountant PN/LID exceptions saved; action capabilities absent. WhatsApp toggle disabled pending human attribution; frontend works independently. No real reject/send/provider/financial action. No new migration/credentials/DNS/TLS/public port/service/database/pairing; ledger11 and countsprogram/cash/payment/settlement0/source54 unchanged. PAY-001–012/employee-mobile-v3/historical closure retained.

**Full B04/B05 acceptance OPEN.** Actual owner device acceptance, broader service/Employee/participant proof and unknown-chat/provenance compatibility remain as documented; do not convert retained synthetic cases into live domain PASS. Current app reader permits only ten exact direct namespaces, no group participants or broad contacts/store/send. Only one named owner login; other contacts are not logins.

Owner was asked once for PC/mobile feedback and a different controlled physical phone; no answer recorded in this session. Do not repeat activation approval for already authorized work. Original17:05–17:10 slot expired/not executed; no guessed new caller/time. Controlled proposal ready=false, caller/start/end null. Next smallest required external step: owner device check plus other-phone caller/fresh300s window for physical pilot; next development batch is roadmapphase1 acceptance/unknown inbox then one verified real client order. No blanket per-call confirmation gate after approved ON. Future business/financial/provider/general-send phases remain plans, not automatically authorized rollout.

Old packages untouched; canonical README/VPS_MAP/handoff append-only. Root-private checkpoints preserved; never overwrite newer receipts/data with backups as rollback. Final boundary/pins and detailed diff in this package.

END AUDIT — SAFE HANDOFF


## Inbox usability deployment — 2026-10-15T00:56:54.021436+06:00

Owner approved isolated build/tests then app-only deploy/restart. Current image
sha256:6b55d4160b16c0aa5e587d112bf692d9e4f24a2d21d5554ca2ee5a28eee9e16f; existing URL/login unchanged. Default permitted IDENTITY
inbox auto-loads; names, source text/time and current-page search are available.
Native refresh reloads reviews; zero new events does not mean no prior messages.
Database/call/technical controls collapsed. Initial default ESCORT mismatch was
found during live test and corrected; failed evidence and images retained.
Full build/typecheck/smoke PASS; isolated browser 22 PASS;
live trusted HTTPS/browser 24 PASS, including actual native
source. Physical owner phone and headless Bengali glyph rendering unqualified.
Only app recreated; PostgreSQL/wa-01/wa-02 exact initial states retained.
Calls OFF/connected; no send/reject/financial action or permission expansion.
Full B04/B05 remains OPEN. Details: /opt/vps/apps/al-rifai/qualification/inbox-fix-20261015/REPORT.md.


## Owner-facing business inbox correction — 2026-10-15T01:20:22.664877+06:00

Owner requested that fixing the page preserve the complete AL-RIFA’I business
target. Current actual source: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/source/alrifai. Image sha256:18f6086df8c6ebfe46d55245ef62122b40786789c7b7c57768446923ab1814c5.
Three tabs: Messages / Write a new request / Work steps. Only source-proven
permitted native messages appear in inbox; manual/held qualification drafts
are excluded without deleting evidence. Domains are merged; no owner technical
category selection. JSON/qualification command/database/call diagnostic controls
are removed from this page. Existing backend permissions and call OFF unchanged.
Full build/typecheck/smoke PASS; isolated browser 30 PASS;
live normal HTTPS/browser 30 PASS. Only app restarted;
PostgreSQL/wa-01/wa-02 exact ID/image/start unchanged. No finance/order/send,
credential, migration, grant expansion or history import.
Physical owner mobile and headless Bengali glyph rendering remain unqualified.
Target/workflows: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/TARGET_WORKFLOWS.md. Full app and B04/B05 still OPEN.
Next business milestone is one verified real client request → canonical approved
order → approved Employee assignment; do not keep treating inbox polish as full
business completion. Preserve PAY-001–012, employee-mobile-v3 and historical closure.
Report: /opt/vps/apps/al-rifai/qualification/business-inbox-20261015/REPORT.md. Roll back app image only if needed; never restore older DB.


AL-RIFA’I workflow source release, 15 October 2026 (Asia/Dhaka): candidate images/SQL and source-linked Cash/canonical Roster UI are prepared, **not deployed**. Running service locations/projects/pins remain unchanged. Current catalog/ledger/guard fingerprints: `/opt/vps/apps/al-rifai/data/workflow-runtime.json`; candidate pins/diff: `data/workflow-release.json` and `data/workflow.patch`; full limits/actions: [WORKFLOW_RELEASE](../apps/al-rifai/docs/WORKFLOW_RELEASE.md). Socket candidate uses a dedicated socket-only directory and UID10001 named ACL, not yet provisioned. No PostgreSQL/wa-02 restart, paired-store modification, send, call action, real payment or cleanup.


### 2026-10-16 current owner reconciliation release
Current app source /opt/vps/apps/al-rifai; runtime image sha256:5ab90e01d6b00b8e53670f7798678f3103d09135f4bddf533e7934909a20d2b0; current code 24b28299092daba1409d962fb6b2a01c082299f8. Existing private URL unchanged. Full current release/operation/recovery evidence: apps/al-rifai/docs/WORKFLOW_RELEASE.md (final2026-10-16 section). Earlier 'no VPS backup authorization/no automated backup/no operational intake' notes are historical; owner explicitly authorized current recovery and scoped cached reconciliation. Existing PG16 database alrifai migration ledger15;24 REVIEW/BDT5200,5Draft,0postings preserved. One alrifai-reconciliation timer/service uses readonly cache snapshots and existing app's PG writer, not a new MCP consumer/bridge. Root-only encrypted daily alrifai-recovery timer08:15Dhaka plus<=120s jitter;29-table actual restore rehearsal PASS. Both original bridges retain writer/session mounts/start times, restart policy now unless-stopped. Offhost/key independent custody unconfigured; missing media/upstream history and financial grants remain explicit limitations. Sites deployment/domain untouched.


## CURRENT RUNTIME RECONCILIATION ADDENDUM — 17 October 2026

**Purpose:** reconcile dated documentation with a fresh read-only runtime audit. Older entries in this map are preserved as historical evidence; no prior finding was deleted or silently rewritten.

### Freshly verified current state

- Canonical source remains `/opt/vps/apps/al-rifai`; current Compose project is `al-rifai`, service `app`, container `al-rifai-app-1`.
- Current deployed app image is `sha256:2b039f99c480f6807d595a2eb0ccd37714d672aa83c4ded8dbf6a6caf43369d6`; container was healthy with restart count `0` during the audit.
- `alrifai.iamazim.com` resolved to the VPS and external HTTPS returned `/cash` `200` and `/vessel` `401` without private authentication. Authenticated `/vessel` and `/api/escort-register` returned `200`.
- PostgreSQL, wa-01 and wa-02 were running; the PostgreSQL container was healthy. No wa-03 activation was observed.
- `alrifai-reconciliation.timer` and `alrifai-recovery.timer` were enabled and active. The latest reconciliation result had no processing errors; a prior failure record remains retained for diagnostics.
- The production migration ledger contained 19 entries, ending at `0018_escort_order_register.sql`.
- Read-only counts were: 3 escort client contacts, 314 escort-register rows, 314 escort events, 194 `DRAFT`, 120 `REVIEW`, 0 `CONFIRMED`, 1,461 cash instructions, 1,437 cash postings and 5 canonical programs.

### Reconciled documentation status

Older statements in this map describing Phase 1 as loopback-only, without public HTTPS/TLS, or without automated recovery/reconciliation are historical statements from their dated audit sections. They are not the current runtime status. They remain in place to preserve provenance; this addendum is the current verified operational reference until a later audited update replaces it.

### Current limitations still in force

- Cash web access is live and read-only. Compose currently has live cash sync and live cash intent capture disabled; existing cash rows are visible, but automatic capture of a new WhatsApp cash message is not verified as active.
- The main Vessel register reads the historical/source projection unless a separately verified live Core configuration is present. The Escort intake projection is a separate read-only register.
- The reconciliation projection does not change the canonical `programs` table. No confirmed escort row was observed in the current database, and no end-to-end Admin-confirmation-to-canonical-program update is claimed.
- No separate canonical employee-master table was found in the current public schema; employee/mobile values remain fields or source-linked references in existing domains.
- Native WhatsApp coverage remains partial local-cache coverage. No claim is made for complete continuous event lineage, all original media bytes, durable cursor replay, or independent proof of human authorship for every outgoing message.

### Task 1A current app-scoped access limitation — 18 October 2026

- The live AL-RIFA'I reader verified wa-01 identity only. Its stored-message
  content/history request was rejected; the three registered target-group
  native-event reads were rejected, and the Hridoy direct native page returned
  no records. The two known Hridoy IDs were visible only through proof status.
- The current AL-RIFA'I profile has no wa-02 broker binding and no direct
  WhatsApp store/media mount. `messages.read`, `contacts.read`, `media.read`
  and `media.download` are therefore unverified as current grants for this
  consumer. Historical bridge grant descriptions above must not be treated as
  current app access proof.
- Coverage from 2026-07-01 through 2026-10-18, including the three target
  groups, remains unverified. No body/media extraction or live database fill is
  authorized by this documentation entry.

No credential value is recorded here. This addendum records read-only evidence only; it does not authorize migration, credential/grant provisioning, message sending, financial posting, or further deployment.

END CURRENT RUNTIME RECONCILIATION ADDENDUM


## HISTORICAL CASH PAYMENT FREEZE BASELINE — 17 October 2026

At this checkpoint the Owner's Cash Payment development freeze was in force;
the following runtime counts and flags are historical read-only evidence, not
a current health or business-state assertion. On 25 October the Owner
authorized Cash, WhatsApp, Message Mirror, Vessel, and UI source development
and isolated tests. Existing identity, amount, recipient, approval/review,
deduplication, and evidence safeguards remain binding. Production database
writes/migrations, deployment, restart, Live Sync, historical backfill,
WA-02 permission changes, and financial posting remain unauthorized.

Fresh read-only baseline for this freeze: `al-rifai-app-1` healthy, restart
count `0`, image
`sha256:274eca3c31d51e7e04c2ce32d6ec7e0907e256d5f1bc938e7ba30781e8c25c86`;
ledger `20` through `0019_cash_lid_employee_master.sql`; PN checkpoint
`14852`; LID channel checkpoint `15281`; Cash instructions `1556` (`24`
`REVIEW`, `1532` `MANUAL_READY`); postings `1532`; movements `3064`;
employee master `169`. Runtime flags are `ALRIFAI_LIVE_CASH_SYNC=1` and
`ALRIFAI_LIVE_CASH_INTENT_CAPTURE=APPROVED_AUTO_POST`. No secret values are
recorded.

The current Owner boundaries are maintained in `/opt/vps/AGENTS.md`. The
advisory path check at
`/opt/vps/apps/al-rifai/scripts/cash-freeze-guard.mjs` no longer blocks
authorized source paths and is not a production gate. No app-specific
workflow enforcing the former path freeze was found; external branch
protection is not verified.

## CURRENT OPERATIONAL CHECKPOINT — 21 October 2026

**Observed at 07:05:32 CEST (+02:00):** `al-rifai-app-1` was running and
Docker-reported healthy with restart count `0`; its in-container Node runtime
was `v22.23.3`. A host-side `GET http://127.0.0.1:3000/api/health` returned
`{"status":"ok"}` at 06:46:11 CEST. These are point-in-time observations,
not an ongoing availability guarantee.

- The path-limited Owner-approved change is in
  `/opt/vps/apps/al-rifai/compose.yaml`: only the wa-01 and wa-02 control
  bind mounts use `read_only: false`. Only the AL-RIFA’I `app` service was
  recreated; neither bridge nor PostgreSQL was restarted/recreated.
- Host paths `/var/lib/vps/whatsapp/wa-01/control` and
  `/var/lib/vps/whatsapp/wa-02/control` are mode `0710`, owned by
  `10002:10002` and `10003:10003`. Their `mcp.sock` files were observed
  `0660` with matching ownership. From `al-rifai-app-1`, both sockets were
  present and `r=yes w=yes`.
- Bridge health is **unverified**: `wget` and `curl` were unavailable in
  both bridge containers. Bounded 72-hour logs showed repeated
  connected/disconnect/reconnect markers; sync progress/completion was not
  established. No namespace or host-network workaround was used.
- Container inventory observed 14 running containers: 4 Compose-managed and
  10 `ghcr.io/github/github-mcp-server:0.29.0`. The 10 MCP process names and
  host parent-process findings are listed in `/opt/vps/AGENTS.md`; none was
  stopped, removed, or changed.
- At that checkpoint the Cash Payment freeze was unchanged. The Owner has
  since authorized Cash source development and isolated integration tests;
  financial safeguards and the production boundary remain in force. See the
  current recovery handoff below.

See `/opt/vps/AL-RIFAI-CURRENT-RECOVERY-STATUS.md` and
`/opt/vps/NEXT-SESSION-HANDOFF.md` for the detailed evidence and boundaries.


## WHATSAPP MESSAGE MIRROR AND CASH RECOVERY — 25 October 2026

Al-Rifa'i is in a modular business-application rebuild while retaining its
existing VPS, PostgreSQL, and WhatsApp infrastructure. The Owner authorized
resuming Cash development-unfreeze and WhatsApp MCP/Mirror-to-domain
integration in source and isolated tests. This does not authorize production
database changes, deployment, restarts, Live Sync, historical backfill,
WA-02 permission expansion, or financial writes.

The authoritative Mirror schema is
`/opt/vps/apps/al-rifai/db/migrations/0025_whatsapp_message_mirror.sql`.
It defines six tables under `whatsapp_mirror`: `bridges`,
`schema_migrations`, `messages`, `message_sources`, `message_events`, and
`sync_checkpoints`. The migration is the source of truth for exact columns,
types, constraints, defaults, and indexes.

WA-01 and WA-02 containers were running at the last read-only observation,
but their approved health probes returned no payload and exit code 6.
Message-reading capability and authorized chat scopes remain unverified.
WA-03 was not present as a running container and remains unconnected / ready
for connection. Runtime tool inspection found the native live-reader tools
required by the Mirror absent from WA-01; WA-02's runtime exposure of legacy
message/contact tools conflicts with its identity-only scope and must not be
used to widen access. The Compose Mirror flag remains disabled. No production
Mirror migration, activation cursor, historical backfill, deployment, or
Bridge restart has occurred.

Prior focused verification passed 32 tests (5 Node and 27 Python); the
broader Cash/Vessel integration and export-fixture tests are still pending.
For the current authorized work, exact source paths, evidence limits,
blockers, and production boundary, see
`/opt/vps/NEXT-SESSION-HANDOFF.md`, **Cash Unfreeze and WhatsApp Integration
Recovery — 2026-10-25**. Older dated operational entries in this map remain
historical evidence.

---

## Current verified production map — 2026-10-27

- **Application path:** `/opt/vps/apps/al-rifai`
- **Deployment:** `compose.yaml` (project `al-rifai`), image pinned by digest;
  container `al-rifai-app-1` runs `/app/start-private-app.mjs` (Next server +
  ingestion, Cash, Vessel workers).
- **Database:** PostgreSQL container `vps-infra-postgres-1`, database `alrifai`,
  app role `alrifai_app`, review role `ir_review_runtime`; secrets are mounted
  files (`/etc/vps/apps/al-rifai/database_password`,
  `/etc/vps/apps/al-rifai/auth/pg-password`), never printed.
- **WhatsApp:** WA-01 container `vps-whatsapp-wa-01-cap4-20261011` (authorized
  source; verified paired account is the Admin identity) and WA-02
  `vps-whatsapp-wa-02-cap4-20261011` (identity-only). Stores:
  `/var/lib/vps/whatsapp/wa-01{,-02}/store/messages.db`; control dirs are `0710`
  with `0660` sockets.
- **Mirror:** bridge SQLite → `whatsapp_messages_original` /
  `whatsapp_messages_processing`; native cursors in
  `whatsapp_native_sync_state` and `cash_live_sync_channels`.
- **Business tables:** `cash_instructions`, `cash_postings`, `source_refs`,
  `escort_order_register`, `escort_order_sources`, `escort_order_events`,
  `programs`, `program_assignments`, `employee_master`, `conversation_scope`,
  `whatsapp_identity_aliases`, `dataset_scope`.
- **API routes:** `/api/health`, `/api/cash/*`, `/api/operations`,
  `/api/register`, `/api/vessels`, `/api/escort-register`, `/api/program-tools`,
  `/api/assistant`, `/api/conversations`, `/api/import-audit`, `/api/core`.
- **Domains:** private entry on `https://app.al-rifai.iamazim.com` and Cash host
  `https://alrifai.iamazim.com`; reverse proxy allowlists `/cash`, `/vessel`,
  `/api/cash/`, `/api/register`, `/api/escort-register`, `/api/core`.
- **Backups:** `/var/lib/vps/al-rifai/backups/` (pre-transition dump, canonical
  vessel dump `pre-canonical-vessel-20261027.dump`).
- **Evidence:** `/var/lib/vps/al-rifai/evidence/` (read-only bind mount).
- **Current state and rules:** `NEXT-SESSION-HANDOFF.md`, `AGENTS.md`,
  `apps/al-rifai/docs/VESSEL-WORKFLOW.md`.

Older sections above are historical evidence; this section reflects the running
system.

### Source control, repository architecture and deployment traceability (2026-10-27)

- **Repository root:** `/opt/vps` — single monorepo, branch `main`.
- **Remote:** `git@github.com:arshiyaazim/opt_vps.git` (SSH, authenticated as
  `arshiyaazim`). The repository is **public**; publishing was explicitly
  approved by the Owner on 2026-10-27.
- **Final architecture:** the former nested repositories were flattened into
  ordinary tracked directories. No gitlinks and no `.gitmodules` remain.
  - `apps/al-rifai/` — Next.js application, Cash/Vessel domain, `db/`
    migrations, scripts and tests.
  - `services/whatsapp/source/` — Go bridge and Python MCP server
    (including `native_reader.py` PN/LID validation).
  - `services/whatsapp/compose.yaml`, `infra/`, `docs/`, root operational
    documents.
- **Nested history preservation:** verified bundles and bare clones of the former
  repositories are stored in
  `/var/lib/vps/al-rifai/backups/git-20261027/`:
  `apps-al-rifai.git`, `whatsapp-source.git`,
  `apps-al-rifai-history-20261027.bundle`,
  `whatsapp-source-history-20261027.bundle`,
  `opt-vps-pre-github-20261027.bundle`,
  `staging-cash-history-20261027.bundle`.
- **Excluded from Git (kept locally):** runtime data, credentials and secret
  files, WhatsApp session and message stores, `apps/al-rifai/data/*` (except
  `conversation-policy.json`), `import/`, `staging/`, all `qualification/`
  evidence trees, `node_modules`, `.next`, `.venv`, `.pnpm-store`, database
  dumps, logs and archives. `.gitignore` is the authority.
- **Source snapshot:** commit `06356b6` (application + bridge + infrastructure
  import). Documentation and the integrity manifest are committed immediately
  after it; see the handoff for the final HEAD.
- **Integrity manifest:** `docs/SOURCE_INTEGRITY_MANIFEST.txt` plus
  `.sha256` (primary), `.sha1` and `.md5` companion files. Verify with:
  ```bash
  git archive --format=tar <source_commit> | tar -x -C /tmp/alrifai-snapshot
  git show HEAD:docs/SOURCE_INTEGRITY_MANIFEST.sha256 > /tmp/alrifai-snapshot/docs/SOURCE_INTEGRITY_MANIFEST.sha256
  cd /tmp/alrifai-snapshot && sha256sum -c docs/SOURCE_INTEGRITY_MANIFEST.sha256
  ```
- **Deployment relationship:** the currently running app image
  `sha256:049627fa…` and WA-01 image `sha256:ae009303…` were built from the
  working tree before this commit. Future deployments must record the source
  commit SHA and the image digest together.
- **Recovery:** a clean clone contains the application, bridge and
  infrastructure source only; it never contains production runtime data,
  sessions, credentials or business rows. Restoring business data remains the
  separate PostgreSQL backup procedure described above.

