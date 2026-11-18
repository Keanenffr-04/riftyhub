import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { RepoCard, RepoTable } from '../components/RepoViews'
import { EmptyState } from '../components/States'
import { MAX_REPO_PAGES } from '../services/github'

type View = 'cards' | 'table'

export default function RepositoriesPage() {
  const { user, repos } = useUserData()
  const [view, setView] = useState<View>('cards')
  const limit = MAX_REPO_PAGES * 100
  const truncated = user.public_repos > repos.length && repos.length >= limit

  return (
    <div className="stack">
      <div className="section-head">
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="muted">
            {repos.length} public {repos.length === 1 ? 'repository' : 'repositories'} by @{user.login}, most
            recently pushed first
          </p>
        </div>
        <div className="toggle" role="group" aria-label="Layout">
          <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}>
            <LayoutGrid size={15} /> Cards
          </button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}>
            <List size={15} /> Table
          </button>
        </div>
      </div>

      {truncated && (
        <p className="notice">
          Showing the first {limit} of {user.public_repos} repositories.
        </p>
      )}

      {repos.length === 0 ? (
        <EmptyState title="No public repositories" body={`@${user.login} hasn’t published any repositories yet.`} />
      ) : view === 'cards' ? (
        <div className="repo-grid">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <RepoTable repos={repos} />
      )}
    </div>
  )
}
