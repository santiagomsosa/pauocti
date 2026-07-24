import { getGuestSession } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { HomeContent } from './HomeContent'

export default async function InicioPage() {
  const session = await getGuestSession()
  const supabase = createServerClient()

  const [challengesRes, messagesRes, photosRes, photoCountsRes] = await Promise.all([
    supabase.from('challenges').select('*').order('created_at', { ascending: true }),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(2),
    supabase.from('photos').select('id'),
    supabase.from('photos').select('challenge_id').not('challenge_id', 'is', null),
  ])

  const countMap: Record<string, number> = {}
  for (const row of photoCountsRes.data ?? []) {
    if (row.challenge_id) countMap[row.challenge_id] = (countMap[row.challenge_id] ?? 0) + 1
  }

  const challenges = (challengesRes.data ?? []).map((c) => ({
    ...c,
    photo_count: countMap[c.id] ?? 0,
  }))

  return (
    <HomeContent
      guestName={session?.guestName ?? ''}
      challenges={challenges}
      messages={messagesRes.data ?? []}
      photoCount={photosRes.data?.length ?? 0}
    />
  )
}
