import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { encodeSession, SESSION_COOKIE } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).trim(),
  code: z.string().min(1, 'El código es requerido').max(50).trim(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code } = schema.parse(body)

    const supabase = createServerClient()
    const { data: guest, error } = await supabase
      .from('guests')
      .select('id, name, code')
      .eq('code', code)
      .single()

    if (error || !guest) {
      return NextResponse.json({ error: 'Código inválido. Revisá la invitación.' }, { status: 401 })
    }

    const session = encodeSession({ guestId: guest.id, guestName: name })

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
