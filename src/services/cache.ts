/**
 * Small TTL cache: in-memory + sessionStorage (survives page reloads in a tab),
 * with in-flight request de-duplication so the same URL is never fetched twice at once.
 */
const DEFAULT_TTL_MS = 10 * 60 * 1000
const PREFIX = 'riftyhub:v2:'

interface Entry<T> {
  value: T
  expires: number
}

const memory = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function readStorage<T>(key: string): Entry<T> | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as Entry<T>) : null
  } catch {
    return null
  }
}

function writeStorage<T>(key: string, entry: Entry<T>) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    /* storage full or unavailable – memory cache still works */
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
