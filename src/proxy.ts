import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_LOGIN = '/admin/login'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes (excepto /admin/login y /api/admin/login)
  if (pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN) {
    const adminSession = request.cookies.get('admin_session')
    if (!adminSession) {
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
    const adminSession = request.cookies.get('admin_session')
    if (!adminSession) {
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
  const guestSession = request.cookies.get('guest_session')
  const adminSession = request.cookies.get('admin_session')
  if (!guestSession && !adminSession) {
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
