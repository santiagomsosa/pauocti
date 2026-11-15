'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// En pantallas anchas el álbum se ve abierto (dos páginas); en el celu, una página por vez.
const SPREAD_QUERY = '(min-width: 900px)'
const FLIP_SECONDS = 0.75

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SPREAD_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useSpread(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SPREAD_QUERY).matches,
    () => false
  )
}

/** Hoja de papel: sombra hacia el lomo para que se lea como un libro. */
function Paper({ children, side }: { children?: ReactNode; side: 'left' | 'right' }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#fbf7ef] [container-type:size]">
      {children}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 w-[8%]',
          side === 'left' ? 'right-0 bg-gradient-to-l from-black/[0.09] to-transparent' : 'left-0 bg-gradient-to-r from-black/[0.09] to-transparent'
        )}
      />
    </div>
  )
}

/**
 * Libro con hojas que pasan. `page` es la página que se está viendo (en modo abierto, la de la izquierda
 * o cualquiera del par). Ir a una página desde el índice cambia `page` directo, sin animación.
 */
export function Book({
  count,
  page,
  onPageChange,
  renderPage,
  keyboard,
}: {
  count: number
  page: number
  onPageChange: (page: number) => void
  renderPage: (index: number) => ReactNode
  /** Flechas del teclado: se apagan mientras el visor de fotos está abierto. */
  keyboard: boolean
}) {
  const spread = useSpread()
  const [flip, setFlip] = useState<1 | -1 | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const per = spread ? 2 : 1
  const view = Math.floor(page / per)
  const lastView = Math.max(Math.ceil(count / per) - 1, 0)
  const canPrev = view > 0
  const canNext = view < lastView

  const turn = (dir: 1 | -1) => {
    if (flip !== null) return
    if (dir === 1 ? canNext : canPrev) setFlip(dir)
  }

  function finishFlip() {
    if (flip === null) return
    onPageChange((view + flip) * per)
    setFlip(null)
  }

  const turnRef = useRef(turn)
  useEffect(() => {
    turnRef.current = turn
  })
  useEffect(() => {
    if (!keyboard) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') turnRef.current(1)
      if (e.key === 'ArrowLeft') turnRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard])

  const p = (i: number) => (i >= 0 && i < count ? renderPage(i) : null)

  // Qué se ve debajo de la hoja que gira y qué tiene la hoja de cada lado.
  let left: number | null = null
  let right: number
  let leaf: { front: number | null; back: number | null } | null = null
  if (spread) {
    const l = view * 2
    if (flip === 1) {
      left = l
      right = l + 3
      leaf = { front: l + 1, back: l + 2 }
    } else if (flip === -1) {
      left = l - 2
      right = l + 1
      leaf = { front: l - 1, back: l }
    } else {
      left = l
      right = l + 1
    }
  } else if (flip === 1) {
    right = view + 1
    leaf = { front: view, back: null }
  } else if (flip === -1) {
    right = view
    leaf = { front: view - 1, back: null }
  } else {
    right = view
  }

  // Las páginas que vienen (en los dos sentidos) se dibujan invisibles para que sus fotos ya estén bajadas.
  // Dos vueltas para adelante y una para atrás: las fotos pasan por el optimizador y la primera vez tardan.
  const preload = spread
    ? [2, 3, 4, 5, -2, -1].map((d) => view * 2 + d)
    : [1, 2, -1].map((d) => view + d)

  const first = view * per + 1
  const lastShown = Math.min(first + per - 1, count)

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative select-none"
        style={
          spread
            ? { perspective: '2200px', aspectRatio: '3 / 2', width: 'min(calc(100vw - 6rem), calc((100dvh - 8rem) * 1.5))' }
            : // En el celu la hoja usa todo el alto disponible (sin pasarse de una proporción razonable).
              { perspective: '2200px', width: 'calc(100vw - 1.5rem)', height: 'min(calc(100dvh - 8rem), calc((100vw - 1.5rem) * 1.75))' }
        }
        onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start) return
          const dx = e.changedTouches[0].clientX - start.x
          const dy = e.changedTouches[0].clientY - start.y
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) turn(dx < 0 ? 1 : -1)
        }}
      >
        <div className="absolute inset-0 rounded-[3px] shadow-[0_18px_40px_-12px_rgba(60,45,30,0.45)]" aria-hidden />

        {spread && (
          <div className="absolute inset-y-0 left-0 w-1/2">
            <Paper side="left">{left !== null && p(left)}</Paper>
          </div>
        )}
        <div className={cn('absolute inset-y-0', spread ? 'left-1/2 w-1/2' : 'inset-x-0')}>
          <Paper side="right">{p(right)}</Paper>
        </div>
        {spread && <div aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" />}

        {leaf && (
          <motion.div
            key={`${view}:${flip}`}
            className={cn('absolute inset-y-0 z-10', spread ? 'left-1/2 w-1/2' : 'inset-x-0')}
            style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
            initial={{ rotateY: flip === 1 ? 0 : -180 }}
            animate={{ rotateY: flip === 1 ? -180 : 0 }}
            transition={{ duration: FLIP_SECONDS, ease: [0.645, 0.045, 0.355, 1] }}
            onAnimationComplete={finishFlip}
          >
            <div className="absolute inset-0 shadow-[0_0_24px_rgba(0,0,0,0.18)]" style={{ backfaceVisibility: 'hidden' }}>
              <Paper side="right">{leaf.front !== null && p(leaf.front)}</Paper>
            </div>
            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <Paper side="left">{leaf.back !== null && p(leaf.back)}</Paper>
            </div>
          </motion.div>
        )}

        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0">
          {preload
            .filter((i) => i >= 0 && i < count)
            .map((i) => (
              <div key={i} className="absolute inset-0 [container-type:size]">
                {p(i)}
              </div>
            ))}
        </div>

        {spread && (
          <>
            <button
              onClick={() => turn(-1)}
              disabled={!canPrev}
              aria-label="Página anterior"
              className="absolute -left-12 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5 text-stone-600" />
            </button>
            <button
              onClick={() => turn(1)}
              disabled={!canNext}
              aria-label="Página siguiente"
              className="absolute -right-12 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5 text-stone-600" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-stone-600">
        {!spread && (
          <button onClick={() => turn(-1)} disabled={!canPrev} aria-label="Página anterior" className="rounded-full bg-white/80 p-2 shadow disabled:opacity-30">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <span className="tabular-nums">
          {first === lastShown ? `Página ${first}` : `Páginas ${first}–${lastShown}`} de {count}
        </span>
        {!spread && (
          <button onClick={() => turn(1)} disabled={!canNext} aria-label="Página siguiente" className="rounded-full bg-white/80 p-2 shadow disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
