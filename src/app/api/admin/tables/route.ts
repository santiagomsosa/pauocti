import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const tableSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  capacity: z.coerce.number().int().min(1).max(500).default(10),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).trim().optional(),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
})

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('wedding_tables')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar las mesas' }, { status: 500 })
  }

  return NextResponse.json({ tables: data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, capacity } = tableSchema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('wedding_tables')
      .insert({ name, capacity })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al crear la mesa' }, { status: 500 })
    }

    return NextResponse.json({ table: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, capacity } = patchSchema.parse(body)

    const update: Record<string, unknown> = {}
    if (name !== undefined) update.name = name
    if (capacity !== undefined) update.capacity = capacity

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('wedding_tables')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar la mesa' }, { status: 500 })
    }

    return NextResponse.json({ table: data })
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
  const { error } = await supabase.from('wedding_tables').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Error al eliminar la mesa' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
