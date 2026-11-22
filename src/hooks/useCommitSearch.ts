import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, MAX_COMMIT_PAGES, searchCommits, toGitHubError, type CommitQuery } from '../services/github'
import type { GitHubCommit } from '../types/github'

export interface CommitSearchState {
  status: 'loading' | 'success' | 'error'
  commits: GitHubCommit[]
  total: number
  page: number
  incomplete: boolean
  error: GitHubError | null
  /** True while an additional page is being appended to existing results. */
  loadingMore: boolean
}

const INITIAL: CommitSearchState = { status: 'loading', commits: [], total: 0, page: 0, incomplete: false, error: null, loadingMore: false }

export function useCommitSearch(username: string, initial: CommitQuery) {
  const [state, setState] = useState<CommitSearchState>(INITIAL)
  const queryRef = useRef<CommitQuery>(initial)
  const runId = useRef(0)

  const run = useCallback(
    (query: CommitQuery) => {
      const id = ++runId.current
      queryRef.current = query
      setState(INITIAL)
      searchCommits(username, query, 1)
        .then((res) => {
          if (id === runId.current)
            setState({ status: 'success', commits: res.commits, total: res.total, page: 1, incomplete: res.incomplete, error: null, loadingMore: false })
        })
        .catch((err: unknown) => {
          if (id === runId.current) setState({ ...INITIAL, status: 'error', error: toGitHubError(err) })
        })
    },
    [username],
  )

  const loadMore = useCallback(() => {
    const id = runId.current
    setState((s) => ({ ...s, loadingMore: true, error: null }))
    const nextPage = state.page + 1
    searchCommits(username, queryRef.current, nextPage)
      .then((res) => {
        if (id !== runId.current) return
        setState((s) => ({ ...s, commits: [...s.commits, ...res.commits], page: nextPage, incomplete: res.incomplete, loadingMore: false }))
      })
      .catch((err: unknown) => {
        if (id === runId.current) setState((s) => ({ ...s, loadingMore: false, error: toGitHubError(err) }))
      })
  }, [username, state.page])

  // Load the newest commits when the page opens or the user changes.
  useEffect(() => {
    run(initial)
    return () => {
      runId.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  const canLoadMore = state.status === 'success' && state.page < MAX_COMMIT_PAGES && state.commits.length < state.total

  return { state, run, loadMore, canLoadMore }
}
