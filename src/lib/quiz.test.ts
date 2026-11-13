import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeQuizStatus,
  drawQuestions,
  firstRoundMs,
  guestProgress,
  isExpired,
  isUnfinished,
  parseQuizConfig,
  releasedRounds,
  scoreAnswer,
  secondsLeft,
  sortRanking,
} from './quiz.ts'
import type { RoundTimes } from './quiz.ts'

const t = (hhmm: string) => new Date(`2026-11-14T${hhmm}:00Z`)
const iso = (hhmm: string) => t(hhmm).toISOString()
const rounds = (s1: string | null, s2: string | null, s3: string | null): RoundTimes[] => [
  { number: 1, scheduled_at: s1 && iso(s1), released_at: null },
  { number: 2, scheduled_at: s2 && iso(s2), released_at: null },
  { number: 3, scheduled_at: s3 && iso(s3), released_at: null },
]

// --- releasedRounds ---------------------------------------------------------

test('releasedRounds: antes y después de cada horario, con borde exacto', () => {
  const r = rounds('22:00', '23:30', '23:50')
  assert.equal(releasedRounds(r, t('21:59')), 0)
  assert.equal(releasedRounds(r, t('22:00')), 1)
  assert.equal(releasedRounds(r, t('23:29')), 1)
  assert.equal(releasedRounds(r, t('23:30')), 2)
  assert.equal(releasedRounds(r, t('23:49')), 2)
  assert.equal(releasedRounds(r, t('23:50')), 3)
})

test('releasedRounds: "Lanzar ahora" antes del horario', () => {
  const r = rounds('22:00', '23:30', '23:50')
  r[1].released_at = iso('21:00')
  assert.equal(releasedRounds(r, t('20:00')), 0)
  assert.equal(releasedRounds(r, t('21:00')), 2)
})

test('releasedRounds: lanzar la 2 con la 1 cerrada libera ambas', () => {
  const r = rounds(null, null, null)
  r[1].released_at = iso('21:00')
  assert.equal(releasedRounds(r, t('21:00')), 2)
})

test('releasedRounds: horarios fuera de orden nunca abren la 2 antes que la 1', () => {
  // la 2 está programada antes que la 1: cuando se abre la 2, la 1 ya cuenta como abierta
  const r = rounds('23:00', '22:00', null)
  assert.equal(releasedRounds(r, t('21:59')), 0)
  assert.equal(releasedRounds(r, t('22:00')), 2)
})

test('releasedRounds: tanda sin horario ni lanzamiento no se abre', () => {
  assert.equal(releasedRounds(rounds(null, null, null), t('23:59')), 0)
  assert.equal(releasedRounds([], t('23:59')), 0)
})

test('firstRoundMs: hora de la tanda 1 para la cuenta regresiva', () => {
  assert.equal(firstRoundMs(rounds('22:00', '23:30', null)), t('22:00').getTime())
  assert.equal(firstRoundMs(rounds(null, '23:30', null)), null)
})

// --- computeQuizStatus ------------------------------------------------------

test('computeQuizStatus: cerrado antes de la tanda 1 y abierto después', () => {
  const cfg = { mode: 'auto' as const, closesAt: null }
  assert.equal(computeQuizStatus(cfg, 0, t('21:00')), 'closed')
  assert.equal(computeQuizStatus(cfg, 1, t('22:00')), 'open')
})

test('computeQuizStatus: modos forzados', () => {
  assert.equal(computeQuizStatus({ mode: 'closed', closesAt: null }, 2, t('22:00')), 'closed')
  assert.equal(computeQuizStatus({ mode: 'finished', closesAt: null }, 0, t('22:00')), 'finished')
})

test('computeQuizStatus: cierre automático con borde exacto', () => {
  const cfg = { mode: 'auto' as const, closesAt: iso('03:00') }
  assert.equal(computeQuizStatus(cfg, 3, t('02:59')), 'open')
  assert.equal(computeQuizStatus(cfg, 3, t('03:00')), 'finished')
})

test('parseQuizConfig: valores por defecto y valores inválidos', () => {
  const d = parseQuizConfig({})
  assert.deepEqual(d, { mode: 'auto', testMode: 'auto', closesAt: null, roundCount: 3, perRound: 4, secondsPerQuestion: 20 })
  const c = parseQuizConfig({ quiz_mode: 'finished', quiz_questions_per_round: '0', quiz_seconds_per_question: 'x', quiz_round_count: '5' })
  assert.equal(c.mode, 'finished')
  assert.equal(c.perRound, 4)
  assert.equal(c.secondsPerQuestion, 20)
  assert.equal(c.roundCount, 5)
  assert.equal(parseQuizConfig({ quiz_mode: 'raro' }).mode, 'auto')
})

// --- guestProgress ----------------------------------------------------------

const answered = (n: number) => Array.from({ length: n }, () => ({ answered: true }))
const base = { perRound: 4, totalRounds: 3 }

test('guestProgress: sin respuestas con la tanda 1 liberada está jugando', () => {
  const p = guestProgress({ answers: [], released: 1, ...base })
  assert.equal(p.phase, 'playing')
  assert.equal(p.currentRound, 1)
  assert.equal(p.pendingCount, 4)
})

test('guestProgress: pregunta abierta devuelve su tanda', () => {
  const p = guestProgress({ answers: [...answered(5), { answered: false }], released: 2, ...base })
  assert.equal(p.phase, 'playing')
  assert.equal(p.hasOpenQuestion, true)
  assert.equal(p.currentRound, 2)
  assert.equal(p.nextIndex, 5)
})

