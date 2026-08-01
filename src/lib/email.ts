import { Resend } from 'resend'
import { familyDisplayName, isPluralGuest } from '@/lib/guest'
import type { Guest, Settings } from '@/types'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function invitationUrl(inviteToken: string): string {
  return `${getAppUrl()}/invitacion/${inviteToken}`
}

function wrapEmail(coupleNames: string, body: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #44403c;">
      <h1 style="font-size: 22px; font-weight: 500; text-align: center; color: #292524; margin-bottom: 24px;">${coupleNames}</h1>
      ${body}
      <p style="font-size: 12px; color: #a8a29e; text-align: center; margin-top: 32px;">Con cariño, ${coupleNames}</p>
    </div>
  `
}

export async function sendInvitationEmail(guest: Guest, settings: Settings) {
  const resend = getResend()
  if (!resend || !guest.email || !guest.invite_token) return

  const coupleNames = settings.couple_names ?? 'Nuestra boda'
  const url = invitationUrl(guest.invite_token)
  const plural = isPluralGuest(guest)

  await resend.emails.send({
    from: FROM,
    to: guest.email,
    subject: `${coupleNames} · ¡Estás invitado/a!`,
    html: wrapEmail(
      coupleNames,
      `
        <p style="font-size: 15px; line-height: 1.6;">Hola ${familyDisplayName(guest)},</p>
        <p style="font-size: 15px; line-height: 1.6;">Queremos compartir con ${plural ? 'ustedes' : 'vos'} uno de los días más importantes de nuestras vidas. Ingresá a ${plural ? 'la' : 'tu'} invitación online para ver todos los detalles y confirmar ${plural ? 'su' : 'tu'} asistencia.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="background: #5f7696; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Ver mi invitación</a>
        </div>
      `
    ),
  })
}

export async function sendRsvpConfirmationEmail(guest: Guest, settings: Settings) {
  const resend = getResend()
  if (!resend || !guest.email || !guest.invite_token) return

  const coupleNames = settings.couple_names ?? 'Nuestra boda'
  const url = invitationUrl(guest.invite_token)
  const attending = guest.rsvp_status === 'attending'
  const plural = isPluralGuest(guest)

  await resend.emails.send({
    from: FROM,
    to: guest.email,
    subject: `${coupleNames} · Confirmamos ${plural ? 'su' : 'tu'} respuesta`,
    html: wrapEmail(
      coupleNames,
      `
        <p style="font-size: 15px; line-height: 1.6;">Hola ${familyDisplayName(guest)},</p>
        <p style="font-size: 15px; line-height: 1.6;">
          ${attending
            ? `¡Genial! Confirmamos ${plural ? 'su' : 'tu'} asistencia a nuestra boda.`
            : `Registramos que no ${plural ? 'podrán' : 'podrás'} acompañarnos. ¡Gracias por avisarnos!`}
        </p>
        ${guest.dietary_restrictions ? `<p style="font-size: 14px; color: #78716c;">Restricción alimentaria registrada: ${guest.dietary_restrictions}</p>` : ''}
        <p style="font-size: 14px; line-height: 1.6;">${plural ? 'Pueden' : 'Podés'} volver a consultar ${plural ? 'su' : 'tu'} invitación cuando ${plural ? 'quieran' : 'quieras'} desde este link:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="background: #5f7696; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Ver mi invitación</a>
        </div>
      `
    ),
  })
}

export async function sendReminderEmail(guest: Guest, settings: Settings) {
  const resend = getResend()
  if (!resend || !guest.email || !guest.invite_token) return

  const coupleNames = settings.couple_names ?? 'Nuestra boda'
  const url = invitationUrl(guest.invite_token)
  const dateLabel = settings.wedding_datetime
    ? new Date(settings.wedding_datetime).toLocaleString('es-AR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null

  await resend.emails.send({
    from: FROM,
    to: guest.email,
    subject: `${coupleNames} · ¡Ya falta poco!`,
    html: wrapEmail(
      coupleNames,
      `
        <p style="font-size: 15px; line-height: 1.6;">Hola ${familyDisplayName(guest)},</p>
        <p style="font-size: 15px; line-height: 1.6;">Te recordamos los detalles de nuestra boda:</p>
        ${dateLabel ? `<p style="font-size: 14px;"><strong>Cuándo:</strong> ${dateLabel}</p>` : ''}
        ${settings.venue ? `<p style="font-size: 14px;"><strong>Dónde:</strong> ${settings.venue}</p>` : ''}
        ${settings.venue_address ? `<p style="font-size: 14px; color: #78716c;">${settings.venue_address}</p>` : ''}
        ${settings.venue_map_url ? `<div style="text-align: center; margin: 16px 0;"><a href="${settings.venue_map_url}" style="color: #5f7696; font-size: 14px;">Ver ubicación en el mapa</a></div>` : ''}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="background: #5f7696; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Ver mi invitación</a>
        </div>
      `
    ),
  })
}
