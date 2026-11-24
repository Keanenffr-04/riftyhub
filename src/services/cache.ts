/**
 * Small TTL cache: in-memory + sessionStorage (survives page reloads in a tab),
 * with in-flight request de-duplication so the same URL is never fetched twice at once.
 *
 * Storage is kept tidy: expired entries are removed on startup, entries from older cache formats
 * are deleted, and when storage is full the entries closest to expiry are evicted to make room.
 */
const DEFAULT_TTL_MS = 10 * 60 * 1000
const PREFIX = 'riftyhub:v4:'
const OLD_PREFIXES = ['riftyhub:v2:', 'riftyhub:v3:']
/** After its normal lifetime an entry is "stale": still shown instantly, but refreshed in the background. */
export const STALE_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_EVICTIONS = 8

interface Entry<T> {
  value: T
  /** When the entry stops being fresh. */
  expires: number
  /** When the entry was stored (used to say how old stale data is). */
  storedAt: number
}

/** The entry is removed for good once it is older than this. */
const dropAfter = (entry: { expires: number }) => entry.expires + STALE_WINDOW_MS

const memory = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function storageKeys(prefixes: string[]): string[] {
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k && prefixes.some((p) => k.startsWith(p))) keys.push(k)
  }
  return keys
}

function expiryOf(storageKey: string): number {
  try {
    const entry = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Entry<unknown> | null
    return entry && typeof entry.expires === 'number' ? entry.expires : 0
  } catch {
    return 0
  }
}

/** Removes entries past their stale window and old-format entries. Runs once when the app starts. */
export function pruneStorage(): void {
  try {
    for (const k of storageKeys(OLD_PREFIXES)) sessionStorage.removeItem(k)
    const now = Date.now()
    for (const k of storageKeys([PREFIX])) if (dropAfter({ expires: expiryOf(k) }) <= now) sessionStorage.removeItem(k)
  } catch {
    /* storage unavailable */
  }
}

/** Frees space by removing the stored entry that expires soonest. Returns false if there is nothing to remove. */
function evictOne(): boolean {
  try {
    let oldest: { key: string; expires: number } | null = null
    for (const k of storageKeys([PREFIX])) {
      const expires = expiryOf(k)
      if (!oldest || expires < oldest.expires) oldest = { key: k, expires }
    }
    if (!oldest) return false
    sessionStorage.removeItem(oldest.key)
    return true
  } catch {
    return false
  }
}

function readStorage<T>(key: string): Entry<T> | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as Entry<T>) : null
  } catch {
    return null
  }
}

function writeStorage<T>(key: string, entry: Entry<T>) {
  const text = JSON.stringify(entry)
  for (let attempt = 0; attempt <= MAX_EVICTIONS; attempt++) {
    try {
      sessionStorage.setItem(PREFIX + key, text)
      return
    } catch {
      // Storage is full or unavailable: make room and try again, otherwise rely on the memory cache.
      if (!evictOne()) return
    }
  }
}

function getEntry<T>(key: string): Entry<T> | undefined {
  let entry = memory.get(key) as Entry<T> | undefined
  if (!entry) {
    const stored = readStorage<T>(key)
    if (stored && typeof stored.expires === 'number') {
      entry = { ...stored, storedAt: typeof stored.storedAt === 'number' ? stored.storedAt : stored.expires }
      memory.set(key, entry)
    }
  }
  return entry
}

function getCached<T>(key: string): T | undefined {
  const entry = getEntry<T>(key)
  return entry && entry.expires > Date.now() ? entry.value : undefined
}

export interface Peek<T> {
  value: T
  /** True while the entry is within its normal lifetime. */
  fresh: boolean
  /** When the value was stored. */
  storedAt: number
}

/**
 * Returns the stored value even if it has passed its normal lifetime (as long as it is within the
 * stale window), without making any request. Used to show saved data instantly while it is refreshed.
 */
export function peek<T>(key: string): Peek<T> | undefined {
  const entry = getEntry<T>(key)
  if (!entry) return undefined
  const now = Date.now()
  if (dropAfter(entry) <= now) return undefined
  return { value: entry.value, fresh: entry.expires > now, storedAt: entry.storedAt }
}

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  options: { force?: boolean; ttl?: number } = {},
): Promise<T> {
  if (!options.force) {
    const hit = getCached<T>(key)
    if (hit !== undefined) return hit
    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>
  }

  const promise = loader()
    .then((value) => {
      const now = Date.now()
      const entry: Entry<T> = { value, expires: now + (options.ttl ?? DEFAULT_TTL_MS), storedAt: now }
      memory.set(key, entry)
      writeStorage(key, entry)
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

/** Removes one cached response (memory and this tab's storage), so the next request for it goes to GitHub. */
export function forget(key: string): void {
  memory.delete(key)
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* storage unavailable */
  }
}

/** How many cached GitHub responses are currently held (memory and this tab's storage), fresh or stale, not counting ones past the stale window. */
export function cacheEntryCount(): number {
  const now = Date.now()
  const live = new Set<string>()
  for (const [k, entry] of memory) if (dropAfter(entry) > now) live.add(k)
  try {
    for (const k of storageKeys([PREFIX])) if (dropAfter({ expires: expiryOf(k) }) > now) live.add(k.slice(PREFIX.length))
  } catch {
    /* storage unavailable */
  }
  return live.size
}

/** Removes every cached GitHub response so the next visit to a page loads fresh data. Returns how many were held. */
export function clearCache(): number {
  const count = cacheEntryCount()
  memory.clear()
  try {
    for (const k of storageKeys([PREFIX])) sessionStorage.removeItem(k)
  } catch {
    /* storage unavailable */
  }
  return count
}
