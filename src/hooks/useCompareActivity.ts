import { useEffect, useState } from 'react'
import { GitHubError, getUserEvents, toGitHubError } from '../services/github'
import type { ActivityEvent } from '../types/github'

export type ActivitySide = { status: 'ok'; events: ActivityEvent[] } | { status: 'error'; error: GitHubError }
/** `results` has one entry per developer, in the order they were given. */
export type CompareActivityState = { status: 'loading' } | { status: 'done'; results: ActivitySide[] }

async function load(username: string): Promise<ActivitySide> {
  try {
    return { status: 'ok', events: await getUserEvents(username) }
  } catch (err) {
    return { status: 'error', error: toGitHubError(err) }
  }
}

/** Loads public events (up to 3 requests each) for every developer; a failure for one does not stop the others. */
export function useCompareActivity(users: string[]): CompareActivityState {
  const [state, setState] = useState<CompareActivityState>({ status: 'loading' })
  const key = users.join('|')

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    Promise.all(key.split('|').map(load)).then((results) => {
      if (!cancelled) setState({ status: 'done', results })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}
