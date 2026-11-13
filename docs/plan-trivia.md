# Plan: Trivia de los novios ("¿Quién es más…? Pau vs Octi")

> **Estado:** implementado, mergeado con `origin/main` y deployado en producción (`pauocti.vercel.app`) el 12/11/2026. Migración `013_quiz.sql` aplicada a mano en la base de producción (sin `db push`: la 011 no está registrada en el historial remoto). Pendientes: ensayo con Pau, Flor y Octi, asignar dueño a las fotos y ensayo general antes del 14/11.

## Estado de la implementación

| Fase | Estado |
|---|---|
| 0. Prototipo navegable (sección A) | **No se hizo**: el modo ensayo (sección B) corre sobre la app real y lo reemplaza |
| 1. Seguridad (cookies firmadas) | Hecho: `src/lib/session-token.ts`, `auth.ts`, `proxy.ts`, 9 tests |
| 2. Base | Hecho: `013_quiz.sql`, `supabase/config.toml` + `seed.sql`, `npm run dev:local` |
| 3. Lógica y API | Hecho: `quiz.ts` (28 tests), `quiz-server.ts`, `/api/quiz/*` |
| 4. UI invitado | Hecho: pestaña con punto rojo y toast, `/trivia`, `/trivia/ranking`, card en inicio |
| 5. Admin | Hecho: pestaña Trivia con tandas, modo, configuración, ranking, preguntas, resets y panel Ensayo |
| 6. Pruebas | Hecho: `npm run quiz:sim` (120 invitados, ~9.600 verificaciones, 0 fallas) y recorrido en el navegador |
| 7. Modo pantalla | No se hizo (opcional) |
| 8. Ensayo general en producción | En curso (ensayo con invitados de prueba en producción) |

**Cambios respecto del diseño original**

- **Migración 012** (la 011 ya la usa el acceso anticipado).
- **Vista `quiz_ranking`**: solo cuenta preguntas ya respondidas o vencidas (las filas de preguntas abiertas no suman), y expone `is_test`.
- **RLS activado** en las tablas del quiz, sin políticas, y sin permisos para `anon` y `authenticated`: `quiz_questions` guarda la respuesta correcta y hay un premio en juego. La app usa solo `service_role`, que ignora RLS.
- **Configuración del quiz** en un tipo propio (`QuizConfig`, claves `quiz_*` de `settings`), sin tocar `Settings`, así la pestaña Config no las pisa.
- **Timeout**: el cliente manda `selectedIndex: null` al llegar a cero; el server solo lo acepta si el tiempo venció de verdad.
- **Jugadores ficticios del ensayo** (`BOTxx`): se completan al consultar (con un límite de una vez cada 3 s), sin cron.
- **Invitados de prueba** (`is_test`) excluidos del listado de invitados, del envío de invitaciones y de los recordatorios.
- **Migración 007**: `on conflict (title)` pasó a `on conflict do nothing`, porque la restricción única recién llega con la 009 y en una base limpia no aplicaba. En producción no cambia nada, ya está aplicada.
- **Supabase local**: `supabase start` tiene que incluir `gotrue` (si no, `supabase status` no imprime las claves) y `supabase/seed.sql` da permisos a `service_role`, que las versiones nuevas ya no dan por defecto. Producción sí los tiene.

**Cómo correrlo en local**

```bash
supabase start -x realtime,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,studio,postgres-meta
npm run db:local-env      # genera .env.supabase-local (admin: admin-local)
npm run dev:local -- -p 3100
npm run quiz:sim -- 120   # simulador de invitados (se niega a correr si no es localhost)
npm test
```

---

## Objetivo

El día del casamiento cada invitado juega una trivia sobre los novios desde la app, **en tandas que se van liberando durante la noche**. Cada respuesta correcta suma puntos, hay un solo intento por pregunta, se ve el ranking en vivo y el primero gana un premio. Las tandas se abren solas a la hora programada, con un botón en el admin para lanzarlas antes.

