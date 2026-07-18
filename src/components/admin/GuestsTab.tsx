'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, Mail, Phone, Pencil, Check, X, Send } from 'lucide-react'
import type { Guest } from '@/types'

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.85.503 3.585 1.379 5.076L2 22l5.075-1.352A9.947 9.947 0 0 0 12.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 18.164a8.13 8.13 0 0 1-4.15-1.137l-.298-.177-3.012.801.804-2.936-.194-.302a8.135 8.135 0 0 1-1.253-4.35c0-4.494 3.657-8.15 8.15-8.15 4.494 0 8.15 3.656 8.15 8.15s-3.656 8.15-8.15 8.15z" />
    </svg>
  )
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function shareViaWhatsapp(guest: Guest) {
  if (!guest.invite_token) return
  const url = `${window.location.origin}/invitacion/${guest.invite_token}`
  const text = `¡Hola ${guest.name}! Te invitamos a nuestra boda. Podés ver tu invitación y confirmar tu asistencia acá: ${url}`

  if (navigator.share && isMobileDevice()) {
    navigator.share({ text }).catch(() => {})
  } else {
    const digits = guest.phone?.replace(/\D/g, '') ?? ''
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank')
  }
}

const STATUS_LABEL: Record<Guest['rsvp_status'], string> = {
  pending: 'Pendiente',
  attending: 'Asiste',
  declined: 'No asiste',
}

const STATUS_VARIANT: Record<Guest['rsvp_status'], string> = {
  pending: 'bg-stone-100 text-stone-500',
  attending: 'bg-sage-100 text-sage-600',
  declined: 'bg-rose-100 text-rose-600',
}

interface GuestsTabProps {
  guests: Guest[]
  setGuests: (updater: (prev: Guest[]) => Guest[]) => void
}

