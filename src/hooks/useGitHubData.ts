import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getRepos, getUser, isValidUsername, toGitHubError } from '../services/github'
import type { UserData } from '../types/github'

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | { status: 'success'; data: UserData }

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
    setState({ status: 'loading' })

    Promise.all([getUser(username, force), getRepos(username, force)])
      .then(([user, repos]) => {
        if (!cancelled) setState({ status: 'success', data: { user, repos } })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toGitHubError(err) })
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

  return { state, retry }
}
