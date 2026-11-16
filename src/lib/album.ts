// Lógica pura del álbum del casamiento (sin base de datos), para poder probarla con `npm test`.

/** Zona horaria de la boda: las horas del álbum se muestran en hora argentina. */
export const ALBUM_TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Foto de los novios en la tapa (la que se ve antes de abrir el álbum) y en el cierre. */
export const ALBUM_COVER_SRC = '/album/tapa.jpg'
export const ALBUM_CLOSING_SRC = '/album/cierre.jpg'

/** Canción que arranca al tocar "Abrir el álbum" (en /public). `null` oculta la música. */
export const ALBUM_SONG_SRC: string | null = '/album/bancate-ese-defecto.m4a' // Charly García, hasta el 1:28 ("bancate ese defecto") y en loop

export interface AlbumChallenge {
  id: string
  title: string
  emoji: string
}

export interface AlbumPhoto {
  id: string
  /** Huella del archivo (eTag de Storage): dos filas con la misma huella son la misma foto subida dos veces. */
  contentKey: string
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
  /** Retos cumplidos: cada reto cuenta una vez y cada foto vale para un solo reto. */
  completed: number
  /** Cuándo llegó a esa cantidad: desempata a favor de quien terminó antes. */
  reachedAt: string
}

/**
 * Cuántos retos se cumplen como máximo si cada foto (archivo) vale para un solo reto.
 * Es un emparejamiento fotos ↔ retos: si la foto X se usó para A y B, y otra foto Y para A,
 * cuenta A con Y y B con X (2 retos), en vez de "gastar" X en A.
 */
function maxChallenges(uses: { file: string; challenge: string }[]): number {
  const options = new Map<string, string[]>() // foto → retos para los que se usó
  for (const { file, challenge } of uses) {
    const list = options.get(file) ?? []
    if (!list.includes(challenge)) list.push(challenge)
    options.set(file, list)
  }
  const fileOf = new Map<string, string>() // reto → foto asignada
  const assign = (file: string, seen: Set<string>): boolean => {
    for (const challenge of options.get(file)!) {
      if (seen.has(challenge)) continue
      seen.add(challenge)
      const holder = fileOf.get(challenge)
      if (holder === undefined || assign(holder, seen)) {
        fileOf.set(challenge, file)
        return true
      }
    }
    return false
  }
  let count = 0
  for (const file of options.keys()) if (assign(file, new Set())) count++
  return count
}

/**
 * Ranking de retos. Cada reto cuenta una vez y cada foto vale para un solo reto (la misma foto
 * subida para dos retos suma uno). Si empatan en cantidad, gana quien llegó antes a ese total.
 */
export function challengeRanking(photos: AlbumPhoto[]): RankingRow[] {
  const byGuest = new Map<string, { name: string; uses: { file: string; challenge: string; at: number }[] }>()
  for (const photo of photos) {
    if (!photo.challenge) continue
    let entry = byGuest.get(photo.guestId)
    if (!entry) {
      entry = { name: photo.guestName, uses: [] }
      byGuest.set(photo.guestId, entry)
    }
    entry.uses.push({ file: photo.contentKey, challenge: photo.challenge.id, at: new Date(photo.createdAt).getTime() })
  }

  const rows = [...byGuest].map(([guestId, { name, uses }]) => {
    uses.sort((a, b) => a.at - b.at)
    const completed = maxChallenges(uses)
    // La hora del desempate: la primera foto con la que el total llega a su valor final.
    let reachedAtMs = uses.at(-1)!.at
    for (let k = 1; k <= uses.length; k++) {
      if (maxChallenges(uses.slice(0, k)) === completed) {
        reachedAtMs = uses[k - 1].at
        break
      }
    }
    return { guestId, name, completed, reachedAtMs }
  })
  rows.sort((a, b) => b.completed - a.completed || a.reachedAtMs - b.reachedAtMs || a.name.localeCompare(b.name, 'es'))

  return rows.map((row, i) => ({
    rank: i + 1,
    guestId: row.guestId,
    name: row.name,
    completed: row.completed,
    reachedAt: new Date(row.reachedAtMs).toISOString(),
  }))
}

/**
 * Saca las fotos repetidas (mismo archivo subido más de una vez): queda una por huella,
 * la que tiene comentario si alguna lo tiene y si no la primera. Mantiene el orden de entrada.
 */
