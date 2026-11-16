import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeGuestToken, isValidAdminToken } from '@/lib/session-token'

const ADMIN_LOGIN = '/admin/login'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Invitación online pública (se accede por token, sin login)
  if (pathname.startsWith('/invitacion/') || pathname.startsWith('/api/invitation/')) {
    return NextResponse.next()
  }

  // Álbum del casamiento: público y de solo lectura (link sin login; incluye la tapa y la canción).
  if (pathname === '/album' || pathname.startsWith('/album/')) {
    return NextResponse.next()
  }

  // Las cookies van firmadas: no alcanza con que existan, tienen que ser válidas.
  const isAdmin = isValidAdminToken(request.cookies.get('admin_session')?.value)

  // Admin routes (excepto /admin/login y /api/admin/login)
  if (pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url))
    }
    return NextResponse.next()
  }

  // API admin routes (excepto login/logout)
  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Rutas públicas
  const publicPaths = ['/', ADMIN_LOGIN, '/api/auth/login', '/api/auth/logout', '/api/admin/login', '/api/admin/logout']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // Rutas protegidas de invitados (también acepta sesión de admin)
  const isGuest = decodeGuestToken(request.cookies.get('guest_session')?.value) !== null
  if (!isGuest && !isAdmin) {
    // API routes → 401, páginas → redirect al login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
