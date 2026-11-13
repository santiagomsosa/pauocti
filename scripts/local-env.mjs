// Genera .env.supabase-local con las claves de la base local (`supabase start`).
// Lo usa `npm run dev:local`; el archivo queda ignorado por git (.env*).
//
// `supabase start` tiene que incluir gotrue: si se lo excluye con -x, `supabase status`
// no imprime las claves.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }))
if (!status.SERVICE_ROLE_KEY) throw new Error('`supabase status` no devolvió claves: ¿está corriendo `supabase start` con gotrue?')

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  'ADMIN_PASSWORD=admin-local',
  'NEXT_PUBLIC_COUPLE_NAMES="Pau & Octi"',
  'NEXT_PUBLIC_WEDDING_DATE="14 de Noviembre de 2026"',
  'NEXT_PUBLIC_APP_URL=http://localhost:3000',
]
writeFileSync('.env.supabase-local', lines.join('\n') + '\n')
console.log('Listo: .env.supabase-local (admin: admin-local)')
