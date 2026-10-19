-- SHAAH-TEST ONLY: kpnwiwaiwnndpvtxkvva. Never run against another project.
-- Real database RLS tests with simulated JWT claims, NOT an Auth login test.
-- Creates only fresh UUIDs and .invalid users, no passwords, sessions or emails.
-- Never reads pre-existing application rows or auth user metadata.
-- Everything is rolled back. Do not remove BEGIN / ROLLBACK.
BEGIN;
-- HISTORICAL ONLY. Current workflow requires Auth Admin API, never Auth SQL.
-- This guard is inside the transaction so later statements cannot run even
-- when a SQL client continues after errors. Keep the file as past evidence.
DO $disabled$ BEGIN RAISE EXCEPTION 'HISTORICAL_AUTH_SQL_DISABLED_USE_AUTH_ADMIN_API'; END $disabled$;

DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'QA_ABORT_UNREVIEWED_AUTH_TRIGGER';
  END IF;
  PERFORM set_config('shaah.qa.a', a::text, true);
  PERFORM set_config('shaah.qa.b', b::text, true);
  INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
    (a, 'rls-a-' || a || '@shaah.invalid', '{"shaah_qa":true}'::jsonb),
    (b, 'rls-b-' || b || '@shaah.invalid', '{"shaah_qa":true}'::jsonb);
  INSERT INTO public.day_logs (user_id,date,data) VALUES
    (a,'2098-01-01','{"_note":"QA A rollback fixture"}'::jsonb),
    (b,'2098-01-01','{"_note":"QA B rollback fixture"}'::jsonb);
  PERFORM set_config('request.jwt.claim.sub', a::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text, true);
END $$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE a uuid := current_setting('shaah.qa.a')::uuid;
        b uuid := current_setting('shaah.qa.b')::uuid;
        n integer;
BEGIN
  IF current_user <> 'authenticated' OR auth.uid() <> a THEN RAISE EXCEPTION 'QA_ROLE_NOT_APPLIED'; END IF;
  SELECT count(*) INTO n FROM public.day_logs WHERE user_id=a AND date='2098-01-01';
  IF n <> 1 THEN RAISE EXCEPTION 'QA_OWN_SELECT_FAILED'; END IF;
  SELECT count(*) INTO n FROM public.day_logs WHERE user_id=b AND date='2098-01-01';
  IF n <> 0 THEN RAISE EXCEPTION 'QA_CROSS_SELECT_LEAK'; END IF;

  INSERT INTO public.day_logs(user_id,date,data) VALUES(a,'2098-01-02','{"_note":"QA inserted"}');
  UPDATE public.day_logs SET data='{"_note":"QA updated"}' WHERE user_id=a AND date='2098-01-02';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'QA_OWN_UPDATE_FAILED'; END IF;
  IF (SELECT data->>'_note' FROM public.day_logs WHERE user_id=a AND date='2098-01-02') <> 'QA updated' THEN
    RAISE EXCEPTION 'QA_OWN_UPDATE_NOT_PERSISTED';
  END IF;

  BEGIN
    INSERT INTO public.day_logs(user_id,date,data) VALUES(b,'2098-01-02','{"_note":"QA cross insert"}');
    RAISE EXCEPTION 'QA_CROSS_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.day_logs SET data='{"_note":"QA cross update"}' WHERE user_id=b AND date='2098-01-01';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'QA_CROSS_UPDATE_ALLOWED'; END IF;
  DELETE FROM public.day_logs WHERE user_id=b AND date='2098-01-01';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'QA_CROSS_DELETE_ALLOWED'; END IF;

  BEGIN
    UPDATE public.day_logs SET user_id=b WHERE user_id=a AND date='2098-01-02';
    RAISE EXCEPTION 'QA_OWNER_TRANSFER_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.day_logs(user_id,date,data) VALUES(a,'2098-01-02','{"_note":"QA upserted"}')
    ON CONFLICT(user_id,date) DO UPDATE SET data=EXCLUDED.data;
  IF (SELECT data->>'_note' FROM public.day_logs WHERE user_id=a AND date='2098-01-02') <> 'QA upserted' THEN
    RAISE EXCEPTION 'QA_OWN_UPSERT_FAILED';
  END IF;
  -- Same JSONB equality used by the client CAS. A stale snapshot must match
  -- zero rows; a freshly read snapshot can update exactly the owner's row.
  UPDATE public.day_logs SET data='{"_note":"QA concurrent confirmation"}'
    WHERE user_id=a AND date='2098-01-02';
  UPDATE public.day_logs SET data='{"_note":"QA stale overwrite"}'
    WHERE user_id=a AND date='2098-01-02' AND data='{"_note":"QA upserted"}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'QA_STALE_CAS_ALLOWED'; END IF;
  UPDATE public.day_logs SET data='{"_note":"QA fresh conditional update"}'
    WHERE user_id=a AND date='2098-01-02' AND data='{"_note":"QA concurrent confirmation"}'::jsonb;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'QA_FRESH_CAS_REJECTED'; END IF;
  DELETE FROM public.day_logs WHERE user_id=a AND date='2098-01-02';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'QA_OWN_DELETE_FAILED'; END IF;

  PERFORM set_config('request.jwt.claim.sub', b::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',b,'role','authenticated')::text, true);
  IF auth.uid() <> b THEN RAISE EXCEPTION 'QA_SECOND_OWNER_NOT_APPLIED'; END IF;
  IF (SELECT data->>'_note' FROM public.day_logs WHERE user_id=b AND date='2098-01-01') <> 'QA B rollback fixture' THEN
    RAISE EXCEPTION 'QA_SECOND_OWNER_CHANGED';
  END IF;
  SELECT count(*) INTO n FROM public.day_logs WHERE user_id=a AND date='2098-01-01';
  IF n <> 0 THEN RAISE EXCEPTION 'QA_REVERSE_CROSS_SELECT_LEAK'; END IF;

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT count(*) INTO n FROM public.day_logs WHERE user_id IN(a,b) AND date='2098-01-01';
  IF n <> 0 THEN RAISE EXCEPTION 'QA_NULL_UID_SELECT_LEAK'; END IF;
  BEGIN
    INSERT INTO public.day_logs(user_id,date,data) VALUES(a,'2098-01-03','{}');
    RAISE EXCEPTION 'QA_NULL_UID_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.day_logs WHERE user_id=current_setting('shaah.qa.a')::uuid AND date='2098-01-01';
    RAISE EXCEPTION 'QA_ANONYMOUS_TABLE_ACCESS_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SELECT jsonb_build_object(
  'scope','SHAAH-TEST database policies; simulated claims; transaction rollback',
  'status','passed',
  'checks',jsonb_build_array('own_select','cross_select_denied','own_insert','own_update',
    'cross_insert_denied','cross_update_denied','cross_delete_denied','owner_transfer_denied',
    'own_upsert','stale_jsonb_cas_denied','fresh_jsonb_cas_accepted','own_delete','second_owner_unchanged','reverse_cross_select_denied',
    'null_uid_select_denied','null_uid_insert_denied','anonymous_table_access_denied'),
  'authenticated_api_test',false,
  'preexisting_user_content_read',false,
  'fixture_users_have_passwords',false
) AS qa_rls_result;
ROLLBACK;
