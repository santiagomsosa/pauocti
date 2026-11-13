'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Loader2, Trophy } from 'lucide-react'
import { BotanicalDivider } from '@/components/decorations'
import { CoupleReaction, preloadReactionPhotos } from '@/components/quiz/CoupleReaction'
import { TimerBar } from '@/components/quiz/TimerBar'
import { cn } from '@/lib/utils'
import type { QuizAnswerResult, QuizState } from '@/types'

type View = 'loading' | 'closed' | 'ready' | 'question' | 'result' | 'roundEnd' | 'waiting' | 'done' | 'finished'

const STATUS_POLL_MS = 15_000
const MAX_TIMEOUT_MS = 2_147_000_000

function viewFromState(s: QuizState): View {
  switch (s.phase) {
    case 'closed':
      return 'closed'
    case 'finished':
      return 'finished'
    case 'waiting':
      return 'waiting'
    case 'done':
      return 'done'
    default:
      return s.question ? 'question' : 'ready'
  }
}

function ordinal(n: number | null): string {
  return n === null ? '—' : `${n}°`
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-cream-200 bg-white p-5 shadow-sm', className)}>{children}</div>
  )
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-full bg-ink-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-ink-600 disabled:opacity-50',
        props.className
      )}
    >
      {children}
    </button>
  )
}

function RankingLink({ className }: { className?: string }) {
  return (
    <Link
      href="/trivia/ranking"
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3 text-base font-medium text-ink-600 transition-colors hover:bg-ink-50',
        className
      )}
    >
      <Trophy className="h-4 w-4" /> Ver ranking
    </Link>
  )
}

function ClosedView({ state, onZero }: { state: QuizState; onZero: () => void }) {
  const target = state.firstRoundAt ? new Date(state.firstRoundAt).getTime() : null
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!target) return
    const tick = () => setLeft(Math.max(0, target - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    const timeout = setTimeout(onZero, Math.min(MAX_TIMEOUT_MS, Math.max(0, target - Date.now()) + 500))
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [target, onZero])

  return (
    <div className="space-y-4">
      <Panel className="space-y-2 text-center">
        <p className="text-4xl">🎲</p>
        <p className="text-stone-600">La trivia empieza en</p>
        {left !== null ? (
          <p className="font-title text-4xl tabular-nums text-ink-600">{formatCountdown(left)}</p>
        ) : (
          <p className="text-stone-500">Muy pronto. Mantené la app abierta.</p>
        )}
      </Panel>
      <Panel className="space-y-2 text-sm text-stone-600">
        <p className="font-semibold text-stone-800">Cómo se juega</p>
        <ul className="space-y-1.5">
          <li>🕒 {state.totalRounds} tandas durante la noche</li>
          <li>❓ {state.perRound} preguntas cada una</li>
          <li>⏱️ {state.secondsPerQuestion} segundos por pregunta</li>
          <li>☝️ Un solo intento por pregunta</li>
          <li>🏆 Gana el que más sabe de los novios (¡y el más rápido!)</li>
        </ul>
      </Panel>
    </div>
  )
}

