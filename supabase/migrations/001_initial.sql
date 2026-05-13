-- Tabla de invitados
create table public.guests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null,
  created_at timestamptz default now() not null,
  constraint guests_code_unique unique (code)
);

-- Tabla de retos fotográficos
create table public.challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  emoji text not null default '📸',
  created_at timestamptz default now() not null
);

-- Tabla de fotos
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  guest_id uuid not null references public.guests(id) on delete cascade,
  guest_name text not null,
  url text not null,
  storage_path text not null,
  challenge_id uuid references public.challenges(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Tabla del muro de mensajes
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  guest_id uuid not null references public.guests(id) on delete cascade,
  guest_name text not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- Tabla de pedidos de música
create table public.music_requests (
  id uuid default gen_random_uuid() primary key,
  guest_id uuid not null references public.guests(id) on delete cascade,
  guest_name text not null,
  song_name text not null,
  artist text,
  created_at timestamptz default now() not null
);

-- Índices para performance
create index photos_challenge_id_idx on public.photos(challenge_id);
create index photos_created_at_idx on public.photos(created_at desc);
create index messages_created_at_idx on public.messages(created_at desc);
create index music_requests_created_at_idx on public.music_requests(created_at desc);

-- Deshabilitar RLS (usamos service role key en el server, no hay acceso directo del cliente a la DB)
alter table public.guests disable row level security;
alter table public.challenges disable row level security;
alter table public.photos disable row level security;
alter table public.messages disable row level security;
alter table public.music_requests disable row level security;
