# Responsive workspace redesign — 2026-10-28 (source + isolated verification)

Scope: public homepage, dashboard, cash, vessel register, employees, transactions,
reports, admin panel, account settings. No deployment, migration, credential or
authorization-mode change.

## Design system

`app/workspace.css` + `app/platform/ui.tsx` now provide the shared vocabulary:

| Primitive | Purpose |
|---|---|
| `PageHeader` | eyebrow, title, description, actions, status meta — identical on every page |
| `SectionCard` | titled surface with optional actions and footer |
| `TableShell` | scroll container; at ≤768px the table becomes stacked record cards using `data-label` |
| `KpiCard`/`KpiGrid` | tone-coded metric tiles with tabular figures and honest "Unavailable" state |
| `StatusPill` | semantic status (ok / warn / danger / brand / neutral) |
| `EmptyState`, `ErrorState`, `LoadingSkeleton` | consistent loading, empty and failure surfaces |
| `PageNotice` | source/provenance banner |

Tokens: marine ink `#0d2333`, brand `#0f4c63`, accent `#b8902f`, 12px radius,
40px minimum control height, visible focus rings, `prefers-reduced-motion` honoured
on the public site.

## Page changes

| Page | Change |
|---|---|
| Public `/` | Corporate homepage (header, hero, three services, about, contact, footer), Login/Sign Up top-right, mobile drawer. Unchanged from the approved design; still no invented contact details. |
| `/signup` | Access-request explainer, responsive, states that no account is created. |
| Dashboard | Operational overview: header, financial KPIs, recent-instruction table (stacked on mobile), workforce/review KPIs, explicit **Instruction vs Verified vs Posted** definitions. |
| Employees | Page header, filters (search, identity scope), **filtered total vs all-record total**, responsive master table, profile sheet with instruction total and review notes, links to transactions/evidence. |
| Transactions | Header, filter bar with **filtered total**, responsive ledger, source-evidence detail sheet, explicit "not a posting" wording. |
| Admin Panel | Page header; responsive account table (stacked on mobile); profile, change username, change password, create account, roles and capability grants unchanged and still server-enforced. |
| Cash portal | Mobile: sidebar becomes a horizontal scrollable navigation strip; metrics stack 2-up then 1-up; lower grid single column; palette aligned. Cash Freeze and approval rules untouched. |
| Vessel Register | Existing responsive shell retained (bottom navigation ≤650px, metric and filter collapse); palette consistent with the workspace. |
| Insights / Income & Expenditure / Archive / Sources & Review | KPI, notice and table primitives now render the shared components; layout untouched otherwise. |

## Browser verification (headless Chromium over CDP)

8 pages × 5 widths (360, 390, 768, 1280, 1440) = **40/40 with zero horizontal
overflow**, measured as `scrollWidth − clientWidth ≤ 1`.

* Mobile drawer: opens, traps scroll, exposes Dashboard / Vessel Register /
  Transactions / Employees links (verified at 390px).
* Admin Panel rendered in an isolated `on`-mode instance: `h1` = "Admin panel",
  one account row (the Owner), labels present for profile, username change,
  password change and account creation, 0 overflow at 390/768/1440.
* Screenshots: `/tmp/opencode/redesign/shots/` (`home`, `signup`, `dashboard`,
  `employees`, `transactions`, `admin`, `vessel-register`, `cash` at 390 and 1440,
  plus `employees-before.png` from before the redesign).

## Functional verification

| Check | Result |
|---|---|
| Unit/integration suite (173) | 172 pass / 0 fail / 1 pre-existing skip |
| `tsc --noEmit` | pass |
| ESLint (`app lib release tests scripts proxy.ts db components`) | 0 errors, 0 warnings |
| `next build --webpack` | pass |
| Docker image build (typecheck + lint + build inside) | pass |
| Currency formatting | employee/dashboard/transaction totals use `fmtBDT` (regression test guards it) |
| Permission boundaries | proxy/entry/session rules unchanged; admin still redirects non–Super Admins |

## Remaining defects / decisions

1. **Admin Panel is unreachable while the mode is `shadow`.** `/admin` requires the
   legacy Basic credential, which is never the Super Admin, so it renders
   `307 → /dashboard`. The panel was verified in an isolated `on` instance. Until
   `on` is approved, credential changes are available through the Cash portal's
   own profile and password cards. Options: (a) accept and use the Cash portal,
   (b) approve a narrow session-authorised `/account` route, (c) enable `on`.
2. **Public contact details** are still intentionally absent (no invented phone,
   address or licence). Owner input required.
3. **Sign-up backend** remains informational; a persistent request queue needs a
   migration.
4. **Cash authenticated screens** were verified through CSS/layout only; the
   authenticated cash dashboard was not driven in this browser harness (session
   cookie requires a secure origin). Cash flows were functionally verified earlier.
5. Insights, Income & Expenditure, Archive and Sources & Review received the shared
   primitives but not a bespoke layout pass.

## 11. Final pre-release verification (2026-10-28, later pass)

### Responsive scope completed

The four pages that were previously only "primitive adoption" are now measured:

