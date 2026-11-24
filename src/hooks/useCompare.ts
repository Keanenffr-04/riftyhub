import { useEffect, useState } from 'react'
import { GitHubError, getRepos, getUser, peekUserData, toGitHubError } from '../services/github'
import type { UserData } from '../types/github'

export type SideResult = { status: 'ok'; data: UserData } | { status: 'error'; error: GitHubError }
/**
 * `results` has one entry per developer, in the order they were given. `refreshing` is set while saved data is
 * on screen and fresh data is being fetched quietly; `stale` when that refresh failed for at least one developer.
 */
export type CompareState =
  | { status: 'loading' }
  | { status: 'done'; results: SideResult[]; refreshing?: boolean; stale?: { storedAt: number; error: GitHubError } }

async function load(username: string, force = false): Promise<SideResult> {
  try {
    const [user, repos] = await Promise.all([getUser(username, force), getRepos(username, force)])
    return { status: 'ok', data: { user, repos } }
  } catch (err) {
    return { status: 'error', error: toGitHubError(err) }
  }
}

/**
 * Loads every developer's profile and repositories. If all of them are already saved in this tab, the saved data
 * is shown at once (stale-while-revalidate) and any that are past their normal lifetime are refreshed quietly.
 */
export function useCompare(users: string[]): CompareState {
  const [state, setState] = useState<CompareState>({ status: 'loading' })
  const key = users.join('|')

  useEffect(() => {
    let cancelled = false
    const names = key.split('|')
    const saved = names.map((n) => peekUserData(n))

    if (saved.every((s) => s !== undefined)) {
      const hits = saved as NonNullable<(typeof saved)[number]>[]
      const staleIdx = hits.flatMap((h, i) => (h.fresh ? [] : [i]))
      const results: SideResult[] = hits.map((h) => ({ status: 'ok', data: h.data }))
      if (staleIdx.length === 0) {
        setState({ status: 'done', results })
        return
      }
      setState({ status: 'done', results, refreshing: true })
      Promise.all(staleIdx.map((i) => load(names[i], true))).then((fresh) => {
        if (cancelled) return
        const next = [...results]
        let failure: { storedAt: number; error: GitHubError } | undefined
        fresh.forEach((r, j) => {
          const i = staleIdx[j]
          if (r.status === 'ok') next[i] = r
          else if (r.error.kind !== 'not_found' && r.error.kind !== 'invalid') failure ??= { storedAt: hits[i].storedAt, error: r.error }
          else next[i] = r
        })
        setState({ status: 'done', results: next, ...(failure ? { stale: failure } : {}) })
      })
      return () => {
        cancelled = true
      }
    }

    setState({ status: 'loading' })
    Promise.all(names.map((n) => load(n))).then((results) => {
      if (!cancelled) setState({ status: 'done', results })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}
