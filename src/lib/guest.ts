import type { Guest } from '@/types'

/**
 * Las familias siempre se muestran como "Familia X": se antepone automáticamente
 * para que el admin no tenga que escribirlo al cargar el invitado.
 */
export function familyDisplayName(guest: Pick<Guest, 'name' | 'invitation_type'>): string {
  if (guest.invitation_type !== 'family') return guest.name
  return /^familia\b/i.test(guest.name) ? guest.name : `Familia ${guest.name}`
}

/** Plural (ustedes/vamos) para familias o individuales con cupo de +1. */
export function isPluralGuest(guest: Pick<Guest, 'invitation_type' | 'max_plus_ones'>): boolean {
  return guest.invitation_type === 'family' || guest.max_plus_ones > 0
}
