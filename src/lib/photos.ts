import type { SupabaseClient } from '@supabase/supabase-js'

export const PHOTOS_BUCKET = 'wedding-photos'

const HEIC = /\.hei[cf]$/i

/**
 * Las fotos HEIC (iPhone) no se ven en Chrome ni pasan por el optimizador de imágenes.
 * Tienen una copia en JPG al lado (mismo nombre, extensión .jpg); el original queda intacto.
 */
export function displayPhotoUrl(url: string): string {
  return url.replace(HEIC, '.jpg')
}

/**
 * Borra una foto: primero el archivo y después la fila, así nunca queda una fila apuntando
 * a un archivo que ya no existe. Devuelve false si algo falló (la foto sigue intacta en ese caso).
 */
export async function deletePhoto(
  supabase: SupabaseClient,
  photo: { id: string; storage_path: string }
): Promise<boolean> {
  // Si es HEIC se lleva también su copia en JPG (si no existe, Storage lo ignora).
  const paths = HEIC.test(photo.storage_path)
    ? [photo.storage_path, photo.storage_path.replace(HEIC, '.jpg')]
    : [photo.storage_path]
  const { error: storageError } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths)
  if (storageError) return false
  const { error: dbError } = await supabase.from('photos').delete().eq('id', photo.id)
  return !dbError
}
