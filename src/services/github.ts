import type { GitHubCommit, GitHubRepo, GitHubUser } from '../types/github'
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

interface CommitSearchResponse {
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
