import type { GitHubRepo } from '../types/github'
import { LANGUAGE_COLORS } from './format'

const FALLBACK_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#60a5fa', '#f97316', '#a3e635']

/** Name used for every language outside the top few. */
export const OTHER_LANGUAGES = 'Other'

export interface TrendSeries {
  name: string
  /** Colour of the language; null for "Other", which takes the chart's neutral colour. */
  color: string | null
  /** Repositories created in each year (same order as `years`). */
  counts: number[]
}

export interface LanguageTrends {
  /** Calendar years from the oldest repository with a language up to the current year. */
  years: string[]
  /** The most used languages first, then "Other" when there are more languages than `top`. */
  series: TrendSeries[]
  /** Repositories with a language in each year (the base for the percentages). */
  totals: number[]
  /** Repositories left out because GitHub detects no language for them. */
  noLanguageCount: number
  /** Repositories counted across all years. */
  repoCount: number
}

export interface TrendOptions {
  /** Include forks (default: false, original repositories only). */
  includeForks?: boolean
  /** How many languages get their own colour before the rest become "Other" (default 5). */
  top?: number
  /** The year the range ends at (default: the current year); lets tests stay stable. */
  endYear?: number
}

/**
 * Groups repositories by the calendar year they were created and by their primary language.
 * Each repository counts once, in the year it was created, so this shows which languages a
 * developer started projects in, not how much code was written in each year.
 */
export function computeLanguageTrends(repos: GitHubRepo[], options: TrendOptions = {}): LanguageTrends {
  const top = Math.max(1, options.top ?? 5)
  const base = options.includeForks ? repos : repos.filter((r) => !r.fork)
  const noLanguageCount = base.filter((r) => !r.language).length

  const dated = base
    .filter((r) => r.language)
    .map((r) => ({ language: r.language as string, year: new Date(r.created_at).getFullYear() }))
    .filter((r) => Number.isFinite(r.year))

  if (dated.length === 0) return { years: [], series: [], totals: [], noLanguageCount, repoCount: 0 }

  const first = Math.min(...dated.map((r) => r.year))
  const last = Math.max(options.endYear ?? new Date().getFullYear(), ...dated.map((r) => r.year))
  const years: number[] = []
  for (let y = first; y <= last; y++) years.push(y)

  const overall = new Map<string, number>()
  for (const r of dated) overall.set(r.language, (overall.get(r.language) ?? 0) + 1)
  const ranked = [...overall.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name)
  const named = ranked.slice(0, top)

  const perYear = (pick: (language: string) => boolean) =>
    years.map((y) => dated.filter((r) => r.year === y && pick(r.language)).length)

  const series: TrendSeries[] = named.map((name, i) => ({
    name,
    color: LANGUAGE_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    counts: perYear((l) => l === name),
  }))
  if (ranked.length > top) {
    series.push({ name: OTHER_LANGUAGES, color: null, counts: perYear((l) => !named.includes(l)) })
  }

  return {
    years: years.map(String),
    series,
    totals: perYear(() => true),
    noLanguageCount,
    repoCount: dated.length,
  }
}

/** A language's share of one year's repositories, 0 to 100 (0 when the year has none). */
export function yearShare(trends: LanguageTrends, seriesIndex: number, yearIndex: number): number {
  const total = trends.totals[yearIndex] ?? 0
  const count = trends.series[seriesIndex]?.counts[yearIndex] ?? 0
  return total ? (count / total) * 100 : 0
}
