'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Download, Music, VolumeX, X } from 'lucide-react'
import { Polaroid } from '@/components/Polaroid'
import { cn } from '@/lib/utils'
import {
  ALBUM_CLOSING_SRC,
  ALBUM_COVER_SRC,
  ALBUM_SONG_SRC,
  ALBUM_TIME_ZONE,
  challengeRanking,
  downloadUrl,
  filterPhotos,
  formatTime,
  groupByHour,
} from '@/lib/album'
import type { AlbumChallenge, AlbumFilters, AlbumPhoto } from '@/lib/album'

type Tab = 'noche' | 'ranking' | 'retos'
const MEDALS = ['🥇', '🥈', '🥉']
const NO_FILTERS: AlbumFilters = { guestId: null, challengeId: null, onlyWithCaption: false }

/** El ajuste guardado puede ser una fecha ISO o un texto ya escrito ("14 de Noviembre de 2026"). */
function formatWeddingDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', { timeZone: ALBUM_TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function Lightbox({
  photos,
  index,
  onClose,
  onMove,
}: {
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
          {index + 1} de {photos.length}
        </p>
      </div>
    </motion.div>
  )
}

function Podium({ top, onPick }: { top: ReturnType<typeof challengeRanking>; onPick: (guestId: string) => void }) {
  const order = [top[1], top[0], top[2]].filter(Boolean)
  const heights: Record<number, string> = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }
  return (
    <div className="flex items-end justify-center gap-2 pb-2 pt-4">
      {order.map((row) => (
        <button key={row.guestId} onClick={() => onPick(row.guestId)} className="flex w-1/3 flex-col items-center text-center">
          <span className="text-3xl">{MEDALS[row.rank - 1]}</span>
          <span className="w-full truncate px-1 text-sm font-semibold text-stone-800">{row.name}</span>
          <span className="text-xs text-stone-500">{row.completed} {row.completed === 1 ? 'reto' : 'retos'}</span>
          <div className={cn('mt-1 w-full rounded-t-xl bg-ink-200', heights[row.rank])} />
        </button>
      ))}
    </div>
  )
}

