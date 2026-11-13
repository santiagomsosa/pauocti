import type { SupabaseClient } from '@supabase/supabase-js'

export const PHOTOS_BUCKET = 'wedding-photos'

/**
 * Borra una foto: primero el archivo y después la fila, así nunca queda una fila apuntando
 * a un archivo que ya no existe. Devuelve false si algo falló (la foto sigue intacta en ese caso).
 */
export async function deletePhoto(
  supabase: SupabaseClient,
  photo: { id: string; storage_path: string }
): Promise<boolean> {
  const { error: storageError } = await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path])
  if (storageError) return false
  const { error: dbError } = await supabase.from('photos').delete().eq('id', photo.id)
  return !dbError
}
