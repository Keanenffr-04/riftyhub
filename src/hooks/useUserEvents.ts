import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, getUserEvents, peekUserEvents, toGitHubError } from '../services/github'
import type { ActivityEvent } from '../types/github'

export type EventsState =
  | { status: 'loading' }
  | { status: 'error'; error: GitHubError }
  | {
      status: 'success'
      events: ActivityEvent[]
      /** Set while saved events are on screen and newer ones are being fetched quietly. */
      refreshing?: boolean
      /** Set when saved events are on screen because the quiet refresh failed. */
      stale?: { storedAt: number; error: GitHubError }
    }

/** A developer's public events. Saved events past their normal lifetime are shown first and refreshed in the background. */
export function useUserEvents(username: string) {
  const [state, setState] = useState<EventsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const forceRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const force = forceRef.current
    forceRef.current = false

    const found = force ? undefined : peekUserEvents(username)
    /** Saved events past their normal lifetime, shown while newer ones load. */
    const stale = found && !found.fresh ? found : undefined
    setState(stale ? { status: 'success', events: stale.events, refreshing: true } : { status: 'loading' })

    getUserEvents(username, force || stale !== undefined)
      .then((events) => {
        if (!cancelled) setState({ status: 'success', events })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = toGitHubError(err)
        if (stale && error.kind !== 'not_found' && error.kind !== 'invalid') {
          setState({ status: 'success', events: stale.events, stale: { storedAt: stale.storedAt, error } })
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

  return { state, retry }
}
