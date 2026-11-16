-- Isolated rehearsal for db/migration-candidates/0031_cash_submissions_and_reviews.sql
-- Run only against a throwaway PostgreSQL clone. Never against production.
\set ON_ERROR_STOP on

INSERT INTO public.cash_portal_users(id,username,password_hash,role,display_name,must_change_password)
VALUES
 ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','review.admin',repeat('x',90),'ADMIN','Review Admin',false),
 ('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','review.user',repeat('x',90),'USER','Submitting User',false);

-- 1. A submission is stored without any financial row and starts pending.
INSERT INTO public.cash_submissions(id,scope_account,submitted_by_user_ref,submitted_by_role,employee_name,employee_mobile,payout_mobile,method,amount_minor,purpose,transaction_date,note,evidence_ref,payload,payload_hash)
VALUES (repeat('1',64),'wa-01','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','USER','Md. Osman','+8801754334400','+8801754334400','bkash',45000,'Escort duty','2026-10-03','','wamid-1','{"version":"cash-submission-v1"}'::jsonb,repeat('a',64));

DO $$
DECLARE state_value text; instruction_rows integer; posting_rows integer;
BEGIN
 SELECT review_state INTO state_value FROM public.cash_submission_review_state WHERE submission_id=repeat('1',64);
 IF state_value <> 'PENDING_REVIEW' THEN RAISE EXCEPTION 'expected PENDING_REVIEW, got %', state_value; END IF;
 SELECT count(*) INTO instruction_rows FROM public.cash_instructions;
 SELECT count(*) INTO posting_rows FROM public.cash_postings;
 IF instruction_rows <> 0 OR posting_rows <> 0 THEN RAISE EXCEPTION 'submission created financial rows'; END IF;
END $$;

-- 2. Duplicate submissions of the same payload are rejected by identity.
DO $$
BEGIN
 BEGIN
  INSERT INTO public.cash_submissions(id,scope_account,submitted_by_user_ref,submitted_by_role,employee_name,employee_mobile,payout_mobile,method,amount_minor,purpose,transaction_date,payload,payload_hash)
  VALUES (repeat('2',64),'wa-01','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','USER','Md. Osman','+8801754334400','+8801754334400','bkash',45000,'Escort duty','2026-10-03','{}'::jsonb,repeat('a',64));
  RAISE EXCEPTION 'duplicate payload_hash was accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;

-- 3. An Admin decision by a different reviewer is accepted and projected.
INSERT INTO public.cash_submission_reviews(id,submission_id,decision,actor_user_ref,actor_role,submitted_by_user_ref,note,payload_hash)
VALUES (repeat('3',64),repeat('1',64),'APPROVED','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','ADMIN','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','Looks complete',repeat('b',64));

DO $$
DECLARE state_value text;
BEGIN
 SELECT review_state INTO state_value FROM public.cash_submission_review_state WHERE submission_id=repeat('1',64);
 IF state_value <> 'ACTIVE_REVIEWED' THEN RAISE EXCEPTION 'expected ACTIVE_REVIEWED, got %', state_value; END IF;
END $$;

-- 4. The submitter cannot decide their own submission.
DO $$
BEGIN
 BEGIN
  INSERT INTO public.cash_submission_reviews(id,submission_id,decision,actor_user_ref,actor_role,submitted_by_user_ref,note,payload_hash)
  VALUES (repeat('4',64),repeat('1',64),'APPROVED','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','ADMIN','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','self approval',repeat('b',64));
  RAISE EXCEPTION 'reviewer_not_submitter was not enforced';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;

-- 5. Decisions and submissions are immutable.
DO $$
BEGIN
 BEGIN
  UPDATE public.cash_submission_reviews SET note='rewritten';
  RAISE EXCEPTION 'review UPDATE was not blocked';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%append-only%' THEN RAISE; END IF;
 END;
END $$;
DO $$
BEGIN
 BEGIN
  DELETE FROM public.cash_submissions;
  RAISE EXCEPTION 'submission DELETE was not blocked';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%append-only%' THEN RAISE; END IF;
 END;
END $$;

-- 6. Repeated decisions append; the newest one is projected.
INSERT INTO public.cash_submission_reviews(id,submission_id,decision,actor_user_ref,actor_role,submitted_by_user_ref,note,payload_hash,decided_at)
VALUES (repeat('5',64),repeat('1',64),'REJECTED','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','ADMIN','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','Duplicate',repeat('b',64),now()+interval '1 minute');

DO $$
DECLARE state_value text; decisions integer;
BEGIN
 SELECT review_state INTO state_value FROM public.cash_submission_review_state WHERE submission_id=repeat('1',64);
 IF state_value <> 'REJECTED' THEN RAISE EXCEPTION 'expected latest REJECTED, got %', state_value; END IF;
 SELECT count(*) INTO decisions FROM public.cash_submission_reviews WHERE submission_id=repeat('1',64);
 IF decisions <> 2 THEN RAISE EXCEPTION 'expected 2 append-only decisions, got %', decisions; END IF;
END $$;

-- 7. No financial side effects and read/insert-only runtime grants.
DO $$
DECLARE postings integer; grants text;
BEGIN
 SELECT count(*) INTO postings FROM public.cash_postings;
 IF postings <> 0 THEN RAISE EXCEPTION 'rehearsal created % postings', postings; END IF;
 SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) INTO grants
 FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name='cash_submission_reviews' AND grantee='ir_review_runtime';
 IF grants <> 'INSERT,SELECT' THEN RAISE EXCEPTION 'unexpected review grants: %', grants; END IF;
 SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) INTO grants
 FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name='cash_submissions' AND grantee='ir_review_runtime';
 IF grants <> 'INSERT,SELECT' THEN RAISE EXCEPTION 'unexpected submission grants: %', grants; END IF;
END $$;

SELECT 'REHEARSAL_OK' AS result;
