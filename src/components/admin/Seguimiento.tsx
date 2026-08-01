'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { familyDisplayName } from '@/lib/guest'
import { CHART_COLORS } from '@/lib/chart-colors'
import { StatTile } from '@/components/admin/tracking/StatTile'
import { RsvpStatusBar } from '@/components/admin/tracking/RsvpStatusBar'
import { OpensTrendChart, type TrendPoint } from '@/components/admin/tracking/OpensTrendChart'
import type { Guest } from '@/types'

const STATUS_VARIANT: Record<Guest['rsvp_status'], string> = {
  pending: 'bg-stone-100 text-stone-500',
  attending: 'bg-sage-100 text-sage-600',
  declined: 'bg-rose-100 text-rose-600',
}

const STATUS_LABEL_ES: Record<Guest['rsvp_status'], string> = {
  pending: 'Pendiente',
  attending: 'Asiste',
  declined: 'No asiste',
}

type Filter = 'all' | 'not_opened' | 'not_confirmed'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function buildTrendPoints(guests: Guest[]): TrendPoint[] {
  const opens = guests.flatMap((g) => g.opens ?? []).map((o) => o.at)
  const confirmations = guests.filter((g) => g.rsvp_submitted_at).map((g) => g.rsvp_submitted_at as string)

  if (opens.length === 0 && confirmations.length === 0) return []

  const allTimestamps = [...opens, ...confirmations]
  const minDate = new Date(Math.min(...allTimestamps.map((d) => new Date(d).getTime())))
  minDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const opensByDay = new Map<string, number>()
  for (const at of opens) opensByDay.set(dayKey(at), (opensByDay.get(dayKey(at)) ?? 0) + 1)
  const confirmsByDay = new Map<string, number>()
  for (const at of confirmations) confirmsByDay.set(dayKey(at), (confirmsByDay.get(dayKey(at)) ?? 0) + 1)

  const points: TrendPoint[] = []
  let cumOpens = 0
  let cumConfirms = 0
  const cursor = new Date(minDate)
  while (cursor.getTime() <= today.getTime()) {
    const key = cursor.toISOString().slice(0, 10)
    cumOpens += opensByDay.get(key) ?? 0
    cumConfirms += confirmsByDay.get(key) ?? 0
    points.push({ date: cursor.toISOString(), opens: cumOpens, confirmations: cumConfirms })
    cursor.setDate(cursor.getDate() + 1)
  }
  return points
}

function MemberRow({ member }: { member: Guest }) {
  const opens = member.opens ?? []
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 pl-4 text-xs border-l-2 border-stone-100">
      <div className="min-w-0 flex items-center gap-2">
        <span className="truncate text-stone-600">{member.name}</span>
        <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_VARIANT[member.rsvp_status]}`}>
          {STATUS_LABEL_ES[member.rsvp_status]}
        </Badge>
      </div>
      <span className="flex-shrink-0 text-stone-400">
        {opens.length === 0 ? 'Sin abrir' : `${opens.length} apertura${opens.length !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

function GuestRow({ guest }: { guest: Guest }) {
  const opens = guest.opens ?? []
  const lastOpen = opens.length > 0 ? opens[opens.length - 1].at : null

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <p className="font-medium text-stone-800 text-sm truncate">{familyDisplayName(guest)}</p>
          <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_VARIANT[guest.rsvp_status]}`}>
            {STATUS_LABEL_ES[guest.rsvp_status]}
          </Badge>
        </div>
        <div className="flex-shrink-0 text-right text-xs text-stone-500">
          {opens.length === 0 ? (
            <span className="text-stone-400">Nunca abrió el link</span>
          ) : (
            <>
              <p>{opens.length} apertura{opens.length !== 1 ? 's' : ''}</p>
              <p className="text-stone-400">Última: {lastOpen && formatDateTime(lastOpen)}</p>
            </>
          )}
        </div>
      </div>
      {guest.rsvp_submitted_at && (
        <p className="text-xs text-stone-400">Confirmó el {formatDateTime(guest.rsvp_submitted_at)}</p>
      )}
      {guest.plus_ones && guest.plus_ones.length > 0 && (
        <div className="space-y-1 pt-1">
          {guest.plus_ones.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Seguimiento({ guests, loading }: { guests: Guest[]; loading: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')

  const total = guests.length
  const opened = guests.filter((g) => (g.opens ?? []).length > 0).length
  const confirmed = guests.filter((g) => g.rsvp_status !== 'pending').length
  const neverOpened = total - opened

  const segments = useMemo(
    () => [
      { key: 'attending', label: 'Asiste', value: guests.filter((g) => g.rsvp_status === 'attending').length, color: CHART_COLORS.attending },
      { key: 'pending', label: 'Pendiente', value: guests.filter((g) => g.rsvp_status === 'pending').length, color: CHART_COLORS.pending },
      { key: 'declined', label: 'No asiste', value: guests.filter((g) => g.rsvp_status === 'declined').length, color: CHART_COLORS.declined },
    ],
    [guests]
  )

  const trendPoints = useMemo(() => buildTrendPoints(guests), [guests])

  const filtered = guests.filter((g) => {
    if (filter === 'not_opened') return (g.opens ?? []).length === 0
    if (filter === 'not_confirmed') return g.rsvp_status === 'pending'
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Invitados" value={String(total)} />
        <StatTile label="Abrieron el link" value={`${opened}/${total}`} hint={total > 0 ? `${Math.round((opened / total) * 100)}%` : undefined} />
        <StatTile label="Confirmaron" value={`${confirmed}/${total}`} hint={total > 0 ? `${Math.round((confirmed / total) * 100)}%` : undefined} />
        <StatTile label="Nunca abrieron" value={String(neverOpened)} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-stone-700">Estado de confirmación</p>
        <RsvpStatusBar segments={segments} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-stone-700">Aperturas y confirmaciones acumuladas</p>
        <OpensTrendChart points={trendPoints} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {([
            ['all', 'Todos'],
            ['not_opened', 'No abrieron'],
            ['not_confirmed', 'No confirmaron'],
          ] as [Filter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === value ? 'bg-ink-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm divide-y">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-stone-400 text-center">No hay invitados en este filtro</p>
          ) : (
            filtered.map((g) => <GuestRow key={g.id} guest={g} />)
          )}
        </div>
      </div>
    </div>
  )
}
