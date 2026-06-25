'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { WatercolorBranch, GoldDots } from '@/components/decorations'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const coupleNames = process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'
  const weddingDate = process.env.NEXT_PUBLIC_WEDDING_DATE ?? ''

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
      router.push('/galeria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-terracotta-100 via-cream-100 to-sage-50 px-4">
      <WatercolorBranch className="absolute -top-6 -left-10 w-48 h-48 pointer-events-none" />
      <WatercolorBranch className="absolute -bottom-10 -right-12 w-56 h-56 rotate-180 pointer-events-none" />
      <GoldDots className="absolute top-10 right-6 w-24 h-14 pointer-events-none" />

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
                autoFocus
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-center text-base font-mono tracking-[0.3em] outline-none focus:border-terracotta-300 focus:ring-2 focus:ring-terracotta-100 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-terracotta-400 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-500 disabled:opacity-50"
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
