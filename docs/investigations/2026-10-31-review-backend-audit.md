# `/review` Backend Audit — Investigation

**Date:** 2026-10-31
**Type:** Read-only code audit (no code, data, deploy or configuration change)
**Scope:** `/review` page, `/candidate-api` host, identity-review registry, ingestion scope SQL
**Question owner:** Owner
**Status:** Findings accepted 2026-10-31. **Verdict: backend has gaps.** Remediation deferred to the
roster-unification design.

---

## Summary

The `/review` management backend is genuinely well-engineered **as an identity registry** — real
validation, optimistic versioning, audit trail, owner gating. But it is **not wired to the ingestion
authorization path at all**. Adding, renaming or removing a contact through `/review` cannot affect
WhatsApp ingestion, because it writes to a table nothing in the ingestion path reads.

There are **four independent sources of truth**, and nothing reconciles them.

---

## Q1 — What backend endpoints does `/review` call? Trace to the database write.

### Surface

`/review` → `app/review/page.tsx` → `candidates/identity-review/ui/IdentityReviewPanel.tsx`
(`apiBase = '/candidate-api'`).

Contact management lives in the tab labelled **"Accountants / Clients / Contacts"** →
`candidates/identity-review/ui/ManagementWorkspace.tsx`. Its `Manage` selector offers four kinds:
`person` ("People / contacts"), `relationship` ("Accountant / Client / Employee role"), `binding`
("WhatsApp account / representative binding"), `group` ("Group · default review").

### Endpoints

| Purpose | Method + path |
|---|---|
| Login | `POST /candidate-api/session/login` |
| Current session | `GET /candidate-api/session/me` |
| Logout | `POST /candidate-api/session/logout` |
| Read roster | `GET /candidate-api/reconciliation?op=management` |
| **Add / edit / remove** | `POST /candidate-api/reconciliation/management` |

Write body: `{kind, data, expectedVersion, reason, active}` where
`kind ∈ person | relationship | binding | group | vesselAlias`.

### Full write path

```
app/candidate-api/[...path]/route.ts          (handleHost, runtime nodejs)
  → candidates/identity-review/host.ts        (deployment profile / qualification host)
  → candidates/identity-review/api.ts:38      if path === '/reconciliation/management' && POST
  → service.manageOwnerEntity(credentials, body)
  → candidates/identity-review/reconciliation.ts:130
       requireOwner(s, credentials, now, mutation=true)      // VERIFIED SUPER_ADMIN
       zod registrySchemas[q.kind].parse(q.data)             // strict schema
       validateRegistryReferences(s, record)                 // referential integrity
  → SELECT public.alrifai_owner_registry(actor, kind, id, expectedVersion, payload)
  → db/migrations/0014_owner_reconciliation.sql:61  (SECURITY DEFINER)
       INSERT INTO identity_review_candidate.records(collection,id,payload)
         VALUES ('registry', p_id, p_payload)
       INSERT INTO identity_review_candidate.records(collection,id,payload)
         VALUES ('registryHistory', p_id || ':' || (p_expected+1), p_payload)
  → + INSERT INTO public.reconciliation_decisions(...)       // audit row
```

### Guards present

Origin check; CSRF token (`X-CSRF-Token`); `__Host-alrifai_candidate` session cookie (HttpOnly,
Secure, SameSite=Strict, 8 h, `Max-Age=28800`); `requireOwner` (VERIFIED `SUPER_ADMIN` relationship);
`expectedVersion` optimistic concurrency (409 on conflict); read-only mode gate
(`ALRIFAI_RECONCILIATION_READ_ONLY`).

---

## Q2 — Do those writes update all relevant tables?

**No. Exactly one table (plus the audit table).**

| Target | Written by `/review`? |
|---|---|
| `identity_review_candidate.records` (collections `registry`, `registryHistory`) | **yes** |
| `public.reconciliation_decisions` (audit) | **yes** |
| `public.escort_client_contacts` | **no** |
| `public.escort_client_group_authorizations` | **no** |
| `/var/lib/vps/whatsapp/wa-01/control/native-reader-profile.json` | **no** |

A search for any synchronisation between the owner registry and those three targets returns **zero
results**. The only code that touches `native-reader-profile.json` is under `qualification/`
(one-off rehearsal scripts), never runtime application code.

### The four sources of truth

1. **`native-reader-profile.json`** — bridge participant allowlist. Gates whether the bridge returns
   an event **at all**. If a sender is absent, the reader denies the event
   (`PARTICIPANT_NOT_AUTHORIZED`).
2. **`public.escort_client_contacts`** + **`public.escort_client_group_authorizations`** — application
   scope. Decides which messages enter the `cash` / `vessel` processing queues
   (`scripts/message-ingestion-worker.ts:160-230`).
3. **`identity_review_candidate.records`** — the owner registry. What `/review` actually manages.
4. **`OWNER_ESCORT_CLIENTS`** — a **hardcoded three-client list** in `lib/escort-register.mjs:20`,
   imported directly by the cash/vessel scope SQL (`scripts/message-ingestion-worker.ts:7`). It is
   **not** a database query.

**Finding 4 is the sharpest:** the escort roster is partly compiled into source code. Adding a row to
`escort_client_contacts` does **not** enrol that client in direct-chat cash/vessel scope.

The current hardcoded list:

