import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession, isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(500).trim(),
})

export async function GET() {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar mensajes' }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}

export async function POST(request: NextRequest) {
  const session = await getGuestSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content } = schema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({ guest_id: session.guestId, guest_name: session.guestName, content })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al guardar el mensaje' }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
