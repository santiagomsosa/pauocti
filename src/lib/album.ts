// Lógica pura del álbum del casamiento (sin base de datos), para poder probarla con `npm test`.

/** Zona horaria de la boda: las horas del álbum se muestran en hora argentina. */
export const ALBUM_TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Foto de los novios en la tapa (la que se ve antes de abrir el álbum) y en el cierre. */
export const ALBUM_COVER_SRC = '/album/tapa.jpg'
export const ALBUM_CLOSING_SRC = '/album/cierre.jpg'

/** Canción que arranca al tocar "Abrir el álbum" (en /public). `null` oculta la música. */
export const ALBUM_SONG_SRC: string | null = null

export interface AlbumChallenge {
  id: string
  title: string
  emoji: string
}

export interface AlbumPhoto {
  id: string
  url: string
  guestId: string
  guestName: string
  caption: string | null
  createdAt: string
  challenge: AlbumChallenge | null
}

export interface RankingRow {
  rank: number
  guestId: string
  name: string
  /** Retos distintos cumplidos (varias fotos del mismo reto cuentan una vez). */
  completed: number
  /** Cuándo llegó a esa cantidad: desempata a favor de quien terminó antes. */
  reachedAt: string
}

/**
 * Ranking de retos: cuenta retos distintos por invitado. Si empatan en cantidad,
 * gana quien completó antes su último reto (la primera foto de cada reto es la que cuenta).
 */
export function challengeRanking(photos: AlbumPhoto[]): RankingRow[] {
  const byGuest = new Map<string, { name: string; firstByChallenge: Map<string, number> }>()
  for (const photo of photos) {
    if (!photo.challenge) continue
    let entry = byGuest.get(photo.guestId)
    if (!entry) {
      entry = { name: photo.guestName, firstByChallenge: new Map() }
      byGuest.set(photo.guestId, entry)
    }
    const at = new Date(photo.createdAt).getTime()
    const prev = entry.firstByChallenge.get(photo.challenge.id)
    if (prev === undefined || at < prev) entry.firstByChallenge.set(photo.challenge.id, at)
  }

  const rows = [...byGuest].map(([guestId, { name, firstByChallenge }]) => ({
    guestId,
    name,
    completed: firstByChallenge.size,
    reachedAtMs: Math.max(...firstByChallenge.values()),
  }))
  rows.sort((a, b) => b.completed - a.completed || a.reachedAtMs - b.reachedAtMs || a.name.localeCompare(b.name, 'es'))

  return rows.map((row, i) => ({
    rank: i + 1,
    guestId: row.guestId,
    name: row.name,
    completed: row.completed,
    reachedAt: new Date(row.reachedAtMs).toISOString(),
  }))
}

const hourFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: ALBUM_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dayFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: ALBUM_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: ALBUM_TIME_ZONE }) // YYYY-MM-DD

/** "23:41" en hora argentina. */
export function formatTime(iso: string): string {
  return hourFormat.format(new Date(iso))
}

export interface HourGroup {
  /** "2026-11-14 23" (día y hora argentinos). */
  key: string
  /** "23:00" */
  label: string
  /** "sábado 14 de noviembre": solo en el primer grupo de cada día, para marcar el cambio de día. */
  dayLabel: string | null
  photos: AlbumPhoto[]
}

/** Agrupa las fotos por hora (argentina), en orden cronológico: el álbum cuenta la noche de principio a fin. */
export function groupByHour(photos: AlbumPhoto[]): HourGroup[] {
  const sorted = [...photos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const groups: HourGroup[] = []
  let lastDay: string | null = null
  for (const photo of sorted) {
    const date = new Date(photo.createdAt)
    const day = dayKeyFormat.format(date)
    const hour = hourFormat.format(date).slice(0, 2)
    const key = `${day} ${hour}`
    const current = groups.at(-1)
    if (current?.key === key) {
      current.photos.push(photo)
      continue
    }
    groups.push({ key, label: `${hour}:00`, dayLabel: day !== lastDay ? dayFormat.format(date) : null, photos: [photo] })
    lastDay = day
  }
  return groups
}

export interface AlbumFilters {
  guestId: string | null
  challengeId: string | null
  onlyWithCaption: boolean
}

export function filterPhotos(photos: AlbumPhoto[], filters: AlbumFilters): AlbumPhoto[] {
  return photos.filter(
    (p) =>
      (!filters.guestId || p.guestId === filters.guestId) &&
      (!filters.challengeId || p.challenge?.id === filters.challengeId) &&
      (!filters.onlyWithCaption || !!p.caption?.trim())
  )
}

/** Link de descarga del archivo original (Supabase Storage lo baja como adjunto con `?download=`). */
export function downloadUrl(photo: AlbumPhoto): string {
  const name = `${photo.guestName} ${formatTime(photo.createdAt).replace(':', '.')}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
  const ext = photo.url.split('?')[0].match(/\.\w+$/)?.[0] ?? '.jpg'
  return `${photo.url}${photo.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name + ext)}`
}
