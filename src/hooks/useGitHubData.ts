import { useCallback, useEffect, useState } from 'react'
import { GitHubError, getRepos, getUser, isValidUsername } from '../services/github'
import type { UserData } from '../types/github'

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | { status: 'success'; data: UserData }

export function useGitHubData(username: string) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isValidUsername(username)) {
      setState({ status: 'error', error: new GitHubError('invalid', 'Invalid GitHub username.') })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })

    Promise.all([getUser(username, controller.signal), getRepos(username, controller.signal)])
      .then(([user, repos]) => {
        if (!controller.signal.aborted) setState({ status: 'success', data: { user, repos } })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error = err instanceof GitHubError ? err : new GitHubError('unknown', 'Something went wrong.')
        setState({ status: 'error', error })
      })

    return () => controller.abort()
  }, [username, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { state, retry }
}
