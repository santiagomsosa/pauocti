# Plan: Invitaciones online con RSVP, +1 y countdown

## Decisiones tomadas

- **Email:** Resend (envío automático desde el admin con botón "Enviar invitación").
- **Animaciones:** librería `motion` (framer-motion) — scroll-reveal, parallax, entradas escalonadas, estilo [si-quiero](https://si-quiero.com/invitaciones-de-boda/).
- **Fecha/hora del casamiento:** configurable desde el admin (no por env).

## Estado actual del proyecto (contexto)

- **Stack:** Next.js 16 (app router), Supabase con service-role en el server (RLS deshabilitado), sesiones por cookie (base64 JSON sin firmar). `motion` no está instalado.
- **Auth invitado:** entra con nombre + `code` en `/`. El `code` matchea una fila de `guests`.
- **Admin:** cookie simple. Hoy solo permite agregar/borrar invitados (name, code), crear retos y ver fotos/muro/música. No hay edición, ni email, ni RSVP.
- **Tabla `guests`:** `id, name, code, created_at`. Sin email, +1, RSVP ni estado activo.

---

## 1. Modelo de datos — migración `003_invitations.sql`

### Extender `guests`

| Campo | Tipo | Para qué |
|---|---|---|
| `email` | text null | enviar la invitación |
| `invite_token` | text unique | URL pública no adivinable: `/invitacion/[token]` |
| `max_plus_ones` | int default 0 | cuántos "+1" puede agregar |
| `parent_guest_id` | uuid null → guests(id) | marca **"+1 de X"** |
| `is_active` | bool default true | los +1 nacen en `false` hasta activarse en admin |
| `rsvp_status` | text default `'pending'` | `pending` / `attending` / `declined` |
| `dietary_restrictions` | text null | restricción alimentaria |
| `rsvp_submitted_at` | timestamptz null | **null = editable, con valor = congelado** |

Los **+1 son filas reales** de `guests` (con su propio `code` e `invite_token`), con `parent_guest_id` apuntando al titular e `is_active=false`. Así aparecen en la sección de usuarios del admin con la marca "+1 de X", y se activan manualmente.

### Tabla de settings globales

```sql
create table public.settings (
  key text primary key,
  value text
);
```

Guarda `wedding_datetime` (ISO), `couple_names`, `venue`, `venue_address`, `venue_map_url` (link a Google Maps, usado en el recordatorio). El countdown y la portada leen de acá (server-side), no de env.

Recordar: `alter table ... disable row level security` (mismo patrón que las demás tablas).

### Tipos

Actualizar `src/types/index.ts` (interface `Guest` con los campos nuevos + tipos de settings).

---

## 2. Admin

### Pestaña "Invitados"

- **Editar invitado** (hoy no existe): `PATCH /api/admin/guests` para setear `email` y `max_plus_ones`. Formulario / edición inline.
- Mostrar por invitado: estado RSVP (badge), restricción alimentaria, y sus **+1** anidados con la marca "+1 de X".
- **Toggle de activación** para los +1 (`is_active`) — switch que llama al PATCH.
- **Botón "Enviar invitación"** por invitado (y opcional "enviar a todos") → dispara el email con el link `/invitacion/[invite_token]`.
- Mostrar el `code` de acceso de cada uno.

### Pestaña "Configuración" (nueva)

- Input fecha + hora del casamiento (`datetime-local`) → `PUT /api/admin/settings`.
- Nombres de la pareja, lugar (`venue`), dirección (`venue_address`) y link al mapa (`venue_map_url`).
- **Botón "Enviar recordatorio"** a los invitados activados (ver punto 5.3).

---

## 3. Invitación online — ruta pública `/invitacion/[token]`

Página **sin login** (se entra por el token del email). Server component que busca el guest por `invite_token`.

Secciones (con movimiento, ver punto 6):

1. **Portada animada** con nombres + fecha.
2. **Countdown** en vivo a `wedding_datetime` (días/hs/min/seg, client component con `setInterval`).
3. **Formulario RSVP** (si `rsvp_submitted_at` es null → editable):
   - Confirmar asistencia (sí/no).
   - Restricción alimentaria (textarea).
   - **+1:** hasta `max_plus_ones` acompañantes; por cada uno: nombre, correo, asistencia y restricción.
   - Botón **Enviar**.
4. Al enviar (`POST /api/invitation/[token]`):
   - Setea RSVP del titular + `rsvp_submitted_at` (congela).
   - Crea las filas de los +1 (con `code` e `invite_token` autogenerados, `parent_guest_id`, `is_active=false`).
   - Envía el correo de **confirmación** al invitado original (ver punto 5.2).
5. **Estado congelado** (si ya envió): datos en modo lectura + **su código de acceso a la app** + botón "Entrar a la app" (`/`). Puede reabrir el link cuando quiera.

---

## 4. Login: respetar `is_active`

En `api/auth/login` rechazar guests con `is_active=false` ("Tu acceso todavía no está habilitado"). Así los +1 no entran hasta que el admin los active.

---

## 5. Email (Resend)

- `RESEND_API_KEY` (free tier suficiente para una boda; idealmente dominio verificado para no caer en spam).
- Helper compartido para enviar (un solo cliente Resend + templates HTML reutilizables).

### Tipos de correo

1. **Invitación** — `POST /api/admin/invitation/send` (manual desde el admin, por invitado o "a todos"): HTML lindo y simple con el link `/invitacion/[invite_token]`.

2. **Confirmación de RSVP** (automático) — al congelar la invitación (dentro de `POST /api/invitation/[token]`), se envía al **invitado original** (no a los +1) un correo de confirmación con:
   - Resumen de los datos confirmados (asistencia, restricción alimentaria, acompañantes).
   - **Link directo a la invitación** (`/invitacion/[invite_token]`) para que pueda consultarla siempre que quiera.
   - Solo se manda si el invitado tiene `email` cargado; el fallo de envío no debe romper el guardado del RSVP.

3. **Recordatorio** — `POST /api/admin/reminder/send` (manual desde el admin): se envía a los invitados **activados** (`is_active=true`), con:
   - Información resumida de la invitación (fecha/hora, link).
   - Información complementaria del lugar: dirección, **mapa/link a Google Maps**, indicaciones para llegar.
   - Estos datos del lugar salen de `settings` (`venue`, `venue_address`, y un nuevo `venue_map_url`).

> Sumar `venue_map_url` a la tabla `settings` y a la pestaña de Configuración del admin.

---

## 6. Animaciones

- Instalar **`motion`** (framer-motion v11, import `motion/react`): scroll-reveal/fade-in por sección, parallax suave en la portada, entrada escalonada (estilo si-quiero).
- Countdown con transición de dígitos.
- Reutilizar `decorations.tsx` (ramas acuarela / gold dots) para ambientar.

---

## 7. Fases de implementación

1. Migración `003` (guests + settings) + tipos en `src/types/index.ts`.
2. API admin: `PATCH` guests, listado anidado con +1, activación, `GET/PUT settings`.
3. UI admin: edición de invitado, +1 anidados, toggle activar, botón enviar, pestaña Configuración.
4. Ruta pública `/invitacion/[token]` + `POST /api/invitation/[token]` (RSVP, freeze, crear +1, correo de confirmación).
5. Countdown + animaciones (`motion`).
6. Email (Resend): helper + templates de los 3 correos (invitación, confirmación automática, recordatorio) + endpoints de envío.
7. Ajuste `proxy.ts` (whitelist `/invitacion/*` y `/api/invitation/*` como públicas) + login `is_active`.

---

## Setup necesario

- Cuenta en **Resend** + `RESEND_API_KEY` (idealmente dominio verificado).
- Correr la migración `003` en Supabase.
- `npm install motion`.
