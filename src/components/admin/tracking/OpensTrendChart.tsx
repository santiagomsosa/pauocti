'use client'

import { useRef, useState } from 'react'
import { CHART_COLORS } from '@/lib/chart-colors'

export interface TrendPoint {
  date: string
  opens: number
  confirmations: number
}

const WIDTH = 640
const HEIGHT = 220
const PAD_LEFT = 28
const PAD_RIGHT = 8
const PAD_TOP = 16
const PAD_BOTTOM = 24
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function OpensTrendChart({ points }: { points: TrendPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length < 2) {
    return <p className="text-sm text-stone-400">Todavía no hay suficientes días de datos para mostrar la tendencia.</p>
  }

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.opens, p.confirmations)))
  const x = (i: number) => PAD_LEFT + (i / (points.length - 1)) * PLOT_W
  const y = (v: number) => PAD_TOP + PLOT_H - (v / maxValue) * PLOT_H

  const linePath = (key: 'opens' | 'confirmations') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ')

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const ratio = (relX - PAD_LEFT) / PLOT_W
    const idx = Math.round(ratio * (points.length - 1))
    setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)))
  }

  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxValue * f))
  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const last = points[points.length - 1]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ backgroundColor: CHART_COLORS.opens }} />
          Aperturas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ backgroundColor: CHART_COLORS.confirmations }} />
          Confirmaciones
        </span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={PAD_LEFT - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-stone-400" fontSize={10}>
                {t}
              </text>
            </g>
          ))}

          <path d={linePath('opens')} fill="none" stroke={CHART_COLORS.opens} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath('confirmations')} fill="none" stroke={CHART_COLORS.confirmations} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          <circle cx={x(points.length - 1)} cy={y(last.opens)} r={4} fill={CHART_COLORS.opens} stroke="#fff" strokeWidth={2} />
          <circle cx={x(points.length - 1)} cy={y(last.confirmations)} r={4} fill={CHART_COLORS.confirmations} stroke="#fff" strokeWidth={2} />

          <text x={PAD_LEFT} y={HEIGHT - 6} className="fill-stone-400" fontSize={10}>
            {formatDate(points[0].date)}
          </text>
          <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 6} textAnchor="end" className="fill-stone-400" fontSize={10}>
            {formatDate(last.date)}
          </text>

          {hoverIndex !== null && (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_H}
              stroke="#a8a29e"
              strokeWidth={1}
            />
          )}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-white shadow-md"
            style={{ left: `${(x(hoverIndex) / WIDTH) * 100}%` }}
          >
            <p className="mb-1 font-medium text-stone-300">{formatDate(hovered.date)}</p>
            <p>
              <span className="font-semibold">{hovered.opens}</span> aperturas
            </p>
            <p>
              <span className="font-semibold">{hovered.confirmations}</span> confirmaciones
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
