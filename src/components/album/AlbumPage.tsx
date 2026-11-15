import Image from 'next/image'
import { Polaroid } from '@/components/Polaroid'
import { BotanicalDivider } from '@/components/decorations'
import { cn } from '@/lib/utils'
import { ALBUM_CLOSING_SRC, formatTime } from '@/lib/album'
import type { AlbumPage as Page, AlbumPhoto, AlbumSection, RankingRow } from '@/lib/album'

const MEDALS = ['🥇', '🥈', '🥉']

export interface PageContext {
  coupleNames: string
  date: string
  stats: { photos: number; photographers: number; challengesDone: number }
  sections: AlbumSection[]
  totalChallenges: number
  onJump: (page: number) => void
  onPhoto: (page: Extract<Page, { kind: 'photos' }>, photo: AlbumPhoto) => void
  onGuest: (guestId: string) => void
}

/** Las medidas van en unidades de la hoja (cqw/cqh): el contenido se achica o agranda con el libro. */
function Shell({ number, children, className }: { number: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full flex-col px-[6cqw] pb-[3cqh] pt-[5cqh]', className)}>
      <div className="min-h-0 flex-1">{children}</div>
      <p className="pt-[1cqh] text-center font-title text-[2.6cqw] text-stone-400">{number}</p>
    </div>
  )
}

