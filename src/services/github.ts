import type { ActivityEvent, CommitSearchResult, GitHubCommit, GitHubRepo, GitHubUser, UserData } from '../types/github'
import { EVENT_PAGES, mapEvent, type RawEvent } from '../utils/events'
import { cached, peek } from './cache'
import { slimRepo } from '../utils/slim'
import { MAX_ALL_REPO_PAGES, MAX_REPO_PAGES } from '../utils/repoPages'
import { getRateLimit, setRateLimit } from './rateLimit'
import { getToken } from './token'

const API_BASE = 'https://api.github.com'
const PER_PAGE = 100
/** Safety cap: 3 pages × 100 = 300 repositories are loaded automatically per profile. */
export { MAX_REPO_PAGES }

export type GitHubErrorKind = 'invalid' | 'not_found' | 'rate_limit' | 'auth' | 'network' | 'server' | 'unknown'

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

export { isValidUsername } from '../utils/username'

export const toGitHubError = (err: unknown): GitHubError =>
  err instanceof GitHubError ? err : new GitHubError('unknown', 'Something went wrong.')

const TIMEOUT_MS = 15_000
/** Pauses before the 2nd and 3rd attempt when GitHub can't be reached or has a server problem. */
const RETRY_DELAYS_MS = [600, 1800]

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Once the main quota is used up, fail immediately instead of sending requests GitHub will refuse. */
function assertQuota(path: string) {
  if (path.startsWith('/search/')) return // search has its own quota
  const info = getRateLimit()
  if (info && info.remaining <= 0 && info.resetAt.getTime() > Date.now()) {
    throw new GitHubError('rate_limit', 'GitHub API rate limit reached.', info.resetAt)
  }
}

async function requestOnce<T>(path: string): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)

  try {
    let res: Response
    try {
      const token = getToken()
      const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
      if (token) headers.Authorization = `Bearer ${token}`
      res = await fetch(`${API_BASE}${path}`, { headers, signal: controller.signal })
    } catch {
      throw new GitHubError(
        'network',
        timedOut ? 'GitHub took too long to respond. Try again in a moment.' : 'Could not reach GitHub. Check your internet connection and try again.',
      )
    }

    const limit = res.headers.get('x-ratelimit-limit')
    const remaining = res.headers.get('x-ratelimit-remaining')
    const reset = res.headers.get('x-ratelimit-reset')
    const resource = res.headers.get('x-ratelimit-resource')
    // Only track the main ("core") quota; search has its own separate quota.
    if (limit && remaining && reset && (!resource || resource === 'core')) {
      setRateLimit({ limit: Number(limit), remaining: Number(remaining), resetAt: new Date(Number(reset) * 1000) })
    }

    if (res.ok) {
      try {
        return (await res.json()) as T
      } catch {
        throw timedOut
          ? new GitHubError('network', 'GitHub took too long to respond. Try again in a moment.')
          : new GitHubError('unknown', 'GitHub sent a response that could not be read.')
      }
    }

    if (res.status === 401) {
      throw new GitHubError('auth', 'GitHub did not accept the token saved in Settings. It may have expired or been revoked.')
    }

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

    if (res.status >= 500) throw new GitHubError('server', `GitHub is having problems right now (HTTP ${res.status}).`)

    throw new GitHubError('unknown', `GitHub returned an unexpected error (HTTP ${res.status}).`)
  } finally {
    clearTimeout(timer)
  }
}

/** One GET request with a timeout, automatic retries for temporary failures, and a fast stop when the quota is spent. */
async function request<T>(path: string): Promise<T> {
  assertQuota(path)
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestOnce<T>(path)
    } catch (err) {
      const temporary = err instanceof GitHubError && (err.kind === 'network' || err.kind === 'server')
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      if (!temporary || offline || attempt >= RETRY_DELAYS_MS.length) throw err
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }
}

const key = (kind: string, username: string) => `${kind}:${username.toLowerCase()}`

export function getUser(username: string, force = false): Promise<GitHubUser> {
  return cached(key('user', username), () => request<GitHubUser>(`/users/${encodeURIComponent(username)}`), { force })
}

/**
 * A developer's profile and repositories exactly as last stored, even if past their normal lifetime,
 * without making any request. Undefined unless both are stored.
 */
export function peekUserData(username: string): { data: UserData; fresh: boolean; storedAt: number } | undefined {
  const user = peek<GitHubUser>(key('user', username))
  const repos = peek<GitHubRepo[]>(key('repos', username))
  if (!user || !repos) return undefined
  return {
    data: { user: user.value, repos: repos.value },
    fresh: user.fresh && repos.fresh,
    storedAt: Math.min(user.storedAt, repos.storedAt),
  }
}

