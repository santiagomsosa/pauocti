import { createServerClient } from '@/lib/supabase/server'
import type { Settings } from '@/types'

const KEYS: (keyof Settings)[] = [
  'wedding_datetime',
  'couple_names',
  'ceremony_venue',
  'ceremony_address',
  'ceremony_map_url',
  'venue',
  'venue_address',
  'venue_map_url',
  'bank_ars_account',
  'bank_ars_cbu',
  'bank_usd_account',
  'bank_usd_cbu',
]

export async function getSettings(): Promise<Settings> {
  const supabase = createServerClient()
  const { data } = await supabase.from('settings').select('key, value')

  const map = new Map((data ?? []).map((row) => [row.key, row.value]))
  const settings = {} as Settings
  for (const key of KEYS) {
    settings[key] = map.get(key) ?? null
  }
  return settings
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const supabase = createServerClient()
  const rows = Object.entries(partial)
    .filter(([key]) => (KEYS as string[]).includes(key))
    .map(([key, value]) => ({ key, value: value === '' ? null : value }))

  if (rows.length === 0) return

  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}
