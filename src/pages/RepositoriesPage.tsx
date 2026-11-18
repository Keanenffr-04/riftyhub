import { useMemo, useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { RepoCard, RepoTable } from '../components/RepoViews'
import { EmptyState } from '../components/States'
import { MAX_REPO_PAGES } from '../services/github'
import type { GitHubRepo } from '../types/github'

type View = 'cards' | 'table'
type SortKey = 'pushed' | 'stars' | 'forks' | 'name'

const pushedAt = (r: GitHubRepo) => Date.parse(r.pushed_at ?? r.updated_at)

const sorters: Record<SortKey, (a: GitHubRepo, b: GitHubRepo) => number> = {
  pushed: (a, b) => pushedAt(b) - pushedAt(a),
  stars: (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
  forks: (a, b) => b.forks_count - a.forks_count || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

export default function RepositoriesPage() {
  const { user, repos } = useUserData()
  const [view, setView] = useState<View>('cards')
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [sort, setSort] = useState<SortKey>('pushed')
  const [hideForks, setHideForks] = useState(false)
  const [hideArchived, setHideArchived] = useState(false)

  const limit = MAX_REPO_PAGES * 100
  const truncated = user.public_repos > repos.length && repos.length >= limit

  const languages = useMemo(
    () => [...new Set(repos.map((r) => r.language).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b)),
    [repos],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return repos
      .filter((r) => !(hideForks && r.fork))
      .filter((r) => !(hideArchived && r.archived))
      .filter((r) => !language || r.language === language)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))
      .sort(sorters[sort])
  }, [repos, query, language, sort, hideForks, hideArchived])

  const filtersActive = query !== '' || language !== '' || hideForks || hideArchived
  const clearFilters = () => {
    setQuery('')
    setLanguage('')
    setHideForks(false)
    setHideArchived(false)
  }

  return (
    <div className="stack">
      <div className="section-head">
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="muted" aria-live="polite">
            Showing {visible.length} of {repos.length} public repositories by @{user.login}
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

      <div className="controls">
        <label className="control-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or description"
            aria-label="Filter repositories by name or description"
          />
        </label>
        <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Filter by language">
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort repositories">
          <option value="pushed">Recently pushed</option>
          <option value="stars">Most stars</option>
          <option value="forks">Most forks</option>
          <option value="name">Name (A–Z)</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={hideForks} onChange={(e) => setHideForks(e.target.checked)} /> Hide forks
        </label>
        <label className="check">
          <input type="checkbox" checked={hideArchived} onChange={(e) => setHideArchived(e.target.checked)} /> Hide archived
        </label>
      </div>

      {truncated && (
        <p className="notice">
          Showing the first {limit} of {user.public_repos} repositories.
        </p>
      )}

      {repos.length === 0 ? (
        <EmptyState title="No public repositories" body={`@${user.login} hasn’t published any repositories yet.`} />
      ) : visible.length === 0 ? (
        <EmptyState title="No repositories match" body="Try a different search or remove a filter.">
          {filtersActive && (
            <button className="btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </EmptyState>
      ) : view === 'cards' ? (
        <div className="repo-grid">
          {visible.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <RepoTable repos={visible} />
      )}
    </div>
  )
}