| Page | Result |
|---|---|
| Operational Insights | 5/5 widths, 0 overflow (chart cards can shrink; KPI rail stacks) |
| Income & Expenditure | 5/5 widths, 0 overflow |
| Archive | 5/5 widths, 0 overflow |
| Sources & Review | 5/5 widths, 0 overflow |

Full sweep: **12 pages × 5 widths (360/390/768/1280/1440) = 60/60, zero
horizontal overflow** (`scrollWidth − clientWidth ≤ 1`).

Defects found and fixed during this pass:

* Insights/Income: Recharts cards kept a 505px intrinsic width — cards and
  `ResponsiveContainer` are now shrinkable (`min-width: 0`).
* Archive/Sources: page roots now use the shared `.wx-page` scaffold.
* Cash at 768px: the workspace kept its 226px desktop offset after the sidebar
  became static (+190px overflow); offset reset.
* Cash at 390px: the portal's own ≤650px bottom-bar rules squeezed and clipped
  navigation labels; the ≤900px block now overrides them with readable pills.

### Authenticated Cash Portal (HTTPS, disposable credentials)

Isolated stack with a self-signed certificate in front of the app, a disposable
password on the cloned Owner row (never production), and a session issued by the
app itself:

| Check | Result |
|---|---|
| `POST /api/cash/login` | 200 |
| `__Host-alrifai_cash` cookie | present, Secure, HttpOnly |
| Authenticated dashboard | 5 metric cards, 12 navigation links, 4 tabs, 100 table rows |
| Source dialog | opens ("Tanvir Islam-Emon"), 520px, no overflow |
| Employee statements tab | 35 rows |
| Layout 360/390/768/1280/1440 | 5/5 pass, 0 overflow |
| Amount wording | Instruction / Posted / Review all present; Posted BDT 0.00 |

### Account management assessment

| Capability | Cash Portal | Admin Panel | Verdict |
|---|---|---|---|
| Change password | Yes — current password, 12+ policy, confirmation, audit | Yes (same policy + session revocation) | **Reuse the Cash Portal** |
| Change username | **No** — the profile username field is `disabled` | Yes | Only reachable in `on` mode |
| Revoke other sessions on password change | **No** | Yes (`otherSessionsRevoked`) | Gap in the Cash Portal path |
| Access in `shadow` mode | Yes (session) | **No** — Basic identity is never the Super Admin → `307 /dashboard` | — |

Recommendation: keep the Cash Portal as the account-management surface for the
password, and add session-revocation parity to its password endpoint (small,
self-contained change). Username changes should wait for `on` mode or a
separately approved, narrowly scoped `/account` route. **No authorization
exception was implemented.**

### Final candidate

`local/al-rifai:20261028-ui-redesign`
`sha256:d405d54f12001024b0e371edb72f1b93b62228d0c70ec6ed77b64e2121d6bdab`
(source `8e23fff` + verification fixes). Not deployed.

## 12. Session-revocation parity on the Cash Portal password endpoint (2026-10-28)

A password change made from the Cash Portal now revokes every other session for
the account while keeping the caller signed in — the behaviour the Admin/unified
path already had.

**Implementation (one shared implementation, no new logic).**
`revokeOtherSessions(userId, keepToken)` moved into `lib/cash-portal.ts` (the
session-store owner) and is now called by both paths:

* `lib/unified-auth.ts` `changeOwnPassword` — unchanged behaviour, now calls the helper;
* `app/api/cash/[...path]/route.ts` password handler — calls the helper with the
  caller's own `result.token` after the password write.

The handler audits `{surface:"cash", otherSessionsRevoked}` and returns the count.
Nothing else changed: current-password check, CSRF (`auth(request, method !== "GET")`),
Origin guard, 12+ policy, confirmation and cookie attributes are untouched, and a
failed current-password check returns before any write or revocation.

**Behavioural verification (real server, disposable clone).** 16/16 checks:

| Case | Result |
|---|---|
| (ii) three sessions, wrong current password | 400 `CURRENT_PASSWORD_INVALID`, **no** session revoked, password unchanged |
| (i) change from one of several sessions | 200, `otherSessionsRevoked` equals the other live sessions, all others 401, caller 200 |
| (i) new password works / old password rejected | 200 / 401 |
| (iii) unified `/api/auth/password` | 200, same count semantics, others 401, caller 200 |
| Auditing | `PASSWORD_CHANGED` carries `surface:"cash"` and the revoked count |

Static guards added in `tests/cash-password-revocation.mjs` (one implementation,
write-after-verify ordering, audit field, unchanged guards/cookie).

**Suite:** 177 tests → 176 pass / 0 fail / 1 pre-existing skip; typecheck, ESLint
0/0, `next build` and the image build pass. Full responsive sweep on the new image:
**60/60** (12 pages × 360/390/768/1280/1440). Cash Portal authenticated UI verified
at 360, 390, 768, 1280 and 1440 with zero overflow.

**Candidate:** `local/al-rifai:20261028-session-revocation`
`sha256:946635bd3ba7e17c712d7ff4c96e6e1c93601323501fcc947b194306c0dcff96` — not deployed.
