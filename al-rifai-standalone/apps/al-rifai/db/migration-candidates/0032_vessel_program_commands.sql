-- PREPARED MIGRATION CANDIDATE — NOT APPLIED TO PRODUCTION.
--
-- Narrowly scoped SECURITY DEFINER command layer for Vessel programs.
-- No broad UPDATE/DELETE grant is restored: the runtime role receives EXECUTE on
-- these functions only. Each command appends exactly one event to
-- programs.details.programCommand (guarded by migration 0007), requires the
-- caller-supplied expected revision, and is idempotent by command key.
--
-- Safety properties:
--   * fixed search_path (public, pg_catalog) and fully qualified objects;
--   * VERIFIED person actor required, resolved server-side by the application;
--   * no client-supplied actor identity;
--   * EXECUTE granted only to ir_review_runtime, never PUBLIC;
--   * VOID instead of DELETE; no ledger/posting side effects.

BEGIN;

CREATE FUNCTION public.alrifai_vessel_actor_verified(p_actor text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
 SELECT EXISTS(
   SELECT 1 FROM identity_review_candidate.records r
   WHERE r.collection='registry' AND r.id=p_actor
     AND r.payload->>'kind'='person' AND r.payload->>'status'='VERIFIED'
 );
$$;

-- Returns the existing event when the command key was already applied.
CREATE FUNCTION public.alrifai_vessel_idempotent_event(p_cmd jsonb, p_key text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
 SELECT e FROM jsonb_array_elements(coalesce(p_cmd->'events','[]'::jsonb)) e
  WHERE e->>'key'=p_key LIMIT 1;
$$;

CREATE FUNCTION public.alrifai_vessel_program_add(
  p_id text, p_mother text, p_lighter text, p_master_mobile text, p_destination text,
  p_escort_name text, p_escort_mobile text, p_start_date text, p_shift text,
  p_actor text, p_command_key text, p_note text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE event jsonb; ledger jsonb; existing_revision integer;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PROGRAM_ID_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key,''))='' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF btrim(coalesce(p_mother,''))='' OR btrim(coalesce(p_lighter,''))='' THEN RAISE EXCEPTION 'VESSEL_PAIR_REQUIRED'; END IF;
  IF coalesce(p_shift,'') NOT IN ('D','N','') THEN RAISE EXCEPTION 'SHIFT_INVALID'; END IF;
  -- Deterministic program identity: an identical replay is idempotent, never a duplicate.
  SELECT revision INTO existing_revision FROM public.programs WHERE id=p_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok',true,'id',p_id,'revision',existing_revision,'action','ADD_PROGRAM','idempotent',true);
  END IF;
  event := jsonb_build_object('action','ADD_PROGRAM','key',p_command_key,'at',now(),'actor',p_actor,'note',coalesce(p_note,''));
  ledger := jsonb_build_object('scope','vessel-program','authority','OWNER_APPROVED','schemaVersion','v1','events',jsonb_build_array(event));
  INSERT INTO public.programs(id,"motherVessel","lighterVessel","masterMobile",destination,"escortName","escortMobile","startDate","endDate",shift,status,source,notes,"duplicateOf","createdAt",revision,details)
  VALUES(p_id,p_mother,p_lighter,coalesce(p_master_mobile,''),coalesce(p_destination,''),coalesce(p_escort_name,''),coalesce(p_escort_mobile,''),coalesce(p_start_date,''),'',coalesce(p_shift,''),'Draft','Admin command','',NULL,now()::text,0,jsonb_build_object('programCommand',ledger));
  RETURN jsonb_build_object('ok',true,'id',p_id,'revision',0,'action','ADD_PROGRAM','idempotent',false);
END $$;

CREATE FUNCTION public.alrifai_vessel_program_update(
  p_id text, p_patch jsonb, p_actor text, p_expected_revision integer, p_command_key text, p_note text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE d jsonb; cmd jsonb; event jsonb; prior jsonb; revision_now integer;
  allowed text[] := ARRAY['motherVessel','lighterVessel','masterMobile','destination','escortName','escortMobile','startDate','shift','notes'];
  key text;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key,''))='' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb THEN RAISE EXCEPTION 'PATCH_REQUIRED'; END IF;
  FOR key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF key <> ALL(allowed) THEN RAISE EXCEPTION 'FIELD_NOT_EDITABLE:%', key; END IF;
  END LOOP;
  SELECT details::jsonb,revision INTO d,revision_now FROM public.programs WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  cmd := coalesce(d->'programCommand','{}'::jsonb);
  prior := public.alrifai_vessel_idempotent_event(cmd,p_command_key);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now,'action','EDIT_PROGRAM','idempotent',true);
  END IF;
  IF p_expected_revision IS NULL OR revision_now <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  event := jsonb_build_object('action','EDIT_PROGRAM','key',p_command_key,'at',now(),'actor',p_actor,'note',coalesce(p_note,''),'patch',p_patch);
  UPDATE public.programs SET
    "motherVessel"=coalesce(p_patch->>'motherVessel',"motherVessel"),
    "lighterVessel"=coalesce(p_patch->>'lighterVessel',"lighterVessel"),
    "masterMobile"=coalesce(p_patch->>'masterMobile',"masterMobile"),
    destination=coalesce(p_patch->>'destination',destination),
    "escortName"=coalesce(p_patch->>'escortName',"escortName"),
    "escortMobile"=coalesce(p_patch->>'escortMobile',"escortMobile"),
    "startDate"=coalesce(p_patch->>'startDate',"startDate"),
    shift=coalesce(p_patch->>'shift',shift),
    notes=coalesce(p_patch->>'notes',notes),
    revision=revision+1,
    details=((coalesce(d,'{}'::jsonb)||jsonb_build_object('programCommand', jsonb_set(cmd,'{events}',coalesce(cmd->'events','[]'::jsonb)||jsonb_build_array(event))))::text)
  WHERE id=p_id;
  RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now+1,'action','EDIT_PROGRAM','idempotent',false);
