-- TEST ONLY. This schema deliberately does not import or call production code.
CREATE SCHEMA cash_delivery_test;
CREATE ROLE cash_delivery_receiver NOLOGIN;

CREATE TABLE cash_delivery_test.instructions (
    instruction_id text PRIMARY KEY,
    state text NOT NULL CHECK (state IN ('INTENT', 'REVIEW', 'MANUAL_READY'))
);

CREATE TABLE cash_delivery_test.canonical_postings (
    posting_id text PRIMARY KEY,
    case_name text NOT NULL,
    source_account text NOT NULL,
    operation_id text NOT NULL UNIQUE,
    instruction_id text NOT NULL,
    command_id text NOT NULL,
    posting_status text NOT NULL CHECK (posting_status = 'POSTED'),
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    employee_mobile text NOT NULL,
    payout_mobile text,
    payload_hash text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL
);

CREATE TABLE cash_delivery_test.cash_movements (
    posting_id text NOT NULL REFERENCES cash_delivery_test.canonical_postings,
    leg smallint NOT NULL CHECK (leg IN (1, 2)),
    amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
    PRIMARY KEY (posting_id, leg)
);

CREATE TABLE cash_delivery_test.delivery_receipts (
    receipt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_system text NOT NULL,
    source_account text NOT NULL,
    posting_id text NOT NULL,
    payload_hash text NOT NULL,
    payload jsonb NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (source_system, source_account, posting_id)
);

CREATE TABLE cash_delivery_test.delivery_conflicts (
    conflict_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_system text NOT NULL,
    source_account text NOT NULL,
    posting_id text NOT NULL,
    incoming_hash text NOT NULL,
    incoming_payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'NEEDS_REVIEW'
        CHECK (status = 'NEEDS_REVIEW'),
    UNIQUE (source_system, source_account, posting_id, incoming_hash)
);

CREATE TABLE cash_delivery_test.delivery_reviews (
    review_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_system text NOT NULL,
    source_account text NOT NULL,
    posting_id text NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'NEEDS_REVIEW'
        CHECK (status = 'NEEDS_REVIEW')
);

CREATE TABLE cash_delivery_test.delivery_status (
    source_system text NOT NULL,
    source_account text NOT NULL,
    posting_id text NOT NULL,
    status text NOT NULL CHECK (
        status IN ('PENDING', 'ACCEPTED', 'DELIVERY_FAILED', 'NEEDS_REVIEW')
    ),
    PRIMARY KEY (source_system, source_account, posting_id)
);

