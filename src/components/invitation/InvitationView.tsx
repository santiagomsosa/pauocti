'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { WatercolorBranch, GoldDots, HandDrawnUnderline } from '@/components/decorations'
import { Countdown } from '@/components/invitation/Countdown'
import { RsvpForm } from '@/components/invitation/RsvpForm'
import { FrozenInvitation } from '@/components/invitation/FrozenInvitation'
import type { Guest, Settings } from '@/types'

export function InvitationView({ guest: initialGuest, settings }: { guest: Guest; settings: Settings }) {
  const [guest, setGuest] = useState(initialGuest)
  const coupleNames = settings.couple_names ?? 'Pau & Octi'
  const dateLabel = settings.wedding_datetime
    ? new Date(settings.wedding_datetime).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-terracotta-50 via-cream-50 to-sage-50">
      <WatercolorBranch className="absolute -top-8 -left-12 w-56 h-56 opacity-90 pointer-events-none" />
      <WatercolorBranch className="absolute top-1/2 -right-16 w-64 h-64 rotate-90 opacity-70 pointer-events-none" />
      <GoldDots className="absolute top-16 right-6 w-24 h-14 pointer-events-none" />
      <GoldDots className="absolute bottom-10 left-8 w-24 h-14 rotate-180 pointer-events-none" />

      <div className="relative max-w-md mx-auto px-4 py-12 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-3"
        >
          <p className="text-sm uppercase tracking-widest text-sage-500">Nos casamos</p>
          <h1 className="font-script text-6xl text-stone-800">{coupleNames}</h1>
          <HandDrawnUnderline className="w-28 h-5 mx-auto text-terracotta-300" />
          {dateLabel && <p className="text-stone-500">{dateLabel}</p>}
          <p className="text-sm text-stone-400">Querida/o {guest.name}, esta es tu invitación</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Countdown weddingDatetime={settings.wedding_datetime} />
        </motion.div>

        {settings.venue && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-sm p-5 text-center space-y-1"
          >
            <p className="text-xs uppercase tracking-wide text-sage-500">Lugar</p>
            <p className="font-medium text-stone-800">{settings.venue}</p>
            {settings.venue_address && <p className="text-sm text-stone-500">{settings.venue_address}</p>}
            {settings.venue_map_url && (
              <a
                href={settings.venue_map_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-terracotta-500 hover:text-terracotta-600 mt-1"
              >
                Ver ubicación en el mapa
              </a>
            )}
          </motion.div>
        )}

        {guest.rsvp_submitted_at ? (
          <FrozenInvitation guest={guest} />
        ) : (
          <RsvpForm guest={guest} onSubmitted={setGuest} />
        )}
      </div>
    </div>
  )
}
