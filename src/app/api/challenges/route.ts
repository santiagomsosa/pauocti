import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession } from '@/lib/auth'

export async function GET() {
  const session = await getGuestSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar retos' }, { status: 500 })
  }

  // Contar fotos por reto
  const { data: counts } = await supabase
    .from('photos')
    .select('challenge_id')
    .not('challenge_id', 'is', null)

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    if (row.challenge_id) {
      countMap[row.challenge_id] = (countMap[row.challenge_id] ?? 0) + 1
    }
  }

  const result = challenges.map((c) => ({ ...c, photo_count: countMap[c.id] ?? 0 }))

  return NextResponse.json({ challenges: result })
}
