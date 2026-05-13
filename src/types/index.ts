export interface Guest {
  id: string
  name: string
  code: string
  created_at: string
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
