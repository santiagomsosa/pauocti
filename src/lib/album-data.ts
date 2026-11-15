import { createServerClient } from '@/lib/supabase/server'
import { displayPhotoUrl, PHOTOS_BUCKET } from '@/lib/photos'
import type { AlbumChallenge, AlbumPhoto } from '@/lib/album'

export interface AlbumData {
  photos: AlbumPhoto[]
  challenges: AlbumChallenge[]
}

/** Huella (eTag) de cada archivo del bucket, por ruta. Sirve para detectar la misma foto subida dos veces. */
async function fileFingerprints(supabase: ReturnType<typeof createServerClient>, folders: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const folder of folders) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list(folder, { limit: 1000, offset })
      // Sin huellas no se deduplica, pero el álbum se sigue viendo.
      if (error || !data) break
      for (const file of data) {
        const etag = (file.metadata as { eTag?: string } | null)?.eTag
        if (etag) out.set(folder ? `${folder}/${file.name}` : file.name, etag)
      }
      if (data.length < 1000) break
    }
  }
  return out
}

interface PhotoRow {
  id: string
  storage_path: string
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
      .select('id, url, storage_path, guest_id, guest_name, caption, created_at, challenge:challenges(id, title, emoji), guest:guests(name, is_test)')
      .order('created_at', { ascending: true }),
    supabase.from('challenges').select('id, title, emoji').order('created_at', { ascending: true }),
  ])
  if (photosRes.error) throw photosRes.error
  if (challengesRes.error) throw challengesRes.error

  const rows = (photosRes.data as unknown as PhotoRow[]).filter((row) => !row.guest?.is_test)
  const folders = [...new Set(rows.map((row) => row.storage_path.split('/').slice(0, -1).join('/')))]
  const fingerprints = await fileFingerprints(supabase, folders)

  const photos = rows.map((row) => ({
    id: row.id,
    contentKey: fingerprints.get(row.storage_path) ?? row.id,
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
