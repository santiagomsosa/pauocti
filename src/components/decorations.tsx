import Image from 'next/image'
import { cn } from '@/lib/utils'

function Leaf({
  transform,
  fill,
  opacity = 1,
}: {
  transform: string
  fill: string
  opacity?: number
}) {
  return (
    <path
      d="M0 0C9 1 16 8 16 17C16 26 9 33 0 34C-9 33 -16 26 -16 17C-16 8 -9 1 0 0Z"
      fill={fill}
      opacity={opacity}
      transform={transform}
    />
  )
}

const CORNERS = {
  // Recortes en acuarela del encabezado de la invitación (fondo transparente).
  hojas: { src: '/app/esquina-hojas.png', width: 440, height: 360 },
  flores: { src: '/app/esquina-flores.png', width: 370, height: 320 },
} as const

/** Esquina en acuarela tomada del encabezado de la invitación. Se apoya en la esquina superior
 * izquierda; rotala (rotate-180, -scale-x-100…) para usarla en las otras esquinas. */
export function WatercolorCorner({
  variant = 'hojas',
  className,
}: {
  variant?: keyof typeof CORNERS
  className?: string
}) {
  const { src, width, height } = CORNERS[variant]
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      sizes="(min-width: 768px) 360px, 240px"
      className={cn('pointer-events-none select-none', className)}
    />
  )
}

export function GoldDots({ className }: { className?: string }) {
  const dots = [
    { x: 12, y: 14, r: 3.5, o: 0.9 },
    { x: 34, y: 6, r: 2, o: 0.75 },
    { x: 50, y: 26, r: 4.5, o: 0.8 },
    { x: 8, y: 40, r: 2.5, o: 0.7 },
    { x: 70, y: 12, r: 2, o: 0.65 },
    { x: 60, y: 44, r: 3, o: 0.7 },
    { x: 86, y: 32, r: 2.2, o: 0.6 },
  ]
  return (
    <svg
      viewBox="0 0 96 56"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--color-sand-400)" opacity={d.o} />
      ))}
    </svg>
  )
}

export function BotanicalDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 12C30 12 45 12 60 12" stroke="var(--color-sage-400)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M198 12C170 12 155 12 140 12" stroke="var(--color-sage-400)" strokeWidth="1.5" strokeLinecap="round" />
      <Leaf transform="translate(52,9) rotate(-40) scale(0.5)" fill="var(--color-sage-400)" opacity={0.85} />
      <Leaf transform="translate(60,14) rotate(40) scale(0.4)" fill="var(--color-sage-300)" opacity={0.8} />
      <Leaf transform="translate(148,9) rotate(40) scale(0.5)" fill="var(--color-sage-400)" opacity={0.85} />
      <Leaf transform="translate(140,14) rotate(-40) scale(0.4)" fill="var(--color-sage-300)" opacity={0.8} />
      <path
        d="M100 18C95 12 87 10 87 5C87 1.5 91 0 94 3C96 5 100 9 100 9C100 9 104 5 106 3C109 0 113 1.5 113 5C113 10 105 12 100 18Z"
        fill="var(--color-rose-400)"
      />
    </svg>
  )
}

export function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="24" width="44" height="12" rx="2" />
        <rect x="14" y="36" width="36" height="20" rx="2" />
        <path d="M32 24 L32 56" />
        <path d="M32 24C28 24 24 21 24 17C24 14 27 13 29 15C31 17 32 24 32 24Z" />
        <path d="M32 24C36 24 40 21 40 17C40 14 37 13 35 15C33 17 32 24 32 24Z" />
      </g>
    </svg>
  )
}
