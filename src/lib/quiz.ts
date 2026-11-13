// Lógica pura de la trivia (sin base de datos), para poder probarla con `npm test`.
// Todo se calcula con funciones puras a partir de la hora actual: no hay cron.

export type QuizMode = 'auto' | 'closed' | 'finished'
export type QuizStatus = 'closed' | 'open' | 'finished'

export const DEFAULT_ROUND_COUNT = 3
export const DEFAULT_QUESTIONS_PER_ROUND = 4
export const DEFAULT_SECONDS_PER_QUESTION = 20

/** Tolerancia por latencia de red al validar que se respondió a tiempo. */
export const GRACE_MS = 2000
export const BASE_POINTS = 100
export const MAX_SPEED_BONUS = 50

export interface QuizConfig {
  mode: QuizMode
  testMode: QuizMode
  closesAt: string | null
  roundCount: number
  perRound: number
  secondsPerQuestion: number
}

export interface RoundTimes {
  number: number
  scheduled_at: string | null
  released_at: string | null
}

function toMs(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

function toMode(value: string | null | undefined): QuizMode {
  return value === 'closed' || value === 'finished' ? value : 'auto'
}

function toPositiveInt(value: string | null | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Convierte las claves de `settings` (todas texto) en la configuración de la trivia. */
export function parseQuizConfig(values: Record<string, string | null | undefined>): QuizConfig {
  return {
    mode: toMode(values.quiz_mode),
    testMode: toMode(values.quiz_test_mode),
    closesAt: values.quiz_closes_at || null,
    roundCount: toPositiveInt(values.quiz_round_count, DEFAULT_ROUND_COUNT),
    perRound: toPositiveInt(values.quiz_questions_per_round, DEFAULT_QUESTIONS_PER_ROUND),
    secondsPerQuestion: toPositiveInt(values.quiz_seconds_per_question, DEFAULT_SECONDS_PER_QUESTION),
  }
}

/** Una tanda está liberada desde el menor entre su horario programado y el "Lanzar ahora". */
export function roundReleaseMs(round: Pick<RoundTimes, 'scheduled_at' | 'released_at'>): number | null {
  const times = [toMs(round.scheduled_at), toMs(round.released_at)].filter((t): t is number => t !== null)
  return times.length > 0 ? Math.min(...times) : null
}

/**
 * Cuántas tandas están liberadas. Se liberan en orden: si la 2 está liberada, la 1 también,
 * aunque su horario esté mal cargado o se haya lanzado primero la 2 con el botón.
 */
export function releasedRounds(rounds: RoundTimes[], now: Date): number {
  let released = 0
  for (const round of rounds) {
    const at = roundReleaseMs(round)
    if (at !== null && at <= now.getTime()) released = Math.max(released, round.number)
  }
  return released
}

export function computeQuizStatus(
  config: { mode: QuizMode; closesAt: string | null },
  released: number,
  now: Date
): QuizStatus {
  if (config.mode === 'finished') return 'finished'
  const closesAt = toMs(config.closesAt)
  if (closesAt !== null && now.getTime() >= closesAt) return 'finished'
  if (config.mode === 'closed' || released === 0) return 'closed'
  return 'open'
}

/** Hora (ms) de la primera tanda con horario, para la cuenta regresiva. */
export function firstRoundMs(rounds: RoundTimes[]): number | null {
  const first = [...rounds].sort((a, b) => a.number - b.number)[0]
  return first ? roundReleaseMs(first) : null
}

export interface ProgressAnswer {
  answered: boolean
}

export interface GuestProgress {
  phase: 'playing' | 'waiting' | 'done'
  /** Tanda a la que pertenece la pregunta en curso o la siguiente (1-based); null si espera o terminó. */
  currentRound: number | null
  /** Hay una pregunta mostrada y sin responder. */
  hasOpenQuestion: boolean
  /** Posición (0-based) de la pregunta en curso o de la siguiente a mostrar. */
  nextIndex: number
  answeredCount: number
  completedRounds: number
  /** Preguntas sin responder dentro de las tandas ya liberadas. */
  pendingCount: number
}

/**
 * `answers` son las preguntas ya mostradas, en orden. La posición de cada una en el sorteo
 * es su índice, así que las tandas son tramos consecutivos de `perRound` preguntas.
 */
export function guestProgress(params: {
  answers: ProgressAnswer[]
  released: number
  perRound: number
  totalRounds: number
}): GuestProgress {
  const { answers, released, perRound, totalRounds } = params
  const total = perRound * totalRounds
  const answeredCount = answers.filter((a) => a.answered).length
  const hasOpenQuestion = answers.some((a) => !a.answered)
  const releasedQuestions = Math.min(released, totalRounds) * perRound
  const completedRounds = Math.floor(answeredCount / perRound)
  const pendingCount = Math.max(0, releasedQuestions - answeredCount)

  const base = { hasOpenQuestion, answeredCount, completedRounds, pendingCount }

  if (hasOpenQuestion) {
    const nextIndex = answers.length - 1
    return { ...base, phase: 'playing', currentRound: Math.floor(nextIndex / perRound) + 1, nextIndex }
  }
  if (answers.length >= total) {
    return { ...base, phase: 'done', currentRound: null, nextIndex: answers.length }
  }
  if (answers.length < releasedQuestions) {
    return {
      ...base,
      phase: 'playing',
      currentRound: Math.floor(answers.length / perRound) + 1,
      nextIndex: answers.length,
    }
  }
  return { ...base, phase: 'waiting', currentRound: null, nextIndex: answers.length }
}

export interface ScoreResult {
  points: number
  timedOut: boolean
  correct: boolean
}

/** Correcta = 100 + hasta 50 según el tiempo que sobraba. Incorrecta o fuera de tiempo = 0. */
export function scoreAnswer(params: {
  shownAt: Date
  expiresAt: Date
  answeredAt: Date
  isCorrect: boolean
}): ScoreResult {
  const { shownAt, expiresAt, answeredAt, isCorrect } = params
  const timedOut = answeredAt.getTime() > expiresAt.getTime() + GRACE_MS
  if (timedOut || !isCorrect) return { points: 0, timedOut, correct: false }

  const total = Math.max(1, expiresAt.getTime() - shownAt.getTime())
  const remaining = Math.min(total, Math.max(0, expiresAt.getTime() - answeredAt.getTime()))
  return {
    points: BASE_POINTS + Math.round((MAX_SPEED_BONUS * remaining) / total),
    timedOut: false,
    correct: true,
  }
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() > expiresAt.getTime() + GRACE_MS
}

/** Segundos que le quedan a una pregunta abierta (nunca negativo). */
export function secondsLeft(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000))
}

