'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Trophy, Camera, ChevronDown, ChevronUp, Search, X, CheckCircle2 } from 'lucide-react'
import { PhotoUploadModal } from '@/components/PhotoUploadModal'
import { ChallengesProgress } from '@/components/ChallengesProgress'
import { Badge } from '@/components/ui/badge'
import { HandDrawnUnderline } from '@/components/decorations'
import type { Challenge, Photo } from '@/types'

function ChallengeCard({
  challenge,
  onUpload,
}: {
  challenge: Challenge
  onUpload: (c: Challenge) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  async function loadPhotos() {
    if (photos.length > 0) return
    setLoadingPhotos(true)
    const res = await fetch(`/api/photos?challengeId=${challenge.id}`)
    if (res.ok) {
      const data = await res.json()
      setPhotos(data.photos)
    }
    setLoadingPhotos(false)
  }

  async function handleExpand() {
    if (!expanded) await loadPhotos()
    setExpanded((v) => !v)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{challenge.emoji}</span>
            <div>
              <h3 className="font-semibold text-stone-800">{challenge.title}</h3>
              <p className="text-sm text-stone-500 mt-0.5">{challenge.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {challenge.completed_by_me && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3" />
                ¡Listo!
              </span>
            )}
            {(challenge.photo_count ?? 0) > 0 && (
              <Badge className="bg-ink-100 text-ink-600 border-0">
                {challenge.photo_count} foto{(challenge.photo_count ?? 0) !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onUpload(challenge)}
            className="flex items-center gap-1.5 bg-ink-500 hover:bg-ink-600 text-white text-sm px-3 py-1.5 rounded-full transition-colors font-medium"
          >
            <Camera className="w-3.5 h-3.5" />
            Cumplir desafío
          </button>

          {(challenge.photo_count ?? 0) > 0 && (
            <button
              onClick={handleExpand}
              className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm px-2"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Ver fotos
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cream-200 p-3">
          {loadingPhotos ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-square bg-stone-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                  <Image src={p.url} alt={p.guest_name} fill className="object-cover" sizes="120px" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <p className="text-white text-[9px] truncate">{p.guest_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RetosPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploadChallenge, setUploadChallenge] = useState<Challenge | null>(null)
  const [query, setQuery] = useState('')

  function loadChallenges() {
    return fetch('/api/challenges')
      .then((r) => r.json())
      .then((d) => {
        setChallenges(d.challenges ?? [])
        setCompletedCount(d.completedCount ?? 0)
      })
  }

  useEffect(() => {
    loadChallenges()
      .catch(() => toast.error('Error al cargar los desafíos'))
      .finally(() => setLoading(false))
  }, [])

  function handleUploaded() {
    loadChallenges()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return challenges
    return challenges.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.emoji.includes(q),
    )
  }, [challenges, query])

  return (
    <div className="py-6 space-y-4">
      <div>
        <h1 className="font-script text-3xl text-stone-800">Desafíos</h1>
        <HandDrawnUnderline className="w-14 h-3 text-sage-400 -mt-1" />
        <p className="text-sm text-stone-500 mt-1">Completá los desafíos fotográficos</p>
      </div>

      {!loading && (
        <ChallengesProgress completed={completedCount} total={challenges.length} />
      )}

      {!loading && challenges.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar desafío..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-ink-300 focus:ring-2 focus:ring-ink-100"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse space-y-2 h-24" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center py-16 space-y-3 text-center">
          <Trophy className="w-12 h-12 text-stone-300" />
          <p className="text-stone-500">Todavía no hay desafíos cargados</p>
          <p className="text-xs text-stone-400">Los organizadores los agregarán pronto</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 space-y-2 text-center">
          <Search className="w-8 h-8 text-stone-300" />
          <p className="text-stone-500 text-sm">Sin resultados para "{query}"</p>
          <button onClick={() => setQuery('')} className="text-ink-500 text-sm font-medium">
            Ver todos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {query && (
            <p className="text-xs text-stone-400">
              {filtered.length} de {challenges.length} desafíos
            </p>
          )}
          {filtered.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onUpload={setUploadChallenge} />
          ))}
        </div>
      )}

      {uploadChallenge && (
        <PhotoUploadModal
          open={!!uploadChallenge}
          onClose={() => setUploadChallenge(null)}
          onUploaded={() => {
            handleUploaded()
            setUploadChallenge(null)
          }}
          challenge={uploadChallenge}
        />
      )}
    </div>
  )
}
