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

export function computeAnalytics(repos: GitHubRepo[]): Analytics {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)
  const openIssues = repos.reduce((s, r) => s + r.open_issues_count, 0)

  // Language statistics count each original (non-fork) repository once, by its primary language.
  const originals = repos.filter((r) => !r.fork)
  const counts = new Map<string, number>()
  for (const r of originals) {
    if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1)
  }
  const withLanguage = [...counts.values()].reduce((s, n) => s + n, 0)
  const languages: LanguageStat[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count], i) => ({
      name,
      count,
      percent: withLanguage ? (count / withLanguage) * 100 : 0,
      color: LANGUAGE_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))

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
