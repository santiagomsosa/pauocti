import type { Metadata } from 'next'
import { AlbumView } from '@/components/album/AlbumView'
import { getAlbumData } from '@/lib/album-data'
import { getSettings } from '@/lib/settings'

// Se vuelve a leer de la base como mucho cada 5 minutos: las fotos nuevas o borradas se reflejan solas.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Álbum del casamiento',
  description: 'Las fotos de la fiesta: quién las sacó, a qué hora y los retos cumplidos.',
  // Es un link para los invitados: no tiene que aparecer en buscadores.
  robots: { index: false, follow: false },
}

export default async function AlbumPage() {
  const [{ photos, challenges }, settings] = await Promise.all([getAlbumData(), getSettings()])
  const coupleNames = settings.couple_names ?? process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Pau & Octi'
  const when = settings.wedding_datetime ?? process.env.NEXT_PUBLIC_WEDDING_DATE ?? null
  return <AlbumView photos={photos} challenges={challenges} coupleNames={coupleNames} weddingDate={when} />
}
