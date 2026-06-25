'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Send } from 'lucide-react'
import type { Settings } from '@/types'

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface SettingsTabProps {
  settings: Settings
  setSettings: (settings: Settings) => void
}

export function SettingsTab({ settings, setSettings }: SettingsTabProps) {
  const [weddingDatetime, setWeddingDatetime] = useState(toDatetimeLocal(settings.wedding_datetime))
  const [coupleNames, setCoupleNames] = useState(settings.couple_names ?? '')
  const [venue, setVenue] = useState(settings.venue ?? '')
  const [venueAddress, setVenueAddress] = useState(settings.venue_address ?? '')
  const [venueMapUrl, setVenueMapUrl] = useState(settings.venue_map_url ?? '')
  const [saving, setSaving] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wedding_datetime: weddingDatetime ? new Date(weddingDatetime).toISOString() : '',
        couple_names: coupleNames.trim(),
        venue: venue.trim(),
        venue_address: venueAddress.trim(),
        venue_map_url: venueMapUrl.trim(),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setSettings(data.settings)
      toast.success('Configuración guardada')
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  async function sendReminder() {
    if (!confirm('¿Enviar recordatorio a todos los invitados activados?')) return
    setSendingReminder(true)
    const res = await fetch('/api/admin/reminder/send', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Recordatorio enviado a ${data.sent} invitados`)
    } else {
      toast.error(data.error)
    }
    setSendingReminder(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-stone-700">Configuración del evento</h2>
        <div className="space-y-1">
          <Label>Fecha y hora del casamiento</Label>
          <Input
            type="datetime-local"
            value={weddingDatetime}
            onChange={(e) => setWeddingDatetime(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label>Nombres de la pareja</Label>
          <Input
            placeholder="Ej: Pau & Octi"
            value={coupleNames}
            onChange={(e) => setCoupleNames(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label>Lugar</Label>
          <Input
            placeholder="Ej: Quinta El Remanso"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label>Dirección</Label>
          <Input
            placeholder="Ej: Ruta 8 km 45, Pilar"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label>Link al mapa (Google Maps)</Label>
          <Input
            placeholder="https://maps.app.goo.gl/..."
            value={venueMapUrl}
            onChange={(e) => setVenueMapUrl(e.target.value)}
            disabled={saving}
          />
        </div>
        <Button type="submit" disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Guardar</>}
        </Button>
      </form>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="font-semibold text-stone-700">Recordatorio</h2>
        <p className="text-sm text-stone-500">
          Envía un correo con la fecha, el lugar y el mapa a todos los invitados activados.
        </p>
        <Button size="sm" variant="outline" onClick={sendReminder} disabled={sendingReminder}>
          {sendingReminder ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Send className="w-4 h-4 mr-1" />Enviar recordatorio</>
          )}
        </Button>
      </div>
    </div>
  )
}
