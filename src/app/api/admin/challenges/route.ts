import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(100).trim(),
  description: z.string().min(1).max(500).trim(),
  emoji: z.string().min(1).max(10),
})

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar retos' }, { status: 500 })
  }
  return NextResponse.json({ challenges: data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, emoji } = schema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('challenges')
      .insert({ title, description, emoji })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al crear el reto' }, { status: 500 })
    }
    return NextResponse.json({ challenge: data })
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
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Error al eliminar el reto' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
