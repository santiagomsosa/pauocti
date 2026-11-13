import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeGuestToken,
  encodeAdminToken,
  encodeGuestToken,
  isValidAdminToken,
  signToken,
} from './session-token.ts'

process.env.SESSION_SECRET = 'secreto-de-prueba'

const guest = { guestId: '7b1c0c2e-0000-4000-8000-000000000001', guestName: 'Ana Pérez' }

test('la sesión de invitado firmada se decodifica', () => {
  assert.deepEqual(decodeGuestToken(encodeGuestToken(guest)), guest)
})

test('una sesión de invitado adulterada se rechaza', () => {
  const [body, signature] = encodeGuestToken(guest).split('.')
  const forged = Buffer.from(JSON.stringify({ ...guest, guestId: 'otro-invitado' })).toString('base64url')
  assert.equal(decodeGuestToken(`${forged}.${signature}`), null)
  assert.equal(decodeGuestToken(`${body}.${signature.slice(0, -2)}xx`), null)
})

test('el formato viejo (base64 sin firma) se rechaza', () => {
  const legacy = Buffer.from(JSON.stringify(guest)).toString('base64')
  assert.equal(decodeGuestToken(legacy), null)
})

test('una cookie vacía o ausente se rechaza', () => {
  assert.equal(decodeGuestToken(undefined), null)
  assert.equal(decodeGuestToken(''), null)
  assert.equal(decodeGuestToken('.'), null)
})

test('un token firmado con otra clave se rechaza', () => {
  const token = encodeGuestToken(guest)
  process.env.SESSION_SECRET = 'otra-clave'
  assert.equal(decodeGuestToken(token), null)
  process.env.SESSION_SECRET = 'secreto-de-prueba'
})

test('un token firmado que no es de invitado no sirve como sesión de invitado', () => {
  assert.equal(decodeGuestToken(signToken({ role: 'admin', exp: Date.now() + 1000 })), null)
})

test('el token de admin vale hasta que vence', () => {
  const now = 1_000_000
  const token = encodeAdminToken(60, now)
  assert.equal(isValidAdminToken(token, now + 59_000), true)
  assert.equal(isValidAdminToken(token, now + 61_000), false)
})

test('la cookie de admin inventada no entra', () => {
  assert.equal(isValidAdminToken('authenticated'), false)
  assert.equal(isValidAdminToken(undefined), false)
  assert.equal(isValidAdminToken(encodeGuestToken(guest)), false)
})

test('sin clave configurada falla en vez de firmar con una clave vacía', () => {
  const previous = { a: process.env.SESSION_SECRET, b: process.env.SUPABASE_SERVICE_ROLE_KEY }
  delete process.env.SESSION_SECRET
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  assert.throws(() => encodeGuestToken(guest))
  process.env.SESSION_SECRET = previous.a
  if (previous.b) process.env.SUPABASE_SERVICE_ROLE_KEY = previous.b
})
