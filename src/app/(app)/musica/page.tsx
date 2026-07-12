'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Music, Loader2, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { HandDrawnUnderline } from '@/components/decorations'
import type { MusicRequest } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MusicaPage() {
  const [requests, setRequests] = useState<MusicRequest[]>([])
  const [songName, setSongName] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/music')
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []))
      .catch(() => toast.error('Error al cargar los pedidos'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!songName.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_name: songName.trim(), artist: artist.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al enviar el pedido')
        return
      }
      setRequests((prev) => [data.request, ...prev])
      setSongName('')
      setArtist('')
      toast.success('¡Pedido enviado al DJ!')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="font-script text-3xl text-stone-800">Pedidos de música</h1>
        <HandDrawnUnderline className="w-14 h-3 text-sage-400 -mt-1" />
        <p className="text-sm text-stone-500 mt-1">Pedile una canción al DJ</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSend} className="bg-white rounded-xl p-4 shadow-sm border border-cream-200 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="song">Canción *</Label>
          <Input
            id="song"
            placeholder="Nombre de la canción"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            disabled={sending}
            className="border-stone-200 focus-visible:ring-ink-300"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="artist">Artista (opcional)</Label>
          <Input
            id="artist"
            placeholder="Nombre del artista"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            disabled={sending}
            className="border-stone-200 focus-visible:ring-ink-300"
          />
        </div>
        <Button
          type="submit"
          disabled={sending || !songName.trim()}
          className="w-full bg-ink-500 hover:bg-ink-600 text-white"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Pedir canción
            </>
          )}
        </Button>
      </form>

      {/* Lista */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-stone-600">
          {requests.length} pedido{requests.length !== 1 ? 's' : ''} enviado{requests.length !== 1 ? 's' : ''}
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 animate-pulse h-14" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center py-12 space-y-3 text-center">
            <Music className="w-12 h-12 text-stone-300" />
            <p className="text-stone-500">¡Sé el primero en pedir una canción!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl p-3 shadow-sm border border-cream-200 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-ink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm truncate">{req.song_name}</p>
                  <div className="flex items-center gap-2">
                    {req.artist && (
                      <span className="text-xs text-stone-500 truncate">{req.artist}</span>
                    )}
                    <span className="text-xs text-stone-400">· {req.guest_name}</span>
                  </div>
                </div>
                <span className="text-xs text-stone-400 flex-shrink-0">{formatDate(req.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
