import { useEffect } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useGitHubData } from '../hooks/useGitHubData'
import { ErrorState, PageSkeleton } from './States'
import type { UserData } from '../types/github'

export default function UserLayout() {
  const { username = '' } = useParams()
  const { state, retry } = useGitHubData(username)

  useEffect(() => {
    document.title = `${username} · RiftyHub`
    return () => {
      document.title = 'RiftyHub'
    }
  }, [username])

  if (state.status === 'loading') return <PageSkeleton />
  if (state.status === 'error') return <ErrorState error={state.error} username={username} onRetry={retry} />
  return <Outlet context={state.data} />
}

export function useUserData() {
  return useOutletContext<UserData>()
}
