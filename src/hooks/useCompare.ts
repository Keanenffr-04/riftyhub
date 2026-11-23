import { useEffect, useState } from 'react'
import { GitHubError, getRepos, getUser, toGitHubError } from '../services/github'
import type { UserData } from '../types/github'

export type SideResult = { status: 'ok'; data: UserData } | { status: 'error'; error: GitHubError }
/** `results` has one entry per developer, in the order they were given. */
export type CompareState = { status: 'loading' } | { status: 'done'; results: SideResult[] }

async function load(username: string): Promise<SideResult> {
  try {
    const [user, repos] = await Promise.all([getUser(username), getRepos(username)])
    return { status: 'ok', data: { user, repos } }
  } catch (err) {
    return { status: 'error', error: toGitHubError(err) }
  }
}

export function useCompare(users: string[]): CompareState {
  const [state, setState] = useState<CompareState>({ status: 'loading' })
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
