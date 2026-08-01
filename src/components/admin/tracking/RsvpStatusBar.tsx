interface Segment {
  key: string
  label: string
  value: number
  color: string
}

export function RsvpStatusBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  return (
    <div>
      {total === 0 ? (
        <p className="text-sm text-stone-400">Todavía no hay invitados cargados.</p>
      ) : (
        <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px] bg-white">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.key}
                tabIndex={0}
                className="group relative h-full outline-none"
                style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  <span className="font-semibold">{s.value}</span> {s.label} ({Math.round((s.value / total) * 100)}%)
                </div>
              </div>
            ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-stone-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-medium text-stone-700">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
