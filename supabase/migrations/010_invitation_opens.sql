-- Seguimiento de invitaciones: registra cada apertura del link (individual,
-- familiar o de un integrante). Se guarda un array de timestamps en vez de
-- una sola fecha para poder ver todas las visitas, no solo la primera.

alter table public.guests
  add column opens jsonb not null default '[]'::jsonb;
