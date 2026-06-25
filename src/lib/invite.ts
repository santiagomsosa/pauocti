import { randomBytes } from 'crypto'

export function generateInviteToken(): string {
  return randomBytes(16).toString('hex')
}

export function generateGuestCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}
