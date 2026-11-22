import type { ActivityEvent, CommitSearchResult, GitHubCommit, GitHubRepo, GitHubUser } from '../types/github'
import { mapEvent, type RawEvent } from '../utils/events'
import { cached } from './cache'
import { setRateLimit } from './rateLimit'

const API_BASE = 'https://api.github.com'
const PER_PAGE = 100
/** Safety cap: 3 pages × 100 = 300 repositories per profile. */
export const MAX_REPO_PAGES = 3

export type GitHubErrorKind = 'invalid' | 'not_found' | 'rate_limit' | 'network' | 'unknown'

export class GitHubError extends Error {
  kind: GitHubErrorKind
  resetAt?: Date

  constructor(kind: GitHubErrorKind, message: string, resetAt?: Date) {
    super(message)
    this.name = 'GitHubError'
    this.kind = kind
    this.resetAt = resetAt
  }
}

const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value)
}

export const toGitHubError = (err: unknown): GitHubError =>
  err instanceof GitHubError ? err : new GitHubError('unknown', 'Something went wrong.')

async function request<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  } catch {
    throw new GitHubError('network', 'Could not reach GitHub. Check your internet connection and try again.')
  }

  const limit = res.headers.get('x-ratelimit-limit')
  const remaining = res.headers.get('x-ratelimit-remaining')
  const reset = res.headers.get('x-ratelimit-reset')
  const resource = res.headers.get('x-ratelimit-resource')
  // Only track the main ("core") quota; search has its own separate quota.
  if (limit && remaining && reset && (!resource || resource === 'core')) {
    setRateLimit({ limit: Number(limit), remaining: Number(remaining), resetAt: new Date(Number(reset) * 1000) })
  }

  if (res.ok) return (await res.json()) as T

  if (res.status === 404) throw new GitHubError('not_found', 'User not found.')

  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    if (res.status === 429 || remaining === '0' || retryAfter) {
      const resetAt = retryAfter
        ? new Date(Date.now() + Number(retryAfter) * 1000)
        : reset
          ? new Date(Number(reset) * 1000)
          : undefined
      throw new GitHubError('rate_limit', 'GitHub API rate limit reached.', resetAt)
    }
  }

  throw new GitHubError('unknown', `GitHub returned an unexpected error (HTTP ${res.status}).`)
}

const key = (kind: string, username: string) => `${kind}:${username.toLowerCase()}`

export function getUser(username: string, force = false): Promise<GitHubUser> {
  return cached(key('user', username), () => request<GitHubUser>(`/users/${encodeURIComponent(username)}`), { force })
}

/** The user's own public repositories, most recently pushed first (up to MAX_REPO_PAGES × 100). */
export function getRepos(username: string, force = false): Promise<GitHubRepo[]> {
  return cached(
    key('repos', username),
    async () => {
      const all: GitHubRepo[] = []
      for (let page = 1; page <= MAX_REPO_PAGES; page++) {
        const batch = await request<GitHubRepo[]>(
          `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=${PER_PAGE}&page=${page}`,
        )
        all.push(...batch)
        if (batch.length < PER_PAGE) break
      }
      return all
    },
    { force },
  )
}

/** Bytes of code per language for one repository (GitHub's own language detection). */
export function getRepoLanguages(fullName: string, force = false): Promise<Record<string, number>> {
  const path = fullName.split('/').map(encodeURIComponent).join('/')
  return cached(key('languages', fullName), () => request<Record<string, number>>(`/repos/${path}/languages`), {
    force,
    ttl: 30 * 60 * 1000,
  })
}

interface CommitSearchResponse {
  total_count?: number
  incomplete_results?: boolean
  items: {
    sha: string
    html_url: string
    commit: { message: string; author: { date: string } }
    repository: { full_name: string }
  }[]
}

/** Latest public commits authored by the user, via GitHub's commit search (single request). */
export function getRecentCommits(username: string, force = false): Promise<GitHubCommit[]> {
  return cached(
    key('commits', username),
    async () => {
      const q = encodeURIComponent(`author:${username}`)
      const res = await request<CommitSearchResponse>(
        `/search/commits?q=${q}&sort=author-date&order=desc&per_page=10`,
      )
      return res.items.map((item) => ({
        sha: item.sha,
        message: item.commit.message.split('\n')[0],
        url: item.html_url,
        date: item.commit.author.date,
        repo: item.repository.full_name,
      }))
    },
    { force },
  )
}

/** Safety cap: 3 pages × 100 = the 300 most recent public events GitHub makes available (last 90 days). */
const EVENT_PAGES = 3

/** The user's recent public activity (pushes, pull requests, issues, reviews, …), newest first. */
export function getUserEvents(username: string, force = false): Promise<ActivityEvent[]> {
  return cached(
    key('events', username),
    async () => {
      const all: ActivityEvent[] = []
      for (let page = 1; page <= EVENT_PAGES; page++) {
        const batch = await request<RawEvent[]>(`/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`)
        for (const raw of batch) {
          const event = mapEvent(raw)
          if (event) all.push(event)
        }
        if (batch.length < 100) break
      }
      return all
    },
    { force },
  )
}

export const COMMIT_PAGE_SIZE = 30
/** GitHub search only returns the first 1,000 results, so paging stops well before that. */
export const MAX_COMMIT_PAGES = 10

export interface CommitQuery {
  text: string
  /** Full repository name, e.g. "owner/name", or empty for all repositories. */
  repo: string
  /** Earliest author date as YYYY-MM-DD, or empty for all time. */
  since: string
}

/** One page of the user's commits from GitHub's commit search, newest first. */
export function searchCommits(username: string, query: CommitQuery, page = 1, force = false): Promise<CommitSearchResult> {
  // Qualifier characters are removed from free text so it can only search commit messages.
  const text = query.text.replace(/[:"]/g, ' ').trim()
  const parts = [text, `author:${username}`]
  if (query.repo) parts.push(`repo:${query.repo}`)
  if (query.since) parts.push(`author-date:>=${query.since}`)
  const q = encodeURIComponent(parts.filter(Boolean).join(' '))

  return cached(
    key('commitsearch', `${username}:${q}:${page}`),
    async () => {
      const res = await request<CommitSearchResponse>(
        `/search/commits?q=${q}&sort=author-date&order=desc&per_page=${COMMIT_PAGE_SIZE}&page=${page}`,
      )
      return {
        total: res.total_count ?? res.items.length,
        incomplete: res.incomplete_results ?? false,
        commits: res.items.map(
          (item): GitHubCommit => ({
            sha: item.sha,
            message: item.commit.message.split('\n')[0],
            url: item.html_url,
            date: item.commit.author.date,
            repo: item.repository.full_name,
          }),
        ),
      }
    },
    { force },
  )
}