export default function TriviaPage() {
  const [state, setState] = useState<QuizState | null>(null)
  const [view, setView] = useState<View>('loading')
  const [result, setResult] = useState<QuizAnswerResult | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const submitting = useRef(false)
  const stateRef = useRef<QuizState | null>(null)
  const submitRef = useRef<(index: number | null) => void>(() => {})

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const applyState = useCallback((s: QuizState, nextView?: View) => {
    setState(s)
    setSelected(null)
    setView(nextView ?? viewFromState(s))
  }, [])

  const load = useCallback(
    async (opts: { keepView?: boolean } = {}) => {
      try {
        const res = await fetch('/api/quiz', { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const data: { state: QuizState } = await res.json()
        setLoadError(false)
        if (opts.keepView) setState(data.state)
        else applyState(data.state)
      } catch {
        setLoadError(true)
      }
    },
    [applyState]
  )

  useEffect(() => {
    // Carga inicial desde el server
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Mientras está cerrada o esperando, consulta el estado liviano para enterarse de una tanda nueva.
  useEffect(() => {
    if (view !== 'closed' && view !== 'waiting') return
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/quiz/status', { cache: 'no-store' })
        if (!res.ok) return
        const s: { status: string; releasedRounds: number } = await res.json()
        const current = stateRef.current
        if (current && (s.status !== current.status || s.releasedRounds !== current.releasedRounds)) load()
      } catch {}
    }, STATUS_POLL_MS)
    return () => clearInterval(timer)
  }, [view, load])

  useEffect(() => {
    if (view === 'ready') preloadReactionPhotos()
  }, [view])

  const submit = useCallback(
    async (index: number | null) => {
      const question = stateRef.current?.question
      if (!question || submitting.current) return
      submitting.current = true
      setSelected(index)
      setBusy(true)
      try {
        const res = await fetch('/api/quiz/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: question.id, selectedIndex: index }),
        })
        const data = await res.json()
        if (res.ok || (res.status === 409 && data.result)) {
          setResult(data.result)
          setView('result')
          window.dispatchEvent(new Event('quiz:changed'))
        } else if (res.status === 400 && index === null) {
          // El reloj del celular va un poco adelantado: reintenta en un segundo
          submitting.current = false
          setTimeout(() => submitRef.current(null), 1000)
          return
        } else if (res.status === 403) {
          await load()
        } else {
          toast.error(data.error ?? 'No se pudo enviar la respuesta')
          submitting.current = false
          setSelected(null)
        }
      } catch {
        toast.error('Sin conexión. Probá de nuevo.')
        submitting.current = false
        setSelected(null)
      } finally {
        setBusy(false)
      }
    },
    [load]
  )

  useEffect(() => {
    submitRef.current = submit
  }, [submit])

  // Reloj de la pregunta: el server fija el vencimiento; acá solo se muestra.
  const question = state?.question ?? null
  useEffect(() => {
    if (view !== 'question' || !question) return
    submitting.current = false
    const deadline = Date.now() + question.secondsLeft * 1000
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) submit(null)
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [view, question, submit])

  async function startNext() {
    setBusy(true)
    try {
      const res = await fetch('/api/quiz/next', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo cargar la pregunta')
        await load()
        return
      }
      setResult(null)
      setSelected(null)
      applyState(data.state)
    } catch {
      toast.error('Sin conexión. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function afterResult() {
    if (result?.roundCompleted) {
      setView('roundEnd')
      await load({ keepView: true })
      return
    }
    await startNext()
  }

  if (loadError && !state) {
    return (
      <div className="py-10 text-center space-y-3">
        <p className="text-stone-500">No pudimos cargar la trivia.</p>
        <PrimaryButton onClick={() => load()} className="mx-auto max-w-xs">
          Reintentar
        </PrimaryButton>
      </div>
    )
  }

  if (!state || view === 'loading') {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const title = (
    <div className="pb-4">
      <h1 className="font-script text-4xl text-stone-800 leading-tight">Trivia</h1>
      <BotanicalDivider className="-mt-1 h-4 w-20 text-sage-400" />
      {state.isTest && (
        <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          Modo ensayo
        </span>
      )}
    </div>
  )

  return (
    <div className="py-6">
      {title}

      {view === 'closed' && <ClosedView state={state} onZero={load} />}

      {view === 'ready' && (
        <Panel className="space-y-4 text-center">
          <p className="text-5xl">🎉</p>
          <p className="font-script text-3xl text-ink-600">
            Tanda {state.currentRound ?? state.releasedRounds} de {state.totalRounds}
          </p>
          <p className="text-sm text-stone-500">
            {state.perRound} preguntas · {state.secondsPerQuestion} segundos cada una · un solo intento
          </p>
          <PrimaryButton onClick={startNext} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : '¡Jugar!'}
          </PrimaryButton>
        </Panel>
      )}

      {view === 'question' && question && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>
                Tanda {question.round} · {question.position}/{question.perRound}
              </span>
              <span className={cn('font-title tabular-nums', left <= 5 && 'text-rose-500')}>{left} s</span>
            </div>
            <TimerBar secondsLeft={question.secondsLeft} totalSeconds={question.totalSeconds} />
          </div>

          <Panel>
            <h2 className="text-center text-xl font-semibold leading-snug text-stone-800">{question.prompt}</h2>
          </Panel>

          {question.options.length === 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {question.options.map((option, i) => (
                <button
                  key={option}
                  disabled={busy || selected !== null}
                  onClick={() => submit(i)}
                  className={cn(
                    'rounded-2xl border-2 px-4 py-8 font-script text-4xl transition-all active:scale-95 disabled:cursor-not-allowed',
                    selected === i
                      ? 'border-ink-500 bg-ink-500 text-white'
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 disabled:opacity-60'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {question.options.map((option, i) => (
                <button
                  key={option}
                  disabled={busy || selected !== null}
                  onClick={() => submit(i)}
                  className={cn(
                    'w-full rounded-2xl border-2 px-4 py-4 text-lg font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed',
                    selected === i
                      ? 'border-ink-500 bg-ink-500 text-white'
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 disabled:opacity-60'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'result' && result && (
        <div className="space-y-5 text-center">
          <CoupleReaction mood={result.correct ? 'happy' : 'sad'} src={result.photo} />
          <div className="space-y-1">
            {result.correct ? (
              <>
                <p className="font-script text-4xl text-sage-600">¡Correcto!</p>
                <p className="text-lg font-semibold text-stone-700">+{result.points} pts</p>
              </>
            ) : result.wrongMessage ? (
              <p className="font-script text-3xl text-rose-500">{result.wrongMessage}</p>
            ) : result.timedOut ? (
              <p className="text-xl text-stone-700">
                ¡Se te acabó el tiempo! Era <strong className="text-ink-600">{result.correctLabel}</strong>
              </p>
            ) : (
              <p className="text-xl text-stone-700">
                ¡Nooo! Era <strong className="text-ink-600">{result.correctLabel}</strong> 😅
              </p>
            )}
          </div>
          <PrimaryButton onClick={afterResult} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : result.roundCompleted ? 'Ver resultado' : 'Siguiente'}
          </PrimaryButton>
        </div>
      )}

      {view === 'roundEnd' && result?.roundSummary && (
        <Panel className="space-y-4 text-center">
          <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-5xl">
            {result.isLastRound ? '🏆' : '🎉'}
          </motion.p>
          {result.isLastRound ? (
            <>
              <p className="font-script text-3xl text-ink-600">¡Terminaste la trivia!</p>
              <p className="text-stone-600">
                <strong>{state.me.correct}</strong> de {state.totalRounds * state.perRound} correctas ·{' '}
                <strong>{result.totalPoints} pts</strong>
                {state.me.rank !== null && (
                  <>
                    {' '}
                    · vas <strong>{ordinal(state.me.rank)}</strong>
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="font-script text-3xl text-ink-600">¡Terminaste la tanda {result.roundSummary.round}!</p>
              <p className="text-stone-600">
                {result.roundSummary.correct} de {result.roundSummary.total} correctas · +{result.roundSummary.points} pts
                {result.roundSummary.rank !== null && (
                  <>
                    {' '}
                    · vas <strong>{ordinal(result.roundSummary.rank)}</strong>
                  </>
                )}
              </p>
              {result.nextRoundAvailable ? (
                <p className="font-medium text-ink-600">¡Ya salió la tanda {result.roundSummary.round + 1}!</p>
              ) : (
                <p className="font-medium text-ink-600">
                  Estate atento porque van a aparecer más durante la noche 👀
                </p>
              )}
            </>
          )}
          <div className="space-y-2 pt-1">
            {result.nextRoundAvailable && !result.isLastRound && (
              <PrimaryButton onClick={startNext} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Seguir jugando'}
              </PrimaryButton>
            )}
            <RankingLink />
          </div>
        </Panel>
      )}

      {view === 'waiting' && (
        <Panel className="space-y-4 text-center">
          <p className="text-5xl">👀</p>
          {state.lastRound && (
            <p className="text-stone-600">
              Tanda {state.lastRound.round}: {state.lastRound.correct} de {state.lastRound.total} correctas · +
              {state.lastRound.points} pts
            </p>
          )}
          <p className="font-medium text-ink-600">Estate atento porque van a aparecer más durante la noche</p>
          <p className="text-sm text-stone-500">
            Llevás <strong>{state.me.points} pts</strong>
            {state.me.rank !== null && (
              <>
                {' '}
                · vas <strong>{ordinal(state.me.rank)}</strong> de {state.me.totalPlayers}
              </>
            )}
          </p>
          <RankingLink />
        </Panel>
      )}

      {view === 'done' && (
        <Panel className="space-y-4 text-center">
          <p className="text-5xl">🏆</p>
          <p className="font-script text-3xl text-ink-600">¡Terminaste la trivia!</p>
          <p className="text-stone-600">
            <strong>{state.me.correct}</strong> de {state.totalRounds * state.perRound} correctas ·{' '}
            <strong>{state.me.points} pts</strong>
          </p>
          <p className="text-stone-500">
            Vas <strong>{ordinal(state.me.rank)}</strong> de {state.me.totalPlayers}
          </p>
          <RankingLink />
        </Panel>
      )}

      {view === 'finished' && (
        <Panel className="space-y-4 text-center">
          <p className="text-5xl">🏁</p>
          <p className="font-script text-3xl text-ink-600">La trivia terminó</p>
          {state.me.answered > 0 ? (
            <p className="text-stone-600">
              Sumaste <strong>{state.me.points} pts</strong> con {state.me.correct} correctas · quedaste{' '}
              <strong>{ordinal(state.me.rank)}</strong> de {state.me.totalPlayers}
            </p>
          ) : (
            <p className="text-stone-500">Esta vez no participaste, ¡pero mirá cómo quedó el podio!</p>
          )}
          <RankingLink />
        </Panel>
      )}
    </div>
  )
}
