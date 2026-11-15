import { createServerClient } from '@/lib/supabase/server'
import { displayPhotoUrl } from '@/lib/photos'
import type { AlbumChallenge, AlbumPhoto } from '@/lib/album'

export interface AlbumData {
  photos: AlbumPhoto[]
  challenges: AlbumChallenge[]
}

interface PhotoRow {
  id: string
  url: string
  guest_id: string
  guest_name: string
  caption: string | null
  created_at: string
  challenge: AlbumChallenge | null
  guest: { name: string; is_test: boolean } | null
}

/** Fotos de la galería para el álbum público, sin las de los invitados de prueba. */
export async function getAlbumData(): Promise<AlbumData> {
  const supabase = createServerClient()
  const [photosRes, challengesRes] = await Promise.all([
    supabase
      .from('photos')
      .select('id, url, guest_id, guest_name, caption, created_at, challenge:challenges(id, title, emoji), guest:guests(name, is_test)')
      .order('created_at', { ascending: true }),
    supabase.from('challenges').select('id, title, emoji').order('created_at', { ascending: true }),
  ])
  if (photosRes.error) throw photosRes.error
  if (challengesRes.error) throw challengesRes.error

  const photos = (photosRes.data as unknown as PhotoRow[])
    .filter((row) => !row.guest?.is_test)
    .map((row) => ({
      id: row.id,
      url: displayPhotoUrl(row.url),
      guestId: row.guest_id,
      // El nombre de la lista de invitados; si no está, el que quedó guardado en la foto.
      guestName: row.guest?.name ?? row.guest_name,
      caption: row.caption?.trim() || null,
      createdAt: row.created_at,
      challenge: row.challenge,
    }))

  return { photos, challenges: challengesRes.data }
}
