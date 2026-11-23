import type { GitHubRepo } from '../types/github'

/**
 * Pinned repositories: up to six per developer, remembered in this browser. Pins are stored as
 * repository names under the developer's login (lower case), in the order they were pinned.
 */
export type PinMap = Record<string, string[]>

export const MAX_PINS = 6
export const MAX_PIN_USERS = 100
const MAX_NAME = 100

const userKey = (login: string) => login.trim().toLowerCase()
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Accepts anything (old, damaged or hand-edited data) and returns only valid pins. */
export function sanitizePins(raw: unknown): PinMap {
  const out: PinMap = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [login, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PIN_USERS) break
    if (!Array.isArray(value) || !userKey(login)) continue
    const names: string[] = []
    for (const item of value) {
      if (typeof item !== 'string') continue
      const name = item.trim().slice(0, MAX_NAME)
      if (name && !names.some((n) => same(n, name)) && names.length < MAX_PINS) names.push(name)
    }
    if (names.length > 0) out[userKey(login)] = names
  }
  return out
}

export const pinsFor = (map: PinMap, login: string): string[] => map[userKey(login)] ?? []
export const isPinned = (map: PinMap, login: string, repoName: string): boolean => pinsFor(map, login).some((n) => same(n, repoName))

export type ToggleResult = 'pinned' | 'unpinned' | 'full'

/** Pins the repository, or unpins it if it is already pinned. Pinning a seventh one changes nothing and reports "full". */
export function togglePin(map: PinMap, login: string, repoName: string): { map: PinMap; result: ToggleResult } {
  const key = userKey(login)
  const current = pinsFor(map, login)
  if (current.some((n) => same(n, repoName))) {
    const rest = current.filter((n) => !same(n, repoName))
    const next = { ...map }
    if (rest.length > 0) next[key] = rest
    else delete next[key]
    return { map: next, result: 'unpinned' }
  }
  if (current.length >= MAX_PINS) return { map, result: 'full' }
  if (current.length === 0 && Object.keys(map).length >= MAX_PIN_USERS) return { map, result: 'full' }
  return { map: { ...map, [key]: [...current, repoName] }, result: 'pinned' }
}

/** The pinned repositories that still exist, in the order they were pinned. */
export function pinnedRepos(map: PinMap, login: string, repos: GitHubRepo[]): GitHubRepo[] {
  return pinsFor(map, login)
    .map((name) => repos.find((r) => same(r.name, name)))
    .filter((r): r is GitHubRepo => !!r)
}

/** Imported pins are added after the existing ones for each developer (up to six). */
export function mergePins(existing: PinMap, incoming: PinMap): PinMap {
  const merged: PinMap = { ...existing }
  for (const [login, names] of Object.entries(incoming)) {
    if (!(login in merged) && Object.keys(merged).length >= MAX_PIN_USERS) continue
    const combined = [...(merged[login] ?? [])]
    for (const n of names) if (!combined.some((c) => same(c, n)) && combined.length < MAX_PINS) combined.push(n)
    if (combined.length > 0) merged[login] = combined
  }
  return merged
}
