'use client'

import { motion } from 'motion/react'
import { Phone, Utensils } from 'lucide-react'
import type { Guest } from '@/types'

interface Attendee {
  name: string
  phone: string | null
  dietary: string | null
}

export function FrozenInvitation({ guest }: { guest: Guest }) {
  const attending = guest.rsvp_status === 'attending'
  const isFamily = guest.invitation_type === 'family'

  const attendees: Attendee[] = []
  if (attending && !isFamily) {
    attendees.push({ name: guest.name, phone: guest.phone, dietary: guest.dietary_restrictions })
  }
  for (const p of guest.plus_ones ?? []) {
    if (p.rsvp_status === 'attending') {
      attendees.push({ name: p.name, phone: p.phone, dietary: p.dietary_restrictions })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto text-center space-y-4"
    >
      <p className="font-title text-xs uppercase tracking-[0.25em] text-ink-500">
        {attending ? 'Asistencia confirmada' : 'Respuesta registrada'}
      </p>
      <p className="font-script text-4xl text-ink-600">
        {attending ? '¡Nos vemos en la boda!' : 'Gracias por avisarnos'}
      </p>

      {attendees.length > 0 && (
        <div className="mx-auto max-w-xs space-y-2 text-left">
          {attendees.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white/50 px-3 py-2.5"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-200 text-xs font-semibold text-rose-600">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-ink-600 truncate">{a.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                  {a.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {a.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    {a.dietary || 'Sin restricciones'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
