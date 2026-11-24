import { useCallback, useEffect, useState } from 'react'
import { GitHubError, getRepoLanguages, peekRepoLanguages, toGitHubError } from '../services/github'
import { buildLanguageStats, type LanguageStat } from '../utils/analytics'

export type RepoLanguageState =
  | { status: 'loading' }
  | {
      status: 'done'
      languages: LanguageStat[]
      totalBytes: number
      /** Set while saved data is on screen and a newer copy is being fetched quietly. */
      refreshing?: boolean
      /** Set when saved data is on screen because the quiet refresh failed. */
      stale?: { storedAt: number; error: GitHubError }
    }
  | { status: 'error'; error: GitHubError }

function toDone(bytes: Record<string, number>): Extract<RepoLanguageState, { status: 'done' }> {
  const entries = Object.entries(bytes)
  return { status: 'done', languages: buildLanguageStats(entries), totalBytes: entries.reduce((sum, [, n]) => sum + n, 0) }
}

/** Loads GitHub's real per-language byte counts for one repository (one request, fresh for 30 minutes, saved data shown first after that). */
export function useRepoLanguages(fullName: string) {
  const [state, setState] = useState<RepoLanguageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    // A retry bypasses the cache; the first load uses it.
    const force = attempt > 0
    const found = force ? undefined : peekRepoLanguages(fullName)
    const stale = found && !found.fresh ? found : undefined
    setState(stale ? { ...toDone(stale.languages), refreshing: true } : { status: 'loading' })

    getRepoLanguages(fullName, force || stale !== undefined)
      .then((bytes) => {
        if (!cancelled) setState(toDone(bytes))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = toGitHubError(err)
        if (stale && error.kind !== 'not_found' && error.kind !== 'invalid') {
          setState({ ...toDone(stale.languages), stale: { storedAt: stale.storedAt, error } })
        } else {
          setState({ status: 'error', error })
        }
      })
    return () => {
      cancelled = true
    }
  }, [fullName, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { state, retry }
}
