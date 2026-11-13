import type { Guest, Settings } from '@/types'

// Los horarios y los días que faltan se calculan siempre en hora argentina.
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const DAY_MS = 24 * 60 * 60 * 1000

const LORA = "font-family:'Lora', Georgia, 'Times New Roman', serif;"
const CINZEL = "font-family:'Cinzel', 'Times New Roman', Times, serif;"
const MONTSERRAT = "font-family:'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;"

export interface ReminderEmailInput {
  guest: Guest
  settings: Settings
  /** URL pública de la app (links y botón de acceso). */
  appUrl: string
  /** URL pública de la carpeta con las imágenes del correo. */
  assetsUrl: string
  now?: Date
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function argentinaDay(date: Date): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIME_ZONE })
    .format(date)
    .split('-')
    .map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Días calendario (hora argentina) entre hoy y la fecha dada; negativo si ya pasó. */
function daysUntil(iso: string, now: Date): number {
  return Math.round((argentinaDay(new Date(iso)) - argentinaDay(now)) / DAY_MS)
}

/** "14 de Noviembre de 2026" */
function formatLongDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ARGENTINA_TIME_ZONE })
    .replace(/de (\w)/, (_, c: string) => `de ${c.toUpperCase()}`)
}

/** "16:30 hs" */
function formatTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ARGENTINA_TIME_ZONE,
  }).formatToParts(new Date(iso))
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute} hs`
}

function spacer(height: number): string {
  return `<tr><td style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</td></tr>`
}

function divider(assetsUrl: string): string {
  return `<tr><td align="center"><img src="${assetsUrl}/divider.png" width="160" height="19" alt="" style="display:block;margin:0 auto;border:0;"></td></tr>`
}

function countdownBlock(days: number): string {
  if (days < 0) return ''
  const heading = days === 1 ? 'Falta' : 'Faltan'
  const big = days === 0 ? '¡Hoy!' : String(days)
  const unit = days === 0 ? '' : days === 1 ? 'día' : 'días'
  const dot = `<td valign="middle" style="padding:0 14px 14px;"><div style="width:7px;height:7px;border-radius:50%;background:#d8b5af;font-size:0;line-height:0;">&nbsp;</div></td>`
  return `
    ${spacer(28)}
    <tr><td class="px" style="padding:0 48px;">
      ${days === 0 ? '' : `<p style="margin:0 0 10px;${CINZEL}font-size:12px;text-transform:uppercase;letter-spacing:0.3em;color:#7f8c73;text-align:center;">${heading}</p>`}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        ${dot}
        <td align="center">
          <div style="${LORA}font-size:64px;line-height:1;font-weight:500;color:#5f7696;">${big}</div>
          ${unit ? `<div style="margin-top:6px;${CINZEL}font-size:12px;text-transform:uppercase;letter-spacing:0.25em;color:#a8a29e;">${unit}</div>` : ''}
        </td>
        ${dot}
      </tr></table>
    </td></tr>
    ${spacer(40)}`
}

function placeCard(opts: {
  image: string
  title: string
  startsAt: string | null
  name: string
  address: string | null
  mapUrl: string | null
  width: string
}): string {
  const { image, title, startsAt, name, address, mapUrl, width } = opts
  return `
    <td width="${width}" valign="top" align="center" style="padding:0 8px;">
      <img src="${image}" width="80" height="80" alt="" style="display:block;margin:0 auto 10px;border:0;">
      <p style="margin:0 0 4px;${CINZEL}font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#465d7a;">${title}</p>
      ${startsAt ? `<p style="margin:0 0 6px;${LORA}font-size:12px;font-weight:500;color:#c99f97;">Inicio ${esc(formatTime(startsAt))}</p>` : ''}
      <p style="margin:0 0 4px;${LORA}font-size:14px;line-height:1.35;color:#44403c;">${esc(name)}</p>
      ${address ? `<p style="margin:0 0 12px;${LORA}font-size:12px;line-height:1.4;color:#78716c;">${esc(address)}</p>` : ''}
      ${mapUrl ? `<a href="${esc(mapUrl)}" target="_blank" style="display:inline-block;padding:6px 14px;border:1px solid #93a7c0;border-radius:999px;${CINZEL}font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#465d7a;text-decoration:none;">Cómo llegar</a>` : ''}
    </td>`
}

function placesBlock(settings: Settings, assetsUrl: string): string {
  const cards: Parameters<typeof placeCard>[0][] = []
  if (settings.ceremony_venue) {
    cards.push({
      image: `${assetsUrl}/iglesia.png`,
      title: 'Ceremonia',
      startsAt: settings.wedding_datetime,
      name: settings.ceremony_venue,
      address: settings.ceremony_address,
      mapUrl: settings.ceremony_map_url,
      width: '50%',
    })
  }
  if (settings.venue) {
    cards.push({
      image: `${assetsUrl}/fiesta.png`,
      title: 'Fiesta',
      startsAt: settings.venue_datetime,
      name: settings.venue,
      address: settings.venue_address,
      mapUrl: settings.venue_map_url,
      width: '50%',
    })
  }
  if (cards.length === 0) return ''
  const width = cards.length === 1 ? '100%' : '50%'
  return `
    <tr><td class="px" style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="places"><tr>
        ${cards.map((card) => placeCard({ ...card, width })).join('')}
      </tr></table>
    </td></tr>
    ${spacer(32)}
    ${divider(assetsUrl)}
    ${spacer(32)}`
}

function appFeature(icon: string, title: string, text: string, assetsUrl: string): string {
  return `
    <tr>
      <td width="72" valign="top" style="padding:12px 0;"><img src="${assetsUrl}/${icon}" width="56" height="56" alt="" style="display:block;border:0;"></td>
      <td valign="top" style="padding:14px 0 12px 8px;">
        <p style="margin:0 0 4px;${CINZEL}font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#465d7a;">${title}</p>
        <p style="margin:0;${LORA}font-size:14px;line-height:1.55;color:#57534e;">${text}</p>
      </td>
    </tr>`
}

function enterButton(href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
    <td bgcolor="#5f7696" style="border-radius:999px;">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 36px;${MONTSERRAT}font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.02em;">¡Entrar a la fiesta!</a>
    </td></tr></table>`
}

