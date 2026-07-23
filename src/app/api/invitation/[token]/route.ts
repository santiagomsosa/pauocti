import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateInviteToken, generateUniqueGuestCode } from '@/lib/invite'
import { sendRsvpConfirmationEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import { z } from 'zod'
import type { Guest } from '@/types'

const plusOneSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().max(200).trim().optional().or(z.literal('')),
  phone: z.string().max(30).trim().optional().or(z.literal('')),
  rsvp_status: z.enum(['attending', 'declined']),
  dietary_restrictions: z.string().max(500).trim().optional().or(z.literal('')),
})

const schema = z.object({
  rsvp_status: z.enum(['attending', 'declined']),
  phone: z.string().max(30).trim().optional().or(z.literal('')),
  email: z.string().max(200).trim().optional().or(z.literal('')),
  dietary_restrictions: z.string().max(500).trim().optional().or(z.literal('')),
  plus_ones: z.array(plusOneSchema).max(10).default([]),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const body = await request.json()
    const { rsvp_status, phone, email, dietary_restrictions, plus_ones } = schema.parse(body)

    const supabase = createServerClient()
    const { data: guest, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('invite_token', token)
      .single()

    if (fetchError || !guest) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (guest.rsvp_submitted_at) {
      return NextResponse.json({ error: 'Esta invitación ya fue confirmada' }, { status: 409 })
    }

    if (plus_ones.length > guest.max_plus_ones) {
      return NextResponse.json({ error: 'Superaste el cupo de acompañantes' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('guests')
      .update({
        rsvp_status,
        phone: phone || null,
        email: email || null,
        dietary_restrictions: dietary_restrictions || null,
        rsvp_submitted_at: new Date().toISOString(),
      })
      .eq('id', guest.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error al guardar la confirmación' }, { status: 500 })
    }

    let insertedPlusOnes: Guest[] = []
    if (plus_ones.length > 0) {
      const takenCodes = new Set<string>()
      const rows = []
      for (const p of plus_ones) {
        rows.push({
          name: p.name,
          email: p.email || null,
          phone: p.phone || null,
          code: await generateUniqueGuestCode(supabase, takenCodes),
          invite_token: generateInviteToken(),
          parent_guest_id: guest.id,
          is_active: true,
          rsvp_status: p.rsvp_status,
          dietary_restrictions: p.dietary_restrictions || null,
          rsvp_submitted_at: new Date().toISOString(),
        })
      }

      const { data: inserted, error: plusOnesError } = await supabase.from('guests').insert(rows).select()
      if (plusOnesError) {
        return NextResponse.json({ error: 'Error al guardar los acompañantes' }, { status: 500 })
      }
      insertedPlusOnes = (inserted ?? []) as Guest[]
    }

    try {
      const settings = await getSettings()
      await sendRsvpConfirmationEmail(updated as Guest, settings)
    } catch {
      // El fallo de envío no debe romper el guardado del RSVP
    }

    return NextResponse.json({ guest: { ...updated, plus_ones: insertedPlusOnes } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
