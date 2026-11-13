import { createServerClient } from '@/lib/supabase/server'
import { generateInviteToken, generateUniqueGuestCode } from '@/lib/invite'
import { offsetIso, releasedRounds, roundReleaseMs, sortRanking, isUnfinished } from '@/lib/quiz'
import { getQuizConfig, loadRounds, QuizError, saveQuizConfig } from '@/lib/quiz-server'
import type { QuizConfigKey } from '@/lib/quiz-server'
import { fillBotAnswers, BOT_CODE_PREFIX } from '@/lib/quiz-bots'
import type { QuizRankingRow, QuizScope } from '@/types'

const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const PAGE = 1000

export interface AdminRound {
  number: number
  scheduled_at: string | null
  released_at: string | null
  /** Momento desde el que está (o estará) liberada, o null si no tiene horario. */
  effective_at: string | null
  released: boolean
  completed_by: number
  players: number
}

export interface AdminQuestion {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  wrong_message: string | null
  is_active: boolean
  sort_order: number
  answered: number
  correct: number
}

interface AnswerLite {
  guest_id: string
  question_id: string
  round: number
  is_correct: boolean
}

/** PostgREST corta en 1000 filas: pagina hasta traer todo. */
async function fetchAllAnswers(): Promise<(AnswerLite & { is_test: boolean })[]> {
  const supabase = createServerClient()
  const out: (AnswerLite & { is_test: boolean })[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('quiz_answers')
      .select('guest_id, question_id, round, is_correct, guests!inner(is_test)')
      .not('answered_at', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data ?? []) {
      const guest = row.guests as unknown as { is_test: boolean } | { is_test: boolean }[]
      out.push({
        guest_id: row.guest_id,
        question_id: row.question_id,
        round: row.round,
        is_correct: row.is_correct,
        is_test: Array.isArray(guest) ? guest[0].is_test : guest.is_test,
      })
    }
    if (!data || data.length < PAGE) break
  }
  return out
}

async function rankingFor(isTest: boolean, config: Awaited<ReturnType<typeof getQuizConfig>>, released: number, finished: boolean): Promise<QuizRankingRow[]> {
  const { data } = await createServerClient().from('quiz_ranking').select('*').eq('is_test', isTest)
  return sortRanking((data ?? []) as Omit<QuizRankingRow, 'unfinished' | 'rank'>[]).map((row, i) => ({
    ...row,
    rank: i + 1,
    unfinished: isUnfinished({
      answered: row.answered,
      released,
      perRound: config.perRound,
      totalRounds: config.roundCount,
      finished,
    }),
  }))
}

export async function getAdminOverview() {
  await fillBotAnswers().catch((e) => console.error('[quiz] bots', e))

  const supabase = createServerClient()
  const now = new Date()
  const config = await getQuizConfig()
  const [realRounds, testRounds, questionsRes, answers, testGuestsRes, venueRes] = await Promise.all([
    loadRounds('real'),
    loadRounds('ensayo'),
    supabase.from('quiz_questions').select('*').order('sort_order').order('created_at'),
    fetchAllAnswers(),
    supabase.from('guests').select('id, name, code').eq('is_test', true).order('created_at'),
    supabase.from('settings').select('value').eq('key', 'venue_datetime').maybeSingle(),
  ])

  const describeRounds = (scope: QuizScope, all: typeof realRounds): AdminRound[] => {
    const isTest = scope === 'ensayo'
    const scoped = all.filter((r) => r.number <= config.roundCount)
    const released = releasedRounds(scoped, now)
    const mine = answers.filter((a) => a.is_test === isTest)
    return scoped.map((r) => {
      const perGuest = new Map<string, number>()
      for (const a of mine) if (a.round === r.number) perGuest.set(a.guest_id, (perGuest.get(a.guest_id) ?? 0) + 1)
      const effective = roundReleaseMs(r)
      return {
        number: r.number,
        scheduled_at: r.scheduled_at,
        released_at: r.released_at,
        effective_at: effective !== null ? new Date(effective).toISOString() : null,
        released: r.number <= released,
        completed_by: [...perGuest.values()].filter((n) => n >= config.perRound).length,
        players: perGuest.size,
      }
    })
  }

  const real = describeRounds('real', realRounds)
  const test = describeRounds('ensayo', testRounds)
  const realReleased = real.filter((r) => r.released).length
  const testReleased = test.filter((r) => r.released).length

  const stats = new Map<string, { answered: number; correct: number }>()
  for (const a of answers) {
    if (a.is_test) continue
    const s = stats.get(a.question_id) ?? { answered: 0, correct: 0 }
    s.answered++
    if (a.is_correct) s.correct++
    stats.set(a.question_id, s)
  }
  const questions: AdminQuestion[] = (questionsRes.data ?? []).map((q) => ({
    ...q,
    answered: stats.get(q.id)?.answered ?? 0,
    correct: stats.get(q.id)?.correct ?? 0,
  }))

  const testGuests = testGuestsRes.data ?? []
  const realFinished = config.mode === 'finished' || (config.closesAt ? now.getTime() >= new Date(config.closesAt).getTime() : false)

  return {
    config,
    venueDatetime: (venueRes.data?.value as string | null) ?? null,
    rounds: { real, ensayo: test },
    questions,
    ranking: await rankingFor(false, config, realReleased, realFinished),
    testRanking: await rankingFor(true, config, testReleased, config.testMode === 'finished'),
    counts: {
      realAnswers: answers.filter((a) => !a.is_test).length,
      testAnswers: answers.filter((a) => a.is_test).length,
      testGuests: testGuests.filter((g) => !String(g.code).startsWith(BOT_CODE_PREFIX)).length,
      bots: testGuests.filter((g) => String(g.code).startsWith(BOT_CODE_PREFIX)).length,
    },
    testGuests: testGuests.filter((g) => !String(g.code).startsWith(BOT_CODE_PREFIX)),
  }
}

