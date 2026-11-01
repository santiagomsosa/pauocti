'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Camera, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { PhotoUploadModal } from '@/components/PhotoUploadModal'
import type { Photo } from '@/types'

// Inclinación de cada polaroid y de su cinta (en grados), para que parezcan pegadas a mano.
const POLAROID_TILTS = [-2, 1.5, -1, 2, -1.5, 1, 1.5, -2, 0.5]
const TAPE_TILTS = [3, -4, 2, -2, 5, -3, -1, 4]

/** Tamaño de letra según el largo del texto: los cortos se leen grandes y los largos se achican para entrar en el marco. */
function captionSizeClass(caption: string) {
  const length = caption.trim().length
  if (length <= 10) return 'text-[15px] leading-tight'
  if (length <= 24) return 'text-xs leading-tight'
  if (length <= 40) return 'text-[10px] leading-tight'
  return 'text-[9px] leading-tight'
}

/** Tira de cinta semitransparente que "pega" la polaroid, con los bordes cortados a mano. */
function Tape({ rotate }: { rotate: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2.5 left-1/2 z-10 h-5 w-[42%] -translate-x-1/2 bg-[#e2d6be]/80 shadow-[0_1px_2px_rgba(60,45,30,0.12)]"
      style={{
        rotate: `${rotate}deg`,
        clipPath:
          'polygon(0 8%, 4% 0, 9% 10%, 14% 2%, 100% 0, 96% 12%, 100% 26%, 95% 40%, 100% 55%, 96% 70%, 100% 86%, 97% 100%, 0 100%, 4% 88%, 0 72%, 5% 56%, 0 40%, 4% 24%)',
      }}
    />
  )
}

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const photo = photos[index]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only horizontal swipes (ignore scrolls)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) onNext()
      else onPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          {photo.caption && <p className="text-white font-pen text-lg leading-tight truncate">{photo.caption}</p>}
          {photo.challenge && (
            <p className="text-white/60 text-xs truncate">
              {photo.challenge.emoji} {photo.challenge.title}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 rounded-full bg-white/10 p-2 active:bg-white/20"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Image */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? 'Foto de la galería'}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next tap zones (invisible, large hit area) */}
        {index > 0 && (
          <button
            onClick={onPrev}
            className="absolute left-0 top-0 h-full w-1/3 flex items-center justify-start pl-2 group"
            aria-label="Anterior"
          >
            <span className="opacity-0 group-active:opacity-100 transition-opacity rounded-full bg-black/40 p-1">
              <ChevronLeft className="w-6 h-6 text-white" />
            </span>
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={onNext}
            className="absolute right-0 top-0 h-full w-1/3 flex items-center justify-end pr-2 group"
            aria-label="Siguiente"
          >
            <span className="opacity-0 group-active:opacity-100 transition-opacity rounded-full bg-black/40 p-1">
              <ChevronRight className="w-6 h-6 text-white" />
            </span>
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-4 pb-safe flex-shrink-0">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === index ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default function GaleriaPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const loadPhotos = useCallback(async () => {
    const res = await fetch('/api/photos')
    if (res.ok) {
      const data = await res.json()
      setPhotos(data.photos)
    } else {
      toast.error('Error al cargar las fotos')
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadPhotos()
      setLoading(false)
    }
    init()
  }, [loadPhotos])

  function openLightbox(index: number) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function goPrev() {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
  }

  function goNext() {
    setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))
  }

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-script text-3xl text-stone-800">Galería</h1>
          <p className="text-sm text-stone-500 mt-1">{photos.length} fotos compartidas</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 bg-ink-500 hover:bg-ink-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Subir
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-6 pt-2">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-1.5 pb-9 rounded-[2px] shadow-sm animate-pulse"
              style={{ rotate: `${POLAROID_TILTS[i % POLAROID_TILTS.length]}deg` }}
            >
              <div className="aspect-square bg-stone-200" />
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Camera className="w-12 h-12 text-stone-300" />
          <p className="text-stone-500">¡Sé el primero en subir una foto!</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="text-ink-500 font-medium text-sm"
          >
            Subir ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-6 pt-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(i)}
              aria-label={photo.caption ? `Ver foto: ${photo.caption}` : 'Ver foto'}
              className="relative bg-white p-1.5 rounded-[2px] shadow-[0_2px_8px_rgba(60,45,30,0.15)] transition-transform duration-200 hover:!rotate-0 hover:scale-[1.03] active:scale-95"
              style={{ rotate: `${POLAROID_TILTS[i % POLAROID_TILTS.length]}deg` }}
            >
              <Tape rotate={TAPE_TILTS[i % TAPE_TILTS.length]} />
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                <Image
                  src={photo.url}
                  alt={photo.caption ?? 'Foto de la galería'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 160px"
                />
                {photo.challenge && (
                  <span
                    className="absolute bottom-1 right-1 rounded-full bg-white/85 px-1 text-[11px] leading-5 shadow-sm"
                    title={photo.challenge.title}
                  >
                    {photo.challenge.emoji}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'flex items-center justify-center min-h-8 pt-1 px-0.5 font-pen text-stone-800 text-center',
                  photo.caption && captionSizeClass(photo.caption)
                )}
              >
                <span className="line-clamp-3 break-words">{photo.caption}</span>
              </p>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
      </AnimatePresence>

      <PhotoUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(photo) => setPhotos((prev) => [photo, ...prev])}
      />
    </div>
  )
}
