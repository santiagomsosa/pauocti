-- Precarga de datos de +1: permite al admin cargar de antemano nombre/contacto
-- de los acompañantes esperados, para que el formulario de RSVP venga completado

alter table public.guests
  add column plus_ones_preload jsonb not null default '[]'::jsonb;
