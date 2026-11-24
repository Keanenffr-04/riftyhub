import { describe, expect, it } from 'vitest'
import {
  FAVORITES,
  MAX_COLLECTIONS,
  MAX_NOTE,
  MAX_SAVED,
  buildBackup,
  cleanNote,
  collectionNameError,
  countFor,
  inCollection,
  mergeCollections,
  mergeProfiles,
  normalizeCollectionName,
  parseBackup,
  sanitizeCollections,
  sanitizeProfiles,
  viewSaved,
} from '../src/utils/saved'
import { defaultPreferences } from '../src/utils/preferences'
import type { SavedProfile } from '../src/types/github'

const profile = (login: string, over: Partial<SavedProfile> = {}): SavedProfile => ({
  login,
  name: null,
  avatar_url: `https://avatars.example/${login}.png`,
  savedAt: '2026-01-01T00:00:00Z',
  ...over,
})

describe('cleanNote and names', () => {
  it('tidies line breaks, blank runs and outer space', () => {
    expect(cleanNote('  a \r\n\r\n\r\n\r\nb  ')).toBe('a\n\nb')
  })
  it('caps a note at the limit and ignores non-text', () => {
    expect(cleanNote('x'.repeat(MAX_NOTE + 50))).toHaveLength(MAX_NOTE)
    expect(cleanNote(42)).toBe('')
    expect(cleanNote(null)).toBe('')
  })
  it('normalises collection names', () => {
    expect(normalizeCollectionName('  my   team ')).toBe('my team')
    expect(normalizeCollectionName('x'.repeat(80))).toHaveLength(30)
  })
  it('drops repeated (any case) and non-text collections, and caps the count', () => {
    expect(sanitizeCollections(['Work', 'work', 5, ' ', 'Fun'])).toEqual(['Work', 'Fun'])
    expect(sanitizeCollections(Array.from({ length: 40 }, (_, i) => `c${i}`))).toHaveLength(MAX_COLLECTIONS)
    expect(sanitizeCollections('nope')).toEqual([])
  })
})

describe('sanitizeProfiles', () => {
  it('keeps valid profiles and fills the optional fields', () => {
    const [p] = sanitizeProfiles([{ login: 'ada', avatar_url: 'u', savedAt: 's' }])
    expect(p).toEqual({ login: 'ada', name: null, avatar_url: 'u', savedAt: 's', favorite: false, collections: [] })
  })
  it('drops damaged entries and repeated logins (any case)', () => {
    const out = sanitizeProfiles([null, 'x', { login: 1 }, { login: 'ada', avatar_url: 'u', savedAt: 's' }, { login: 'ADA', avatar_url: 'u', savedAt: 's' }])
    expect(out.map((p) => p.login)).toEqual(['ada'])
  })
  it('keeps a tidy note and leaves out an empty one', () => {
    const [a, b] = sanitizeProfiles([
      { login: 'a', avatar_url: 'u', savedAt: 's', note: ' hi\r\n' },
      { login: 'b', avatar_url: 'u', savedAt: 's', note: '   ' },
    ])
    expect(a.note).toBe('hi')
    expect('note' in b).toBe(false)
  })
  it('keeps at most MAX_SAVED and returns [] for non-lists', () => {
    const many = Array.from({ length: MAX_SAVED + 5 }, (_, i) => ({ login: `u${i}`, avatar_url: 'u', savedAt: 's' }))
    expect(sanitizeProfiles(many)).toHaveLength(MAX_SAVED)
    expect(sanitizeProfiles({})).toEqual([])
  })
})

describe('viewSaved and counts', () => {
  const list = [
    profile('ada', { name: 'Ada Lovelace', savedAt: '2026-01-01T00:00:00Z', collections: ['Work'] }),
    profile('linus', { savedAt: '2026-03-01T00:00:00Z', favorite: true }),
    profile('grace', { name: 'Grace Hopper', savedAt: '2026-02-01T00:00:00Z', note: 'compiler pioneer', collections: ['work'] }),
  ]
  const logins = (v: Parameters<typeof viewSaved>[1]) => viewSaved(list, v).map((p) => p.login)

  it('sorts by most recent, by name and with favourites first', () => {
    expect(logins({ query: '', collection: '', sort: 'recent' })).toEqual(['linus', 'grace', 'ada'])
    expect(logins({ query: '', collection: '', sort: 'name' })).toEqual(['Ada Lovelace', 'Grace Hopper', 'linus'].map((n) => list.find((p) => (p.name ?? p.login) === n)!.login))
    expect(logins({ query: '', collection: '', sort: 'favorites' })[0]).toBe('linus')
  })
  it('searches login, name and note without regard to case', () => {
    expect(logins({ query: 'LOVE', collection: '', sort: 'recent' })).toEqual(['ada'])
    expect(logins({ query: 'compiler', collection: '', sort: 'recent' })).toEqual(['grace'])
  })
  it('filters by collection (any case) and by favourites', () => {
    expect(logins({ query: '', collection: 'WORK', sort: 'name' }).sort()).toEqual(['ada', 'grace'])
    expect(logins({ query: '', collection: FAVORITES, sort: 'recent' })).toEqual(['linus'])
  })
  it('counts profiles under each filter', () => {
    expect(countFor(list, '')).toBe(3)
    expect(countFor(list, FAVORITES)).toBe(1)
    expect(countFor(list, 'work')).toBe(2)
    expect(inCollection(list[0], 'WORK')).toBe(true)
  })
})

