import { describe, expect, it } from 'vitest'
import { MAX_PINS, mergePins, sanitizePins, togglePin } from '../src/utils/pins'

describe('pins', () => {
  it('drops damaged data and keeps valid pins in order', () => {
    expect(sanitizePins(null)).toEqual({})
    expect(sanitizePins([])).toEqual({})
    expect(sanitizePins({ Ada: ['x', 'X', 3, ' y '], bad: 'nope', empty: [] })).toEqual({ ada: ['x', 'y'] })
  })

  it('pins, unpins and refuses a seventh pin', () => {
    let map = {}
    for (let i = 0; i < MAX_PINS; i++) map = togglePin(map, 'Ada', `repo${i}`).map
    const full = togglePin(map, 'ada', 'one-too-many')
    expect(full.result).toBe('full')
    expect(full.map).toBe(map)
    const removed = togglePin(map, 'ADA', 'REPO0')
    expect(removed.result).toBe('unpinned')
    expect(removed.map.ada).toHaveLength(MAX_PINS - 1)
  })

  it('removes the developer entry when the last pin is removed', () => {
    const { map } = togglePin({}, 'ada', 'x')
    expect(togglePin(map, 'ada', 'x').map).toEqual({})
  })

  it('merges imported pins after existing ones without duplicates', () => {
    expect(mergePins({ ada: ['a', 'b'] }, { ada: ['B', 'c'], linus: ['z'] })).toEqual({ ada: ['a', 'b', 'c'], linus: ['z'] })
  })
})
