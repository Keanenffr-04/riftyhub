import { useCallback, useSyncExternalStore } from 'react'
import type { GitHubUser, SavedProfile } from '../types/github'
import { createPersistentStore } from '../utils/persistentStore'
import {
  MAX_COLLECTIONS,
  MAX_SAVED,
  collectionNameError,
  inCollection,
  normalizeCollectionName,
  sanitizeCollections,
  sanitizeProfiles,
} from '../utils/saved'

// The profile list keeps its original storage key, so profiles saved in earlier versions still load.
const profilesStore = createPersistentStore<SavedProfile[]>('riftyhub:saved-profiles', sanitizeProfiles)
const collectionsStore = createPersistentStore<string[]>('riftyhub:collections', sanitizeCollections)

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Replaces everything that is saved (used when importing a backup). */
export function replaceSavedData(profiles: SavedProfile[], collections: string[]) {
  profilesStore.set(profiles)
  collectionsStore.set(collections)
}

export function getSavedData() {
  return { profiles: profilesStore.get(), collections: collectionsStore.get() }
}

function updateProfile(login: string, change: (p: SavedProfile) => SavedProfile) {
  profilesStore.set(profilesStore.get().map((p) => (same(p.login, login) ? change(p) : p)))
}

export function useSavedProfiles() {
  const profiles = useSyncExternalStore(profilesStore.subscribe, profilesStore.get, profilesStore.get)
  const collections = useSyncExternalStore(collectionsStore.subscribe, collectionsStore.get, collectionsStore.get)

  const isSaved = useCallback((login: string) => profiles.some((p) => same(p.login, login)), [profiles])

  const remove = useCallback((login: string) => {
    profilesStore.set(profilesStore.get().filter((p) => !same(p.login, login)))
  }, [])

  const toggle = useCallback(
    (user: GitHubUser) => {
      if (profilesStore.get().some((p) => same(p.login, user.login))) {
        remove(user.login)
        return
      }
      const entry: SavedProfile = {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        savedAt: new Date().toISOString(),
        favorite: false,
        collections: [],
      }
      profilesStore.set([entry, ...profilesStore.get()].slice(0, MAX_SAVED))
    },
    [remove],
  )

  const toggleFavorite = useCallback((login: string) => {
    updateProfile(login, (p) => ({ ...p, favorite: !p.favorite }))
  }, [])

  const setInCollection = useCallback((login: string, collection: string, member: boolean) => {
    updateProfile(login, (p) => {
      const without = (p.collections ?? []).filter((c) => !same(c, collection))
      return { ...p, collections: member ? [...without, collection] : without }
    })
  }, [])

  /** Each of these returns an error message to show, or null on success. */
  const createCollection = useCallback((raw: string): string | null => {
    const name = normalizeCollectionName(raw)
    const existing = collectionsStore.get()
    const error = collectionNameError(name, existing)
    if (error) return error
    if (existing.length >= MAX_COLLECTIONS) return `You can have up to ${MAX_COLLECTIONS} collections.`
    collectionsStore.set([...existing, name])
    return null
  }, [])

  const renameCollection = useCallback((oldName: string, raw: string): string | null => {
    const name = normalizeCollectionName(raw)
    const existing = collectionsStore.get()
    const error = collectionNameError(name, existing, oldName)
    if (error) return error
    collectionsStore.set(existing.map((c) => (same(c, oldName) ? name : c)))
    profilesStore.set(
      profilesStore.get().map((p) =>
        inCollection(p, oldName) ? { ...p, collections: (p.collections ?? []).map((c) => (same(c, oldName) ? name : c)) } : p,
      ),
    )
    return null
  }, [])

  const deleteCollection = useCallback((name: string) => {
    collectionsStore.set(collectionsStore.get().filter((c) => !same(c, name)))
    profilesStore.set(
      profilesStore.get().map((p) => (inCollection(p, name) ? { ...p, collections: (p.collections ?? []).filter((c) => !same(c, name)) } : p)),
    )
  }, [])

  return { profiles, collections, isSaved, toggle, remove, toggleFavorite, setInCollection, createCollection, renameCollection, deleteCollection }
}
