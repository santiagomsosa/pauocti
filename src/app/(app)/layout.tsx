import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import type { GuestSession } from '@/types'

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar guestName={session.guestName} />
      {/* pt para el header, pb para el bottom nav */}
      <main className="flex-1 pt-16 pb-20 px-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
