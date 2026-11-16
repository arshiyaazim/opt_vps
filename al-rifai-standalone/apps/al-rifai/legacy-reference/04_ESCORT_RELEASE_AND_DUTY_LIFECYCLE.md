# Al-Rifa'i — Escort Duty, Release and Payment Review Lifecycle

**Type:** Functional reference for the *post-assignment* lifecycle. This is **not** the incoming Vessel Order parser or Escort Assignment Confirmation workflow.

## Confirmed to Running
A confirmed program may transition to Running on the **first accepted Admin-approved attendance** for the assigned Escort. A date passing by itself does not establish approved attendance. Repeated attendance events must be idempotent.

## Release intent
Examples include `ডিউটি শেষ`, `রিলিজ`, `কাজ শেষ`, `ভেসেল ছেড়েছি`, `release`, `duty finished`, `off duty`. Keywords identify a **release candidate**, not a completed release. Finalization requires authorized Admin confirmation and an active program match.

## Release slip review
An incoming release slip image/text may be extracted into a **Release Draft** for Admin review. Candidate fields include Escort, Lighter, Release Point, Start Date, End Date, End Shift, Duty Days, Conveyance, Food and Transport estimates. Flag missing fields, implausible dates, uncertain OCR, and ambiguous program matches. Do not automatically send the draft or finalize payment.

## Release review template
```text
RELEASE REVIEW — DRAFT ONLY
Escort: [name]
Lighter: [lighter]
Release Point: [location]
Start Date: [date or Unknown]
End Date: [date or Unknown]
End Shift: [D/N or Unknown]
Duty Days: [calculated or Pending]
Conveyance: [verified or Pending]
Food: [verified or Pending]
Matched Program: [id or Needs Review]
Admin Decision: Pending
```
This is an Al-Rifa'i documentation template, not a claim that the historical code emitted these exact lines. The historical implementation used a `[RELEASE CONFIRMED]` marker for an Admin-confirmed outbound release message; this marker **must not be confused with Escort Order Confirmation**.

## Completion effects and safeguards
After authorized release confirmation: find the correct active program; validate end date/shift; mark Completed once; calculate duration; reconcile attendance as authorized; create a payment **draft** for review; synchronize roster. Reprocessing a closed program must not create duplicate payment drafts.

## Financial controls
Estimated transport/food figures in the historical material were not guaranteed to match authoritative rates. Do not import old rate tables or automatically post payments. Use current approved Al-Rifa'i finance rules and human review.

## Data safety
Keep original release evidence, source identity and audit trail. Do not close a program based solely on release keywords, an uncertain OCR match, or a new Escort assignment without the approved inference/review rule. Archive and Current provenance remain separate.
