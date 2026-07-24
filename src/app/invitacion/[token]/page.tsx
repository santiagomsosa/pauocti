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

  const { data: plusOnes } = await supabase
    .from('guests')
    .select('*')
    .eq('parent_guest_id', guest.id)

  const settings = await getSettings()

  let tableName: string | null = null
  if (guest.table_id) {
    const { data: tableData } = await supabase
      .from('wedding_tables')
      .select('name')
      .eq('id', guest.table_id)
      .single()
    tableName = tableData?.name ?? null
  }

  return (
    <InvitationView
      guest={{ ...guest, plus_ones: plusOnes ?? [] } as Guest}
      settings={settings}
      tableName={tableName}
    />
  )
}
