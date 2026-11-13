import { createServerClient } from '@/lib/supabase/server'
import { generateInviteToken } from '@/lib/invite'
import { drawQuestions, releasedRounds, scoreAnswer } from '@/lib/quiz'
import { getQuizConfig, loadRounds } from '@/lib/quiz-server'

// Jugadores ficticios del modo ensayo: cuando se libera una tanda de ensayo, el server les carga
// respuestas al azar para que el ranking se mueva como en la fiesta. Se identifican por el código BOTxx.

export const BOT_CODE_PREFIX = 'BOT'

const BOT_NAMES = [
  'Sofía Márquez', 'Mateo Giménez', 'Lucía Benítez', 'Tomás Ibarra', 'Valentina Rojas',
  'Joaquín Paz', 'Camila Duarte', 'Franco Medina', 'Julieta Sosa', 'Nicolás Acosta',
  'Martina Ferrari', 'Agustín Luna', 'Florencia Vega', 'Bautista Ríos', 'Carolina Peralta',
  'Santino Aguirre', 'Micaela Torres', 'Lautaro Cabrera', 'Rocío Herrera', 'Gonzalo Molina',
  'Abril Domínguez', 'Ignacio Ponce', 'Delfina Correa', 'Facundo Silva', 'Agustina Rey',
  'Maximiliano Cruz', 'Brenda Gallo', 'Ramiro Navarro', 'Antonella Ortiz', 'Ezequiel Funes',
]

export async function createBots(count: number): Promise<number> {
  const supabase = createServerClient()
  const { data: existing } = await supabase.from('guests').select('code').like('code', `${BOT_CODE_PREFIX}%`)
  const taken = new Set((existing ?? []).map((g) => g.code as string))

  const rows = []
  for (let i = 1; rows.length < count && i < 1000; i++) {
    const code = `${BOT_CODE_PREFIX}${String(i).padStart(2, '0')}`
    if (taken.has(code)) continue
    rows.push({
      name: `${BOT_NAMES[(i - 1) % BOT_NAMES.length]} (ficticio)`,
      code,
      is_active: true,
      is_test: true,
      early_access: true,
      invite_token: generateInviteToken(),
    })
  }
  if (rows.length === 0) return 0
  const { error } = await supabase.from('guests').insert(rows)
  if (error) throw error
  return rows.length
}

interface QuestionInfo {
  id: string
  options: string[]
  correct_index: number
}

/** Perfil estable por bot: nivel de acierto y hasta qué tanda juega. */
function profile(index: number) {
  return {
    skill: 0.35 + ((index * 37) % 60) / 100,
    lastRound: index % 6 === 0 ? 1 : index % 9 === 0 ? 2 : 3,
  }
}

/** Completa, para cada bot, las tandas de ensayo ya liberadas que todavía no jugó. Idempotente. */
export async function fillBotAnswers(): Promise<void> {
  const supabase = createServerClient()
  const { data: botRows } = await supabase
    .from('guests')
    .select('id, code')
    .like('code', `${BOT_CODE_PREFIX}%`)
    .eq('is_test', true)
    .order('code')
  const bots = botRows ?? []
  if (bots.length === 0) return

  const config = await getQuizConfig()
  if (config.testMode !== 'auto') return
  const now = new Date()
  const rounds = (await loadRounds('ensayo')).filter((r) => r.number <= config.roundCount)
  const released = releasedRounds(rounds, now)
  if (released === 0) return

  const { data: questionRows } = await supabase
    .from('quiz_questions')
    .select('id, options, correct_index')
    .eq('is_active', true)
  const questions = (questionRows ?? []) as QuestionInfo[]
  const need = config.roundCount * config.perRound
  if (questions.length < config.perRound) return

  const botIds = bots.map((b) => b.id as string)
  const [{ data: attempts }, { data: answers }] = await Promise.all([
    supabase.from('quiz_attempts').select('guest_id, question_ids').in('guest_id', botIds),
    supabase.from('quiz_answers').select('guest_id, round').in('guest_id', botIds),
  ])
  const attemptByBot = new Map((attempts ?? []).map((a) => [a.guest_id as string, a.question_ids as string[]]))
  const doneRounds = new Set((answers ?? []).map((a) => `${a.guest_id}:${a.round}`))
  const byId = new Map(questions.map((q) => [q.id, q]))

  const newAttempts: { guest_id: string; question_ids: string[] }[] = []
  const newAnswers: Record<string, unknown>[] = []

  bots.forEach((bot, index) => {
    const { skill, lastRound } = profile(index + 1)
    let ids = attemptByBot.get(bot.id as string)
    if (!ids) {
      ids = drawQuestions(questions.map((q) => q.id), need)
      newAttempts.push({ guest_id: bot.id as string, question_ids: ids })
    }

    for (let round = 1; round <= Math.min(released, config.roundCount, lastRound); round++) {
      if (doneRounds.has(`${bot.id}:${round}`)) continue
      const roundIds = ids.slice((round - 1) * config.perRound, round * config.perRound)
      let cursor = now.getTime() - roundIds.length * 25_000

      for (const questionId of roundIds) {
        const question = byId.get(questionId)
        if (!question) continue
        const wantsCorrect = Math.random() < skill
        const selected = wantsCorrect
          ? question.correct_index
          : (question.correct_index + 1 + Math.floor(Math.random() * (question.options.length - 1))) % question.options.length
        const shownAt = new Date(cursor)
        const expiresAt = new Date(shownAt.getTime() + config.secondsPerQuestion * 1000)
        const answeredAt = new Date(shownAt.getTime() + (2 + Math.random() * 16) * 1000)
        const score = scoreAnswer({ shownAt, expiresAt, answeredAt, isCorrect: selected === question.correct_index })
        newAnswers.push({
          guest_id: bot.id,
          question_id: questionId,
          round,
          shown_at: shownAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          answered_at: answeredAt.toISOString(),
          selected_index: selected,
          is_correct: score.correct,
          points: score.points,
        })
        cursor += 25_000
      }
    }
  })

  if (newAttempts.length > 0) {
    await supabase.from('quiz_attempts').upsert(newAttempts, { onConflict: 'guest_id', ignoreDuplicates: true })
  }
  if (newAnswers.length > 0) {
    await supabase.from('quiz_answers').upsert(newAnswers, { onConflict: 'guest_id,question_id', ignoreDuplicates: true })
  }
}
