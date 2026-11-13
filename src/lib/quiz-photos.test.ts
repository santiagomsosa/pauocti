import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickQuizPhoto, QUIZ_PHOTOS, type QuizPhoto } from './quiz-photos.ts'

const photos: QuizPhoto[] = [
  { src: 'pau-happy.jpg', mood: 'happy', owners: ['pau'] },
  { src: 'pau-sad.jpg', mood: 'sad', owners: ['pau'] },
  { src: 'octi-happy-a.jpg', mood: 'happy', owners: ['octi'] },
  { src: 'octi-happy-b.jpg', mood: 'happy', owners: ['octi'] },
  { src: 'octi-sad.jpg', mood: 'sad', owners: ['octi'] },
  { src: 'generic-happy.jpg', mood: 'happy', owners: [] },
  { src: 'generic-sad.jpg', mood: 'sad', owners: [] },
  { src: 'shared-happy.jpg', mood: 'happy', owners: ['pau', 'octi'] },
]

test('la respuesta correcta era Octi y acertó → foto de Octi contento', () => {
  const src = pickQuizPhoto({ correctLabel: 'Octi', correct: true, seed: 'r1', photos })
  assert.ok(['octi-happy-a.jpg', 'octi-happy-b.jpg', 'shared-happy.jpg'].includes(src!))
})

test('la respuesta correcta era Octi y erró → foto de Octi triste', () => {
  assert.equal(pickQuizPhoto({ correctLabel: 'Octi', correct: false, seed: 'r2', photos }), 'octi-sad.jpg')
})

test('la respuesta correcta era Pau → foto de Pau según acierto', () => {
  assert.equal(pickQuizPhoto({ correctLabel: 'Pau', correct: true, seed: 'r3', photos }), 'pau-happy.jpg')
  assert.equal(pickQuizPhoto({ correctLabel: 'Pau', correct: false, seed: 'r4', photos }), 'pau-sad.jpg')
})

test('se acabó el tiempo con respuesta Pau → foto triste de Pau', () => {
  assert.equal(
    pickQuizPhoto({ correctLabel: 'Pau', correct: false, timedOut: true, seed: 'r5', photos }),
    'pau-sad.jpg'
  )
})

test('preguntas de tragos → al azar entre las del mismo ánimo', () => {
  const happy = photos.filter((p) => p.mood === 'happy').map((p) => p.src)
  const sad = photos.filter((p) => p.mood === 'sad').map((p) => p.src)
  assert.ok(happy.includes(pickQuizPhoto({ correctLabel: 'Aperol Spritz', correct: true, seed: 'r6', photos })!))
  assert.ok(sad.includes(pickQuizPhoto({ correctLabel: 'Old Fashioned', correct: false, seed: 'r7', photos })!))
})

test('si no hay foto de la persona para ese ánimo, usa cualquiera del mismo ánimo', () => {
  const noPauHappy = photos.filter((p) => !(p.owners.includes('pau') && p.mood === 'happy'))
  const happy = noPauHappy.filter((p) => p.mood === 'happy').map((p) => p.src)
  assert.ok(happy.includes(pickQuizPhoto({ correctLabel: 'Pau', correct: true, seed: 'r8', photos: noPauHappy })!))
})

test('sin fotos devuelve null (el cliente muestra el emoji)', () => {
  assert.equal(pickQuizPhoto({ correctLabel: 'Pau', correct: true, seed: 'r9', photos: [] }), null)
})

test('la misma respuesta siempre muestra la misma foto', () => {
  const a = pickQuizPhoto({ correctLabel: 'Octi', correct: true, seed: 'abc', photos })
  for (let i = 0; i < 20; i++) {
    assert.equal(pickQuizPhoto({ correctLabel: 'Octi', correct: true, seed: 'abc', photos }), a)
  }
})

test('las fotos del archivo real cubren ambos ánimos', () => {
  assert.ok(QUIZ_PHOTOS.some((p) => p.mood === 'happy'))
  assert.ok(QUIZ_PHOTOS.some((p) => p.mood === 'sad'))
})

test('una foto compartida sale para cualquiera de las dos personas', () => {
  const shownForPau = new Set<string>()
  const shownForOcti = new Set<string>()
  for (let i = 0; i < 200; i++) {
    shownForPau.add(pickQuizPhoto({ correctLabel: 'Pau', correct: true, seed: `p${i}`, photos })!)
    shownForOcti.add(pickQuizPhoto({ correctLabel: 'Octi', correct: true, seed: `o${i}`, photos })!)
  }
  assert.ok(shownForPau.has('shared-happy.jpg'))
  assert.ok(shownForOcti.has('shared-happy.jpg'))
})
