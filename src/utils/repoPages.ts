import type { GitHubRepo } from '../types/github'

export const REPO_PAGE_SIZE = 100
/** Repositories loaded automatically: 3 pages × 100 = 300. */
export const MAX_REPO_PAGES = 3
/** The most pages the "load the rest" button fetches: 10 pages × 100 = 1,000 repositories in all. */
export const MAX_ALL_REPO_PAGES = 10

/** How many pages beyond the automatic ones exist for a developer with this many public repositories (0 when all are loaded). */
export function extraRepoPages(publicRepos: number): number {
  if (!Number.isFinite(publicRepos) || publicRepos <= 0) return 0
  const last = Math.min(MAX_ALL_REPO_PAGES, Math.ceil(publicRepos / REPO_PAGE_SIZE))
  return Math.max(0, last - MAX_REPO_PAGES)
}

/** How many repositories the button can add at most: the rest of the developer's repositories, up to the 1,000 limit. */
export function extraRepoCount(publicRepos: number): number {
  if (!Number.isFinite(publicRepos)) return 0
  return Math.max(0, Math.min(publicRepos, MAX_ALL_REPO_PAGES * REPO_PAGE_SIZE) - MAX_REPO_PAGES * REPO_PAGE_SIZE)
}

/**
 * Adds the later pages to the first ones. GitHub sorts by last push, so a push between two page
 * requests can move a repository across a page boundary; repeats are dropped (the first copy wins).
 */
export function mergeRepos(base: GitHubRepo[], extra: GitHubRepo[]): GitHubRepo[] {
  const seen = new Set(base.map((r) => r.id))
  const out = base.slice()
  for (const r of extra) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
  }
  return out
}