END $$;

CREATE FUNCTION public.alrifai_vessel_program_release(
  p_id text, p_end_date text, p_end_shift text, p_release_point text, p_actor text,
  p_expected_revision integer, p_command_key text, p_evidence jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE d jsonb; cmd jsonb; event jsonb; prior jsonb; revision_now integer;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key,''))='' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF btrim(coalesce(p_end_date,''))='' OR coalesce(p_end_shift,'') NOT IN ('D','N') THEN RAISE EXCEPTION 'RELEASE_FIELDS_REQUIRED'; END IF;
  SELECT details::jsonb,revision INTO d,revision_now FROM public.programs WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  cmd := coalesce(d->'programCommand','{}'::jsonb);
  prior := public.alrifai_vessel_idempotent_event(cmd,p_command_key);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now,'action','RELEASE_PROGRAM','idempotent',true); END IF;
  IF p_expected_revision IS NULL OR revision_now <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  event := jsonb_build_object('action','RELEASE_PROGRAM','key',p_command_key,'at',now(),'actor',p_actor,'endDate',p_end_date,'endShift',p_end_shift,'releasePoint',coalesce(p_release_point,''),'evidence',coalesce(p_evidence,'{}'::jsonb));
  UPDATE public.programs SET "endDate"=p_end_date, revision=revision+1,
    details=((coalesce(d,'{}'::jsonb)||jsonb_build_object('releasePoint',coalesce(p_release_point,''),'endShift',p_end_shift,'releaseConfirmed',true,'programCommand',jsonb_set(cmd,'{events}',coalesce(cmd->'events','[]'::jsonb)||jsonb_build_array(event))))::text)
  WHERE id=p_id;
  RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now+1,'action','RELEASE_PROGRAM','idempotent',false);
END $$;