Preguntas fuente: `.refs/trivia y prendas casamiento.docx` (sección **TRIVIA 💍**, 41 preguntas). Las **PRENDAS 📸** del mismo documento quedan fuera: no reemplazan a los desafíos actuales.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Estructura | **3 tandas de 4 preguntas** = 12 por invitado, sorteadas del banco de 41 |
| Apertura de tandas | **Horario programado + botón "Lanzar ahora"** en el admin |
| Horarios | **Confirmados:** +1 h, +2 h 30 y +4 h desde el inicio de la fiesta (`venue_datetime`) |
| Tanda perdida | **Queda disponible:** las tandas abiertas se acumulan hasta que se finaliza la trivia |
| Mensaje entre tandas | Al terminar cada tanda menos la última: **"Estate atento porque van a aparecer más durante la noche"** |
| Tiempo por pregunta | **20 s** |
| Puntaje | **Por velocidad:** correcta = 100 + bonus de hasta 50 |
| Respuesta correcta | Se muestra **al instante**, con foto de los novios contentos o tristes |
| Quién juega | **Cada integrante con su propio código** (también en las invitaciones familiares) |
| Ranking | Incluye a todos los que respondieron al menos una; quien no completó las tandas ya liberadas aparece con **"(no terminó)"** |
| Navegación | **Nueva pestaña "Trivia"** en la barra de abajo |
| Tragos (2 preguntas) | Multiple choice con distractores confirmados. **Solo en estas 2**, si se equivoca: **"¡Perdiste! Pedite uno en la barra"** |
| Prendas | **No** se tocan los desafíos actuales |

## Estado actual del proyecto (contexto)

- **Stack:** Next.js 16 (app router, `src/proxy.ts`), Supabase con service-role desde el server (RLS deshabilitado), sin cliente Supabase en el browser.
- **Sesiones:** cookies sin firmar (`src/lib/auth.ts`):
  - `guest_session` = base64 de `{ guestId, guestName }`. Cualquiera que conozca un `guestId` puede fabricarse la cookie de otro invitado (los `guest_id` se exponen en `/api/photos`).
  - `admin_session`: **alcanza con que la cookie exista**, sin importar su valor. Cualquier invitado podría crearla a mano y entrar al admin, por ejemplo para resetear la trivia o lanzar tandas antes de tiempo.
