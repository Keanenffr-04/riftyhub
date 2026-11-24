import { describe, expect, it } from 'vitest'
import { REPO_CSV_COLUMNS, csvCell, repoCsvFileName, reposToCsv } from '../src/utils/csv'
import type { GitHubRepo } from '../src/types/github'

const repo = (name: string, over: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: 1,
  name,
  full_name: `me/${name}`,
  html_url: `https://github.com/me/${name}`,
  description: null,
  fork: false,
  archived: false,
  language: 'Go',
  stargazers_count: 5,
  forks_count: 2,
  open_issues_count: 1,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-03-01T00:00:00Z',
  pushed_at: '2020-02-01T00:00:00Z',
  topics: ['cli', 'tools'],
  homepage: null,
  license: { name: 'MIT License', spdx_id: 'MIT' },
  ...over,
})

describe('csvCell', () => {
  it('leaves plain values alone and empties missing ones', () => {
    expect(csvCell('hello')).toBe('hello')
    expect(csvCell(42)).toBe('42')
    expect(csvCell(true)).toBe('true')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })
  it('quotes values with commas, quotes and line breaks, doubling quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
    expect(csvCell('two\r\nlines')).toBe('"two\r\nlines"')
  })
  it('stops text from being read as a spreadsheet formula', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)")
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('-cmd')).toBe("'-cmd")
    expect(csvCell('@home')).toBe("'@home")
    expect(csvCell('\tx')).toBe("'\tx")
    expect(csvCell('=1,2')).toBe('"\'=1,2"')
  })
  it('does not touch numbers, even negative ones, or text that merely contains those characters', () => {
    expect(csvCell(-3)).toBe('-3')
    expect(csvCell('a=b')).toBe('a=b')
  })
})

describe('reposToCsv', () => {
  const lines = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n')

  it('starts with a byte-order mark and a header row, and ends with a line break', () => {
    const csv = reposToCsv([])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(lines(csv)[0]).toBe(REPO_CSV_COLUMNS.map((c) => c.header).join(','))
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(lines(csv)).toHaveLength(2)
  })

  it('writes one row per repository, in the order given', () => {
    const rows = lines(reposToCsv([repo('b'), repo('a')]))
    expect(rows).toHaveLength(4)
    expect(rows[1].startsWith('b,me/b,')).toBe(true)
    expect(rows[2].startsWith('a,me/a,')).toBe(true)
  })

  it('fills each column from the right field', () => {
    const row = lines(reposToCsv([repo('x', { description: 'A, tool', fork: true, topics: ['a', 'b'] })]))[1]
    expect(row).toBe(
      'x,me/x,https://github.com/me/x,"A, tool",Go,5,2,1,true,false,MIT License,a; b,2020-01-01T00:00:00Z,2020-02-01T00:00:00Z,2020-03-01T00:00:00Z,',
    )
  })

  it('handles missing optional fields', () => {
    const row = lines(reposToCsv([repo('x', { language: null, license: null, topics: undefined, pushed_at: null })]))[1]
    expect(row).toBe('x,me/x,https://github.com/me/x,,,5,2,1,false,false,,,2020-01-01T00:00:00Z,,2020-03-01T00:00:00Z,')
  })

  it('keeps a description with a line break inside one quoted field', () => {
    const csv = reposToCsv([repo('x', { description: 'line one\nline two' })])
    expect(csv).toContain('"line one\nline two"')
  })
})

describe('repoCsvFileName', () => {
  it('names the file after the developer', () => {
    expect(repoCsvFileName('ada-lovelace')).toBe('ada-lovelace-repositories.csv')
  })
  it('keeps only safe characters', () => {
    expect(repoCsvFileName('a/../b')).toBe('ab-repositories.csv')
    expect(repoCsvFileName('')).toBe('developer-repositories.csv')
  })
})
