-- Tabla de mesas del evento
create table public.wedding_tables (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  capacity integer not null default 10,
  created_at timestamptz default now() not null
);

-- Asignación de mesa a cada invitado
alter table public.guests add column table_id uuid references public.wedding_tables(id) on delete set null;

alter table public.wedding_tables disable row level security;
