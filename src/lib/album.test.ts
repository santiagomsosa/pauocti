import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAlbum, challengeRanking, downloadUrl, formatTime, groupByHour } from './album.ts'
import type { AlbumPage, AlbumPhoto } from './album.ts'

const RETO_A = { id: 'a', title: 'Selfie con los novios', emoji: '🤳' }
const RETO_B = { id: 'b', title: 'Brindis', emoji: '🥂' }
const RETO_C = { id: 'c', title: 'Baile', emoji: '💃' }

let seq = 0
function photo(guestId: string, utc: string, extra: Partial<AlbumPhoto> = {}): AlbumPhoto {
  return {
    id: `p${++seq}`,
    url: `https://x.supabase.co/storage/v1/object/public/wedding-photos/${seq}.jpg`,
    guestId,
    guestName: guestId.toUpperCase(),
    caption: null,
    createdAt: `2026-11-15T${utc}:00.000Z`,
    challenge: null,
    ...extra,
  }
}

test('ranking: cuenta retos distintos, no fotos', () => {
  const rows = challengeRanking([
    photo('ana', '01:00', { challenge: RETO_A }),
    photo('ana', '01:05', { challenge: RETO_A }),
    photo('ana', '01:10', { challenge: RETO_A }),
    photo('beto', '01:00', { challenge: RETO_A }),
    photo('beto', '01:20', { challenge: RETO_B }),
  ])
  assert.deepEqual(
    rows.map((r) => [r.rank, r.guestId, r.completed]),
    [
      [1, 'beto', 2],
      [2, 'ana', 1],
    ]
  )
})

test('ranking: en empate gana quien completó antes su último reto', () => {
  const rows = challengeRanking([
    photo('ana', '02:00', { challenge: RETO_A }),
    photo('ana', '03:00', { challenge: RETO_B }),
    photo('beto', '01:00', { challenge: RETO_A }),
    photo('beto', '02:30', { challenge: RETO_B }),
    // Una foto repetida más tarde no le cambia la hora a beto.
    photo('beto', '04:00', { challenge: RETO_B }),
  ])
  assert.deepEqual(
    rows.map((r) => r.guestId),
    ['beto', 'ana']
  )
  assert.equal(rows[0].reachedAt, '2026-11-15T02:30:00.000Z')
})

test('ranking: las fotos sin reto (o de un reto borrado) no cuentan', () => {
  const rows = challengeRanking([photo('ana', '01:00'), photo('beto', '01:00', { challenge: RETO_C })])
  assert.deepEqual(
    rows.map((r) => r.guestId),
    ['beto']
  )
})

test('formatTime muestra la hora argentina', () => {
  assert.equal(formatTime('2026-11-15T02:41:00.000Z'), '23:41')
})

test('groupByHour: orden cronológico, por hora argentina, marcando el cambio de día', () => {
  const groups = groupByHour([
    photo('a', '03:10'), // 00:10 del domingo
    photo('a', '02:59'), // 23:59 del sábado
    photo('a', '02:01'), // 23:01 del sábado
  ])
  assert.deepEqual(
    groups.map((g) => [g.label, g.photos.length, g.dayLabel]),
    [
      ['23:00', 2, 'sábado, 14 de noviembre'],
      ['00:00', 1, 'domingo, 15 de noviembre'],
    ]
  )
})

test('downloadUrl pide el archivo como adjunto con un nombre legible', () => {
  const p = photo('ana', '02:41', { guestName: 'Ana Núñez' })
  assert.equal(downloadUrl(p), `${p.url}?download=Ana-Nunez-23.41.jpg`)
})

test('buildAlbum: secciones en orden, 4 fotos por hoja y el índice apunta a la hoja correcta', () => {
  const photos = [
    ...Array.from({ length: 5 }, (_, i) => photo('ana', `02:0${i}`, { challenge: i === 0 ? RETO_A : null })), // 23 hs
    photo('beto', '03:10', { challenge: RETO_B }), // 00 hs
  ]
  const album = buildAlbum(photos, [RETO_A, RETO_B, RETO_C])
  assert.deepEqual(
    album.pages.map((p) => p.kind),
    ['title', 'index', 'divider', 'photos', 'photos', 'photos', 'podium', 'ranking', 'divider', 'photos', 'photos', 'closing']
  )
  const noche = album.sections.find((s) => s.id === 'noche')!
  assert.equal(noche.page, 2)
  assert.deepEqual(noche.entries, [
    { label: '23:00', page: 3 },
    { label: 'dom 00:00', page: 5 },
  ])
  const hoja23 = album.pages[3] as Extract<AlbumPage, { kind: 'photos' }>
  const sigue23 = album.pages[4] as Extract<AlbumPage, { kind: 'photos' }>
  assert.equal(hoja23.photos.length, 4)
  assert.equal(hoja23.continued, false)
  assert.equal(sigue23.photos.length, 1)
  assert.equal(sigue23.continued, true)
  assert.equal(sigue23.dayLabel, null)
  // El reto C no tiene fotos: no aparece.
  assert.deepEqual(
    album.sections.find((s) => s.id === 'retos')!.entries.map((e) => e.page),
    [9, 10]
  )
  assert.equal(album.sections.at(-1)!.page, album.pages.length - 1)
})

test('buildAlbum: sin retos cumplidos no hay ranking ni sección de retos', () => {
  const album = buildAlbum([photo('ana', '02:00')], [RETO_A])
  assert.deepEqual(
    album.sections.map((s) => s.id),
    ['inicio', 'noche', 'cierre']
  )
})