describe('collectionNameError', () => {
  it('rejects empty and repeated names but allows keeping the same name on rename', () => {
    expect(collectionNameError('', [])).toMatch(/name/i)
    expect(collectionNameError('work', ['Work'])).toMatch(/already/i)
    expect(collectionNameError('work', ['Work'], 'Work')).toBeNull()
    expect(collectionNameError('play', ['Work'])).toBeNull()
  })
})

describe('mergeProfiles', () => {
  it('adds new profiles and keeps existing data for duplicates', () => {
    const merged = mergeProfiles([profile('ada', { name: 'Ada', savedAt: 'old' })], [profile('ADA', { name: 'Other', savedAt: 'new' }), profile('linus')])
    expect(merged.map((p) => p.login)).toEqual(['ada', 'linus'])
    expect(merged[0].name).toBe('Ada')
    expect(merged[0].savedAt).toBe('old')
  })
  it('combines favourites and collections for duplicates', () => {
    const [p] = mergeProfiles([profile('ada', { collections: ['Work'] })], [profile('ada', { favorite: true, collections: ['work', 'Fun'] })])
    expect(p.favorite).toBe(true)
    expect(p.collections).toEqual(['Work', 'Fun'])
  })
  it('never overwrites your own note, but fills an empty one', () => {
    const own = mergeProfiles([profile('ada', { note: 'mine' })], [profile('ada', { note: 'theirs' })])
    expect(own[0].note).toBe('mine')
    const empty = mergeProfiles([profile('ada')], [profile('ada', { note: 'theirs' })])
    expect(empty[0].note).toBe('theirs')
  })
  it('does not change the lists it was given and stops at MAX_SAVED', () => {
    const existing = [profile('ada', { collections: ['Work'] })]
    mergeProfiles(existing, [profile('ada', { collections: ['Fun'] })])
    expect(existing[0].collections).toEqual(['Work'])
    const many = Array.from({ length: MAX_SAVED }, (_, i) => profile(`u${i}`))
    expect(mergeProfiles(many, [profile('extra')])).toHaveLength(MAX_SAVED)
  })
})

describe('mergeCollections', () => {
  it('lists existing collections first, then imported ones and those used by profiles, without repeats', () => {
    expect(mergeCollections(['Work'], ['work', 'Fun'], [profile('a', { collections: ['Misc', 'fun'] })])).toEqual(['Work', 'Fun', 'Misc'])
  })
})

describe('backups', () => {
  it('round trips through JSON', () => {
    const prefs = defaultPreferences()
    const text = JSON.stringify(
      buildBackup(prefs, [profile('ada', { favorite: true, note: 'hi', collections: ['Work'] })], ['Work'], [{ id: 'py', name: 'Py', params: 'lang=Python' }], { ada: ['repo-a'] }),
    )
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.preferences).toEqual(prefs)
    expect(parsed.profiles).toHaveLength(1)
    expect(parsed.profiles[0]).toMatchObject({ login: 'ada', favorite: true, note: 'hi', collections: ['Work'] })
    expect(parsed.collections).toEqual(['Work'])
    expect(parsed.presets).toEqual([{ id: 'py', name: 'Py', params: 'lang=Python' }])
    expect(parsed.pins).toEqual({ ada: ['repo-a'] })
  })
  it('rejects text that is not JSON and JSON from something else', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'That file is not valid JSON.' })
    expect(parseBackup('{"app":"other"}')).toEqual({ ok: false, error: 'That file is not a RiftyHub backup.' })
    expect(parseBackup('null').ok).toBe(false)
    expect(parseBackup('[]').ok).toBe(false)
  })
  it('imports a backup from before presets, pins and preferences were added', () => {
    const old = JSON.stringify({ app: 'riftyhub', version: 1, exportedAt: 'x', savedProfiles: [{ login: 'ada', avatar_url: 'u', savedAt: 's' }], collections: ['Work'] })
    const parsed = parseBackup(old)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.preferences).toBeNull()
    expect(parsed.presets).toEqual([])
    expect(parsed.pins).toEqual({})
    expect(parsed.profiles.map((p) => p.login)).toEqual(['ada'])
  })
  it('cleans damaged content instead of failing', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'riftyhub', savedProfiles: [{ login: 5 }, null], collections: 'x', presets: 'x', pins: [] }))
    expect(parsed).toMatchObject({ ok: true, profiles: [], collections: [], presets: [], pins: {} })
  })
})
