-- REVIEW CANDIDATE ONLY. Deliberately outside db/migrations.
-- Assign 0006 only after rechecking the ledger and explicit migration approval.
-- Existing public schema and programs authority; no existing column altered.
CREATE TABLE ep_source_occurrences (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 source_file text NOT NULL, file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
 document_pointer text NOT NULL, decoded_pointer text NOT NULL DEFAULT '',
 payload_sha256 text, source_record_id text, record_sha256 text NOT NULL CHECK (record_sha256 ~ '^[a-f0-9]{64}$'),
 mapping_version text NOT NULL, raw_record jsonb NOT NULL CHECK (jsonb_typeof(raw_record)='object'),
 UNIQUE (file_sha256,document_pointer,decoded_pointer),
 CHECK (payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$')
);
CREATE TABLE ep_review_decisions (
 id text PRIMARY KEY, occurrence_id text NOT NULL REFERENCES ep_source_occurrences(id),
 event_key text NOT NULL DEFAULT '' CHECK (event_key='' OR event_key ~ '^[a-f0-9]{64}$'),
 role text NOT NULL CHECK (role IN ('employee','employee_history','employee_name','employee_alias','employee_contact','employee_employment','vessel','mother','lighter','vessel_alias','mother_alias','lighter_alias','program','program_vessel','assignment','program_event','release','settlement','payment')),
 decision text NOT NULL CHECK (decision IN ('approved','rejected','manual_review','blocked')),
 approver text NOT NULL CHECK (length(approver)>0), approved_at timestamptz NOT NULL,
 evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
 evidence_basis text NOT NULL CHECK (evidence_basis IN ('independent_authority','owner_verified_escort_field_role','owner_verified_message_role','owner_verified_ledger_mobile','verified_release_document','verified_settlement_decision','verified_payment_receipt')),
 evidence_reference text NOT NULL CHECK (length(evidence_reference)>0),
 assertion jsonb NOT NULL CHECK (jsonb_typeof(assertion)='object'), supersedes text REFERENCES ep_review_decisions(id),
 CHECK (role NOT IN ('program_event','release','settlement','payment') OR COALESCE(assertion ? 'eventType' AND assertion->>'eventType' IN ('client_order','admin_confirmation','duplicate','corrected','cancelled','restarted','escort_replaced','assigned','duty_started','release_evidence','released','program_completed','ghat_review','settlement_approved','payment_completed'), false)),
 UNIQUE (id,decision), UNIQUE (id,decision,evidence_basis), UNIQUE (id,occurrence_id,role,event_key)
);
-- EMP-001: employee_id is the normalized ledger mobile; id is only a technical internal key.
-- No escort_mobile column is introduced. Existing child employee_id columns remain text and reference the mobile-valued key.
-- Owner field-role evidence is an explicit alternative to independent HR identity proof.
-- Only approved decisions can underpin operational rows. Candidates stay in source/decision records.
CREATE TABLE ep_employees (
 id text PRIMARY KEY,
 employee_id text NOT NULL UNIQUE CHECK (employee_id ~ '^\+8801[3-9][0-9]{8}$'),
 authoritative_code text UNIQUE,
 identity_basis text NOT NULL CHECK (identity_basis IN ('independent_authority','owner_verified_escort_field_role','owner_verified_ledger_mobile')),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval,identity_basis) REFERENCES ep_review_decisions(id,decision,evidence_basis),
 CHECK (authoritative_code IS NULL OR length(authoritative_code)>0)
);
CREATE TABLE ep_employee_history (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES ep_employees(employee_id),
 kind text NOT NULL CHECK (kind IN ('name','alias','contact','employment')),
 value text NOT NULL CHECK (length(value)>0), comparison_value text,
 valid_from date, valid_to date,
 verification text NOT NULL CHECK (verification IN ('verified','unverified','disputed')),
 contact_ownership text CHECK (contact_ownership IN ('personal','shared','reassigned','unknown')),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to>valid_from),
 CHECK (kind<>'employment' OR valid_from IS NOT NULL),
 CHECK ((kind='contact')=(contact_ownership IS NOT NULL)),
 CHECK (kind<>'employment' OR value IN ('applicant','confirmed','inactive','former'))
);
-- Name spelling is one alias fact with many occurrence bindings, not duplicate alias rows.
CREATE UNIQUE INDEX ep_employee_alias_once ON ep_employee_history(employee_id,value) WHERE kind IN ('name','alias');
CREATE INDEX ep_employee_history_period ON ep_employee_history(employee_id,kind,valid_from);
CREATE TABLE ep_vessels (
 id text PRIMARY KEY, authority_reference text NOT NULL UNIQUE CHECK (length(authority_reference)>0),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision)
);
CREATE TABLE ep_vessel_aliases (
 id text PRIMARY KEY, vessel_id text NOT NULL REFERENCES ep_vessels(id),
 label text NOT NULL CHECK (length(label)>0), comparison_value text NOT NULL,
 valid_from date, valid_to date,
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 CHECK (valid_to IS NULL OR (valid_from IS NOT NULL AND valid_to>valid_from))
);
CREATE INDEX ep_vessel_alias_lookup ON ep_vessel_aliases(comparison_value);
CREATE TABLE ep_programs (
 program_id text PRIMARY KEY REFERENCES programs(id),
 authority_reference text NOT NULL UNIQUE CHECK (length(authority_reference)>0),
 start_date date, end_date date, shift text CHECK (shift IN ('D','N')),
 lifecycle text NOT NULL CHECK (lifecycle IN ('draft','review','confirmed','assigned','active','released','program_completed','cancelled')),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 CHECK (end_date IS NULL OR end_date>=start_date),
 CHECK (lifecycle IN ('draft','review') OR (start_date IS NOT NULL AND shift IS NOT NULL)),
 CHECK (lifecycle<>'program_completed' OR end_date IS NOT NULL)
);
-- One program can contain several lighters. A vessel can recur across programs.
CREATE TABLE ep_program_vessels (
 id text PRIMARY KEY, program_id text NOT NULL REFERENCES ep_programs(program_id),
 mother_id text NOT NULL REFERENCES ep_vessels(id), lighter_id text NOT NULL REFERENCES ep_vessels(id),
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 CHECK (mother_id<>lighter_id), UNIQUE(program_id,lighter_id), UNIQUE(id,program_id,lighter_id)
);
CREATE TABLE ep_assignment_events (
 id text PRIMARY KEY, relationship_id text NOT NULL,
 program_id text NOT NULL, lighter_id text NOT NULL, employee_id text NOT NULL REFERENCES ep_employees(employee_id),
 kind text NOT NULL CHECK (kind IN ('assigned','replaced','cancelled','ended')),
 valid_from date NOT NULL, valid_to date, previous_id text,
 decision_id text NOT NULL, approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 FOREIGN KEY (relationship_id,program_id,lighter_id) REFERENCES ep_program_vessels(id,program_id,lighter_id),
 UNIQUE(id,program_id,lighter_id),
 FOREIGN KEY (previous_id,program_id,lighter_id) REFERENCES ep_assignment_events(id,program_id,lighter_id),
 CHECK (valid_to IS NULL OR valid_to>=valid_from), CHECK (previous_id IS NULL OR previous_id<>id),
 CHECK ((kind='assigned' AND previous_id IS NULL) OR (kind<>'assigned' AND previous_id IS NOT NULL))
);
CREATE UNIQUE INDEX ep_assignment_one_successor ON ep_assignment_events(previous_id) WHERE previous_id IS NOT NULL;
CREATE INDEX ep_assignment_period ON ep_assignment_events(program_id,lighter_id,valid_from);
-- One immutable checkpoint inserted with the entire future transaction; no mutable progress cursor.
CREATE TABLE ep_import_batches (
 id text PRIMARY KEY, manifest_sha256 text NOT NULL UNIQUE CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
 manifest jsonb NOT NULL, schema_sha256 text NOT NULL CHECK (schema_sha256 ~ '^[a-f0-9]{64}$'),
 mapping_version text NOT NULL, owner_approval_reference text NOT NULL CHECK (length(owner_approval_reference)>0),
 accepted_count integer NOT NULL CHECK (accepted_count>=0), committed_at timestamptz NOT NULL
);
-- A message can contain many genuine lighter blocks. event_key is the deterministic block event ID;
-- blank means the original whole-record scope. Approval FK binds the same exact event key.
CREATE TABLE ep_source_bindings (
 id text PRIMARY KEY, occurrence_id text NOT NULL REFERENCES ep_source_occurrences(id),
 event_key text NOT NULL DEFAULT '' CHECK (event_key='' OR event_key ~ '^[a-f0-9]{64}$'),
 role text NOT NULL, decision_id text NOT NULL,
 approval text NOT NULL DEFAULT 'approved' CHECK (approval='approved'),
 FOREIGN KEY (decision_id,approval) REFERENCES ep_review_decisions(id,decision),
 batch_id text NOT NULL REFERENCES ep_import_batches(id), target_sha256 text NOT NULL CHECK (target_sha256 ~ '^[a-f0-9]{64}$'),
 employee_id text REFERENCES ep_employees(employee_id), employee_history_id text REFERENCES ep_employee_history(id),
 vessel_id text REFERENCES ep_vessels(id), vessel_alias_id text REFERENCES ep_vessel_aliases(id),
 program_id text REFERENCES ep_programs(program_id), relationship_id text REFERENCES ep_program_vessels(id),
 assignment_id text REFERENCES ep_assignment_events(id),
 UNIQUE(occurrence_id,role,event_key),
 FOREIGN KEY (decision_id,occurrence_id,role,event_key) REFERENCES ep_review_decisions(id,occurrence_id,role,event_key),
 CHECK ((role='employee' AND employee_id IS NOT NULL) OR (role IN ('employee_history','employee_name','employee_alias','employee_contact','employee_employment') AND employee_history_id IS NOT NULL) OR (role IN ('vessel','mother','lighter') AND vessel_id IS NOT NULL) OR (role IN ('vessel_alias','mother_alias','lighter_alias') AND vessel_alias_id IS NOT NULL) OR (role IN ('program','program_event','release','settlement','payment') AND program_id IS NOT NULL) OR (role='program_vessel' AND relationship_id IS NOT NULL) OR (role='assignment' AND assignment_id IS NOT NULL)),
 CHECK (num_nonnulls(employee_id,employee_history_id,vessel_id,vessel_alias_id,program_id,relationship_id,assignment_id)=1)
);
-- Program lifecycle changes append approved decision assertions/source bindings to the existing program.
-- Released, program_completed, settlement_approved and payment_completed remain distinct events.
-- No financial posting or inferred closure is added. Initial lifecycle in ep_programs is immutable.
-- Append-only identity and evidence authority. Existing immutable rejection function is reused.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ep_source_occurrences','ep_review_decisions','ep_employees','ep_employee_history','ep_vessels','ep_vessel_aliases','ep_programs','ep_program_vessels','ep_assignment_events','ep_import_batches','ep_source_bindings'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION alrifai_reject_snapshot_change()',t||'_immutable',t);
  EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION alrifai_reject_snapshot_change()',t||'_no_truncate',t);
 END LOOP;
END $$;
