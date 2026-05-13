'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Heart, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const coupleNames = process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'
  const weddingDate = process.env.NEXT_PUBLIC_WEDDING_DATE ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Ingresá tu nombre'); return }
    if (!code.trim()) { toast.error('Ingresá el código'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-white rounded-full p-3 shadow-sm">
              <Heart className="w-8 h-8 text-rose-400 fill-rose-200" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-800">{coupleNames}</h1>
          {weddingDate && <p className="text-stone-500 text-sm">{weddingDate}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <p className="text-center text-stone-500 text-sm">
            Ingresá tu nombre y el código de tu invitación
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-stone-700">
                Tu nombre
              </label>
              <input
                id="name"
                type="text"
                placeholder="Ej: María García"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
              />
            </div>

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
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-rose-400 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
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
