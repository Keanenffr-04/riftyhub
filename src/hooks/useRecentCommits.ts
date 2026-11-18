import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getRecentCommits, toGitHubError } from '../services/github'
import type { GitHubCommit } from '../types/github'

export type CommitsState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | { status: 'success'; commits: GitHubCommit[] }

export function useRecentCommits(username: string) {
  const [state, setState] = useState<CommitsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const forceRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const force = forceRef.current
    forceRef.current = false
    setState({ status: 'loading' })

    getRecentCommits(username, force)
      .then((commits) => {
        if (!cancelled) setState({ status: 'success', commits })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toGitHubError(err) })
      })

    return () => {
      cancelled = true
    }
  }, [username, attempt])

  const retry = useCallback(() => {
    forceRef.current = true
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
