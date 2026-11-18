import { Bookmark, BookmarkCheck, Building2, Calendar, ExternalLink, Link2, MapPin, RefreshCw, Users } from 'lucide-react'
import type { GitHubUser } from '../types/github'
import { useSavedProfiles } from '../hooks/useSavedProfiles'
import { formatCompact, formatDate, normalizeUrl } from '../utils/format'

export default function ProfileCard({ user, onRefresh }: { user: GitHubUser; onRefresh: () => void }) {
  const { isSaved, toggle } = useSavedProfiles()
  const saved = isSaved(user.login)

  return (
    <section className="card profile" aria-label="Profile">
      <img className="avatar" src={user.avatar_url} alt={`${user.login}'s avatar`} width={96} height={96} />
      <div className="profile-body">
        <div className="profile-title">
          <h1>{user.name ?? user.login}</h1>
          <a className="handle" href={user.html_url} target="_blank" rel="noopener noreferrer">
            @{user.login} <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
        {user.bio && <p className="bio">{user.bio}</p>}
        <ul className="meta">
          {user.location && (
            <li>
              <MapPin size={14} aria-hidden="true" /> {user.location}
            </li>
          )}
          {user.company && (
            <li>
              <Building2 size={14} aria-hidden="true" /> {user.company}
            </li>
          )}
          {user.blog && (
            <li>
              <Link2 size={14} aria-hidden="true" />
              <a href={normalizeUrl(user.blog)} target="_blank" rel="noopener noreferrer">
                {user.blog.replace(/^https?:\/\//i, '')}
              </a>
            </li>
          )}
          <li>
            <Users size={14} aria-hidden="true" /> {formatCompact(user.followers)} followers ·{' '}
            {formatCompact(user.following)} following
          </li>
          <li>
            <Calendar size={14} aria-hidden="true" /> Joined {formatDate(user.created_at)}
          </li>
        </ul>
        <div className="profile-actions">
          <button className={`btn${saved ? ' btn-saved' : ''}`} onClick={() => toggle(user)} aria-pressed={saved}>
            {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {saved ? 'Saved' : 'Save profile'}
          </button>
          <button className="btn" onClick={onRefresh}>
            <RefreshCw size={15} /> Refresh data
          </button>
        </div>
      </div>
    </section>
  )
}
