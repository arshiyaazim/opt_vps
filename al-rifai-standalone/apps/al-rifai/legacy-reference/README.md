# Al-Rifa'i Vessel Workflow — Documentation Reference Pack

These four **Markdown documents** contain business rules and test scenarios adapted from four historical source files. They contain **no executable Python**, historical project branding, historical repository paths, environment file locations, credentials, or legacy bridge numbers. They are **reference specifications**, not a claim that the current VPS implements them.

Read in order:

1. `01_ORDER_PARSER_RULES.md` — authorized intake, required fields, Mother/Lighter disambiguation.
2. `02_VESSEL_EXTRACTION_AND_MULTIMESSAGE.md` — extraction scenarios, Bangla labels, conflicts and replay.
3. `03_ORDER_DRAFT_ASSIGNMENT_CONFIRMATION.md` — Admin draft, assignment, original-client routing, confirmation.
4. `04_ESCORT_RELEASE_AND_DUTY_LIFECYCLE.md` — attendance, release, payment-review lifecycle.

**Non-negotiable:** `MV` / `M.V.` / `M. V.` / `Mv.` / `MV.` / `mv.` may prefix **both** Mother and Lighter vessels. They do not identify Mother by themselves.

## Agent usage
Compare each rule against the current Al-Rifa'i code, current database schema, approved source scope and existing owner decisions. Produce a coverage matrix and evidence-based gap report before changes. Implement only authorized missing behavior with tests. Do not assume any old system's code, phone numbers, modules or directories are present. Never broaden WhatsApp permissions, auto-send messages, or auto-confirm records without authorization. Keep unresolved items in REVIEW.
