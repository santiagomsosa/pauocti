export type RsvpStatus = 'pending' | 'attending' | 'declined'

export type InvitationType = 'individual' | 'family'

export interface WeddingTable {
  id: string
  name: string
  capacity: number
  created_at: string
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
  plus_ones?: Guest[]
}

export interface PlusOnePreload {
  name: string
  email: string
  phone: string
}

export interface Settings {
  wedding_datetime: string | null
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
