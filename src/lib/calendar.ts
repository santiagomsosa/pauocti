function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

interface CalendarEvent {
  title: string
  start: string
  durationHours?: number
  location?: string | null
  description?: string | null
}

/** Genera y descarga un archivo .ics que el celular abre en su calendario nativo. */
export function downloadCalendarEvent({
  title,
  start,
  durationHours = 6,
  location,
  description,
}: CalendarEvent): void {
  const startDate = new Date(start)
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//pauocti//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@pauocti`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(title)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'invitacion.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
