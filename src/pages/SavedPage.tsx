import { Link } from 'react-router-dom'
import { GitCompare, Trash2 } from 'lucide-react'
import { useSavedProfiles } from '../hooks/useSavedProfiles'
import { EmptyState } from '../components/States'
import { formatDate } from '../utils/format'

export default function SavedPage() {
  const { profiles, remove } = useSavedProfiles()

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Saved profiles</h1>
        <p className="muted">Stored in this browser only.</p>
      </div>

      {profiles.length === 0 ? (
        <EmptyState title="No saved profiles yet" body="Open a profile and choose “Save profile” to keep it here.">
          <Link className="btn btn-primary" to="/">
            Search a username
          </Link>
        </EmptyState>
      ) : (
        <ul className="saved-grid">
          {profiles.map((p) => (
            <li key={p.login} className="card saved-card">
              <Link to={`/u/${encodeURIComponent(p.login)}`} className="saved-link">
                <img src={p.avatar_url} alt="" width={48} height={48} />
                <span>
                  <strong>{p.name ?? p.login}</strong>
                  <span className="muted">@{p.login}</span>
                  <span className="muted small">Saved {formatDate(p.savedAt)}</span>
                </span>
              </Link>
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
    </div>
  )
}
