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
    <div className="flex justify-center gap-3">
      {units.map((u) => (
        <div key={u.label} className="bg-white rounded-xl shadow-sm px-3 py-2.5 min-w-16 text-center">
          <motion.span
            key={u.value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="block font-script text-3xl text-terracotta-500"
          >
            {u.value}
          </motion.span>
          <span className="text-[11px] uppercase tracking-wide text-stone-400">{u.label}</span>
        </div>
      ))}
    </div>
  )
}