/** A developer's public events as last stored, even if past their normal lifetime, without making any request. */
export function peekUserEvents(username: string): { events: ActivityEvent[]; fresh: boolean; storedAt: number } | undefined {
  const hit = peek<ActivityEvent[]>(key('events', username))
  return hit ? { events: hit.value, fresh: hit.fresh, storedAt: hit.storedAt } : undefined
}

async function fetchRepoPage(username: string, page: number): Promise<GitHubRepo[]> {
  const batch = await request<GitHubRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=${PER_PAGE}&page=${page}`,
  )
  return batch.map(slimRepo)
}

/**
 * The user's own public repositories, most recently pushed first (up to MAX_REPO_PAGES × 100).
 * The first page and the profile load together; the profile's repository count then says how many
 * more pages exist, and those are fetched in parallel. Only the fields RiftyHub uses are kept.
 */
export function getRepos(username: string, force = false): Promise<GitHubRepo[]> {
  return cached(
    key('repos', username),
    async () => {
      const [user, first] = await Promise.all([getUser(username), fetchRepoPage(username, 1)])
      if (first.length < PER_PAGE) return first
      const pages = Math.min(MAX_REPO_PAGES, Math.ceil(user.public_repos / PER_PAGE))
      const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => fetchRepoPage(username, i + 2)))
      return first.concat(...rest)
    },
    { force },
  )
}

/**
 * The repositories after the first MAX_REPO_PAGES × 100, up to MAX_ALL_REPO_PAGES × 100 in all,
 * fetched in parallel. Only asked for by the "load the rest" button; empty when there are no more.
 */
export function getMoreRepos(username: string, force = false): Promise<GitHubRepo[]> {
  return cached(
    key('repos-more', username),
    async () => {
      const user = await getUser(username)
      const last = Math.min(MAX_ALL_REPO_PAGES, Math.ceil(user.public_repos / PER_PAGE))
      const pages = Array.from({ length: Math.max(0, last - MAX_REPO_PAGES) }, (_, i) => MAX_REPO_PAGES + 1 + i)
      const rest = await Promise.all(pages.map((page) => fetchRepoPage(username, page)))
      return ([] as GitHubRepo[]).concat(...rest)
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

/** A repository's language bytes as last stored, even if past their normal lifetime, without making any request. */
export function peekRepoLanguages(fullName: string): { languages: Record<string, number>; fresh: boolean; storedAt: number } | undefined {
  const hit = peek<Record<string, number>>(key('languages', fullName))
  return hit ? { languages: hit.value, fresh: hit.fresh, storedAt: hit.storedAt } : undefined
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

/** Safety cap: EVENT_PAGES × 100 = the 300 most recent public events GitHub makes available (last 90 days). */
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

const commitSearchKey = (username: string, q: string, page: number) => key('commitsearch', `${username}:${q}:${page}`)

/** Builds the encoded search string; qualifier characters are removed from free text so it can only search commit messages. */
function commitSearchString(username: string, query: CommitQuery): string {
  const text = query.text.replace(/[:"]/g, ' ').trim()
  const parts = [text, `author:${username}`]
  if (query.repo) parts.push(`repo:${query.repo}`)
  if (query.since) parts.push(`author-date:>=${query.since}`)
  return encodeURIComponent(parts.filter(Boolean).join(' '))
}

/** A commit search page as last stored, even if past its normal lifetime, without making any request. */
export function peekCommitSearch(
  username: string,
  query: CommitQuery,
  page = 1,
): { result: CommitSearchResult; fresh: boolean; storedAt: number } | undefined {
  const hit = peek<CommitSearchResult>(commitSearchKey(username, commitSearchString(username, query), page))
  return hit ? { result: hit.value, fresh: hit.fresh, storedAt: hit.storedAt } : undefined
}

/** One page of the user's commits from GitHub's commit search, newest first. */
export function searchCommits(username: string, query: CommitQuery, page = 1, force = false): Promise<CommitSearchResult> {
  const q = commitSearchString(username, query)

  return cached(
    commitSearchKey(username, q, page),
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

export type TokenCheck = { ok: true; limit: number } | { ok: false; reason: 'rejected' | 'network' }

/** Tests a token against GitHub's free /rate_limit endpoint (it does not use up any quota). */
export async function checkToken(token: string): Promise<TokenCheck> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/rate_limit`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    if (res.status === 401) return { ok: false, reason: 'rejected' }
    if (!res.ok) return { ok: false, reason: 'network' }
    const limit = Number(res.headers.get('x-ratelimit-limit'))
    return { ok: true, limit: Number.isFinite(limit) && limit > 0 ? limit : 0 }
  } catch {
    return { ok: false, reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}
