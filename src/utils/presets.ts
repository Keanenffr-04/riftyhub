/**
 * Saved filter presets for the Repositories page. A preset is a name plus the filters written the
 * same way the page address writes them (for example "lang=Python&stars=10"), so it is validated
 * by the same code that reads the address.
 */
export interface FilterPreset {
  /** Lower-case name; also the identity, so saving the same name again replaces the preset. */
  id: string
  name: string
  params: string
}

export const MAX_PRESETS = 20
export const MAX_PRESET_NAME = 40
const MAX_PARAMS_LENGTH = 600

export const presetId = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, MAX_PRESET_NAME)

/** Accepts anything (old, damaged or hand-edited data) and returns only valid presets. */
export function sanitizePresets(raw: unknown): FilterPreset[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: FilterPreset[] = []
  for (const item of raw) {
    const o = item as { name?: unknown; params?: unknown } | null
    if (!o || typeof o.name !== 'string' || typeof o.params !== 'string') continue
    const name = cleanName(o.name)
    const id = presetId(name)
    if (!name || seen.has(id) || o.params.length > MAX_PARAMS_LENGTH) continue
    seen.add(id)
    out.push({ id, name, params: o.params })
    if (out.length >= MAX_PRESETS) break
  }
  return out
}

export type AddResult = { ok: true; presets: FilterPreset[]; replaced: boolean } | { ok: false; error: string }

/** Adds a preset, or replaces the one with the same name. */
export function addPreset(list: FilterPreset[], name: string, params: string): AddResult {
  const clean = cleanName(name)
  if (!clean) return { ok: false, error: 'Give the preset a name.' }
  const id = presetId(clean)
  const exists = list.some((p) => p.id === id)
  if (!exists && list.length >= MAX_PRESETS) return { ok: false, error: `You can keep up to ${MAX_PRESETS} presets. Delete one first.` }
  const entry: FilterPreset = { id, name: clean, params }
  return { ok: true, replaced: exists, presets: exists ? list.map((p) => (p.id === id ? entry : p)) : [...list, entry] }
}

export const removePreset = (list: FilterPreset[], id: string): FilterPreset[] => list.filter((p) => p.id !== id)

/** Imported presets are added after the existing ones; a name that already exists keeps the existing preset. */
export function mergePresets(existing: FilterPreset[], incoming: FilterPreset[]): FilterPreset[] {
  const merged = [...existing]
  for (const p of incoming) if (!merged.some((m) => m.id === p.id)) merged.push(p)
  return merged.slice(0, MAX_PRESETS)
}
