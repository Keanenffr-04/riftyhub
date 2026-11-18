import type { GitHubRepo, GitHubUser } from '../types/github'

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

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new GitHubError('network', 'Could not reach GitHub. Check your internet connection and try again.')
  }

  if (res.ok) return (await res.json()) as T

  if (res.status === 404) {
    throw new GitHubError('not_found', 'User not found.')
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    const reset = res.headers.get('x-ratelimit-reset')
    if (res.status === 429 || remaining === '0') {
      const resetAt = reset ? new Date(Number(reset) * 1000) : undefined
      throw new GitHubError('rate_limit', 'GitHub API rate limit reached.', resetAt)
    }
  }

  throw new GitHubError('unknown', `GitHub returned an unexpected error (HTTP ${res.status}).`)
}

export function getUser(username: string, signal?: AbortSignal): Promise<GitHubUser> {
  return request<GitHubUser>(`/users/${encodeURIComponent(username)}`, signal)
}

/** Fetches the user's own public repositories, most recently pushed first. */
export async function getRepos(username: string, signal?: AbortSignal): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = []
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await request<GitHubRepo[]>(
      `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=${PER_PAGE}&page=${page}`,
      signal,
    )
    all.push(...batch)
    if (batch.length < PER_PAGE) break
  }
  return all
}
