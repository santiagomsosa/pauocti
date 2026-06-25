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
  const [ceremonyVenue, setCeremonyVenue] = useState(settings.ceremony_venue ?? '')
  const [ceremonyAddress, setCeremonyAddress] = useState(settings.ceremony_address ?? '')
  const [ceremonyMapUrl, setCeremonyMapUrl] = useState(settings.ceremony_map_url ?? '')
  const [venue, setVenue] = useState(settings.venue ?? '')
  const [venueAddress, setVenueAddress] = useState(settings.venue_address ?? '')
  const [venueMapUrl, setVenueMapUrl] = useState(settings.venue_map_url ?? '')
  const [bankArsAccount, setBankArsAccount] = useState(settings.bank_ars_account ?? '')
  const [bankArsAlias, setBankArsAlias] = useState(settings.bank_ars_alias ?? '')
  const [bankArsCbu, setBankArsCbu] = useState(settings.bank_ars_cbu ?? '')
  const [bankUsdAccount, setBankUsdAccount] = useState(settings.bank_usd_account ?? '')
  const [bankUsdAlias, setBankUsdAlias] = useState(settings.bank_usd_alias ?? '')
  const [bankUsdCbu, setBankUsdCbu] = useState(settings.bank_usd_cbu ?? '')
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
        ceremony_venue: ceremonyVenue.trim(),
        ceremony_address: ceremonyAddress.trim(),
        ceremony_map_url: ceremonyMapUrl.trim(),
        venue: venue.trim(),
        venue_address: venueAddress.trim(),
        venue_map_url: venueMapUrl.trim(),
        bank_ars_account: bankArsAccount.trim(),
        bank_ars_alias: bankArsAlias.trim(),
        bank_ars_cbu: bankArsCbu.trim(),
        bank_usd_account: bankUsdAccount.trim(),
        bank_usd_alias: bankUsdAlias.trim(),
        bank_usd_cbu: bankUsdCbu.trim(),
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
        <div className="pt-2 border-t border-stone-100">
          <h3 className="text-sm font-semibold text-stone-600 mb-2">Ceremonia</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre de la iglesia</Label>
              <Input
                placeholder="Ej: Parroquia San José"
                value={ceremonyVenue}
                onChange={(e) => setCeremonyVenue(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input
                placeholder="Ej: Av. Libertador 1234"
                value={ceremonyAddress}
                onChange={(e) => setCeremonyAddress(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <Label>Link al mapa (Google Maps)</Label>
              <Input
                placeholder="https://maps.app.goo.gl/..."
                value={ceremonyMapUrl}
                onChange={(e) => setCeremonyMapUrl(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <h3 className="text-sm font-semibold text-stone-600 mb-2">Fiesta</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre del lugar</Label>
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
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <h3 className="text-sm font-semibold text-stone-600 mb-2">Datos para transferencia · Pesos</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Número de cuenta</Label>
              <Input value={bankArsAccount} onChange={(e) => setBankArsAccount(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label>Alias</Label>
              <Input value={bankArsAlias} onChange={(e) => setBankArsAlias(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label>CBU</Label>
              <Input value={bankArsCbu} onChange={(e) => setBankArsCbu(e.target.value)} disabled={saving} />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <h3 className="text-sm font-semibold text-stone-600 mb-2">Datos para transferencia · Dólares</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Número de cuenta</Label>
              <Input value={bankUsdAccount} onChange={(e) => setBankUsdAccount(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label>Alias</Label>
              <Input value={bankUsdAlias} onChange={(e) => setBankUsdAlias(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label>CBU</Label>
              <Input value={bankUsdCbu} onChange={(e) => setBankUsdCbu(e.target.value)} disabled={saving} />
            </div>
          </div>
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
