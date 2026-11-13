import { NextResponse } from 'next/server'
import { withQuizContext } from '@/lib/quiz-route'
import { startNext } from '@/lib/quiz-server'

export async function POST() {
  return withQuizContext(async (ctx) => NextResponse.json({ state: await startNext(ctx) }))
}
