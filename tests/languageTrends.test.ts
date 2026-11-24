import { describe, expect, it } from 'vitest'
import { computeLanguageTrends, yearShare } from '../src/utils/languageTrends'
import type { GitHubRepo } from '../src/types/github'

const repo = (name: string, language: string | null, year: number, over: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: name.length,
  name,
  full_name: `me/${name}`,
  html_url: `https://github.com/me/${name}`,
  description: null,
  fork: false,
  archived: false,
  language,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  created_at: `${year}-06-15T12:00:00Z`,
  updated_at: `${year}-07-01T12:00:00Z`,
  pushed_at: `${year}-07-01T12:00:00Z`,
  homepage: null,
  license: null,
  ...over,
})

describe('computeLanguageTrends', () => {
  it('returns nothing when no repository has a language', () => {
    const t = computeLanguageTrends([repo('a', null, 2020)], { endYear: 2022 })
    expect(t.years).toEqual([])
    expect(t.series).toEqual([])
    expect(t.noLanguageCount).toBe(1)
  })

  it('covers every year from the oldest repository to the end year, including empty years', () => {
    const t = computeLanguageTrends([repo('a', 'Go', 2020), repo('b', 'Go', 2022)], { endYear: 2023 })
    expect(t.years).toEqual(['2020', '2021', '2022', '2023'])
    expect(t.series[0].counts).toEqual([1, 0, 1, 0])
    expect(t.totals).toEqual([1, 0, 1, 0])
  })

  it('counts each repository once, in its creation year, and leaves out forks by default', () => {
    const repos = [repo('a', 'Go', 2021), repo('b', 'Rust', 2021), repo('c', 'Go', 2021, { fork: true })]
    expect(computeLanguageTrends(repos, { endYear: 2021 }).totals).toEqual([2])
    expect(computeLanguageTrends(repos, { endYear: 2021, includeForks: true }).totals).toEqual([3])
  })

  it('puts languages beyond the top few into Other, most used first', () => {
    const repos = [
      repo('a', 'Go', 2020),
      repo('b', 'Go', 2020),
      repo('c', 'Rust', 2020),
      repo('d', 'Rust', 2021),
      repo('e', 'Python', 2021),
      repo('f', 'Ruby', 2021),
    ]
    const t = computeLanguageTrends(repos, { top: 2, endYear: 2021 })
    expect(t.series.map((s) => s.name)).toEqual(['Go', 'Rust', 'Other'])
    expect(t.series[2].counts).toEqual([0, 2])
    expect(t.series[2].color).toBeNull()
  })

  it('has no Other series when every language fits', () => {
    const t = computeLanguageTrends([repo('a', 'Go', 2020), repo('b', 'Rust', 2020)], { top: 5, endYear: 2020 })
    expect(t.series.map((s) => s.name)).toEqual(['Go', 'Rust'])
  })

  it('breaks ties by name and counts repositories without a language separately', () => {
    const t = computeLanguageTrends([repo('a', 'Rust', 2020), repo('b', 'Go', 2020), repo('c', null, 2020)], { endYear: 2020 })
    expect(t.series.map((s) => s.name)).toEqual(['Go', 'Rust'])
    expect(t.noLanguageCount).toBe(1)
    expect(t.repoCount).toBe(2)
  })

  it('extends the range when a repository is newer than the end year', () => {
    expect(computeLanguageTrends([repo('a', 'Go', 2025)], { endYear: 2023 }).years).toEqual(['2025'])
  })
})

describe('yearShare', () => {
  it('is each language’s percentage of that year, and 0 for an empty year', () => {
    const t = computeLanguageTrends([repo('a', 'Go', 2020), repo('b', 'Go', 2020), repo('c', 'Rust', 2020), repo('d', 'Go', 2022)], { endYear: 2022 })
    expect(yearShare(t, 0, 0)).toBeCloseTo(66.67, 1)
    expect(yearShare(t, 1, 0)).toBeCloseTo(33.33, 1)
    expect(yearShare(t, 0, 1)).toBe(0)
    expect(yearShare(t, 0, 2)).toBe(100)
  })
})
