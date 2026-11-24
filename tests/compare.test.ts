import { describe, expect, it } from 'vitest'
import { buildCompareParams, compareHref, languageOverlap, parseCompare, tallyLeads, topIndices } from '../src/utils/compare'

describe('parseCompare', () => {
  it('cleans blanks and @ signs', () => {
    expect(parseCompare(['@ada', '  linus ', '', null])).toEqual({ users: ['ada', 'linus'], problem: null })
  })
  it('needs at least two developers', () => {
    expect(parseCompare(['ada']).problem).toBe('too_few')
    expect(parseCompare([]).problem).toBe('too_few')
  })
  it('flags repeated names whatever the letter case', () => {
    expect(parseCompare(['Ada', 'ada']).problem).toBe('duplicate')
  })
  it('flags invalid names', () => {
    expect(parseCompare(['ada', 'not valid']).problem).toBe('invalid')
  })
  it('keeps at most four developers', () => {
    expect(parseCompare(['a', 'b', 'c', 'd', 'e']).users).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('compare links', () => {
  it('builds the address parameters and link', () => {
    expect(buildCompareParams(['ada', 'linus'])).toEqual({ a: 'ada', b: 'linus' })
    expect(compareHref(['ada', 'linus', 'grace'])).toBe('/compare?a=ada&b=linus&c=grace')
  })
})

describe('topIndices and tallyLeads', () => {
  it('highlights nothing when everyone is equal', () => {
    expect(topIndices([3, 3, 3])).toEqual([])
    expect(topIndices([])).toEqual([])
  })
  it('highlights everyone sharing the top spot', () => {
    expect(topIndices([5, 2, 5])).toEqual([0, 2])
  })
  it('counts shared or equal metrics as undecided', () => {
    expect(tallyLeads([[5, 2], [1, 9], [4, 4], [5, 5]], 2)).toEqual({ leads: [1, 1], undecided: 2 })
  })
})

describe('languageOverlap', () => {
  it('splits languages into common, shared by some, and unique', () => {
    const result = languageOverlap([
      ['Go', 'Rust', 'C'],
      ['Go', 'Rust', 'Lua'],
      ['Go', 'Zig'],
    ])
    expect(result.common).toEqual(['Go'])
    expect(result.some).toEqual(['Rust'])
    expect(result.only).toEqual([['C'], ['Lua'], ['Zig']])
  })
  it('has no "some" group when comparing two developers', () => {
    expect(languageOverlap([['Go', 'C'], ['Go', 'Lua']]).some).toEqual([])
  })
})
