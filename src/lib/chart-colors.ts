// Paleta específica para los charts de seguimiento (admin). El resto del sitio
// usa una paleta muy desaturada (ink/rose/sage) pensada para texto e ilustración;
// para distinguir series en un gráfico hace falta más croma, así que estos charts
// usan tonos independientes, verificados con el validador de paleta (CVD-safe).
export const CHART_COLORS = {
  attending: '#10b981', // emerald-500 — confirmado / asiste
  pending: '#f59e0b', // amber-500 — pendiente
  declined: '#f43f5e', // rose-500 (tailwind default) — no asiste
  opens: '#2563eb', // blue-600 — aperturas del link
  confirmations: '#10b981', // mismo verde que "attending", mismo significado
} as const
