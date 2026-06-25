-- Invitaciones online: RSVP, +1 y configuración del evento

alter table public.guests
  add column email text,
  add column invite_token text,
  add column max_plus_ones int not null default 0,
  add column parent_guest_id uuid references public.guests(id) on delete cascade,
  add column is_active boolean not null default true,
  add column rsvp_status text not null default 'pending',
  add column dietary_restrictions text,
  add column rsvp_submitted_at timestamptz;

alter table public.guests
  add constraint guests_rsvp_status_check check (rsvp_status in ('pending', 'attending', 'declined'));

alter table public.guests
  add constraint guests_invite_token_unique unique (invite_token);

create index guests_parent_guest_id_idx on public.guests(parent_guest_id);

-- Backfill de invite_token para invitados ya existentes
update public.guests
set invite_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where invite_token is null;

-- Configuración global del evento (fecha, lugar, mapa, etc.)
create table public.settings (
  key text primary key,
  value text
);

alter table public.settings disable row level security;
