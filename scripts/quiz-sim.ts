// Simulador de la noche de trivia: crea N invitados en la base LOCAL y los hace jugar por HTTP
// contra la app corriendo (`npm run dev:local`), verificando las reglas del juego.
//
//   node --no-warnings scripts/quiz-sim.ts [cantidad=60] [urlDeLaApp=http://localhost:3100]
//
// Se niega a correr si la base o la app no son locales.
import { readFileSync } from 'node:fs'

const PLAYERS = Number(process.argv[2] ?? 60)
const APP = (process.argv[3] ?? 'http://localhost:3100').replace(/\/$/, '')
const SECONDS = 8
const PER_ROUND = 4
const ROUNDS = 3
const ADMIN_PASSWORD = 'admin-local'

// --- Seguridad: solo local ---------------------------------------------------

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync('.env.supabase-local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  return env
}

const env = loadEnv()
const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url)
if (!isLocal(env.NEXT_PUBLIC_SUPABASE_URL ?? '') || !isLocal(APP)) {
  console.error(`Me niego a correr: la base (${env.NEXT_PUBLIC_SUPABASE_URL}) y la app (${APP}) tienen que ser localhost.`)
  process.exit(1)
}

// --- Acceso a la base (solo para preparar datos y conocer las respuestas correctas) ------------

const REST = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`
const dbHeaders = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function db(method: string, path: string, body?: unknown) {
  const res = await fetch(`${REST}${path}`, { method, headers: dbHeaders, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error(`DB ${method} ${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

// --- Cliente HTTP con cookie -----------------------------------------------------

interface Session {
  cookie: string
}

async function login(code: string): Promise<Session> {
  const res = await fetch(`${APP}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('guest_session='))?.split(';')[0]
  if (!res.ok || !cookie) throw new Error(`login ${code}: ${res.status}`)
  return { cookie }
}

async function adminLogin(): Promise<Session> {
  const res = await fetch(`${APP}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  })
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('admin_session='))?.split(';')[0]
  if (!res.ok || !cookie) throw new Error(`admin login: ${res.status}`)
  return { cookie }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

