import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { ADMIN_COOKIE } from '@/lib/auth'
import { InvitationView } from '@/components/invitation/InvitationView'
import type { Guest, GuestOpen } from '@/types'

// Bots que generan la vista previa del link al compartirlo por chat/redes: no son
// visitas reales del invitado y no deben contar como "apertura".
const LINK_PREVIEW_BOT_PATTERN =
  /whatsapp|facebookexternalhit|facebot|telegrambot|slackbot|twitterbot|linkedinbot|discordbot|skypeuripreview|pinterest|embedly|quora link preview|outbrain|w3c_validator|redditbot|applebot|bot\/|crawler|spider|preview/i

// Evita que recargas/reintentos del mismo dispositivo en un lapso corto se cuenten
// como aperturas distintas.
const MIN_MS_BETWEEN_OPENS = 5 * 60 * 1000

function wasOpenedRecently(opens: GuestOpen[]): boolean {
  if (opens.length === 0) return false
  const lastOpenAt = new Date(opens[opens.length - 1].at).getTime()
  return Date.now() - lastOpenAt < MIN_MS_BETWEEN_OPENS
}

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

  // No contamos como "apertura" cuando el admin abre el link para previsualizarlo,
  // ni cuando el request viene de un bot de preview de links, ni si ya se registró
  // una apertura hace muy poco tiempo.
  const cookieStore = await cookies()
  const headerStore = await headers()
  const userAgent = headerStore.get('user-agent') ?? ''
  const isPreviewBot = LINK_PREVIEW_BOT_PATTERN.test(userAgent)

  const opens: GuestOpen[] = Array.isArray(guest.opens) ? guest.opens : []

  if (!cookieStore.get(ADMIN_COOKIE) && !isPreviewBot && !wasOpenedRecently(opens)) {
    try {
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
