import { useEffect, useState } from 'react'
import { GitHubError, getRepos, getUser, toGitHubError } from '../services/github'
import type { UserData } from '../types/github'

export type SideResult = { status: 'ok'; data: UserData } | { status: 'error'; error: GitHubError }
export type CompareState = { status: 'loading' } | { status: 'done'; a: SideResult; b: SideResult }

async function load(username: string): Promise<SideResult> {
  try {
    const [user, repos] = await Promise.all([getUser(username), getRepos(username)])
    return { status: 'ok', data: { user, repos } }
  } catch (err) {
    return { status: 'error', error: toGitHubError(err) }
  }
}

export function useCompare(a: string, b: string): CompareState {
  const [state, setState] = useState<CompareState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    Promise.all([load(a), load(b)]).then(([ra, rb]) => {
      if (!cancelled) setState({ status: 'done', a: ra, b: rb })
    })
    return () => {
      cancelled = true
    }
  }, [a, b])

  return state
}