async function api(s: Session, method: string, path: string, body?: unknown): Promise<{ status: number; data: Json }> {
  const res = await fetch(`${APP}${path}`, {
    method,
    // Connection: close evita reutilizar sockets que el server ya cerró por inactividad (ECONNRESET)
    headers: { Cookie: s.cookie, Connection: 'close', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: Json = null
  try {
    data = await res.json()
  } catch {}
  return { status: res.status, data }
}

// --- Aserciones ------------------------------------------------------------------

const failures: string[] = []
let lateAnswers = 0
let checks = 0
function check(condition: boolean, message: string) {
  checks++
  if (!condition) {
    failures.push(message)
    if (failures.length <= 25) console.error(`  ✖ ${message}`)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// El server de desarrollo (un solo proceso) no aguanta 200+ conexiones nuevas a la vez:
// se juega con hasta CONCURRENCY jugadores simultáneos.
const CONCURRENCY = 30
async function mapLimit<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    })
  )
  return out
}

// --- Jugadores -------------------------------------------------------------------

type Profile = 'eager' | 'late' | 'quitter' | 'timeout'

interface Player {
  name: string
  code: string
  id: string
  profile: Profile
  session: Session
  skill: number
  seen: Set<string>
  points: number
  answered: number
}

function profileFor(i: number): Profile {
  if (i % 10 === 3) return 'late'
  if (i % 10 === 6) return 'quitter'
  if (i % 10 === 9) return 'timeout'
  return 'eager'
}

const correctByQuestion = new Map<string, number>()

/** Juega todo lo que esté disponible; devuelve cuántas preguntas respondió. */
async function playAvailable(p: Player, opts: { maxQuestions?: number; letExpire?: boolean } = {}): Promise<number> {
  let played = 0
  for (;;) {
    if (opts.maxQuestions !== undefined && played >= opts.maxQuestions) return played

    // Doble click: dos "next" a la vez tienen que devolver la misma pregunta
    const [a, b] = await Promise.all([api(p.session, 'POST', '/api/quiz/next'), api(p.session, 'POST', '/api/quiz/next')])
    if (a.status !== 200 || b.status !== 200) {
      check(false, `${p.name}: next devolvió ${a.status}/${b.status}`)
      return played
    }
    const q = a.data.state.question
    if (!q) return played
    check(b.data.state.question?.id === q.id, `${p.name}: doble "next" devolvió preguntas distintas`)
    check(!p.seen.has(q.id), `${p.name}: pregunta repetida ${q.id}`)
    p.seen.add(q.id)

    if (opts.letExpire) {
      await sleep((q.totalSeconds + 1) * 1000)
      const t = await api(p.session, 'POST', '/api/quiz/answer', { questionId: q.id, selectedIndex: null })
      check(t.status === 200 && t.data.result.timedOut && t.data.result.points === 0, `${p.name}: el timeout no se registró bien (${t.status})`)
      played++
      p.answered++
      opts = { ...opts, letExpire: false }
      continue
    }

    const correct = correctByQuestion.get(q.id)!
    const wantsCorrect = Math.random() < p.skill
    const pick = wantsCorrect ? correct : (correct + 1) % q.options.length
    await sleep(100 + Math.random() * 400)

    // Doble click en la respuesta: una sola gana
    const [r1, r2] = await Promise.all([
      api(p.session, 'POST', '/api/quiz/answer', { questionId: q.id, selectedIndex: pick }),
      api(p.session, 'POST', '/api/quiz/answer', { questionId: q.id, selectedIndex: pick }),
    ])
    const statuses = [r1.status, r2.status].sort()
    check(statuses[0] === 200 && statuses[1] === 409, `${p.name}: doble respuesta dio ${r1.status}/${r2.status} (esperaba 200 y 409)`)
    const win = r1.status === 200 ? r1 : r2
    const result = win.data?.result
    if (result) {
      // Con la app bajo carga una respuesta puede llegar pasado el límite: el server la cuenta como vencida
      if (!result.timedOut) check(result.correct === (pick === correct), `${p.name}: "correct" inconsistente`)
      else lateAnswers++
      check(result.correct ? result.points >= 100 && result.points <= 150 : result.points === 0, `${p.name}: puntos fuera de rango (${result.points})`)
      check(result.correctIndex === correct, `${p.name}: devolvió una respuesta correcta distinta`)
      p.points += result.points
    }
    // Reintento tardío de la misma pregunta: sigue sin dejar responder
    const again = await api(p.session, 'POST', '/api/quiz/answer', { questionId: q.id, selectedIndex: correct })
    check(again.status === 409, `${p.name}: respondió dos veces la misma pregunta (${again.status})`)
    played++
    p.answered++
  }
}

// --- Escenario -----------------------------------------------------------------------

async function main() {
  console.log(`Simulador de trivia · ${PLAYERS} invitados · app ${APP}`)

  // Limpieza de corridas anteriores y preparación
  await db('DELETE', '/guests?code=like.SIM*')
  await db('DELETE', '/quiz_answers?guest_id=neq.00000000-0000-0000-0000-000000000000')
  await db('DELETE', '/quiz_attempts?guest_id=neq.00000000-0000-0000-0000-000000000000')
  await db('PATCH', '/quiz_rounds?scope=eq.real', { scheduled_at: null, released_at: null })
  for (const row of [
    { key: 'quiz_mode', value: 'auto' },
    { key: 'quiz_round_count', value: String(ROUNDS) },
    { key: 'quiz_questions_per_round', value: String(PER_ROUND) },
    { key: 'quiz_seconds_per_question', value: String(SECONDS) },
  ]) {
    await fetch(`${REST}/settings?on_conflict=key`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    })
  }

  const bank: { id: string; correct_index: number }[] = await db('GET', '/quiz_questions?select=id,correct_index&is_active=eq.true')
  for (const q of bank) correctByQuestion.set(q.id, q.correct_index)

  const rows = Array.from({ length: PLAYERS }, (_, i) => ({
    name: `Simulado ${i + 1}`,
    code: `SIM${String(i + 1).padStart(3, '0')}`,
    is_active: true,
    phone: '000',
  }))
  const created: { id: string; name: string; code: string }[] = await db('POST', '/guests', rows)

  const players: Player[] = []
  for (let i = 0; i < created.length; i++) {
    players.push({
      ...created[i],
      profile: profileFor(i + 1),
      session: await login(created[i].code),
      skill: 0.4 + Math.random() * 0.55,
      seen: new Set(),
      points: 0,
      answered: 0,
    })
  }
  const admin = await adminLogin()
  const by = (profile: Profile) => players.filter((p) => p.profile === profile)
  console.log(
    `Perfiles: ${by('eager').length} puntuales · ${by('late').length} que llegan tarde · ${by('quitter').length} que abandonan · ${by('timeout').length} que dejan vencer`
  )

  // 1) Tanda cerrada: nadie puede jugar ni ver preguntas
  console.log('\n1) Antes de la tanda 1')
  const closed = await mapLimit(players, (p) => api(p.session, 'POST', '/api/quiz/next'))
  check(closed.every((r) => r.status === 403), 'se pudo pedir una pregunta con la trivia cerrada')
  const closedState = await api(players[0].session, 'GET', '/api/quiz')
  check(closedState.data.state.phase === 'closed' && closedState.data.state.question === null, 'el estado cerrado muestra una pregunta')
  const ghost = await api(players[0].session, 'POST', '/api/quiz/answer', { questionId: bank[0].id, selectedIndex: 0 })
  check(ghost.status === 404 || ghost.status === 403, `se pudo responder una pregunta que no se mostró (${ghost.status})`)

  // 2) Tanda 1: todos a la vez
  console.log('2) Se lanza la tanda 1 (todos juegan a la vez)')
  await api(admin, 'POST', '/api/admin/quiz/rounds', { scope: 'real', number: 1 })
  const statuses = await mapLimit(players, (p) => api(p.session, 'GET', '/api/quiz/status'))
  check(statuses.every((s) => s.data.status === 'open' && s.data.releasedRounds === 1 && s.data.pendingCount === PER_ROUND), 'el estado liviano no refleja la tanda 1')

  const round1 = await mapLimit(players, (p) => {
    if (p.profile === 'late') return Promise.resolve(0)
    if (p.profile === 'quitter') return playAvailable(p, { maxQuestions: 2 })
    return playAvailable(p, { letExpire: p.profile === 'timeout' })
  })
  players.forEach((p, i) => {
    const expected = p.profile === 'late' ? 0 : p.profile === 'quitter' ? 2 : PER_ROUND
    check(round1[i] === expected, `${p.name} (${p.profile}) jugó ${round1[i]} en la tanda 1, esperaba ${expected}`)
  })

  const waiting = await api(by('eager')[0].session, 'GET', '/api/quiz')
  check(waiting.data.state.phase === 'waiting' && waiting.data.state.question === null, 'quien terminó la tanda 1 no queda esperando')
  const peek = await api(by('eager')[0].session, 'POST', '/api/quiz/next')
  check(peek.status === 200 && peek.data.state.question === null, 'se mostró una pregunta de una tanda no liberada')

  // 3) Tanda 2: los que abandonaron quedan "(no terminó)"
  console.log('3) Se lanza la tanda 2')
  await api(admin, 'POST', '/api/admin/quiz/rounds', { scope: 'real', number: 2 })
  await mapLimit(players, (p) => {
    if (p.profile === 'late' || p.profile === 'quitter') return Promise.resolve(0)
    return playAvailable(p)
  })
  const midRanking = await api(by('eager')[0].session, 'GET', '/api/quiz/ranking')
  const mid = midRanking.data.ranking
  const quitterRow = mid.top.concat(mid.me ? [mid.me] : []).find((r: Json) => by('quitter').some((p) => p.id === r.guest_id))
  if (quitterRow) check(quitterRow.unfinished === true, 'quien abandonó no aparece como "(no terminó)"')
  check(mid.releasedRounds === 2, 'el ranking no informa la tanda 2')

  // 4) Tanda 3 y los que llegan tarde juegan todo de corrido
  console.log('4) Se lanza la tanda 3 (los que llegaron tarde juegan todo de corrido)')
  await api(admin, 'POST', '/api/admin/quiz/rounds', { scope: 'real', number: 3 })
  await mapLimit(players, (p) => (p.profile === 'quitter' ? Promise.resolve(0) : playAvailable(p)))

  for (const p of players) {
    if (p.profile === 'quitter') continue
    const expected = PER_ROUND * ROUNDS
    check(p.answered === expected, `${p.name} (${p.profile}) respondió ${p.answered} de ${expected}`)
    check(p.seen.size === expected, `${p.name} vio ${p.seen.size} preguntas distintas de ${expected}`)
  }

  // 5) Ranking y consistencia con la base
  console.log('5) Ranking final')
  const me = by('eager')[0]
  const final = (await api(me.session, 'GET', '/api/quiz/ranking')).data.ranking
  const dbTotals: { guest_id: string; points: number }[] = await db('GET', '/quiz_ranking?select=guest_id,points&is_test=eq.false')
  const dbPoints = new Map(dbTotals.map((r) => [r.guest_id, r.points]))
  for (const p of players) check((dbPoints.get(p.id) ?? 0) === p.points, `${p.name}: la base suma ${dbPoints.get(p.id) ?? 0} y la API informó ${p.points}`)
  const sorted = final.top.every((r: Json, i: number, all: Json[]) => i === 0 || all[i - 1].points >= r.points)
  check(sorted, 'el top 10 no está ordenado por puntos')
  check(final.totalPlayers <= players.length, 'cantidad de jugadores inconsistente')
  check(!JSON.stringify(final).includes('correct_index'), 'el ranking filtró correct_index')

  // 6) La respuesta correcta nunca viaja antes de responder
  console.log('6) Fuga de respuestas')
  const quitter = by('quitter')[0]
  await api(admin, 'PATCH', '/api/admin/quiz', { mode: 'auto' })
  const open = await api(quitter.session, 'POST', '/api/quiz/next')
  const body = JSON.stringify(open.data)
  check(!body.includes('correct_index') && !body.includes('correctIndex') && !body.includes('wrong_message'), 'la pregunta abierta incluye datos de la respuesta')

  // 7) Finalizada: no deja responder y congela
  console.log('7) Se finaliza la trivia')
  await api(admin, 'PATCH', '/api/admin/quiz', { mode: 'finished' })
  const q = open.data.state.question
  if (q) {
    const after = await api(quitter.session, 'POST', '/api/quiz/answer', { questionId: q.id, selectedIndex: 0 })
    check(after.status === 403, `se pudo responder con la trivia finalizada (${after.status})`)
  }
  const fin = (await api(me.session, 'GET', '/api/quiz/ranking')).data.ranking
  check(fin.status === 'finished', 'el ranking no quedó finalizado')
  const quitterFinal = (await api(quitter.session, 'GET', '/api/quiz/ranking')).data.ranking.me
  check(quitterFinal?.unfinished === true, 'quien no completó las 12 no aparece como "(no terminó)" al finalizar')

  // Limpieza
  await api(admin, 'PATCH', '/api/admin/quiz', { mode: 'auto' })
  await db('DELETE', '/guests?code=like.SIM*')
  await db('PATCH', '/quiz_rounds?scope=eq.real', { scheduled_at: null, released_at: null })

  console.log(`\n${checks} verificaciones · ${failures.length} fallas · ${lateAnswers} respuestas vencidas por la carga`)
  if (failures.length > 0) {
    console.error(`\nFallas (${failures.length}):`)
    for (const f of failures.slice(0, 40)) console.error(` - ${f}`)
    process.exit(1)
  }
  console.log('Todo en orden ✔')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
