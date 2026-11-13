// Backup de las fotos: baja todos los archivos del bucket y guarda la tabla `photos` en JSON.
// Es incremental: lo que ya está bajado (mismo tamaño) no se vuelve a descargar.
//
//   npm run backup:photos            → ./backups/fotos
//   npm run backup:photos -- <carpeta>
//
// Usa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local.
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'wedding-photos'
const dest = resolve(process.argv[2] ?? 'backups/fotos')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (corré con: npm run backup:photos).')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function listAll(prefix = '') {
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset })
    if (error) throw error
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) files.push(...(await listAll(path)))
      else files.push({ path, size: item.metadata?.size ?? null })
    }
    if (data.length < 1000) break
  }
  return files
}

async function sizeOf(path) {
  try {
    return (await stat(path)).size
  } catch {
    return null
  }
}

const files = await listAll()
await mkdir(dest, { recursive: true })

let downloaded = 0
let skipped = 0
const failed = []
for (const file of files) {
  const target = join(dest, 'archivos', file.path)
  if (file.size !== null && (await sizeOf(target)) === file.size) {
    skipped++
    continue
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(file.path)
  if (error || !data) {
    failed.push(file.path)
    continue
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(await data.arrayBuffer()))
  downloaded++
}

// La tabla va con todos los datos (autor, texto, reto) para poder reconstruir la galería.
const { data: rows, error: rowsError } = await supabase.from('photos').select('*').order('created_at')
if (rowsError) throw rowsError
await writeFile(join(dest, 'photos.json'), JSON.stringify(rows, null, 2))

// Verificación: toda foto de la tabla tiene su archivo en el backup.
let missing = 0
for (const row of rows) if ((await sizeOf(join(dest, 'archivos', row.storage_path))) === null) missing++
const manifest = { at: new Date().toISOString(), files: files.length, downloaded, skipped, failed, rows: rows.length, rowsWithoutFile: missing }
await writeFile(join(dest, 'ultimo-backup.json'), JSON.stringify(manifest, null, 2))

console.log(`Backup en ${dest}`)
console.log(`  archivos en el bucket: ${files.length} (nuevos: ${downloaded}, ya estaban: ${skipped})`)
console.log(`  filas de la tabla photos: ${rows.length}`)
if (failed.length) console.error(`  ⚠ no se pudieron bajar ${failed.length}: ${failed.join(', ')}`)
if (missing) console.error(`  ⚠ ${missing} fotos de la tabla no tienen archivo en el backup`)
if (failed.length || missing) process.exit(2)
