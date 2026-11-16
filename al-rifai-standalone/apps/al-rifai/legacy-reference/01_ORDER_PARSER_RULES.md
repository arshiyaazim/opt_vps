# Al-Rifa'i — Vessel Order Parsing Rules

**Type:** Business-rule reference document; not executable code. **Status:** Historical reference requiring validation against the current application.

## Critical vessel-prefix rule
`MV`, `M.V.`, `M. V.`, `Mv.`, `MV.`, `mv.` and case/spacing variants are **generic vessel prefixes**, not evidence of a *Mother Vessel*. Either Mother or Lighter can have any of these prefixes. Normalize prefixes for matching/display, but never classify a vessel by its prefix alone.

## Trusted message origin
An incoming order is eligible only when its source conversation and actual sender are authorized for Vessel operations. The historical design distinguishes inbound client orders from outbound office assignments. Use the current application's approved identities and conversation scopes; no historical phone number or bridge identifier is authoritative.

## Minimum complete order
A complete single-message order requires **Mother Vessel, Lighter Vessel, and Lighter Master's Mobile**. Preserve incomplete order-like messages as evidence/review candidates according to the current application's rules; do not invent fields or silently promote them. Destination is useful but not part of this historical minimum. For multiple Lighters, maintain distinct order candidates under the same Mother.

## Extraction and disambiguation
1. Explicit `Mother Vessel:` label identifies the Mother. Explicit `Lighter Vessel:` or `Lighter Name:` identifies the Lighter.
2. A valid mobile number anchors a Lighter block. A nearby vessel name is a Lighter candidate; a block containing that Master Mobile must not be classified as Mother solely on its prefix.
3. A nearby vessel block without Master Mobile may be the Mother, subject to contextual checks. Parenthesized trailing vessel names may be Mother candidates, but are not conclusive without context.
4. Strip serial numbers and decorative WhatsApp markup from vessel names. Normalize equivalent vessel prefixes to a single canonical presentation without changing the vessel's role.
5. Recognize Bangladesh phone variants (local `01...`, `8801...`, `+8801...`, optionally formatted); normalize and validate. Do not confuse Master Mobile with Escort Mobile.
6. Destination is extracted by explicit label or recognizable place-name context near the Lighter block. Examples of historical normalization: `Local`/`CTG` → `Chattogram`, `N.Bari` → `Nagarbari`, `Rupshi` → `Narayanganj`. Confirm any ambiguous geographic aliases against current approved rules.
7. Parse date and shift only when supported by source evidence. D/N or Day/Night are recognized forms. Missing values remain unknown, not confirmed defaults.
8. Importer, cargo and capacity may appear in historical messages, but are **not required Al-Rifa'i Register fields**. Client, booking, slip/registration number are also not required.

## Confirmation gate
A confirmation candidate is a verified office-originated assignment in an authorized conversation, containing **Mother Vessel, Lighter Vessel, Escort Name, Escort Mobile and Start Date**. Include Shift in the completed operational assignment. Match it to the original order and conversation before changing status. Wrong-direction messages are not office confirmations. Ambiguous or unmatched assignments go to review, not automatic confirmed-program creation.

## Duplicate and provenance rules
Preserve message IDs, sender/chat identity, direction, time, and raw text. Same Mother + same Lighter with start dates on the same day or within ±1 day is a potential duplicate. Same Escort on the same date assigned to different Lighters must remain distinct. Never delete source messages or auto-merge conflicting evidence.

## Legacy limitations
The historical specification included an experimental multi-message/Bangla parser; it was described as shadow-only, not an active production writer. Treat its candidate results as design/test evidence, not proof of production behavior. Historical documentation and code differ on some unmatched-confirmation behavior; review is the safer default pending current application verification.
