import { useCallback, useSyncExternalStore } from 'react'
import { createPersistentStore } from '../utils/persistentStore'
import { addPreset, removePreset, sanitizePresets, type AddResult, type FilterPreset } from '../utils/presets'

export const presetsStore = createPersistentStore<FilterPreset[]>('riftyhub:presets', sanitizePresets)

export function usePresets() {
  const presets = useSyncExternalStore(presetsStore.subscribe, presetsStore.get, presetsStore.get)
  const save = useCallback((name: string, params: string): AddResult => {
    const result = addPreset(presetsStore.get(), name, params)
    if (result.ok) presetsStore.set(result.presets)
    return result
  }, [])
  const remove = useCallback((id: string) => presetsStore.set(removePreset(presetsStore.get(), id)), [])
  return { presets, save, remove }
}
