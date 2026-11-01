'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { WatercolorCorner } from '@/components/decorations'

export function LoginForm({
  initialCode,
  coupleNames,
  weddingDate,
}: {
  initialCode: string
  coupleNames: string
  weddingDate: string
}) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  // Si el link del correo trae el código, el foco queda en el botón: solo falta apretar "Entrar".
  useEffect(() => {
    if (initialCode) submitRef.current?.focus()
  }, [initialCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) { toast.error('Ingresá el código'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al ingresar')
        return
      }
      router.push('/inicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-cream-100 to-sage-50 px-4">
      <WatercolorCorner variant="hojas" className="absolute top-0 left-0 w-64 md:w-96 h-auto" />
      <WatercolorCorner variant="flores" className="absolute bottom-0 right-0 w-60 md:w-80 h-auto rotate-180" />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-script text-5xl text-stone-800">{coupleNames}</h1>
          {weddingDate && <p className="text-stone-500 text-sm">{weddingDate}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <p className="text-center text-stone-500 text-sm">
            Ingresá el código de tu invitación
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-medium text-stone-700">
                Código de invitación
              </label>
              <input
                id="code"
                type="text"
                placeholder="Ej: ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                autoComplete="off"
                autoFocus={!initialCode}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-center text-base font-mono tracking-[0.3em] outline-none focus:border-ink-300 focus:ring-2 focus:ring-ink-100 disabled:opacity-50"
              />
            </div>

            <button
              ref={submitRef}
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink-500 py-2.5 text-sm font-medium text-white transition hover:bg-ink-600 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                '¡Entrar a la fiesta!'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400">El código está en tu invitación</p>
      </div>
    </div>
  )
}
