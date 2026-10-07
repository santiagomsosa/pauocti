-- Acceso anticipado ("Early Bird"): hasta la hora de la fiesta la app muestra una
-- página de espera; los invitados con early_access = true pueden entrar antes.

alter table public.guests
  add column early_access boolean not null default false;
