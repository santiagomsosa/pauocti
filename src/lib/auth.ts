import { cookies } from 'next/headers'
import type { GuestSession } from '@/types'
import { decodeGuestToken, encodeGuestToken, isValidAdminToken } from '@/lib/session-token'

export const SESSION_COOKIE = 'guest_session'
export const ADMIN_COOKIE = 'admin_session'

export async function getGuestSession(): Promise<GuestSession | null> {
  const cookieStore = await cookies()
  return decodeGuestToken(cookieStore.get(SESSION_COOKIE)?.value)
}

export function encodeSession(session: GuestSession): string {
  return encodeGuestToken(session)
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)
}

/** Devuelve true si hay sesión de invitado O sesión de admin */
export async function isAuthenticated(): Promise<boolean> {
  return (await getGuestSession()) !== null || (await getAdminSession())
}
