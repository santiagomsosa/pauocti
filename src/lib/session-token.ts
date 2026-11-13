import { createHmac, timingSafeEqual } from 'node:crypto'
import type { GuestSession } from '@/types'

// Sin next/headers: se usa también desde el proxy y desde los tests.

interface AdminPayload {
  role: 'admin'
  exp: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Falta SESSION_SECRET (o SUPABASE_SERVICE_ROLE_KEY) para firmar las sesiones')
  return secret
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url')
}

/** `<payload en base64url>.<firma>` */
export function signToken(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

/** Devuelve el payload si la firma es válida; null si está adulterado o es del formato viejo (sin firma). */
export function verifyToken<T>(token: string | undefined | null): T | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null

  const body = token.slice(0, dot)
  const signature = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(body))
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as T
  } catch {
    return null
  }
}

export function encodeGuestToken(session: GuestSession): string {
  return signToken({ guestId: session.guestId, guestName: session.guestName })
}

export function decodeGuestToken(token: string | undefined | null): GuestSession | null {
  const payload = verifyToken<Partial<GuestSession>>(token)
  if (!payload || typeof payload.guestId !== 'string' || typeof payload.guestName !== 'string') return null
  return { guestId: payload.guestId, guestName: payload.guestName }
}

export function encodeAdminToken(maxAgeSeconds: number, now: number = Date.now()): string {
  const payload: AdminPayload = { role: 'admin', exp: now + maxAgeSeconds * 1000 }
  return signToken(payload)
}

export function isValidAdminToken(token: string | undefined | null, now: number = Date.now()): boolean {
  const payload = verifyToken<Partial<AdminPayload>>(token)
  return payload?.role === 'admin' && typeof payload.exp === 'number' && payload.exp > now
}
