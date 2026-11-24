import { useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useGitHubData } from '../hooks/useGitHubData'
import { useMoreRepos } from '../hooks/useMoreRepos'
import { ErrorState, PageSkeleton } from './States'
import RefreshNote from './RefreshNote'
import UserTabs from './UserTabs'
import { mergeRepos } from '../utils/repoPages'
import type { UserContext } from '../types/github'

export default function UserLayout() {
  const { username = '' } = useParams()
  const { state, retry, attempt } = useGitHubData(username)
  const more = useMoreRepos(username, attempt)

  // The first 300 repositories, plus the rest once the button has loaded them.
  const base = state.status === 'success' ? state.data.repos : null
  const repos = useMemo(() => (base && more.extra ? mergeRepos(base, more.extra) : base), [base, more.extra])

  if (state.status === 'loading') return <PageSkeleton />
  if (state.status === 'error') return <ErrorState error={state.error} username={username} onRetry={retry} />
  const allRepos = repos ?? state.data.repos
  const context: UserContext = { ...state.data, repos: allRepos, refresh: retry, moreRepos: more.state, loadMoreRepos: more.load }
  return (
    <div className="user-page">
      <RefreshNote state={state} onRetry={retry} />
      <UserTabs username={username} user={state.data.user} repoCount={allRepos.length} />
      <Outlet context={context} />
    </div>
  )
}

export function useUserData() {
  return useOutletContext<UserContext>()
}
