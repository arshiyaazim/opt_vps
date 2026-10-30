-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION.
--
-- Public signup requests never create or modify a Cash Portal account. An
-- authorized Super Admin records one append-only approval or rejection; an
-- approved request still requires the existing explicit account-creation
-- workflow.
--
-- Review and rehearse against an isolated restored clone before any separate
-- Owner approval to apply this migration.

BEGIN;

CREATE TABLE public.account_signup_requests (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 150),
  email text NOT NULL CHECK (
    length(email) <= 320 AND
    email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  email_normalized text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_normalized)
);

CREATE TABLE public.account_signup_request_decisions (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  request_id text NOT NULL UNIQUE
    REFERENCES public.account_signup_requests(id),
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  actor_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER account_signup_requests_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.account_signup_requests
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();

CREATE TRIGGER account_signup_request_decisions_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.account_signup_request_decisions
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_foundation_append_only();

REVOKE ALL ON public.account_signup_requests,
              public.account_signup_request_decisions FROM PUBLIC;
GRANT SELECT, INSERT ON public.account_signup_requests,
                       public.account_signup_request_decisions TO ir_review_runtime;

CREATE VIEW public.account_signup_request_state AS
SELECT r.id AS request_id,
       r.display_name,
       r.email,
       r.requested_at,
       d.decision,
       d.note AS decision_note,
       d.actor_user_ref AS decided_by,
       u.username AS decided_by_username,
       d.decided_at
FROM public.account_signup_requests r
LEFT JOIN public.account_signup_request_decisions d ON d.request_id = r.id
LEFT JOIN public.cash_portal_users u ON u.id = d.actor_user_ref;

REVOKE ALL ON public.account_signup_request_state FROM PUBLIC;
GRANT SELECT ON public.account_signup_request_state TO ir_review_runtime;

COMMIT;
