import { describe, expect, it } from 'vitest'
import { parseQuery } from '../src/utils/searchQuery'
import type { GitHubRepo } from '../src/types/github'

const repo = (over: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: 1,
  name: 'demo',
  full_name: 'ada/demo',
  html_url: 'https://github.com/ada/demo',
  description: 'A demo',
  fork: false,
  archived: false,
  language: 'TypeScript',
  stargazers_count: 150,
  forks_count: 3,
  open_issues_count: 0,
  created_at: '2023-05-01T00:00:00Z',
  updated_at: '2024-07-01T00:00:00Z',
  pushed_at: '2024-07-01T00:00:00Z',
  topics: ['react'],
  homepage: null,
  license: { name: 'MIT License', spdx_id: 'MIT' },
  ...over,
})

const matches = (query: string, r: GitHubRepo) => parseQuery(query).conditions.every((c) => c.test(r))

describe('parseQuery', () => {
  it('keeps plain words and quoted phrases as terms', () => {
    expect(parseQuery('Machine "deep learning"').terms).toEqual(['machine', 'deep learning'])
  })

  it('understands numeric comparisons and ranges', () => {
    expect(matches('stars:>100', repo())).toBe(true)
    expect(matches('stars:>150', repo())).toBe(false)
    expect(matches('stars:100..200', repo())).toBe(true)
    expect(matches('forks:<=2', repo())).toBe(false)
  })

  it('understands language, topic and negation', () => {
    expect(matches('lang:typescript', repo())).toBe(true)
    expect(matches('topic:react', repo())).toBe(true)
    expect(matches('-is:fork', repo())).toBe(true)
    expect(matches('-is:fork', repo({ fork: true }))).toBe(false)
  })

  it('reports operators it cannot understand instead of matching nothing', () => {
    const parsed = parseQuery('stars:lots')
    expect(parsed.ignored).toEqual(['stars:lots'])
    expect(parsed.conditions).toHaveLength(0)
  })

  it('treats unknown operators as plain text', () => {
    expect(parseQuery('http://example.com').terms).toEqual(['http://example.com'])
  })
})