export function dedupePhotos(photos: AlbumPhoto[]): AlbumPhoto[] {
  const best = new Map<string, AlbumPhoto>()
  for (const photo of photos) {
    const current = best.get(photo.contentKey)
    const better =
      !current ||
      (!current.caption && !!photo.caption) ||
      (!current.caption === !photo.caption && new Date(photo.createdAt).getTime() < new Date(current.createdAt).getTime())
    if (better) best.set(photo.contentKey, photo)
  }
  const keep = new Set([...best.values()].map((p) => p.id))
  return photos.filter((p) => keep.has(p.id))
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
/** Retos por hoja en el índice de retos; la primera lleva el título y entra uno menos. */
export const CHALLENGES_PER_PAGE = 6

/** Un reto en el índice de retos: cuántas fotos tiene y unas miniaturas. */
export interface ChallengeSummary {
  challenge: AlbumChallenge
  count: number
  preview: AlbumPhoto[]
}

export type AlbumPage =
  | { kind: 'title' }
  | { kind: 'index' }
  | { kind: 'divider'; emoji: string; title: string; subtitle: string }
  | {
      kind: 'photos'
      heading: string
      /** Solo en la primera hoja de cada día de "La noche". */
      dayLabel: string | null
      photos: AlbumPhoto[]
    }
  | { kind: 'podium'; rows: RankingRow[]; total: number }
  | { kind: 'ranking'; rows: RankingRow[] }
  /** Índice de retos: cada uno abre sus fotos en el visor (las fotos ya están en "La noche"). */
  | { kind: 'challenges'; rows: ChallengeSummary[]; first: boolean; total: number }
  | { kind: 'closing' }

export interface AlbumSection {
  id: 'inicio' | 'noche' | 'ranking' | 'retos' | 'cierre'
  emoji: string
  title: string
  page: number
  /** Accesos directos dentro de la sección (cada hora, cada reto). Los retos abren sus fotos en el visor. */
  entries: { label: string; page: number; challengeId?: string }[]
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

/** Título corto para el menú: "Sacate una foto con un pelado" → "Un pelado". */
export function shortChallengeTitle(title: string): string {
  const rest = title.replace(/^sacate una (foto|selfie)\s+(con\s+)?/i, '').trim()
  return rest ? rest[0].toLocaleUpperCase('es') + rest.slice(1) : title
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Arma el álbum hoja por hoja: portada, índice, la noche (por hora), ranking de retos,
 * el índice de retos y el cierre. Las secciones vacías no se incluyen.
 */
export function buildAlbum(photos: AlbumPhoto[], challenges: AlbumChallenge[]): Album {
  const pages: AlbumPage[] = [{ kind: 'title' }, { kind: 'index' }]
  const sections: AlbumSection[] = [{ id: 'inicio', emoji: '📖', title: 'Portada', page: 0, entries: [] }]

  // Cada foto se ve una sola vez; el ranking (más abajo) sí cuenta todas las filas.
  const groups = groupByHour(dedupePhotos(photos))
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
          heading: group.label,
          dayLabel: i === 0 ? group.dayLabel : null,
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

  // Dentro de cada reto tampoco se repite, pero una foto usada para dos retos aparece en los dos.
  const byChallenge = new Map<string, AlbumPhoto[]>()
  for (const photo of groupByHour(photos).flatMap((g) => g.photos)) {
    if (!photo.challenge) continue
    const list = byChallenge.get(photo.challenge.id) ?? []
    list.push(photo)
    byChallenge.set(photo.challenge.id, list)
  }
  for (const [id, list] of byChallenge) byChallenge.set(id, dedupePhotos(list))
  // Las fotos de cada reto ya están en "La noche" (con el reto anotado abajo): acá va un índice
  // compacto y cada reto abre sus fotos en el visor, en vez de repetirlas en otras 70 páginas.
  const summaries: ChallengeSummary[] = challenges
    .filter((c) => byChallenge.has(c.id))
    .map((challenge) => {
      const list = byChallenge.get(challenge.id)!
      return { challenge, count: list.length, preview: list.slice(0, 3) }
    })
  if (summaries.length > 0) {
    const section: AlbumSection = { id: 'retos', emoji: '📸', title: 'Los retos', page: pages.length, entries: [] }
    const first = summaries.slice(0, CHALLENGES_PER_PAGE - 1)
    ;[first, ...chunk(summaries.slice(first.length), CHALLENGES_PER_PAGE)].forEach((rows, i) => {
      for (const row of rows)
        section.entries.push({
          label: `${row.challenge.emoji} ${shortChallengeTitle(row.challenge.title)}`,
          page: pages.length,
          challengeId: row.challenge.id,
        })
      pages.push({ kind: 'challenges', rows, first: i === 0, total: summaries.length })
    })
    sections.push(section)
  }

  sections.push({ id: 'cierre', emoji: '💛', title: 'Gracias', page: pages.length, entries: [] })
  pages.push({ kind: 'closing' })

  return { pages, sections, ranking, night, byChallenge }
}
