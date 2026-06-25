'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'motion/react'
import { toast } from 'sonner'
import { MapPin, CalendarPlus, Copy } from 'lucide-react'
import {
  WatercolorBranch,
  GoldDots,
  HandDrawnUnderline,
  ChurchIcon,
  PartyIcon,
} from '@/components/decorations'
import { Countdown } from '@/components/invitation/Countdown'
import { RsvpForm } from '@/components/invitation/RsvpForm'
import { FrozenInvitation } from '@/components/invitation/FrozenInvitation'
import { downloadCalendarEvent } from '@/lib/calendar'
import type { Guest, Settings } from '@/types'

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

function PlaceSection({
  icon,
  title,
  name,
  address,
  mapUrl,
}: {
  icon: React.ReactNode
  title: string
  name: string | null
  address: string | null
  mapUrl: string | null
}) {
  if (!name && !address && !mapUrl) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-2.5"
    >
      <div className="mx-auto w-14 h-14 text-terracotta-400">{icon}</div>
      <p className="text-xs uppercase tracking-[0.25em] text-sage-500">{title}</p>
      {name && <p className="font-script text-3xl text-stone-800">{name}</p>}
      {address && <p className="text-sm text-stone-500">{address}</p>}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-300 px-5 py-2 text-sm text-terracotta-600 transition hover:bg-terracotta-100/50"
        >
          <MapPin className="w-4 h-4" />
          Cómo llegar
        </a>
      )}
    </motion.section>
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
      <span className="text-xs uppercase tracking-wide text-stone-400">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
        {value}
        <Copy className="w-3.5 h-3.5 text-terracotta-400" />
      </span>
    </button>
  )
}

export function InvitationView({ guest: initialGuest, settings }: { guest: Guest; settings: Settings }) {
  const [guest, setGuest] = useState(initialGuest)
  const coupleNames = settings.couple_names ?? 'Pau & Octi'
  const dateLabel = settings.wedding_datetime ? formatShortDate(settings.wedding_datetime) : null

  const { scrollYProgress } = useScroll()
  const yBranchTop = useTransform(scrollYProgress, [0, 1], [0, -160])
  const yDotsTop = useTransform(scrollYProgress, [0, 1], [0, 120])
  const yBranchMid = useTransform(scrollYProgress, [0, 1], [0, 240])
  const yDotsMid = useTransform(scrollYProgress, [0, 1], [0, -200])
  const yBranchBottom = useTransform(scrollYProgress, [0, 1], [0, -120])

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-terracotta-50 via-cream-50 to-sage-50">
      <motion.div style={{ y: yBranchTop }} className="absolute -top-8 -left-12 pointer-events-none">
        <WatercolorBranch className="w-56 h-56 opacity-90" />
      </motion.div>
      <motion.div style={{ y: yDotsTop }} className="absolute top-16 right-6 pointer-events-none">
        <GoldDots className="w-24 h-14" />
      </motion.div>
      <motion.div style={{ y: yBranchMid }} className="absolute top-1/2 -right-16 pointer-events-none">
        <WatercolorBranch className="w-64 h-64 rotate-90 opacity-70" />
      </motion.div>
      <motion.div style={{ y: yDotsMid }} className="absolute top-2/3 left-4 pointer-events-none">
        <GoldDots className="w-24 h-14 rotate-180" />
      </motion.div>
      <motion.div style={{ y: yBranchBottom }} className="absolute -bottom-10 -left-10 pointer-events-none">
        <WatercolorBranch className="w-56 h-56 -rotate-45 opacity-60" />
      </motion.div>

      <div className="relative max-w-md mx-auto px-6 py-14 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-3"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-sage-500">Nos casamos</p>
          <h1 className="font-script text-6xl text-stone-800">{coupleNames}</h1>
          <HandDrawnUnderline className="w-28 h-5 mx-auto text-terracotta-300" />
          {dateLabel && <p className="text-lg tracking-[0.2em] text-stone-500">{dateLabel}</p>}
          <p className="text-lg text-stone-600">
            Invitación para <span className="font-medium text-stone-800">{guest.name}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-5"
        >
          <Countdown weddingDatetime={settings.wedding_datetime} />
          {settings.wedding_datetime && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleAgendar}
                className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-300 px-5 py-2 text-sm text-terracotta-600 transition hover:bg-terracotta-100/50"
              >
                <CalendarPlus className="w-4 h-4" />
                Agendar
              </button>
            </div>
          )}
        </motion.div>

        <PlaceSection
          icon={<ChurchIcon className="w-full h-full" />}
          title="Ceremonia"
          name={settings.ceremony_venue}
          address={settings.ceremony_address}
          mapUrl={settings.ceremony_map_url}
        />

        <PlaceSection
          icon={<PartyIcon className="w-full h-full" />}
          title="Fiesta"
          name={settings.venue}
          address={settings.venue_address}
          mapUrl={settings.venue_map_url}
        />

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
            <p className="text-xs uppercase tracking-[0.25em] text-sage-500">Si querés hacernos un regalo</p>
            <p className="font-script text-3xl text-stone-800">Datos para transferencia</p>
            <div className="grid gap-6 sm:grid-cols-2 text-left">
              {arsFields.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-terracotta-500">Pesos</p>
                  {arsFields.map((f) => (
                    <CopyField key={f.label} label={f.label} value={f.value} />
                  ))}
                </div>
              )}
              {usdFields.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-terracotta-500">Dólares</p>
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
          <p className="text-xs uppercase tracking-[0.25em] text-sage-500">Acceso a la app</p>
          <p className="text-sm text-stone-500">
            Entrá con este código para ver la galería, subir fotos y más
          </p>
          <div className="inline-block rounded-xl border-2 border-dashed border-terracotta-300 px-7 py-3">
            <p className="font-mono text-2xl tracking-[0.3em] text-terracotta-600">{guest.code}</p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-terracotta-400 px-8 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-500"
            >
              Entrar a la app
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
