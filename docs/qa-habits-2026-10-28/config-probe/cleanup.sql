begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
do $guard$ begin
 if obj_description(to_regclass('public.shaah_cfg_87e99cfaa044a0b9'),'pg_class') is distinct from 'shaah-isolated-config:87e99cfaa044a0b9'
 or obj_description(to_regnamespace('shaah_cfg_87e99cfaa044a0b9_private'),'pg_namespace') is distinct from 'shaah-isolated-config:87e99cfaa044a0b9'
 then raise exception 'PROBE_IDENTITY_MISMATCH'; end if;
end $guard$;
drop function public.shaah_cfg_87e99cfaa044a0b9_save_settings_v1(bigint,jsonb);
drop function public.shaah_cfg_87e99cfaa044a0b9_settings_backup_v1();
drop function public.shaah_cfg_87e99cfaa044a0b9_restore_settings_v1(bigint,bigint);
drop function shaah_cfg_87e99cfaa044a0b9_private.restore_settings_v1(bigint,bigint);
drop function shaah_cfg_87e99cfaa044a0b9_private.settings_backup_v1();
drop function shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(bigint,jsonb);
drop table shaah_cfg_87e99cfaa044a0b9_private.settings_versions;
drop schema shaah_cfg_87e99cfaa044a0b9_private;
drop table public.shaah_cfg_87e99cfaa044a0b9;
notify pgrst,'reload schema';
commit;
