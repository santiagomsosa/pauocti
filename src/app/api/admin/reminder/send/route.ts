import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendReminderEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import type { Guest } from '@/types'

// Son ~200 correos de a uno: se necesita más margen que el de por defecto.
export const maxDuration = 300

// Resend acepta pocas solicitudes por segundo; se espacian para que ninguna falle por límite de velocidad.
const DELAY_BETWEEN_EMAILS_MS = 600

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Recordatorio individual: un correo por persona (con su propio código), solo a quienes
 * confirmaron asistencia. Las familias no reciben uno propio: sus integrantes sí, cada uno en su mail.
 */
export async function POST() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('is_active', true)
    .eq('rsvp_status', 'attending')
    .neq('invitation_type', 'family')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar invitados' }, { status: 500 })
  }

  const guests = data as Guest[]
  if (guests.length === 0) {
    return NextResponse.json({ error: 'No hay invitados confirmados con email' }, { status: 400 })
  }

  const settings = await getSettings()
  let sent = 0
  const failed: string[] = []
  for (const guest of guests) {
    const ok = await sendReminderEmail(guest, settings).catch(() => false)
    if (ok) sent++
    else failed.push(guest.name)
    await sleep(DELAY_BETWEEN_EMAILS_MS)
  }

  return NextResponse.json({ success: failed.length === 0, sent, failed })
}
