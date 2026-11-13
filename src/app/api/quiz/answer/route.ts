import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withQuizContext } from '@/lib/quiz-route'
import { submitAnswer } from '@/lib/quiz-server'

const schema = z.object({
  questionId: z.string().uuid(),
  // null = se acabó el tiempo
  selectedIndex: z.number().int().min(0).max(10).nullable(),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  return withQuizContext(async (ctx) =>
    NextResponse.json({ result: await submitAnswer(ctx, body.questionId, body.selectedIndex) })
  )
}
