import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminHandler } from '@/lib/quiz-admin-route'
import { createQuestion, getAdminOverview, updateQuestion } from '@/lib/quiz-admin'

const fields = {
  prompt: z.string().trim().min(3).max(300),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
  correct_index: z.number().int().min(0).max(5),
  wrong_message: z.string().trim().max(200).nullable().optional(),
  is_active: z.boolean().optional(),
}

export async function POST(request: NextRequest) {
  return adminHandler(async () => {
    await createQuestion(z.object(fields).parse(await request.json()))
    return NextResponse.json(await getAdminOverview())
  })
}

export async function PATCH(request: NextRequest) {
  return adminHandler(async () => {
    const { id, ...patch } = z.object({ id: z.string().uuid() }).extend(z.object(fields).partial().shape).parse(await request.json())
    await updateQuestion(id, patch)
    return NextResponse.json(await getAdminOverview())
  })
}
