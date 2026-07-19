-- Invitaciones familiares: el invitado es una familia con N integrantes.
-- 'individual' = titular + acompañantes opcionales (comportamiento previo).
-- 'family' = contenedor (la familia) cuyos integrantes son los rows hijos.

alter table public.guests
  add column invitation_type text not null default 'individual';

alter table public.guests
  add constraint guests_invitation_type_check
    check (invitation_type in ('individual', 'family'));
