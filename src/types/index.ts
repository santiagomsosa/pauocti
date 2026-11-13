export type RsvpStatus = 'pending' | 'attending' | 'declined'

export type InvitationType = 'individual' | 'family'

export interface WeddingTable {
  id: string
  name: string
  capacity: number
  created_at: string
}

export interface GuestOpen {
  at: string
}

export interface Guest {
  id: string
  name: string
  code: string
  created_at: string
  email: string | null
  phone: string | null
  invite_token: string | null
  invitation_type: InvitationType
  max_plus_ones: number
  parent_guest_id: string | null
  is_active: boolean
  rsvp_status: RsvpStatus
  dietary_restrictions: string | null
  rsvp_submitted_at: string | null
  plus_ones_preload: PlusOnePreload[]
  table_id: string | null
  early_access: boolean
  is_test: boolean
  opens: GuestOpen[]
  plus_ones?: Guest[]
}

export interface PlusOnePreload {
  name: string
  email: string
  phone: string
}

export interface Settings {
  wedding_datetime: string | null
  venue_datetime: string | null
  couple_names: string | null
  ceremony_venue: string | null
  ceremony_address: string | null
  ceremony_map_url: string | null
  venue: string | null
  venue_address: string | null
  venue_map_url: string | null
  bank_ars_account: string | null
  bank_ars_cbu: string | null
  bank_usd_account: string | null
  bank_usd_cbu: string | null
}

export interface PlusOneInput {
  name: string
  email: string
  phone: string
  rsvp_status: 'attending' | 'declined'
  dietary_restrictions: string
  preloaded?: boolean
}

export interface RsvpSubmitPayload {
  rsvp_status: 'attending' | 'declined'
  phone: string
  email: string
  dietary_restrictions: string
  plus_ones: PlusOneInput[]
}

export interface Challenge {
  id: string
  title: string
  description: string
  emoji: string
  created_at: string
  photo_count?: number
  completed_by_me?: boolean
}

export interface Photo {
  id: string
  guest_id: string
  guest_name: string
  url: string
  storage_path: string
  challenge_id: string | null
  created_at: string
  challenge?: Challenge
}

export interface Message {
  id: string
  guest_id: string
  guest_name: string
  content: string
  created_at: string
}

export interface MusicRequest {
  id: string
  guest_id: string
  guest_name: string
  song_name: string
  artist: string | null
  created_at: string
}

export interface GuestSession {
  guestId: string
  guestName: string
}

// --- Trivia ---------------------------------------------------------------

export type QuizMode = 'auto' | 'closed' | 'finished'
export type QuizStatus = 'closed' | 'open' | 'finished'
export type QuizScope = 'real' | 'ensayo'

/** Pregunta tal como la ve el invitado: nunca incluye la respuesta correcta. */
export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
}

export interface QuizRound {
  scope: QuizScope
  number: number
  scheduled_at: string | null
  released_at: string | null
}

export interface QuizOpenQuestion extends QuizQuestion {
  round: number
  /** Posición dentro de la tanda (1-based) y cantidad de preguntas de la tanda. */
  position: number
  perRound: number
  secondsLeft: number
  totalSeconds: number
}

export interface QuizRoundSummary {
  round: number
  correct: number
  total: number
  points: number
  rank: number | null
}

export interface QuizState {
  status: QuizStatus
  phase: 'closed' | 'playing' | 'waiting' | 'done' | 'finished'
  releasedRounds: number
  totalRounds: number
  perRound: number
  secondsPerQuestion: number
  pendingCount: number
  /** Hora de la tanda 1, solo mientras está cerrada (cuenta regresiva). */
  firstRoundAt: string | null
  currentRound: number | null
  question: QuizOpenQuestion | null
  me: { points: number; correct: number; answered: number; rank: number | null; totalPlayers: number }
  lastRound: QuizRoundSummary | null
  isTest: boolean
}

export interface QuizAnswerResult {
  correct: boolean
  timedOut: boolean
  correctIndex: number
  correctLabel: string
  selectedIndex: number | null
  points: number
  wrongMessage: string | null
  /** Foto de los novios para esta respuesta (ver quiz-photos.ts); null = mostrar emoji. */
  photo: string | null
  roundCompleted: boolean
  roundSummary: QuizRoundSummary | null
  nextRoundAvailable: boolean
  isLastRound: boolean
  totalPoints: number
}

export interface QuizRankingRow {
  guest_id: string
  name: string
  points: number
  correct: number
  answered: number
  total_seconds: number
  last_answer_at: string | null
  unfinished: boolean
  rank: number
}

export interface QuizRanking {
  status: QuizStatus
  releasedRounds: number
  totalRounds: number
  top: QuizRankingRow[]
  me: QuizRankingRow | null
  totalPlayers: number
  isTest: boolean
}
