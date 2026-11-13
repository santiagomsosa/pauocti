import { NextResponse } from 'next/server'
import { z } from 'zod'
import { QuizError } from '@/lib/quiz-server'

/** Ejecuta un handler de admin traduciendo errores de validación y de la trivia a respuestas JSON. */
export async function adminHandler(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof QuizError) {
      return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('[admin/quiz]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
