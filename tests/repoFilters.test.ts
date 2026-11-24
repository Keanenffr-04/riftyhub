import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  NO_LICENSE,
  applyFilters,
  collectOptions,
  countActiveFilters,
  parseFilters,
  serializeFilters,
  type RepoFilters,
} from '../src/utils/repoFilters'
import { slimRepo } from '../src/utils/slim'
import type { GitHubRepo } from '../src/types/github'

const DAY = 86_400_000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()

const repo = (name: string, over: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: name.length,
  name,
  full_name: `ada/${name}`,
  html_url: `https://github.com/ada/${name}`,
  description: null,
  fork: false,
  archived: false,
  language: null,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  created_at: daysAgo(400),
  updated_at: daysAgo(10),
  pushed_at: daysAgo(10),
  topics: [],
  homepage: null,
  license: null,
  ...over,
})

const filters = (over: Partial<RepoFilters>): RepoFilters => ({ ...DEFAULT_FILTERS, ...over })
const names = (repos: GitHubRepo[]) => repos.map((r) => r.name)

describe('filters in the address', () => {
  it('falls back to the defaults for unknown values', () => {
    const f = parseFilters(new URLSearchParams('sort=bogus&stars=3&updated=never&dir=sideways'))
    expect(f).toEqual(DEFAULT_FILTERS)
  })

  it('sorts by name A to Z unless told otherwise', () => {
    expect(parseFilters(new URLSearchParams('sort=name')).dir).toBe('asc')
    expect(parseFilters(new URLSearchParams('sort=name&dir=desc')).dir).toBe('desc')
  })

  it('writes only what differs from the defaults and reads it back', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
    const f = filters({ query: 'api', language: 'Go', minStars: 10, hideForks: true, sort: 'stars', dir: 'asc' })
    expect(parseFilters(serializeFilters(f))).toEqual(f)
  })

  it('lets the recipient\'s own defaults fill in what the link does not mention', () => {
    const base = filters({ hideArchived: true, sort: 'name', dir: 'asc' })
    expect(serializeFilters(base, base).toString()).toBe('')
    expect(parseFilters(new URLSearchParams(), base)).toEqual(base)
    expect(parseFilters(new URLSearchParams('archived=show'), base).hideArchived).toBe(false)
  })

  it('counts narrowing filters but not sorting', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(countActiveFilters(filters({ query: '  ', sort: 'stars' }))).toBe(0)
    expect(countActiveFilters(filters({ query: 'x', language: 'Go', hideForks: true }))).toBe(3)
  })
})

describe('applyFilters', () => {
  const repos = [
    repo('alpha', { stargazers_count: 50, language: 'Go', description: 'A fast router', topics: ['http'] }),
    repo('beta', { stargazers_count: 5, language: 'Python', fork: true, license: { name: 'MIT License', spdx_id: 'MIT' } }),
    repo('gamma', { stargazers_count: 50, language: 'Go', archived: true, pushed_at: daysAgo(500), updated_at: daysAgo(500) }),
  ]

  it('hides forks and archived repositories', () => {
    expect(names(applyFilters(repos, filters({ hideForks: true })))).toEqual(['alpha', 'gamma'])
    expect(names(applyFilters(repos, filters({ hideArchived: true, sort: 'name', dir: 'asc' })))).toEqual(['alpha', 'beta'])
  })

  it('filters by language, stars and license', () => {
    expect(names(applyFilters(repos, filters({ language: 'Go', sort: 'name', dir: 'asc' })))).toEqual(['alpha', 'gamma'])
    expect(names(applyFilters(repos, filters({ minStars: 10, sort: 'name', dir: 'asc' })))).toEqual(['alpha', 'gamma'])
    expect(names(applyFilters(repos, filters({ license: 'MIT License' })))).toEqual(['beta'])
    expect(names(applyFilters(repos, filters({ license: NO_LICENSE, sort: 'name', dir: 'asc' })))).toEqual(['alpha', 'gamma'])
  })

  it('matches every plain word against name, description, language and topics', () => {
    expect(names(applyFilters(repos, filters({ query: 'fast http' })))).toEqual(['alpha'])
    expect(names(applyFilters(repos, filters({ query: 'fast python' })))).toEqual([])
  })

  it('applies search operators together with the other filters', () => {
    expect(names(applyFilters(repos, filters({ query: 'stars:>10 -is:archived' })))).toEqual(['alpha'])
  })

  it('filters by when a repository was last pushed', () => {
    expect(names(applyFilters(repos, filters({ updated: '30d', sort: 'name', dir: 'asc' })))).toEqual(['alpha', 'beta'])
    expect(names(applyFilters(repos, filters({ updated: 'older' })))).toEqual(['gamma'])
  })

  it('sorts, breaking ties by name', () => {
    expect(names(applyFilters(repos, filters({ sort: 'stars' })))).toEqual(['alpha', 'gamma', 'beta'])
    expect(names(applyFilters(repos, filters({ sort: 'stars', dir: 'asc' })))).toEqual(['beta', 'alpha', 'gamma'])
    expect(names(applyFilters(repos, filters({ sort: 'name', dir: 'desc' })))).toEqual(['gamma', 'beta', 'alpha'])
  })

  it('does not change the list it is given', () => {
    const copy = [...repos]
    applyFilters(repos, filters({ sort: 'name', dir: 'desc' }))
    expect(repos).toEqual(copy)
  })
})

describe('collectOptions', () => {
  it('lists only values that occur, topics by how common they are', () => {
    const options = collectOptions([
      repo('a', { language: 'Go', topics: ['cli', 'http'], license: { name: 'MIT License', spdx_id: 'MIT' } }),
      repo('b', { language: 'Go', topics: ['http'] }),
      repo('c', { language: 'Rust', topics: ['cli', 'http', 'zzz'] }),
    ])
    expect(options.languages).toEqual(['Go', 'Rust'])
    expect(options.topics).toEqual(['http', 'cli', 'zzz'])
    expect(options.licenses).toEqual(['MIT License'])
    expect(options.hasUnlicensed).toBe(true)
  })

  it('reports no unlicensed repositories when all have a license', () => {
    expect(collectOptions([repo('a', { license: { name: 'MIT License', spdx_id: 'MIT' } })]).hasUnlicensed).toBe(false)
  })
})

describe('slimRepo', () => {
  it('keeps only the fields RiftyHub uses and fills gaps with null or empty', () => {
    const raw = { ...repo('x'), owner: { login: 'ada' }, git_url: 'git://x', description: undefined, topics: undefined } as unknown as GitHubRepo
    const slim = slimRepo(raw)
    expect(slim).not.toHaveProperty('owner')
    expect(slim).not.toHaveProperty('git_url')
    expect(slim.description).toBeNull()
    expect(slim.topics).toEqual([])
  })
})
