# App del Casamiento

App web para el día del casamiento. Los invitados acceden con su nombre y un código personal, y tienen acceso a galería de fotos, muro de mensajes, retos fotográficos y pedidos de música al DJ.

## Funcionalidades

### Para los invitados
- **Galería** — suben fotos desde el celular, se muestran en una grilla compartida en tiempo real
- **Muro** — dejan mensajes y buenos deseos para los novios
- **Retos** — lista de desafíos fotográficos (ej: "sacate una foto con un pelado"), cada uno con contador de participantes y galería propia
- **Música** — piden canciones al DJ con nombre del tema y artista

### Para los novios (panel admin)
- Ver todos los invitados y sus códigos
- Crear y eliminar retos fotográficos
- Ver todas las fotos subidas
- Leer todos los mensajes del muro
- Ver todos los pedidos de música

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Deploy | Vercel |
| Base de datos | Supabase (PostgreSQL) |
| Storage de fotos | Supabase Storage |
| UI | Tailwind CSS v4 + shadcn/ui |
| Validación | Zod v4 |
| Notificaciones | Sonner |
| Íconos | Lucide React |

## Estructura del proyecto

```
pauocti/
├── src/
│   ├── proxy.ts                    # Protección de rutas (Next.js 16)
│   ├── types/
│   │   └── index.ts                # Tipos TypeScript globales
│   ├── lib/
│   │   ├── auth.ts                 # Sesiones (invitado y admin)
│   │   └── supabase/
│   │       └── server.ts           # Client de Supabase para server-side
│   ├── components/
│   │   ├── Navbar.tsx              # Header + navegación inferior
│   │   ├── PhotoUploadModal.tsx    # Modal de upload de fotos
│   │   └── ui/                    # Componentes shadcn/ui
│   └── app/
│       ├── page.tsx                # Login (nombre + código)
│       ├── layout.tsx              # Layout raíz
│       ├── (app)/
│       │   ├── layout.tsx          # Layout protegido (requiere sesión de invitado)
│       │   ├── galeria/page.tsx    # Galería de fotos
│       │   ├── muro/page.tsx       # Muro de mensajes
│       │   ├── retos/page.tsx      # Retos fotográficos
│       │   └── musica/page.tsx     # Pedidos de música
│       ├── admin/
│       │   ├── login/page.tsx      # Login del panel admin
│       │   └── page.tsx            # Panel de administración
│       └── api/
│           ├── auth/login/         # POST  — login de invitado
│           ├── auth/logout/        # POST  — logout de invitado
│           ├── upload/             # POST  — subir foto a Supabase Storage
│           ├── photos/             # GET   — listar fotos (con filtro por reto)
│           ├── messages/           # GET/POST — mensajes del muro
│           ├── challenges/         # GET   — listar retos con contador de fotos
│           ├── music/              # GET/POST — pedidos de música
│           └── admin/
│               ├── login/          # POST  — login de admin
│               ├── logout/         # POST  — logout de admin
│               ├── guests/         # GET/POST/DELETE — gestión de invitados
│               └── challenges/     # GET/POST/DELETE — gestión de retos
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql         # Schema de la base de datos
│       └── 002_storage.sql         # Configuración del bucket de fotos
└── .env.local.example              # Variables de entorno necesarias
```

## Base de datos

```sql
guests          id, name, code (único), created_at
challenges      id, title, description, emoji, created_at
photos          id, guest_id, guest_name, url, storage_path, challenge_id?, created_at
messages        id, guest_id, guest_name, content, created_at
music_requests  id, guest_id, guest_name, song_name, artist?, created_at
```

Las fotos están vinculadas opcionalmente a un reto (`challenge_id nullable`). Al eliminar un reto, las fotos quedan en la galería general con `challenge_id = null`.

## Autenticación

**Invitados:** ingresan su nombre + un código único (pre-cargado por el admin). Después del login, se guarda una cookie httpOnly con `{ guestId, guestName }` en base64. La sesión dura 7 días.

**Admin:** contraseña separada definida en la variable de entorno `ADMIN_PASSWORD`. Sesión de 8 horas, cookie httpOnly independiente.

El archivo `proxy.ts` protege todas las rutas: redirige a `/` si no hay sesión de invitado, y a `/admin/login` si no hay sesión de admin. Los endpoints de API devuelven 401 en vez de redirigir.

## Setup local

### 1. Clonar y instalar dependencias

```bash
git clone <repo>
cd pauocti
npm install
```

### 2. Crear el proyecto en Supabase

1. Ir a [app.supabase.com](https://app.supabase.com) y crear un proyecto nuevo
2. En **SQL Editor**, ejecutar `supabase/migrations/001_initial.sql`
3. En **Storage**, crear un bucket llamado `wedding-photos` marcado como **público**
   - O ejecutar `supabase/migrations/002_storage.sql` en el SQL Editor

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Completar `.env.local` con los valores del proyecto de Supabase:

```env
# Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Contraseña para el panel de admin
ADMIN_PASSWORD=una-contraseña-segura

# Nombres que aparecen en la app
NEXT_PUBLIC_COUPLE_NAMES=Pau & Octi

# Fecha del casamiento (texto libre)
NEXT_PUBLIC_WEDDING_DATE=14 de Junio de 2025
```

> **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` ni `ADMIN_PASSWORD` al cliente. Ambas son variables sin prefijo `NEXT_PUBLIC_`.

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

### Opción A — CLI

```bash
npm i -g vercel
vercel
```

### Opción B — Dashboard

1. Importar el repositorio en [vercel.com/new](https://vercel.com/new)
2. En **Environment Variables**, agregar las mismas variables que en `.env.local`
3. Deploy automático en cada push a `main`

## Agregar invitados

Desde el panel admin (`/admin`), pestaña **Invitados**:

- Nombre: nombre completo del invitado
- Código: código único (ej: `MAR001`, `JUA2025`). Este código va en la invitación física o digital.

El invitado ingresa a la app poniendo su nombre tal como quiera (no tiene que coincidir con el cargado en el admin) y el código exacto.

## Agregar retos fotográficos

Desde el panel admin, pestaña **Retos**:

- Emoji: el ícono que representa el reto
- Título: nombre corto (ej: "Foto con un pelado")
- Descripción: instrucciones o contexto adicional

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo en localhost:3000
npm run build    # Build de producción
npm run start    # Servidor de producción (requiere build previo)
npm run lint     # Linter ESLint
```
