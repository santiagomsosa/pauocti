import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { InvitationView } from '@/components/invitation/InvitationView'
import type { Guest } from '@/types'

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createServerClient()
  const { data: guest, error } = await supabase
    .from('guests')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (error || !guest) {
    notFound()
  }

  const settings = await getSettings()

  return <InvitationView guest={guest as Guest} settings={settings} />
}
