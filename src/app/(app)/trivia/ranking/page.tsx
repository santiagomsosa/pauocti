'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { BotanicalDivider } from '@/components/decorations'
import { cn } from '@/lib/utils'
import type { QuizRanking, QuizRankingRow } from '@/types'

const POLL_MS = 10_000
const MEDALS = ['🥇', '🥈', '🥉']

function Row({ row, isMe }: { row: QuizRankingRow; isMe: boolean }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
        isMe ? 'border-ink-300 bg-ink-50' : 'border-cream-200 bg-white'
      )}
    >
      <span className="w-8 text-center text-lg">{MEDALS[row.rank - 1] ?? <span className="text-sm text-stone-400">{row.rank}°</span>}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-stone-800">
          {row.name}
          {isMe && <span className="ml-1.5 text-xs font-normal text-ink-500">(vos)</span>}
        </span>
        {row.unfinished && <span className="block text-xs text-stone-400">(no terminó)</span>}
      </span>
      <span className="text-right">
        <span className="block font-title tabular-nums text-stone-800">{row.points} pts</span>
        <span className="block text-xs text-stone-400">{row.correct} correctas</span>
      </span>
    </li>
  )
}

function Podium({ top }: { top: QuizRankingRow[] }) {
  // Orden visual: 2°, 1°, 3°
  const order = [top[1], top[0], top[2]].filter(Boolean)
  const heights: Record<number, string> = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }

  return (
    <div className="flex items-end justify-center gap-2 pb-2 pt-4">
      {order.map((row) => (
        <div key={row.guest_id} className="flex w-1/3 flex-col items-center text-center">
          <span className="text-3xl">{MEDALS[row.rank - 1]}</span>
          <span className="w-full truncate px-1 text-sm font-semibold text-stone-800">{row.name}</span>
          <span className="text-xs text-stone-500">{row.points} pts</span>
          <div className={cn('mt-1 w-full rounded-t-xl bg-ink-200', heights[row.rank])} />
        </div>
      ))}
    </div>
  )
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<QuizRanking | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/quiz/ranking', { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const data: { ranking: QuizRanking } = await res.json()
        if (!cancelled) {
          setRanking(data.ranking)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const finished = ranking?.status === 'finished'
  const meInTop = ranking?.top.some((r) => r.guest_id === ranking.me?.guest_id) ?? false

  return (
    <div className={cn('py-6', ranking?.me && 'pb-24')}>
      <Link href="/trivia" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500">
        <ArrowLeft className="h-4 w-4" /> Volver a la trivia
      </Link>

      <div className="pb-4">
        <h1 className="font-script text-4xl text-stone-800 leading-tight">Ranking</h1>
        <BotanicalDivider className="-mt-1 h-4 w-20 text-sage-400" />
        {ranking && (
          <p className="mt-2 text-sm text-stone-500">
            {finished
              ? 'Resultado final'
              : ranking.releasedRounds > 0
                ? `Tanda ${Math.min(ranking.releasedRounds, ranking.totalRounds)} de ${ranking.totalRounds}`
                : 'Todavía no empezó'}
            {ranking.isTest && ' · modo ensayo'}
          </p>
        )}
      </div>

      {!ranking && !error && (
        <div className="flex justify-center py-16 text-ink-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!ranking && error && <p className="py-10 text-center text-stone-500">No pudimos cargar el ranking.</p>}

      {ranking && ranking.top.length === 0 && (
        <p className="py-10 text-center text-stone-500">Todavía nadie respondió. ¡Sé el primero!</p>
      )}

      {ranking && ranking.top.length > 0 && (
        <>
          {finished && <Podium top={ranking.top} />}
          <ul className="space-y-2">
            {ranking.top.map((row) => (
              <Row key={row.guest_id} row={row} isMe={row.guest_id === ranking.me?.guest_id} />
            ))}
          </ul>
        </>
      )}

      {ranking?.me && !meInTop && (
        <div className="fixed inset-x-0 bottom-[3.75rem] z-30 px-4">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-ink-300 bg-ink-50 px-3 py-2.5 shadow-md">
              <p className="text-center text-sm text-ink-600">
                Estás <strong>{ranking.me.rank}°</strong> de {ranking.totalPlayers} · {ranking.me.points} pts
                {ranking.me.unfinished && <span className="text-stone-400"> · (no terminó)</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