// --- Configuración ---------------------------------------------------------

export interface ConfigPatch {
  mode?: 'auto' | 'closed' | 'finished'
  testMode?: 'auto' | 'closed' | 'finished'
  closesAt?: string | null
  roundCount?: number
  perRound?: number
  secondsPerQuestion?: number
}

export async function updateConfig(patch: ConfigPatch): Promise<void> {
  const structural = patch.roundCount !== undefined || patch.perRound !== undefined || patch.secondsPerQuestion !== undefined
  if (structural) {
    const supabase = createServerClient()
    const { count } = await supabase.from('quiz_answers').select('id', { count: 'exact', head: true })
    const config = await getQuizConfig()
    const rounds = await loadRounds('real')
    const realStarted = releasedRounds(rounds.filter((r) => r.number <= config.roundCount), new Date()) > 0
    if (realStarted || (count ?? 0) > 0) {
      throw new QuizError(409, 'No se puede cambiar la cantidad de tandas, preguntas ni segundos con respuestas registradas. Reseteá la trivia primero.')
    }
  }

  const values: Partial<Record<QuizConfigKey, string | null>> = {}
  if (patch.mode !== undefined) values.quiz_mode = patch.mode
  if (patch.testMode !== undefined) values.quiz_test_mode = patch.testMode
  if (patch.closesAt !== undefined) values.quiz_closes_at = patch.closesAt
  if (patch.roundCount !== undefined) values.quiz_round_count = String(patch.roundCount)
  if (patch.perRound !== undefined) values.quiz_questions_per_round = String(patch.perRound)
  if (patch.secondsPerQuestion !== undefined) values.quiz_seconds_per_question = String(patch.secondsPerQuestion)
  await saveQuizConfig(values)

  if (patch.roundCount !== undefined) {
    const supabase = createServerClient()
    const rows = (['real', 'ensayo'] as const).flatMap((scope) =>
      Array.from({ length: patch.roundCount! }, (_, i) => ({ scope, number: i + 1 }))
    )
    await supabase.from('quiz_rounds').upsert(rows, { onConflict: 'scope,number', ignoreDuplicates: true })
  }
}

// --- Tandas ----------------------------------------------------------------

export async function scheduleRound(scope: QuizScope, number: number, scheduledAt: string | null): Promise<void> {
  const supabase = createServerClient()
  const config = await getQuizConfig()
  const rounds = await loadRounds(scope)
  const released = releasedRounds(rounds.filter((r) => r.number <= config.roundCount), new Date())
  if (number <= released) throw new QuizError(409, 'La tanda ya se liberó: su horario no se puede cambiar')

  const { error } = await supabase
    .from('quiz_rounds')
    .update({ scheduled_at: scheduledAt, released_at: null })
    .eq('scope', scope)
    .eq('number', number)
  if (error) throw error
}

/** "Lanzar ahora": libera la tanda y, por el orden, también las anteriores que seguían cerradas. */
export async function releaseRound(scope: QuizScope, number: number): Promise<void> {
  const supabase = createServerClient()
  const now = new Date()
  const rounds = await loadRounds(scope)
  const target = rounds.find((r) => r.number === number)
  if (!target) throw new QuizError(404, 'Esa tanda no existe')

  const toRelease = rounds.filter((r) => {
    if (r.number > number) return false
    const at = roundReleaseMs(r)
    return at === null || at > now.getTime()
  })
  for (const r of toRelease) {
    const { error } = await supabase
      .from('quiz_rounds')
      .update({ released_at: now.toISOString() })
      .eq('scope', scope)
      .eq('number', r.number)
    if (error) throw error
  }
}

// --- Preguntas -------------------------------------------------------------

export interface QuestionInput {
  prompt: string
  options: string[]
  correct_index: number
  wrong_message?: string | null
  is_active?: boolean
}

export async function createQuestion(input: QuestionInput) {
  if (input.correct_index < 0 || input.correct_index >= input.options.length) {
    throw new QuizError(400, 'La respuesta correcta no está entre las opciones')
  }
  const supabase = createServerClient()
  const { data: last } = await supabase.from('quiz_questions').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({ ...input, wrong_message: input.wrong_message || null, sort_order: (last?.[0]?.sort_order ?? 0) + 10 })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new QuizError(409, 'Ya existe una pregunta con ese texto')
    throw error
  }
  return data
}

