import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession, isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const challengeId = searchParams.get('challengeId')

  const supabase = createServerClient()
  let query = supabase
    .from('photos')
    .select('*, challenge:challenges(id, title, emoji)')
    .order('created_at', { ascending: false })

  if (challengeId) {
    query = query.eq('challenge_id', challengeId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Error al cargar fotos' }, { status: 500 })
  }

  // `mine` le dice a la app qué fotos puede borrar este invitado.
  const session = await getGuestSession()
  const photos = data.map((photo) => ({ ...photo, mine: !!session && photo.guest_id === session.guestId }))

  return NextResponse.json({ photos })
}
