import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ id: z.string().uuid() })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = schema.parse(body)

    const supabase = createServerClient()

    await supabase.from('guests').delete().eq('parent_guest_id', id)

    const { data, error } = await supabase
      .from('guests')
      .update({ rsvp_status: 'pending', rsvp_submitted_at: null, dietary_restrictions: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al resetear la confirmación' }, { status: 500 })
    }
    return NextResponse.json({ guest: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
