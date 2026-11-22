/**
 * Small TTL cache: in-memory + sessionStorage (survives page reloads in a tab),
 * with in-flight request de-duplication so the same URL is never fetched twice at once.
 *
 * Storage is kept tidy: expired entries are removed on startup, entries from older cache formats
 * are deleted, and when storage is full the entries closest to expiry are evicted to make room.
 */
const DEFAULT_TTL_MS = 10 * 60 * 1000
const PREFIX = 'riftyhub:v3:'
const OLD_PREFIXES = ['riftyhub:v2:']
const MAX_EVICTIONS = 8

interface Entry<T> {
  value: T
  expires: number
}

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

/** Removes expired and old-format entries. Runs once when the app starts. */
export function pruneStorage(): void {
  try {
    for (const k of storageKeys(OLD_PREFIXES)) sessionStorage.removeItem(k)
    const now = Date.now()
    for (const k of storageKeys([PREFIX])) if (expiryOf(k) <= now) sessionStorage.removeItem(k)
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

function getCached<T>(key: string): T | undefined {
  let entry = memory.get(key) as Entry<T> | undefined
  if (!entry) {
    const stored = readStorage<T>(key)
    if (stored) {
      memory.set(key, stored)
      entry = stored
    }
  }
  return entry && entry.expires > Date.now() ? entry.value : undefined
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
      const entry: Entry<T> = { value, expires: Date.now() + (options.ttl ?? DEFAULT_TTL_MS) }
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
