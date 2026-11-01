import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { WaitingRoom } from '@/components/WaitingRoom'
import { WatercolorCorner } from '@/components/decorations'
import { canAccessApp, getAppOpensAt } from '@/lib/app-access'
import { isPluralGuest } from '@/lib/guest'
import { getSettings } from '@/lib/settings'
import { createServerClient } from '@/lib/supabase/server'
import type { Guest, GuestSession } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('guest_session')?.value

  let session: GuestSession | null = null
  if (raw) {
    try {
      session = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
    } catch {
      session = null
    }
  }

  if (!session) {
    redirect('/')
  }

  // Hasta la hora de la fiesta solo entran los invitados con acceso anticipado (Early Bird).
  // El permiso se lee de la base en cada carga: activarlo o quitarlo aplica al instante.
  const [settings, guestRes] = await Promise.all([
    getSettings(),
    createServerClient()
      .from('guests')
      .select('early_access, invitation_type, max_plus_ones')
      .eq('id', session.guestId)
      .maybeSingle(),
  ])
  const guest = guestRes.data as Pick<Guest, 'early_access' | 'invitation_type' | 'max_plus_ones'> | null

  if (!canAccessApp(guest, settings)) {
    return (
      <WaitingRoom
        guestName={session.guestName}
        coupleNames={settings.couple_names ?? process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'}
        opensAt={getAppOpensAt(settings)!.toISOString()}
        plural={guest ? isPluralGuest(guest) : false}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <WatercolorCorner variant="hojas" className="absolute top-14 -left-10 w-48 md:w-72 h-auto opacity-60" />
        <WatercolorCorner variant="flores" className="absolute bottom-16 -right-6 w-52 md:w-72 h-auto rotate-180 opacity-75" />
      </div>
      <Navbar guestName={session.guestName} />
      {/* pt para el header, pb para el bottom nav */}
      <main className="relative flex-1 pt-16 pb-20 px-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
