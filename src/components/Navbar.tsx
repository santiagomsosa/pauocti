'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Images, Heart, Trophy, Music, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LeafSprig } from '@/components/decorations'

const tabs = [
  { href: '/galeria', label: 'Galería', icon: Images },
  { href: '/muro', label: 'Muro', icon: Heart },
  { href: '/retos', label: 'Retos', icon: Trophy },
  { href: '/musica', label: 'Música', icon: Music },
]

interface NavbarProps {
  guestName: string
}

export function Navbar({ guestName }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Hasta luego, ' + guestName + '!')
    router.push('/')
  }

  return (
    <>
      {/* Header top */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-cream-200 px-4 py-3 flex items-center justify-between">
        <Link href="/galeria" className="flex items-center gap-1.5 font-script text-2xl text-stone-800">
          {process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'}
          <LeafSprig className="w-4 h-5 text-sage-400 -rotate-12" />
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
              <Icon className={cn('w-5 h-5', active && 'fill-ink-100')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
