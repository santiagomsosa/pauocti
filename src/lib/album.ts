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
const weekdayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: ALBUM_TIME_ZONE, weekday: 'short' })

/** "23:41" en hora argentina. */
export function formatTime(iso: string): string {
  return hourFormat.format(new Date(iso))
}

export interface HourGroup {
  /** "2026-11-14 23" (día y hora argentinos). */
  key: string
  /** "23:00" */
  label: string
  /** "sáb" (para distinguir la misma hora en días distintos). */
  weekday: string
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
    groups.push({ key, label: `${hour}:00`, weekday: weekdayFormat.format(date).replace('.', ''), dayLabel: day !== lastDay ? dayFormat.format(date) : null, photos: [photo] })
    lastDay = day
  }
  return groups
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

// ─── Hojas del álbum ────────────────────────────────────────────────────────────

export const PHOTOS_PER_PAGE = 4
export const RANKING_ROWS_PER_PAGE = 10

export type AlbumPage =
  | { kind: 'title' }
  | { kind: 'index' }
  | { kind: 'divider'; emoji: string; title: string; subtitle: string }
  | {
      kind: 'photos'
      /** Lista con la que se recorre el visor al tocar una foto de esta hoja. */
      list: 'noche' | { challengeId: string }
      heading: string
      /** Solo en la primera hoja de cada día de "La noche". */
      dayLabel: string | null
      /** La hoja sigue el tema de la anterior (misma hora o mismo reto). */
      continued: boolean
      photos: AlbumPhoto[]
    }
  | { kind: 'podium'; rows: RankingRow[]; total: number }
  | { kind: 'ranking'; rows: RankingRow[] }
  | { kind: 'closing' }

export interface AlbumSection {
  id: 'inicio' | 'noche' | 'ranking' | 'retos' | 'cierre'
  emoji: string
  title: string
  page: number
  /** Accesos directos dentro de la sección (cada hora, cada reto). */
  entries: { label: string; page: number }[]
}

export interface Album {
  pages: AlbumPage[]
  sections: AlbumSection[]
  ranking: RankingRow[]
  /** Fotos en orden cronológico (el orden de "La noche"). */
  night: AlbumPhoto[]
  /** Fotos de cada reto en orden cronológico. */
  byChallenge: Map<string, AlbumPhoto[]>
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Arma el álbum hoja por hoja: portada, índice, la noche (por hora), ranking de retos,
 * los retos (cada uno con sus fotos) y el cierre. Las secciones vacías no se incluyen.
 */
export function buildAlbum(photos: AlbumPhoto[], challenges: AlbumChallenge[]): Album {
  const pages: AlbumPage[] = [{ kind: 'title' }, { kind: 'index' }]
  const sections: AlbumSection[] = [{ id: 'inicio', emoji: '📖', title: 'Portada', page: 0, entries: [] }]

  const groups = groupByHour(photos)
  const night = groups.flatMap((g) => g.photos)
  if (night.length > 0) {
    const section: AlbumSection = { id: 'noche', emoji: '🌙', title: 'La noche', page: pages.length, entries: [] }
    pages.push({ kind: 'divider', emoji: '🌙', title: 'La noche', subtitle: `${night.length} fotos, hora por hora` })
    const firstDay = groups[0].key.slice(0, 10)
    for (const group of groups) {
      // Las horas de otro día llevan el día adelante ("dom 10:00"): si no, habría dos "19:00".
      const label = group.key.startsWith(firstDay) ? group.label : `${group.weekday} ${group.label}`
      section.entries.push({ label, page: pages.length })
      chunk(group.photos, PHOTOS_PER_PAGE).forEach((list, i) =>
        pages.push({
          kind: 'photos',
          list: 'noche',
          heading: group.label,
          dayLabel: i === 0 ? group.dayLabel : null,
          continued: i > 0,
          photos: list,
        })
      )
    }
    sections.push(section)
  }

  const ranking = challengeRanking(photos)
  if (ranking.length > 0) {
    const section: AlbumSection = { id: 'ranking', emoji: '🏆', title: 'Ranking de retos', page: pages.length, entries: [] }
    pages.push({ kind: 'podium', rows: ranking.slice(0, 3), total: ranking.length })
    for (const rows of chunk(ranking, RANKING_ROWS_PER_PAGE)) pages.push({ kind: 'ranking', rows })
    sections.push(section)
  }

  const byChallenge = new Map<string, AlbumPhoto[]>()
  for (const photo of night) {
    if (!photo.challenge) continue
    const list = byChallenge.get(photo.challenge.id) ?? []
    list.push(photo)
    byChallenge.set(photo.challenge.id, list)
  }
  const withPhotos = challenges.filter((c) => byChallenge.has(c.id))
  if (withPhotos.length > 0) {
    const section: AlbumSection = { id: 'retos', emoji: '📸', title: 'Los retos', page: pages.length, entries: [] }
    pages.push({ kind: 'divider', emoji: '📸', title: 'Los retos', subtitle: `${withPhotos.length} retos cumplidos en fotos` })
    for (const challenge of withPhotos) {
      section.entries.push({ label: `${challenge.emoji} ${challenge.title}`, page: pages.length })
      chunk(byChallenge.get(challenge.id)!, PHOTOS_PER_PAGE).forEach((list, i) =>
        pages.push({
          kind: 'photos',
          list: { challengeId: challenge.id },
          heading: `${challenge.emoji} ${challenge.title}`,
          dayLabel: null,
          continued: i > 0,
          photos: list,
        })
      )
    }
    sections.push(section)
  }

  sections.push({ id: 'cierre', emoji: '💛', title: 'Gracias', page: pages.length, entries: [] })
  pages.push({ kind: 'closing' })

  return { pages, sections, ranking, night, byChallenge }
}