export function GuestsTab({ guests, setGuests }: GuestsTabProps) {
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestCode, setNewGuestCode] = useState('')
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [newGuestPhone, setNewGuestPhone] = useState('')
  const [newGuestPlusOnes, setNewGuestPlusOnes] = useState('0')
  const [addingGuest, setAddingGuest] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPlusOnes, setEditPlusOnes] = useState('0')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newGuestName.trim() || !newGuestCode.trim() || !newGuestPhone.trim()) return
    setAddingGuest(true)
    const res = await fetch('/api/admin/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newGuestName.trim(),
        code: newGuestCode.trim(),
        email: newGuestEmail.trim(),
        phone: newGuestPhone.trim(),
        max_plus_ones: Number(newGuestPlusOnes) || 0,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setGuests((prev) =>
        [...prev, { ...data.guest, plus_ones: [] }].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewGuestName('')
      setNewGuestCode('')
      setNewGuestEmail('')
      setNewGuestPhone('')
      setNewGuestPlusOnes('0')
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

  function startEdit(guest: Guest) {
    setEditingId(guest.id)
    setEditEmail(guest.email ?? '')
    setEditPhone(guest.phone ?? '')
    setEditPlusOnes(String(guest.max_plus_ones))
  }

  async function saveEdit(id: string) {
    if (!editPhone.trim()) {
      toast.error('El teléfono es obligatorio')
      return
    }
    setBusyId(id)
    const res = await fetch('/api/admin/guests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        max_plus_ones: Number(editPlusOnes) || 0,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...data.guest } : g)))
      setEditingId(null)
      toast.success('Invitado actualizado')
    } else {
      toast.error(data.error)
    }
    setBusyId(null)
  }

  async function toggleActive(guest: Guest, parentId?: string) {
    setBusyId(guest.id)
    const res = await fetch('/api/admin/guests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: guest.id, is_active: !guest.is_active }),
    })
    const data = await res.json()
    if (res.ok) {
      setGuests((prev) =>
        prev.map((g) => {
          if (parentId && g.id === parentId) {
            return {
              ...g,
              plus_ones: g.plus_ones?.map((p) => (p.id === guest.id ? { ...p, ...data.guest } : p)),
            }
          }
          return g.id === guest.id ? { ...g, ...data.guest } : g
        })
      )
      toast.success(data.guest.is_active ? 'Acceso activado' : 'Acceso desactivado')
    } else {
      toast.error(data.error)
    }
    setBusyId(null)
  }

  async function sendInvitation(id: string) {
    setBusyId(id)
    const res = await fetch('/api/admin/invitation/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Invitación enviada')
    } else {
      toast.error(data.error)
    }
    setBusyId(null)
  }

  return (
    <div className="space-y-4">
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
          <div className="space-y-1">
            <Label>Correo</Label>
            <Input
              type="email"
              placeholder="maria@mail.com"
              value={newGuestEmail}
              onChange={(e) => setNewGuestEmail(e.target.value)}
              disabled={addingGuest}
            />
          </div>
          <div className="space-y-1">
            <Label>Teléfono</Label>
            <Input
              type="tel"
              placeholder="Ej: 11 1234 5678"
              value={newGuestPhone}
              onChange={(e) => setNewGuestPhone(e.target.value)}
              disabled={addingGuest}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Cupo de +1</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={newGuestPlusOnes}
              onChange={(e) => setNewGuestPlusOnes(e.target.value)}
              disabled={addingGuest}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={addingGuest || !newGuestName.trim() || !newGuestCode.trim() || !newGuestPhone.trim()}
          size="sm"
        >
          {addingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Agregar</>}
        </Button>
      </form>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {guests.length === 0 ? (
          <p className="p-4 text-sm text-stone-400 text-center">No hay invitados aún</p>
        ) : (
          guests.map((g) => (
            <div key={g.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-800 text-sm truncate">{g.name}</p>
                    <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_VARIANT[g.rsvp_status]}`}>
                      {STATUS_LABEL[g.rsvp_status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-400 font-mono">{g.code}</p>
                  {g.dietary_restrictions && (
                    <p className="text-xs text-stone-500 mt-0.5">🍽️ {g.dietary_restrictions}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => shareViaWhatsapp(g)}
                    disabled={!g.invite_token}
                    title="Enviar por WhatsApp"
                    className="text-stone-300 hover:text-green-500 disabled:opacity-30 transition-colors"
                  >
                    <WhatsappIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => sendInvitation(g.id)}
                    disabled={busyId === g.id || !g.email}
                    title={g.email ? 'Enviar invitación' : 'Sin correo cargado'}
                    className="text-stone-300 hover:text-ink-500 disabled:opacity-30 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(g)}
                    className="text-stone-300 hover:text-stone-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteGuest(g.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editingId === g.id ? (
                <div className="bg-cream-50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Correo</Label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        disabled={busyId === g.id}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Teléfono</Label>
                      <Input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        disabled={busyId === g.id}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cupo de +1</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={editPlusOnes}
                        onChange={(e) => setEditPlusOnes(e.target.value)}
                        disabled={busyId === g.id}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" onClick={() => saveEdit(g.id)} disabled={busyId === g.id || !editPhone.trim()}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Guardar
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} disabled={busyId === g.id}>
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                (g.email || g.phone) && (
                  <div className="flex items-center gap-3">
                    {g.email && (
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {g.email}
                      </p>
                    )}
                    {g.phone && (
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {g.phone}
                      </p>
                    )}
                  </div>
                )
              )}

              {g.plus_ones && g.plus_ones.length > 0 && (
                <div className="pl-3 border-l-2 border-stone-100 space-y-2">
                  {g.plus_ones.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 bg-stone-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-stone-700 truncate">{p.name}</p>
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-sage-100 text-sage-600">
                            +1 de {g.name}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-400 font-mono">{p.code}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => shareViaWhatsapp(p)}
                          disabled={!p.invite_token}
                          title="Enviar por WhatsApp"
                          className="text-stone-300 hover:text-green-500 disabled:opacity-30 transition-colors"
                        >
                          <WhatsappIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(p, g.id)}
                          disabled={busyId === p.id}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                            p.is_active
                              ? 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                              : 'bg-stone-200 text-stone-500 hover:bg-stone-300'
                          }`}
                        >
                          {p.is_active ? 'Activo' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
