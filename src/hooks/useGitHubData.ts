import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getRepos, getUser, isValidUsername, peekUserData, toGitHubError } from '../services/github'
import type { UserData } from '../types/github'

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | {
      status: 'success'
      data: UserData
      /** Set while saved data is on screen and a newer copy is being fetched quietly. */
      refreshing?: boolean
      /** Set when saved data is on screen because the quiet refresh failed. */
      stale?: { storedAt: number; error: GitHubError }
    }

/**
 * Loads a developer's profile and repositories.
 *
 * Stale-while-revalidate: if this browser tab already holds data for the developer that is past its
 * normal lifetime, it is shown immediately and a fresh copy is fetched in the background. If that
 * refresh fails (rate limit, offline, …) the saved data stays on screen with a short note.
 */
export function useGitHubData(username: string) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const forceRef = useRef(false)

  useEffect(() => {
    if (!isValidUsername(username)) {
      setState({ status: 'error', error: new GitHubError('invalid', 'Invalid GitHub username.') })
      return
    }

    let cancelled = false
    const force = forceRef.current
    forceRef.current = false

    // An explicit retry always shows the loading state; otherwise saved (possibly stale) data is used first.
    const saved = force ? undefined : peekUserData(username)
    if (saved && !saved.fresh) {
      setState({ status: 'success', data: saved.data, refreshing: true })
    } else {
      setState({ status: 'loading' })
    }

    Promise.all([getUser(username, force || (saved ? !saved.fresh : false)), getRepos(username, force || (saved ? !saved.fresh : false))])
      .then(([user, repos]) => {
        if (!cancelled) setState({ status: 'success', data: { user, repos } })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = toGitHubError(err)
        if (saved && !saved.fresh && error.kind !== 'not_found' && error.kind !== 'invalid') {
          setState({ status: 'success', data: saved.data, stale: { storedAt: saved.storedAt, error } })
        } else {
          setState({ status: 'error', error })
        }
      })

    return () => {
      cancelled = true
    }
  }, [username, attempt])

  /** Re-fetches from GitHub, bypassing the cache. */
  const retry = useCallback(() => {
    forceRef.current = true
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry, attempt }
}
