'use client'

import Link from 'next/link'
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
      className="bg-white rounded-2xl shadow-md p-6 space-y-4 text-center"
    >
      <p className="text-sm text-stone-500">Ya confirmaste tu asistencia</p>
      <p className="font-script text-3xl text-stone-800">
        {attending ? '¡Nos vemos en la boda!' : 'Gracias por avisarnos'}
      </p>

      <div className="text-left bg-cream-50 rounded-xl p-4 space-y-1.5 text-sm text-stone-600">
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

      <div className="border-t border-stone-100 pt-4 space-y-2">
        <p className="text-xs text-stone-400">Tu código de acceso a la app</p>
        <p className="font-mono text-lg tracking-widest text-terracotta-500">{guest.code}</p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center justify-center w-full rounded-lg bg-terracotta-400 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-500"
      >
        Entrar a la app
      </Link>
    </motion.div>
  )
}
