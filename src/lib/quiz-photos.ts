// Fotos que se muestran después de responder la trivia.
//
// Regla:
// - La respuesta correcta era Pau o Octi → foto de esa persona: contenta si acertó, triste si erró
//   o se le acabó el tiempo.
// - Preguntas de tragos (ni Pau ni Octi) → una foto al azar, contenta o triste según la respuesta.
//
// Para sumar una foto: copiarla a public/trivia/ y agregar una línea a QUIZ_PHOTOS.
// `owners: []` = sin asignar; sirve para cualquier respuesta del mismo ánimo.
// Una foto puede servir para varias personas (ej. una pareja).

export type PhotoMood = 'happy' | 'sad'
export type PhotoOwner = 'pau' | 'octi'

export interface QuizPhoto {
  src: string
  mood: PhotoMood
  owners: PhotoOwner[]
}

export const QUIZ_PHOTOS: QuizPhoto[] = [
  { src: '/trivia/ok-pau-1.jpg', mood: 'happy', owners: ['pau'] },
  { src: '/trivia/ok-pau-2.jpg', mood: 'happy', owners: ['pau'] },
  { src: '/trivia/ok-octi-1.jpg', mood: 'happy', owners: ['octi'] },
  { src: '/trivia/ok-octi-2.jpg', mood: 'happy', owners: ['octi'] },
  { src: '/trivia/ok-juntos-1.jpg', mood: 'happy', owners: ['pau', 'octi'] },
  { src: '/trivia/mal-pau-1.jpg', mood: 'sad', owners: ['pau'] },
  { src: '/trivia/mal-pau-2.jpg', mood: 'sad', owners: ['pau'] },
  { src: '/trivia/mal-octi-1.jpg', mood: 'sad', owners: ['octi'] },
  { src: '/trivia/mal-octi-2.jpg', mood: 'sad', owners: ['octi'] },
  { src: '/trivia/mal-juntos-1.jpg', mood: 'sad', owners: ['pau', 'octi'] },
]

/** Hash FNV-1a: la misma respuesta siempre muestra la misma foto (si se recarga la pantalla). */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export function pickQuizPhoto(params: {
  /** Texto de la opción correcta ("Pau", "Octi", "Aperol Spritz", ...). */
  correctLabel: string
  correct: boolean
  /** Se acabó el tiempo cuenta como respuesta triste. */
  timedOut?: boolean
  /** Identificador de la respuesta: decide la foto de forma estable. */
  seed: string
  photos?: QuizPhoto[]
}): string | null {
  const photos = params.photos ?? QUIZ_PHOTOS
  const mood: PhotoMood = params.correct && !params.timedOut ? 'happy' : 'sad'
  const owner: PhotoOwner | null =
    params.correctLabel === 'Pau' ? 'pau' : params.correctLabel === 'Octi' ? 'octi' : null

  const byMood = photos.filter((p) => p.mood === mood)
  const candidates = owner ? byMood.filter((p) => p.owners.includes(owner)) : []
  const pool = candidates.length > 0 ? candidates : byMood
  if (pool.length === 0) return null

  return pool[hash(`${params.seed}:${mood}`) % pool.length].src
}
