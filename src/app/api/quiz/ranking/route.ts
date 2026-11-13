import { NextResponse } from 'next/server'
import { withQuizContext } from '@/lib/quiz-route'
import { buildRanking } from '@/lib/quiz-server'

export async function GET() {
  return withQuizContext(async (ctx) => NextResponse.json({ ranking: await buildRanking(ctx) }))
}
