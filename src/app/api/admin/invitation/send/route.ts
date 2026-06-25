import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import { z } from 'zod'
import type { Guest } from '@/types'

const schema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, all } = schema.parse(body)

    if (!id && !all) {
      return NextResponse.json({ error: 'Falta el id del invitado' }, { status: 400 })
    }

    const supabase = createServerClient()
    let query = supabase.from('guests').select('*').is('parent_guest_id', null).not('email', 'is', null)
    if (id) query = query.eq('id', id)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Error al cargar invitados' }, { status: 500 })
    }

    const guests = data as Guest[]
    if (guests.length === 0) {
      return NextResponse.json({ error: 'No hay invitados con email para enviar' }, { status: 400 })
    }

    const settings = await getSettings()
    await Promise.all(guests.map((guest) => sendInvitationEmail(guest, settings)))

    return NextResponse.json({ success: true, sent: guests.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
