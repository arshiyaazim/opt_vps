# Decision note — UI release and account-surface choice (2026-10-28)

## Released

`local/al-rifai:20261028-ui-redesign`
`sha256:d405d54f12001024b0e371edb72f1b93b62228d0c70ec6ed77b64e2121d6bdab`
(source `8e23fff` + verification fixes, HEAD `77cbcef`).

Deployed 2026-10-28 19:59 (+01:00) to the app service only. PostgreSQL,
WA-01 and WA-02 were not restarted, reconfigured or migrated. Unified
authentication remains **`shadow`**; `on` is not approved by this release.

Pre-deployment safety net (not restored):
`/var/lib/vps/al-rifai/backups/pre-ui-deploy-20261028-1958.dump`,
sha256 `b84392f5389297498d286a66f6e41fd5ab54452255f79034f0328afce73b2fb6`.

Rollback images retained: `sha256:2c0833c4…` (previous production) and
`sha256:52105520…` (pre-repair candidate).

## Account management surface

The **Cash Portal profile and password cards are the account surface** for now:

* password change — current password, 12+ policy, confirmation, audit — supported;
* username change — **not** supported (the profile field is read-only);
* session revocation on password change — **not yet** on the Cash Portal path;
  the Admin Panel path already implements it.

## Scheduled next increment

Session-revocation parity on the Cash Portal password endpoint, reusing the
existing `otherSessionsRevoked` implementation (no new revocation logic). This
ships as a separate image with its own digest and must not change the
current-password check, CSRF, Origin guard, password policy, confirmation or
cookie attributes.

## Deferred, pending separate approval

* `ALRIFAI_UNIFIED_AUTH_MODE=on`.
* A dedicated `/account` route and any session-authorised proxy exception.
* Username rename in the application UI.
* Sign-up request queue / new migration.
* Vessel Register design pass.
* Publishing company contact details.

## Revisit trigger — Admin Panel reachability

Revisit the `/admin` reachability decision when **any** of the following becomes
true:

1. a second user or administrator account is added;
2. credential rotation becomes routine (scheduled or policy-driven);
3. anyone other than the Owner needs to manage accounts.

Until then the Cash Portal remains the supported account surface.
