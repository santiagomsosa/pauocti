import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminHandler } from '@/lib/quiz-admin-route'
import { getAdminOverview, releaseRound, scheduleRound } from '@/lib/quiz-admin'

const scope = z.enum(['real', 'ensayo'])

/** Editar el horario de una tanda (solo si todavía no se liberó). */
export async function PATCH(request: NextRequest) {
  return adminHandler(async () => {
    const { scope: s, number, scheduledAt } = z
      .object({
        scope,
        number: z.number().int().min(1),
        scheduledAt: z.string().datetime({ offset: true }).nullable(),
      })
      .parse(await request.json())
    await scheduleRound(s, number, scheduledAt)
    return NextResponse.json(await getAdminOverview())
  })
}

/** "Lanzar ahora". */
export async function POST(request: NextRequest) {
  return adminHandler(async () => {
    const { scope: s, number } = z.object({ scope, number: z.number().int().min(1) }).parse(await request.json())
    await releaseRound(s, number)
    return NextResponse.json(await getAdminOverview())
  })
}