export function AlbumView({
  photos,
  challenges,
  coupleNames,
  weddingDate,
}: {
  photos: AlbumPhoto[]
  challenges: AlbumChallenge[]
  coupleNames: string
  weddingDate: string | null
}) {
  const [opened, setOpened] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tab, setTab] = useState<Tab>('noche')
  const [filters, setFilters] = useState<AlbumFilters>(NO_FILTERS)
  const [lightbox, setLightbox] = useState<{ photos: AlbumPhoto[]; index: number } | null>(null)

  const ranking = useMemo(() => challengeRanking(photos), [photos])
  const guests = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of photos) map.set(p.guestId, p.guestName)
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [photos])
  const shown = useMemo(() => filterPhotos(photos, filters), [photos, filters])
  const groups = useMemo(() => groupByHour(shown), [shown])
  // Las fotos en el orden en que se ven en pantalla, para pasar de una a otra en el visor.
  const ordered = useMemo(() => groups.flatMap((g) => g.photos), [groups])
  const byChallenge = useMemo(
    () =>
      challenges
        .map((c) => ({ challenge: c, photos: photos.filter((p) => p.challenge?.id === c.id) }))
        .filter((c) => c.photos.length > 0),
    [challenges, photos]
  )
  const hasFilters = filters.guestId !== null || filters.challengeId !== null || filters.onlyWithCaption

  // El scroll de la página se bloquea mientras la tapa está cerrada.
  useEffect(() => {
    document.body.style.overflow = opened ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [opened])

  function open() {
    setOpened(true)
    // Tiene que llamarse dentro del toque: los navegadores no dejan arrancar audio de otra forma.
    audioRef.current
      ?.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }

  function toggleMusic() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => {})
    else {
      audio.pause()
      setPlaying(false)
    }
  }

  function showGuest(guestId: string) {
    setFilters({ ...NO_FILTERS, guestId })
    setTab('noche')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openLightbox(list: AlbumPhoto[], photo: AlbumPhoto) {
    setLightbox({ photos: list, index: list.findIndex((p) => p.id === photo.id) })
  }

  function moveLightbox(delta: number) {
    setLightbox((l) => (l ? { ...l, index: Math.min(Math.max(l.index + delta, 0), l.photos.length - 1) } : l))
  }

  const closeLightbox = () => setLightbox(null)
  const date = formatWeddingDate(weddingDate)

  return (
    <main className="min-h-screen bg-cream-50">
      {ALBUM_SONG_SRC && <audio ref={audioRef} src={ALBUM_SONG_SRC} loop preload="auto" />}

      {/* Tapa: la puerta de entrada. El toque en el botón es lo que arranca la música. */}
      <AnimatePresence>
        {!opened && (
          <motion.section
            key="cover"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-stone-900"
          >
            {/* Fondo desenfocado: en pantallas anchas la foto vertical queda centrada sin barras negras. */}
            <Image src={ALBUM_COVER_SRC} alt="" fill priority className="scale-110 object-cover opacity-60 blur-2xl" sizes="100vw" aria-hidden />
            <div className="relative h-full w-full max-w-[560px]">
              <Image src={ALBUM_COVER_SRC} alt={`${coupleNames} caminando de la mano`} fill priority className="object-cover object-top" sizes="(max-width: 560px) 100vw, 560px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-12 text-center text-white">
                <p className="font-script text-5xl leading-none drop-shadow sm:text-6xl">{coupleNames}</p>
                {date && <p className="mt-3 font-title text-sm tracking-[0.2em] text-white/90">{date.toUpperCase()}</p>}
                <button
                  onClick={open}
                  className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-semibold text-stone-800 shadow-lg transition-transform active:scale-95"
                >
                  Abrir el álbum
                </button>
                {ALBUM_SONG_SRC && <p className="mt-3 text-xs text-white/60">🎵 Con música</p>}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {opened && ALBUM_SONG_SRC && (
        <button
          onClick={toggleMusic}
          aria-label={playing ? 'Pausar la música' : 'Poner la música'}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-white/90 p-3 shadow-lg backdrop-blur active:scale-95"
        >
          {playing ? <Music className="h-5 w-5 text-ink-600" /> : <VolumeX className="h-5 w-5 text-stone-500" />}
        </button>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-20">
        <header className="py-10 text-center">
          <h1 className="font-script text-5xl text-stone-800">{coupleNames}</h1>
          {date && <p className="mt-2 font-title text-xs tracking-[0.2em] text-stone-500">{date.toUpperCase()}</p>}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              [photos.length, 'fotos'],
              [guests.length, 'fotógrafos'],
              [ranking.reduce((n, r) => n + r.completed, 0), 'retos cumplidos'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl border border-cream-200 bg-white py-3">
                <p className="font-title text-2xl tabular-nums text-stone-800">{n}</p>
                <p className="text-xs text-stone-500">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <nav className="sticky top-0 z-30 -mx-4 mb-4 flex gap-2 bg-cream-50/90 px-4 py-2 backdrop-blur">
          {(
            [
              ['noche', 'La noche'],
              ['ranking', 'Ranking de retos'],
              ['retos', 'Por reto'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                tab === id ? 'bg-ink-500 text-white' : 'bg-white text-stone-600'
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'noche' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={filters.guestId ?? ''}
                onChange={(e) => setFilters({ ...filters, guestId: e.target.value || null })}
                aria-label="Filtrar por persona"
                className="min-w-0 flex-1 rounded-full border border-cream-200 bg-white px-3 py-2"
              >
                <option value="">Todas las personas</option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.challengeId ?? ''}
                onChange={(e) => setFilters({ ...filters, challengeId: e.target.value || null })}
                aria-label="Filtrar por reto"
                className="min-w-0 flex-1 rounded-full border border-cream-200 bg-white px-3 py-2"
              >
                <option value="">Todos los retos</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.title}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-full border border-cream-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={filters.onlyWithCaption}
                  onChange={(e) => setFilters({ ...filters, onlyWithCaption: e.target.checked })}
                />
                Con comentario
              </label>
              {hasFilters && (
                <button onClick={() => setFilters(NO_FILTERS)} className="px-2 py-2 text-ink-500">
                  Limpiar
                </button>
              )}
            </div>

            {hasFilters && <p className="text-xs text-stone-500">{shown.length} de {photos.length} fotos</p>}

            {groups.length === 0 ? (
              <p className="py-16 text-center text-stone-500">No hay fotos con esos filtros.</p>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  {group.dayLabel && (
                    <p className="mb-3 mt-2 text-center font-title text-xs uppercase tracking-[0.2em] text-stone-400">{group.dayLabel}</p>
                  )}
                  <h2 className="mb-3 flex items-baseline gap-2 font-title text-stone-700">
                    {group.label}
                    <span className="text-xs font-normal text-stone-400">
                      {group.photos.length} {group.photos.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </h2>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
                    {group.photos.map((photo, i) => (
                      <div key={photo.id} className="space-y-1">
                        <Polaroid
                          url={photo.url}
                          caption={photo.caption}
                          challenge={photo.challenge}
                          index={i}
                          onClick={() => openLightbox(ordered, photo)}
                          ariaLabel={`Ver foto de ${photo.guestName}`}
                        />
                        <p className="truncate text-center text-[10px] text-stone-500">
                          {photo.guestName} · {formatTime(photo.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === 'ranking' && (
          <section>
            {ranking.length === 0 ? (
              <p className="py-16 text-center text-stone-500">Todavía nadie cumplió un reto.</p>
            ) : (
              <>
                <Podium top={ranking.slice(0, 3)} onPick={showGuest} />
                <ul className="mt-4 space-y-2">
                  {ranking.map((row) => (
                    <li key={row.guestId}>
                      <button
                        onClick={() => showGuest(row.guestId)}
                        className="flex w-full items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left"
                      >
                        <span className="w-8 text-center text-lg">
                          {MEDALS[row.rank - 1] ?? <span className="text-sm text-stone-400">{row.rank}°</span>}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-stone-800">{row.name}</span>
                        <span className="font-title tabular-nums text-stone-800">
                          {row.completed} <span className="text-xs text-stone-400">de {challenges.length}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-center text-xs text-stone-400">Cuenta retos distintos. Tocá a alguien para ver sus fotos.</p>
              </>
            )}
          </section>
        )}

        {tab === 'retos' && (
          <section className="space-y-8">
            {byChallenge.map(({ challenge, photos: list }) => (
              <div key={challenge.id}>
                <h2 className="mb-3 font-title text-stone-700">
                  {challenge.emoji} {challenge.title}
                  <span className="ml-2 text-xs font-normal text-stone-400">
                    {list.length} {list.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </h2>
                <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
                  {list.map((photo, i) => (
                    <div key={photo.id} className="space-y-1">
                      <Polaroid
                        url={photo.url}
                        caption={photo.caption}
                        index={i}
                        onClick={() => openLightbox(list, photo)}
                        ariaLabel={`Ver foto de ${photo.guestName}`}
                      />
                      <p className="truncate text-center text-[10px] text-stone-500">{photo.guestName}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <footer className="mt-16 text-center">
          <div className="relative mx-auto aspect-[3/4] w-64 overflow-hidden rounded-[2px] bg-white p-2 shadow-[0_2px_8px_rgba(60,45,30,0.15)]">
            <div className="relative h-full w-full">
              <Image src={ALBUM_CLOSING_SRC} alt={`${coupleNames} abrazados`} fill className="object-cover" sizes="256px" />
            </div>
          </div>
          <p className="mt-6 font-script text-3xl text-stone-800">¡Gracias por ser parte!</p>
        </footer>
      </div>

      <AnimatePresence>
        {lightbox && <Lightbox photos={lightbox.photos} index={lightbox.index} onClose={closeLightbox} onMove={moveLightbox} />}
      </AnimatePresence>
    </main>
  )
}
