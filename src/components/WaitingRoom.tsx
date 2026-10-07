'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { WatercolorBranch, GoldDots, BotanicalDivider } from '@/components/decorations'
import { Countdown } from '@/components/invitation/Countdown'

interface Props {
  guestName: string
  coupleNames: string
  /** Momento (ISO) en que se abre la app: la cuenta regresiva llega a cero ahí. */
  opensAt: string
  plural: boolean
}

function Feature({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <Image src={`/invitacion/iconos/${icon}.png`} alt="" width={56} height={56} className="w-14 h-14 shrink-0 object-contain" />
      <div className="min-w-0">
        <p className="font-title text-sm font-semibold uppercase tracking-wide text-ink-600">{title}</p>
        <p className="text-sm leading-relaxed text-stone-600">{children}</p>
      </div>
    </div>
  )
}

export function WaitingRoom({ guestName, coupleNames, opensAt, plural }: Props) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const firstName = guestName.split(' ')[0]
  const v = (singular: string, pluralForm: string) => (plural ? pluralForm : singular)

  // Al llegar la hora la app se abre sola. Se consulta cada pocos segundos por si el
  // reloj del dispositivo y el del servidor no coinciden justo.
  useEffect(() => {
    const target = new Date(opensAt).getTime()
    const id = setInterval(() => {
      if (Date.now() >= target) router.refresh()
    }, 5000)
    return () => clearInterval(id)
  }, [opensAt, router])

  async function logout() {
    setLeaving(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-cream-100 to-sage-50 px-4 py-10 font-invite">
      <WatercolorBranch className="absolute -top-6 -left-10 w-48 h-48 pointer-events-none" />
      <WatercolorBranch className="absolute -bottom-10 -right-12 w-56 h-56 rotate-180 pointer-events-none" />
      <GoldDots className="absolute top-10 right-6 w-24 h-14 pointer-events-none" />

      <div className="relative w-full max-w-md space-y-7 text-center">
        <div className="space-y-2">
          <h1 className="font-script text-5xl text-ink-600">{coupleNames}</h1>
          <p className="text-lg text-stone-600">
            Hola, <span className="font-medium text-stone-800">{firstName}</span>
          </p>
        </div>

        <BotanicalDivider className="w-40 h-5 mx-auto" />

        <Countdown weddingDatetime={opensAt} />

        <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-sm border border-cream-200 p-5 space-y-5">
          <p className="text-sm leading-relaxed text-stone-600">
            ¡Falta cada vez menos! La app de la boda se abre cuando empieza la fiesta. Ese día {v('vas', 'van')} a poder:
          </p>
          <div className="space-y-4">
            <Feature icon="disco" title="Trivia">
              Poner a prueba cuánto {v('conocés', 'conocen')} a los novios y competir con el resto de los invitados.
            </Feature>
            <Feature icon="camara" title="Retos">
              Cumplir desafíos durante la noche: {v('sacá', 'saquen')} la foto, {v('subila', 'súbanla')} a la app y {v('tachalo', 'táchenlo')} de la lista.
            </Feature>
            <Feature icon="sparklers" title="Premios">
              Los que más puntos sumen se llevan premios.
            </Feature>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Además {v('vas', 'van')} a poder subir fotos a la galería, dejarnos mensajes en el muro y pedir canciones.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 disabled:opacity-50"
        >
          ¿No sos {firstName}? Salir
        </button>
      </div>
    </div>
  )
}
