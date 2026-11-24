import { describe, expect, it } from 'vitest'
import { MAX_ALL_REPO_PAGES, MAX_REPO_PAGES, extraRepoCount, extraRepoPages, mergeRepos } from '../src/utils/repoPages'
import type { GitHubRepo } from '../src/types/github'

const repo = (id: number): GitHubRepo => ({
  id,
  name: `r${id}`,
  full_name: `me/r${id}`,
  html_url: '',
  description: null,
  fork: false,
  archived: false,
  language: null,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
  pushed_at: null,
  homepage: null,
  license: null,
})

describe('extraRepoPages and extraRepoCount', () => {
  it('has nothing extra up to 300 repositories', () => {
    expect(MAX_REPO_PAGES).toBe(3)
    for (const n of [0, 1, 100, 300]) {
      expect(extraRepoPages(n)).toBe(0)
      expect(extraRepoCount(n)).toBe(0)
    }
  })
  it('counts the pages and repositories beyond 300', () => {
    expect(extraRepoPages(301)).toBe(1)
    expect(extraRepoCount(301)).toBe(1)
    expect(extraRepoPages(450)).toBe(2)
    expect(extraRepoCount(450)).toBe(150)
  })
  it('stops at 1,000 repositories', () => {
    expect(MAX_ALL_REPO_PAGES).toBe(10)
    expect(extraRepoPages(1000)).toBe(7)
    expect(extraRepoPages(25_000)).toBe(7)
    expect(extraRepoCount(25_000)).toBe(700)
  })
  it('copes with odd numbers', () => {
    expect(extraRepoPages(NaN)).toBe(0)
    expect(extraRepoCount(NaN)).toBe(0)
    expect(extraRepoPages(-5)).toBe(0)
  })
})

describe('mergeRepos', () => {
  it('adds the later pages after the first ones', () => {
    expect(mergeRepos([repo(1), repo(2)], [repo(3)]).map((r) => r.id)).toEqual([1, 2, 3])
  })
  it('drops repeats caused by a push moving a repository across a page boundary', () => {
    expect(mergeRepos([repo(1), repo(2)], [repo(2), repo(3), repo(3)]).map((r) => r.id)).toEqual([1, 2, 3])
  })
  it('does not change the list it was given', () => {
    const base = [repo(1)]
    mergeRepos(base, [repo(2)])
    expect(base).toHaveLength(1)
  })
})
