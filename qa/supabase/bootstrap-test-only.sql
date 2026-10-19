-- REVIEW / RUN ONLY in SHAAH-TEST:
-- https://supabase.com/dashboard/project/kpnwiwaiwnndpvtxkvva/sql/new
-- Proposed QA schema inferred from the client; NOT a production-schema export.
-- No data import, no auth user creation, no exposure of other tables.
-- Intentionally aborts if day_logs exists: inspect existing structure first.
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.day_logs') IS NOT NULL THEN
    RAISE EXCEPTION 'Abort: day_logs already exists; inspect it instead of replacing it.';
  END IF;
END $$;

CREATE TABLE public.day_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL CHECK (date IN ('settings', 'cfgbak') OR date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_select_own ON public.day_logs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY qa_insert_own ON public.day_logs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY qa_update_own ON public.day_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY qa_delete_own ON public.day_logs FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.day_logs FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.day_logs TO authenticated;
-- Composite PK provides user_id/date in DELETE identity. Verify the actual event under RLS.
ALTER TABLE public.day_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.day_logs;

COMMIT;
