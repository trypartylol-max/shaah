-- Scorecard vive en su propio repo y guarda en su hoja de Google desde el 2026-11-25.
-- La tabla estaba vacía (0 filas) y sin uso. Aplicada en producción el 2026-11-25.
drop table if exists public.scorecard_events;
drop function if exists public.scorecard_events_touch();