test('guestProgress: completó las liberadas y espera la próxima', () => {
  const p = guestProgress({ answers: answered(4), released: 1, ...base })
  assert.equal(p.phase, 'waiting')
  assert.equal(p.completedRounds, 1)
  assert.equal(p.pendingCount, 0)
})

test('guestProgress: atrasado con 2 tandas liberadas sigue de corrido', () => {
  const p = guestProgress({ answers: answered(4), released: 2, ...base })
  assert.equal(p.phase, 'playing')
  assert.equal(p.currentRound, 2)
  assert.equal(p.pendingCount, 4)
  const late = guestProgress({ answers: answered(2), released: 2, ...base })
  assert.equal(late.currentRound, 1)
  assert.equal(late.pendingCount, 6)
})

test('guestProgress: terminó las 3 tandas', () => {
  const p = guestProgress({ answers: answered(12), released: 3, ...base })
  assert.equal(p.phase, 'done')
  assert.equal(p.completedRounds, 3)
  assert.equal(p.currentRound, null)
})

test('guestProgress: detecta el fin de tanda con la última respuesta', () => {
  assert.equal(guestProgress({ answers: answered(3), released: 1, ...base }).completedRounds, 0)
  assert.equal(guestProgress({ answers: answered(4), released: 1, ...base }).completedRounds, 1)
  assert.equal(guestProgress({ answers: answered(8), released: 3, ...base }).completedRounds, 2)
})

// --- scoreAnswer ------------------------------------------------------------

const shown = new Date('2026-11-14T22:00:00Z')
const expires = new Date(shown.getTime() + 20_000)
const at = (ms: number) => new Date(shown.getTime() + ms)

test('scoreAnswer: respuesta instantánea = 150 y al límite = 100', () => {
  assert.equal(scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: shown, isCorrect: true }).points, 150)
  assert.equal(scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: expires, isCorrect: true }).points, 100)
})

test('scoreAnswer: bonus proporcional al tiempo restante', () => {
  assert.equal(scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: at(10_000), isCorrect: true }).points, 125)
})

test('scoreAnswer: dentro de la gracia suma 100, fuera de la gracia es timeout', () => {
  const within = scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: at(21_500), isCorrect: true })
  assert.deepEqual(within, { points: 100, timedOut: false, correct: true })
  const late = scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: at(22_001), isCorrect: true })
  assert.deepEqual(late, { points: 0, timedOut: true, correct: false })
})

test('scoreAnswer: incorrecta = 0', () => {
  assert.deepEqual(scoreAnswer({ shownAt: shown, expiresAt: expires, answeredAt: at(1000), isCorrect: false }), {
    points: 0,
    timedOut: false,
    correct: false,
  })
})

test('isExpired y secondsLeft', () => {
  assert.equal(isExpired(expires, at(22_000)), false)
  assert.equal(isExpired(expires, at(22_001)), true)
  assert.equal(secondsLeft(expires, at(5_000)), 15)
  assert.equal(secondsLeft(expires, at(25_000)), 0)
})

// --- drawQuestions ----------------------------------------------------------

test('drawQuestions: 12 de 41 sin repetidas', () => {
  const ids = Array.from({ length: 41 }, (_, i) => `q${i}`)
  const drawn = drawQuestions(ids, 12)
  assert.equal(drawn.length, 12)
  assert.equal(new Set(drawn).size, 12)
  assert.ok(drawn.every((id) => ids.includes(id)))
  assert.equal(ids.length, 41)
})

test('drawQuestions: banco más chico que lo pedido devuelve todo', () => {
  assert.equal(drawQuestions(['a', 'b', 'c'], 12).length, 3)
  assert.deepEqual(drawQuestions([], 4), [])
})

test('drawQuestions: es determinista con random inyectado', () => {
  const ids = ['a', 'b', 'c', 'd']
  assert.deepEqual(drawQuestions(ids, 4, () => 0), ['a', 'b', 'c', 'd'])
  assert.deepEqual(drawQuestions(ids, 2, () => 0.999), ['d', 'a'])
})

// --- sortRanking / isUnfinished ---------------------------------------------

const row = (name: string, points: number, correct: number, total_seconds: number, last: string | null) => ({
  name,
  points,
  correct,
  total_seconds,
  last_answer_at: last && `2026-11-14T${last}:00Z`,
})

test('sortRanking: cada criterio de desempate', () => {
  const sorted = sortRanking([
    row('d', 300, 3, 30, '22:05'),
    row('a', 400, 3, 40, '22:09'),
    row('c', 300, 3, 20, '22:07'),
    row('b', 300, 4, 90, '22:08'),
    row('e', 300, 3, 20, '22:06'),
  ])
  assert.deepEqual(sorted.map((r) => r.name), ['a', 'b', 'e', 'c', 'd'])
})

test('sortRanking: sin respuestas queda al final de su empate', () => {
  const sorted = sortRanking([row('x', 0, 0, 0, null), row('y', 0, 0, 0, '22:01')])
  assert.deepEqual(sorted.map((r) => r.name), ['y', 'x'])
})

test('isUnfinished: relativo a las tandas liberadas', () => {
  const p = { perRound: 4, totalRounds: 3, finished: false }
  assert.equal(isUnfinished({ answered: 4, released: 1, ...p }), false)
  assert.equal(isUnfinished({ answered: 4, released: 2, ...p }), true)
  assert.equal(isUnfinished({ answered: 8, released: 2, ...p }), false)
})

test('isUnfinished: al finalizar aplica a quien no respondió las 12', () => {
  const p = { perRound: 4, totalRounds: 3, finished: true }
  assert.equal(isUnfinished({ answered: 8, released: 3, ...p }), true)
  assert.equal(isUnfinished({ answered: 12, released: 3, ...p }), false)
})
