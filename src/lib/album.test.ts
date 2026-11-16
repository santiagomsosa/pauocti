import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAlbum, challengeRanking, dedupePhotos, downloadUrl, formatTime, groupByHour, shortChallengeTitle } from './album.ts'
import type { AlbumPage, AlbumPhoto } from './album.ts'

const RETO_A = { id: 'a', title: 'Selfie con los novios', emoji: '🤳' }
const RETO_B = { id: 'b', title: 'Brindis', emoji: '🥂' }
const RETO_C = { id: 'c', title: 'Baile', emoji: '💃' }

let seq = 0
function photo(guestId: string, utc: string, extra: Partial<AlbumPhoto> = {}): AlbumPhoto {
  return {
    id: `p${++seq}`,
    contentKey: `k${seq}`,
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
    ['title', 'index', 'divider', 'photos', 'photos', 'photos', 'podium', 'ranking', 'challenges', 'closing']
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
  assert.equal(sigue23.photos.length, 1)
  assert.equal(sigue23.dayLabel, null)
  // Los retos van en un índice compacto (una hoja); el reto C no tiene fotos y no aparece.
  const retos = album.sections.find((s) => s.id === 'retos')!
  assert.deepEqual(
    retos.entries.map((e) => [e.challengeId, e.page]),
    [
      ['a', 8],
      ['b', 8],
    ]
  )
  const indice = album.pages[8] as Extract<AlbumPage, { kind: 'challenges' }>
  assert.deepEqual(
    indice.rows.map((r) => [r.challenge.id, r.count]),
    [
      ['a', 1],
      ['b', 1],
    ]
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

test('dedupePhotos: deja una por archivo, prefiriendo la que tiene comentario', () => {
  const a1 = photo('ana', '01:00', { contentKey: 'x' })
  const a2 = photo('ana', '01:01', { contentKey: 'x', caption: 'Viva Pau y Octi' })
  const b1 = photo('ana', '01:02', { contentKey: 'y' })
  const b2 = photo('ana', '01:03', { contentKey: 'y' })
  assert.deepEqual(
    dedupePhotos([a1, a2, b1, b2]).map((p) => p.id),
    [a2.id, b1.id]
  )
})

test('buildAlbum: la foto repetida se ve una vez y, aunque se haya usado para dos retos, suma uno', () => {
  const p1 = photo('ana', '01:00', { contentKey: 'x', challenge: RETO_A })
  const p2 = photo('ana', '01:01', { contentKey: 'x', challenge: RETO_B })
  const p3 = photo('ana', '01:02', { contentKey: 'x', challenge: RETO_B })
  const album = buildAlbum([p1, p2, p3], [RETO_A, RETO_B])
  assert.equal(album.night.length, 1)
  assert.equal(album.byChallenge.get('a')!.length, 1)
  assert.equal(album.byChallenge.get('b')!.length, 1)
  assert.equal(album.ranking[0].completed, 1)
})

test('ranking: una misma foto usada para dos retos suma uno solo', () => {
  const rows = challengeRanking([
    photo('ana', '01:00', { contentKey: 'x', challenge: RETO_A }),
    photo('ana', '01:05', { contentKey: 'x', challenge: RETO_B }), // la misma foto: no suma
    photo('beto', '01:00', { challenge: RETO_A }),
    photo('beto', '02:00', { challenge: RETO_B }),
  ])
  assert.deepEqual(
    rows.map((r) => [r.guestId, r.completed]),
    [
      ['beto', 2],
      ['ana', 1],
    ]
  )
})

test('ranking: si la foto repetida se puede asignar a otro reto, se cuenta (no se pierde un reto)', () => {
  // X para A y para B, y otra foto Y para A: A con Y y B con X → 2 retos.
  const rows = challengeRanking([
    photo('ana', '01:00', { contentKey: 'x', challenge: RETO_A }),
    photo('ana', '01:05', { contentKey: 'x', challenge: RETO_B }),
    photo('ana', '01:30', { contentKey: 'y', challenge: RETO_A }),
  ])
  assert.equal(rows[0].completed, 2)
  // Llega a 2 recién con la foto Y (01:30).
  assert.equal(rows[0].reachedAt, '2026-11-15T01:30:00.000Z')
})

test('shortChallengeTitle saca el "Sacate una foto/selfie (con)" del comienzo', () => {
  assert.equal(shortChallengeTitle('Sacate una foto con un pelado'), 'Un pelado')
  assert.equal(shortChallengeTitle('Sacate una foto brindando con alguien que acabás de conocer'), 'Brindando con alguien que acabás de conocer')
  assert.equal(shortChallengeTitle('Sacate una selfie con la mayor cantidad de gente posible en un solo cuadro'), 'La mayor cantidad de gente posible en un solo cuadro')
  assert.equal(shortChallengeTitle('Bailá con los novios'), 'Bailá con los novios')
})
