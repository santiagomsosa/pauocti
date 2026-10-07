import type { Guest, Settings } from '@/types'

// Zona horaria de la boda: los días se cuentan en hora argentina (UTC-3, sin horario de verano).
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_SESSION_SECONDS = 60 * 60 * 24 * 7
// La sesión de invitado dura hasta el fin del día que está esta cantidad de días después de la fiesta.
const SESSION_DAYS_AFTER_EVENT = 2

/**
 * La app se abre a la hora de la fiesta (la misma de la cuenta regresiva).
 * En desarrollo se puede forzar con APP_OPENS_AT_OVERRIDE (fecha ISO) para probar
 * la app abierta o cerrada sin tocar la configuración real.
 */
export function getAppOpensAt(settings: Pick<Settings, 'venue_datetime' | 'wedding_datetime'>): Date | null {
  const override = process.env.NODE_ENV !== 'production' ? process.env.APP_OPENS_AT_OVERRIDE : undefined
  const iso = override || settings.venue_datetime || settings.wedding_datetime
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Si no hay fecha configurada la app no se bloquea; el acceso anticipado siempre pasa. */
export function canAccessApp(
  guest: Pick<Guest, 'early_access'> | null,
  settings: Pick<Settings, 'venue_datetime' | 'wedding_datetime'>,
  now: Date = new Date()
): boolean {
  if (guest?.early_access) return true
  const opensAt = getAppOpensAt(settings)
  return !opensAt || now >= opensAt
}

/** Segundos de duración de la sesión: hasta las 23:59:59 (hora argentina) del 2.º día posterior a la fiesta. */
export function getSessionMaxAge(
  settings: Pick<Settings, 'venue_datetime' | 'wedding_datetime'>,
  now: Date = new Date()
): number {
  const iso = settings.venue_datetime || settings.wedding_datetime
  if (!iso) return DEFAULT_SESSION_SECONDS

  const eventDay = new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIME_ZONE }).format(new Date(iso)) // YYYY-MM-DD
  const [y, m, d] = eventDay.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m - 1, d) + SESSION_DAYS_AFTER_EVENT * DAY_MS).toISOString().slice(0, 10)
  const expiry = new Date(`${lastDay}T23:59:59-03:00`)

  const seconds = Math.floor((expiry.getTime() - now.getTime()) / 1000)
  return Math.max(seconds, DEFAULT_SESSION_SECONDS)
}
