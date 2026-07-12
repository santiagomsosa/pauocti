'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { toast } from 'sonner'
import { MapPin, CalendarPlus, Copy, ArrowRight } from 'lucide-react'
import { GoldDots, BotanicalDivider, GiftIcon } from '@/components/decorations'
import { Countdown } from '@/components/invitation/Countdown'
import { RsvpForm } from '@/components/invitation/RsvpForm'
import { FrozenInvitation } from '@/components/invitation/FrozenInvitation'
import { downloadCalendarEvent } from '@/lib/calendar'
import type { Guest, Settings } from '@/types'

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
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`
}

function buildFields(items: Array<[string, string | null]>) {
  return items
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value: value as string }))
}

function CoupleNames({ names }: { names: string }) {
  const parts = names.split(/\s*&\s*/)
  if (parts.length === 2) {
    return (
      <h1 className="font-script text-5xl text-ink-600 leading-tight">
        {parts[0]}
        <span className="text-rose-400"> &amp; </span>
        {parts[1]}
      </h1>
    )
  }
  return <h1 className="font-script text-5xl text-ink-600 leading-tight">{names}</h1>
}

function PlaceCard({
  image,
  title,
  name,
  address,
  mapUrl,
}: {
  image: string
  title: string
  name: string | null
  address: string | null
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

export function InvitationView({ guest: initialGuest, settings }: { guest: Guest; settings: Settings }) {
  const [guest, setGuest] = useState(initialGuest)
  const coupleNames = settings.couple_names ?? 'Pau & Octi'
  const dateLabel = settings.wedding_datetime ? formatShortDate(settings.wedding_datetime) : null

  const { scrollYProgress } = useScroll()
  const yDotsMid = useTransform(scrollYProgress, [0, 1], [0, -200])
  const yIconA = useTransform(scrollYProgress, [0, 1], [0, -140])
  const yIconB = useTransform(scrollYProgress, [0, 1], [0, 160])
  const yIconC = useTransform(scrollYProgress, [0, 1], [0, -100])

  const arsFields = buildFields([
    ['Cuenta', settings.bank_ars_account],
    ['Alias', settings.bank_ars_alias],
    ['CBU', settings.bank_ars_cbu],
  ])
  const usdFields = buildFields([
    ['Cuenta', settings.bank_usd_account],
    ['Alias', settings.bank_usd_alias],
    ['CBU', settings.bank_usd_cbu],
  ])
  const hasTransfer = arsFields.length > 0 || usdFields.length > 0

  function handleAgendar() {
    if (!settings.wedding_datetime) return
    downloadCalendarEvent({
      title: `Boda ${coupleNames}`,
      start: settings.wedding_datetime,
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
        className="relative w-full aspect-[1870/841] max-h-[420px]"
      >
        <Image
          src="/invitacion/encabezado.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-x-0 top-[4%] text-center px-4 max-w-md mx-auto">
          <CoupleNames names={coupleNames} />
          <p className="font-script text-xl text-ink-500 mt-4">¡Nos casamos!</p>
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
              Invitación para <span className="font-medium text-stone-800">{guest.name}</span>
            </p>
            <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
              ¡Cada vez falta menos! Nos alegra muchísimo que seas parte de este día.
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
              mapUrl={settings.venue_map_url}
            />
          </motion.section>

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
                Gracias por acompañarnos en este día tan especial, tu compañía es el mejor regalo para
                nosotros. Si querés hacernos un obsequio, te dejamos algunas opciones.
              </p>
              <div className="grid gap-6 sm:grid-cols-2 text-left">
                {arsFields.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-title flex items-center gap-1.5 text-sm uppercase tracking-wide text-rose-500">
                      <GiftIcon className="w-4 h-4" />
                      Pesos
                    </p>
                    {arsFields.map((f) => (
                      <CopyField key={f.label} label={f.label} value={f.value} />
                    ))}
                  </div>
                )}
                {usdFields.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-title flex items-center gap-1.5 text-sm uppercase tracking-wide text-rose-500">
                      <GiftIcon className="w-4 h-4" />
                      Dólares
                    </p>
                    {usdFields.map((f) => (
                      <CopyField key={f.label} label={f.label} value={f.value} />
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3"
          >
            <p className="font-title text-xs uppercase tracking-[0.25em] text-sage-500">Acceso a la app</p>
            <p className="text-sm text-stone-500">
              Entrá con este código para ver la galería, subir fotos y más
            </p>
            <div className="inline-block rounded-xl border-2 border-dashed border-ink-300 px-7 py-3">
              <p className="font-mono text-2xl tracking-[0.3em] text-ink-600">{guest.code}</p>
            </div>
            <div>
              <Link
                href="/"
                className="font-title inline-flex items-center justify-center rounded-full bg-ink-500 px-8 py-2.5 text-sm uppercase tracking-wide text-white transition hover:bg-ink-600"
              >
                Entrar a la app
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
