import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, LayoutGrid, List, Save, Search, X } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { usePreferences } from '../hooks/usePreferences'
import { usePresets } from '../hooks/usePresets'
import { usePins } from '../hooks/usePins'
import { MAX_PINS } from '../utils/pins'
import { RepoCard, RepoTable } from '../components/RepoViews'
import { EmptyState } from '../components/States'
import { MAX_REPO_PAGES } from '../services/github'
import { baseFilters } from '../utils/preferences'
import { MAX_PRESET_NAME, type FilterPreset } from '../utils/presets'
import { parseQuery } from '../utils/searchQuery'
import {
  NO_LICENSE,
  SORT_OPTIONS,
  STAR_OPTIONS,
  UPDATED_OPTIONS,
  applyFilters,
  collectOptions,
  countActiveFilters,
  defaultDirFor,
  parseFilters,
  serializeFilters,
  type RepoFilters,
  type SortKey,
  type UpdatedWindow,
} from '../utils/repoFilters'

type View = 'cards' | 'table'

/** Only this many repositories are drawn at a time, so very large accounts stay fast. */
const PAGE_SIZE: Record<View, number> = { cards: 24, table: 50 }
const SEARCH_DELAY_MS = 250

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
  // Anything the address does not mention starts from the defaults chosen in Settings.
  const base = useMemo(() => baseFilters(preferences.repoDefaults), [preferences.repoDefaults])
  const filters = useMemo(() => parseFilters(params, base), [params, base])
  const update = (patch: Partial<RepoFilters>) => setParams(serializeFilters({ ...filters, ...patch }, base), { replace: true })
  const changeSort = (sort: SortKey) => update({ sort, dir: defaultDirFor(sort, base) })
  const sortByColumn = (sort: SortKey) => (sort === filters.sort ? update({ dir: filters.dir === 'asc' ? 'desc' : 'asc' }) : changeSort(sort))

  // Saved filter presets. A preset is a complete view, so it is read against the built-in defaults.
  const { presets, save: savePreset, remove: removePreset } = usePresets()
  const currentView = serializeFilters(filters).toString()
  const canonical = (p: FilterPreset) => serializeFilters(parseFilters(new URLSearchParams(p.params))).toString()
  const applyPreset = (p: FilterPreset) => setParams(serializeFilters(parseFilters(new URLSearchParams(p.params)), base), { replace: true })
  const [naming, setNaming] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetNote, setPresetNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  function handleSavePreset(e: FormEvent) {
    e.preventDefault()
    const result = savePreset(presetName, currentView)
    if (!result.ok) {
      setPresetNote({ kind: 'error', text: result.error })
      return
    }
    setPresetNote({ kind: 'ok', text: result.replaced ? `Preset “${presetName.trim()}” updated.` : `Preset “${presetName.trim()}” saved.` })
    setNaming(false)
    setPresetName('')
  }

  // Pinned repositories (shown on this developer's Overview).
  const pins = usePins(user.login)
  const [pinNote, setPinNote] = useState('')
  function togglePinned(name: string) {
    const result = pins.toggle(name)
    setPinNote(
      result === 'full'
        ? `You can pin up to ${MAX_PINS} repositories per developer. Unpin one first.`
        : result === 'pinned'
          ? `Pinned ${name}. It now appears on the Overview.`
          : `Unpinned ${name}.`,
    )
  }

  const parsedQuery = useMemo(() => parseQuery(filters.query), [filters.query])
  const clearAll = () => update({ query: '', language: '', topic: '', license: '', minStars: 0, updated: '', hideForks: false, hideArchived: false })

  // The search box keeps its own text and updates the URL shortly after typing stops.
  const [text, setText] = useState(filters.query)
  const pushedQuery = useRef(filters.query)
  const latestUpdate = useRef(update) // always the newest version, so a delayed search never undoes a filter changed meanwhile
  latestUpdate.current = update
  useEffect(() => {
    if (filters.query !== pushedQuery.current) {
      // The query changed from outside the box (a chip or "Clear all"), so follow it.
      pushedQuery.current = filters.query
      setText(filters.query)
    }
  }, [filters.query])
  useEffect(() => {
    if (text === pushedQuery.current) return
    const timer = setTimeout(() => {
      pushedQuery.current = text
      latestUpdate.current({ query: text })
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const [pages, setPages] = useState(1)
  const filterKey = params.toString()
  useEffect(() => {
    setPages(1)
  }, [filterKey, view])

  const limit = MAX_REPO_PAGES * 100
  const truncated = user.public_repos > repos.length && repos.length >= limit

  const options = useMemo(() => collectOptions(repos), [repos])
  const visible = useMemo(() => applyFilters(repos, filters), [repos, filters])
  const activeCount = countActiveFilters(filters)
  const shownRepos = useMemo(() => visible.slice(0, pages * PAGE_SIZE[view]), [visible, pages, view])

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
          <p className="muted small" role="status">
            {pinNote}
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search, or try stars:>100 lang:python"
              aria-label="Search repositories. Words match name, description, language or topic; operators such as stars:>100 narrow the list."
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

        {parsedQuery.ignored.length > 0 && (
          <p className="small notice-inline" role="status">
            Not understood, so ignored: {parsedQuery.ignored.join(', ')}. Open “Search tips” for the supported forms.
          </p>
        )}
        <details className="op-help">
          <summary>Search tips</summary>
          <p className="muted small">Plain words must appear in the name, description, language or topics. Operators narrow the list further and can be combined. Put a minus in front to exclude (-is:fork).</p>
          <ul className="op-list small">
            <li><code>stars:&gt;100</code> <code>forks:&lt;=5</code> <code>issues:0</code> <code>stars:10..50</code> numbers: more than, at most, exactly, a range</li>
            <li><code>lang:python</code> <code>lang:&quot;jupyter notebook&quot;</code> <code>lang:none</code> language</li>
            <li><code>topic:react</code> <code>license:mit</code> <code>license:none</code> topic and license</li>
            <li><code>is:fork</code> <code>is:source</code> <code>is:archived</code> kind of repository</li>
            <li><code>pushed:&gt;2024-06-01</code> <code>created:2023</code> <code>pushed:2024-01..2024-06</code> dates: a day, month or year</li>
            <li><code>name:api</code> <code>desc:cli</code> only the name or only the description</li>
          </ul>
        </details>

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

        <div className="presets">
          <span className="muted small" id="presets-label">
            Presets
          </span>
          {presets.length === 0 && !naming && <span className="muted small">None yet. Set up a search, then save it here.</span>}
          {presets.length > 0 && (
            <ul className="preset-list" aria-labelledby="presets-label">
              {presets.map((p) => {
                const active = canonical(p) === currentView
                return (
                  <li key={p.id} className={`preset${active ? ' active' : ''}`}>
                    <button type="button" className="preset-apply" onClick={() => applyPreset(p)} aria-pressed={active}>
                      {p.name}
                    </button>
                    <button type="button" className="preset-delete" onClick={() => removePreset(p.id)} aria-label={`Delete preset ${p.name}`}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {naming ? (
            <form className="preset-form" onSubmit={handleSavePreset}>
              <label className="sr-only" htmlFor="preset-name">
                Preset name
              </label>
              <input id="preset-name" className="text-input" value={presetName} maxLength={MAX_PRESET_NAME} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" autoFocus />
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" className="btn" onClick={() => setNaming(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={currentView === ''}
              onClick={() => {
                setPresetNote(null)
                setNaming(true)
              }}
              title={currentView === '' ? 'Change a filter or the sort first' : undefined}
            >
              <Save size={14} /> Save current view
            </button>
          )}
        </div>
        {presetNote && (
          <p className={presetNote.kind === 'error' ? 'field-error' : 'muted small'} role={presetNote.kind === 'error' ? 'alert' : 'status'}>
            {presetNote.text}
          </p>
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
          {shownRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} onTopic={(topic) => update({ topic })} pinned={pins.isPinned(repo.name)} onTogglePin={() => togglePinned(repo.name)} />
          ))}
        </div>
      ) : (
        <RepoTable repos={shownRepos} sort={filters.sort} dir={filters.dir} onSort={sortByColumn} isPinned={(r) => pins.isPinned(r.name)} onTogglePin={(r) => togglePinned(r.name)} />
      )}

      {visible.length > shownRepos.length && (
        <div className="load-more">
          <p className="muted small" aria-live="polite">
            Showing {shownRepos.length} of {visible.length} matching repositories.
          </p>
          <button className="btn" onClick={() => setPages((n) => n + 1)}>
            Show {Math.min(PAGE_SIZE[view], visible.length - shownRepos.length)} more
          </button>
        </div>
      )}
    </div>
  )
}
