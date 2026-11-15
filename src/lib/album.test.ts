import { test } from 'node:test'
import assert from 'node:assert/strict'
import { challengeRanking, downloadUrl, filterPhotos, formatTime, groupByHour } from './album.ts'
import type { AlbumPhoto } from './album.ts'

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

test('filterPhotos combina persona, reto y comentario', () => {
  const photos = [
    photo('ana', '01:00', { challenge: RETO_A, caption: 'hola' }),
    photo('ana', '01:00', { challenge: RETO_A }),
    photo('ana', '01:00', { caption: '   ' }),
    photo('beto', '01:00', { challenge: RETO_A, caption: 'chau' }),
  ]
  assert.equal(filterPhotos(photos, { guestId: 'ana', challengeId: 'a', onlyWithCaption: true }).length, 1)
  assert.equal(filterPhotos(photos, { guestId: null, challengeId: null, onlyWithCaption: true }).length, 2)
  assert.equal(filterPhotos(photos, { guestId: null, challengeId: null, onlyWithCaption: false }).length, 4)
})

test('downloadUrl pide el archivo como adjunto con un nombre legible', () => {
  const p = photo('ana', '02:41', { guestName: 'Ana Núñez' })
  assert.equal(downloadUrl(p), `${p.url}?download=Ana-Nunez-23.41.jpg`)
})
