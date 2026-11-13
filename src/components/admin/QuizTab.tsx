'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, Copy, Download, Loader2, Pencil, Rocket, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminQuestion, AdminRound, getAdminOverview } from '@/lib/quiz-admin'
import type { QuizMode, QuizRankingRow, QuizScope } from '@/types'

type Overview = Awaited<ReturnType<typeof getAdminOverview>>

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const REFRESH_MS = 15_000

const MODES: { value: QuizMode; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'closed', label: 'Forzar cerrada' },
  { value: 'finished', label: 'Finalizada' },
]

function fmt(iso: string | null): string {
  if (!iso) return 'Sin horario'
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** ISO → valor de <input type="datetime-local"> en hora de Argentina. */
function toInput(iso: string | null): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
  return parts.replace(' ', 'T')
}

/** Valor de <input type="datetime-local"> (hora de Argentina) → ISO. */
function fromInput(value: string): string | null {
  return value ? new Date(`${value}:00-03:00`).toISOString() : null
}

async function request(method: string, url: string, body?: unknown): Promise<(Overview & Record<string, unknown>) | null> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    toast.error(data.error ?? 'Error del servidor')
    return null
  }
  return data
}

function downloadRanking(rows: QuizRankingRow[], filename: string) {
  import('xlsx').then(({ utils, writeFile }) => {
    const data = rows.map((r) => ({
      Posición: r.rank,
      Nombre: r.name,
      Puntos: r.points,
      Correctas: r.correct,
      Respondidas: r.answered,
      'Tiempo total (s)': Math.round(r.total_seconds * 10) / 10,
      'Última respuesta': r.last_answer_at ? fmt(r.last_answer_at) : '',
      Estado: r.unfinished ? 'No terminó' : '',
    }))
    const ws = utils.json_to_sheet(data)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Ranking')
    writeFile(wb, filename)
  })
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-3 rounded-xl border border-cream-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-stone-800">{title}</h3>
        {hint && <p className="text-xs text-stone-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function ModeSwitch({ value, onChange, disabled }: { value: QuizMode; onChange: (m: QuizMode) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-cream-200">
      {MODES.map((m) => (
        <button
          key={m.value}
          disabled={disabled}
          onClick={() => onChange(m.value)}
          className={cn(
            'px-3 py-1.5 text-sm transition-colors',
            value === m.value ? 'bg-ink-500 text-white' : 'bg-white text-stone-600 hover:bg-cream-50'
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function RoundsTable({
  scope,
  rounds,
  onChange,
}: {
  scope: QuizScope
  rounds: AdminRound[]
  onChange: (o: Overview) => void
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  async function save(r: AdminRound) {
    const value = drafts[r.number]
    if (value === undefined) return
    setBusy(r.number)
    const data = await request('PATCH', '/api/admin/quiz/rounds', { scope, number: r.number, scheduledAt: fromInput(value) })
    setBusy(null)
    if (data) {
      setDrafts((d) => {
        const next = { ...d }
        delete next[r.number]
        return next
      })
      onChange(data)
      toast.success(`Horario de la tanda ${r.number} guardado`)
    }
  }

  async function release(r: AdminRound) {
    const earlier = rounds.filter((x) => x.number < r.number && !x.released).length
    const extra = earlier > 0 ? ` También se liberan las ${earlier} tanda(s) anterior(es) que seguían cerradas.` : ''
    if (!window.confirm(`¿Lanzar la tanda ${r.number} ahora?${extra} Los invitados la ven en menos de un minuto.`)) return
    setBusy(r.number)
    const data = await request('POST', '/api/admin/quiz/rounds', { scope, number: r.number })
    setBusy(null)
    if (data) {
      onChange(data)
      toast.success(`Tanda ${r.number} lanzada`)
    }
  }

  return (
    <div className="space-y-3">
      {rounds.map((r) => {
        const manual = r.released_at && (!r.scheduled_at || new Date(r.released_at) < new Date(r.scheduled_at))
        return (
          <div key={r.number} className="space-y-2 rounded-lg border border-cream-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-stone-800">Tanda {r.number}</span>
              {r.released ? (
                <Badge className="border-0 bg-sage-100 text-sage-600">
                  Liberada {fmt(r.effective_at)}
                  {manual ? ' (lanzada a mano)' : ''}
                </Badge>
              ) : r.effective_at ? (
                <Badge className="border-0 bg-ink-100 text-ink-600">Programada {fmt(r.effective_at)}</Badge>
              ) : (
                <Badge className="border-0 bg-stone-100 text-stone-500">Sin horario</Badge>
              )}
              <span className="ml-auto text-xs text-stone-400">
                {r.completed_by} de {r.players} la completaron
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!r.released && (
                <>
                  <Input
                    type="datetime-local"
                    className="h-8 w-auto text-sm"
                    value={drafts[r.number] ?? toInput(r.scheduled_at)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.number]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" disabled={drafts[r.number] === undefined || busy === r.number} onClick={() => save(r)}>
                    Guardar horario
                  </Button>
                </>
              )}
              <Button size="sm" className="ml-auto gap-1" disabled={r.released || busy === r.number} onClick={() => release(r)}>
                {busy === r.number ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Lanzar ahora
              </Button>
            </div>

            <p className="text-xs text-stone-400">
              Para el DJ o animador: «¡Salió la tanda {r.number} de la trivia! Entren a la app»
            </p>
          </div>
        )
      })}
    </div>
  )
}

function RankingTable({ rows, onReset, filename }: { rows: QuizRankingRow[]; onReset?: (id: string, name: string) => void; filename: string }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">Todavía nadie respondió.</p>
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadRanking(rows, filename)}>
        <Download className="h-3.5 w-3.5" /> Exportar a Excel
      </Button>
      <div className="max-h-96 overflow-auto rounded-lg border border-cream-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-50 text-left text-xs text-stone-500">
            <tr>
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">Nombre</th>
              <th className="px-2 py-1.5 text-right">Pts</th>
              <th className="px-2 py-1.5 text-right">OK</th>
              <th className="px-2 py-1.5 text-right" title="Tiempo total de respuesta (desempate)">Seg</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.guest_id} className="border-t border-cream-100">
                <td className="px-2 py-1.5 text-stone-400">{r.rank}</td>
                <td className="px-2 py-1.5">
                  {r.name}
                  {r.unfinished && <span className="ml-1 text-xs text-stone-400">(no terminó)</span>}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">{r.points}</td>
                <td className="px-2 py-1.5 text-right">{r.correct}</td>
                <td className="px-2 py-1.5 text-right text-stone-400">{r.total_seconds.toFixed(1)}</td>
                <td className="px-1 text-right">
                  {onReset && (
                    <button
                      title="Resetear la partida de este invitado"
                      className="text-stone-300 hover:text-rose-500"
                      onClick={() => onReset(r.guest_id, r.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function QuestionRow({ q, onChange }: { q: AdminQuestion; onChange: (o: Overview) => void }) {
  const [editing, setEditing] = useState(false)
  const [prompt, setPrompt] = useState(q.prompt)
  const [correct, setCorrect] = useState(q.correct_index)
  const [wrong, setWrong] = useState(q.wrong_message ?? '')

  async function patch(body: Record<string, unknown>) {
    const data = await request('PATCH', '/api/admin/quiz/questions', { id: q.id, ...body })
    if (data) onChange(data)
    return data
  }

  async function save() {
    if (await patch({ prompt, correct_index: correct, wrong_message: wrong || null })) setEditing(false)
  }

  const accuracy = q.answered > 0 ? Math.round((q.correct / q.answered) * 100) : null

  return (
    <li className={cn('space-y-2 rounded-lg border border-cream-200 p-3 text-sm', !q.is_active && 'opacity-50')}>
      {editing ? (
        <div className="space-y-2">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-500">Respuesta correcta:</span>
            {q.options.map((o, i) => (
              <button
                key={o}
                onClick={() => setCorrect(i)}
                className={cn('rounded-full border px-2.5 py-0.5 text-xs', correct === i ? 'border-ink-500 bg-ink-500 text-white' : 'border-cream-200 text-stone-600')}
              >
                {o}
              </button>
            ))}
          </div>
          <Input placeholder="Mensaje si se equivoca (opcional)" value={wrong} onChange={(e) => setWrong(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} className="gap-1"><Check className="h-3.5 w-3.5" /> Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1"><X className="h-3.5 w-3.5" /> Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-stone-800">{q.prompt}</p>
            <p className="text-xs text-stone-400">
              Correcta: <strong className="text-stone-600">{q.options[q.correct_index]}</strong>
              {q.options.length > 2 && ` (de ${q.options.length} opciones)`}
              {accuracy !== null && ` · ${accuracy}% de acierto (${q.answered})`}
            </p>
          </div>
          <button title="Editar" className="text-stone-400 hover:text-ink-500" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className={cn('rounded-full border px-2 py-0.5 text-xs', q.is_active ? 'border-sage-300 text-sage-600' : 'border-cream-200 text-stone-400')}
            onClick={() => patch({ is_active: !q.is_active })}
          >
            {q.is_active ? 'Activa' : 'Inactiva'}
          </button>
        </div>
      )}
    </li>
  )
}

function NewQuestion({ onChange }: { onChange: (o: Overview) => void }) {
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState('Pau, Octi')
  const [correct, setCorrect] = useState(0)

  async function add() {
    const list = options.split(',').map((o) => o.trim()).filter(Boolean)
    const data = await request('POST', '/api/admin/quiz/questions', { prompt, options: list, correct_index: correct })
    if (data) {
      onChange(data)
      setPrompt('')
      toast.success('Pregunta agregada')
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-cream-300 p-3">
      <Input placeholder="Nueva pregunta…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-40 flex-1" placeholder="Opciones separadas por coma" value={options} onChange={(e) => setOptions(e.target.value)} />
        <Input className="w-28" type="number" min={1} value={correct + 1} onChange={(e) => setCorrect(Math.max(0, Number(e.target.value) - 1))} title="Número de la opción correcta" />
        <Button size="sm" disabled={prompt.trim().length < 3} onClick={add}>Agregar</Button>
      </div>
      <p className="text-xs text-stone-400">El número es la posición de la opción correcta (1 = la primera).</p>
    </div>
  )
}

export function QuizTab() {
  const [data, setData] = useState<Overview | null>(null)
  const [busy, setBusy] = useState(false)
  const [testName, setTestName] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/quiz', { cache: 'no-store' })
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    // Carga inicial y refresco periódico desde el server
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  async function run(method: string, url: string, body?: unknown, okMessage?: string) {
    setBusy(true)
    const next = await request(method, url, body)
    setBusy(false)
    if (next) {
      setData(next)
      if (okMessage) toast.success(okMessage)
    }
    return next
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    )
  }

  const { config, counts } = data
  const createGuest = () => run('POST', '/api/admin/quiz/test', { action: 'create-guest', name: testName }, 'Invitado de prueba creado').then((next) => {
    if (next) setTestName('')
  })
  const realStarted = data.rounds.real.some((r) => r.released) || counts.realAnswers > 0
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-4">
      {(counts.realAnswers > 0 || counts.testGuests + counts.bots > 0) && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="space-y-0.5">
            {counts.realAnswers > 0 && <p>Hay {counts.realAnswers} respuestas registradas en la trivia real. Si son de prueba, reseteá antes del evento.</p>}
            {counts.testGuests + counts.bots > 0 && <p>Quedan {counts.testGuests + counts.bots} invitados de prueba. Borrá el ensayo antes del evento.</p>}
          </div>
        </div>
      )}

      <Section title="Estado de la trivia" hint="Automático: las tandas salen a su horario o con «Lanzar ahora». Forzar cerrada la oculta aunque haya tandas liberadas. Finalizada congela el ranking y muestra el podio.">
        <ModeSwitch value={config.mode} disabled={busy} onChange={(mode) => run('PATCH', '/api/admin/quiz', { mode }, 'Estado actualizado')} />
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span>Cierre automático (opcional):</span>
          <Input
            type="datetime-local"
            className="h-8 w-auto text-sm"
            value={toInput(config.closesAt)}
            onChange={(e) => run('PATCH', '/api/admin/quiz', { closesAt: fromInput(e.target.value) })}
          />
        </div>
      </Section>

      <Section title="Tandas" hint="Horarios en hora de Argentina. Las tandas se liberan en orden: lanzar la 2 también libera la 1.">
        {data.venueDatetime === null && (
          <p className="text-xs text-amber-600">Todavía no hay «inicio de la fiesta» en Config: completá los horarios a mano.</p>
        )}
        <RoundsTable scope="real" rounds={data.rounds.real} onChange={setData} />
      </Section>

      <Section title="Configuración del juego" hint={realStarted ? 'Bloqueada: hay tandas liberadas o respuestas registradas.' : undefined}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { key: 'roundCount', label: 'Tandas', value: config.roundCount, min: 1, max: 10 },
            { key: 'perRound', label: 'Preguntas por tanda', value: config.perRound, min: 1, max: 20 },
            { key: 'secondsPerQuestion', label: 'Segundos por pregunta', value: config.secondsPerQuestion, min: 5, max: 120 },
          ].map((f) => (
            <label key={f.key} className="space-y-1">
              <span className="text-xs text-stone-500">{f.label}</span>
              <Input
                type="number"
                min={f.min}
                max={f.max}
                disabled={realStarted || busy}
                defaultValue={f.value}
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (value !== f.value && value >= f.min && value <= f.max) run('PATCH', '/api/admin/quiz', { [f.key]: value }, 'Configuración guardada')
                }}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title={`Ranking (${data.ranking.length})`} hint="Desempate: puntos, correctas, tiempo total y hora de la última respuesta.">
        <RankingTable
          rows={data.ranking}
          filename={`trivia-ranking-${new Date().toISOString().slice(0, 10)}.xlsx`}
          onReset={(id, name) => {
            if (window.confirm(`¿Resetear la partida de ${name}? Se borran sus respuestas y puede volver a jugar.`)) {
              run('DELETE', `/api/admin/quiz?guestId=${id}`, undefined, 'Partida reseteada')
            }
          }}
        />
      </Section>

      <Section title={`Banco de preguntas (${data.questions.length})`}>
        <NewQuestion onChange={setData} />
        <ul className="space-y-2">
          {data.questions.map((q) => (
            <QuestionRow key={q.id} q={q} onChange={setData} />
          ))}
        </ul>
      </Section>

      <Section title="Resetear toda la trivia" hint="Borra respuestas y sorteos de todos los invitados y vuelve a cerrar las tandas lanzadas a mano. Los horarios programados se conservan.">
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (window.confirm('¿Resetear TODA la trivia? Se borran las respuestas y sorteos de todos los invitados. No se puede deshacer.')) {
              run('DELETE', '/api/admin/quiz?all=1', undefined, 'Trivia reseteada')
            }
          }}
        >
          Resetear toda la trivia
        </Button>
      </Section>

      <Section
        title="Ensayo"
        hint="Para probar la experiencia completa con la app todavía cerrada: invitados de prueba con acceso anticipado, tandas propias y ranking aparte. No toca la trivia real. Lo que se suba en Galería, Muro o Música sí es real."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 w-44 text-sm"
              placeholder="Nombre (ej. Pau)"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) createGuest()
              }}
            />
            <Button size="sm" variant="outline" disabled={busy} onClick={createGuest}>
              Crear invitado de prueba
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run('POST', '/api/admin/quiz/test', { action: 'add-bots' }, 'Jugadores ficticios agregados')}>
              Sumar jugadores ficticios
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run('POST', '/api/admin/quiz/test', { action: 'quick' }, 'Tandas de ensayo programadas a +1, +4 y +7 min')}
            >
              Ensayo rápido
            </Button>
          </div>

          {data.testGuests.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {data.testGuests.map((g) => {
                const link = `${origin}/?code=${g.code}`
                return (
                  <li key={g.id} className="flex items-center gap-2 rounded-lg bg-cream-50 px-3 py-2">
                    <span className="flex-1 truncate">
                      {g.name} · <code className="text-xs">{g.code}</code>
                    </span>
                    <button
                      className="flex items-center gap-1 text-xs text-ink-500"
                      onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copiado'))}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar link
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {counts.bots > 0 && <p className="text-xs text-stone-400">{counts.bots} jugadores ficticios cargados; responden solos cuando sale cada tanda de ensayo.</p>}

          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Tandas de ensayo</p>
            <RoundsTable scope="ensayo" rounds={data.rounds.ensayo} onChange={setData} />
            <ModeSwitch value={config.testMode} disabled={busy} onChange={(testMode) => run('PATCH', '/api/admin/quiz', { testMode })} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Ranking del ensayo ({data.testRanking.length})</p>
            <RankingTable rows={data.testRanking} filename="trivia-ensayo.xlsx" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || counts.testGuests + counts.bots === 0}
              onClick={() => {
                if (window.confirm('¿Reiniciar el ensayo? Se borran las respuestas y los sorteos de los invitados de prueba y se cierran las tandas. Las personas y sus códigos se conservan.')) {
                  run('POST', '/api/admin/quiz/test', { action: 'reset' }, 'Ensayo reiniciado')
                }
              }}
            >
              Reiniciar ensayo
            </Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            disabled={busy || counts.testGuests + counts.bots === 0}
            onClick={async () => {
              if (!window.confirm('¿Borrar el ensayo? Se eliminan todos los invitados de prueba y sus respuestas.')) return
              const next = await run('POST', '/api/admin/quiz/test', { action: 'delete' })
              if (next) toast.success(`Ensayo borrado. Invitados de prueba restantes: ${next.remaining ?? 0}`)
            }}
          >
            Borrar ensayo
          </Button>
        </div>
      </Section>
    </div>
  )
}
