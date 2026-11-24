import { beforeEach, describe, expect, it, vi } from 'vitest'
import './setup'
import { STALE_WINDOW_MS, cacheEntryCount, cached, clearCache, peek, pruneStorage } from '../src/services/cache'

const TTL = 10 * 60 * 1000

beforeEach(() => {
  clearCache()
  sessionStorage.clear()
  vi.useRealTimers()
})

describe('cache', () => {
  it('serves a fresh value without calling the loader again', async () => {
    const loader = vi.fn(async () => 'a')
    expect(await cached('k', loader)).toBe('a')
    expect(await cached('k', loader)).toBe('a')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('shares one request between simultaneous callers', async () => {
    const loader = vi.fn(async () => 'a')
    await Promise.all([cached('k', loader), cached('k', loader)])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('reloads when forced', async () => {
    const loader = vi.fn(async () => 'a')
    await cached('k', loader)
    await cached('k', loader, { force: true })
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('stale-while-revalidate', () => {
  it('peek reports fresh, then stale, then nothing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await cached('k', async () => 'v')
    expect(peek('k')).toMatchObject({ value: 'v', fresh: true })

    vi.setSystemTime(Date.now() + TTL + 1)
    const stale = peek<string>('k')
    expect(stale).toMatchObject({ value: 'v', fresh: false })
    expect(stale?.storedAt).toBe(new Date('2026-01-01T00:00:00Z').getTime())

    vi.setSystemTime(Date.now() + STALE_WINDOW_MS)
    expect(peek('k')).toBeUndefined()
  })

  it('a stale value is not served by cached(): the loader runs again', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const loader = vi.fn(async () => 'v')
    await cached('k', loader)
    vi.setSystemTime(Date.now() + TTL + 1)
    await cached('k', loader)
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('stale values survive in storage and are readable after a reload of the app state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await cached('k', async () => 'v')
    vi.setSystemTime(Date.now() + TTL + 1)
    pruneStorage()
    expect(peek('k')).toMatchObject({ value: 'v', fresh: false })
    expect(cacheEntryCount()).toBe(1)
  })

  it('pruneStorage removes entries past the stale window and old formats', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await cached('k', async () => 'v')
    sessionStorage.setItem('riftyhub:v3:old', JSON.stringify({ value: 1, expires: Date.now() + TTL }))
    vi.setSystemTime(Date.now() + TTL + STALE_WINDOW_MS + 1)
    pruneStorage()
    expect(sessionStorage.length).toBe(0)
  })

  it('entries written by older versions without a stored time still work', () => {
    sessionStorage.setItem('riftyhub:v4:legacy', JSON.stringify({ value: 'x', expires: Date.now() + TTL }))
    expect(peek('legacy')).toMatchObject({ value: 'x', fresh: true })
  })

  it('clearCache removes fresh and stale entries and reports how many', async () => {
    await cached('a', async () => 1)
    await cached('b', async () => 2)
    expect(clearCache()).toBe(2)
    expect(cacheEntryCount()).toBe(0)
    expect(peek('a')).toBeUndefined()
  })
})
