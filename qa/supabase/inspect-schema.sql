-- SHAAH phase 2: metadata inspection only; NOT executed by this preparation.
-- Target the selected QA project. No application rows, auth users or tokens.
-- Do not interpret these results alone as proof of RLS or Realtime behavior.

SELECT current_database() AS database_name,
       current_user AS inspection_role;

SELECT table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'day_logs'
ORDER BY ordinal_position;

SELECT con.conname AS constraint_name,
       con.contype AS constraint_type,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS cls ON cls.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public' AND cls.relname = 'day_logs'
ORDER BY con.conname;

SELECT cls.relrowsecurity AS rls_enabled,
       cls.relforcerowsecurity AS rls_forced,
       cls.relreplident AS replica_identity
FROM pg_catalog.pg_class AS cls
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public' AND cls.relname = 'day_logs';

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename = 'day_logs'
ORDER BY policyname;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'day_logs'
ORDER BY grantee, privilege_type;

SELECT pubname, schemaname, tablename
FROM pg_catalog.pg_publication_tables
WHERE schemaname = 'public' AND tablename = 'day_logs'
ORDER BY pubname;

SELECT trg.tgname AS trigger_name,
       trg.tgenabled AS enabled,
       pg_get_triggerdef(trg.oid) AS definition
FROM pg_catalog.pg_trigger AS trg
JOIN pg_catalog.pg_class AS cls ON cls.oid = trg.tgrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public' AND cls.relname = 'day_logs'
  AND NOT trg.tgisinternal
ORDER BY trg.tgname;
