import { CheckCircle2 } from 'lucide-react'

interface Props {
  completed: number
  total: number
}

export function ChallengesProgress({ completed, total }: Props) {
  if (total === 0) return null
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-stone-600">
            Cumpliste <span className="font-semibold text-stone-800">{completed}</span> de{' '}
            <span className="font-semibold text-stone-800">{total}</span> desafíos
          </p>
        </div>
        <span className="text-xs text-stone-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
