'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'
import { familyDisplayName, isPluralGuest } from '@/lib/guest'
import type { Guest, PlusOneInput } from '@/types'

interface RsvpFormProps {
  guest: Guest
  onSubmitted: (guest: Guest) => void
}

const inputClass =
  'w-full rounded-lg border border-stone-300/70 bg-white/40 px-3 py-2 text-sm outline-none backdrop-blur-sm focus:border-ink-300 focus:ring-2 focus:ring-ink-100 disabled:opacity-50'

function emptyPlusOne(): PlusOneInput {
  return { name: '', email: '', phone: '', rsvp_status: 'attending', dietary_restrictions: '' }
}

function preloadedPlusOnes(guest: Guest, pad: boolean): PlusOneInput[] {
  const preload: PlusOneInput[] = (guest.plus_ones_preload ?? []).slice(0, guest.max_plus_ones).map((p) => ({
    name: p.name,
    email: p.email,
    phone: p.phone,
    rsvp_status: 'attending',
    dietary_restrictions: '',
    preloaded: true,
  }))
  if (!pad) return preload
  while (preload.length < guest.max_plus_ones) preload.push(emptyPlusOne())
  return preload
}

export function RsvpForm({ guest, onSubmitted }: RsvpFormProps) {
  const isFamily = guest.invitation_type === 'family'
  const isPlural = isPluralGuest(guest)
  const [attending, setAttending] = useState<'attending' | 'declined' | null>(null)
  const [phone, setPhone] = useState(guest.phone ?? '')
  const [email, setEmail] = useState(guest.email ?? '')
  const [dietary, setDietary] = useState('')
  const [plusOnes, setPlusOnes] = useState<PlusOneInput[]>(() => preloadedPlusOnes(guest, isFamily))
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
    if (!isFamily && !attending) {
      toast.error('Indicá si vas a asistir')
      return
    }
    // Para familias, los integrantes que no asisten pueden dejarse sin datos
    const attendingPlusOnes = isFamily
      ? plusOnes.filter((p) => p.rsvp_status === 'attending' || p.name.trim())
      : plusOnes

    const needsName = isFamily
      ? (p: typeof plusOnes[0]) => p.rsvp_status === 'attending'
      : () => true
    if (attendingPlusOnes.some((p) => needsName(p) && !p.name.trim())) {
      toast.error(isFamily ? 'Completá el nombre de los integrantes que asisten' : 'Completá el nombre de todos los acompañantes')
      return
    }

    const needsContactInfo = isFamily || attending === 'attending'
    if (needsContactInfo && !phone.trim()) {
      toast.error('El teléfono es obligatorio')
      return
    }
    if (needsContactInfo && !email.trim()) {
      toast.error('El correo es obligatorio')
      return
    }
    if (attendingPlusOnes.some((p) => p.rsvp_status === 'attending' && !p.phone.trim())) {
      toast.error(isFamily ? 'El teléfono de cada integrante que asiste es obligatorio' : 'El teléfono de cada acompañante es obligatorio')
      return
    }
    if (attendingPlusOnes.some((p) => p.rsvp_status === 'attending' && !p.email.trim())) {
      toast.error(isFamily ? 'El correo de cada integrante que asiste es obligatorio' : 'El correo de cada acompañante es obligatorio')
      return
    }

    const rsvpStatus = isFamily
      ? attendingPlusOnes.some((p) => p.rsvp_status === 'attending')
        ? 'attending'
        : 'declined'
      : (attending as 'attending' | 'declined')

    setLoading(true)
    try {
      const res = await fetch(`/api/invitation/${guest.invite_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvp_status: rsvpStatus,
          phone,
          email,
          dietary_restrictions: dietary,
          plus_ones: attendingPlusOnes,
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
      className="max-w-md mx-auto rounded-3xl border border-ink-200/70 bg-ink-50/60 p-6 space-y-5 shadow-sm"
    >
      <div className="space-y-2 text-center">
        <p className="font-title text-xs uppercase tracking-[0.25em] text-ink-500">
          Confirmá tu asistencia
        </p>
        <p className="text-stone-700 leading-relaxed">
          {familyDisplayName(guest)}, nos encantaría compartir este día con {isPlural ? 'ustedes' : 'vos'}
        </p>
        {!isFamily && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <motion.button
              type="button"
              onClick={() => setAttending('attending')}
              disabled={loading}
              animate={attending === null ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={attending === null ? { repeat: Infinity, duration: 1.6 } : { duration: 0.2 }}
              className={`font-title flex items-center justify-center gap-1.5 rounded-full py-3 text-sm uppercase tracking-wide font-semibold border-2 transition ${
                attending === 'attending'
                  ? 'bg-ink-600 border-ink-600 text-white shadow-md'
                  : attending === 'declined'
                    ? 'bg-transparent border-stone-300 text-stone-500'
                    : 'bg-ink-500 border-ink-500 text-white shadow-md hover:bg-ink-600'
              }`}
            >
              {attending === 'attending' && <Check className="w-4 h-4" />}
              {isPlural ? '¡Sí, vamos!' : '¡Sí, voy!'}
            </motion.button>
            <button
              type="button"
              onClick={() => setAttending('declined')}
              disabled={loading}
              className={`font-title rounded-full py-3 text-sm uppercase tracking-wide font-semibold border-2 transition ${
                attending === 'declined'
                  ? 'bg-stone-600 border-stone-600 text-white'
                  : 'bg-transparent border-stone-300 text-stone-500 hover:border-stone-400'
              }`}
            >
              {isPlural ? 'No vamos a poder' : 'No voy a poder'}
            </button>
          </div>
        )}
      </div>

      {(isFamily || attending === 'attending') && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              {isFamily ? 'Teléfono de contacto' : 'Tu teléfono'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              placeholder="Ej: 11 1234 5678"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              {isFamily ? 'Correo de contacto' : 'Tu correo'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Ej: nombre@email.com"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {!isFamily && attending === 'attending' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">¿Alguna restricción alimentaria?</label>
          <textarea
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            disabled={loading}
            rows={2}
            placeholder="Ej: vegetariano, sin TACC, alergias..."
            className={`resize-none ${inputClass}`}
          />
        </div>
      )}

      {(isFamily || attending === 'attending') && guest.max_plus_ones > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              {isFamily ? 'Integrantes' : `Acompañantes (${plusOnes.length}/${guest.max_plus_ones})`}
            </p>
            {!isFamily && plusOnes.length < guest.max_plus_ones && (
              <button
                type="button"
                onClick={addPlusOne}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-600"
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
                className="rounded-xl border border-stone-200/70 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">
                    {isFamily ? `Integrante ${i + 1}` : `Acompañante ${i + 1}`}
                  </span>
                  {!isFamily && (
                    <button
                      type="button"
                      onClick={() => removePlusOne(i)}
                      disabled={loading}
                      className="text-stone-300 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={p.name}
                  onChange={(e) => updatePlusOne(i, { name: e.target.value })}
                  disabled={loading}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder={p.rsvp_status === 'attending' ? 'Correo *' : 'Correo (opcional)'}
                  value={p.email}
                  onChange={(e) => updatePlusOne(i, { email: e.target.value })}
                  disabled={loading}
                  className={inputClass}
                />
                <input
                  type="tel"
                  placeholder={p.rsvp_status === 'attending' ? 'Teléfono *' : 'Teléfono (opcional)'}
                  value={p.phone}
                  onChange={(e) => updatePlusOne(i, { phone: e.target.value })}
                  disabled={loading}
                  className={inputClass}
                />
                <select
                  value={p.rsvp_status}
                  onChange={(e) => updatePlusOne(i, { rsvp_status: e.target.value as 'attending' | 'declined' })}
                  disabled={loading}
                  className={inputClass}
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
                  className={inputClass}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (!isFamily && !attending)}
        className="font-title w-full rounded-full bg-ink-500 py-2.5 text-sm uppercase tracking-wide text-white transition hover:bg-ink-600 disabled:opacity-50"
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
