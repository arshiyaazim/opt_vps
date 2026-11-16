-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION.
--
-- Purpose: append-only Cash Portal submissions and review decisions.
-- Submission is not approval; approval is not financial posting. Nothing here
-- inserts into cash_instructions, cash_postings, cash_movements or any other
-- financial fact, and no UPDATE/DELETE grant is introduced anywhere.
--
-- Review required before application: Owner authorization for the exact
-- schema/grants plus an isolated rehearsal against a restored clone.

BEGIN;

CREATE TABLE public.cash_submissions (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  scope_account text NOT NULL CHECK (scope_account IN ('wa-01','wa-02')),
  submitted_by_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  submitted_by_role text NOT NULL CHECK (submitted_by_role IN ('ADMIN','USER')),
  employee_name text NOT NULL CHECK (length(employee_name) BETWEEN 1 AND 150),
  employee_mobile text CHECK (employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
  payout_mobile text CHECK (payout_mobile ~ '^\+8801[3-9][0-9]{8}$'),
  method text NOT NULL CHECK (method IN ('cash','bkash','nagad','bank','rocket')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 500),
  transaction_date date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  evidence_ref text CHECK (evidence_ref IS NULL OR length(evidence_ref) <= 300),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payload_hash)
);

CREATE TABLE public.cash_submission_reviews (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  submission_id text NOT NULL REFERENCES public.cash_submissions(id),
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED','CORRECTION_REQUESTED')),
  actor_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  actor_role text NOT NULL CHECK (actor_role = 'ADMIN'),
  submitted_by_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  decided_at timestamptz NOT NULL DEFAULT now(),
  -- A submission and its reviewer must be different people.
  CONSTRAINT reviewer_not_submitter CHECK (actor_user_ref <> submitted_by_user_ref)
);

-- Fundamental integrity: decisions are append-only.
CREATE TRIGGER cash_submission_reviews_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.cash_submission_reviews
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();

-- Submissions are append-only too: no silent rewrites of what a user submitted.
CREATE TRIGGER cash_submissions_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.cash_submissions
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();

REVOKE ALL ON public.cash_submissions, public.cash_submission_reviews FROM PUBLIC;
GRANT SELECT, INSERT ON public.cash_submissions, public.cash_submission_reviews TO ir_review_runtime;

-- Read-time projection: the newest decision per submission. No decision means
-- PENDING_REVIEW. Approval never implies a ledger posting.
CREATE VIEW public.cash_submission_review_state AS
SELECT s.id AS submission_id,
       s.scope_account,
       s.submitted_by_user_ref,
       s.employee_name,
       s.employee_mobile,
       s.payout_mobile,
       s.method,
       s.amount_minor,
       s.purpose,
       s.transaction_date,
       s.created_at,
       r.decision,
       r.actor_user_ref AS decided_by,
       r.decided_at,
       CASE
         WHEN r.decision IS NULL THEN 'PENDING_REVIEW'
         WHEN r.decision = 'APPROVED' THEN 'ACTIVE_REVIEWED'
         WHEN r.decision = 'REJECTED' THEN 'REJECTED'
         ELSE 'CORRECTION_REQUESTED'
       END AS review_state
FROM public.cash_submissions s
LEFT JOIN LATERAL (
  SELECT decision, actor_user_ref, decided_at
  FROM public.cash_submission_reviews r
  WHERE r.submission_id = s.id
  ORDER BY r.decided_at DESC, r.id DESC
  LIMIT 1
) r ON true;

REVOKE ALL ON public.cash_submission_review_state FROM PUBLIC;
GRANT SELECT ON public.cash_submission_review_state TO ir_review_runtime;

COMMIT;