function codeCard(code: string, appUrl: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #c9b28b;border-radius:18px;">
      <tr><td align="center" style="padding:26px 24px 28px;">
        <p style="margin:0;${CINZEL}font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#a8a29e;">Tu código de acceso</p>
        <p style="margin:12px 0 4px;${MONTSERRAT}font-size:40px;line-height:1;font-weight:600;letter-spacing:0.32em;padding-left:0.32em;color:#465d7a;">${esc(code)}</p>
        <p style="margin:0 0 22px;${LORA}font-size:13px;color:#78716c;">Guardalo: lo vas a necesitar para entrar a la app.</p>
        ${enterButton(`${appUrl}/?code=${encodeURIComponent(code)}`)}
      </td></tr>
    </table>`
}

export function buildReminderEmail({ guest, settings, appUrl, assetsUrl, now = new Date() }: ReminderEmailInput) {
  const coupleNames = settings.couple_names ?? 'Nuestra boda'
  const days = settings.wedding_datetime ? daysUntil(settings.wedding_datetime, now) : null
  const subjectTail =
    days === null || days < 0 ? '¡Ya falta poco!' : days === 0 ? '¡Es hoy!' : days === 1 ? '¡Falta 1 día!' : `¡Faltan ${days} días!`
  const subject = `${coupleNames} · ${subjectTail}`

  const preheader = `Tu código de acceso a la app: ${guest.code}`
  const siteHost = (() => {
    try {
      return new URL(appUrl).host
    } catch {
      return appUrl
    }
  })()
  const invitationLink = guest.invite_token ? `${appUrl}/invitacion/${guest.invite_token}` : appUrl
  const dateLabel = settings.wedding_datetime ? formatLongDate(settings.wedding_datetime) : null

  const html = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${esc(subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Lora:wght@400;500;600&family=Montserrat:wght@500;600&display=swap" rel="stylesheet">
  <style>
    @media (max-width: 620px) {
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .date { font-size: 21px !important; letter-spacing: 0.06em !important; }
      .places td { display: block !important; width: 100% !important; padding: 0 0 28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f3ed;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f3ed" style="background:#f8f3ed;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8efec"
        style="width:100%;max-width:600px;border-radius:20px;overflow:hidden;background:#f8efec;background-image:linear-gradient(180deg, #f8efec 0%, #f8f3ed 45%, #f0f2ec 100%);box-shadow:0 2px 12px rgba(68,64,60,0.08);">

        <tr><td style="padding:0;"><img src="${assetsUrl}/header.jpg" width="600" alt="${esc(coupleNames)}" style="display:block;width:100%;height:auto;border:0;"></td></tr>

        <tr><td class="px" align="center" style="padding:32px 48px 0;">
          ${dateLabel ? `<p class="date" style="margin:0 0 16px;${LORA}font-size:26px;line-height:1.3;letter-spacing:0.12em;color:#c99f97;">${esc(dateLabel)}</p>` : ''}
          <p style="margin:0 0 10px;${LORA}font-size:18px;color:#57534e;">Hola, <span style="font-weight:500;color:#292524;">${esc(guest.name)}</span></p>
          <p style="margin:0 auto;max-width:400px;${LORA}font-size:15px;line-height:1.65;color:#78716c;">
            ¡Falta cada vez menos! Nos hace muy felices que nos acompañes en este día tan especial para nosotros. Esto es todo lo que necesitás saber.
          </p>
        </td></tr>
        ${spacer(28)}
        ${divider(assetsUrl)}
        ${days === null ? spacer(28) : countdownBlock(days)}
        ${placesBlock(settings, assetsUrl)}

        <tr><td class="px" style="padding:0 48px;">
          <p style="margin:0 0 6px;${CINZEL}font-size:22px;text-transform:uppercase;letter-spacing:0.06em;color:#465d7a;text-align:center;">La app de la boda</p>
          <p style="margin:0 auto 14px;max-width:420px;${LORA}font-size:14px;line-height:1.6;color:#78716c;text-align:center;">
            Armamos una app para vivir la fiesta desde el celular. Entrá con tu código y sumate al juego:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${appFeature('icon-disco.png', 'Trivia', `¿Cuánto conocés a los novios? Respondé preguntas sobre nuestra historia y competí con el resto de los invitados.`, assetsUrl)}
            ${appFeature('icon-camara.png', 'Retos', `Desafíos para cumplir durante la noche: sacá la foto, subila a la app y tachalo de la lista.`, assetsUrl)}
            ${appFeature('icon-sparklers.png', 'Premios', `El que quede primero en la trivia se lleva el premio. ¡Andá entrando en calor!`, assetsUrl)}
          </table>
          <p style="margin:10px 0 0;${LORA}font-size:13px;line-height:1.6;color:#a8a29e;text-align:center;">
            Además vas a poder subir fotos a la galería, dejarnos mensajes en el muro y pedir canciones.
          </p>
        </td></tr>
        ${spacer(28)}

        <tr><td class="px" style="padding:0 48px;">
          ${codeCard(guest.code, appUrl)}
          <p style="margin:14px 0 0;${LORA}font-size:12px;line-height:1.5;color:#a8a29e;text-align:center;">
            ¿No te funciona el botón? Entrá a <a href="${esc(appUrl)}" style="color:#5f7696;">${esc(siteHost)}</a> e ingresá el código.
          </p>
        </td></tr>
        ${spacer(36)}

        <tr><td align="center" style="padding:0 32px 36px;">
          <p style="margin:0 0 6px;${LORA}font-size:14px;color:#78716c;">¡Nos vemos en la fiesta!</p>
          <p style="margin:0;${LORA}font-size:12px;color:#a8a29e;">Con cariño, ${esc(coupleNames)} · <a href="${esc(invitationLink)}" style="color:#5f7696;">Ver mi invitación</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
