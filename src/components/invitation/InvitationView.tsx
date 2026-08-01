'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { toast } from 'sonner'
import { MapPin, CalendarPlus, Copy, ArrowRight } from 'lucide-react'
import { GoldDots, BotanicalDivider, GiftIcon } from '@/components/decorations'
import { Countdown } from '@/components/invitation/Countdown'
import { RsvpForm } from '@/components/invitation/RsvpForm'
import { FrozenInvitation } from '@/components/invitation/FrozenInvitation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadCalendarEvent } from '@/lib/calendar'
import { familyDisplayName, isPluralGuest } from '@/lib/guest'
import type { Guest, Settings } from '@/types'

// La fiesta arranca en `venue_datetime` y dura esto; usado para el fin del evento del calendario.
const PARTY_DURATION_HOURS = 8

function FloatingIcon({
  src,
  className,
  y,
}: {
  src: string
  className: string
  y: MotionValue<number>
}) {
  return (
    <motion.div style={{ y }} className={`absolute pointer-events-none opacity-70 ${className}`}>
      <Image src={src} alt="" width={80} height={80} className="w-full h-full object-contain" />
    </motion.div>
  )
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/de (\w)/, (_, c) => `de ${c.toUpperCase()}`)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())} hs`
}


function CoupleNames({ names }: { names: string }) {
  const parts = names.split(/\s*&\s*/)
  if (parts.length === 2) {
    return (
      <h1 className="absolute inset-0 pointer-events-none">
        <span
          className="absolute whitespace-nowrap font-script text-ink-600 leading-none"
          style={{ left: '34%', top: '10%', fontSize: 'clamp(2rem, 6.15vw, 10rem)' }}
        >
          {parts[0]}
        </span>
        <span
          className="absolute whitespace-nowrap font-script text-rose-400 leading-none"
          style={{ left: '37.5%', top: '25%', fontSize: 'clamp(1.85rem, 5.3vw, 8rem)' }}
        >
          &amp;
        </span>
        <span
          className="absolute whitespace-nowrap font-script text-ink-600 leading-none"
          style={{ left: '40%', top: '26%', fontSize: 'clamp(2.3rem, 7.3vw, 12rem)' }}
        >
          {parts[1]}
        </span>
      </h1>
    )
  }
  return (
    <h1 className="absolute inset-x-0 top-[14%] text-center px-4 max-w-md mx-auto font-script text-5xl text-ink-600 leading-tight">
      {names}
    </h1>
  )
}

function PlaceCard({
  image,
  title,
  name,
  address,
  time,
  mapUrl,
}: {
  image: string
  title: string
  name: string | null
  address: string | null
  time: string | null
  mapUrl: string | null
}) {
  if (!name && !address && !mapUrl) return null
  return (
    <div className="flex-1 min-w-0 text-center space-y-2">
      <div className="mx-auto w-20 h-20 rounded-full overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={160}
          height={160}
          className="w-full h-full object-cover scale-[1.35]"
        />
      </div>
      <p className="font-title font-semibold text-xs uppercase tracking-wide text-ink-600">{title}</p>
      {time && <p className="text-xs font-medium text-rose-400">Inicio {time}</p>}
      {name && <p className="text-sm text-stone-700 leading-snug">{name}</p>}
      {address && <p className="text-xs text-stone-500 leading-snug">{address}</p>}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="font-title inline-flex items-center gap-1 rounded-full border border-ink-300 px-3 py-1.5 text-xs uppercase tracking-wide text-ink-600 transition hover:bg-ink-100/50"
        >
          <MapPin className="w-3.5 h-3.5" />
          Cómo llegar
        </a>
      )}
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  function copy() {
    navigator.clipboard?.writeText(value)
    toast.success(`${label} copiado`)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 border-b border-stone-200/70 py-2 text-left"
    >
      <span className="font-title text-xs uppercase tracking-wide text-stone-400">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
        {value}
        <Copy className="w-3.5 h-3.5 text-ink-400" />
      </span>
    </button>
  )
}

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 border-b border-stone-200/70 py-2">
      <span className="font-title text-xs uppercase tracking-wide text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-700">{value}</span>
    </div>
  )
}

export function InvitationView({
  guest: initialGuest,
  settings,
  tableName,
}: {
  guest: Guest
  settings: Settings
  tableName?: string | null
}) {
  const [guest, setGuest] = useState(initialGuest)
  const [transferOpen, setTransferOpen] = useState(false)
  const coupleNames = settings.couple_names ?? 'Pau & Octi'
  const dateLabel = settings.wedding_datetime ? formatShortDate(settings.wedding_datetime) : null

  const { scrollYProgress } = useScroll()
  const yDotsMid = useTransform(scrollYProgress, [0, 1], [0, -200])
  const yIconA = useTransform(scrollYProgress, [0, 1], [0, -140])
  const yIconB = useTransform(scrollYProgress, [0, 1], [0, 160])
  const yIconC = useTransform(scrollYProgress, [0, 1], [0, -100])

  const hasTransfer = !!(settings.bank_ars_account || settings.bank_ars_cbu || settings.bank_usd_account || settings.bank_usd_cbu)
  const isPlural = isPluralGuest(guest)

  function handleAgendar() {
    const eventStart = settings.wedding_datetime ?? settings.venue_datetime
    if (!eventStart) return
    const partyStart = new Date(settings.venue_datetime ?? settings.wedding_datetime ?? eventStart)
    const partyEnd = new Date(partyStart.getTime() + PARTY_DURATION_HOURS * 60 * 60 * 1000)
    const durationHours = Math.max(1, (partyEnd.getTime() - new Date(eventStart).getTime()) / (60 * 60 * 1000))

    downloadCalendarEvent({
      title: `Boda ${coupleNames}`,
      start: eventStart,
      durationHours,
      location: settings.ceremony_address || settings.venue_address || settings.venue,
      description: typeof window !== 'undefined' ? window.location.href : null,
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 via-cream-50 to-sage-50 font-invite">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative w-full aspect-[1870/841] max-h-[420px] overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 w-full aspect-[1870/841]">
          <Image
            src="/invitacion/encabezado.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
          <CoupleNames names={coupleNames} />
        </div>
      </motion.div>

      <div className="relative max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        <motion.div style={{ y: yDotsMid }} className="absolute top-[50%] right-6 pointer-events-none">
          <GoldDots className="w-24 h-14 rotate-180" />
        </motion.div>

        <FloatingIcon src="/invitacion/iconos/notas.png" y={yIconA} className="top-[46%] left-2 w-14 h-14" />
        <FloatingIcon src="/invitacion/iconos/copa-vino.png" y={yIconB} className="top-[55%] right-3 w-12 h-12" />
        <FloatingIcon src="/invitacion/iconos/camara.png" y={yIconC} className="top-[64%] left-4 w-16 h-16" />
        <FloatingIcon src="/invitacion/iconos/copa-coctel.png" y={yIconA} className="top-[74%] right-2 w-12 h-12" />
        <FloatingIcon src="/invitacion/iconos/sparklers.png" y={yIconB} className="top-[85%] left-3 w-16 h-16" />
        <FloatingIcon src="/invitacion/iconos/disco.png" y={yIconC} className="top-[95%] right-4 w-14 h-14" />

        <div className="px-6 py-10 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-md mx-auto text-center space-y-3"
          >
            {dateLabel && <p className="text-lg tracking-[0.2em] text-rose-400">{dateLabel}</p>}
            <p className="text-lg text-stone-600">
              Hola, <span className="font-medium text-stone-800">{familyDisplayName(guest)}</span>
            </p>
            <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
              ¡Cada vez falta menos! Nos alegra muchísimo compartir este día con {isPlural ? 'ustedes' : 'vos'}.
              {dateLabel && ` Acá ${isPlural ? 'van' : 'vas'} a encontrar toda la información para acompañarnos el ${dateLabel.toLowerCase()}.`}
            </p>
          </motion.div>

          <BotanicalDivider className="w-40 h-5 mx-auto" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            <Countdown weddingDatetime={settings.wedding_datetime} />
            {settings.wedding_datetime && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleAgendar}
                  className="font-title inline-flex items-center gap-1.5 rounded-full border border-ink-300 px-5 py-2 text-sm uppercase tracking-wide text-ink-600 transition hover:bg-ink-100/50"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Agendar
                </button>
              </div>
            )}
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="flex items-start justify-center gap-2"
          >
            <PlaceCard
              image="/invitacion/iglesia.png"
              title="Ceremonia"
              name={settings.ceremony_venue}
              address={settings.ceremony_address}
              time={settings.wedding_datetime ? formatTime(settings.wedding_datetime) : null}
              mapUrl={settings.ceremony_map_url}
            />
            {(settings.ceremony_venue || settings.venue) && (
              <div className="pt-8 text-sand-400 flex-shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
            <PlaceCard
              image="/invitacion/fiesta.png"
              title="Fiesta"
              name={settings.venue}
              address={settings.venue_address}
              time={settings.venue_datetime ? formatTime(settings.venue_datetime) : null}
              mapUrl={settings.venue_map_url}
            />
          </motion.section>

          {tableName && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="inline-block border border-sand-300 rounded-2xl px-10 py-6 bg-white/60 backdrop-blur-sm shadow-sm space-y-2">
                <p className="font-title text-[10px] uppercase tracking-[0.2em] text-stone-400">Tu lugar en la fiesta</p>
                <p className="font-script text-5xl text-ink-600 leading-tight">{tableName}</p>
                <BotanicalDivider className="w-28 h-4 mx-auto opacity-60" />
              </div>
            </motion.section>
          )}

          {guest.rsvp_submitted_at ? (
            <FrozenInvitation guest={guest} />
          ) : (
            <RsvpForm guest={guest} onSubmitted={setGuest} />
          )}

          {hasTransfer && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="space-y-4 text-center"
            >
              <p className="font-title text-2xl uppercase tracking-wide text-ink-600">Regalos</p>
              <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
                {isPlural
                  ? <>¡Gracias por acompañarnos en este día tan especial! Para nosotros, compartirlo con ustedes es el mejor regalo. No es necesario que nos hagan un obsequio, pero si desean hacerlo, lo vamos a agradecer muchísimo y lo recibiremos con mucho cariño. Acá abajo van a encontrar algunas opciones.</>
                  : <>¡Gracias por acompañarnos en este día tan especial! Para nosotros, compartirlo con vos es el mejor regalo. No es necesario que nos hagas un obsequio, pero si querés hacerlo, lo vamos a agradecer muchísimo y lo recibiremos con mucho cariño. Acá abajo vas a encontrar algunas opciones.</>}
              </p>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setTransferOpen(true)}
                  className="font-title inline-flex items-center gap-1.5 rounded-full border border-ink-300 px-5 py-2 text-sm uppercase tracking-wide text-ink-600 transition hover:bg-ink-100/50"
                >
                  Ver CBU
                </button>
              </div>
              <Dialog open={transferOpen} onOpenChange={(open) => setTransferOpen(open)}>
                <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-title text-xl uppercase tracking-wide text-ink-600">
                      Datos para transferencia
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 sm:grid-cols-2 text-left">
                    {(settings.bank_ars_account || settings.bank_ars_cbu) && (
                      <div className="space-y-1">
                        <p className="font-title flex items-center gap-1.5 text-sm uppercase tracking-wide text-rose-500">
                          <GiftIcon className="w-4 h-4" />
                          Pesos
                        </p>
                        {settings.bank_ars_account && <StaticField label="Cuenta" value={settings.bank_ars_account} />}
                        {settings.bank_ars_cbu && <CopyField label="CBU" value={settings.bank_ars_cbu} />}
                      </div>
                    )}
                    {(settings.bank_usd_account || settings.bank_usd_cbu) && (
                      <div className="space-y-1">
                        <p className="font-title flex items-center gap-1.5 text-sm uppercase tracking-wide text-rose-500">
                          <GiftIcon className="w-4 h-4" />
                          Dólares
                        </p>
                        {settings.bank_usd_account && <StaticField label="Cuenta" value={settings.bank_usd_account} />}
                        {settings.bank_usd_cbu && <CopyField label="CBU" value={settings.bank_usd_cbu} />}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <p className="font-title text-xs uppercase tracking-[0.25em] text-ink-500">Dress code</p>
            <p className="font-title text-2xl uppercase tracking-wide text-ink-600">Formal</p>
          </motion.section>

        </div>
      </div>
    </div>
  )
}