```js
export const OWNER_ESCORT_CLIENTS = Object.freeze([
 {id:'escort-client-hridoy-wa01',        accountId:'wa-01', displayName:'Escort Hridoy',       username:'@nhhridoyvau', phone:'+8801670535255'},
 {id:'escort-client-rezaul-karim-wa01',  accountId:'wa-01', displayName:'Escort REZAUL KARIM', username:null,           phone:'+8801836743754'},
 {id:'escort-client-tcis-wa01',          accountId:'wa-01', displayName:'TCIS W/A',            username:null,           phone:'+8801757622300'},
]);
```

---

## Q3 — Is there validation?

**Strong within the registry. Absent across systems.**

### Present

| Control | Detail |
|---|---|
| JID format | `^[A-Za-z0-9_.:+-]{1,160}@(s\.whatsapp\.net\|lid\|g\.us)$` |
| Phone format | `^\+8801[3-9][0-9]{8}$` |
| Group JID format | `^[0-9]+@g\.us$` |
| LID binding | requires both `phone` and `lidMappingRef` → `TRUSTED_LID_MAPPING_REQUIRED` |
| Group as participant | `GROUP_IS_NOT_PARTICIPANT` |
| Direction/purpose | `BINDING_DIRECTION_PURPOSE_CONFLICT` |
| Validity window | `INVALID_VALIDITY_INTERVAL` |
| Client relationship | `CLIENT_ID_REQUIRED` |
| Referential | `VERIFIED_PERSON_REQUIRED` |
| Phone/JID agreement | `NATIVE_PHONE_BINDING_CONFLICT` |
| Overlap | `OVERLAPPING_BINDING_REVIEW_REQUIRED`, `GROUP_ACCOUNT_BINDING_CONFLICT` |
| Concurrency | `expectedVersion` → 409 |
| Authorization | `requireOwner` → `OWNER_ONLY` (403) |
| Body/size | strict JSON, 32 000-byte cap (23 MB for imports) |

### Absent

- No check that the JID is an **actual participant** of the named WhatsApp group.
- No check that the JID exists in the **bridge profile**.
- No duplicate detection against `escort_client_contacts`.
- No check that the phone is reachable/registered on WhatsApp.

---

## Q4 — Does removing a contact through `/review` revoke the bridge's live gate?

**No — it has no effect whatsoever.**

`/review` writes only `identity_review_candidate.records`. The bridge reads only
`native-reader-profile.json`. The two are unconnected.

### Separately: the bridge does *not* cache the profile

`whatsapp-mcp-server/native_profile.py` builds a `principal()` closure that **re-reads the JSON file on
every call**:

```python
def principal():
    current = json.loads(target.read_text())
    if current.get("binding") != p["binding"] or current.get("account") != account or current.get("mode") != mode:
        raise NativeReadError("NATIVE_ACCESS_DENIED")
    ...
    participants = scope.get("participants", {})
```

Consequences, verified empirically on 2026-10-31 (the participant authorization took effect on the
next poll cycle, ~15 s, with **no restart**):

- **Adding or removing a participant** → effective immediately on the next principal check.
- **Changing the `chats` list** → the guard `scope.get("chats") != chats` fails and raises
  `NATIVE_ACCESS_REVOKED`, i.e. the gate **fails closed** until the MCP child restarts.
  *Adding a new escort client chat therefore needs a restart; adding a participant does not.*

---

## Q5 — Race conditions / missing transactions?

### Inside the registry: safe

One `SECURITY DEFINER` function call carries the registry write and its history row; the audit row is a
separate statement in the same service call; `expectedVersion` provides optimistic concurrency.

### Across systems: no atomicity, by construction

No code path updates more than one source. The 2026-10-31 authorization was performed as **DB write
plus hand-edit of the JSON file**, with a real window in between where the database said "authorized"
and the profile said "not authorized". Any operator following this procedure inherits that window.

### Additional gaps

- The profile has an `epoch` for the `chats` list but **no version, no history and no audit for
  participant changes**. A participant edit leaves no trace.
- The profile file is a flat JSON document with no schema validation at write time (validation happens
  only when the bridge loads it, and a bad file fails closed).
- Deactivating a contact in the database affects **new** message routing only; already-queued
  `whatsapp_messages_processing` rows are not retroactively removed.

---

## Verdict: **backend has gaps**

The `/review` backend is well-built as an identity registry, but it is not connected to ingestion
authorization. Concretely:

- It **cannot** add an escort client in a way that makes their messages ingest.
- It **cannot** rename a contact in a way that changes the register display.
- It **cannot** revoke a contact in a way that stops ingestion.

Contact management today = manual superuser SQL **plus** hand-editing a JSON control file, with no
transaction spanning them, no audit of the participant change, and a partial roster hardcoded in
source.

### Required remediation (not implemented)

1. One roster service with a single write path that atomically updates the database **and** the bridge
   profile.
2. Replace `OWNER_ESCORT_CLIENTS` with a database query.
3. Wire `/review` writes into that path.
4. Give participant changes versioning and audit, as `chats` already has.

See the roster-unification design document.

---

## Method note

Read-only code audit. No endpoint was invoked against production. No SQL write was executed. No
container was restarted. `review-host.json` was inspected for non-secret fields only (`mode`,
`database`, `user`, `transport`, `origin`, `databaseHost`, `socket`); `peerSecret` and
`dummyPasswordHash` were **not** read or printed.
