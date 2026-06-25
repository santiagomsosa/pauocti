export type RsvpStatus = 'pending' | 'attending' | 'declined'

export interface Guest {
  id: string
  name: string
  code: string
  created_at: string
  email: string | null
  invite_token: string | null
  max_plus_ones: number
  parent_guest_id: string | null
  is_active: boolean
  rsvp_status: RsvpStatus
  dietary_restrictions: string | null
  rsvp_submitted_at: string | null
  plus_ones?: Guest[]
}

export interface Settings {
  wedding_datetime: string | null
  couple_names: string | null
  venue: string | null
  venue_address: string | null
  venue_map_url: string | null
}

export interface PlusOneInput {
  name: string
  email: string
  rsvp_status: 'attending' | 'declined'
  dietary_restrictions: string
}

export interface RsvpSubmitPayload {
  rsvp_status: 'attending' | 'declined'
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