function PhotosPage({ page, number, ctx }: { page: Extract<Page, { kind: 'photos' }>; number: number; ctx: PageContext }) {
  return (
    <Shell number={number}>
      <div className="flex h-full flex-col">
        <header className="h-[11cqh] text-center">
          {page.dayLabel && <p className="font-title text-[2.6cqw] uppercase tracking-[0.2em] text-stone-400">{page.dayLabel}</p>}
          {page.list === 'noche' ? (
            <h2 className="truncate font-script text-[8cqw] leading-tight text-stone-800">
              {page.heading}
            </h2>
          ) : (
            // Los títulos de los retos son frases largas: van en letra a mano, en hasta dos líneas.
            <h2 className="line-clamp-2 pt-[1cqh] font-pen text-[3.8cqw] leading-snug text-stone-800">
              {page.heading}
            </h2>
          )}
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-x-[4cqw] gap-y-[2cqh] pt-[2cqh]">
          {page.photos.map((photo, i) => (
            <div key={photo.id} className="flex flex-col items-center">
              <div className="w-[min(100%,calc(39cqh-5.5rem))]">
                <Polaroid
                  url={photo.url}
                  caption={photo.caption}
                  challenge={page.list === 'noche' ? photo.challenge : null}
                  index={number * 4 + i}
                  onClick={() => ctx.onPhoto(page, photo)}
                  ariaLabel={`Ver foto de ${photo.guestName}`}
                  sizes="(max-width: 900px) 45vw, 240px"
                />
                <p className="mt-1 truncate text-center text-[10px] text-stone-500">
                  {photo.guestName} · {formatTime(photo.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function RankingName({ row, onGuest, className }: { row: RankingRow; onGuest: (id: string) => void; className?: string }) {
  return (
    <button onClick={() => onGuest(row.guestId)} className={cn('truncate underline-offset-2 hover:underline', className)}
      title={row.name}>
      {row.name}
    </button>
  )
}

export function AlbumPageView({ page, index, ctx }: { page: Page; index: number; ctx: PageContext }) {
  const number = index + 1

  switch (page.kind) {
    case 'title':
      return (
        <div className="flex h-full flex-col items-center justify-center px-[8cqw] text-center">
          <p className="font-title text-[2.8cqw] uppercase tracking-[0.3em] text-stone-400">Álbum de la fiesta</p>
          <h1 className="mt-[3cqh] font-script text-[14cqw] leading-none text-stone-800">{ctx.coupleNames}</h1>
          {ctx.date && <p className="mt-[3cqh] font-title text-[3cqw] tracking-[0.2em] text-stone-500">{ctx.date.toUpperCase()}</p>}
          <BotanicalDivider className="mt-[4cqh] w-[45cqw] text-ink-300" />
          <div className="mt-[5cqh] grid w-full grid-cols-3 gap-[3cqw]">
            {(
              [
                [ctx.stats.photos, 'fotos'],
                [ctx.stats.photographers, 'fotógrafos'],
                [ctx.stats.challengesDone, 'retos cumplidos'],
              ] as const
            ).map(([n, label]) => (
              <div key={label}>
                <p className="font-title text-[7cqw] tabular-nums text-stone-800">{n}</p>
                <p className="text-[2.8cqw] text-stone-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-[6cqh] font-pen text-[3.6cqw] text-stone-600">Sacadas por todos ustedes, esa noche.</p>
        </div>
      )

    case 'index':
      return (
        <Shell number={number}>
          <h2 className="text-center font-script text-[11cqw] text-stone-800">Índice</h2>
          <ul className="mt-[5cqh] space-y-[2.5cqh]">
            {ctx.sections
              .filter((s) => s.id !== 'inicio')
              .map((s) => (
                <li key={s.id}>
                  <button onClick={() => ctx.onJump(s.page)} className="flex w-full items-baseline gap-[2cqw] text-left text-[4.2cqw] text-stone-700 hover:text-ink-600">
                    <span>{s.emoji}</span>
                    <span>{s.title}</span>
                    <span className="mb-[0.8cqw] flex-1 border-b border-dotted border-stone-300" />
                    <span className="font-title tabular-nums">{s.page + 1}</span>
                  </button>
                </li>
              ))}
          </ul>
          <p className="mt-[6cqh] text-center text-[3cqw] text-stone-400">
            Tocá una sección para ir directo, o usá el menú ☰ para saltar a cada hora y a cada reto.
          </p>
        </Shell>
      )

    case 'divider':
      return (
        <div className="flex h-full flex-col items-center justify-center px-[8cqw] text-center">
          <span className="text-[16cqw]">{page.emoji}</span>
          <h2 className="mt-[2cqh] font-script text-[13cqw] leading-none text-stone-800">{page.title}</h2>
          <BotanicalDivider className="mt-[4cqh] w-[40cqw] text-ink-300" />
          <p className="mt-[3cqh] text-[3.6cqw] text-stone-500">{page.subtitle}</p>
        </div>
      )

    case 'photos':
      return <PhotosPage page={page} number={number} ctx={ctx} />

    case 'podium': {
      const order = [page.rows[1], page.rows[0], page.rows[2]].filter(Boolean)
      const heights: Record<number, string> = { 1: 'h-[26cqh]', 2: 'h-[18cqh]', 3: 'h-[13cqh]' }
      return (
        <Shell number={number}>
          <h2 className="text-center font-script text-[11cqw] leading-tight text-stone-800">Ranking de retos</h2>
          <p className="mt-[2cqh] text-center text-[3cqw] text-stone-500">
            {page.total} {page.total === 1 ? 'invitado cumplió' : 'invitados cumplieron'} retos
          </p>
          <div className="mt-[6cqh] flex items-end justify-center gap-[2cqw]">
            {order.map((row) => (
              <div key={row.guestId} className="flex w-1/3 flex-col items-center text-center">
                <span className="text-[9cqw]">{MEDALS[row.rank - 1]}</span>
                <RankingName row={row} onGuest={ctx.onGuest} className="line-clamp-2 w-full whitespace-normal px-[1cqw] text-[3.4cqw] font-semibold leading-tight text-stone-800" />
                <span className="text-[3cqw] text-stone-500">
                  {row.completed} de {ctx.totalChallenges}
                </span>
                <div className={cn('mt-[1cqh] w-full rounded-t-[2cqw] bg-ink-200', heights[row.rank])} />
              </div>
            ))}
          </div>
          <p className="mt-[5cqh] text-center text-[3cqw] text-stone-400">
            Cuenta retos distintos. Si empatan, gana quien terminó primero.
            <br />
            Tocá un nombre para ver sus fotos.
          </p>
        </Shell>
      )
    }

    case 'ranking':
      return (
        <Shell number={number}>
          <ul className="space-y-[1.3cqh]">
            {page.rows.map((row) => (
              <li key={row.guestId} className="flex items-center gap-[3cqw] border-b border-dotted border-stone-200 pb-[1.3cqh] text-[3.8cqw]">
                <span className="w-[8cqw] text-center">
                  {MEDALS[row.rank - 1] ?? <span className="font-title text-stone-400">{row.rank}°</span>}
                </span>
                <RankingName row={row} onGuest={ctx.onGuest} className="min-w-0 flex-1 text-left text-stone-800" />
                <span className="font-title tabular-nums text-stone-700">
                  {row.completed}
                  <span className="text-[2.8cqw] text-stone-400"> de {ctx.totalChallenges}</span>
                </span>
              </li>
            ))}
          </ul>
        </Shell>
      )

    case 'closing':
      return (
        <div className="flex h-full flex-col items-center justify-center px-[8cqw] text-center">
          <div className="w-[55cqw] rotate-[-2deg] bg-white p-[2cqw] pb-[7cqw] shadow-[0_2px_10px_rgba(60,45,30,0.2)]">
            <div className="relative aspect-[3/4] w-full">
              <Image src={ALBUM_CLOSING_SRC} alt={`${ctx.coupleNames} abrazados`} fill className="object-cover" sizes="300px" />
            </div>
          </div>
          <p className="mt-[5cqh] font-script text-[10cqw] leading-tight text-stone-800">¡Gracias por ser parte!</p>
          <p className="mt-[1cqh] font-title text-[3cqw] tracking-[0.2em] text-stone-500">{ctx.coupleNames.toUpperCase()}</p>
        </div>
      )
  }
}
