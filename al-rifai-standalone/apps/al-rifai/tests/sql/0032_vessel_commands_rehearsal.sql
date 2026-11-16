-- Isolated rehearsal for db/migration-candidates/0032_vessel_program_commands.sql
-- Run only against a throwaway PostgreSQL clone. Never against production.
\set ON_ERROR_STOP on

INSERT INTO identity_review_candidate.records(collection,id,payload)
VALUES ('registry','person-1','{"kind":"person","status":"VERIFIED"}'::jsonb);

-- 1. Add program through the command layer.
SELECT public.alrifai_vessel_program_add(
  'program-1','MV. Alpha Unity','MV. Light One','01829984145','O/A To Local','Md. Osman','01754334400','2026-10-03','D','person-1','cmd-add','initial') AS add_result;

-- 1b. Replaying the same add is idempotent and creates nothing.
DO $$
DECLARE result jsonb; programs integer;
BEGIN
 result := public.alrifai_vessel_program_add('program-1','MV. Alpha Unity','MV. Light One','01829984145','O/A To Local','Md. Osman','01754334400','2026-10-03','D','person-1','cmd-add','again');
 IF (result->>'idempotent')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'add replay not idempotent'; END IF;
 SELECT count(*) INTO programs FROM public.programs;
 IF programs <> 1 THEN RAISE EXCEPTION 'add replay created duplicate programs'; END IF;
END $$;

-- 2. Edit/release/assign/replace/void with expected revisions and command keys.
SELECT public.alrifai_vessel_program_update('program-1','{"destination":"Chattogram"}'::jsonb,'person-1',0,'cmd-edit','destination fix') AS edit_result;
SELECT public.alrifai_vessel_program_release('program-1','2026-10-06','N','O/A To Local','person-1',1,'cmd-release','{"source":"test"}'::jsonb) AS release_result;
SELECT public.alrifai_vessel_program_assign('program-1','01754334400','2026-10-03','D','person-1',2,'cmd-assign',false,'initial assignment') AS assign_result;
SELECT public.alrifai_vessel_program_assign('program-1','01754334401','2026-10-04','N','person-1',3,'cmd-replace',true,'replacement') AS replace_result;
SELECT public.alrifai_vessel_program_void('program-1','person-1','duplicate order confirmed',4,'cmd-void') AS void_result;

-- 3. Optimistic concurrency: stale revisions are rejected.
DO $$
BEGIN
 BEGIN
  PERFORM public.alrifai_vessel_program_update('program-1','{"destination":"Sylhet"}'::jsonb,'person-1',0,'cmd-stale','should conflict');
  RAISE EXCEPTION 'stale revision was accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%REVISION_CONFLICT%' THEN RAISE; END IF;
 END;
END $$;

-- 4. Idempotent replay of an applied command appends no event.
DO $$
DECLARE result jsonb; events integer;
BEGIN
 result := public.alrifai_vessel_program_update('program-1','{"destination":"Chattogram"}'::jsonb,'person-1',0,'cmd-edit','replay');
 IF (result->>'idempotent')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'replay not idempotent'; END IF;
 SELECT jsonb_array_length(details::jsonb->'programCommand'->'events') INTO events FROM public.programs WHERE id='program-1';
 IF events <> 6 THEN RAISE EXCEPTION 'replay appended an event (events=%)', events; END IF;
END $$;

-- 5. Ledger integrity: 6 events, revision 5, program retained and Voided.
DO $$
DECLARE events integer; revision_value integer; status_value text; assignments integer;
BEGIN
 SELECT jsonb_array_length(details::jsonb->'programCommand'->'events'), revision, status
   INTO events, revision_value, status_value FROM public.programs WHERE id='program-1';
 IF events <> 6 THEN RAISE EXCEPTION 'expected 6 ledger events, got %', events; END IF;
 IF revision_value <> 5 THEN RAISE EXCEPTION 'expected revision 5, got %', revision_value; END IF;
 IF status_value <> 'Voided' THEN RAISE EXCEPTION 'expected Voided, got %', status_value; END IF;
 SELECT count(*) INTO assignments FROM public.program_assignments WHERE program_id='program-1';
 IF assignments <> 2 THEN RAISE EXCEPTION 'expected 2 assignment revisions, got %', assignments; END IF;
END $$;

-- 6. No destructive path: direct UPDATE/DELETE denied to the runtime role.
SET ROLE ir_review_runtime;
DO $$
BEGIN
 BEGIN
  UPDATE public.programs SET "motherVessel"='direct write' WHERE id='program-1';
  RAISE EXCEPTION 'broad UPDATE unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
DO $$
BEGIN
 BEGIN
  DELETE FROM public.programs WHERE id='program-1';
  RAISE EXCEPTION 'DELETE unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;

-- 7. Actor verification and required command key fail closed.
DO $$
BEGIN
 BEGIN
  PERFORM public.alrifai_vessel_program_void('program-1','person-unknown','should fail',5,'cmd-x');
  RAISE EXCEPTION 'unverified actor was accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%VERIFIED_ACTOR_REQUIRED%' THEN RAISE; END IF;
 END;
END $$;

-- 8. Cash is untouched by every vessel command.
DO $$
DECLARE instructions integer; postings integer;
BEGIN
 SELECT count(*) INTO instructions FROM public.cash_instructions;
 SELECT count(*) INTO postings FROM public.cash_postings;
 IF instructions <> 0 OR postings <> 0 THEN RAISE EXCEPTION 'vessel commands touched cash'; END IF;
END $$;

SELECT 'VESSEL_COMMANDS_REHEARSAL_OK' AS result;
