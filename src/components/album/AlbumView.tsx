'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, Music, VolumeX, X } from 'lucide-react'
import { Book } from '@/components/album/Book'
import { AlbumPageView } from '@/components/album/AlbumPage'
import type { PageContext } from '@/components/album/AlbumPage'
import { Lightbox } from '@/components/album/Lightbox'
import { ALBUM_COVER_SRC, ALBUM_SONG_SRC, ALBUM_TIME_ZONE, buildAlbum, shortChallengeTitle } from '@/lib/album'
import type { AlbumChallenge, AlbumPhoto } from '@/lib/album'

/** El ajuste guardado puede ser una fecha ISO o un texto ya escrito ("14 de Noviembre de 2026"). */
function formatWeddingDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', { timeZone: ALBUM_TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(date)
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
  const [page, setPage] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewer, setViewer] = useState<{ title?: string; photos: AlbumPhoto[]; index: number } | null>(null)

  const album = useMemo(() => buildAlbum(photos, challenges), [photos, challenges])
  const guests = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of photos) map.set(p.guestId, p.guestName)
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [photos])
  const date = formatWeddingDate(weddingDate)

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

  function jump(target: number) {
    setPage(target)
    setMenuOpen(false)
  }

  function showGuest(guestId: string) {
    const list = album.night.filter((p) => p.guestId === guestId)
    if (list.length === 0) return
    setMenuOpen(false)
    setViewer({ title: `Fotos de ${list[0].guestName}`, photos: list, index: 0 })
  }

  function showChallenge(challengeId: string) {
    const list = album.byChallenge.get(challengeId)
    const challenge = challenges.find((c) => c.id === challengeId)
    if (!list?.length || !challenge) return
    setMenuOpen(false)
    setViewer({ title: `${challenge.emoji} ${shortChallengeTitle(challenge.title)}`, photos: list, index: 0 })
  }

  const ctx: PageContext = {
    coupleNames,
    date,
    stats: {
      photos: album.night.length,
      photographers: guests.length,
      challengesDone: album.ranking.reduce((n, r) => n + r.completed, 0),
    },
    sections: album.sections,
    totalChallenges: challenges.length,
    onJump: jump,
    onGuest: showGuest,
    onPhoto: (photo) => setViewer({ photos: album.night, index: Math.max(album.night.findIndex((x) => x.id === photo.id), 0) }),
    onChallenge: showChallenge,
  }

  const currentSection = [...album.sections].reverse().find((s) => s.page <= page)

  return (
    <main className="min-h-dvh overflow-hidden bg-[#e7ddcf]">
      {ALBUM_SONG_SRC && <audio ref={audioRef} src={ALBUM_SONG_SRC} loop preload="auto" />}

      {/* Tapa: la puerta de entrada. El toque en el botón es lo que arranca la música. */}
      <AnimatePresence>
        {!opened && (
          <motion.section
            key="cover"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            // Toda la tapa abre el álbum: en Safari del iPhone la barra de direcciones flota sobre la parte
            // de abajo de la pantalla y se queda con los toques de esa zona.
            onClick={open}
            className="fixed inset-0 z-[60] flex cursor-pointer touch-manipulation items-center justify-center overflow-hidden bg-stone-900"
          >
            {/* Fondo desenfocado: en pantallas anchas la foto vertical queda centrada sin barras negras. */}
            <Image src={ALBUM_COVER_SRC} alt="" fill priority className="scale-110 object-cover opacity-60 blur-2xl" sizes="100vw" aria-hidden />
            <div className="relative h-full w-full max-w-[560px]">
              <Image src={ALBUM_COVER_SRC} alt={`${coupleNames} caminando de la mano`} fill priority className="object-cover object-top" sizes="(max-width: 560px) 100vw, 560px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
              {/* svh: la altura que queda visible con las barras del navegador abiertas; el botón queda arriba de ellas. */}
              <div className="absolute inset-x-0 top-0 flex h-[100svh] flex-col items-center justify-end px-4 pb-24 text-center text-white">
                <p className="font-script text-5xl leading-none drop-shadow sm:text-6xl">{coupleNames}</p>
                {date && <p className="mt-3 font-title text-sm tracking-[0.2em] text-white/90">{date.toUpperCase()}</p>}
                <button
                  type="button"
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

      <header className="flex h-14 items-center justify-between px-3">
        <button onClick={() => setMenuOpen(true)} className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-stone-700 shadow-sm">
          <Menu className="h-4 w-4" />
          Índice
        </button>
        <p className="truncate px-2 font-title text-xs uppercase tracking-[0.2em] text-stone-500">
          {currentSection && currentSection.id !== 'inicio' ? currentSection.title : coupleNames}
        </p>
        {ALBUM_SONG_SRC ? (
          <button onClick={toggleMusic} aria-label={playing ? 'Pausar la música' : 'Poner la música'} className="rounded-full bg-white/80 p-2 shadow-sm">
            {playing ? <Music className="h-4 w-4 text-ink-600" /> : <VolumeX className="h-4 w-4 text-stone-500" />}
          </button>
        ) : (
          <span className="w-8" />
        )}
      </header>

      {opened && (
        <Book
          count={album.pages.length}
          page={page}
          onPageChange={setPage}
          keyboard={!viewer && !menuOpen}
          renderPage={(i) => <AlbumPageView page={album.pages[i]} index={i} ctx={ctx} />}
        />
      )}

      {/* Menú: secciones, cada hora, cada reto y las fotos de cada persona. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              key="menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,360px)] flex-col bg-[#fbf7ef] shadow-xl"
              aria-label="Índice del álbum"
            >
              <div className="flex items-center justify-between px-5 pb-2 pt-5">
                <p className="font-script text-3xl text-stone-800">Índice</p>
                <button onClick={() => setMenuOpen(false)} aria-label="Cerrar el índice" className="rounded-full p-2 hover:bg-black/5">
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-8">
                {album.sections.map((s) => (
                  <div key={s.id}>
                    <button onClick={() => jump(s.page)} className="flex w-full items-baseline gap-2 text-left font-medium text-stone-800">
                      <span>{s.emoji}</span>
                      <span className="flex-1">{s.title}</span>
                      <span className="font-title text-xs tabular-nums text-stone-400">pág. {s.page + 1}</span>
                    </button>
                    {s.entries.length > 0 && (
                      <div className={s.id === 'noche' ? 'mt-2 flex flex-wrap gap-1.5 pl-6' : 'mt-1 space-y-1 pl-6'}>
                        {s.entries.map((e) =>
                          s.id === 'noche' ? (
                            <button key={e.page} onClick={() => jump(e.page)} className="rounded-full bg-white px-2.5 py-1 text-xs tabular-nums text-stone-600 shadow-sm">
                              {e.label}
                            </button>
                          ) : (
                            <button
                              key={e.challengeId ?? e.page}
                              onClick={() => (e.challengeId ? showChallenge(e.challengeId) : jump(e.page))}
                              className="flex w-full gap-2 py-0.5 text-left text-sm leading-snug text-stone-600 hover:text-ink-600"
                            >
                              {/* El emoji va aparte: si el título ocupa dos líneas, la segunda queda alineada con el texto. */}
                              <span className="shrink-0">{e.label.split(' ')[0]}</span>
                              <span className="line-clamp-2">{e.label.slice(e.label.indexOf(' ') + 1)}</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <p className="font-medium text-stone-800">🙋 Fotos de una persona</p>
                  <select
                    value=""
                    onChange={(e) => e.target.value && showGuest(e.target.value)}
                    aria-label="Ver las fotos de una persona"
                    className="mt-2 w-full rounded-full border border-cream-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Elegí a alguien…</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewer && (
          <Lightbox
            title={viewer.title}
            photos={viewer.photos}
            index={viewer.index}
            onClose={() => setViewer(null)}
            onMove={(delta) =>
              setViewer((v) => (v ? { ...v, index: Math.min(Math.max(v.index + delta, 0), v.photos.length - 1) } : v))
            }
          />
        )}
      </AnimatePresence>
    </main>
  )
}
