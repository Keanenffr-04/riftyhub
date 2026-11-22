import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getRepoLanguages, toGitHubError } from '../services/github'
import type { GitHubRepo } from '../types/github'

/** Each repository needs one GitHub request, so the breakdown is capped to protect the 60/hour limit. */
export const MAX_LANGUAGE_REPOS = 20
const BATCH = 5

export type CodeLanguageState =
  | { status: 'idle' }
  | { status: 'loading'; done: number; total: number }
  | { status: 'done'; bytes: Record<string, number>; used: number; total: number; error: GitHubError | null }

/** Loads real per-language byte counts on demand for the first MAX_LANGUAGE_REPOS of `repos` (pass them newest first). */
export function useCodeLanguages(repos: GitHubRepo[]) {
  const [state, setState] = useState<CodeLanguageState>({ status: 'idle' })
  const runId = useRef(0)
  const targets = repos.slice(0, MAX_LANGUAGE_REPOS)
  const signature = targets.map((r) => r.full_name).join('|')
  const targetsRef = useRef(targets)
  targetsRef.current = targets

  // A different set of repositories (e.g. "include forks" toggled) invalidates any result or run in progress.
  useEffect(() => {
    runId.current++
    setState({ status: 'idle' })
  }, [signature])

  useEffect(
    () => () => {
      runId.current++
    },
    [],
  )

  const load = useCallback(async () => {
    const id = ++runId.current
    const list = targetsRef.current
    const bytes: Record<string, number> = {}
    let used = 0
    let failure: GitHubError | null = null
    setState({ status: 'loading', done: 0, total: list.length })

    for (let i = 0; i < list.length && !failure; i += BATCH) {
      const batch = list.slice(i, i + BATCH)
      const results = await Promise.allSettled(batch.map((r) => getRepoLanguages(r.full_name)))
      if (id !== runId.current) return
      for (const res of results) {
        if (res.status === 'fulfilled') {
          used++
          for (const [language, n] of Object.entries(res.value)) bytes[language] = (bytes[language] ?? 0) + n
        } else {
          const err = toGitHubError(res.reason)
          // A repository that disappeared is skipped; rate limits and network problems stop the run.
          if (err.kind !== 'not_found' && !failure) failure = err
        }
      }
      setState({ status: 'loading', done: Math.min(i + BATCH, list.length), total: list.length })
    }

    if (id === runId.current) setState({ status: 'done', bytes, used, total: list.length, error: failure })
  }, [])

  return { state, load, total: targets.length }
}
