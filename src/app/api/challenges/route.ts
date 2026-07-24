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

  // Contar fotos por reto (todas) y fotos del invitado actual
  const [{ data: counts }, { data: mine }] = await Promise.all([
    supabase.from('photos').select('challenge_id').not('challenge_id', 'is', null),
    supabase
      .from('photos')
      .select('challenge_id')
      .eq('guest_id', session.guestId)
      .not('challenge_id', 'is', null),
  ])

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    if (row.challenge_id) countMap[row.challenge_id] = (countMap[row.challenge_id] ?? 0) + 1
  }

  const completedSet = new Set((mine ?? []).map((r) => r.challenge_id))

  const result = challenges.map((c) => ({
    ...c,
    photo_count: countMap[c.id] ?? 0,
    completed_by_me: completedSet.has(c.id),
  }))

  const completedCount = completedSet.size

  return NextResponse.json({ challenges: result, completedCount })
}
