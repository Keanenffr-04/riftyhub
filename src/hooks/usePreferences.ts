import { useCallback, useSyncExternalStore } from 'react'
import { createPersistentStore } from '../utils/persistentStore'
import { defaultPreferences, sanitizePreferences, type Preferences } from '../utils/preferences'

export const preferencesStore = createPersistentStore<Preferences>('riftyhub:preferences', sanitizePreferences)

// Density is applied to the page itself, so it is set as soon as the app loads and whenever it changes.
function applyDensity() {
  if (typeof document !== 'undefined') document.documentElement.dataset.density = preferencesStore.get().density
}
applyDensity()
preferencesStore.subscribe(applyDensity)

export function usePreferences() {
  const preferences = useSyncExternalStore(preferencesStore.subscribe, preferencesStore.get, preferencesStore.get)
  const update = useCallback((patch: Partial<Preferences>) => preferencesStore.set({ ...preferencesStore.get(), ...patch }), [])
  const reset = useCallback(() => preferencesStore.set(defaultPreferences()), [])
  return { preferences, update, reset }
}
