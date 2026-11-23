import { useCallback, useEffect, useState } from 'react'
import { GitHubError, getRepoLanguages, toGitHubError } from '../services/github'
import { buildLanguageStats, type LanguageStat } from '../utils/analytics'

export type RepoLanguageState =
  | { status: 'loading' }
  | { status: 'done'; languages: LanguageStat[]; totalBytes: number }
  | { status: 'error'; error: GitHubError }

/** Loads GitHub's real per-language byte counts for one repository (one request, cached for 30 minutes). */
export function useRepoLanguages(fullName: string) {
  const [state, setState] = useState<RepoLanguageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    // A retry bypasses the cache; the first load uses it.
    getRepoLanguages(fullName, attempt > 0)
      .then((bytes) => {
        if (cancelled) return
        const entries = Object.entries(bytes)
        setState({ status: 'done', languages: buildLanguageStats(entries), totalBytes: entries.reduce((sum, [, n]) => sum + n, 0) })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toGitHubError(err) })
      })
    return () => {
      cancelled = true
    }
  }, [fullName, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { state, retry }
}
