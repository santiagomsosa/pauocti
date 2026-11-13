'use client'

import { motion } from 'motion/react'

export function TimerBar({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const start = Math.min(100, Math.max(0, (secondsLeft / Math.max(1, totalSeconds)) * 100))
  const urgent = secondsLeft <= 5

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-200" role="timer" aria-label={`${secondsLeft} segundos`}>
      <motion.div
        key={`${totalSeconds}-${start.toFixed(1)}`}
        className={urgent ? 'h-full rounded-full bg-rose-400' : 'h-full rounded-full bg-ink-400'}
        initial={{ width: `${start}%` }}
        animate={{ width: '0%' }}
        transition={{ duration: secondsLeft, ease: 'linear' }}
      />
    </div>
  )
}
