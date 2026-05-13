'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, LogOut, Loader2, Users, Trophy, Images, Heart, Music } from 'lucide-react'
import type { Guest, Challenge, Photo, Message, MusicRequest } from '@/types'

export default function AdminPage() {
  const router = useRouter()

  // Guests
  const [guests, setGuests] = useState<Guest[]>([])
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestCode, setNewGuestCode] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newEmoji, setNewEmoji] = useState('📸')
  const [addingChallenge, setAddingChallenge] = useState(false)

  // Data
  const [photos, setPhotos] = useState<Photo[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [musicRequests, setMusicRequests] = useState<MusicRequest[]>([])

  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [g, c, p, m, r] = await Promise.all([
      fetch('/api/admin/guests').then((r) => r.json()),
      fetch('/api/admin/challenges').then((r) => r.json()),
      fetch('/api/photos').then((r) => r.json()),
      fetch('/api/messages').then((r) => r.json()),
      fetch('/api/music').then((r) => r.json()),
    ])
    setGuests(g.guests ?? [])
    setChallenges(c.challenges ?? [])
    setPhotos(p.photos ?? [])
    setMessages(m.messages ?? [])
    setMusicRequests(r.requests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newGuestName.trim() || !newGuestCode.trim()) return
    setAddingGuest(true)
    const res = await fetch('/api/admin/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGuestName.trim(), code: newGuestCode.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setGuests((prev) => [...prev, data.guest].sort((a, b) => a.name.localeCompare(b.name)))
      setNewGuestName('')
      setNewGuestCode('')
      toast.success('Invitado agregado')
    } else {
      toast.error(data.error)
    }
    setAddingGuest(false)
  }

  async function deleteGuest(id: string) {
    if (!confirm('¿Eliminar este invitado?')) return
    const res = await fetch(`/api/admin/guests?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGuests((prev) => prev.filter((g) => g.id !== id))
      toast.success('Invitado eliminado')
    }
  }

  async function addChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newDesc.trim()) return
    setAddingChallenge(true)
    const res = await fetch('/api/admin/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim(), emoji: newEmoji }),
    })
    const data = await res.json()
    if (res.ok) {
      setChallenges((prev) => [...prev, data.challenge])
      setNewTitle('')
      setNewDesc('')
      setNewEmoji('📸')
      toast.success('Reto creado')
    } else {
      toast.error(data.error)
    }
    setAddingChallenge(false)
  }

  async function deleteChallenge(id: string) {
    if (!confirm('¿Eliminar este reto?')) return
    const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setChallenges((prev) => prev.filter((c) => c.id !== id))
      toast.success('Reto eliminado')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-stone-800">
          Admin · {process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'}
        </h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-1" />
          Salir
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : (
          <Tabs defaultValue="guests">
            <TabsList className="grid grid-cols-5 mb-6 w-full">
              <TabsTrigger value="guests" className="gap-1">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invitados</span>
                <Badge className="text-[10px] px-1 py-0 h-4 ml-1">{guests.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Retos</span>
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-1">
                <Images className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fotos</span>
                <Badge className="text-[10px] px-1 py-0 h-4 ml-1">{photos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muro</span>
                <Badge className="text-[10px] px-1 py-0 h-4 ml-1">{messages.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-1">
                <Music className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Música</span>
                <Badge className="text-[10px] px-1 py-0 h-4 ml-1">{musicRequests.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Invitados */}
            <TabsContent value="guests" className="space-y-4">
              <form onSubmit={addGuest} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <h2 className="font-semibold text-stone-700">Agregar invitado</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombre</Label>
                    <Input
                      placeholder="Ej: María García"
                      value={newGuestName}
                      onChange={(e) => setNewGuestName(e.target.value)}
                      disabled={addingGuest}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Código</Label>
                    <Input
                      placeholder="Ej: MG001"
                      value={newGuestCode}
                      onChange={(e) => setNewGuestCode(e.target.value.toUpperCase())}
                      disabled={addingGuest}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={addingGuest || !newGuestName.trim() || !newGuestCode.trim()} size="sm">
                  {addingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Agregar</>}
                </Button>
              </form>

              <div className="bg-white rounded-xl shadow-sm divide-y">
                {guests.length === 0 ? (
                  <p className="p-4 text-sm text-stone-400 text-center">No hay invitados aún</p>
                ) : (
                  guests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-stone-800 text-sm">{g.name}</p>
                        <p className="text-xs text-stone-400 font-mono">{g.code}</p>
                      </div>
                      <button onClick={() => deleteGuest(g.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Retos */}
            <TabsContent value="challenges" className="space-y-4">
              <form onSubmit={addChallenge} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <h2 className="font-semibold text-stone-700">Crear reto</h2>
                <div className="flex gap-2">
                  <div className="space-y-1 w-20">
                    <Label>Emoji</Label>
                    <Input
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className="text-center text-lg"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label>Título</Label>
                    <Input
                      placeholder="Ej: Foto con un pelado"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      disabled={addingChallenge}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Descripción del reto..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    disabled={addingChallenge}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button type="submit" disabled={addingChallenge || !newTitle.trim() || !newDesc.trim()} size="sm">
                  {addingChallenge ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Crear reto</>}
                </Button>
              </form>

              <div className="space-y-2">
                {challenges.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">No hay retos creados aún</p>
                ) : (
                  challenges.map((c) => (
                    <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{c.emoji}</span>
                        <div>
                          <p className="font-medium text-stone-800 text-sm">{c.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{c.description}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteChallenge(c.id)} className="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Fotos */}
            <TabsContent value="photos">
              <div className="grid grid-cols-3 gap-2">
                {photos.length === 0 ? (
                  <p className="col-span-3 text-sm text-stone-400 text-center py-8">No hay fotos aún</p>
                ) : (
                  photos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                      <Image src={p.url} alt={p.guest_name} fill className="object-cover" sizes="150px" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                        <p className="text-white text-[10px] truncate">{p.guest_name}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Muro */}
            <TabsContent value="messages" className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-8">No hay mensajes aún</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-medium text-stone-800 text-sm">{m.guest_name}</span>
                      <span className="text-xs text-stone-400">
                        {new Date(m.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-stone-600 text-sm">{m.content}</p>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Música */}
            <TabsContent value="music" className="space-y-2">
              {musicRequests.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-8">No hay pedidos aún</p>
              ) : (
                musicRequests.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-800 text-sm">{r.song_name}</p>
                      <p className="text-xs text-stone-400">
                        {r.artist ? `${r.artist} · ` : ''}{r.guest_name}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-8 mx-3" />
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      {new Date(r.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
