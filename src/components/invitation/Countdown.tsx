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
  const [remaining, setRemaining] = useState(() => (target ? getRemaining(target) : null))

  useEffect(() => {
    if (!target) return
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
    <div className="flex justify-center divide-x divide-terracotta-200/60">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center px-3">
          <div className="flex h-11 w-16 items-center justify-center">
            <motion.span
              key={u.value}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="font-script text-4xl leading-none text-terracotta-500 tabular-nums"
            >
              {String(u.value).padStart(2, '0')}
            </motion.span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-stone-400">{u.label}</span>
        </div>
      ))}
    </div>
  )
}
