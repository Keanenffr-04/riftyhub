import { useEffect, useState } from 'react'
import { GitHubError, getUserEvents, peekUserEvents, toGitHubError } from '../services/github'
import type { ActivityEvent } from '../types/github'

export type ActivitySide = { status: 'ok'; events: ActivityEvent[] } | { status: 'error'; error: GitHubError }
/** `results` has one entry per developer, in the order they were given. */
export type CompareActivityState =
  | { status: 'loading' }
  | {
      status: 'done'
      results: ActivitySide[]
      /** Set while saved events are on screen and newer ones are being fetched quietly. */
      refreshing?: boolean
      /** Set when saved events are on screen because the quiet refresh failed (oldest saved copy). */
      stale?: { storedAt: number; error: GitHubError }
    }

type Saved = ReturnType<typeof peekUserEvents>
type Loaded = { side: ActivitySide; stale?: { storedAt: number; error: GitHubError } }

async function load(username: string, saved: Saved): Promise<Loaded> {
  const old = saved && !saved.fresh ? saved : undefined
  try {
    return { side: { status: 'ok', events: await getUserEvents(username, old !== undefined) } }
  } catch (err) {
    const error = toGitHubError(err)
    if (old && error.kind !== 'not_found' && error.kind !== 'invalid') {
      return { side: { status: 'ok', events: old.events }, stale: { storedAt: old.storedAt, error } }
    }
    return { side: { status: 'error', error } }
  }
}

/**
 * Loads public events (up to 3 requests each) for every developer; a failure for one does not stop the others.
 * When every developer already has saved events and some are past their normal lifetime, the saved events
 * are shown first and refreshed in the background.
 */
export function useCompareActivity(users: string[]): CompareActivityState {
  const [state, setState] = useState<CompareActivityState>({ status: 'loading' })
  const key = users.join('|')

  useEffect(() => {
    let cancelled = false
    const names = key.split('|')
    const found = names.map((n) => peekUserEvents(n))
    const allSaved = found.every((f) => f !== undefined)
    const showSaved = allSaved && found.some((f) => f && !f.fresh)
    setState(
      showSaved
        ? { status: 'done', results: found.map((f) => ({ status: 'ok' as const, events: f!.events })), refreshing: true }
        : { status: 'loading' },
    )
    Promise.all(names.map((n, i) => load(n, allSaved ? found[i] : undefined))).then((loaded) => {
      if (cancelled) return
      const stales = loaded.flatMap((l) => (l.stale ? [l.stale] : []))
      const oldest = stales.sort((a, b) => a.storedAt - b.storedAt)[0]
      setState({ status: 'done', results: loaded.map((l) => l.side), ...(oldest ? { stale: oldest } : {}) })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}
