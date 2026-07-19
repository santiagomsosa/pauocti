import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para que sea fácil de leer y tipear
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 4

export function generateInviteToken(): string {
  return randomBytes(16).toString('hex')
}

export function generateGuestCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/**
 * Genera un código corto único: verifica contra la DB y contra los códigos ya
 * reservados en `taken` (útil al insertar varios integrantes en una misma tanda).
 */
export async function generateUniqueGuestCode(
  supabase: SupabaseClient,
  taken: Set<string> = new Set()
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateGuestCode()
    if (taken.has(code)) continue
    const { data } = await supabase.from('guests').select('id').eq('code', code).maybeSingle()
    if (!data) {
      taken.add(code)
      return code
    }
  }
  // Fallback (extremadamente improbable): extiende un carácter para desempatar
  const extra = CODE_ALPHABET[randomBytes(1)[0] % CODE_ALPHABET.length]
  const code = generateGuestCode() + extra
  taken.add(code)
  return code
}
