import { cookies } from 'next/headers'
import type { GuestSession } from '@/types'

export const SESSION_COOKIE = 'guest_session'
export const ADMIN_COOKIE = 'admin_session'

export async function getGuestSession(): Promise<GuestSession | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)
  if (!cookie) return null
  try {
    return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export function encodeSession(session: GuestSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64')
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get(ADMIN_COOKIE)
}

/** Devuelve true si hay sesión de invitado O sesión de admin */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!(cookieStore.get(SESSION_COOKIE) || cookieStore.get(ADMIN_COOKIE))
}
