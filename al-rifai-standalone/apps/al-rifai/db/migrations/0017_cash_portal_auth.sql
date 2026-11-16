-- Additive authentication and profile data for the public /cash portal.
-- Passwords are PBKDF2 hashes only; the bootstrap row is replaced on first login.
CREATE TABLE public.cash_portal_users (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'),
 username text NOT NULL CHECK(length(username) BETWEEN 1 AND 80),
 password_hash text NOT NULL CHECK(length(password_hash) BETWEEN 80 AND 200),
 role text NOT NULL CHECK(role IN ('ADMIN','USER')),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 150),
 email text CHECK(email IS NULL OR length(email)<=320),
 mobile text CHECK(mobile IS NULL OR length(mobile)<=50),
 whatsapp_number text CHECK(whatsapp_number IS NULL OR length(whatsapp_number)<=50),
 must_change_password boolean NOT NULL DEFAULT true,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by text REFERENCES public.cash_portal_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz,
 password_changed_at timestamptz
);
CREATE UNIQUE INDEX cash_portal_users_username_ci ON public.cash_portal_users(lower(username));

CREATE TABLE public.cash_portal_sessions (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'),
 user_id text NOT NULL REFERENCES public.cash_portal_users(id) ON DELETE CASCADE,
 csrf_hash text NOT NULL CHECK(csrf_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 user_agent text,
 client_ip text
);
CREATE INDEX cash_portal_sessions_user ON public.cash_portal_sessions(user_id,last_seen_at DESC);
CREATE INDEX cash_portal_sessions_expiry ON public.cash_portal_sessions(expires_at);

CREATE TABLE public.cash_portal_audit (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'),
 actor_id text REFERENCES public.cash_portal_users(id),
 target_id text,
 action text NOT NULL CHECK(action ~ '^[A-Z][A-Z0-9_.:-]{1,80}$'),
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cash_portal_audit_created ON public.cash_portal_audit(created_at DESC,id);

-- Bootstrap identity. The password value below is a PBKDF2 hash only and is
-- marked for mandatory change at first login.
INSERT INTO public.cash_portal_users(id,username,password_hash,role,display_name,must_change_password)
VALUES('81a73b320d9d56c175b48552a648b7405659dc814921bf12be38927f07b72c79','Admin','pbkdf2-sha256:600000:bf31831eae52ee813013e4a80b722f47:b249d004563cdc33615d466aa3fa87f74f9b8f4cb04807f640068dff47a43e8a','ADMIN','Admin',true)
ON CONFLICT(id) DO NOTHING;
REVOKE ALL ON public.cash_portal_users,public.cash_portal_sessions,public.cash_portal_audit FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.cash_portal_users TO ir_review_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cash_portal_sessions TO ir_review_runtime;
GRANT INSERT ON public.cash_portal_audit TO ir_review_runtime;
GRANT SELECT ON public.cash_instructions,public.cash_postings,public.cash_movements TO ir_review_runtime;
