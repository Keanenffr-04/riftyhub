import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getUserEvents, toGitHubError } from '../services/github'
import type { ActivityEvent } from '../types/github'

export type EventsState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | { status: 'success'; events: ActivityEvent[] }

export function useUserEvents(username: string) {
  const [state, setState] = useState<EventsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const forceRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const force = forceRef.current
    forceRef.current = false
    setState({ status: 'loading' })

    getUserEvents(username, force)
      .then((events) => {
        if (!cancelled) setState({ status: 'success', events })
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
