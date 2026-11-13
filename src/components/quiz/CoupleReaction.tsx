'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { QUIZ_PHOTOS } from '@/lib/quiz-photos'

/** Foto de la respuesta; si todavía no hay archivo (o falla la carga), muestra un emoji. */
export function CoupleReaction({ mood, src }: { mood: 'happy' | 'sad'; src: string | null }) {
  const [missing, setMissing] = useState(false)
  const happy = mood === 'happy'
  const alt = happy ? 'Los novios contentos' : 'Los novios tristes'

  return (
    <motion.div
      initial={{ scale: 0.6, rotate: happy ? -6 : 6, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-md"
    >
      {src && !missing ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" onError={() => setMissing(true)} />
      ) : (
        <div
          className={`flex aspect-[4/3] items-center justify-center text-8xl ${happy ? 'bg-sage-100' : 'bg-rose-100'}`}
          role="img"
          aria-label={alt}
        >
          {happy ? '🥳' : '😢'}
        </div>
      )}
    </motion.div>
  )
}

/** Precarga todas las fotos al empezar la tanda, para que no haya demora al responder (4G del salón). */
export function preloadReactionPhotos() {
  for (const photo of QUIZ_PHOTOS) {
    const img = new Image()
    img.src = photo.src
  }
}
