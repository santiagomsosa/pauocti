import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { deletePhoto } from '@/lib/photos'

/** El admin (protegido por el proxy) puede borrar cualquier foto. */
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Falta el id de la foto' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: photo } = await supabase.from('photos').select('id, storage_path').eq('id', id).maybeSingle()
  if (!photo) {
    return NextResponse.json({ error: 'La foto no existe' }, { status: 404 })
  }

  if (!(await deletePhoto(supabase, photo))) {
    return NextResponse.json({ error: 'No se pudo borrar la foto' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
