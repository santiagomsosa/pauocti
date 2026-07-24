'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Upload, X, Loader2, ImageIcon, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Challenge, Photo } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onUploaded: (photo: Photo) => void
  challenge?: Challenge | null
}

export function PhotoUploadModal({ open, onClose, onUploaded, challenge }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    challenge?.id ?? null
  )
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 10MB')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleClose() {
    setPreview(null)
    setFile(null)
    setSelectedChallengeId(challenge?.id ?? null)
    onClose()
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedChallengeId) {
        formData.append('challengeId', selectedChallengeId)
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al subir la foto')
        return
      }

      toast.success('¡Foto subida!')
      onUploaded(data.photo)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm mx-auto max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {challenge ? `Reto: ${challenge.emoji} ${challenge.title}` : 'Subir foto'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {/* Área de selección de imagen */}
          <div
            onClick={() => inputRef.current?.click()}
            className="relative border-2 border-dashed border-ink-200 rounded-xl overflow-hidden cursor-pointer hover:border-ink-300 transition-colors bg-cream-50 h-48 flex items-center justify-center"
          >
            {preview ? (
              <>
                <Image src={preview} alt="Preview" fill className="object-contain" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreview(null)
                    setFile(null)
                  }}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-stone-600 hover:text-ink-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center space-y-2 p-6">
                <ImageIcon className="w-10 h-10 text-ink-300 mx-auto" />
                <p className="text-sm text-stone-500">Tocá para elegir una foto</p>
                <p className="text-xs text-stone-400">JPG, PNG, HEIC · Máx. 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Link a desafíos */}
          {!challenge && (
            <Link
              href="/retos"
              onClick={handleClose}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <span>¿Es para un desafío? Ir a desafíos</span>
              <Trophy className="w-4 h-4 text-ink-400 flex-shrink-0" />
            </Link>
          )}
        </div>

        <div className="flex-shrink-0 pt-2">
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-ink-500 hover:bg-ink-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir foto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
