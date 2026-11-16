# Al-Rifa'i — Order Draft, Admin Assignment and Confirmation Workflow

**Type:** Functional specification derived from historical implementation; not executable code. All send/approval permissions must be checked in the current application.

## Lifecycle
1. Authorized client or permitted office/group source submits vessel-order evidence.
2. Parse Mother Vessel, Lighter Vessel, Master Mobile; extract Destination and other optional data.
3. Preserve original message and source conversation. Create one unconfirmed draft per genuine Lighter order; repeated message IDs must not create duplicates.
4. Route an **Admin Draft** to the authorized office/Admin review channel. **Do not reply automatically to the client at draft intake.**
5. Admin chooses Escort and completes Escort Name, Escort Mobile, Start Date and Shift.
6. A completed, authorized outbound office assignment is a **confirmation candidate**. Match it to the original order and originating client conversation. Do not infer sending merely from draft preparation.
7. When the current approved confirmation authority is satisfied, update the matching draft to Confirmed, preserve evidence, and prepare a Final Assignment Slip for the **original client conversation**.
8. If no reliable matching draft exists, send to an unmatched-review queue. Never silently create a confirmed record from ambiguous evidence.
9. Client delivery and delivery acknowledgement are separate from business confirmation. No automated outbound message without existing explicit authorization.

## Admin draft template (Al-Rifa'i adaptation)
```text
New Escort Order — Al-Rifa'i
Mother Vessel: [source value]
Lighter Vessel: [source value]
Master Mobile: [source value]
Destination: [source value or Pending]
Escort Name:
Escort Mobile:
Start Date: [source value or Pending]
Shift: [source value or Pending]
Status: DRAFT
```
The historical code sometimes inserted today's date and `D/N` as defaults; **do not present those as confirmed duty facts** in the current workflow. Multiple Lighters should be individually tracked.

## Completed assignment / final slip template
```text
Mother Vessel: [Mother Vessel]
Lighter Vessel: [Lighter Vessel]
Master Mobile: [Master Mobile]
Destination: [Destination]
Escort Name: [Selected Escort]
Escort Mobile: [Escort Phone]
Start Date: [DD.MM.YYYY] ([D or N])
Al-Rifa'i Integrated Services
```

## Recognition and matching
- Both Mother and Lighter may carry `MV`, `M.V.`, `M. V.`, `Mv.`, `MV.`, `mv.`. **Prefix is never a Mother-only label.**
- A confirmation candidate needs Mother, Lighter, Escort Name, Escort Mobile, Start Date, and authorized outbound direction; Shift is part of the operational assignment and should be checked for completeness.
- Match on original source conversation, vessel identities, Master Mobile where available, and temporal evidence. Do not trust a random phone number copied into the message body as the recipient.
- One original order should be updated rather than duplicated. A confirmed assignment without a matching original should enter review.
- The historical implementation included company-signature matching; use Al-Rifa'i as the brand, but do not make a footer alone proof of sender authority.

## Authorization and delivery distinction
Admin Draft creation ≠ Admin approval ≠ outbound send ≠ delivery acknowledgement ≠ confirmed business program. The current Owner-approved rule must determine which verified event changes status. Never claim an actual message was delivered based only on an outbound queue entry.

## Known historical nuance
Older prose said a confirmation might create a confirmed row without a draft, but later implementation introduced unmatched-confirmation review and approval actions. Prefer review until current authorization and matching logic are verified.
