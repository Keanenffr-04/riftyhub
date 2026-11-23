import { isValidUsername } from './username'

/** The Compare page handles two to four developers, kept in the address as a, b, c and d. */
export const MAX_COMPARE = 4
export const COMPARE_KEYS = ['a', 'b', 'c', 'd'] as const

const clean = (value: string | null | undefined) => (value ?? '').trim().replace(/^@/, '')

export type CompareProblem = 'invalid' | 'duplicate' | 'too_few'
export interface CompareParse {
  users: string[]
  /** null when the list can be compared. */
  problem: CompareProblem | null
}

/** Cleans a list of typed or linked usernames (empty ones are skipped) and says whether it can be compared. */
export function parseCompare(values: (string | null | undefined)[]): CompareParse {
  const users = values.map(clean).filter(Boolean).slice(0, MAX_COMPARE)
  if (users.some((u) => !isValidUsername(u))) return { users, problem: 'invalid' }
  const seen = new Set<string>()
  for (const user of users) {
    const key = user.toLowerCase()
    if (seen.has(key)) return { users, problem: 'duplicate' }
    seen.add(key)
  }
  return { users, problem: users.length < 2 ? 'too_few' : null }
}

/** Search parameters for a comparison, e.g. { a: 'ada', b: 'linus' }. */
export function buildCompareParams(users: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  users.slice(0, MAX_COMPARE).forEach((user, i) => {
    out[COMPARE_KEYS[i]] = user
  })
  return out
}

export function compareHref(users: string[]): string {
  return `/compare?${users
    .slice(0, MAX_COMPARE)
    .map((user, i) => `${COMPARE_KEYS[i]}=${encodeURIComponent(user)}`)
    .join('&')}`
}

/** Positions holding the highest value; empty when everyone has the same value (nothing to highlight). */
export function topIndices(values: number[]): number[] {
  if (values.length === 0) return []
  const max = Math.max(...values)
  if (values.every((v) => v === max)) return []
  return values.flatMap((v, i) => (v === max ? [i] : []))
}

/**
 * For each metric (a row of one value per developer), the developer with the single highest value gets
 * a lead. A metric with no single leader (a tie for the top, or everyone equal) counts as undecided.
 */
export function tallyLeads(rows: number[][], people: number): { leads: number[]; undecided: number } {
  const leads = new Array<number>(people).fill(0)
  let undecided = 0
  for (const values of rows) {
    const top = topIndices(values)
    if (top.length === 1) leads[top[0]]++
    else undecided++
  }
  return { leads, undecided }
}

export interface LanguageOverlap {
  /** Used by every developer, in the first developer's order. */
  common: string[]
  /** Per developer: languages nobody else uses. */
  only: string[][]
  /** Used by at least two developers but not all of them (empty when comparing two). */
  some: string[]
}

export function languageOverlap(lists: string[][]): LanguageOverlap {
  const counts = new Map<string, number>()
  for (const list of lists) for (const name of new Set(list)) counts.set(name, (counts.get(name) ?? 0) + 1)
  const people = lists.length
  const seen = new Set<string>()
  const some: string[] = []
  for (const list of lists) {
    for (const name of list) {
      const n = counts.get(name) ?? 0
      if (n >= 2 && n < people && !seen.has(name)) {
        seen.add(name)
        some.push(name)
      }
    }
  }
  return {
    common: (lists[0] ?? []).filter((name) => counts.get(name) === people),
    only: lists.map((list) => list.filter((name) => counts.get(name) === 1)),
    some,
  }
}
