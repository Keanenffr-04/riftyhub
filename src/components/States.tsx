import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GitHubError } from '../services/github'

export function PageSkeleton() {
  return (
    <div className="stack" role="status" aria-live="polite" aria-label="Loading GitHub data">
      <div className="card skeleton-profile">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton-lines">
          <div className="skeleton" style={{ width: '38%', height: 22 }} />
          <div className="skeleton" style={{ width: '22%', height: 14 }} />
          <div className="skeleton" style={{ width: '70%', height: 14 }} />
        </div>
      </div>
      <div className="stats">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 84, borderRadius: 14 }} />
        ))}
      </div>
      <div className="repo-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 132, borderRadius: 14 }} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function describeError(error: GitHubError, subject: string) {
  let title = 'Something went wrong'
  let body = error.message
  let canRetry = true

  switch (error.kind) {
    case 'invalid':
      title = 'That isn’t a valid username'
      body = 'GitHub usernames use letters, numbers and single hyphens, up to 39 characters.'
      canRetry = false
      break
    case 'not_found':
      title = `No GitHub user named “${subject}”`
      body = 'Check the spelling and try again.'
      canRetry = false
      break
    case 'rate_limit': {
      title = 'GitHub rate limit reached'
      const when = error.resetAt
        ? ` You can try again at ${error.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        : ''
      body = `GitHub limits unauthenticated requests.${when}`
      break
    }
    case 'network':
      title = 'Can’t reach GitHub'
      break
  }
  return { title, body, canRetry }
}

interface ErrorProps {
  error: GitHubError
  username: string
  onRetry: () => void
}

export function ErrorState({ error, username, onRetry }: ErrorProps) {
  const { title, body, canRetry } = describeError(error, username)
  const notFound = error.kind === 'not_found' || error.kind === 'invalid'

  return (
    <div className="card state" role="alert">
      <div className="state-icon">{notFound ? <SearchX size={26} /> : <AlertTriangle size={26} />}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="state-actions">
        {canRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            <RefreshCw size={15} /> Try again
          </button>
        )}
        <Link className="btn" to="/">
          Back to search
        </Link>
      </div>
    </div>
  )
}

interface EmptyProps {
  title: string
  body: string
  children?: ReactNode
}

export function EmptyState({ title, body, children }: EmptyProps) {
  return (
    <div className="card state">
      <div className="state-icon">
        <SearchX size={26} />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {children && <div className="state-actions">{children}</div>}
    </div>
  )
}
