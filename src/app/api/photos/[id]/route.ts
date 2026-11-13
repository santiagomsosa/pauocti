import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getGuestSession } from '@/lib/auth'
import { deletePhoto } from '@/lib/photos'

/** Un invitado puede borrar solo las fotos que subió él. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getGuestSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServerClient()
  const { data: photo } = await supabase
    .from('photos')
    .select('id, guest_id, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!photo) {
    return NextResponse.json({ error: 'La foto no existe' }, { status: 404 })
  }
  if (photo.guest_id !== session.guestId) {
    return NextResponse.json({ error: 'Solo podés borrar tus propias fotos' }, { status: 403 })
  }

  if (!(await deletePhoto(supabase, photo))) {
    return NextResponse.json({ error: 'No se pudo borrar la foto' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
