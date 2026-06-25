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

export function WatercolorBranch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 220"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 8C40 30 55 55 70 90C85 125 100 150 130 175"
        stroke="var(--color-sage-500)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <Leaf transform="translate(18,22) rotate(35) scale(1.3)" fill="var(--color-sage-300)" opacity={0.85} />
      <Leaf transform="translate(34,40) rotate(-20) scale(1.5)" fill="var(--color-sage-400)" opacity={0.85} />
      <Leaf transform="translate(28,52) rotate(110) scale(1.1)" fill="var(--color-sage-200)" opacity={0.8} />
      <Leaf transform="translate(55,72) rotate(40) scale(1.6)" fill="var(--color-sage-400)" opacity={0.8} />
      <Leaf transform="translate(50,88) rotate(-60) scale(1.2)" fill="var(--color-sage-300)" opacity={0.75} />
      <Leaf transform="translate(78,108) rotate(25) scale(1.4)" fill="var(--color-sage-400)" opacity={0.75} />
      <Leaf transform="translate(72,124) rotate(-100) scale(1.1)" fill="var(--color-sage-200)" opacity={0.7} />
      <Leaf transform="translate(98,142) rotate(50) scale(1.3)" fill="var(--color-sage-300)" opacity={0.65} />
      <Leaf transform="translate(115,160) rotate(-30) scale(1.2)" fill="var(--color-sage-400)" opacity={0.6} />
      <Leaf transform="translate(128,172) rotate(95) scale(1)" fill="var(--color-sage-200)" opacity={0.55} />
    </svg>
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
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--color-terracotta-500)" opacity={d.o} />
      ))}
    </svg>
  )
}

export function HandDrawnUnderline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 4C20 11 45 13 80 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Leaf transform="translate(86,8) rotate(60) scale(0.45)" fill="currentColor" opacity={0.9} />
    </svg>
  )
}

export function ChurchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 4 L32 16" />
        <path d="M27 9 L37 9" />
        <path d="M22 30 L32 17 L42 30" />
        <path d="M22 30 L22 56" />
        <path d="M42 30 L42 56" />
        <path d="M28 56 L28 45 Q32 41 36 45 L36 56" />
        <path d="M14 56 L50 56" />
        <path d="M14 56 L14 40 L22 34" />
        <path d="M50 56 L50 40 L42 34" />
      </g>
    </svg>
  )
}

export function PartyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 14 L24 30 L27 16 Z" />
        <path d="M24 30 L26 45" />
        <path d="M20 46 L31 43" />
        <path d="M48 14 L40 30 L37 16 Z" />
        <path d="M40 30 L38 45" />
        <path d="M44 46 L33 43" />
        <path d="M32 6 L32 10" />
        <path d="M27 8 L29 11" />
        <path d="M37 8 L35 11" />
      </g>
    </svg>
  )
}

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <Leaf transform="translate(16,16) rotate(20) scale(0.8)" fill="var(--color-sage-300)" opacity={0.85} />
      <Leaf transform="translate(28,28) rotate(-30) scale(0.7)" fill="var(--color-sage-400)" opacity={0.85} />
    </svg>
  )
}
