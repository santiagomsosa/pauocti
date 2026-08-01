import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { ADMIN_COOKIE } from '@/lib/auth'
import { InvitationView } from '@/components/invitation/InvitationView'
import type { Guest, GuestOpen } from '@/types'

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

  // No contamos como "apertura" cuando el admin abre el link para previsualizarlo
  const cookieStore = await cookies()
  if (!cookieStore.get(ADMIN_COOKIE)) {
    try {
      const opens: GuestOpen[] = Array.isArray(guest.opens) ? guest.opens : []
      await supabase
        .from('guests')
        .update({ opens: [...opens, { at: new Date().toISOString() }] })
        .eq('id', guest.id)
    } catch {
      // El registro de apertura no debe romper el render de la invitación
    }
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
