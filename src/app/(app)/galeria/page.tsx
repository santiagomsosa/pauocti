'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Camera } from 'lucide-react'
import { PhotoUploadModal } from '@/components/PhotoUploadModal'
import { Badge } from '@/components/ui/badge'
import { HandDrawnUnderline } from '@/components/decorations'
import type { Photo, Challenge } from '@/types'

export default function GaleriaPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const loadPhotos = useCallback(async () => {
    const res = await fetch('/api/photos')
    if (res.ok) {
      const data = await res.json()
      setPhotos(data.photos)
    } else {
      toast.error('Error al cargar las fotos')
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([
        loadPhotos(),
        fetch('/api/challenges')
          .then((r) => r.json())
          .then((d) => setChallenges(d.challenges ?? [])),
      ])
      setLoading(false)
    }
    init()
  }, [loadPhotos])

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-script text-3xl text-stone-800">Galería</h1>
          <HandDrawnUnderline className="w-14 h-3 text-sage-400 -mt-1" />
          <p className="text-sm text-stone-500 mt-1">{photos.length} fotos compartidas</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 bg-terracotta-400 hover:bg-terracotta-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Subir
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Camera className="w-12 h-12 text-stone-300" />
          <p className="text-stone-500">¡Sé el primero en subir una foto!</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="text-terracotta-400 font-medium text-sm"
          >
            Subir ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 group">
              <Image
                src={photo.url}
                alt={`Foto de ${photo.guest_name}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                  <p className="text-white text-xs font-medium truncate">{photo.guest_name}</p>
                  {photo.challenge && (
                    <Badge className="bg-terracotta-400/90 text-white text-[10px] px-1.5 py-0 h-auto">
                      {photo.challenge.emoji} {photo.challenge.title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PhotoUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(photo) => setPhotos((prev) => [photo, ...prev])}
        challenges={challenges}
      />
    </div>
  )
}
