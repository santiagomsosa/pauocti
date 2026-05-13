import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession, isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  song_name: z.string().min(1, 'El nombre de la canción es requerido').max(200).trim(),
  artist: z.string().max(200).trim().optional(),
})

export async function GET() {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('music_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 })
  }

  return NextResponse.json({ requests: data })
}

export async function POST(request: NextRequest) {
  const session = await getGuestSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { song_name, artist } = schema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('music_requests')
      .insert({
        guest_id: session.guestId,
        guest_name: session.guestName,
        song_name,
        artist: artist || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al guardar el pedido' }, { status: 500 })
    }

    return NextResponse.json({ request: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
