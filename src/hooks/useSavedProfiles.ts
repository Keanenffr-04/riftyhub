import { useCallback, useSyncExternalStore } from 'react'
import type { GitHubUser, SavedProfile } from '../types/github'

const STORAGE_KEY = 'riftyhub:saved-profiles'
const MAX_SAVED = 50

let snapshot: SavedProfile[] | null = null
const listeners = new Set<() => void>()

function isProfile(value: unknown): value is SavedProfile {
  const p = value as SavedProfile
  return !!p && typeof p.login === 'string' && typeof p.avatar_url === 'string' && typeof p.savedAt === 'string'
}

function read(): SavedProfile[] {
  if (snapshot) return snapshot
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    snapshot = Array.isArray(parsed) ? parsed.filter(isProfile) : []
  } catch {
    snapshot = []
  }
  return snapshot
}

function write(list: SavedProfile[]) {
  snapshot = list
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable – list stays in memory for this session */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  // Keep multiple tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      snapshot = null
      listeners.forEach((l) => l())
    }
  })
}

export function useSavedProfiles() {
  const profiles = useSyncExternalStore(subscribe, read, read)

  const isSaved = useCallback(
    (login: string) => profiles.some((p) => p.login.toLowerCase() === login.toLowerCase()),
    [profiles],
  )

  const remove = useCallback((login: string) => {
    write(read().filter((p) => p.login.toLowerCase() !== login.toLowerCase()))
  }, [])

  const toggle = useCallback(
    (user: GitHubUser) => {
      const exists = read().some((p) => p.login.toLowerCase() === user.login.toLowerCase())
      if (exists) {
        remove(user.login)
        return
      }
      const entry: SavedProfile = {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        savedAt: new Date().toISOString(),
      }
      write([entry, ...read()].slice(0, MAX_SAVED))
    },
    [remove],
  )

  return { profiles, isSaved, toggle, remove }
}
