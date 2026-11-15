-- Event Scorecard: historial de eventos musicales, sincronizado entre dispositivos.
-- Una fila por evento; cada usuario solo ve y modifica las suyas (mismo patrón que day_logs).
-- Borrado lógico (deleted_at) para que un dispositivo pueda propagar borrados a los demás.

create table public.scorecard_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint scorecard_events_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint scorecard_events_data_size check (pg_column_size(data) <= 20000)
);

comment on table public.scorecard_events is
  'Event Scorecard: una fila por evento evaluado. data = {info, ratings, notas, generalNota, date}. RLS solo propietario.';

create index scorecard_events_user_updated_idx
  on public.scorecard_events (user_id, updated_at desc);

create function public.scorecard_events_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;   -- el dueño no se puede cambiar
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger scorecard_events_touch
  before update on public.scorecard_events
  for each row execute function public.scorecard_events_touch();

alter table public.scorecard_events enable row level security;

-- Sin acceso anónimo; los usuarios autenticados solo llegan a sus filas a través de RLS.
revoke all on public.scorecard_events from anon;
revoke all on public.scorecard_events from public;
grant select, insert, update on public.scorecard_events to authenticated;
revoke execute on function public.scorecard_events_touch() from public, anon, authenticated;

create policy scorecard_events_select_own on public.scorecard_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy scorecard_events_insert_own on public.scorecard_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy scorecard_events_update_own on public.scorecard_events
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
