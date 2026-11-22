import { Link } from 'react-router-dom'
import { GitCommitHorizontal, RefreshCw } from 'lucide-react'
import { useRecentCommits } from '../hooks/useRecentCommits'
import { describeError } from './States'
import { timeAgo } from '../utils/format'

export default function RecentCommits({ username }: { username: string }) {
  const { state, retry } = useRecentCommits(username)

  return (
    <section aria-labelledby="commits-heading">
      <div className="section-head">
        <h2 id="commits-heading">Recent commits</h2>
        <Link to="activity">Explore activity</Link>
      </div>

      {state.status === 'loading' && (
        <div className="stack" style={{ gap: 10 }} role="status" aria-label="Loading recent commits">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="card inline-error" role="alert">
          <p>
            <strong>{describeError(state.error, username).title}.</strong> Recent commits couldn’t be loaded.
          </p>
          <button className="btn" onClick={retry}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {state.status === 'success' &&
        (state.commits.length === 0 ? (
          <p className="muted">No public commits found for @{username}.</p>
        ) : (
          <>
            <ul className="card commit-list">
              {state.commits.map((c) => (
                <li key={c.sha}>
                  <GitCommitHorizontal size={18} aria-hidden="true" className="commit-icon" />
                  <div className="commit-main">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="commit-msg">
                      {c.message || '(no message)'}
                    </a>
                    <span className="muted">
                      {c.repo} · {c.sha.slice(0, 7)}
                    </span>
                  </div>
                  <time className="muted nowrap" dateTime={c.date}>
                    {timeAgo(c.date)}
                  </time>
                </li>
              ))}
            </ul>
            <p className="muted small">Found with GitHub’s commit search, which can omit some commits.</p>
          </>
        ))}
    </section>
  )
}
