import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getGuestSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const challengeId = formData.get('challengeId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar los 10MB' }, { status: 400 })
    }

    const supabase = createServerClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`
    const storagePath = `photos/${filename}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('wedding-photos')
      .upload(storagePath, bytes, { contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(storagePath)

    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        guest_id: session.guestId,
        guest_name: session.guestName,
        url: publicUrl,
        storage_path: storagePath,
        challenge_id: challengeId || null,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Error al guardar la foto' }, { status: 500 })
    }

    return NextResponse.json({ photo })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
