import { useCallback, useSyncExternalStore } from 'react'
import { createPersistentStore } from '../utils/persistentStore'
import { isPinned, sanitizePins, togglePin, type PinMap, type ToggleResult } from '../utils/pins'

export const pinsStore = createPersistentStore<PinMap>('riftyhub:pins', sanitizePins)

/** Pinned repositories for one developer. */
export function usePins(login: string) {
  const map = useSyncExternalStore(pinsStore.subscribe, pinsStore.get, pinsStore.get)
  const pinned = useCallback((repoName: string) => isPinned(map, login, repoName), [map, login])
  const toggle = useCallback(
    (repoName: string): ToggleResult => {
      const { map: next, result } = togglePin(pinsStore.get(), login, repoName)
      if (result !== 'full') pinsStore.set(next)
      return result
    },
    [login],
  )
  return { map, isPinned: pinned, toggle }
}
