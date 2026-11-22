import { useState, type FormEvent } from 'react'
import { GitCommitHorizontal, Search } from 'lucide-react'
import { useCommitSearch } from '../hooks/useCommitSearch'
import { describeError } from './States'
import { COMMIT_PAGE_SIZE, MAX_COMMIT_PAGES, type CommitQuery } from '../services/github'
import { formatNumber, timeAgo } from '../utils/format'
import type { GitHubRepo } from '../types/github'

const WINDOWS: { value: '' | '30d' | '90d' | '1y'; label: string; days: number }[] = [
  { value: '', label: 'All time', days: 0 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '1y', label: 'Last year', days: 365 },
]

const sinceDate = (days: number): string => (days === 0 ? '' : new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10))
const EMPTY: CommitQuery = { text: '', repo: '', since: '' }

export default function CommitExplorer({ username, repos }: { username: string; repos: GitHubRepo[] }) {
  const [text, setText] = useState('')
  const [repo, setRepo] = useState('')
  const [range, setRange] = useState<'' | '30d' | '90d' | '1y'>('')
  const { state, run, loadMore, canLoadMore } = useCommitSearch(username, EMPTY)

  const search = (e?: FormEvent) => {
    e?.preventDefault()
    const days = WINDOWS.find((w) => w.value === range)?.days ?? 0
    run({ text, repo, since: sinceDate(days) })
  }
  const reset = () => {
    setText('')
    setRepo('')
    setRange('')
    run(EMPTY)
  }

  const repoOptions = [...repos].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section className="card panel" aria-labelledby="explorer-heading">
      <h2 id="explorer-heading">Commit explorer</h2>
      <p className="muted small">Search every public commit authored by @{username} with GitHub’s commit search.</p>

      <form className="controls" onSubmit={search}>
        <label className="control-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search commit messages"
            aria-label="Search commit messages"
          />
        </label>
        <select className="select" value={repo} onChange={(e) => setRepo(e.target.value)} aria-label="Filter by repository">
          <option value="">All repositories</option>
          {repoOptions.map((r) => (
            <option key={r.id} value={r.full_name}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="select" value={range} onChange={(e) => setRange(e.target.value as typeof range)} aria-label="Filter by date">
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
      </form>

      {state.status === 'loading' && (
        <div className="stack" style={{ gap: 10 }} role="status" aria-label="Loading commits">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="card inline-error" role="alert">
          <p>
            <strong>{describeError(state.error!, username).title}.</strong> Commits couldn’t be loaded.
          </p>
          <button className="btn" onClick={() => search()}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' &&
        (state.commits.length === 0 ? (
          <p className="muted">No commits match this search.</p>
        ) : (
          <>
            <p className="muted small" aria-live="polite">
              Showing {formatNumber(state.commits.length)} of {formatNumber(state.total)} matching commits.
              {state.incomplete && ' GitHub says these results may be incomplete.'}
            </p>
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
            {state.error && (
              <p className="small notice-inline" role="alert">
                {describeError(state.error, username).title}. You can try loading more again.
              </p>
            )}
            <div className="explorer-foot">
              {canLoadMore && (
                <button className="btn" onClick={loadMore} disabled={state.loadingMore}>
                  {state.loadingMore ? 'Loading…' : `Load ${COMMIT_PAGE_SIZE} more`}
                </button>
              )}
              {!canLoadMore && state.total > state.commits.length && (
                <p className="muted small">
                  Showing the first {MAX_COMMIT_PAGES * COMMIT_PAGE_SIZE} results. Narrow the search by repository or date to see others.
                </p>
              )}
              <p className="muted small">GitHub’s commit search can omit some commits, and allows about 10 searches per minute without a token.</p>
            </div>
          </>
        ))}
    </section>
  )
}
