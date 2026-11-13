'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, ChevronRight } from 'lucide-react'

/** Card destacada en /inicio cuando hay preguntas de la trivia esperando. */
export function QuizHomeCard() {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/quiz/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.status === 'open') setPending(data.pendingCount)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (pending === 0) return null

  return (
    <Link
      href="/trivia"
      className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 shadow-sm transition-colors hover:bg-ink-100"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink-500 text-white">
        <Brain className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block font-script text-2xl leading-tight text-ink-600">¡Nueva tanda de la trivia!</span>
        <span className="block text-sm text-stone-500">¿Quién conoce más a los novios?</span>
      </span>
      <span className="flex items-center gap-0.5 text-sm font-medium text-ink-500">
        Jugar <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
