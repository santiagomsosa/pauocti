'use client'

import { motion } from 'motion/react'
import type { Guest } from '@/types'

export function FrozenInvitation({ guest }: { guest: Guest }) {
  const attending = guest.rsvp_status === 'attending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-4"
    >
      <p className="text-sm text-stone-500">Ya confirmaste tu asistencia</p>
      <p className="font-script text-4xl text-stone-800">
        {attending ? '¡Nos vemos en la boda!' : 'Gracias por avisarnos'}
      </p>

      <div className="text-left mx-auto max-w-xs space-y-1.5 text-sm text-stone-600">
        <p>
          <span className="font-medium text-stone-700">Asistencia:</span> {attending ? 'Confirmada' : 'No asistirá'}
        </p>
        {guest.dietary_restrictions && (
          <p>
            <span className="font-medium text-stone-700">Restricción alimentaria:</span>{' '}
            {guest.dietary_restrictions}
          </p>
        )}
        {guest.plus_ones && guest.plus_ones.length > 0 && (
          <p>
            <span className="font-medium text-stone-700">Acompañantes:</span>{' '}
            {guest.plus_ones.map((p) => p.name).join(', ')}
          </p>
        )}
      </div>
    </motion.div>
  )
}
