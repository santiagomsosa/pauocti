import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminHandler } from '@/lib/quiz-admin-route'
import { createTestGuest, deleteRehearsal, getAdminOverview, resetRehearsal, startQuickRehearsal, updateConfig } from '@/lib/quiz-admin'
import { createBots } from '@/lib/quiz-bots'

const schema = z.object({
  action: z.enum(['create-guest', 'add-bots', 'quick', 'finish', 'reopen', 'reset', 'delete']),
  name: z.string().trim().max(60).optional(),
})

/** Acciones del panel "Ensayo" (invitados de prueba, jugadores ficticios, tandas rápidas). */
export async function POST(request: NextRequest) {
  return adminHandler(async () => {
    const { action, name } = schema.parse(await request.json())
    let extra: Record<string, unknown> = {}

    switch (action) {
      case 'create-guest':
        extra = { guest: await createTestGuest(name) }
        break
      case 'add-bots':
        extra = { created: await createBots(30) }
        break
      case 'quick':
        await startQuickRehearsal()
        break
      case 'finish':
        await updateConfig({ testMode: 'finished' })
        break
      case 'reopen':
        await updateConfig({ testMode: 'auto' })
        break
      case 'reset':
        await resetRehearsal()
        break
      case 'delete':
        extra = await deleteRehearsal()
        break
    }
    return NextResponse.json({ ...extra, ...(await getAdminOverview()) })
  })
}
