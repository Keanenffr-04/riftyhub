export type SectionId = 'stats' | 'highlights' | 'commits' | 'repos'
export type Density = 'comfortable' | 'compact'
export type RepoView = 'cards' | 'table'

export interface OverviewSection {
  id: SectionId
  visible: boolean
}

export interface Preferences {
  density: Density
  repoView: RepoView
  /** Order and visibility of the sections under the profile card on the Overview page. */
  overview: OverviewSection[]
}

export const SECTION_IDS: SectionId[] = ['stats', 'highlights', 'commits', 'repos']

export const SECTION_INFO: Record<SectionId, { label: string; description: string }> = {
  stats: { label: 'Statistics', description: 'Repositories, stars, forks, followers and gists' },
  highlights: { label: 'Highlights', description: 'Top languages and most starred repositories' },
  commits: { label: 'Recent commits', description: 'The latest public commits' },
  repos: { label: 'Recently active repositories', description: 'The six most recently pushed repositories' },
}

export const defaultPreferences = (): Preferences => ({
  density: 'comfortable',
  repoView: 'cards',
  overview: SECTION_IDS.map((id) => ({ id, visible: true })),
})

/** Accepts anything (old, damaged or hand-edited data) and always returns valid preferences. */
export function sanitizePreferences(raw: unknown): Preferences {
  const base = defaultPreferences()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>

  const seen = new Set<string>()
  const overview: OverviewSection[] = []
  if (Array.isArray(r.overview)) {
    for (const item of r.overview) {
      const o = item as { id?: unknown; visible?: unknown } | null
      if (o && typeof o.id === 'string' && (SECTION_IDS as string[]).includes(o.id) && !seen.has(o.id)) {
        seen.add(o.id)
        overview.push({ id: o.id as SectionId, visible: o.visible !== false })
      }
    }
  }
  // Sections missing from saved data (e.g. added in a later version) are appended and shown.
  for (const id of SECTION_IDS) if (!seen.has(id)) overview.push({ id, visible: true })

  return {
    density: r.density === 'compact' ? 'compact' : 'comfortable',
    repoView: r.repoView === 'table' ? 'table' : 'cards',
    overview,
  }
}

export function moveSection(list: OverviewSection[], id: SectionId, delta: -1 | 1): OverviewSection[] {
  const from = list.findIndex((s) => s.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export const setSectionVisible = (list: OverviewSection[], id: SectionId, visible: boolean): OverviewSection[] =>
  list.map((s) => (s.id === id ? { ...s, visible } : s))
