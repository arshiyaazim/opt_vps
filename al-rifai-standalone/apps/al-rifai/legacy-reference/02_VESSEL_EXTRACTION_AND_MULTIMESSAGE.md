# Al-Rifa'i — Vessel Name Extraction and Multi-message Reconstruction

**Type:** Test-derived reference; not executable code. The source material describes experimental shadow-mode tests, not proof that this feature is live.

## Core principle
A vessel prefix (`MV`, `M.V.`, `M. V.`, `Mv.`, `MV.`, `mv.`) is a generic label for **either** Mother or Lighter. Role assignment depends on explicit field labels, Master Mobile association, surrounding vessel blocks, and message context.

## Multi-message scenario
Message A may contain `Lighter Vessel: Bushra Biva-1`, `Master Mobile: 01XXXXXXXXX`, `Destination: Local`; Message B may later say `Mother Vessel: MV Horda`. A conversation-aware extractor can merge them into one candidate only when conversation identity, message evidence and vessel identity support the link. Reversed arrival order must also be supported.

## Guardrails illustrated by historical tests
- Same client + same conversation + complementary Mother/Lighter evidence may form one candidate.
- Different Master Mobiles/Lighters from the same client must not be merged into a single order.
- Same phone on different bridge/conversation identities must not be merged.
- Conflicting high-confidence Mother Vessel values must flag a conflict; retain the original evidence, do not silently overwrite.
- Equivalent phone representations (`01...` and `+8801...`) must not create a false conflict.
- Exact message replay must be idempotent.
- An expired partial conversation must not silently absorb unrelated later messages.
- Unauthorized senders and system-generated notifications must not contribute evidence to an authorized client order.
- Internal parser failure must not interrupt the source-message mirror.
- A shadow candidate must never write a real confirmed program.

## Bangla field labels
Examples of specific labels: `মাদার ভেসেলের নাম`, `মাদার ভেসেল`, `মাদার শিপ`; `লাইটার ভেসেল`, `লাইটার নাম`, `লাইটার`; `মাস্টার মোবাইল`, `মোবাইল নম্বর`; `গন্তব্য`, `ডেস্টিনেশন`; `ট্রিপ`. Generic `ভেসেল নেম`/`ভেসেলের নাম` does not unambiguously identify Mother; interpret only with thread context. Normalize Bangla digits and remove WhatsApp markup. Split a trip suffix into its own field without corrupting Lighter name.

## Test acceptance criteria
Check same-message, multi-message, reversed-order, separate-client, separate-vessel, conflict, duplicate replay, restart persistence, malformed mobile, Bangla-label and scope-exclusion scenarios. Confirm actual production capability separately; historical test expectations are not production deployment evidence.
