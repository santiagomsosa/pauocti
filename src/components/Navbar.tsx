'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Images, Heart, Trophy, Music, LogOut, Brain } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function NavCoupleNames({ names }: { names: string }) {
  const parts = names.split(/\s*&\s*/)
  if (parts.length === 2) {
    return (
      <span>
        {parts[0]}<span className="text-rose-400"> &amp; </span>{parts[1]}
      </span>
    )
  }
  return <span>{names}</span>
}

const tabs = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/galeria', label: 'Galería', icon: Images },
  { href: '/muro', label: 'Muro', icon: Heart },
  { href: '/trivia', label: 'Trivia', icon: Brain },
  { href: '/retos', label: 'Desafíos', icon: Trophy },
  { href: '/musica', label: 'Música', icon: Music },
]

interface NavbarProps {
  guestName: string
}

const QUIZ_POLL_MS = 60_000
const QUIZ_CHANGED_EVENT = 'quiz:changed'

/**
 * Consulta el estado liviano de la trivia cada minuto, al volver a la pestaña y al navegar.
 * Devuelve cuántas preguntas liberadas quedan sin responder (punto rojo) y avisa con un
 * toast la primera vez que se detecta una tanda nueva.
 */
function useQuizPending(guestName: string): number {
  const pathname = usePathname()
  const router = useRouter()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    const storageKey = `quiz_seen_round:${guestName}`

    function announce(releasedRounds: number, pendingCount: number) {
      let seen = 0
      try {
        seen = Number(localStorage.getItem(storageKey) ?? 0)
      } catch {}
      if (releasedRounds <= seen) return
      try {
        localStorage.setItem(storageKey, String(releasedRounds))
      } catch {}
      if (pendingCount > 0 && !window.location.pathname.startsWith('/trivia')) {
        toast('¡Salió una nueva tanda de la trivia! 🎉', {
          action: { label: 'Jugar', onClick: () => router.push('/trivia') },
        })
      }
    }

    async function check() {
      try {
        const res = await fetch('/api/quiz/status', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data: { status: string; releasedRounds: number; pendingCount: number } = await res.json()
        if (cancelled) return
        const open = data.status === 'open'
        setPending(open ? data.pendingCount : 0)
        if (open) announce(data.releasedRounds, data.pendingCount)
      } catch {
        // sin conexión: se reintenta en el próximo ciclo
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }

    check()
    const timer = setInterval(check, QUIZ_POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    // La pantalla de Trivia avisa cuando el invitado responde, para actualizar el punto rojo al instante
    window.addEventListener(QUIZ_CHANGED_EVENT, check)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(QUIZ_CHANGED_EVENT, check)
    }
  }, [pathname, guestName, router])

  return pending
}

export function Navbar({ guestName }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const quizPending = useQuizPending(guestName)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Hasta luego, ' + guestName + '!')
    router.push('/')
  }

  return (
    <>
      {/* Header top */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-cream-200 px-4 py-3 flex items-center justify-between">
        <Link href="/inicio" className="flex items-center gap-1.5 font-script text-2xl text-stone-800">
          <NavCoupleNames names={process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'} />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 hidden sm:block">{guestName}</span>
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-ink-500 transition-colors"
            aria-label="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-200 flex safe-area-pb">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                active ? 'text-ink-500' : 'text-stone-400 hover:text-stone-600'
              )}
            >
              <span className="relative">
                <Icon className={cn('w-5 h-5', active && 'fill-ink-100')} />
                {href === '/trivia' && quizPending > 0 && (
                  <span
                    className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                    aria-label="Hay preguntas nuevas"
                  />
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
