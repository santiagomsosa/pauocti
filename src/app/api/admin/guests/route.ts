import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const guestSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  code: z.string().min(3).max(30).trim(),
})

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar invitados' }, { status: 500 })
  }
  return NextResponse.json({ guests: data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code } = guestSchema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('guests')
      .insert({ name, code })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ese código ya está en uso' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al crear el invitado' }, { status: 500 })
    }
    return NextResponse.json({ guest: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('guests').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Error al eliminar el invitado' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
