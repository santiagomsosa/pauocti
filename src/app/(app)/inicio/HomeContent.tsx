'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, ChevronRight, Images, Music, CheckCircle2 } from 'lucide-react'
import { PhotoUploadModal } from '@/components/PhotoUploadModal'
import { HandDrawnUnderline } from '@/components/decorations'
import type { Challenge, Message } from '@/types'

function HomeChallengeCard({
  challenge,
  onUpload,
}: {
  challenge: Challenge
  onUpload: (c: Challenge) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-4 flex flex-col gap-3 w-44 flex-shrink-0">
      <span className="text-4xl">{challenge.emoji}</span>
      <div className="flex-1">
        <h3 className="font-semibold text-stone-800 text-sm leading-snug">{challenge.title}</h3>
        {(challenge.photo_count ?? 0) > 0 && (
          <p className="text-xs text-stone-400 mt-1">
            {challenge.photo_count} foto{challenge.photo_count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <button
        onClick={() => onUpload(challenge)}
        className="flex items-center justify-center gap-1.5 bg-ink-500 hover:bg-ink-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors font-medium"
      >
        <Camera className="w-3 h-3" />
        Cumplir
      </button>
    </div>
  )
}

interface Props {
  guestName: string
  challenges: Challenge[]
  completedCount: number
  messages: Message[]
  photoCount: number
}

export function HomeContent({ guestName, challenges, completedCount, messages, photoCount }: Props) {
  const [uploadChallenge, setUploadChallenge] = useState<Challenge | null>(null)

  const firstName = guestName.split(' ')[0]
  const featuredChallenges = challenges.slice(0, 3)

  return (
    <div className="py-6 space-y-8">
      {/* Saludo */}
      <div>
        <p className="text-stone-500 text-sm">Bienvenido/a,</p>
        <h1 className="font-script text-4xl text-stone-800 leading-tight">{firstName}</h1>
        <HandDrawnUnderline className="w-14 h-3 text-sage-400 -mt-1" />
      </div>

      {/* Desafíos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-700">
            Tenemos unos desafíos para vos esta noche 😏
          </h2>
          {completedCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedCount}/{challenges.length}
            </span>
          )}
        </div>

        {featuredChallenges.length === 0 ? (
          <p className="text-sm text-stone-400">Próximamente...</p>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
              {featuredChallenges.map((c) => (
                <div key={c.id} className="snap-start">
                  <HomeChallengeCard challenge={c} onUpload={setUploadChallenge} />
                </div>
              ))}
            </div>
            <Link href="/retos" className="flex items-center gap-1 text-ink-500 text-sm font-medium">
              Ver todos los desafíos <ChevronRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </section>

      {/* Muro */}
      <section className="space-y-3">
        <h2 className="font-semibold text-stone-700">Del muro ❤️</h2>

        {messages.length === 0 ? (
          <div className="bg-white rounded-xl p-4 border border-cream-200 text-center">
            <p className="text-stone-400 text-sm">¡Sé el primero en dejar un mensaje!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-xl p-3 border border-cream-200 flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-ink-500">
                  {msg.guest_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stone-600">{msg.guest_name}</p>
                  <p className="text-sm text-stone-700 line-clamp-2">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/muro" className="flex items-center gap-1 text-ink-500 text-sm font-medium">
          Ver muro completo <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Accesos rápidos */}
      <section className="space-y-3">
        <h2 className="font-semibold text-stone-700">Explorá la app</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/galeria"
            className="bg-white rounded-2xl p-4 border border-cream-200 shadow-sm flex flex-col gap-2 active:bg-cream-50 transition-colors"
          >
            <Images className="w-6 h-6 text-ink-400" />
            <div>
              <p className="font-semibold text-stone-800 text-sm">Galería</p>
              <p className="text-xs text-stone-400">
                {photoCount} foto{photoCount !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>
          <Link
            href="/musica"
            className="bg-white rounded-2xl p-4 border border-cream-200 shadow-sm flex flex-col gap-2 active:bg-cream-50 transition-colors"
          >
            <Music className="w-6 h-6 text-ink-400" />
            <div>
              <p className="font-semibold text-stone-800 text-sm">Música</p>
              <p className="text-xs text-stone-400">Pedí una canción</p>
            </div>
          </Link>
        </div>
      </section>

      {uploadChallenge && (
        <PhotoUploadModal
          open={!!uploadChallenge}
          onClose={() => setUploadChallenge(null)}
          onUploaded={() => setUploadChallenge(null)}
          challenge={uploadChallenge}
        />
      )}
    </div>
  )
}
