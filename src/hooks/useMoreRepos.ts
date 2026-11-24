import { useCallback, useEffect, useRef, useState } from 'react'
import { getMoreRepos, toGitHubError } from '../services/github'
import type { GitHubRepo, MoreReposState } from '../types/github'

type Internal = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; repos: GitHubRepo[] }

/**
 * Loads the repositories beyond the first 300 when asked (the "load the rest" button). It starts
 * over (idle) when the developer changes or the profile is explicitly refreshed (`resetKey`), and
 * ignores an answer that arrives after that.
 */
export function useMoreRepos(username: string, resetKey: number) {
  const [state, setState] = useState<Internal>({ status: 'idle' })
  const run = useRef(0)

  useEffect(() => {
    run.current++
    setState({ status: 'idle' })
  }, [username, resetKey])

  const load = useCallback(() => {
    const id = ++run.current
    setState({ status: 'loading' })
    getMoreRepos(username)
      .then((repos) => {
        if (run.current === id) setState({ status: 'done', repos })
      })
      .catch((err: unknown) => {
        if (run.current === id) setState({ status: 'error', message: toGitHubError(err).message })
      })
  }, [username])

  const view: MoreReposState = state.status === 'done' ? { status: 'done' } : state
  return { state: view, extra: state.status === 'done' ? state.repos : null, load }
}
