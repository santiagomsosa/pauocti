import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateInviteToken, generateUniqueGuestCode } from '@/lib/invite'
import { z } from 'zod'
import type { Guest } from '@/types'

const plusOnePreloadSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(200).trim().optional().or(z.literal('')),
  phone: z.string().min(6).max(30).trim(),
})

const guestSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(200).trim().optional().or(z.literal('')),
  phone: z.string().min(6).max(30).trim(),
  invitation_type: z.enum(['individual', 'family']).default('individual'),
  max_plus_ones: z.coerce.number().int().min(0).max(10).default(0),
  plus_ones_preload: z.array(plusOnePreloadSchema).max(10).default([]),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(200).trim().optional().or(z.literal('')).nullable(),
  phone: z.string().min(6).max(30).trim().optional(),
  invitation_type: z.enum(['individual', 'family']).optional(),
  max_plus_ones: z.coerce.number().int().min(0).max(10).optional(),
  is_active: z.boolean().optional(),
  plus_ones_preload: z.array(plusOnePreloadSchema).max(10).optional(),
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

  const all = data as Guest[]
  const titulares = all.filter((g) => !g.parent_guest_id)
  const plusOnesByParent = new Map<string, Guest[]>()
  for (const g of all) {
    if (!g.parent_guest_id) continue
    const list = plusOnesByParent.get(g.parent_guest_id) ?? []
    list.push(g)
    plusOnesByParent.set(g.parent_guest_id, list)
  }

  const guests = titulares.map((g) => ({ ...g, plus_ones: plusOnesByParent.get(g.id) ?? [] }))

  return NextResponse.json({ guests })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, invitation_type, max_plus_ones, plus_ones_preload } =
      guestSchema.parse(body)

    const supabase = createServerClient()
    const code = await generateUniqueGuestCode(supabase)
    // El contenedor de una familia no es un login: cada integrante entra con su propio código
    const isFamily = invitation_type === 'family'

    const { data, error } = await supabase
      .from('guests')
      .insert({
        name,
        code,
        email: email || null,
        phone,
        invitation_type,
        max_plus_ones,
        plus_ones_preload,
        is_active: true,
        invite_token: generateInviteToken(),
      })
      .select()
      .single()

    if (error) {
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, email, phone, invitation_type, max_plus_ones, is_active, plus_ones_preload } =
      patchSchema.parse(body)

    const update: Record<string, unknown> = {}
    if (email !== undefined) update.email = email || null
    if (phone !== undefined) update.phone = phone
    if (invitation_type !== undefined) update.invitation_type = invitation_type
    if (max_plus_ones !== undefined) update.max_plus_ones = max_plus_ones
    if (is_active !== undefined) update.is_active = is_active
    if (plus_ones_preload !== undefined) update.plus_ones_preload = plus_ones_preload

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('guests')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar el invitado' }, { status: 500 })
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
