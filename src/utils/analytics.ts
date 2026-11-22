import type { GitHubRepo } from '../types/github'
import { LANGUAGE_COLORS } from './format'

const FALLBACK_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#60a5fa', '#f97316', '#a3e635']

export interface LanguageStat {
  name: string
  count: number
  percent: number
  color: string
}

export interface MonthBucket {
  label: string
  count: number
}

export interface Analytics {
  forkCount: number
  archivedCount: number
  medianStars: number
  activeLastYear: number
  licensedPercent: number
  /** Repositories counted for language statistics, and how many of them have no detected language. */
  languageRepoCount: number
  noLanguageCount: number
  topics: LanguageStat[]
  licenses: LanguageStat[]
  createdByYear: MonthBucket[]
  totalStars: number
  totalForks: number
  openIssues: number
  originalCount: number
  avgStars: number
  languages: LanguageStat[]
  topLanguage: string | null
  topStarred: GitHubRepo[]
  activity: MonthBucket[]
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Turns [name, value] pairs into language stats; percentages are each value's share of the total. */
export function buildLanguageStats(entries: [string, number][]): LanguageStat[] {
  const total = entries.reduce((s, [, n]) => s + n, 0)
  return [...entries]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count], i) => ({
      name,
      count,
      percent: total ? (count / total) * 100 : 0,
      color: LANGUAGE_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
}

/** A breakdown where each row is a share of `of` repositories (rows can overlap, e.g. topics). */
function shareStats(counts: Map<string, number>, of: number, color: string, limit: number): LanguageStat[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, percent: of ? (count / of) * 100 : 0, color }))
}

export interface AnalyticsOptions {
  /** Include forks in the language statistics (default: false, original repositories only). */
  includeForks?: boolean
}

export function computeAnalytics(repos: GitHubRepo[], options: AnalyticsOptions = {}): Analytics {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)
  const openIssues = repos.reduce((s, r) => s + r.open_issues_count, 0)

  // Language statistics count each repository once, by its primary language (forks only if requested).
  const originals = repos.filter((r) => !r.fork)
  const languageBase = options.includeForks ? repos : originals
  const counts = new Map<string, number>()
  for (const r of languageBase) {
    if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1)
  }
  const languages = buildLanguageStats([...counts.entries()])
  const noLanguageCount = languageBase.filter((r) => !r.language).length

  // Topic and license breakdowns use original repositories only (forks inherit both from upstream).
  const topicCounts = new Map<string, number>()
  const licenseCounts = new Map<string, number>()
  for (const r of originals) {
    for (const t of r.topics ?? []) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)
    const license = r.license?.name ?? 'No license'
    licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1)
  }
  const licensedCount = originals.filter((r) => r.license).length

  const yearAgo = Date.now() - 365 * 86_400_000
  const activeLastYear = repos.filter((r) => (Date.parse(r.pushed_at ?? r.updated_at) || 0) >= yearAgo).length

  // Repositories created per calendar year, from the oldest repository to the current year.
  const years = repos.map((r) => new Date(r.created_at).getFullYear()).filter((y) => Number.isFinite(y))
  const createdByYear: MonthBucket[] = []
  if (years.length > 0) {
    const first = Math.min(...years)
    for (let y = first; y <= new Date().getFullYear(); y++) {
      createdByYear.push({ label: String(y), count: years.filter((v) => v === y).length })
    }
  }

  const topStarred = [...repos]
    .filter((r) => r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8)

  // Repositories grouped by the month of their most recent push (last 12 months).
  const now = new Date()
  const buckets = new Map<string, MonthBucket>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
      label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      count: 0,
    })
  }
  for (const r of repos) {
    const d = new Date(r.pushed_at ?? r.updated_at)
    const bucket = buckets.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.count++
  }

  return {
    forkCount: repos.length - originals.length,
    archivedCount: repos.filter((r) => r.archived).length,
    medianStars: median(originals.map((r) => r.stargazers_count)),
    activeLastYear,
    licensedPercent: originals.length ? (licensedCount / originals.length) * 100 : 0,
    languageRepoCount: languageBase.length,
    noLanguageCount,
    topics: shareStats(topicCounts, originals.length, '#8b5cf6', 10),
    licenses: shareStats(licenseCounts, originals.length, '#06b6d4', 8),
    createdByYear,
    totalStars,
    totalForks,
    openIssues,
    originalCount: originals.length,
    avgStars: originals.length ? totalStars / originals.length : 0,
    languages,
    topLanguage: languages[0]?.name ?? null,
    topStarred,
    activity: [...buckets.values()],
  }
}
