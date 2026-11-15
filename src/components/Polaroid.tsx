import Image from 'next/image'
import { cn } from '@/lib/utils'

// Inclinación de cada polaroid y de su cinta (en grados), para que parezcan pegadas a mano.
export const POLAROID_TILTS = [-2, 1.5, -1, 2, -1.5, 1, 1.5, -2, 0.5]
export const TAPE_TILTS = [3, -4, 2, -2, 5, -3, -1, 4]

/** Tamaño de letra según el largo del texto: los cortos se leen grandes y los largos se achican para entrar en el marco. */
function captionSizeClass(caption: string) {
  const length = caption.trim().length
  if (length <= 10) return 'text-[15px] leading-tight'
  if (length <= 24) return 'text-xs leading-tight'
  if (length <= 40) return 'text-[10px] leading-tight'
  return 'text-[9px] leading-tight'
}

/** Tira de cinta semitransparente que "pega" la polaroid, con los bordes cortados a mano. */
function Tape({ rotate }: { rotate: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2.5 left-1/2 z-10 h-5 w-[42%] -translate-x-1/2 bg-[#e2d6be]/80 shadow-[0_1px_2px_rgba(60,45,30,0.12)]"
      style={{
        rotate: `${rotate}deg`,
        clipPath:
          'polygon(0 8%, 4% 0, 9% 10%, 14% 2%, 100% 0, 96% 12%, 100% 26%, 95% 40%, 100% 55%, 96% 70%, 100% 86%, 97% 100%, 0 100%, 4% 88%, 0 72%, 5% 56%, 0 40%, 4% 24%)',
      }}
    />
  )
}

/** Polaroid de la galería y del álbum: foto cuadrada, cinta, texto a mano y (si hay) el emoji del reto. */
export function Polaroid({
  url,
  caption,
  challenge,
  index,
  onClick,
  ariaLabel,
}: {
  url: string
  caption: string | null
  challenge?: { title: string; emoji: string } | null
  index: number
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative bg-white p-1.5 rounded-[2px] shadow-[0_2px_8px_rgba(60,45,30,0.15)] transition-transform duration-200 hover:!rotate-0 hover:scale-[1.03] active:scale-95"
      style={{ rotate: `${POLAROID_TILTS[index % POLAROID_TILTS.length]}deg` }}
    >
      <Tape rotate={TAPE_TILTS[index % TAPE_TILTS.length]} />
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <Image
          src={url}
          alt={caption ?? 'Foto de la galería'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 33vw, 160px"
        />
        {challenge && (
          <span
            className="absolute bottom-1 right-1 rounded-full bg-white/85 px-1 text-[11px] leading-5 shadow-sm"
            title={challenge.title}
          >
            {challenge.emoji}
          </span>
        )}
      </div>
      <p
        className={cn(
          'flex items-center justify-center min-h-8 pt-1 px-0.5 font-pen text-stone-800 text-center',
          caption && captionSizeClass(caption)
        )}
      >
        <span className="line-clamp-3 break-words">{caption}</span>
      </p>
    </button>
  )
}
