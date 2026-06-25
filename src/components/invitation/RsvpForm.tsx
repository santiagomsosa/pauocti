'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { Guest, PlusOneInput } from '@/types'

interface RsvpFormProps {
  guest: Guest
  onSubmitted: (guest: Guest) => void
}

function emptyPlusOne(): PlusOneInput {
  return { name: '', email: '', rsvp_status: 'attending', dietary_restrictions: '' }
}

export function RsvpForm({ guest, onSubmitted }: RsvpFormProps) {
  const [attending, setAttending] = useState<'attending' | 'declined' | null>(null)
  const [dietary, setDietary] = useState('')
  const [plusOnes, setPlusOnes] = useState<PlusOneInput[]>([])
  const [loading, setLoading] = useState(false)

  function addPlusOne() {
    if (plusOnes.length >= guest.max_plus_ones) return
    setPlusOnes((prev) => [...prev, emptyPlusOne()])
  }

  function updatePlusOne(index: number, patch: Partial<PlusOneInput>) {
    setPlusOnes((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function removePlusOne(index: number) {
    setPlusOnes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!attending) {
      toast.error('Indicá si vas a asistir')
      return
    }
    if (plusOnes.some((p) => !p.name.trim())) {
      toast.error('Completá el nombre de todos los acompañantes')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invitation/${guest.invite_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvp_status: attending,
          dietary_restrictions: dietary,
          plus_ones: plusOnes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al confirmar')
        return
      }
      toast.success('¡Gracias por confirmar!')
      onSubmitted(data.guest)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md p-6 space-y-5"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">¿Vas a acompañarnos?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAttending('attending')}
            disabled={loading}
            className={`rounded-lg py-2.5 text-sm font-medium border transition ${
              attending === 'attending'
                ? 'bg-terracotta-400 border-terracotta-400 text-white'
                : 'border-stone-200 text-stone-600 hover:border-terracotta-300'
            }`}
          >
            ¡Sí, voy!
          </button>
          <button
            type="button"
            onClick={() => setAttending('declined')}
            disabled={loading}
            className={`rounded-lg py-2.5 text-sm font-medium border transition ${
              attending === 'declined'
                ? 'bg-stone-600 border-stone-600 text-white'
                : 'border-stone-200 text-stone-600 hover:border-stone-400'
            }`}
          >
            No puedo ir
          </button>
        </div>
      </div>

      {attending === 'attending' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">¿Alguna restricción alimentaria?</label>
          <textarea
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            disabled={loading}
            rows={2}
            placeholder="Ej: vegetariano, sin TACC, alergias..."
            className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
          />
        </div>
      )}

      {attending === 'attending' && guest.max_plus_ones > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              Acompañantes ({plusOnes.length}/{guest.max_plus_ones})
            </p>
            {plusOnes.length < guest.max_plus_ones && (
              <button
                type="button"
                onClick={addPlusOne}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-terracotta-500 hover:text-terracotta-600"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            )}
          </div>

          <AnimatePresence>
            {plusOnes.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-cream-50 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">Acompañante {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePlusOne(i)}
                    disabled={loading}
                    className="text-stone-300 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={p.name}
                  onChange={(e) => updatePlusOne(i, { name: e.target.value })}
                  disabled={loading}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
                />
                <input
                  type="email"
                  placeholder="Correo (opcional)"
                  value={p.email}
                  onChange={(e) => updatePlusOne(i, { email: e.target.value })}
                  disabled={loading}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
                />
                <select
                  value={p.rsvp_status}
                  onChange={(e) => updatePlusOne(i, { rsvp_status: e.target.value as 'attending' | 'declined' })}
                  disabled={loading}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
                >
                  <option value="attending">Asistirá</option>
                  <option value="declined">No asistirá</option>
                </select>
                <input
                  type="text"
                  placeholder="Restricción alimentaria (opcional)"
                  value={p.dietary_restrictions}
                  onChange={(e) => updatePlusOne(i, { dietary_restrictions: e.target.value })}
                  disabled={loading}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !attending}
        className="w-full rounded-lg bg-terracotta-400 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-500 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </span>
        ) : (
          'Confirmar'
        )}
      </button>
    </motion.form>
  )
}
