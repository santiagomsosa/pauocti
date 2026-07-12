'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Heart, Loader2, Send } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { HandDrawnUnderline } from '@/components/decorations'
import type { Message } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MuroPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => toast.error('Error al cargar los mensajes'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al enviar')
        return
      }
      setMessages((prev) => [data.message, ...prev])
      setContent('')
      toast.success('¡Mensaje enviado!')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="font-script text-3xl text-stone-800">Muro</h1>
        <HandDrawnUnderline className="w-14 h-3 text-sage-400 -mt-1" />
        <p className="text-sm text-stone-500 mt-1">Dejá tus buenos deseos para los novios</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          placeholder="Escribí tu mensaje para los novios..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
          maxLength={500}
          rows={3}
          className="resize-none border-cream-200 focus-visible:ring-ink-300"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{content.length}/500</span>
          <Button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-ink-500 hover:bg-ink-600 text-white"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publicar
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Lista de mensajes */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse space-y-2">
              <div className="h-3 bg-stone-100 rounded w-1/3" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center py-16 space-y-3 text-center">
          <Heart className="w-12 h-12 text-stone-300" />
          <p className="text-stone-500">¡Sé el primero en dejar un mensaje!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl p-4 shadow-sm border border-cream-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-ink-500">
                  {msg.guest_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-800 text-sm truncate">
                      {msg.guest_name}
                    </span>
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm mt-1 leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
