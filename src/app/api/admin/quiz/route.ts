import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminHandler } from '@/lib/quiz-admin-route'
import { getAdminOverview, resetGuest, resetReal, updateConfig } from '@/lib/quiz-admin'

const mode = z.enum(['auto', 'closed', 'finished'])

const patchSchema = z.object({
  mode: mode.optional(),
  testMode: mode.optional(),
  closesAt: z.string().datetime({ offset: true }).nullable().optional(),
  roundCount: z.number().int().min(1).max(10).optional(),
  perRound: z.number().int().min(1).max(20).optional(),
  secondsPerQuestion: z.number().int().min(5).max(120).optional(),
})

export async function GET() {
  return adminHandler(async () => NextResponse.json(await getAdminOverview()))
}

export async function PATCH(request: NextRequest) {
  return adminHandler(async () => {
    await updateConfig(patchSchema.parse(await request.json()))
    return NextResponse.json(await getAdminOverview())
  })
}

/** `?guestId=` resetea la partida de un invitado; `?all=1` resetea toda la trivia real. */
export async function DELETE(request: NextRequest) {
  return adminHandler(async () => {
    const { searchParams } = request.nextUrl
    const guestId = searchParams.get('guestId')
    if (guestId) {
      await resetGuest(z.string().uuid().parse(guestId))
    } else if (searchParams.get('all') === '1') {
      await resetReal()
    } else {
      return NextResponse.json({ error: 'Falta guestId o all=1' }, { status: 400 })
    }
    return NextResponse.json(await getAdminOverview())
  })
}
