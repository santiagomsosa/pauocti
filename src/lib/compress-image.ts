// Vercel rechaza cualquier request de más de 4,5 MB, y una foto de celular suele pesar 5–12 MB.
// Se achica en el dispositivo antes de subirla; las fotos de la galería no necesitan más que esto.
const MAX_SIDE = 2000
const TARGET_BYTES = 3.5 * 1024 * 1024
const MIN_QUALITY = 0.5

/** Máximo que se sube en un request (margen bajo el límite de 4,5 MB de Vercel, con el resto del form). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * Devuelve una versión JPEG de la imagen que entra en un request. Si el navegador no puede
 * decodificarla (p. ej. HEIC fuera de Safari) devuelve el archivo original.
 */
export async function compressImage(file: File): Promise<File> {
  // Un JPEG chico no necesita tocarse.
  if (file.size <= TARGET_BYTES && file.type === 'image/jpeg') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // Fondo blanco: los PNG con transparencia no deben quedar negros al pasar a JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let quality = 0.85
    let blob = await canvasToJpeg(canvas, quality)
    while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
      quality -= 0.1
      blob = await canvasToJpeg(canvas, quality)
    }
    if (!blob) return file
    // Si por algún motivo quedó más pesada que la original, se usa la original.
    if (blob.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
