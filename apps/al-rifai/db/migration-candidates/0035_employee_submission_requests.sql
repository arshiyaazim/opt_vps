-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO ANY DATABASE.
-- Ordered after migration 0017_cash_portal_auth.sql; no dependency on 0032/0034.
--
-- Stores minimal employee-record requests, not active employees.
-- NID, salary and emergency-contact data are intentionally excluded until a
-- separately approved protected HR-data design exists. Decisions and explicit
-- activation are separate append-only records; approval never activates.
-- This schema does not write the payment-derived employee_master or Vessel data.

BEGIN;

CREATE TABLE public.employee_submission_requests (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  submitted_by_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  submitted_by_role text NOT NULL CHECK (submitted_by_role IN ('ADMIN','USER')),
  employee_name text NOT NULL CHECK (length(employee_name) BETWEEN 1 AND 150),
  employee_mobile text NOT NULL CHECK (employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
  proposed_assignment text NOT NULL DEFAULT '' CHECK (length(proposed_assignment) <= 200),
  requested_joining_date date,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submitted_by_user_ref, payload_hash)
);

CREATE FUNCTION public.alrifai_employee_submission_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'EMPLOYEE_SUBMISSION_APPEND_ONLY';
END;
$$;

CREATE TRIGGER employee_submission_requests_no_update_delete
  BEFORE UPDATE OR DELETE ON public.employee_submission_requests
  FOR EACH ROW EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

CREATE TRIGGER employee_submission_requests_no_truncate
  BEFORE TRUNCATE ON public.employee_submission_requests
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

CREATE TABLE public.employee_submission_decisions (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  request_id text NOT NULL UNIQUE REFERENCES public.employee_submission_requests(id),
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  actor_user_ref text NOT NULL REFERENCES public.cash_portal_users(id),
  note text NOT NULL DEFAULT '' CHECK (
    length(note) <= 500 AND (decision <> 'REJECTED' OR length(btrim(note)) > 0)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER employee_submission_decisions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.employee_submission_decisions
  FOR EACH ROW EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

CREATE TRIGGER employee_submission_decisions_no_truncate
  BEFORE TRUNCATE ON public.employee_submission_decisions
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

CREATE TABLE public.employee_directory_records (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  source_request_id text NOT NULL UNIQUE REFERENCES public.employee_submission_requests(id),
  employee_name text NOT NULL CHECK (length(employee_name) BETWEEN 1 AND 150),
  employee_mobile text NOT NULL UNIQUE CHECK (employee_mobile ~ '^\+8801[3-9][0-9]{8}$'),
  proposed_assignment text NOT NULL DEFAULT '' CHECK (length(proposed_assignment) <= 200),
  requested_joining_date date,
  activated_by text NOT NULL REFERENCES public.cash_portal_users(id),
  activated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.alrifai_employee_activation_requires_approval() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employee_submission_decisions d
    WHERE d.request_id=NEW.source_request_id AND d.decision='APPROVED'
  ) THEN
    RAISE EXCEPTION 'EMPLOYEE_REQUEST_NOT_APPROVED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_directory_requires_approval
  BEFORE INSERT ON public.employee_directory_records
  FOR EACH ROW EXECUTE FUNCTION public.alrifai_employee_activation_requires_approval();

CREATE TRIGGER employee_directory_no_update_delete
  BEFORE UPDATE OR DELETE ON public.employee_directory_records
  FOR EACH ROW EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

CREATE TRIGGER employee_directory_no_truncate
  BEFORE TRUNCATE ON public.employee_directory_records
  FOR EACH STATEMENT EXECUTE FUNCTION public.alrifai_employee_submission_immutable();

REVOKE ALL ON public.employee_submission_requests FROM PUBLIC;
REVOKE ALL ON public.employee_submission_decisions FROM PUBLIC;
REVOKE ALL ON public.employee_directory_records FROM PUBLIC;
GRANT SELECT, INSERT ON public.employee_submission_requests TO ir_review_runtime;
GRANT SELECT, INSERT ON public.employee_submission_decisions TO ir_review_runtime;
GRANT SELECT, INSERT ON public.employee_directory_records TO ir_review_runtime;

COMMIT;
