-- Trivia de los novios: preguntas, tandas, sorteo por invitado y respuestas.
-- Ver docs/plan-trivia.md.

-- Invitados de prueba del modo ensayo (no aparecen en el ranking real)
alter table public.guests
  add column is_test boolean not null default false;

create table public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  prompt text not null,
  options jsonb not null,            -- ["Pau","Octi"] o las 4 opciones de tragos
  correct_index int not null,
  wrong_message text,                -- solo en las 2 de tragos
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now() not null,
  constraint quiz_questions_prompt_unique unique (prompt)
);

-- Tandas: horario programado + lanzamiento manual. scope 'ensayo' = tandas para el modo ensayo.
create table public.quiz_rounds (
  scope text not null default 'real' check (scope in ('real', 'ensayo')),
  number int not null,
  scheduled_at timestamptz,          -- null = sin horario (solo se libera con el botón)
  released_at timestamptz,           -- seteado por "Lanzar ahora"
  primary key (scope, number)
);

-- Sorteo por invitado (1 fila por invitado); la tanda k = slice de question_ids
create table public.quiz_attempts (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz default now() not null,
  finished_at timestamptz            -- completó todas las tandas
);

-- 1 fila por pregunta mostrada; se crea al mostrarla y se completa al responder o vencer
create table public.quiz_answers (
  id uuid default gen_random_uuid() primary key,
  guest_id uuid not null references public.guests(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  round int not null,
  shown_at timestamptz default now() not null,
  expires_at timestamptz not null,
  answered_at timestamptz,           -- en timeout se completa con expires_at
  selected_index int,                -- null = se le venció el tiempo
  is_correct boolean not null default false,
  points int not null default 0,
  constraint quiz_answers_unique unique (guest_id, question_id)
);

create index quiz_answers_guest_id_idx on public.quiz_answers(guest_id);

-- Ranking agregado en SQL (evita el límite de 1000 filas de PostgREST).
-- Solo cuenta preguntas ya respondidas o vencidas.
create view public.quiz_ranking as
select a.guest_id,
       g.name,
       g.is_test,
       coalesce(sum(a.points), 0)::int                                              as points,
       count(*) filter (where a.is_correct)::int                                    as correct,
       count(*)::int                                                                as answered,
       coalesce(sum(extract(epoch from (a.answered_at - a.shown_at))), 0)::float8   as total_seconds,
       max(a.answered_at)                                                           as last_answer_at
from public.quiz_answers a
join public.guests g on g.id = a.guest_id
where a.answered_at is not null
group by a.guest_id, g.name, g.is_test;

-- Estas tablas hay un premio de por medio (quiz_questions guarda la respuesta correcta): RLS
-- activado y sin políticas, y sin permisos para anon/authenticated. La app accede solo con
-- service_role (que ignora RLS), así que nadie puede leerlas ni escribirlas con la clave anónima.
alter table public.quiz_questions enable row level security;
alter table public.quiz_rounds    enable row level security;
alter table public.quiz_attempts  enable row level security;
alter table public.quiz_answers   enable row level security;

revoke all on public.quiz_questions, public.quiz_rounds, public.quiz_attempts, public.quiz_answers,
              public.quiz_ranking
  from anon, authenticated;

-- Tandas reales: venue_datetime + 1 h / + 2 h 30 / + 4 h. Si venue_datetime todavía no está
-- cargado quedan en null y el admin las completa. Tandas de ensayo: sin horario.
insert into public.quiz_rounds (scope, number, scheduled_at)
select 'real', r.number,
       (select nullif(value, '')::timestamptz from public.settings where key = 'venue_datetime') + r.after
from (values (1, interval '1 hour'), (2, interval '2 hours 30 minutes'), (3, interval '4 hours')) as r(number, after)
on conflict do nothing;

insert into public.quiz_rounds (scope, number)
select 'ensayo', n from generate_series(1, 3) as n
on conflict do nothing;

-- Banco de preguntas (ON CONFLICT evita duplicados si se corre más de una vez)
insert into public.quiz_questions (prompt, options, correct_index, wrong_message, sort_order) values
  ('¿Quién necesita más tiempo para estar listo antes de salir?', '["Pau", "Octi"]'::jsonb, 1, null, 10),
  ('En esta pareja, ¿quién se luce más en la cocina?', '["Pau", "Octi"]'::jsonb, 1, null, 20),
  ('¿Quién tiene más paciencia?', '["Pau", "Octi"]'::jsonb, 0, null, 30),
  ('¿Quién habla más mientras duerme?', '["Pau", "Octi"]'::jsonb, 1, null, 40),
  ('Si pasan muchas horas sin comer, ¿quién se pone de peor humor?', '["Pau", "Octi"]'::jsonb, 0, null, 50),
  ('¿Quién tiene peor humor cuando tiene sueño?', '["Pau", "Octi"]'::jsonb, 1, null, 60),
  ('¿Quién es peor ganador y se encarga de que el otro lo sepa?', '["Pau", "Octi"]'::jsonb, 1, null, 70),
  ('¿Quién tiene más chances de olvidarse de una fecha importante?', '["Pau", "Octi"]'::jsonb, 1, null, 80),
  ('¿Quién tiene más probabilidades de perder la billetera en cualquier momento?', '["Pau", "Octi"]'::jsonb, 0, null, 90),
  ('Ponen una película en el sillón… ¿quién se duerme primero?', '["Pau", "Octi"]'::jsonb, 0, null, 100),
  ('Si la casa fuera un desastre, ¿quién sería el principal sospechoso?', '["Pau", "Octi"]'::jsonb, 0, null, 110),
  ('En una discusión, ¿quién tiene más chances de ganar?', '["Pau", "Octi"]'::jsonb, 0, null, 120),
  ('En un juego, ¿quién sería capaz de hacer un poquito de trampa para ganar?', '["Pau", "Octi"]'::jsonb, 1, null, 130),
  ('Cuando hay un juego de por medio, ¿quién se pone más competitivo?', '["Pau", "Octi"]'::jsonb, 1, null, 140),
  ('Antes de salir de vacaciones, ¿quién se estresa más?', '["Pau", "Octi"]'::jsonb, 1, null, 150),
  ('Si hay que preparar las valijas, ¿quién las arma mejor?', '["Pau", "Octi"]'::jsonb, 1, null, 160),
  ('La barra ya está lista: ¿qué trago pediría Octi?', '["Negroni", "Old Fashioned", "Fernet con coca", "Gin tonic"]'::jsonb, 1, '¡Perdiste! Pedite uno en la barra 🍸', 170),
  ('¿Cuál es el cóctel favorito de Pau?', '["Campari con naranja", "Mojito", "Aperol Spritz", "Gin tonic"]'::jsonb, 2, '¡Perdiste! Pedite uno en la barra 🍸', 180),
  ('A la noche… ¿quién se roba el acolchado?', '["Pau", "Octi"]'::jsonb, 0, null, 190),
  ('Para organizar las próximas vacaciones, ¿quién toma la iniciativa?', '["Pau", "Octi"]'::jsonb, 0, null, 200),
  ('¿Quién hace más compras impulsivas?', '["Pau", "Octi"]'::jsonb, 1, null, 210),
  ('En una fiesta llena de gente, ¿quién es más tímido al principio?', '["Pau", "Octi"]'::jsonb, 0, null, 220),
  ('¿Quién se emociona hasta las lágrimas mirando una película de Disney?', '["Pau", "Octi"]'::jsonb, 1, null, 230),
  ('Entre los dos, ¿quién pasa más tiempo leyendo?', '["Pau", "Octi"]'::jsonb, 1, null, 240),
  ('Si abren los placares y comparan la cantidad de ropa, ¿quién gana?', '["Pau", "Octi"]'::jsonb, 0, null, 250),
  ('¿A quién le toca resfriarse más seguido?', '["Pau", "Octi"]'::jsonb, 1, null, 260),
  ('Hay que tomar una decisión sencilla… ¿quién le da más vueltas al asunto?', '["Pau", "Octi"]'::jsonb, 1, null, 270),
  ('Arranca una buena ronda de chismes: ¿quién se engancha más?', '["Pau", "Octi"]'::jsonb, 1, null, 280),
  ('¿A quién le agarran más antojos?', '["Pau", "Octi"]'::jsonb, 0, null, 290),
  ('Son las tres de la mañana y sigue habiendo series para ver. ¿Quién sigue despierto?', '["Pau", "Octi"]'::jsonb, 1, null, 300),
  ('Quiso arreglar algo y terminó rompiéndolo más. ¿A quién le podría pasar?', '["Pau", "Octi"]'::jsonb, 1, null, 310),
  ('¿Quién toma el mate más caliente?', '["Pau", "Octi"]'::jsonb, 1, null, 320),
  ('Si hay que guardar una sorpresa, ¿quién tiene más chances de mandarse al frente?', '["Pau", "Octi"]'::jsonb, 1, null, 330),
  ('¿Quién va dejando vasos por toda la casa como si fueran parte de la decoración?', '["Pau", "Octi"]'::jsonb, 0, null, 340),
  ('Algo quedó en el fuego y alguien se olvidó. ¿Quién sería el sospechoso principal?', '["Pau", "Octi"]'::jsonb, 1, null, 350),
  ('Cuando llega la comida, ¿quién mira el plato del otro y piensa que tendría que haber pedido lo mismo?', '["Pau", "Octi"]'::jsonb, 1, null, 360),
  ('A la hora de dormir cómodo, ¿quién necesita un arsenal de almohadas?', '["Pau", "Octi"]'::jsonb, 1, null, 370),
  ('Ya están por salir y alguien decide cambiarse de ropa a último momento. ¿Quién es?', '["Pau", "Octi"]'::jsonb, 1, null, 380),
  ('¿Quién suele olvidarse dónde dejó las cosas?', '["Pau", "Octi"]'::jsonb, 0, null, 390),
  ('En el restaurante, ¿quién tiene más chances de quedarse charlando con el mozo?', '["Pau", "Octi"]'::jsonb, 1, null, 400),
  ('¿A quién no le gusta comer picante?', '["Pau", "Octi"]'::jsonb, 0, null, 410)
on conflict (prompt) do nothing;