CREATE FUNCTION public.alrifai_vessel_program_assign(
  p_id text, p_employee_mobile text, p_start_date text, p_start_shift text, p_actor text,
  p_expected_revision integer, p_command_key text, p_replace boolean DEFAULT false, p_note text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE d jsonb; cmd jsonb; event jsonb; prior jsonb; revision_now integer; next_revision integer; previous_id text;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key,''))='' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF coalesce(p_employee_mobile,'') !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'EMPLOYEE_MOBILE_INVALID'; END IF;
  IF coalesce(p_start_shift,'') NOT IN ('D','N') THEN RAISE EXCEPTION 'SHIFT_REQUIRED'; END IF;
  SELECT details::jsonb,revision INTO d,revision_now FROM public.programs WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  cmd := coalesce(d->'programCommand','{}'::jsonb);
  prior := public.alrifai_vessel_idempotent_event(cmd,p_command_key);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now,'action','ASSIGN_ESCORT','idempotent',true); END IF;
  IF p_expected_revision IS NULL OR revision_now <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  SELECT id INTO previous_id FROM public.program_assignments WHERE program_id=p_id ORDER BY revision DESC LIMIT 1;
  IF previous_id IS NOT NULL AND NOT p_replace THEN RAISE EXCEPTION 'ASSIGNMENT_EXISTS_USE_REPLACE'; END IF;
  SELECT coalesce(max(revision),0)+1 INTO next_revision FROM public.program_assignments WHERE program_id=p_id;
  INSERT INTO public.program_assignments(id,scope_account,program_id,revision,employee_mobile,employee_person_id,start_date,start_shift,duty_started_on,released_on,predecessor_id,command_receipt,source_refs)
  VALUES('va-'||md5(p_id||':'||next_revision),'wa-01',p_id,next_revision,('+880'||substr(p_employee_mobile,2)),NULL,nullif(coalesce(p_start_date,''),'')::date,p_start_shift,NULL,NULL,previous_id,'vessel-cmd:'||md5(p_id||':'||next_revision),'[]'::jsonb);
  event := jsonb_build_object('action',CASE WHEN p_replace THEN 'REPLACE_ASSIGNMENT' ELSE 'ASSIGN_ESCORT' END,'key',p_command_key,'at',now(),'actor',p_actor,'employeeMobile',p_employee_mobile,'startDate',p_start_date,'startShift',p_start_shift,'predecessor',previous_id,'note',coalesce(p_note,''));
  UPDATE public.programs SET "escortMobile"=p_employee_mobile, shift=p_start_shift, revision=revision+1,
    details=((coalesce(d,'{}'::jsonb)||jsonb_build_object('programCommand',jsonb_set(cmd,'{events}',coalesce(cmd->'events','[]'::jsonb)||jsonb_build_array(event))))::text)
  WHERE id=p_id;
  RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now+1,'assignmentRevision',next_revision,'predecessor',previous_id,'idempotent',false);
END $$;

CREATE FUNCTION public.alrifai_vessel_program_void(
  p_id text, p_actor text, p_reason text, p_expected_revision integer, p_command_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE d jsonb; cmd jsonb; event jsonb; prior jsonb; revision_now integer; current_status text;
BEGIN
  IF NOT public.alrifai_vessel_actor_verified(p_actor) THEN RAISE EXCEPTION 'VERIFIED_ACTOR_REQUIRED'; END IF;
  IF btrim(coalesce(p_command_key,''))='' THEN RAISE EXCEPTION 'COMMAND_KEY_REQUIRED'; END IF;
  IF length(btrim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'VOID_REASON_REQUIRED'; END IF;
  SELECT details::jsonb,revision,status INTO d,revision_now,current_status FROM public.programs WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  cmd := coalesce(d->'programCommand','{}'::jsonb);
  prior := public.alrifai_vessel_idempotent_event(cmd,p_command_key);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now,'status',current_status,'idempotent',true); END IF;
  IF current_status='Voided' THEN RAISE EXCEPTION 'PROGRAM_ALREADY_VOIDED'; END IF;
  IF p_expected_revision IS NULL OR revision_now <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  event := jsonb_build_object('action','VOID_PROGRAM','key',p_command_key,'at',now(),'actor',p_actor,'reason',p_reason,'previousStatus',current_status);
  UPDATE public.programs SET status='Voided', revision=revision+1,
    details=((coalesce(d,'{}'::jsonb)||jsonb_build_object('voidReason',p_reason,'programCommand',jsonb_set(cmd,'{events}',coalesce(cmd->'events','[]'::jsonb)||jsonb_build_array(event))))::text)
  WHERE id=p_id;
  RETURN jsonb_build_object('ok',true,'id',p_id,'revision',revision_now+1,'status','Voided','idempotent',false);
END $$;

REVOKE ALL ON FUNCTION
  public.alrifai_vessel_actor_verified(text),
  public.alrifai_vessel_idempotent_event(jsonb,text),
  public.alrifai_vessel_program_add(text,text,text,text,text,text,text,text,text,text,text,text),
  public.alrifai_vessel_program_update(text,jsonb,text,integer,text,text),
  public.alrifai_vessel_program_release(text,text,text,text,text,integer,text,jsonb),
  public.alrifai_vessel_program_assign(text,text,text,text,text,integer,text,boolean,text),
  public.alrifai_vessel_program_void(text,text,text,integer,text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.alrifai_vessel_program_add(text,text,text,text,text,text,text,text,text,text,text,text),
  public.alrifai_vessel_program_update(text,jsonb,text,integer,text,text),
  public.alrifai_vessel_program_release(text,text,text,text,text,integer,text,jsonb),
  public.alrifai_vessel_program_assign(text,text,text,text,text,integer,text,boolean,text),
  public.alrifai_vessel_program_void(text,text,text,integer,text)
TO ir_review_runtime;

COMMIT;
