export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  )
}
