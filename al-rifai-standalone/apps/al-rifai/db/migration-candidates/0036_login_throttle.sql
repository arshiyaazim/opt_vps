-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION.
-- Login throttle state: hashed keys only (no plaintext usernames, IPs or
-- credentials). Progressive-delay data with bounded 24h retention.
-- Ordered after 0035; depends only on the ir_review_runtime role.

BEGIN;

CREATE TABLE public.login_throttle_state (
  key text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 10000),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  delay_until timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.login_throttle_state FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_throttle_state TO ir_review_runtime;

COMMIT;
