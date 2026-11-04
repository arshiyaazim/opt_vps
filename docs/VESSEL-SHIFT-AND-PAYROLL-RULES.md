# Vessel Shift Boundary and Monthly Payroll Allocation — approved rules

**Decision record:** Owner decisions **D5** (shift boundary) and **D4** (monthly
salary and conveyance allocation), 2026-11-04.
**Status:** approved business rules. Encoded in **source only**; the payroll
database candidate is **not applied** and nothing is deployed.
A future AI assistant may read this file and the structured tables, but must not
treat itself as the authority for identity, release application, pay or payment.

---

## 1. Shift boundary (D5)

All shift decisions use **Asia/Dhaka**.

| Shift | Window |
|---|---|
| **D (Day)** | 06:00:00 – 17:59:59 |
| **N (Night)** | 18:00:00 – 05:59:59 |

* Exactly `06:00:00` is Day. Exactly `18:00:00` is Night.
* The boundary was previously `05:00–17:59` in `lib/release-parser.ts`. That copy
  was **removed**; the 05:00–05:59 hour now correctly belongs to Night.
* There is exactly **one** implementation: `apps/al-rifai/lib/shift-boundary.ts`
  (`shiftForSecondOfDay`, `shiftForHour`, `dhakaLocalTime`,
  `orderDraftDateAndShift`). Do not add a second cutoff in SQL, a worker or a UI.
* The **Order Draft** date and shift come from the verified timestamp at which
  the authorised Order arrived at Admin WA-01 (`orderDraftDateAndShift`), never
  from the client's message text and never from the processing clock.
* Release-slip shift still comes from the message timestamp
  (`lib/release-parser.ts parseMessage`), now via the shared module.

Verified behaviour on a real release-slip body:

| Timestamp (UTC) | Dhaka | Shift |
|---|---|---|
| `2026-08-12T05:53:57Z` | 11:53 | D |
| `2026-08-12T00:00:00Z` | 06:00 | **D** (exactly 06:00) |
| `2026-08-12T19:00:00Z` | 01:00 next day | N |
| `2026-08-12T23:30:00Z` | 05:30 next day | **N** (was D under the old rule) |

---

## 2. Duty shifts and equivalent duty days

A day is `[D, N]`. A Program runs `start(date, startShift)` → `end(date, endShift)`
**inclusive**:

```
shifts = (end - start) * 2 + (endShift == N) - (startShift == N) + 1
dutyDays = shifts / 2
```

* A Program starting on **N** does not claim that day's D.
* A Program ending on **D** does not claim that day's N.
* Two shifts = one full duty day. A single shift = half a day.
* `enumerateDutyShifts()` produces the per-date list and must always agree with
  `public.count_shifts()`. A parity test covers every start/end/shift combination
  in `tests/shift-boundary.mjs`.
* An ongoing duty (empty `endDate`) has **no** shifts and **no** pay — never BDT 0.

---

## 3. Monthly salary (D4)

Every worked shift is attributed to the month of its **actual duty date**.

* A cross-month Program is split by date. It is **never** allocated wholly to the
  start month or the release month.
* Monthly salary = `shiftCount × applicable approved shift rate`
  (`escort_rate_config`, currently BDT 200.00 per shift = 20,000 paisa).
* The Program-level salary is preserved; the monthly buckets must sum to it.

Example from the Owner (illustrative amounts, not new rates):

| Month | Shifts | Salary |
|---|---|---|
| January | 20 | BDT 4,000 |
| February | 10 | BDT 2,000 |

---

## 4. Monthly conveyance (D4)

Conveyance is attributed to the month the **travel actually occurred**.

* Not automatically the start month. Not automatically the release month.
* Release and office-return/travel date may be **different**. A duty released in
  January whose return travel happens in February puts that conveyance in
  **February**.
* A future travel expense is never recognised in an earlier month. An event dated
  before the release date is held as `BEFORE_COMPLETION` for review.
* The amount comes from the existing destination/rate configuration. The BDT 500
  in the Owner's example is illustrative — **no rate row may be added for it**.
* If the actual travel date is not verified, the amount stays
  `UNRESOLVED_TRAVEL_DATE`: it appears in **no** month and is never guessed.
* Identical events count once; duplicates are reported, never summed.

Example from the Owner:

| Month | Shifts | Salary | Conveyance | Payable |
|---|---|---|---|---|
| January | 20 | BDT 4,000 | — (no travel) | BDT 4,000 |
| February | 10 | BDT 2,000 | BDT 500 | BDT 2,500 |

---

## 5. Reconciliation

`reconcileProgramPay()` (and `public.payroll_reconciliation` in the candidate SQL)
must prove, per Program:

```
sum(monthly salary)                       == program_pay.salary_minor
allocated conveyance + unresolved amount  == program_pay.conveyance_minor
salary + allocated conveyance + unresolved == program_pay.total_minor
```

A Program that does not reconcile is **not payable**. Derived pay is still not
payment: paid/unpaid tracking is a separate, not-yet-approved step.

---

## 6. Implementation map

| Concern | File | Status |
|---|---|---|
| Shift boundary, Dhaka conversion, duty-shift enumeration | `lib/shift-boundary.ts` | source only, tested |
| Monthly salary / conveyance / reconciliation | `lib/payroll-allocation.ts` | source only, tested |
| Release-slip shift uses the shared boundary | `lib/release-parser.ts` | source only, tested |
| Runtime image includes the shared module | `Dockerfile` COPY whitelist | source only |
| Test registration | `package.json` test list | source only |
| Duty-shift, monthly salary/conveyance, unresolved, reconciliation views + `vessel_conveyance_event` | `db/migration-candidates/0072_vessel_conveyance_and_payroll_monthly.sql` | **candidate — NOT applied** |
| Boundary + allocation regression tests | `tests/shift-boundary.mjs`, `tests/payroll-allocation.mjs` | passing (21/21) |

---

## 7. Prohibitions (repeat, because they are easy to get wrong)

1. Never add a second shift cutoff; import `lib/shift-boundary.ts`.
2. Never allocate a whole cross-month Program to one month.
3. Never recognise conveyance in a month without a verified travel date.
4. Never invent a travel date, a vessel relationship, an employee or a rate.
5. Never store `/` or another separator as a destination.
6. Never treat the release-slip food bill as salary.
7. Never mark payroll paid because a Cash instruction was sent; a Cash
   instruction is not a posting and not a payment.
8. Do not apply the candidate migration or ship this to production without an
   explicit Owner approval and a pre-migration backup.

## 8. Still open (do not assume)

| Ref | Decision needed |
|---|---|
| D1 | WA-02 `messages.send` grant + Draft delivery link mechanism |
| D2 | OCR media access (`media.download` token) and OCR engine |
| D3 | Destination alias row `kacpur → kachpur` |
| D6 | Owner-visible Order/Draft number format |
| — | Parser corrections (destination label forms, `AT-O/A`, Bengali labels) — proposed, not yet approved |