- **Patrón de features:** página cliente en `src/app/(app)/<feature>/page.tsx` + route handler en `src/app/api/<feature>/route.ts` + pestaña en `src/app/admin/page.tsx`. Configuración global en la tabla `settings` (`src/lib/settings.ts`), con fechas guardadas en ISO.
- **Horarios:** `venue_datetime` es el inicio de la fiesta. En la UI se muestran siempre en hora de Argentina (`America/Argentina/Buenos_Aires`, igual que `InvitationView`).
- **App cerrada hasta la fiesta** (#18): `src/app/(app)/layout.tsx` muestra `WaitingRoom` hasta `venue_datetime`, salvo a los invitados con `guests.early_access` (migración `011_early_access.sql`). La página de espera ya anuncia la Trivia. En desarrollo se puede forzar la apertura con `APP_OPENS_AT_OVERRIDE`.
- **Login con link:** `/?code=XXXX` completa el código solo, así que un link basta para entrar como un invitado desde otro celular.
- **Tests:** el proyecto no tiene ninguno. Node 25 ejecuta TypeScript directo, así que `node --test` sirve sin agregar dependencias.

---

## Diseño del juego

### 1. Tandas

- La trivia tiene **3 tandas de 4 preguntas**. La cantidad de tandas y de preguntas por tanda se configura desde el admin.
- Cada tanda tiene un **horario programado** (`scheduled_at`) y puede **lanzarse antes** desde el admin (`released_at`). Una tanda está liberada desde `min(scheduled_at, released_at)`.
- **Atrasar** una tanda = editar su horario (solo si todavía no se liberó).
- Se liberan **en orden**: la tanda 2 nunca se abre antes que la 1, aunque los horarios estén mal cargados. Lanzar la 2 con el botón libera también la 1 si seguía cerrada.
- **Horarios (confirmados)**, relativos a `venue_datetime` (inicio de la fiesta): tanda 1 a +1 h, tanda 2 a +2 h 30 y tanda 3 a +4 h. Se guardan como horario explícito en cada tanda, así que se pueden ajustar una por una desde el admin.
- **Tandas acumulables:** si alguien se pierde la 1 y entra cuando ya salió la 2, juega la 1 y sigue con la 2 de corrido. Todo queda disponible hasta que se **finaliza** la trivia.

### 2. Sorteo de preguntas

- Al empezar la primera tanda se sortean **12 preguntas** del banco y se guardan en orden. La tanda *k* son las posiciones `4(k-1)…4k-1`, así que no se repite ninguna entre tandas.
- Dos invitados de la misma mesa comparten en promedio ~1 pregunta por tanda, así que soplarse las respuestas sirve poco.
- Las 2 de tragos pueden caer en cualquier tanda.

### 3. Respuestas

- **39 preguntas binarias:** dos botones grandes, **Pau** (izquierda) y **Octi** (derecha), siempre en ese orden.
- **2 preguntas de tragos, con 4 opciones (confirmadas):**
  - *¿Qué trago pediría Octi?* → **Old Fashioned**, Negroni, Fernet con coca, Gin tonic
  - *¿Cuál es el cóctel favorito de Pau?* → **Aperol Spritz**, Campari con naranja, Mojito, Gin tonic

### 4. Timer y puntaje por velocidad

- 20 s por pregunta. El reloj lo controla el **server**: al mostrar la pregunta se guardan `shown_at` y `expires_at`.
- **Correcta:** `100 + round(50 × tiempo_restante / tiempo_total)`. **Incorrecta o fuera de tiempo:** 0.
- Hay 2 s de gracia por latencia de red.
- Si alguien refresca o cierra la app, al volver ve **la misma pregunta con el tiempo que le queda**. Si ya venció, cuenta como incorrecta. No se puede espiar una pregunta y saltearla.
- **Desempate:** puntos ↓, correctas ↓, tiempo total ↑, hora de la última respuesta ↑.

### 5. Un solo intento

- Constraint `unique (guest_id, question_id)` y un update atómico `where answered_at is null`. Ni un doble click ni dos pestañas pueden responder dos veces.
- La respuesta correcta **nunca** viaja al cliente antes de responder.

### 6. Feedback con fotos de los novios 📸

Después de cada respuesta aparece una pantalla con la foto de los novios:

| Resultado | Foto | Texto |
|---|---|---|
| Correcta | `novios-contentos.jpg` | "¡Correcto! +132 pts" |
| Incorrecta | `novios-tristes.jpg` | "¡Nooo! Era **Octi** 😅" |
| Incorrecta en una pregunta de tragos | `novios-tristes.jpg` | "¡Perdiste! Pedite uno en la barra 🍸" (campo `wrong_message` de la pregunta) |
| Se acabó el tiempo | `novios-tristes.jpg` | "¡Se te acabó el tiempo! Era **Pau**" |

- Fotos en `public/trivia/` (`alegre-N.jpg` / `triste-N.jpg`, 800 px). La lista y la regla de elección están en `src/lib/quiz-photos.ts`: si la respuesta correcta era Pau u Octi, se muestra la foto de esa persona (contenta si acertó, triste si erró o se acabó el tiempo); en tragos, al azar entre las del mismo ánimo. Para sumar una foto: copiarla y agregar una línea a `QUIZ_PHOTOS`.
- El mensaje de tragos se guarda en `wrong_message` **solo** en esas 2 preguntas del seed; el resto usa el texto por defecto ("¡Nooo! Era…").
- Se **precargan** al empezar la tanda, para que no haya demora entre responder y ver la foto.
- La foto entra con una animación corta (`motion`: escala + leve rotación) y la pantalla avanza a la siguiente pregunta con un botón "Siguiente".

### 7. Fin de tanda: "Estate atento…"

Al responder la última pregunta de una tanda aparece un **resumen de tanda**:

- **Tandas 1 y 2:**
  > **¡Terminaste la tanda 1!** 🎉
  > 3 de 4 correctas · +412 pts · vas **12°**
  >
  > **Estate atento porque van a aparecer más durante la noche 👀**
  >
  > [Ver ranking]
- **Tanda 3 (última):** resultado final (puntaje total, correctas sobre 12, posición) + "Ver ranking". Sin el mensaje.
- Si la siguiente tanda **ya está liberada** (porque la persona venía atrasada), el resumen muestra "¡Ya salió la tanda 2!" con el botón **"Seguir jugando"** en lugar del mensaje de espera.
- **No se muestra el horario** de la próxima tanda: puede moverse con el botón y la sorpresa es parte del juego.

### 8. Avisar que salió una tanda nueva

Como las tandas aparecen durante la fiesta, el invitado tiene que enterarse:

- **Punto rojo en la pestaña Trivia** de la barra de abajo cuando hay preguntas liberadas sin responder. La navbar consulta un endpoint liviano (`GET /api/quiz/status`) cada ~60 s y al volver a la pestaña (`visibilitychange`).
- **Toast** "¡Salió una nueva tanda de la trivia! 🎉" (con `sonner`, que ya está) la primera vez que se detecta una tanda nueva, en cualquier sección de la app.
- **Card destacada en `/inicio`**: "¡Nueva tanda de la trivia! Jugar →".
- **Anuncio del DJ o animador** al lanzar cada tanda (es lo que más funciona en un salón). La pestaña admin muestra el texto sugerido para leer.
- Las notificaciones push quedan fuera: en iOS requieren instalar la web como app, lo que no se justifica para una noche.

### 9. Estados del juego

`quiz_mode` en `settings`:

| Modo | Comportamiento |
|---|---|
| `auto` (default) | Las tandas se liberan según sus horarios y el botón "Lanzar ahora" |
| `closed` | Fuerza cerrado (nada disponible, aunque haya tandas liberadas) |
| `finished` | Fin del juego: no se responde más, ranking congelado + podio |

Estado global, calculado en cada request con funciones puras (sin cron):

- `closed`: ninguna tanda liberada todavía. El invitado ve una **cuenta regresiva hasta la tanda 1**, que es la única hora que se muestra. Al llegar a cero vuelve a consultar el estado y aparece "¡Empezar!" sin recargar.
- `open`: hay ≥1 tanda liberada. Por invitado: **jugando**, **esperando la próxima tanda** (completó todas las liberadas) o **terminado** (completó las 3).
- `finished`: por modo `finished` o por `quiz_closes_at` (cierre automático opcional).

### 10. Ranking

- `/trivia/ranking`: **top 10** con medallas 🥇🥈🥉 y tu fila **fija abajo** ("Estás 23° de 87 · 840 pts"). Se actualiza con polling cada ~10 s.
- Muestra en qué tanda va el juego ("Tanda 2 de 3").
- Incluye a todos los que respondieron al menos una pregunta. Aparece **"(no terminó)"** quien todavía tiene preguntas sin responder **de las tandas ya liberadas**. Al finalizar, aplica a quien no respondió las 12.
- Con estado `finished` se congela y muestra el podio.
- **Opcional, modo pantalla** `/admin/trivia/pantalla`: podio grande para proyectar entre tandas y al anunciar el premio.

---

## Modelo de datos — migración `013_quiz.sql`

```sql
create table public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  prompt text not null,
  options jsonb not null,            -- ["Pau","Octi"] o las 4 opciones de tragos
  correct_index int not null,
  wrong_message text,                -- solo en las 2 de tragos: "¡Perdiste! Pedite uno en la barra 🍸"
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now() not null,
  constraint quiz_questions_prompt_unique unique (prompt)
);

-- Tandas: horario programado + lanzamiento manual
create table public.quiz_rounds (
  scope text not null default 'real' check (scope in ('real', 'ensayo')),  -- ver "Modo ensayo"
  number int not null,               -- 1, 2, 3
  scheduled_at timestamptz,          -- null = sin horario (solo se libera con el botón)
  released_at timestamptz,           -- seteado por "Lanzar ahora"
  primary key (scope, number)
);

-- Invitados de prueba del modo ensayo (no aparecen en el ranking real)
alter table public.guests
  add column is_test boolean not null default false;

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

-- Ranking agregado en SQL (evita el límite de 1000 filas de PostgREST)
create view public.quiz_ranking as
select a.guest_id,
       g.name,
       g.is_test,
       sum(a.points)                                                         as points,
       count(*) filter (where a.is_correct)                                  as correct,
       count(*)                                                              as answered,
       sum(extract(epoch from (coalesce(a.answered_at, a.expires_at) - a.shown_at))) as total_seconds,
       max(a.answered_at)                                                    as last_answer_at
from public.quiz_answers a
join public.guests g on g.id = a.guest_id
group by a.guest_id, g.name, g.is_test;

alter table public.quiz_questions disable row level security;
alter table public.quiz_rounds    disable row level security;
alter table public.quiz_attempts  disable row level security;
alter table public.quiz_answers   disable row level security;

-- Seed: 3 tandas con horario = venue_datetime + 1h / +2h30 / +4h (si venue_datetime
-- todavía no está cargado, quedan en null y el admin pide completarlos) + las 41 preguntas
-- (on conflict do nothing, igual que 007)
```

- "(no terminó)" se calcula en el server: `answered < preguntas de las tandas liberadas`.
- En el seed se corrigen tildes y typos del docx ("Quien" → "Quién", "mas" → "más", el "— Octi" que falta en la de humor con sueño).
- **Settings** (`KEYS` en `src/lib/settings.ts` y `Settings` en `src/types/index.ts`): `quiz_mode`, `quiz_test_mode`, `quiz_closes_at`, `quiz_round_count` (3), `quiz_questions_per_round` (4), `quiz_seconds_per_question` (20).
- **Tipos:** `QuizQuestion` (versión pública sin `correct_index`), `QuizRound`, `QuizStatus`, `QuizState`, `QuizAnswerResult`, `QuizRankingRow`.

---

## Lógica y API

### `src/lib/quiz.ts`: funciones puras (sin DB, testeables)

- `releasedRounds(rounds, now)` → cuántas tandas están liberadas, respetando el orden y la regla "lanzar la 2 libera la 1"
- `computeQuizStatus(settings, rounds, now)` → `closed | open | finished`
- `guestProgress(attempt, answers, released, perRound)` → `playing | waiting | done`, tanda actual, si terminó una tanda con la última respuesta
- `scoreAnswer({ shownAt, expiresAt, answeredAt, isCorrect })` → puntos y timeout
- `drawQuestions(ids, count, random)` → sorteo (con `random` inyectable para tests)
- `sortRanking(rows)` → orden con desempates

### Invitado

Todas usan `getGuestSession()`. `next` y `answer` responden 403 si la pregunta pedida no pertenece a una tanda liberada o si el estado no es `open`.

| Endpoint | Qué hace |
|---|---|
| `GET /api/quiz/status` | **Liviano**, para la navbar: `{ status, releasedRounds, pendingCount }`. Alimenta el punto rojo y el toast. |
| `GET /api/quiz` | Estado completo: tandas liberadas, progreso propio por tanda, **pregunta en curso** (con `seconds_left`) si hay una, hora de la tanda 1 si está cerrado. Cierra como timeout la pregunta abierta si ya venció. |
| `POST /api/quiz/next` | Crea el sorteo si no existe. Si hay una abierta, la devuelve (idempotente). Si no, crea la siguiente **dentro de las tandas liberadas**. Si no quedan, devuelve `waiting` o `done`. |
| `POST /api/quiz/answer` `{ questionId, selectedIndex }` | Valida tiempo, calcula puntos con un update atómico y devuelve `{ correct, correctLabel, points, wrongMessage, roundCompleted, roundSummary?, nextRoundAvailable, isLastRound }`. |
| `GET /api/quiz/ranking` | Top 10 + fila propia + total de jugadores + tanda actual. |

### Admin: `/api/admin/quiz` (protegido por el proxy)

- `GET`: estado, tandas (horario, liberada, cuántos la completaron), configuración, preguntas con % de acierto, ranking completo.
- `PATCH`: modo, cierre, cantidades, segundos.
- `PATCH /rounds`: editar el horario de una tanda. `POST /rounds/:n/release`: **"Lanzar ahora"**.
- Preguntas: alta, edición (incluido `wrong_message`) y activar o desactivar.
- `DELETE ?guestId=`: resetea la partida de un invitado. `DELETE ?all=1`: resetea toda la trivia (respuestas, sorteos y `released_at`), con confirmación.

---

## UI

### Invitado: nueva pestaña "Trivia"

- Se agrega a `tabs` en `src/components/Navbar.tsx` (ícono `Brain` o `Sparkles` de lucide), con **punto rojo** cuando hay preguntas pendientes (sección 8). Quedan 6 tabs; hay que verificar que entren a 360 px de ancho.
- **`/trivia`, pantallas:**
  1. **Cerrada:** cuenta regresiva a la tanda 1 + reglas ("3 tandas durante la noche · 4 preguntas cada una · 20 s por pregunta · un solo intento · gana el que más sabe").
  2. **Tanda disponible:** "Tanda 2 de 3" + "¡Jugar!" (precarga las fotos).
  3. **Pregunta:** "Tanda 2 · 3/4", barra de tiempo animada, enunciado grande, botones Pau/Octi (o 4 opciones). Al tocar, los botones se bloquean.
  4. **Resultado:** foto contentos/tristes + texto (sección 6) + "Siguiente".
  5. **Fin de tanda:** resumen + **"Estate atento porque van a aparecer más durante la noche"** (sección 7).
  6. **Esperando:** el mismo mensaje + puntaje acumulado + "Ver ranking" (es lo que ve si vuelve a la pestaña entre tandas).
  7. **Fin (completó las 3):** puntaje total, correctas sobre 12, posición.
  8. **Finalizada:** podio + tu resultado.
- **`/trivia/ranking`:** según la sección 10.
- Estilo: mismos tokens que `retos` (`bg-white rounded-xl border-cream-200`, `font-script` en títulos, `ink-500` para acciones).

### Admin: pestaña "Trivia" (`src/components/admin/QuizTab.tsx`)

- **Tandas**, una fila por tanda con:
  - estado: Programada 22:00 / **Liberada** 21:47 (lanzada a mano) / Sin horario
  - horario editable (solo si no se liberó)
  - botón **"Lanzar ahora"**, con confirmación
  - progreso: "58 de 87 la completaron"
  - texto sugerido para el DJ: "¡Salió la tanda 2 de la trivia! Entren a la app"
- **Modo:** Automático / Forzar cerrada / Finalizada. Cierre automático opcional.
- Cantidad de tandas, preguntas por tanda y segundos (bloqueados una vez liberada la tanda 1).
- **Aviso** si hay respuestas registradas con la trivia en modo de prueba: "Hay N respuestas de prueba. Reseteá antes del evento".
- Ranking completo con desempate visible y export a Excel (`xlsx` ya está instalado).
- Banco de preguntas: respuesta correcta, toggle activa, edición, % de acierto.
- Resets por invitado y global.

---

## Seguridad (antes de la trivia, porque hay un premio en juego)

- **Firmar ambas cookies con HMAC** (`SESSION_SECRET`; si falta, se usa `SUPABASE_SERVICE_ROLE_KEY` como clave para no romper el deploy):
  - Helpers en `src/lib/session-token.ts`, sin `next/headers`, para poder usarlos en el proxy (en Next 16 el proxy corre en Node, así que `node:crypto` funciona).
  - `src/lib/auth.ts`: `encodeSession`, `getGuestSession`, `getAdminSession` e `isAuthenticated` firman y verifican.
  - Login admin: guardar el valor firmado en lugar de `'authenticated'`.
  - `src/proxy.ts`: verificar la firma en lugar de chequear solo que la cookie exista.
  - `src/app/(app)/layout.tsx` y `src/app/invitacion/[token]/page.tsx`: usar los helpers en lugar de leer la cookie a mano.
- **Contra:** las sesiones actuales dejan de valer y todos tienen que volver a ingresar su código una vez. Conviene deployarlo **antes** del casamiento.
- Toda la validación de tiempo, tandas y puntaje es server-side; el cliente solo muestra.

---

## Probar la experiencia completa 🎬

Hay dos formas de vivir la noche entera en 10 minutos, desde el celular, como si fueras un invitado: una **antes** de programar y otra con la app real.

### A. Prototipo navegable (antes de escribir código)

Una página suelta, sin backend, para recorrer todo el juego y ajustar textos, tiempos y cantidades antes de construirlo.

- Se publica como página privada y se abre en el celular; se le puede pasar el link a Pau.
- Muestra la app dentro de un marco de celular, con la barra de abajo (pestaña Trivia con punto rojo), y usa las **41 preguntas reales** del docx y las fotos placeholder (🥳 / 😢).
- **Panel "Director de la noche"** al costado (o abajo en mobile) para manejar el tiempo:
  - Cuenta regresiva a la tanda 1 acelerada (10 s) o "Saltar a la hora".
  - **Lanzar tanda 2 / tanda 3**: aparecen el punto rojo, el toast y la card de inicio, como en la fiesta.
  - **Llegar tarde**: simula entrar con 2 tandas liberadas para ver "¡Ya salió la tanda 2!".
  - **Finalizar**: congela el ranking y muestra el podio.
  - Reiniciar.
- **Ranking vivo** con ~40 invitados ficticios que van sumando puntos a medida que se lanzan las tandas, para ver cómo se siente subir o bajar posiciones.
- Se pueden cambiar en vivo: preguntas por tanda, segundos por pregunta y cantidad de tandas.
- Es descartable: no comparte código con la app. Lo que se cambie de textos o reglas vuelve a este plan.

### B. Modo ensayo en la app real (en producción, aislado)

Para probar la experiencia de verdad (los celulares, el 4G, los tiempos del server) sin ensuciar la trivia real y con la app todavía cerrada para los invitados.

**Aislamiento:**

- `guests.is_test boolean not null default false` (en `013_quiz.sql`). Los invitados de prueba se crean con `early_access = true`, así que pasan la página de espera.
- **Tandas de ensayo separadas:** `quiz_rounds` suma `scope text not null default 'real' check (scope in ('real', 'ensayo'))` y la clave pasa a ser `(scope, number)`. Los invitados de prueba leen las tandas `ensayo` y los reales leen las `real`. Las funciones puras de `src/lib/quiz.ts` no cambian; solo cambia qué tandas reciben.
- Modo propio para el ensayo: `quiz_test_mode` (`auto | closed | finished`) en `settings`, para poder finalizar el ensayo sin tocar el modo real.
- **Ranking separado:** la vista `quiz_ranking` expone `g.is_test`. El ranking real filtra `is_test = false` y los invitados de prueba solo ven el ranking de prueba. El ensayo nunca aparece en el ranking real ni en el export.
- Lo que el invitado de prueba suba en galería, muro o música **sí es real**: en el ensayo se usa solo la Trivia.

**Panel "Ensayo" en Admin › Trivia:**

- **Crear invitado de prueba:** crea un invitado `is_test` y muestra su link `/?code=XXXX` para abrir en el celular (o mandarlo a otro). Se pueden crear varios para jugar entre varias personas.
- **Ensayo rápido:** programa las tandas de ensayo a ahora + 1 min, + 4 min y + 7 min. Además están los mismos "Lanzar ahora" y horarios editables que en las tandas reales.
- **Sumar jugadores ficticios:** crea ~30 invitados `is_test` con nombres inventados. Cada vez que se libera una tanda de ensayo, el server les carga respuestas al azar para esa tanda (algunos aciertan todo, otros fallan, alguno queda "(no terminó)"), así el ranking se mueve como en la fiesta.
- **Finalizar ensayo:** pone `quiz_test_mode = finished` para ver el podio.
- **Borrar ensayo:** borra todos los invitados `is_test` (sus sorteos y respuestas se van por `on delete cascade`) y limpia las tandas de ensayo. Muestra cuántos quedan para confirmar que llegó a 0.

**Recorrido sugerido (10 min):** crear invitado de prueba → abrir el link en el celular → sumar jugadores ficticios → ensayo rápido → ver la cuenta regresiva llegar a cero → jugar la tanda 1 → salir a Galería y esperar el toast de la tanda 2 → jugar la 2 → dejar pasar la 3 y entrar tarde → ver el ranking → finalizar ensayo → borrar ensayo.

---

## Cómo probamos todo

Son cinco niveles, del más rápido al más real. Para probar **la experiencia** (no la lógica) están el prototipo y el modo ensayo de la sección anterior.

### 1. Tests unitarios de la lógica (`npm test`)

`node --test src/**/*.test.ts` (Node 25 ejecuta TS nativo, sin dependencias nuevas). Cubre:

- `releasedRounds`: antes y después de cada horario; "Lanzar ahora" antes del horario; lanzar la 2 con la 1 cerrada (libera ambas); horarios cargados fuera de orden; tanda sin horario.
- `computeQuizStatus`: cerrado antes de la tanda 1, modos forzados, cierre automático, bordes exactos de hora.
- `guestProgress`: jugando / esperando / terminado; atrasado con 2 tandas liberadas; detección de fin de tanda; última tanda sin mensaje "Estate atento".
- `scoreAnswer`: respuesta instantánea = 150, al límite = 100, dentro de la gracia, fuera de tiempo = 0, incorrecta = 0.
- `drawQuestions`: sin repetidas, 12 por invitado, banco más chico que lo pedido.
- `sortRanking`: cada criterio de desempate y "(no terminó)" relativo a las tandas liberadas.
- Firma de cookies: válida, adulterada, sin firma (formato viejo), admin falso.

### 2. Supabase local con Docker (base de prueba aislada)

Hoy solo existe la base de producción, así que todo lo que pruebe escritura conviene correrlo en una base local:

- `supabase init` (se commitea `supabase/config.toml`) + `supabase start`: aplica **todas** las migraciones, incluida `013_quiz.sql`, en un Postgres local. Se había verificado que las migraciones 001–010 aplican sin errores; falta confirmar con la `011_early_access.sql`.
- `npm run dev:local`: levanta Next apuntando a la base local, leyendo `.env.supabase-local`, que se genera con `supabase status -o env` y queda gitignored por `.env*`. Como `process.env` tiene prioridad sobre `.env.local`, no hay riesgo de pegarle a producción por accidente.
- `supabase db reset` deja la base limpia en segundos para repetir pruebas.
- Supabase Studio local (`localhost:54323`) permite ver las tablas en vivo.

### 3. Simulador de invitados (`scripts/quiz-sim.ts`)

Script que crea **N invitados de prueba** (ej. 120, códigos `TEST001…`) en la base local y los hace **jugar por HTTP contra la app real** (login → next → answer), simulando la noche:

- Lanza las 3 tandas con unos minutos de diferencia (vía el endpoint de admin).
- Perfiles de jugador: el que juega cada tanda apenas sale, el que **se pierde una tanda y se pone al día** después, el que abandona a mitad, el que deja vencer el tiempo.
- Valida concurrencia (todos a la vez, como en el salón al lanzar una tanda), un solo intento, que nadie reciba preguntas de tandas no liberadas, ranking con "(no terminó)" y desempates.
- **Se niega a correr** si la URL de Supabase no es `localhost`.
- Mientras corre, se mira el ranking desde el navegador y la pestaña admin.

### 4. Prueba de punta a punta en el navegador

Con la app local y el simulador cargando el ranking, se recorre a mano (o con las herramientas de navegador de Claude, grabando un GIF) este checklist:

- [ ] **Tanda 1 automática:** en el admin se programa a "ahora + 1 min". El invitado ve la cuenta regresiva y, al llegar a cero, aparece "¡Jugar!" sin recargar.
- [ ] Completar la tanda 1: foto contentos al acertar, tristes al errar, "¡Perdiste! Pedite uno en la barra" en una de tragos; al final, el resumen con **"Estate atento porque van a aparecer más durante la noche"**.
- [ ] Volver a la pestaña Trivia entre tandas: pantalla de espera con el mismo mensaje.
- [ ] **"Lanzar ahora" la tanda 2** desde el admin: en ≤60 s aparecen el punto rojo en la pestaña y el toast en otra sección; la card en inicio.
- [ ] Invitado atrasado: con la tanda 2 ya liberada, jugar la 1 y ver "¡Ya salió la tanda 2!" + "Seguir jugando".
- [ ] Tanda 3 (última): resultado final **sin** el mensaje "Estate atento".
- [ ] Refrescar a mitad de pregunta: vuelve a la misma pregunta con el tiempo restante.
- [ ] Dejar vencer el tiempo: cuenta como incorrecta y muestra la foto triste.
- [ ] Doble click y dos pestañas: un solo registro de respuesta.
- [ ] Ranking: tu posición, "(no terminó)", "Tanda 2 de 3", se actualiza solo.
- [ ] Forzar "Finalizada": no deja responder más y se ve el podio.
- [ ] Reset por invitado y reset global (vuelve a cerrar las tandas lanzadas a mano).
- [ ] Cookie adulterada (editada a mano): rebota al login. Cookie `admin_session` inventada: no entra al admin.
- [ ] Mobile 360 px: 6 tabs con el punto rojo, botones Pau/Octi y fotos sin scroll horizontal.

### 5. Ensayo general en producción (unos días antes)

1. Deploy con migración aplicada.
2. Hacer el **recorrido del modo ensayo** con 2–3 invitados de prueba y los jugadores ficticios.
3. Jugar desde **celulares reales** (iOS + Android, con datos móviles, no Wi-Fi), idealmente en el salón si se puede.
4. Proyectar `/admin/trivia/pantalla` si se usa.
5. **Dejar todo listo:** **Borrar ensayo** → modo **Automático** → verificar los 3 horarios reales (+1 h, +2 h 30, +4 h desde el inicio de la fiesta), que no se tocaron durante el ensayo.

### Checklist del día

- [ ] Admin › Trivia: modo **Automático**, **3 horarios correctos**, ninguna tanda liberada, **0 respuestas**, sin aviso de "respuestas de prueba", **0 invitados de prueba**.
- [ ] Coordinar con el DJ o animador los momentos de cada tanda (y el texto para anunciarla).
- [ ] Alguien con la contraseña de admin a mano para **lanzar** tandas si la fiesta se adelanta y para **Finalizar** al momento del premio.

---

## Fases de implementación

0. **Prototipo navegable** (sección A): probarlo, ajustar textos y reglas en este plan. Se puede hacer en paralelo con la fase 1.
1. **Seguridad:** firma de cookies + tests.
2. **Base:** migración `013_quiz.sql` + seed (tandas reales y de ensayo + preguntas, `guests.is_test`), settings y tipos; entorno de Supabase local (`config.toml`, `dev:local`).
3. **Lógica y API:** `src/lib/quiz.ts` + tests, endpoints de invitado (eligiendo tandas y ranking según `is_test`).
4. **UI invitado:** pestaña Trivia con punto rojo + toast, `/trivia` (con fotos y fin de tanda), `/trivia/ranking`, card en inicio.
5. **Admin:** `QuizTab` (tandas con "Lanzar ahora", modo, aviso de prueba, ranking, preguntas, resets) + panel **Ensayo** (sección B).
6. **Pruebas:** simulador + checklist E2E en local.
7. **Opcional:** modo pantalla para proyectar.
8. **Ensayo general** en producción con el modo ensayo.

> Antes de escribir código: leer las guías de route handlers y proxy en `node_modules/next/dist/docs/` (Next 16 tiene cambios, ver `AGENTS.md`).

## Pendientes

0. **Antes del casamiento:** aplicar `013_quiz.sql` en producción y deployar. Las sesiones actuales dejan de valer (hay que volver a ingresar el código una vez). Las tandas reales se siembran con `venue_datetime` del momento de la migración (hoy `2026-11-14T21:00Z`, es decir 19:00, 20:30 y 22:00 hora argentina): si después se cambia `venue_datetime`, hay que mover los horarios a mano desde Admin › Trivia.
1. **Asignar dueño a las fotos** en `src/lib/quiz-photos.ts` (hoy `owner: null`: sirven para cualquier respuesta del mismo ánimo hasta que se confirme de quién es cada una). Las fotos ya están cargadas; sin fotos se muestra un emoji.
2. Cargar `SESSION_SECRET` en Vercel (opcional, hay fallback).
