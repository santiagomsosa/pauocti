'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

function getRemaining(target: number) {
  const diff = Math.max(0, target - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function Countdown({ weddingDatetime }: { weddingDatetime: string | null }) {
  const target = weddingDatetime ? new Date(weddingDatetime).getTime() : null
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null)

  useEffect(() => {
    if (!target) return
    setRemaining(getRemaining(target))
    const id = setInterval(() => setRemaining(getRemaining(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!remaining) return null

  const units = [
    { label: 'días', value: remaining.days },
    { label: 'hs', value: remaining.hours },
    { label: 'min', value: remaining.minutes },
    { label: 'seg', value: remaining.seconds },
  ]

  return (
    <div className="space-y-2 text-center">
      <p className="font-title text-xs uppercase tracking-[0.3em] text-sage-500">Faltan</p>
      <div className="flex items-center justify-center">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center">
            {i > 0 && <span className="mx-1.5 mb-4 w-1.5 h-1.5 rounded-full bg-rose-300" />}
            <div className="flex flex-col items-center px-1.5">
              <div className="flex h-11 w-14 items-center justify-center">
                <motion.span
                  key={u.value}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-invite text-4xl font-medium leading-none text-ink-500 tabular-nums"
                >
                  {String(u.value).padStart(2, '0')}
                </motion.span>
              </div>
              <span className="font-title text-[11px] uppercase tracking-widest text-stone-400">{u.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