CREATE FUNCTION cash_delivery_test.receive_cash(
    p_source_system text,
    p_source_account text,
    p_posting_id text,
    p_payload_hash text,
    p_domain text,
    p_record_type text,
    p_identity_verified boolean,
    p_payload jsonb
) RETURNS TABLE(result_status text, result_receipt_id text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, cash_delivery_test
AS $function$
DECLARE
    v_existing cash_delivery_test.delivery_receipts%ROWTYPE;
    v_posting cash_delivery_test.canonical_postings%ROWTYPE;
BEGIN
    IF p_source_system IS DISTINCT FROM 'alrifai-canonical-db'
       OR p_source_account IS DISTINCT FROM 'wa-01'
       OR p_domain IS DISTINCT FROM 'ACCOUNTS'
       OR p_record_type IS DISTINCT FROM 'CASH_POSTING'
       OR p_identity_verified IS DISTINCT FROM true THEN
        INSERT INTO cash_delivery_test.delivery_reviews
            (source_system, source_account, posting_id, reason)
        VALUES (coalesce(p_source_system, ''), coalesce(p_source_account, ''),
                coalesce(p_posting_id, ''), 'SOURCE_DOMAIN_OR_IDENTITY');
        INSERT INTO cash_delivery_test.delivery_status
            (source_system, source_account, posting_id, status)
        VALUES (coalesce(p_source_system, ''), coalesce(p_source_account, ''),
                coalesce(p_posting_id, ''), 'NEEDS_REVIEW')
        ON CONFLICT (source_system, source_account, posting_id)
        DO UPDATE SET status = 'NEEDS_REVIEW';
        result_status := 'NEEDS_REVIEW';
        result_receipt_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT * INTO v_existing
      FROM cash_delivery_test.delivery_receipts r
     WHERE r.source_system = p_source_system
       AND r.source_account = p_source_account
       AND r.posting_id = p_posting_id;

    IF FOUND AND v_existing.payload_hash = p_payload_hash
              AND v_existing.payload = p_payload THEN
        INSERT INTO cash_delivery_test.delivery_status
            (source_system, source_account, posting_id, status)
        VALUES (p_source_system, p_source_account, p_posting_id, 'ACCEPTED')
        ON CONFLICT (source_system, source_account, posting_id)
        DO UPDATE SET status = 'ACCEPTED';
        result_status := 'ACCEPTED';
        result_receipt_id := v_existing.receipt_id::text;
        RETURN NEXT;
        RETURN;
    ELSIF FOUND THEN
        INSERT INTO cash_delivery_test.delivery_conflicts
            (source_system, source_account, posting_id, incoming_hash, incoming_payload)
        VALUES (p_source_system, p_source_account, p_posting_id,
                p_payload_hash, p_payload)
        ON CONFLICT DO NOTHING;
        INSERT INTO cash_delivery_test.delivery_status
            (source_system, source_account, posting_id, status)
        VALUES (p_source_system, p_source_account, p_posting_id, 'NEEDS_REVIEW')
        ON CONFLICT (source_system, source_account, posting_id)
        DO UPDATE SET status = 'NEEDS_REVIEW';
        result_status := 'NEEDS_REVIEW';
        result_receipt_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT * INTO v_posting
      FROM cash_delivery_test.canonical_postings p
     WHERE p.posting_id = p_posting_id
       AND p.source_account = p_source_account
       AND p.posting_status = 'POSTED';

    IF NOT FOUND OR v_posting.payload_hash IS DISTINCT FROM p_payload_hash
                OR v_posting.payload IS DISTINCT FROM p_payload THEN
        INSERT INTO cash_delivery_test.delivery_reviews
            (source_system, source_account, posting_id, reason)
        VALUES (p_source_system, p_source_account, p_posting_id,
                'NO_MATCHING_CANONICAL_POSTED_RECORD');
        INSERT INTO cash_delivery_test.delivery_status
            (source_system, source_account, posting_id, status)
        VALUES (p_source_system, p_source_account, p_posting_id, 'NEEDS_REVIEW')
        ON CONFLICT (source_system, source_account, posting_id)
        DO UPDATE SET status = 'NEEDS_REVIEW';
        result_status := 'NEEDS_REVIEW';
        result_receipt_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO cash_delivery_test.delivery_receipts
        (source_system, source_account, posting_id, payload_hash, payload)
    VALUES (p_source_system, p_source_account, p_posting_id, p_payload_hash, p_payload)
    ON CONFLICT (source_system, source_account, posting_id) DO NOTHING;

    SELECT * INTO v_existing
      FROM cash_delivery_test.delivery_receipts r
     WHERE r.source_system = p_source_system
       AND r.source_account = p_source_account
       AND r.posting_id = p_posting_id;

    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash
       OR v_existing.payload IS DISTINCT FROM p_payload THEN
        INSERT INTO cash_delivery_test.delivery_conflicts
            (source_system, source_account, posting_id, incoming_hash, incoming_payload)
        VALUES (p_source_system, p_source_account, p_posting_id,
                p_payload_hash, p_payload)
        ON CONFLICT DO NOTHING;
        INSERT INTO cash_delivery_test.delivery_status
            (source_system, source_account, posting_id, status)
        VALUES (p_source_system, p_source_account, p_posting_id, 'NEEDS_REVIEW')
        ON CONFLICT (source_system, source_account, posting_id)
        DO UPDATE SET status = 'NEEDS_REVIEW';
        result_status := 'NEEDS_REVIEW';
        result_receipt_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO cash_delivery_test.delivery_status
        (source_system, source_account, posting_id, status)
    VALUES (p_source_system, p_source_account, p_posting_id, 'ACCEPTED')
    ON CONFLICT (source_system, source_account, posting_id)
    DO UPDATE SET status = 'ACCEPTED';
    result_status := 'ACCEPTED';
    result_receipt_id := v_existing.receipt_id::text;
    RETURN NEXT;
END;
$function$;

REVOKE ALL ON SCHEMA cash_delivery_test FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA cash_delivery_test FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA cash_delivery_test FROM PUBLIC;
REVOKE ALL ON FUNCTION cash_delivery_test.receive_cash(
    text, text, text, text, text, text, boolean, jsonb
) FROM PUBLIC;

GRANT USAGE ON SCHEMA cash_delivery_test TO cash_delivery_receiver;
GRANT SELECT ON cash_delivery_test.canonical_postings
    TO cash_delivery_receiver;
GRANT SELECT, INSERT ON cash_delivery_test.delivery_receipts,
    cash_delivery_test.delivery_conflicts,
    cash_delivery_test.delivery_reviews TO cash_delivery_receiver;
GRANT SELECT, INSERT, UPDATE ON cash_delivery_test.delivery_status
    TO cash_delivery_receiver;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cash_delivery_test
    TO cash_delivery_receiver;
GRANT EXECUTE ON FUNCTION cash_delivery_test.receive_cash(
    text, text, text, text, text, text, boolean, jsonb
) TO cash_delivery_receiver;
