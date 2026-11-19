import type { GitHubRepo } from '../types/github'

export type SortKey = 'pushed' | 'created' | 'stars' | 'forks' | 'issues' | 'name'
export type SortDir = 'asc' | 'desc'
export type UpdatedWindow = '' | '30d' | '6m' | '1y' | 'older'

/** Sentinel value for the "no license" option of the license filter. */
export const NO_LICENSE = '__none__'

export interface RepoFilters {
  query: string
  language: string
  topic: string
  license: string
  minStars: number
  updated: UpdatedWindow
  hideForks: boolean
  hideArchived: boolean
  sort: SortKey
  dir: SortDir
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'pushed', label: 'Recently pushed' },
  { value: 'created', label: 'Date created' },
  { value: 'stars', label: 'Stars' },
  { value: 'forks', label: 'Forks' },
  { value: 'issues', label: 'Open issues' },
  { value: 'name', label: 'Name' },
]

export const STAR_OPTIONS = [0, 1, 10, 100, 1000]

export const UPDATED_OPTIONS: { value: UpdatedWindow; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
  { value: 'older', label: 'Older than a year' },
]

const DAY = 86_400_000
const WINDOW_DAYS: Record<'30d' | '6m' | '1y', number> = { '30d': 30, '6m': 183, '1y': 365 }

/** Name sorts A→Z by default; every numeric/date sort starts with the largest or newest. */
export const defaultDir = (sort: SortKey): SortDir => (sort === 'name' ? 'asc' : 'desc')

export const DEFAULT_FILTERS: RepoFilters = {
  query: '',
  language: '',
  topic: '',
  license: '',
  minStars: 0,
  updated: '',
  hideForks: false,
  hideArchived: false,
  sort: 'pushed',
  dir: 'desc',
}

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value)
const UPDATED_KEYS = UPDATED_OPTIONS.map((o) => o.value)

export function parseFilters(params: URLSearchParams): RepoFilters {
  const sortParam = params.get('sort') as SortKey | null
  const sort = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : DEFAULT_FILTERS.sort
  const dirParam = params.get('dir')
  const dir: SortDir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : defaultDir(sort)
  const updatedParam = params.get('updated') as UpdatedWindow | null
  const stars = Number(params.get('stars'))

  return {
    query: params.get('q') ?? '',
    language: params.get('lang') ?? '',
    topic: params.get('topic') ?? '',
    license: params.get('license') ?? '',
    minStars: STAR_OPTIONS.includes(stars) ? stars : 0,
    updated: updatedParam && UPDATED_KEYS.includes(updatedParam) ? updatedParam : '',
    hideForks: params.get('forks') === 'hide',
    hideArchived: params.get('archived') === 'hide',
    sort,
    dir,
  }
}

/** Only non-default values are written, so the URL stays short and shareable. */
export function serializeFilters(f: RepoFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.query) p.set('q', f.query)
  if (f.language) p.set('lang', f.language)
  if (f.topic) p.set('topic', f.topic)
  if (f.license) p.set('license', f.license)
  if (f.minStars) p.set('stars', String(f.minStars))
  if (f.updated) p.set('updated', f.updated)
  if (f.hideForks) p.set('forks', 'hide')
  if (f.hideArchived) p.set('archived', 'hide')
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort)
  if (f.dir !== defaultDir(f.sort)) p.set('dir', f.dir)
  return p
}

/** Number of narrowing filters in use (sorting is not counted). */
export function countActiveFilters(f: RepoFilters): number {
  return [f.query.trim(), f.language, f.topic, f.license, f.minStars, f.updated, f.hideForks, f.hideArchived].filter(Boolean).length
}

export const pushedTime = (r: GitHubRepo): number => Date.parse(r.pushed_at ?? r.updated_at) || 0

function compareBy(sort: SortKey, a: GitHubRepo, b: GitHubRepo): number {
  switch (sort) {
    case 'pushed':
      return pushedTime(a) - pushedTime(b)
    case 'created':
      return (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0)
    case 'stars':
      return a.stargazers_count - b.stargazers_count
    case 'forks':
      return a.forks_count - b.forks_count
    case 'issues':
      return a.open_issues_count - b.open_issues_count
    case 'name':
      return a.name.localeCompare(b.name)
  }
}

function matchesQuery(repo: GitHubRepo, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const haystack = [repo.name, repo.description ?? '', repo.language ?? '', ...(repo.topics ?? [])].join(' ').toLowerCase()
  return tokens.every((t) => haystack.includes(t))
}

function matchesUpdated(repo: GitHubRepo, window: UpdatedWindow, now: number): boolean {
  if (!window) return true
  const age = now - pushedTime(repo)
  if (window === 'older') return age > WINDOW_DAYS['1y'] * DAY
  return age <= WINDOW_DAYS[window] * DAY
}

/** Every word in the search box must appear in the name, description, language or topics. */
export function applyFilters(repos: GitHubRepo[], f: RepoFilters): GitHubRepo[] {
  const tokens = f.query.toLowerCase().split(/\s+/).filter(Boolean)
  const now = Date.now()
  const direction = f.dir === 'asc' ? 1 : -1

  return repos
    .filter((r) => !(f.hideForks && r.fork))
    .filter((r) => !(f.hideArchived && r.archived))
    .filter((r) => !f.language || r.language === f.language)
    .filter((r) => !f.topic || (r.topics ?? []).includes(f.topic))
    .filter((r) => !f.license || (f.license === NO_LICENSE ? !r.license : r.license?.name === f.license))
    .filter((r) => r.stargazers_count >= f.minStars)
    .filter((r) => matchesUpdated(r, f.updated, now))
    .filter((r) => matchesQuery(r, tokens))
    .sort((a, b) => direction * compareBy(f.sort, a, b) || a.name.localeCompare(b.name))
}

export interface FilterOptions {
  languages: string[]
  topics: string[]
  licenses: string[]
  hasUnlicensed: boolean
}

/** Filter choices come only from values that actually occur in the loaded repositories. */
export function collectOptions(repos: GitHubRepo[]): FilterOptions {
  const languages = new Set<string>()
  const licenses = new Set<string>()
  const topicCounts = new Map<string, number>()
  let hasUnlicensed = false

  for (const r of repos) {
    if (r.language) languages.add(r.language)
    if (r.license) licenses.add(r.license.name)
    else hasUnlicensed = true
    for (const t of r.topics ?? []) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)
  }

  return {
    languages: [...languages].sort((a, b) => a.localeCompare(b)),
    licenses: [...licenses].sort((a, b) => a.localeCompare(b)),
    topics: [...topicCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t),
    hasUnlicensed,
  }
}
