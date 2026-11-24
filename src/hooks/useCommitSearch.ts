import { useCallback, useEffect, useRef, useState } from 'react'
import { GitHubError, MAX_COMMIT_PAGES, peekCommitSearch, searchCommits, toGitHubError, type CommitQuery } from '../services/github'
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
  /** Set while saved results are on screen and newer ones are being fetched quietly. */
  refreshing?: boolean
  /** Set when saved results are on screen because the quiet refresh failed. */
  stale?: { storedAt: number; error: GitHubError }
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
      // Saved results past their normal lifetime are shown first and refreshed in the background.
      const found = peekCommitSearch(username, query, 1)
      const old = found && !found.fresh ? found : undefined
      const savedState: CommitSearchState | undefined = old && {
        status: 'success',
        commits: old.result.commits,
        total: old.result.total,
        page: 1,
        incomplete: old.result.incomplete,
        error: null,
        loadingMore: false,
      }
      setState(savedState ? { ...savedState, refreshing: true } : INITIAL)
      searchCommits(username, query, 1, old !== undefined)
        .then((res) => {
          if (id === runId.current)
            setState({ status: 'success', commits: res.commits, total: res.total, page: 1, incomplete: res.incomplete, error: null, loadingMore: false })
        })
        .catch((err: unknown) => {
          if (id !== runId.current) return
          const error = toGitHubError(err)
          if (savedState && old && error.kind !== 'not_found' && error.kind !== 'invalid') {
            setState({ ...savedState, stale: { storedAt: old.storedAt, error } })
          } else {
            setState({ ...INITIAL, status: 'error', error })
          }
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

  /** Re-runs the current search, bypassing saved results. */
  const retry = useCallback(() => run(queryRef.current), [run])

  return { state, run, loadMore, canLoadMore, retry }
}
