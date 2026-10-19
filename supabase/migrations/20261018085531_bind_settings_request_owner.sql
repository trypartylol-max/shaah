-- Bind an HTTP request to the owner captured before the SDK resolves its token.
-- The assertion is not a write target: the private writer still uses auth.uid().
create or replace function public.shaah_save_settings_v1(p_expected_revision bigint,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
begin
  if auth.uid() is null or p_data->>'owner_id' is distinct from auth.uid()::text
  then raise exception 'SHAAH_REQUEST_OWNER_MISMATCH' using errcode='42501'; end if;
  return shaah_private.save_settings_v1(p_expected_revision,p_data->'data');
end
$fn$;
notify pgrst, 'reload schema';
