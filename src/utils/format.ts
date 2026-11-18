const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en')
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const formatCompact = (n: number) => compact.format(n)
export const formatNumber = (n: number) => full.format(n)

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Unknown'
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#8a8a8a',
  'C#': '#178600',
  Go: '#00add8',
  Rust: '#dea584',
  Ruby: '#cc342d',
  PHP: '#4f5d95',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  HTML: '#e34c26',
  CSS: '#7e57c2',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#5c6bc0',
  'Jupyter Notebook': '#da5b0b',
}

export const languageColor = (language: string | null): string =>
  (language && LANGUAGE_COLORS[language]) || '#6b6b7b'
