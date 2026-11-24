import { useCallback, useEffect, useRef, useState } from 'react'
import { forgetMoreRepos, getMoreRepos, peekMoreRepos, toGitHubError } from '../services/github'
import type { GitHubRepo, MoreReposState } from '../types/github'

type Internal = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; repos: GitHubRepo[] }

/**
 * Loads the repositories beyond the first 300 when asked (the "load the rest" button).
 *
 * Opening a developer whose rest was loaded earlier in this tab brings it back at once; if that
 * saved copy is past its normal lifetime it is refreshed quietly. An explicit refresh of the
 * profile (`resetKey` changes) forgets it and starts again. An answer that arrives after the
 * developer or the key has changed is ignored.
 */
export function useMoreRepos(username: string, resetKey: number) {
  const [state, setState] = useState<Internal>({ status: 'idle' })
  const run = useRef(0)
  const lastKey = useRef(resetKey)

  useEffect(() => {
    const forced = resetKey !== lastKey.current
    lastKey.current = resetKey
    const id = ++run.current
    if (forced) forgetMoreRepos(username)

    // An empty saved list says nothing (the developer may have had few repositories then), so it is not reused.
    const saved = forced ? undefined : peekMoreRepos(username)
    if (!saved || saved.repos.length === 0) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'done', repos: saved.repos })
    if (!saved.fresh) {
      getMoreRepos(username, true)
        .then((repos) => {
          if (run.current === id) setState({ status: 'done', repos })
        })
        .catch(() => {
          /* the saved copy stays */
        })
    }
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
