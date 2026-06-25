import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/settings'
import { z } from 'zod'

const schema = z.object({
  wedding_datetime: z.string().trim().optional().or(z.literal('')),
  couple_names: z.string().max(100).trim().optional().or(z.literal('')),
  venue: z.string().max(200).trim().optional().or(z.literal('')),
  venue_address: z.string().max(300).trim().optional().or(z.literal('')),
  venue_map_url: z.string().max(500).trim().optional().or(z.literal('')),
})

export async function GET() {
  const settings = await getSettings()
  return NextResponse.json({ settings })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    await saveSettings(data)
    const settings = await getSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
