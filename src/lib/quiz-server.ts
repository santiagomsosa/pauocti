import { createServerClient } from '@/lib/supabase/server'
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
  GRACE_MS,
} from '@/lib/quiz'
import type { QuizConfig, QuizMode } from '@/lib/quiz'
import { pickQuizPhoto } from '@/lib/quiz-photos'
import type {
  QuizAnswerResult,
  QuizOpenQuestion,
  QuizRanking,
  QuizRankingRow,
  QuizRound,
  QuizRoundSummary,
  QuizScope,
  QuizState,
  QuizStatus,
} from '@/types'

// Capa de base de datos de la trivia. La lógica de tandas, puntaje y orden está en `quiz.ts`.

const CONFIG_KEYS = [
  'quiz_mode',
  'quiz_test_mode',
  'quiz_closes_at',
  'quiz_round_count',
  'quiz_questions_per_round',
  'quiz_seconds_per_question',
] as const

export type QuizConfigKey = (typeof CONFIG_KEYS)[number]

/** Error con código HTTP para que los route handlers respondan sin repetir lógica. */
export class QuizError extends Error {
  status: number
  extra: Record<string, unknown>
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

interface AnswerRow {
  id: string
  guest_id: string
  question_id: string
  round: number
  shown_at: string
  expires_at: string
  answered_at: string | null
  selected_index: number | null
  is_correct: boolean
  points: number
}

interface QuestionRow {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  wrong_message: string | null
}

export interface QuizContext {
  guest: { id: string; name: string; is_test: boolean }
  scope: QuizScope
  config: QuizConfig
  mode: QuizMode
  rounds: QuizRound[]
  released: number
  status: QuizStatus
  now: Date
}

export async function getQuizConfig(): Promise<QuizConfig> {
  const { data } = await createServerClient().from('settings').select('key, value').in('key', [...CONFIG_KEYS])
  return parseQuizConfig(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])))
}

