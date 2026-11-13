import { NextResponse } from 'next/server'
import { getGuestSession } from '@/lib/auth'
import { fillBotAnswers } from '@/lib/quiz-bots'
import { loadQuizContext, QuizError } from '@/lib/quiz-server'
import type { QuizContext } from '@/lib/quiz-server'

// Los jugadores ficticios del ensayo se actualizan al consultar, como máximo cada pocos segundos.
const BOT_REFRESH_MS = 3000
let lastBotRefresh = 0

async function refreshBots(): Promise<void> {
  if (Date.now() - lastBotRefresh < BOT_REFRESH_MS) return
  lastBotRefresh = Date.now()
  try {
    await fillBotAnswers()
  } catch (error) {
    console.error('[quiz] bots', error)
  }
}

/** Resuelve la sesión del invitado y su contexto de trivia; traduce `QuizError` a respuestas HTTP. */
export async function withQuizContext(run: (ctx: QuizContext) => Promise<Response>): Promise<Response> {
  const session = await getGuestSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const ctx = await loadQuizContext(session.guestId)
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (ctx.guest.is_test) await refreshBots()
    return await run(ctx)
  } catch (error) {
    if (error instanceof QuizError) {
      return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status })
    }
    console.error('[quiz]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