/** Sorteo sin repetidas (Fisher-Yates parcial). `random` es inyectable para los tests. */
export function drawQuestions<T>(ids: T[], count: number, random: () => number = Math.random): T[] {
  const pool = [...ids]
  const take = Math.min(count, pool.length)
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, take)
}

export interface RankingRow {
  points: number
  correct: number
  total_seconds: number
  last_answer_at: string | null
}

/** Puntos ↓, correctas ↓, tiempo total ↑, hora de la última respuesta ↑. */
export function sortRanking<T extends RankingRow>(rows: T[]): T[] {
  const last = (r: T) => toMs(r.last_answer_at) ?? Number.POSITIVE_INFINITY
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.correct - a.correct ||
      a.total_seconds - b.total_seconds ||
      last(a) - last(b)
  )
}

/** "(no terminó)": le faltan respuestas de las tandas ya liberadas (o de todas, al finalizar). */
export function isUnfinished(params: {
  answered: number
  released: number
  perRound: number
  totalRounds: number
  finished: boolean
}): boolean {
  const { answered, released, perRound, totalRounds, finished } = params
  const target = (finished ? totalRounds : Math.min(released, totalRounds)) * perRound
  return answered < target
}

/** Hora de inicio relativa a la fiesta, para programar las tandas ("ahora + N min", "+1 h"). */
export function offsetIso(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60_000).toISOString()
}
