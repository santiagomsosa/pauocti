'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, Mail, Phone, Pencil, Check, X, Send, Link2 } from 'lucide-react'
import type { Guest, InvitationType, PlusOnePreload } from '@/types'

function PreloadEditor({
  label,
  addLabel,
  preload,
  cap,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: {
  label: string
  addLabel: string
  preload: PlusOnePreload[]
  cap: number
  disabled: boolean
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<PlusOnePreload>) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">
          {label} ({preload.length}/{cap})
        </Label>
        {preload.length < cap && (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-600"
          >
            <Plus className="w-3.5 h-3.5" />
            {addLabel}
          </button>
        )}
      </div>
      {preload.map((p, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 items-start">
          <Input
            placeholder="Nombre"
            value={p.name}
            onChange={(e) => onUpdate(i, { name: e.target.value })}
            disabled={disabled}
          />
          <Input
            type="email"
            placeholder="Correo (opcional)"
            value={p.email}
            onChange={(e) => onUpdate(i, { email: e.target.value })}
            disabled={disabled}
          />
          <div className="flex gap-1">
            <Input
              type="tel"
              placeholder="Teléfono"
              value={p.phone}
              onChange={(e) => onUpdate(i, { phone: e.target.value })}
              disabled={disabled}
              required
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="flex-shrink-0 text-stone-300 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

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

function familyLabel(name: string): string {
  return /^familia\b/i.test(name) ? name : `la familia ${name}`
}

function copyInviteLink(guest: Guest) {
  if (!guest.invite_token) return
  const url = `${window.location.origin}/invitacion/${guest.invite_token}`
  navigator.clipboard?.writeText(url).then(
    () => toast.success('Enlace copiado'),
    () => toast.error('No se pudo copiar el enlace')
  )
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
  const [newGuestType, setNewGuestType] = useState<InvitationType>('individual')
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [newGuestPhone, setNewGuestPhone] = useState('')
  const [newGuestPlusOnes, setNewGuestPlusOnes] = useState('0')
  const [newGuestPreload, setNewGuestPreload] = useState<PlusOnePreload[]>([])
  const [addingGuest, setAddingGuest] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<InvitationType>('individual')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPlusOnes, setEditPlusOnes] = useState('0')
  const [editPreload, setEditPreload] = useState<PlusOnePreload[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  function preloadHandlers(preload: PlusOnePreload[], setPreload: (updater: (prev: PlusOnePreload[]) => PlusOnePreload[]) => void, cap: number) {
    return {
      add: () => {
        if (preload.length >= cap) return
        setPreload((prev) => [...prev, { name: '', email: '', phone: '' }])
      },
      update: (index: number, patch: Partial<PlusOnePreload>) =>
        setPreload((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p))),
      remove: (index: number) => setPreload((prev) => prev.filter((_, i) => i !== index)),
    }
  }

  const newPreload = preloadHandlers(newGuestPreload, setNewGuestPreload, Number(newGuestPlusOnes) || 0)
  const editPreloadHandlers = preloadHandlers(editPreload, setEditPreload, Number(editPlusOnes) || 0)

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newGuestName.trim() || !newGuestPhone.trim()) return
    if (newGuestType === 'family' && (Number(newGuestPlusOnes) || 0) < 1) {
      toast.error('Una familia necesita al menos 1 integrante')
      return
    }
    if (newGuestPreload.some((p) => !p.name.trim() || !p.phone.trim())) {
      toast.error('Completá el nombre y teléfono de todos los integrantes precargados')
      return
    }
    setAddingGuest(true)
    const res = await fetch('/api/admin/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newGuestName.trim(),
        email: newGuestEmail.trim(),
        phone: newGuestPhone.trim(),
        invitation_type: newGuestType,
        max_plus_ones: Number(newGuestPlusOnes) || 0,
        plus_ones_preload: newGuestPreload.map((p) => ({
          name: p.name.trim(),
          email: p.email.trim(),
          phone: p.phone.trim(),
        })),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setGuests((prev) =>
        [...prev, { ...data.guest, plus_ones: [] }].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewGuestType('individual')
      setNewGuestName('')
      setNewGuestEmail('')
      setNewGuestPhone('')
      setNewGuestPlusOnes('0')
      setNewGuestPreload([])
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
    setEditType(guest.invitation_type)
    setEditEmail(guest.email ?? '')
    setEditPhone(guest.phone ?? '')
    setEditPlusOnes(String(guest.max_plus_ones))
    setEditPreload(guest.plus_ones_preload ?? [])
  }

  async function saveEdit(id: string) {
    if (!editPhone.trim()) {
      toast.error('El teléfono es obligatorio')
      return
    }
    if (editType === 'family' && (Number(editPlusOnes) || 0) < 1) {
      toast.error('Una familia necesita al menos 1 integrante')
      return
    }
    if (editPreload.some((p) => !p.name.trim() || !p.phone.trim())) {
      toast.error('Completá el nombre y teléfono de todos los integrantes precargados')
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
        invitation_type: editType,
        max_plus_ones: Number(editPlusOnes) || 0,
        plus_ones_preload: editPreload.map((p) => ({
          name: p.name.trim(),
          email: p.email.trim(),
          phone: p.phone.trim(),
        })),
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
        <div className="space-y-1">
          <Label>Tipo</Label>
          <select
            value={newGuestType}
            onChange={(e) => setNewGuestType(e.target.value as InvitationType)}
            disabled={addingGuest}
            className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="individual">Individual</option>
            <option value="family">Familia</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{newGuestType === 'family' ? 'Nombre de la familia' : 'Nombre'}</Label>
            <Input
              placeholder={newGuestType === 'family' ? 'Ej: Familia García' : 'Ej: María García'}
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              disabled={addingGuest}
            />
          </div>
          <div className="space-y-1">
            <Label>{newGuestType === 'family' ? 'Correo de contacto' : 'Correo'}</Label>
            <Input
              type="email"
              placeholder="maria@mail.com"
              value={newGuestEmail}
              onChange={(e) => setNewGuestEmail(e.target.value)}
              disabled={addingGuest}
            />
          </div>
          <div className="space-y-1">
            <Label>{newGuestType === 'family' ? 'Teléfono de contacto' : 'Teléfono'}</Label>
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
            <Label>{newGuestType === 'family' ? 'Integrantes' : 'Cupo de +1'}</Label>
            <Input
              type="number"
              min={newGuestType === 'family' ? 1 : 0}
              max={10}
              value={newGuestPlusOnes}
              onChange={(e) => setNewGuestPlusOnes(e.target.value)}
              disabled={addingGuest}
            />
          </div>
        </div>
        {newGuestType === 'family' && (
          <p className="text-xs text-stone-400">
            El correo y teléfono son para enviarle la invitación a la familia, no son datos de un integrante.
          </p>
        )}

        {Number(newGuestPlusOnes) > 0 && (
          <PreloadEditor
            label={newGuestType === 'family' ? 'Precargar integrantes' : 'Precargar acompañantes'}
            addLabel={newGuestType === 'family' ? 'Agregar integrante' : 'Agregar acompañante'}
            preload={newGuestPreload}
            cap={Number(newGuestPlusOnes) || 0}
            disabled={addingGuest}
            onAdd={newPreload.add}
            onUpdate={newPreload.update}
            onRemove={newPreload.remove}
          />
        )}

        <Button
          type="submit"
          disabled={addingGuest || !newGuestName.trim() || !newGuestPhone.trim()}
          size="sm"
        >
          {addingGuest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              {newGuestType === 'family' ? 'Agregar familia' : 'Agregar invitado'}
            </>
          )}
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
                    {g.invitation_type === 'family' && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-ink-100 text-ink-600">Familia</Badge>
                    )}
                    <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_VARIANT[g.rsvp_status]}`}>
                      {STATUS_LABEL[g.rsvp_status]}
                    </Badge>
                  </div>
                  {g.invitation_type !== 'family' && (
                    <p className="text-xs text-stone-400">
                      Código de acceso: <span className="font-mono">{g.code}</span>
                    </p>
                  )}
                  {g.dietary_restrictions && (
                    <p className="text-xs text-stone-500 mt-0.5">🍽️ {g.dietary_restrictions}</p>
                  )}
                  {g.rsvp_status === 'pending' && g.plus_ones_preload?.length > 0 && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {g.invitation_type === 'family' ? 'Integrantes precargados' : '+1 precargados'}:{' '}
                      {g.plus_ones_preload.map((p) => p.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyInviteLink(g)}
                    disabled={!g.invite_token}
                    title="Copiar enlace de la invitación"
                    className="text-stone-300 hover:text-ink-500 disabled:opacity-30 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as InvitationType)}
                      disabled={busyId === g.id}
                      className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    >
                      <option value="individual">Individual</option>
                      <option value="family">Familia</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{editType === 'family' ? 'Correo de contacto' : 'Correo'}</Label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        disabled={busyId === g.id}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{editType === 'family' ? 'Teléfono de contacto' : 'Teléfono'}</Label>
                      <Input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        disabled={busyId === g.id}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{editType === 'family' ? 'Integrantes' : 'Cupo de +1'}</Label>
                      <Input
                        type="number"
                        min={editType === 'family' ? 1 : 0}
                        max={10}
                        value={editPlusOnes}
                        onChange={(e) => setEditPlusOnes(e.target.value)}
                        disabled={busyId === g.id}
                      />
                    </div>
                  </div>

                  {editType === 'family' && (
                    <p className="text-xs text-stone-400">
                      El correo y teléfono son para enviarle la invitación a la familia, no son datos de un integrante.
                    </p>
                  )}

                  {Number(editPlusOnes) > 0 && (
                    <PreloadEditor
                      label={editType === 'family' ? 'Precargar integrantes' : 'Precargar acompañantes'}
                      addLabel={editType === 'family' ? 'Agregar integrante' : 'Agregar acompañante'}
                      preload={editPreload}
                      cap={Number(editPlusOnes) || 0}
                      disabled={busyId === g.id}
                      onAdd={editPreloadHandlers.add}
                      onUpdate={editPreloadHandlers.update}
                      onRemove={editPreloadHandlers.remove}
                    />
                  )}

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
                            {g.invitation_type === 'family'
                              ? `Integrante de ${familyLabel(g.name)}`
                              : `+1 de ${g.name}`}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-400">
                          Código de acceso: <span className="font-mono">{p.code}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyInviteLink(p)}
                          disabled={!p.invite_token}
                          title="Copiar enlace de la invitación"
                          className="text-stone-300 hover:text-ink-500 disabled:opacity-30 transition-colors"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
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
