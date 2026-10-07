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

3. **Recordatorio** — `POST /api/admin/reminder/send` (manual desde el admin). Se envía solo a quienes **confirmaron asistencia** (`rsvp_status='attending'`), no a todos los activos. Contenido, en este orden (diseño y detalle en la sección 8):
   - Fecha, saludo y texto de bienvenida.
   - **Cuenta regresiva** en días hasta el evento.
   - Ceremonia y fiesta: horario, lugar, dirección y **mapa/link a Google Maps** (salen de `settings`).
   - Explicación de **la app de la boda**: trivia, retos y premios.
   - **Código de acceso** y botón **"¡Entrar a la fiesta!"** a la app.

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

## 8. Rediseño del correo de recordatorio

Objetivo: que el recordatorio use el mismo estilo que la invitación y la app, e incluya el acceso a la app. Hay una propuesta navegable (individual y familia, escritorio y celular) con datos de invitados reales; no se envió nada productivo.

### Diseño

Mismo lenguaje visual que `InvitationView`: imagen de encabezado con "Paula & Octavio" en la tipografía manuscrita, fondo degradado rosa → crema → salvia, divisor botánico, ilustraciones en acuarela, tipografías Cinzel (títulos), Lora (texto) y Montserrat (código y botones), y la paleta `ink` / `rose` / `sage` / `sand` / `cream` de `globals.css`.

Orden de las secciones:

1. Encabezado, fecha (grande), saludo y texto: "¡Falta cada vez menos! Nos hace muy felices que nos acompañes en este día tan especial para nosotros. Esto es todo lo que necesitás saber."
2. Cuenta regresiva ("Faltan N días" + día y hora).
3. Ceremonia y fiesta, con "Cómo llegar".
4. La app de la boda: Trivia, Retos, Premios (y una línea sobre galería, muro y música).
5. Código de acceso + botón **"¡Entrar a la fiesta!"**.
6. Cierre con link a "Ver mi invitación".

Variantes:

- **Individual** (o con +1): una tarjeta con su código y un botón. Textos en singular o plural según `isPluralGuest`.
- **Familia** (`invitation_type='family'`): una tarjeta con un renglón por integrante confirmado (nombre, código y botón "Entrar"), porque cada integrante entra con su propio código.

Asunto: `{couple_names} · ¡Faltan N días!`, con N calculado al enviar (días de calendario en hora argentina). Si el evento es hoy o ya pasó, se usa `¡Ya falta poco!`.

### Restricciones de implementación

- HTML con **tablas y estilos inline** (lo único que respetan Gmail y Outlook), con un `@media` mínimo para celular. No usar Tailwind ni componentes React.
- Las imágenes se cargan por URL absoluta desde `NEXT_PUBLIC_APP_URL`, así que tienen que estar publicadas antes de enviar. Se generan versiones livianas en `public/email/` (los originales de `public/invitacion/` pesan ~2 MB cada uno):
  - `header.jpg`: el encabezado con los nombres ya impresos (los clientes de correo no cargan la tipografía manuscrita), unos 120 KB.
  - `divider.png`: divisor botánico.
  - `iglesia.png` y `fiesta.png`: recortes circulares.
  - Íconos: `disco`, `camara`, `sparklers`.
- La cuenta regresiva es un número fijo calculado al enviar: un correo no puede ejecutar JavaScript.
- Horarios siempre en `America/Argentina/Buenos_Aires` (igual que la invitación).
- Escapar todo valor dinámico (nombres, direcciones) al armar el HTML.
- Texto de preheader con el código, para que se vea en la bandeja de entrada.

### Cambios de código

1. `public/email/`: agregar las imágenes optimizadas.
2. `src/lib/email.ts`: reemplazar el cuerpo de `sendReminderEmail` por la nueva plantilla. Recibe además la lista de integrantes (para familias). Mantener `wrapEmail` para los otros dos correos, o migrarlos más adelante.
3. `src/app/api/admin/reminder/send/route.ts`:
   - Filtrar por `rsvp_status='attending'` (hoy manda a todos los activos con email, incluidos los que declinaron o no respondieron).
   - Para familias, adjuntar los integrantes confirmados con su código.
   - Enviar en tandas en vez de un `Promise.all` de todos los correos juntos, por los límites de Resend.
4. `src/app/page.tsx` (login): leer `?code=` de la URL y completar el campo, para que el botón del correo deje el código listo. Definir si además entra directo o solo completa el campo.
5. Vista previa para admin: `GET /api/admin/reminder/preview?guestId=…` que devuelve el HTML sin enviar, y un envío de prueba solo al email del admin antes del envío masivo.
6. `SettingsTab.tsx`: actualizar el texto de la sección "Recordatorio" (hoy dice "fecha, el lugar y el mapa") y mostrar cuántos correos se van a enviar antes de confirmar.

### Pendientes de decisión

- **Trivia:** no existe todavía en el código de la app. Si no llega a la boda, hay que quitarla del texto del correo.
- **Ícono de la trivia:** se usó la bola de disco; no hay una ilustración específica.
- **Integrantes de familia con email propio:** definir si reciben además un correo individual o solo el de la familia con todos los códigos.
- **Login con `?code=`:** definir si entra directo o solo completa el campo.

## 9. App cerrada hasta la fiesta y acceso anticipado (implementado)

- **Apertura:** la app se abre a la hora de la fiesta (`venue_datetime`; si falta, `wedding_datetime`). Hasta entonces, cualquier invitado que haya iniciado sesión ve `WaitingRoom` (cuenta regresiva hasta esa hora, qué se podrá hacer ese día y botón para salir) en lugar de la app. Al llegar la hora la página se refresca sola.
- **Dónde se bloquea:** solo en las páginas, en `src/app/(app)/layout.tsx`. Las APIs de invitados no se bloquean a propósito: no se espera abuso en una app de boda.
- **Early Bird:** columna `guests.early_access` (migración `011`). En el admin, pestaña Invitados, el botón del pájaro la activa o desactiva por persona (titulares individuales, acompañantes e integrantes de familia; no en la fila de la familia) y la lista muestra la insignia "Early Bird". El permiso se lee de la base en cada carga, sin volver a iniciar sesión.
- **Sesión:** dura hasta las 23:59 del 16/11 (hora argentina), calculado como fecha de la fiesta + 2 días, con un mínimo de 7 días. Ver `getSessionMaxAge` en `src/lib/app-access.ts`.
- **Link del correo:** el login lee `?code=` y completa el campo. La persona solo aprieta "¡Entrar a la fiesta!".
- **Probar en local:** `APP_OPENS_AT_OVERRIDE=<fecha ISO>` (solo fuera de producción) fuerza la hora de apertura sin tocar la configuración real. Con una fecha pasada la app se ve abierta; con una futura, cerrada.

---

## Setup necesario

- Cuenta en **Resend** + `RESEND_API_KEY` (idealmente dominio verificado).
- Correr las migraciones en Supabase (`003` en adelante; la `011` agrega `early_access`).
- `npm install motion`.
