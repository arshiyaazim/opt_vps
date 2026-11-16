-- 0066: the review queue — one staging area for every user submission.
--
-- Four review mechanisms existed before this (cash submissions, employee requests,
-- release candidates, an unused identity `reviews` table). None covered vessel
-- programs, attendance or employee identity, and an admin had no single place to
-- work. This is that single place: the submission is staged here in full, and
-- nothing reaches a live table until workflow_decide() approves it.
--
-- Why a generic table with a jsonb payload rather than five typed tables: the admin
-- needs one queue, one age sort and one set of actions. The typed shape lives in
-- payload and is validated by each domain's apply function at approval time, so a
-- malformed submission fails where it can still be rejected, not halfway through a
-- production write.
--
-- Append-only decisions: review_decisions is never updated or deleted. A mistake is
-- corrected by a later decision, never by rewriting history.
--
-- Neither application role receives INSERT here. Submissions go through
-- workflow_submit() (0067), a SECURITY DEFINER function that resolves the submitter's
-- role from cash_portal_users rather than trusting the caller's claim.

BEGIN;

CREATE TABLE IF NOT EXISTS public.review_items (
  id                    text PRIMARY KEY,
  domain                text NOT NULL,
  action                text NOT NULL,
  target_ref            text,
  payload               jsonb NOT NULL,
  payload_hash          text NOT NULL,
  submitted_by_user_ref text NOT NULL,
  submitted_by_role     text NOT NULL,
  status                text NOT NULL DEFAULT 'PENDING',
  decision_note         text NOT NULL DEFAULT '',
  decided_by            text,
  decided_at            timestamptz,
  applied_ref           text,
  version               integer NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_items_id_check       CHECK (id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT review_items_hash_check     CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT review_items_domain_check   CHECK (domain IN
    ('VESSEL_PROGRAM','VESSEL_EDIT','CASH','EMPLOYEE','ATTENDANCE','PROGRAM_RELEASE')),
  CONSTRAINT review_items_action_check   CHECK (action IN ('CREATE','UPDATE','DELETE')),
  CONSTRAINT review_items_status_check   CHECK (status IN
    ('PENDING','APPROVED','REJECTED','CORRECTION_REQUESTED','WITHDRAWN')),
  CONSTRAINT review_items_role_check     CHECK (submitted_by_role IN ('ADMIN','USER','SYSTEM')),
  CONSTRAINT review_items_payload_check  CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT review_items_note_check     CHECK (length(decision_note) <= 2000),
  CONSTRAINT review_items_decided_check  CHECK (status = 'PENDING' OR decided_at IS NOT NULL),
  CONSTRAINT review_items_action_target_check
    CHECK (action = 'CREATE' OR target_ref IS NOT NULL),
  CONSTRAINT review_items_submitter_hash_uk UNIQUE (submitted_by_user_ref, payload_hash)
);

-- Only one open request may exist for the same live record: two admins cannot be
-- asked to approve conflicting edits of the same program at once.
CREATE UNIQUE INDEX IF NOT EXISTS review_items_one_pending_per_target
  ON public.review_items (domain, target_ref)
  WHERE status = 'PENDING' AND target_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS review_items_queue_idx
  ON public.review_items (status, domain, created_at DESC);

CREATE INDEX IF NOT EXISTS review_items_submitter_idx
  ON public.review_items (submitted_by_user_ref, created_at DESC);

CREATE TABLE IF NOT EXISTS public.review_decisions (
  id            text PRIMARY KEY,
  item_id       text NOT NULL REFERENCES public.review_items(id),
  decision      text NOT NULL,
  actor_user_ref text NOT NULL,
  actor_role    text NOT NULL,
  note          text NOT NULL DEFAULT '',
  payload_hash  text NOT NULL,
  applied_ref   text,
  decided_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_decisions_id_check    CHECK (id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT review_decisions_hash_check  CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT review_decisions_decision_check CHECK (decision IN
    ('APPROVED','REJECTED','CORRECTION_REQUESTED','WITHDRAWN','SYSTEM_APPLIED')),
  CONSTRAINT review_decisions_note_check  CHECK (length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS review_decisions_item_idx ON public.review_decisions (item_id, decided_at DESC);

COMMENT ON TABLE public.review_items IS
 'Staged user submissions awaiting an admin decision. Nothing here is live until workflow_decide() approves it.';

-- Read-only for both application roles; every write path is a SECURITY DEFINER
-- function so the submitter identity and role can never be spoofed.
GRANT SELECT ON public.review_items TO alrifai_app;
GRANT SELECT ON public.review_items TO ir_review_runtime;
GRANT SELECT ON public.review_decisions TO alrifai_app;
GRANT SELECT ON public.review_decisions TO ir_review_runtime;

COMMIT;
