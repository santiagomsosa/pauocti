import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendReminderEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import type { Guest } from '@/types'

export async function POST() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('is_active', true)
    .not('email', 'is', null)

  if (error) {
    return NextResponse.json({ error: 'Error al cargar invitados' }, { status: 500 })
  }

  const guests = data as Guest[]
  if (guests.length === 0) {
    return NextResponse.json({ error: 'No hay invitados activos con email' }, { status: 400 })
  }

  const settings = await getSettings()
  await Promise.all(guests.map((guest) => sendReminderEmail(guest, settings)))

  return NextResponse.json({ success: true, sent: guests.length })
}
