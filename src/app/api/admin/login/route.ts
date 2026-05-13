import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ password: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = schema.parse(body)

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
