'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Seguimiento } from '@/components/admin/Seguimiento'
import type { Guest } from '@/types'

export default function SeguimientoPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/guests')
      .then((r) => r.json())
      .then((data) => setGuests(data.guests ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-stone-800">Seguimiento de invitaciones</h1>
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Seguimiento guests={guests} loading={loading} />
      </div>
    </div>
  )
}
