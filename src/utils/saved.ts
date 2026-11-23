import type { SavedProfile } from '../types/github'
import { sanitizePreferences, type Preferences } from './preferences'
import { sanitizePresets, type FilterPreset } from './presets'
import { sanitizePins, type PinMap } from './pins'

export const MAX_SAVED = 50
export const MAX_COLLECTIONS = 20
export const MAX_COLLECTION_NAME = 30
export const MAX_NOTE = 500
/** Filter value meaning "only favourites" (collection names can't collide with it). */
export const FAVORITES = '__favorites__'

export type SavedSort = 'recent' | 'name' | 'favorites'

export interface SavedView {
  query: string
  /** '' for everyone, FAVORITES, or a collection name. */
  collection: string
  sort: SavedSort
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function normalizeCollectionName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_COLLECTION_NAME)
}

/** Tidies a note: one kind of line break, no blank-line runs, no outer whitespace, at most MAX_NOTE characters. */
export function cleanNote(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_NOTE)
    .trim()
}

function cleanNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = normalizeCollectionName(item)
    if (name && !out.some((n) => same(n, name))) out.push(name)
  }
  return out
}

export function sanitizeCollections(raw: unknown): string[] {
  return cleanNames(raw).slice(0, MAX_COLLECTIONS)
}

export function sanitizeProfiles(raw: unknown): SavedProfile[] {
  if (!Array.isArray(raw)) return []
  const out: SavedProfile[] = []
  for (const item of raw) {
    const p = item as Partial<SavedProfile> | null
    if (!p || typeof p.login !== 'string' || typeof p.avatar_url !== 'string' || typeof p.savedAt !== 'string') continue
    if (out.some((o) => same(o.login, p.login as string))) continue
    const note = cleanNote(p.note)
    out.push({
      login: p.login,
      name: typeof p.name === 'string' ? p.name : null,
      avatar_url: p.avatar_url,
      savedAt: p.savedAt,
      favorite: p.favorite === true,
      collections: cleanNames(p.collections),
      ...(note ? { note } : {}),
    })
  }
  return out.slice(0, MAX_SAVED)
}

export function inCollection(p: SavedProfile, name: string): boolean {
  return (p.collections ?? []).some((c) => same(c, name))
}

/** Number of saved profiles shown under a filter value ('' = all). */
export function countFor(profiles: SavedProfile[], collection: string): number {
  if (!collection) return profiles.length
  if (collection === FAVORITES) return profiles.filter((p) => p.favorite).length
  return profiles.filter((p) => inCollection(p, collection)).length
}

export function viewSaved(profiles: SavedProfile[], view: SavedView): SavedProfile[] {
  const q = view.query.trim().toLowerCase()
  const time = (p: SavedProfile) => Date.parse(p.savedAt) || 0
  const label = (p: SavedProfile) => p.name ?? p.login

  return profiles
    .filter((p) => !q || p.login.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q) || (p.note ?? '').toLowerCase().includes(q))
    .filter((p) => !view.collection || (view.collection === FAVORITES ? p.favorite : inCollection(p, view.collection)))
    .sort((a, b) => {
      if (view.sort === 'name') return label(a).localeCompare(label(b))
      if (view.sort === 'favorites' && !!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1
      return time(b) - time(a)
    })
}

/** Result of validating a collection name against the existing ones; null means the name is fine. */
export function collectionNameError(name: string, existing: string[], ignore?: string): string | null {
  if (!name) return 'Enter a name.'
  if (existing.some((c) => same(c, name) && !(ignore && same(c, ignore)))) return 'That collection already exists.'
  return null
}

// ---------- Backup ----------

export interface Backup {
  app: 'riftyhub'
  version: 1
  exportedAt: string
  preferences: Preferences
  savedProfiles: SavedProfile[]
  collections: string[]
  /** Saved filter presets (added in v11; older backups do not have them). */
  presets?: FilterPreset[]
  /** Pinned repositories per developer (added in v12). */
  pins?: PinMap
}

export function buildBackup(preferences: Preferences, savedProfiles: SavedProfile[], collections: string[], presets: FilterPreset[] = [], pins: PinMap = {}): Backup {
  return { app: 'riftyhub', version: 1, exportedAt: new Date().toISOString(), preferences, savedProfiles, collections, presets, pins }
}

export type ParsedBackup =
  | { ok: true; preferences: Preferences | null; profiles: SavedProfile[]; collections: string[]; presets: FilterPreset[]; pins: PinMap }
  | { ok: false; error: string }

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  const r = raw as Partial<Backup> | null
  if (!r || typeof r !== 'object' || r.app !== 'riftyhub') return { ok: false, error: 'That file is not a RiftyHub backup.' }
  return {
    ok: true,
    preferences: r.preferences ? sanitizePreferences(r.preferences) : null,
    profiles: sanitizeProfiles(r.savedProfiles),
    collections: sanitizeCollections(r.collections),
    presets: sanitizePresets(r.presets),
    pins: sanitizePins(r.pins),
  }
}

/** Adds imported profiles to the existing ones; duplicates keep their data and gain the imported collections and favourite flag (and the imported note, if they have none). */
export function mergeProfiles(existing: SavedProfile[], incoming: SavedProfile[]): SavedProfile[] {
  const merged = existing.map((p) => ({ ...p }))
  for (const inc of incoming) {
    const match = merged.find((p) => same(p.login, inc.login))
    if (match) {
      match.favorite = !!match.favorite || !!inc.favorite
      match.collections = cleanNames([...(match.collections ?? []), ...(inc.collections ?? [])])
      if (!match.note && inc.note) match.note = inc.note
    } else {
      merged.push({ ...inc })
    }
  }
  return merged.slice(0, MAX_SAVED)
}

/** Every collection that is listed or used by a profile, existing ones first. */
export function mergeCollections(existing: string[], incoming: string[], profiles: SavedProfile[]): string[] {
  return cleanNames([...existing, ...incoming, ...profiles.flatMap((p) => p.collections ?? [])]).slice(0, MAX_COLLECTIONS)
}