export async function updateQuestion(id: string, patch: Partial<QuestionInput>) {
  const supabase = createServerClient()
  if (patch.options || patch.correct_index !== undefined) {
    const { data: current } = await supabase.from('quiz_questions').select('options, correct_index').eq('id', id).single()
    const options = patch.options ?? (current?.options as string[])
    const correct = patch.correct_index ?? current?.correct_index
    if (correct === undefined || correct < 0 || correct >= options.length) {
      throw new QuizError(400, 'La respuesta correcta no está entre las opciones')
    }
  }
  const update: Record<string, unknown> = { ...patch }
  if ('wrong_message' in patch) update.wrong_message = patch.wrong_message || null
  const { data, error } = await supabase.from('quiz_questions').update(update).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw new QuizError(409, 'Ya existe una pregunta con ese texto')
    throw error
  }
  return data
}

// --- Resets ----------------------------------------------------------------

export async function resetGuest(guestId: string): Promise<void> {
  const supabase = createServerClient()
  await supabase.from('quiz_answers').delete().eq('guest_id', guestId)
  await supabase.from('quiz_attempts').delete().eq('guest_id', guestId)
}

/** Resetea la trivia real: respuestas, sorteos y "Lanzar ahora". Los horarios programados se conservan. */
export async function resetReal(): Promise<void> {
  const supabase = createServerClient()
  const { data: testRows } = await supabase.from('guests').select('id').eq('is_test', true)
  const testIds = (testRows ?? []).map((g) => g.id as string)

  for (const table of ['quiz_answers', 'quiz_attempts'] as const) {
    let query = supabase.from(table).delete()
    query = testIds.length > 0 ? query.not('guest_id', 'in', `(${testIds.join(',')})`) : query.neq('guest_id', ZERO_UUID)
    const { error } = await query
    if (error) throw error
  }
  const { error } = await supabase.from('quiz_rounds').update({ released_at: null }).eq('scope', 'real')
  if (error) throw error
}

// --- Modo ensayo -----------------------------------------------------------

export async function createTestGuest(name?: string) {
  const supabase = createServerClient()
  const { count } = await supabase.from('guests').select('id', { count: 'exact', head: true }).eq('is_test', true).not('code', 'like', `${BOT_CODE_PREFIX}%`)
  const code = await generateUniqueGuestCode(supabase)
  const { data, error } = await supabase
    .from('guests')
    .insert({
      name: name?.trim() || `Invitado de prueba ${(count ?? 0) + 1}`,
      code,
      is_active: true,
      is_test: true,
      early_access: true,
      invite_token: generateInviteToken(),
    })
    .select('id, name, code')
    .single()
  if (error) throw error
  return data
}

/** Programa las tandas de ensayo a +1, +4 y +7 minutos y reinicia las que se hubieran lanzado. */
export async function startQuickRehearsal(): Promise<void> {
  const supabase = createServerClient()
  const config = await getQuizConfig()
  const now = new Date()
  for (let n = 1; n <= config.roundCount; n++) {
    const { error } = await supabase
      .from('quiz_rounds')
      .update({ scheduled_at: offsetIso(now, 1 + (n - 1) * 3), released_at: null })
      .eq('scope', 'ensayo')
      .eq('number', n)
    if (error) throw error
  }
  await saveQuizConfig({ quiz_test_mode: 'auto' })
}

/**
 * "Reiniciar ensayo": borra respuestas y sorteos de los invitados de prueba y vuelve a cerrar las
 * tandas de ensayo. Conserva las personas y sus códigos, así pueden volver a probar con el mismo link.
 */
export async function resetRehearsal(): Promise<void> {
  const supabase = createServerClient()
  const { data: testRows, error: readError } = await supabase.from('guests').select('id').eq('is_test', true)
  if (readError) throw readError
  const ids = (testRows ?? []).map((g) => g.id as string)

  if (ids.length > 0) {
    const { error: answersError } = await supabase.from('quiz_answers').delete().in('guest_id', ids)
    if (answersError) throw answersError
    const { error: attemptsError } = await supabase.from('quiz_attempts').delete().in('guest_id', ids)
    if (attemptsError) throw attemptsError
  }
  const { error } = await supabase
    .from('quiz_rounds')
    .update({ scheduled_at: null, released_at: null })
    .eq('scope', 'ensayo')
  if (error) throw error
  await saveQuizConfig({ quiz_test_mode: 'auto' })
}

/** Borra todos los invitados de prueba (sus sorteos y respuestas caen por cascade) y limpia las tandas de ensayo. */
export async function deleteRehearsal(): Promise<{ remaining: number }> {
  const supabase = createServerClient()
  const { error } = await supabase.from('guests').delete().eq('is_test', true)
  if (error) throw error
  await supabase.from('quiz_rounds').update({ scheduled_at: null, released_at: null }).eq('scope', 'ensayo')
  await saveQuizConfig({ quiz_test_mode: 'auto' })
  const { count } = await supabase.from('guests').select('id', { count: 'exact', head: true }).eq('is_test', true)
  return { remaining: count ?? 0 }
}
