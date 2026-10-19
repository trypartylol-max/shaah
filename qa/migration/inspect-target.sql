-- Read-only metadata preflight. No user rows, Auth accounts, JWTs or keys.
-- The caller must first verify the intended project ID with get_project.
select jsonb_build_object(
 'server_version',current_setting('server_version'),
 'day_logs_exists',to_regclass('public.day_logs') is not null,
 'rls',(select relrowsecurity from pg_class where oid=to_regclass('public.day_logs')),
 'columns',(select jsonb_agg(jsonb_build_object('name',attname,'type',format_type(atttypid,atttypmod),'not_null',attnotnull) order by attnum)
   from pg_attribute where attrelid=to_regclass('public.day_logs') and attnum>0 and not attisdropped),
 'constraints',(select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))) from pg_constraint where conrelid=to_regclass('public.day_logs')),
 'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public' and tablename='day_logs'),
 'triggers',(select jsonb_agg(pg_get_triggerdef(oid)) from pg_trigger where tgrelid=to_regclass('public.day_logs') and not tgisinternal),
 'grants',(select jsonb_agg(jsonb_build_object('role',grantee,'privilege',privilege_type)) from information_schema.role_table_grants where table_schema='public' and table_name='day_logs'),
 'api_schema_settings',(select jsonb_agg(setting) from pg_db_role_setting s cross join lateral unnest(s.setconfig) setting
   where split_part(setting,'=',1) in ('pgrst.db_schemas','pgrst.db_extra_search_path')),
 'private_schema_exists',to_regnamespace('shaah_private') is not null,
 'recovery_checkpoint_schema_exists',to_regnamespace('shaah_recovery') is not null,
 'settings_rpcs',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'security_definer',p.prosecdef,'config',p.proconfig))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('shaah_save_settings_v1','shaah_settings_backup_v1','shaah_restore_settings_v1'))
) as metadata;