export async function saveQuizConfig(values: Partial<Record<QuizConfigKey, string | null>>): Promise<void> {
  const rows = Object.entries(values)
    .filter(([key]) => (CONFIG_KEYS as readonly string[]).includes(key))
    .map(([key, value]) => ({ key, value: value === '' ? null : value }))
  if (rows.length === 0) return
  const { error } = await createServerClient().from('settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}

export async function loadRounds(scope: QuizScope): Promise<QuizRound[]> {
  const { data, error } = await createServerClient()
    .from('quiz_rounds')
    .select('scope, number, scheduled_at, released_at')
    .eq('scope', scope)
    .order('number')
  if (error) throw error
  return (data ?? []) as QuizRound[]
}

export function buildContext(
  guest: QuizContext['guest'],
  config: QuizConfig,
  allRounds: QuizRound[],
  now: Date = new Date()
): QuizContext {
  const scope: QuizScope = guest.is_test ? 'ensayo' : 'real'
  const rounds = allRounds.filter((r) => r.number <= config.roundCount)
  const mode = guest.is_test ? config.testMode : config.mode
  const released = releasedRounds(rounds, now)
  return {
    guest,
    scope,
    config,
    mode,
    rounds,
    released,
    status: computeQuizStatus({ mode, closesAt: config.closesAt }, released, now),
    now,
  }
}

export async function loadQuizContext(guestId: string): Promise<QuizContext | null> {
  const supabase = createServerClient()
  const { data: guest } = await supabase.from('guests').select('id, name, is_test').eq('id', guestId).maybeSingle()
  if (!guest) return null

  const config = await getQuizConfig()
  const rounds = await loadRounds(guest.is_test ? 'ensayo' : 'real')
  return buildContext(guest, config, rounds)
}

/** Cierra como "se acabó el tiempo" las preguntas abiertas que ya vencieron. */
async function closeExpired(ctx: QuizContext): Promise<void> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('quiz_answers')
    .select('id, expires_at')
    .eq('guest_id', ctx.guest.id)
    .is('answered_at', null)

  for (const row of data ?? []) {
    if (!isExpired(new Date(row.expires_at), ctx.now)) continue
    await supabase
      .from('quiz_answers')
      .update({ answered_at: row.expires_at, selected_index: null, is_correct: false, points: 0 })
      .eq('id', row.id)
      .is('answered_at', null)
  }
}

async function getAttempt(guestId: string): Promise<{ question_ids: string[] } | null> {
  const { data } = await createServerClient()
    .from('quiz_attempts')
    .select('question_ids')
    .eq('guest_id', guestId)
    .maybeSingle()
  return data
}

/** Sortea las preguntas del invitado la primera vez que juega. */
async function ensureAttempt(ctx: QuizContext): Promise<{ question_ids: string[] }> {
  const existing = await getAttempt(ctx.guest.id)
  if (existing) return existing

  const supabase = createServerClient()
  const { data: bank } = await supabase.from('quiz_questions').select('id').eq('is_active', true)
  const ids = (bank ?? []).map((q) => q.id as string)
  const drawn = drawQuestions(ids, ctx.config.roundCount * ctx.config.perRound)
  if (drawn.length < ctx.config.perRound) throw new QuizError(409, 'Todavía no hay preguntas cargadas')

  const { error } = await supabase.from('quiz_attempts').insert({ guest_id: ctx.guest.id, question_ids: drawn })
  // 23505: otra request del mismo invitado ganó la carrera; usamos su sorteo
  if (error && error.code !== '23505') throw error
  return (await getAttempt(ctx.guest.id))!
}

async function loadAnswers(guestId: string, questionIds: string[]): Promise<AnswerRow[]> {
  const { data } = await createServerClient().from('quiz_answers').select('*').eq('guest_id', guestId)
  const rows = (data ?? []) as AnswerRow[]
  const position = (r: AnswerRow) => questionIds.indexOf(r.question_id)
  return rows.sort((a, b) => position(a) - position(b))
}

async function loadQuestion(id: string): Promise<QuestionRow> {
  const { data } = await createServerClient()
    .from('quiz_questions')
    .select('id, prompt, options, correct_index, wrong_message')
    .eq('id', id)
    .single()
  if (!data) throw new QuizError(404, 'Pregunta no encontrada')
  return data as QuestionRow
}

/** Ranking de la tanda de juego del invitado (real o ensayo), ordenado y con posiciones. */
export async function loadRanking(ctx: Pick<QuizContext, 'guest' | 'config' | 'released' | 'status'>): Promise<QuizRankingRow[]> {
  const { data } = await createServerClient().from('quiz_ranking').select('*').eq('is_test', ctx.guest.is_test)
  const sorted = sortRanking((data ?? []) as Omit<QuizRankingRow, 'unfinished' | 'rank'>[])
  return sorted.map((row, i) => ({
    ...row,
    rank: i + 1,
    unfinished: isUnfinished({
      answered: row.answered,
      released: ctx.released,
      perRound: ctx.config.perRound,
      totalRounds: ctx.config.roundCount,
      finished: ctx.status === 'finished',
    }),
  }))
}

function summarizeRound(answers: AnswerRow[], round: number, perRound: number, rank: number | null): QuizRoundSummary {
  const mine = answers.filter((a) => a.round === round && a.answered_at !== null)
  return {
    round,
    correct: mine.filter((a) => a.is_correct).length,
    total: perRound,
    points: mine.reduce((sum, a) => sum + a.points, 0),
    rank,
  }
}

function effectiveTotalRounds(ctx: QuizContext, questionIds: string[] | null): number {
  if (!questionIds) return ctx.config.roundCount
  return Math.min(ctx.config.roundCount, Math.floor(questionIds.length / ctx.config.perRound))
}

/** Estado completo del invitado: lo que necesita la pantalla de Trivia. */
export async function buildState(ctx: QuizContext): Promise<QuizState> {
  await closeExpired(ctx)
  const attempt = await getAttempt(ctx.guest.id)
  const questionIds = attempt?.question_ids ?? null
  const answers = questionIds ? await loadAnswers(ctx.guest.id, questionIds) : []
  const totalRounds = effectiveTotalRounds(ctx, questionIds)
  const { perRound } = ctx.config

  const progress = guestProgress({
    answers: answers.map((a) => ({ answered: a.answered_at !== null })),
    released: ctx.released,
    perRound,
    totalRounds,
  })

  const ranking = await loadRanking(ctx)
  const meRow = ranking.find((r) => r.guest_id === ctx.guest.id) ?? null

  let question: QuizOpenQuestion | null = null
  if (ctx.status === 'open' && progress.hasOpenQuestion) {
    const open = answers[answers.length - 1]
    const q = await loadQuestion(open.question_id)
    const expiresAt = new Date(open.expires_at)
    question = {
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      round: open.round,
      position: (progress.nextIndex % perRound) + 1,
      perRound,
      secondsLeft: secondsLeft(expiresAt, ctx.now),
      totalSeconds: Math.round((expiresAt.getTime() - new Date(open.shown_at).getTime()) / 1000),
    }
  }

  const phase: QuizState['phase'] =
    ctx.status === 'closed' ? 'closed' : ctx.status === 'finished' ? 'finished' : progress.phase

  const lastRound =
    progress.completedRounds > 0
      ? summarizeRound(answers, progress.completedRounds, perRound, meRow?.rank ?? null)
      : null

  const firstAt = firstRoundMs(ctx.rounds)

  return {
    status: ctx.status,
    phase,
    releasedRounds: ctx.released,
    totalRounds,
    perRound,
    secondsPerQuestion: ctx.config.secondsPerQuestion,
    pendingCount: ctx.status === 'open' ? progress.pendingCount : 0,
    firstRoundAt: ctx.status === 'closed' && firstAt !== null ? new Date(firstAt).toISOString() : null,
    currentRound: ctx.status === 'open' ? progress.currentRound : null,
    question,
    me: {
      points: meRow?.points ?? 0,
      correct: meRow?.correct ?? 0,
      answered: meRow?.answered ?? 0,
      rank: meRow?.rank ?? null,
      totalPlayers: ranking.length,
    },
    lastRound,
    isTest: ctx.guest.is_test,
  }
}

/** Liviano, para la barra de navegación: alimenta el punto rojo y el aviso de tanda nueva. */
export async function buildStatus(ctx: QuizContext): Promise<{ status: QuizStatus; releasedRounds: number; pendingCount: number }> {
  if (ctx.status !== 'open') return { status: ctx.status, releasedRounds: ctx.released, pendingCount: 0 }
  const { count } = await createServerClient()
    .from('quiz_answers')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', ctx.guest.id)
    .not('answered_at', 'is', null)
  const { perRound, roundCount } = ctx.config
  const pendingCount = Math.max(0, Math.min(ctx.released, roundCount) * perRound - (count ?? 0))
  return { status: ctx.status, releasedRounds: ctx.released, pendingCount }
}

function assertOpen(ctx: QuizContext): void {
  if (ctx.status === 'finished') throw new QuizError(403, 'La trivia ya terminó')
  if (ctx.status !== 'open') throw new QuizError(403, 'La trivia todavía no empezó')
}

/** Muestra la siguiente pregunta (idempotente: si ya hay una abierta, la devuelve). */
export async function startNext(ctx: QuizContext): Promise<QuizState> {
  assertOpen(ctx)
  await closeExpired(ctx)
  const attempt = await ensureAttempt(ctx)
  const answers = await loadAnswers(ctx.guest.id, attempt.question_ids)

  const progress = guestProgress({
    answers: answers.map((a) => ({ answered: a.answered_at !== null })),
    released: ctx.released,
    perRound: ctx.config.perRound,
    totalRounds: effectiveTotalRounds(ctx, attempt.question_ids),
  })

  if (progress.phase === 'playing' && !progress.hasOpenQuestion) {
    const questionId = attempt.question_ids[progress.nextIndex]
    const expiresAt = new Date(ctx.now.getTime() + ctx.config.secondsPerQuestion * 1000)
    const { error } = await createServerClient().from('quiz_answers').insert({
      guest_id: ctx.guest.id,
      question_id: questionId,
      round: progress.currentRound,
      shown_at: ctx.now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    // 23505: doble click o dos pestañas; ya existe la fila de esa pregunta
    if (error && error.code !== '23505') throw error
  }

  return buildState(ctx)
}

async function toResult(
  ctx: QuizContext,
  row: AnswerRow,
  question: QuestionRow,
  questionIds: string[]
): Promise<QuizAnswerResult> {
  const answers = await loadAnswers(ctx.guest.id, questionIds)
  const { perRound } = ctx.config
  const totalRounds = effectiveTotalRounds(ctx, questionIds)
  const inRound = answers.filter((a) => a.round === row.round && a.answered_at !== null)
  const roundCompleted = inRound.length >= perRound

  let roundSummary: QuizRoundSummary | null = null
  if (roundCompleted) {
    const rank = (await loadRanking(ctx)).find((r) => r.guest_id === ctx.guest.id)?.rank ?? null
    roundSummary = summarizeRound(answers, row.round, perRound, rank)
  }

  const correct = row.is_correct
  return {
    correct,
    timedOut: row.selected_index === null,
    correctIndex: question.correct_index,
    correctLabel: question.options[question.correct_index],
    selectedIndex: row.selected_index,
    points: row.points,
    // El mensaje especial ("¡Perdiste! Pedite uno en la barra") solo aplica si se equivocó
    wrongMessage: !correct ? question.wrong_message : null,
    photo: pickQuizPhoto({
      correctLabel: question.options[question.correct_index],
      correct,
      timedOut: row.selected_index === null,
      seed: row.id,
    }),
    roundCompleted,
    roundSummary,
    nextRoundAvailable: row.round < Math.min(ctx.released, totalRounds),
    isLastRound: row.round >= totalRounds,
    totalPoints: answers.reduce((sum, a) => sum + a.points, 0),
  }
}

/**
 * Registra la respuesta. `selectedIndex = null` significa "se me acabó el tiempo" (lo manda
 * el cliente cuando llega a cero); el server solo lo acepta si el tiempo realmente venció.
 */
export async function submitAnswer(
  ctx: QuizContext,
  questionId: string,
  selectedIndex: number | null
): Promise<QuizAnswerResult> {
  assertOpen(ctx)
  const supabase = createServerClient()
  const attempt = await getAttempt(ctx.guest.id)
  if (!attempt) throw new QuizError(404, 'No hay una pregunta en curso')

  const { data } = await supabase
    .from('quiz_answers')
    .select('*')
    .eq('guest_id', ctx.guest.id)
    .eq('question_id', questionId)
    .maybeSingle()
  const row = data as AnswerRow | null
  if (!row) throw new QuizError(404, 'Esa pregunta no se mostró')
  if (row.round > ctx.released) throw new QuizError(403, 'Esa tanda todavía no está disponible')

  const question = await loadQuestion(questionId)

  if (row.answered_at !== null) {
    throw new QuizError(409, 'Ya respondiste esta pregunta', {
      result: await toResult(ctx, row, question, attempt.question_ids),
    })
  }

  if (selectedIndex !== null && (selectedIndex < 0 || selectedIndex >= question.options.length)) {
    throw new QuizError(400, 'Opción inválida')
  }

  const shownAt = new Date(row.shown_at)
  const expiresAt = new Date(row.expires_at)
  if (selectedIndex === null && ctx.now.getTime() < expiresAt.getTime() - GRACE_MS / 2) {
    throw new QuizError(400, 'Todavía hay tiempo')
  }

  const score =
    selectedIndex === null
      ? { points: 0, timedOut: true, correct: false }
      : scoreAnswer({
          shownAt,
          expiresAt,
          answeredAt: ctx.now,
          isCorrect: selectedIndex === question.correct_index,
        })

  const patch = score.timedOut
    ? { answered_at: row.expires_at, selected_index: null, is_correct: false, points: 0 }
    : {
        answered_at: ctx.now.toISOString(),
        selected_index: selectedIndex,
        is_correct: score.correct,
        points: score.points,
      }

  // Update atómico: solo gana el primero que encuentra la fila sin responder (un solo intento)
  const { data: updated, error } = await supabase
    .from('quiz_answers')
    .update(patch)
    .eq('id', row.id)
    .is('answered_at', null)
    .select('*')
  if (error) throw error

  if (!updated || updated.length === 0) {
    const { data: fresh } = await supabase.from('quiz_answers').select('*').eq('id', row.id).single()
    throw new QuizError(409, 'Ya respondiste esta pregunta', {
      result: await toResult(ctx, fresh as AnswerRow, question, attempt.question_ids),
    })
  }

  const result = await toResult(ctx, updated[0] as AnswerRow, question, attempt.question_ids)

  if (result.isLastRound && result.roundCompleted) {
    await supabase
      .from('quiz_attempts')
      .update({ finished_at: ctx.now.toISOString() })
      .eq('guest_id', ctx.guest.id)
      .is('finished_at', null)
  }
  return result
}

export async function buildRanking(ctx: QuizContext): Promise<QuizRanking> {
  const rows = await loadRanking(ctx)
  return {
    status: ctx.status,
    releasedRounds: ctx.released,
    totalRounds: ctx.config.roundCount,
    top: rows.slice(0, 10),
    me: rows.find((r) => r.guest_id === ctx.guest.id) ?? null,
    totalPlayers: rows.length,
    isTest: ctx.guest.is_test,
  }
}
