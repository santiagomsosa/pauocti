import { NextResponse } from 'next/server'
import { withQuizContext } from '@/lib/quiz-route'
import { buildStatus } from '@/lib/quiz-server'

export async function GET() {
  return withQuizContext(async (ctx) => NextResponse.json(await buildStatus(ctx)))
}
