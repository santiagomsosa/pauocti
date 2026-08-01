'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, Pencil, Check, X, ChevronDown, ChevronRight, Download } from 'lucide-react'
import type { Guest, WeddingTable } from '@/types'

function downloadXlsx(rows: Record<string, string>[], filename: string) {
  import('xlsx').then(({ utils, writeFile }) => {
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Datos')
    writeFile(wb, filename)
  })
}

const STATUS_LABEL_ES = {
  pending: 'Pendiente',
  attending: 'Asiste',
  declined: 'No asiste',
} as const

const STATUS_VARIANT = {
  pending: 'bg-stone-100 text-stone-500',
  attending: 'bg-sage-100 text-sage-600',
  declined: 'bg-rose-100 text-rose-600',
} as const

interface Person {
  id: string
  name: string
  rsvp_status: 'pending' | 'attending' | 'declined'
  table_id: string | null
  parentId: string | null
}

interface TablesTabProps {
  tables: WeddingTable[]
  setTables: (updater: (prev: WeddingTable[]) => WeddingTable[]) => void
  guests: Guest[]
  setGuests: (updater: (prev: Guest[]) => Guest[]) => void
}

export function TablesTab({ tables, setTables, guests, setGuests }: TablesTabProps) {
  const [newName, setNewName] = useState('')
  const [newCapacity, setNewCapacity] = useState('10')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCapacity, setEditCapacity] = useState('10')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedPersonId, setSelectedPersonId] = useState<Record<string, string>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)

  // Flatten all "people" who go to tables:
  // - Individual guests (not family containers)
  // - Plus_ones of both individual and family guests
  const allPeople: Person[] = guests.flatMap((g) => {
    const people: Person[] = []
    if (g.invitation_type !== 'family') {
      people.push({ id: g.id, name: g.name, rsvp_status: g.rsvp_status, table_id: g.table_id, parentId: null })
    }
    for (const p of g.plus_ones ?? []) {
      people.push({ id: p.id, name: p.name, rsvp_status: p.rsvp_status, table_id: p.table_id ?? null, parentId: g.id })
    }
    return people
  })

  function personLabel(person: Person): string {
    if (!person.parentId) return person.name
    const parent = guests.find((g) => g.id === person.parentId)
    if (!parent) return person.name
    return parent.invitation_type === 'family'
      ? `${person.name} (${parent.name})`
      : `${person.name} (+1 de ${parent.name})`
  }

  const peopleByTable = new Map<string, Person[]>()
  for (const p of allPeople) {
    if (!p.table_id) continue
    const list = peopleByTable.get(p.table_id) ?? []
    list.push(p)
    peopleByTable.set(p.table_id, list)
  }

  const activePeople = allPeople.filter((p) => p.rsvp_status !== 'declined')
  const withoutTable = activePeople.filter((p) => !p.table_id).length
  const totalAssigned = activePeople.filter((p) => p.table_id).length
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0)

  function updatePersonInState(personId: string, parentId: string | null, patch: Partial<Guest>) {
    setGuests((prev) => {
      if (!parentId) {
        return prev.map((g) => (g.id === personId ? { ...g, ...patch } : g))
      }
      return prev.map((g) =>
        g.id === parentId
          ? { ...g, plus_ones: g.plus_ones?.map((p) => (p.id === personId ? { ...p, ...patch } : p)) ?? [] }
          : g
      )
    })
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/admin/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), capacity: Number(newCapacity) || 10 }),
    })
    const data = await res.json()
    if (res.ok) {
      setTables((prev) => [...prev, data.table].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewCapacity('10')
      toast.success('Mesa creada')
    } else {
      toast.error(data.error)
    }
    setAdding(false)
  }

  function startEdit(table: WeddingTable) {
    setEditingId(table.id)
    setEditName(table.name)
    setEditCapacity(String(table.capacity))
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setBusyId(id)
    const res = await fetch('/api/admin/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim(), capacity: Number(editCapacity) || 10 }),
    })
    const data = await res.json()
    if (res.ok) {
      setTables((prev) =>
        prev.map((t) => (t.id === id ? data.table : t)).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      toast.success('Mesa actualizada')
    } else {
      toast.error(data.error)
    }
    setBusyId(null)
  }

  async function assignPerson(tableId: string) {
    const personId = selectedPersonId[tableId]
    if (!personId) return
    const person = allPeople.find((p) => p.id === personId)
    if (!person) return
    setAssigningId(tableId)
    const res = await fetch('/api/admin/guests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: personId, table_id: tableId }),
    })
    const data = await res.json()
    if (res.ok) {
      updatePersonInState(personId, person.parentId, { table_id: tableId })
      setSelectedPersonId((prev) => ({ ...prev, [tableId]: '' }))
      toast.success('Asignado a la mesa')
    } else {
      toast.error(data.error)
    }
    setAssigningId(null)
  }

  async function removePerson(person: Person) {
    const res = await fetch('/api/admin/guests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: person.id, table_id: null }),
    })
    const data = await res.json()
    if (res.ok) {
      updatePersonInState(person.id, person.parentId, { table_id: null })
      toast.success('Quitado de la mesa')
    } else {
      toast.error(data.error)
    }
  }

  function exportTablesXlsx() {
    const rows: Record<string, string>[] = []
    for (const table of tables) {
      const people = peopleByTable.get(table.id) ?? []
      if (people.length === 0) {
        rows.push({ Mesa: table.name, Capacidad: String(table.capacity), Nombre: '', Estado: '', 'Restricciones alimentarias': '' })
      } else {
        for (const p of people) {
          const guest = guests.find((g) => g.id === p.parentId || g.plus_ones?.some((m) => m.id === p.id))
          const fullGuest = guest?.plus_ones?.find((m) => m.id === p.id)
          rows.push({
            Mesa: table.name,
            Capacidad: String(table.capacity),
            Nombre: personLabel(p),
            Estado: { pending: 'Pendiente', attending: 'Asiste', declined: 'No asiste' }[p.rsvp_status],
            'Restricciones alimentarias': fullGuest?.dietary_restrictions ?? (guest?.dietary_restrictions ?? ''),
          })
        }
      }
    }
    downloadXlsx(rows, `mesas-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function deleteTable(id: string, name: string) {
    const assigned = peopleByTable.get(id)?.length ?? 0
    if (assigned > 0) {
      toast.error(`${name} tiene ${assigned} persona${assigned !== 1 ? 's' : ''} asignada${assigned !== 1 ? 's' : ''}. Reasignalas antes de eliminar.`)
      return
    }
    if (!confirm(`¿Eliminar ${name}?`)) return
    const res = await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTables((prev) => prev.filter((t) => t.id !== id))
      toast.success('Mesa eliminada')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addTable} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-stone-700">Agregar mesa</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              placeholder="Ej: Mesa 1, Mesa de honor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={adding}
            />
          </div>
          <div className="space-y-1">
            <Label>Capacidad</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              disabled={adding}
            />
          </div>
        </div>
        <Button type="submit" disabled={adding || !newName.trim()} size="sm">
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Agregar mesa
            </>
          )}
        </Button>
      </form>

      {tables.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-stone-400">
              {tables.length} mesa{tables.length !== 1 ? 's' : ''}
              {' · '}
              {totalAssigned} / {totalCapacity} lugares asignados
            </p>
            {withoutTable > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                {withoutTable} persona{withoutTable !== 1 ? 's' : ''} todavía sin mesa asignada
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpandedIds(new Set(tables.map((t) => t.id)))}
              className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
            >
              Expandir todo
            </button>
            <span className="text-xs text-stone-300">·</span>
            <button
              onClick={() => setExpandedIds(new Set())}
              className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
            >
              Colapsar todo
            </button>
            <Button size="sm" variant="outline" onClick={exportTablesXlsx}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar Excel
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {tables.length === 0 ? (
          <p className="p-4 text-sm text-stone-400 text-center">No hay mesas creadas aún</p>
        ) : (
          tables.map((table) => {
            const assigned = peopleByTable.get(table.id) ?? []
            const isExpanded = expandedIds.has(table.id)
            const isEditing = editingId === table.id

            return (
              <div key={table.id} className="px-4 py-3 space-y-2">
                {isEditing ? (
                  <div className="bg-cream-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={busyId === table.id}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Capacidad</Label>
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(e.target.value)}
                          disabled={busyId === table.id}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" onClick={() => saveEdit(table.id)} disabled={busyId === table.id || !editName.trim()}>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Guardar
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} disabled={busyId === table.id}>
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="flex items-center gap-2 min-w-0 text-left"
                        onClick={() => setExpandedIds((prev) => {
                          const next = new Set(prev)
                          isExpanded ? next.delete(table.id) : next.add(table.id)
                          return next
                        })}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-stone-800 text-sm">{table.name}</span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            assigned.length >= table.capacity
                              ? 'bg-rose-100 text-rose-600'
                              : assigned.length > 0
                              ? 'bg-sage-100 text-sage-600'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {assigned.length}/{table.capacity}
                        </Badge>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(table)} className="text-stone-300 hover:text-stone-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTable(table.id, table.name)} className="text-stone-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pl-6 space-y-2">
                        {assigned.length === 0 ? (
                          <p className="text-xs text-stone-400 py-1">Sin personas asignadas</p>
                        ) : (
                          assigned.map((person) => (
                            <div key={person.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm text-stone-700 truncate">{personLabel(person)}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${STATUS_VARIANT[person.rsvp_status]}`}>
                                  {STATUS_LABEL_ES[person.rsvp_status]}
                                </Badge>
                              </div>
                              <button
                                onClick={() => removePerson(person)}
                                title="Quitar de esta mesa"
                                className="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                        {(() => {
                          const available = allPeople.filter(
                            (p) => p.table_id !== table.id && p.rsvp_status !== 'declined'
                          )
                          if (available.length === 0) return null
                          return (
                            <div className="flex gap-2 pt-1">
                              <select
                                value={selectedPersonId[table.id] ?? ''}
                                onChange={(e) =>
                                  setSelectedPersonId((prev) => ({ ...prev, [table.id]: e.target.value }))
                                }
                                className="h-8 flex-1 min-w-0 rounded-lg border border-input bg-white px-2 py-1 text-sm outline-none transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={assigningId === table.id}
                              >
                                <option value="">Agregar persona…</option>
                                {available.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {personLabel(p)}{p.table_id ? ` (${tables.find((t) => t.id === p.table_id)?.name ?? 'otra mesa'})` : ''}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                disabled={!selectedPersonId[table.id] || assigningId === table.id}
                                onClick={() => assignPerson(table.id)}
                                className="h-8 px-3"
                              >
                                {assigningId === table.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
