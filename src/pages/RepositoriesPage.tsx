import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, LayoutGrid, List, Search, X } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { usePreferences } from '../hooks/usePreferences'
import { RepoCard, RepoTable } from '../components/RepoViews'
import { EmptyState } from '../components/States'
import { MAX_REPO_PAGES } from '../services/github'
import {
  NO_LICENSE,
  SORT_OPTIONS,
  STAR_OPTIONS,
  UPDATED_OPTIONS,
  applyFilters,
  collectOptions,
  countActiveFilters,
  defaultDir,
  parseFilters,
  serializeFilters,
  type RepoFilters,
  type SortKey,
  type UpdatedWindow,
} from '../utils/repoFilters'

type View = 'cards' | 'table'

interface Chip {
  key: string
  label: string
  clear: Partial<RepoFilters>
}

export default function RepositoriesPage() {
  const { user, repos } = useUserData()
  const [params, setParams] = useSearchParams()
  const { preferences } = usePreferences()
  const [view, setView] = useState<View>(preferences.repoView)

  // Filters live in the URL, so a filtered view can be bookmarked, shared and used with the back button.
  const filters = useMemo(() => parseFilters(params), [params])
  const update = (patch: Partial<RepoFilters>) => setParams(serializeFilters({ ...filters, ...patch }), { replace: true })
  const changeSort = (sort: SortKey) => update({ sort, dir: defaultDir(sort) })
  const clearAll = () => update({ query: '', language: '', topic: '', license: '', minStars: 0, updated: '', hideForks: false, hideArchived: false })

  const limit = MAX_REPO_PAGES * 100
  const truncated = user.public_repos > repos.length && repos.length >= limit

  const options = useMemo(() => collectOptions(repos), [repos])
  const visible = useMemo(() => applyFilters(repos, filters), [repos, filters])
  const activeCount = countActiveFilters(filters)

  const chips: Chip[] = []
  if (filters.query.trim()) chips.push({ key: 'q', label: `Search: “${filters.query.trim()}”`, clear: { query: '' } })
  if (filters.language) chips.push({ key: 'lang', label: `Language: ${filters.language}`, clear: { language: '' } })
  if (filters.topic) chips.push({ key: 'topic', label: `Topic: ${filters.topic}`, clear: { topic: '' } })
  if (filters.license) {
    const name = filters.license === NO_LICENSE ? 'No license' : filters.license
    chips.push({ key: 'license', label: `License: ${name}`, clear: { license: '' } })
  }
  if (filters.minStars) chips.push({ key: 'stars', label: `${filters.minStars}+ stars`, clear: { minStars: 0 } })
  if (filters.updated) {
    const label = UPDATED_OPTIONS.find((o) => o.value === filters.updated)?.label ?? filters.updated
    chips.push({ key: 'updated', label: `Pushed: ${label.toLowerCase()}`, clear: { updated: '' } })
  }
  if (filters.hideForks) chips.push({ key: 'forks', label: 'Forks hidden', clear: { hideForks: false } })
  if (filters.hideArchived) chips.push({ key: 'archived', label: 'Archived hidden', clear: { hideArchived: false } })

  const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? ''
  const directionLabel = filters.dir === 'asc' ? 'ascending' : 'descending'

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

      <div className="card filter-panel">
        <div className="controls">
          <label className="control-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Search name, description, language or topic"
              aria-label="Search repositories by name, description, language or topic"
            />
          </label>
          <select className="select" value={filters.sort} onChange={(e) => changeSort(e.target.value as SortKey)} aria-label="Sort repositories by">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <button
            className="btn icon-only"
            onClick={() => update({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}
            aria-label={`Sorted by ${sortLabel}, ${directionLabel}. Click to reverse.`}
            title={`${directionLabel[0].toUpperCase()}${directionLabel.slice(1)} — click to reverse`}
          >
            {filters.dir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </button>
        </div>

        <div className="controls">
          <select className="select" value={filters.language} onChange={(e) => update({ language: e.target.value })} aria-label="Filter by language">
            <option value="">All languages</option>
            {options.languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {options.topics.length > 0 && (
            <select className="select" value={filters.topic} onChange={(e) => update({ topic: e.target.value })} aria-label="Filter by topic">
              <option value="">All topics</option>
              {options.topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          {(options.licenses.length > 0 || options.hasUnlicensed) && (
            <select className="select" value={filters.license} onChange={(e) => update({ license: e.target.value })} aria-label="Filter by license">
              <option value="">Any license</option>
              {options.licenses.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              {options.hasUnlicensed && <option value={NO_LICENSE}>No license</option>}
            </select>
          )}
          <select className="select" value={filters.minStars} onChange={(e) => update({ minStars: Number(e.target.value) })} aria-label="Minimum stars">
            {STAR_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Any stars' : `${n}+ stars`}
              </option>
            ))}
          </select>
          <select className="select" value={filters.updated} onChange={(e) => update({ updated: e.target.value as UpdatedWindow })} aria-label="Last pushed">
            {UPDATED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === '' ? 'Last pushed: any time' : `Pushed: ${o.label.toLowerCase()}`}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={filters.hideForks} onChange={(e) => update({ hideForks: e.target.checked })} /> Hide forks
          </label>
          <label className="check">
            <input type="checkbox" checked={filters.hideArchived} onChange={(e) => update({ hideArchived: e.target.checked })} /> Hide archived
          </label>
        </div>

        {chips.length > 0 && (
          <div className="chips" aria-label="Active filters">
            {chips.map((c) => (
              <button key={c.key} type="button" className="chip" onClick={() => update(c.clear)} aria-label={`Remove filter: ${c.label}`}>
                {c.label} <X size={13} aria-hidden="true" />
              </button>
            ))}
            {activeCount > 1 && (
              <button type="button" className="chip-clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        )}
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
          {activeCount > 0 && (
            <button className="btn" onClick={clearAll}>
              Clear filters
            </button>
          )}
        </EmptyState>
      ) : view === 'cards' ? (
        <div className="repo-grid">
          {visible.map((repo) => (
            <RepoCard key={repo.id} repo={repo} onTopic={(topic) => update({ topic })} />
          ))}
        </div>
      ) : (
        <RepoTable repos={visible} />
      )}
    </div>
  )
}
