import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, GitCompare, Pencil, Search, Star, Trash2, X } from 'lucide-react'
import { useSavedProfiles } from '../hooks/useSavedProfiles'
import { EmptyState } from '../components/States'
import { FAVORITES, MAX_COLLECTION_NAME, countFor, inCollection, viewSaved, type SavedSort } from '../utils/saved'
import { formatDate } from '../utils/format'

export default function SavedPage() {
  const { profiles, collections, remove, toggleFavorite, setInCollection, createCollection, renameCollection, deleteCollection } = useSavedProfiles()
  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState('')
  const [sort, setSort] = useState<SavedSort>('recent')
  const [selected, setSelected] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [renameTo, setRenameTo] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // If the active collection was deleted or renamed, fall back to showing everyone.
  const activeCollection = collection && collection !== FAVORITES && !collections.some((c) => c.toLowerCase() === collection.toLowerCase()) ? '' : collection
  const visible = useMemo(() => viewSaved(profiles, { query, collection: activeCollection, sort }), [profiles, query, activeCollection, sort])
  const chosen = selected.filter((login) => profiles.some((p) => p.login === login))
  const canCompare = chosen.length === 2

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    const error = createCollection(newName)
    setMessage(error)
    if (!error) setNewName('')
  }

  function handleRename(e: FormEvent) {
    e.preventDefault()
    if (renameTo === null) return
    const error = renameCollection(activeCollection, renameTo)
    setMessage(error)
    if (!error) {
      setCollection(renameTo.replace(/\s+/g, ' ').trim().slice(0, MAX_COLLECTION_NAME))
      setRenameTo(null)
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete the collection “${activeCollection}”? The profiles stay saved.`)) return
    deleteCollection(activeCollection)
    setCollection('')
    setRenameTo(null)
  }

  const toggleSelected = (login: string) =>
    setSelected((s) => (s.includes(login) ? s.filter((l) => l !== login) : [...s, login]))

  const filters = [
    { value: '', label: 'All' },
    { value: FAVORITES, label: 'Favourites' },
    ...collections.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Saved profiles</h1>
        <p className="muted">Stored in this browser only. Use favourites and collections to organise them, and back them up from Settings.</p>
      </div>

      {profiles.length === 0 ? (
        <EmptyState title="No saved profiles yet" body="Open a profile and choose “Save profile” to keep it here.">
          <Link className="btn btn-primary" to="/">
            Search a username
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="card filter-panel">
            <div className="controls">
              <label className="control-search">
                <Search size={15} aria-hidden="true" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved profiles" aria-label="Search saved profiles" />
              </label>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SavedSort)} aria-label="Sort saved profiles">
                <option value="recent">Sort: Recently saved</option>
                <option value="favorites">Sort: Favourites first</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
              {canCompare ? (
                <Link className="btn btn-primary" to={`/compare?a=${encodeURIComponent(chosen[0])}&b=${encodeURIComponent(chosen[1])}`}>
                  <GitCompare size={15} /> Compare selected
                </Link>
              ) : (
                <span className="muted small">{chosen.length === 0 ? 'Tick two profiles to compare them' : `${chosen.length} selected: pick exactly two to compare`}</span>
              )}
            </div>

            <div className="chips" role="group" aria-label="Filter by collection">
              {filters.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  className={`chip filter-chip${activeCollection === f.value ? ' active' : ''}`}
                  aria-pressed={activeCollection === f.value}
                  onClick={() => {
                    setCollection(f.value)
                    setRenameTo(null)
                    setMessage(null)
                  }}
                >
                  {f.value === FAVORITES && <Star size={12} aria-hidden="true" />} {f.label} <span className="chip-count">{countFor(profiles, f.value)}</span>
                </button>
              ))}
            </div>

            <form className="controls" onSubmit={handleCreate}>
              <input
                className="inline-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={MAX_COLLECTION_NAME}
                placeholder="New collection name"
                aria-label="New collection name"
              />
              <button type="submit" className="btn">
                Create collection
              </button>
              {activeCollection && activeCollection !== FAVORITES && renameTo === null && (
                <>
                  <button type="button" className="btn" onClick={() => setRenameTo(activeCollection)}>
                    <Pencil size={14} /> Rename
                  </button>
                  <button type="button" className="btn" onClick={handleDelete}>
                    <Trash2 size={14} /> Delete collection
                  </button>
                </>
              )}
            </form>

            {activeCollection && activeCollection !== FAVORITES && renameTo !== null && (
              <form className="controls" onSubmit={handleRename}>
                <input className="inline-input" type="text" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} maxLength={MAX_COLLECTION_NAME} aria-label="New name for this collection" />
                <button type="submit" className="btn btn-primary">
                  <Check size={14} /> Save name
                </button>
                <button type="button" className="btn" onClick={() => setRenameTo(null)}>
                  <X size={14} /> Cancel
                </button>
              </form>
            )}

            {message && (
              <p className="field-error" role="alert">
                {message}
              </p>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState title="No profiles match" body="Try another search or choose a different collection." />
          ) : (
            <ul className="saved-grid">
              {visible.map((p) => (
                <li key={p.login} className="card saved-card">
                  <div className="saved-top">
                    <label className="select-box">
                      <input type="checkbox" checked={chosen.includes(p.login)} onChange={() => toggleSelected(p.login)} />
                      <span className="sr-only">Select @{p.login} for comparison</span>
                    </label>
                    <Link to={`/u/${encodeURIComponent(p.login)}`} className="saved-link">
                      <img src={p.avatar_url} alt="" width={48} height={48} loading="lazy" decoding="async" />
                      <span>
                        <strong>{p.name ?? p.login}</strong>
                        <span className="muted">@{p.login}</span>
                        <span className="muted small">Saved {formatDate(p.savedAt)}</span>
                      </span>
                    </Link>
                    <button
                      className={`icon-btn fav-btn${p.favorite ? ' on' : ''}`}
                      onClick={() => toggleFavorite(p.login)}
                      aria-pressed={!!p.favorite}
                      aria-label={p.favorite ? `Remove @${p.login} from favourites` : `Add @${p.login} to favourites`}
                      title={p.favorite ? 'Favourite' : 'Add to favourites'}
                    >
                      <Star size={18} fill={p.favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {(p.collections ?? []).length > 0 && (
                    <div className="pills">
                      {(p.collections ?? []).map((c) => (
                        <span key={c} className="tag">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <details className="menu">
                    <summary>Collections</summary>
                    {collections.length === 0 ? (
                      <p className="muted small">Create a collection above, then add this profile to it.</p>
                    ) : (
                      <div className="menu-panel">
                        {collections.map((c) => (
                          <label key={c} className="check">
                            <input type="checkbox" checked={inCollection(p, c)} onChange={(e) => setInCollection(p.login, c, e.target.checked)} /> {c}
                          </label>
                        ))}
                      </div>
                    )}
                  </details>

                  <div className="saved-actions">
                    <Link className="btn" to={`/compare?a=${encodeURIComponent(p.login)}`}>
                      <GitCompare size={15} /> Compare
                    </Link>
                    <button className="btn" onClick={() => remove(p.login)} aria-label={`Remove ${p.login} from saved profiles`}>
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
