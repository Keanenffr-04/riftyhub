/**
 * A tiny localStorage-backed store that React can subscribe to (via useSyncExternalStore).
 * Values are validated by `parse` on load, kept in memory if storage is unavailable,
 * and synced between browser tabs.
 */
export function createPersistentStore<T>(key: string, parse: (raw: unknown) => T) {
  let snapshot: T | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())

  function get(): T {
    if (snapshot !== null) return snapshot
    let raw: unknown
    try {
      const text = localStorage.getItem(key)
      raw = text ? JSON.parse(text) : undefined
    } catch {
      raw = undefined
    }
    snapshot = parse(raw)
    return snapshot
  }

  function set(value: T) {
    snapshot = value
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable: the value stays in memory for this session */
    }
    notify()
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        snapshot = null
        notify()
      }
    })
  }

  return { get, set, subscribe }
}
