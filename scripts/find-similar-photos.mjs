// Busca fotos repetidas que no son el mismo archivo (por ejemplo, la misma foto subida de nuevo después de
// pasar por WhatsApp o por una captura): compara cómo se ven, no los bytes.
//
//   node --env-file=.env.local scripts/find-similar-photos.mjs [distancia-máxima=10]
//
// Lista los pares candidatos para revisarlos a ojo. Los confirmados se agregan a src/lib/album-duplicates.ts.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const MAX_DISTANCE = Number(process.argv[2] ?? 10)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/** dHash de 64 bits: compara el brillo de cada píxel con el de al lado en una versión de 9×8 en grises. */
async function dHash(buffer) {
  const pixels = await sharp(buffer).rotate().grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let hash = 0n
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) hash = (hash << 1n) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? 1n : 0n)
  return hash
}

function distance(a, b) {
  let x = a ^ b
  let n = 0
  while (x) {
    n += Number(x & 1n)
    x >>= 1n
  }
  return n
}

const { data: rows, error } = await supabase
  .from('photos')
  .select('id, url, guest_id, guest_name, caption, created_at, challenge_id')
  .order('created_at')
if (error) throw error

// Las HEIC tienen una copia en JPG al lado (ver displayPhotoUrl).
const photos = []
for (let i = 0; i < rows.length; i += 8) {
  await Promise.all(
    rows.slice(i, i + 8).map(async (row) => {
      const res = await fetch(row.url.replace(/\.hei[cf]$/i, '.jpg'))
      if (!res.ok) return console.error('no se pudo bajar', row.id, res.status)
      const buffer = Buffer.from(await res.arrayBuffer())
      const meta = await sharp(buffer).rotate().metadata()
      photos.push({ ...row, hash: await dHash(buffer), ratio: meta.autoOrient.width / meta.autoOrient.height })
    })
  )
}

const time = (iso) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

const pairs = []
for (let i = 0; i < photos.length; i++)
  for (let j = i + 1; j < photos.length; j++) {
    const d = distance(photos[i].hash, photos[j].hash)
    if (d <= MAX_DISTANCE && Math.abs(photos[i].ratio - photos[j].ratio) < 0.08) pairs.push([d, photos[i], photos[j]])
  }
pairs.sort((a, b) => a[0] - b[0])

console.log(`${photos.length} fotos, ${pairs.length} pares parecidos (distancia ≤ ${MAX_DISTANCE} de 64)\n`)
for (const [d, a, b] of pairs) {
  const [first, second] = new Date(a.created_at) <= new Date(b.created_at) ? [a, b] : [b, a]
  const who = first.guest_id === second.guest_id ? first.guest_name : `${first.guest_name} / ${second.guest_name}`
  console.log(`d=${String(d).padStart(2)}  ${who}  ${time(first.created_at)} → ${time(second.created_at)}  ${first.id} ${second.id}`)
}
