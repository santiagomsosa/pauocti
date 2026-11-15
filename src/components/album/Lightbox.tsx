'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { downloadUrl, formatTime } from '@/lib/album'
import type { AlbumPhoto } from '@/lib/album'

/** Visor de fotos a pantalla completa: quién la sacó, a qué hora, reto, comentario y descarga del original. */
export function Lightbox({
  photos,
  index,
  onClose,
  onMove,
  title,
}: {
  /** Encabezado opcional del recorrido, por ejemplo "Fotos de Ana". */
  title?: string
  photos: AlbumPhoto[]
  index: number
  onClose: () => void
  onMove: (delta: number) => void
}) {
  const photo = photos[index]
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onMove(-1)
      if (e.key === 'ArrowRight') onMove(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touchStart.current
        touchStart.current = null
        if (!start) return
        const dx = e.changedTouches[0].clientX - start.x
        const dy = e.changedTouches[0].clientY - start.y
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) onMove(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex flex-shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{photo.guestName}</p>
          <p className="text-xs text-white/60">
            {formatTime(photo.createdAt)} hs
            {photo.challenge && (
              <>
                {' · '}
                {photo.challenge.emoji} {photo.challenge.title}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <a
            href={downloadUrl(photo)}
            aria-label="Descargar la foto original"
            className="rounded-full bg-white/10 p-2 active:bg-white/20"
          >
            <Download className="h-5 w-5 text-white" />
          </a>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/10 p-2 active:bg-white/20">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
          >
            <Image src={photo.url} alt={photo.caption ?? 'Foto del casamiento'} fill className="object-contain" sizes="100vw" priority />
          </motion.div>
        </AnimatePresence>
        {index > 0 && (
          <button onClick={() => onMove(-1)} aria-label="Anterior" className="absolute left-0 top-0 hidden h-full w-1/4 items-center pl-2 sm:flex">
            <span className="rounded-full bg-black/40 p-1">
              <ChevronLeft className="h-6 w-6 text-white" />
            </span>
          </button>
        )}
        {index < photos.length - 1 && (
          <button onClick={() => onMove(1)} aria-label="Siguiente" className="absolute right-0 top-0 hidden h-full w-1/4 items-center justify-end pr-2 sm:flex">
            <span className="rounded-full bg-black/40 p-1">
              <ChevronRight className="h-6 w-6 text-white" />
            </span>
          </button>
        )}
      </div>

      <div className="flex-shrink-0 px-4 pb-5 pt-3 text-center">
        {photo.caption && <p className="font-pen text-lg leading-tight text-white">{photo.caption}</p>}
        <p className="mt-1 text-xs text-white/40">
          {title && `${title} · `}
          {index + 1} de {photos.length}
        </p>
      </div>
    </motion.div>
  )
}
