# Dipongkar payment-instruction audit — 2026-10-28 (read-only)

Employee reference `01880089543` · alias `Dipongkar` · payout `0186619955` · method bKash.

## Verdict

The stored data is correct. The **displayed** total was 100× too high because a
view rendered a minor-unit (paisa) value with the major-unit currency formatter.

| Item | Reported | Actual (recomputed from source) |
|---|---|---|
| Instructions | 79 | **79** |
| Displayed total | BDT 4,030,600 | BDT 40,306.00 |
| Rows needing review | 0 | 0 *parsing* notes; **79** rows carry the posting-approval reason |
| Postings | — | **0** |

## Reconciliation

* Scope: `dataset_epoch = CANONICAL_BACKFILL_20261026` (Current). The legacy epoch
  holds 70 further rows and is displayed separately by design.
* Identity: one employee mobile, one name, one payout mobile, one method across all
  79 rows.
* Amount: `sum(amount_minor) = 4,030,600` → **BDT 40,306.00**.
* Independent parse: every row's original WhatsApp text ends `NNNN/-`; all **79/79**
  parsed amounts match the stored minor value exactly. No mismatch, no unparsed row.
* Duplicates: 0 duplicate `source_ref`, 0 duplicate `command_id`, 0 duplicate
  `payload_hash`, 0 same-day/same-amount pairs, 0 postings.
* State: all 79 rows are `REVIEW` with reason
  `FINANCIAL_POSTING_REQUIRES_SEPARATE_APPROVAL` (Cash Freeze intact).
* 7 calendar days carry two instructions each, with different amounts
  (e.g. 2026-08-18: 2000 + 1000) — legitimate separate instructions.

Amount distribution (minor units): 64 × 20,000 (BDT 200) plus 600, 2000, 600, 1500,
1500, 1050, 3756, 2000, 1000, 1500, 800, 4900, 1500, 4100, 700 → **40,306.00**.

Source text pattern is uniform: `ID: 01880089543 Dipongkar 01866199555(B) NNNN/-`.

## Root cause

`bdt` is `Intl.NumberFormat` for **taka**. `fmtBDT(cents)` divides by 100 before
formatting. Six views passed `amountCents` straight to `bdt.format(...)`:

| File | Effect |
|---|---|
| `app/employees/view.tsx` (table + detail sheet) | Dipongkar ৳4,030,600.00 instead of ৳40,306.00 |
| `app/dashboard/view.tsx` (5 KPI cards) | instruction/pending/today/week/month totals 100× |
| `app/transactions/view.tsx` (detail sheet) | amount 100× |
| `app/insights/view.tsx` (KPI) | instruction total 100× |
| `app/archive/view.tsx` (caption) | legacy total 100× |
| `app/income-expenditure/view.tsx` (KPI) | expenses total 100× |

Correction: those call sites now use `fmtBDT(...)`. The Cash portal itself
(`money()` → `fmtBDT`) was already correct, which is why the same figure looked
right there and wrong on the workspace page.

Secondary wording defect: the Employees "Status" column showed *clear on newest
rows* because it counts parsing notes, not the posting-approval reason. It now
reads *no parsing notes*, and the detail sheet says *Rows with parsing notes*.

## What was not changed

No instruction row, amount, source message, archive, posting or credential was
modified. The correction is display-only. A database-level change is **not**
required.

## Reproduce

```sql
SELECT count(*), sum(amount_minor), to_char(sum(amount_minor)/100.0,'FM999,999,999.00')
FROM public.cash_instructions
WHERE employee_mobile='+8801880089543' AND dataset_epoch='CANONICAL_BACKFILL_20261026';
-- 79 | 4030600 | 40,306.00
```
