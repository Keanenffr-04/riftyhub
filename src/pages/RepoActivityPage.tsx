import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, RefreshCw, Star, GitFork } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { useUserEvents } from '../hooks/useUserEvents'
import { ActivityChart } from '../components/Charts'
import EventTimeline from '../components/EventTimeline'
import RefreshNote from '../components/RefreshNote'
import { describeError } from '../components/States'
import { KIND_FILTERS, eventsByDay, groupByDay, repoEvents, summarizeActivity } from '../utils/activity'
import { formatNumber, timeAgo } from '../utils/format'
import type { ActivityKind } from '../types/github'

const PAGE = 40

/** Recent public activity in one repository, taken from the developer's public events. */
export default function RepoActivityPage() {
  const { repo: repoParam = '' } = useParams()
  const { user, repos } = useUserData()
  const { state, retry } = useUserEvents(user.login)
  const [kind, setKind] = useState<ActivityKind | ''>('')
  const [shown, setShown] = useState(PAGE)

  const name = (() => {
    try {
      return decodeURIComponent(repoParam)
    } catch {
      return repoParam
    }
  })()
  const repo = useMemo(() => repos.find((r) => r.name.toLowerCase() === name.toLowerCase()), [repos, name])

  const allEvents = state.status === 'success' ? state.events : []
  const events = useMemo(() => (repo ? repoEvents(allEvents, repo.full_name) : []), [allEvents, repo])
  const summary = useMemo(() => summarizeActivity(events), [events])
  const oldestLoaded = useMemo(() => (allEvents.length ? Math.min(...allEvents.map((e) => Date.parse(e.createdAt))) : undefined), [allEvents])
  const daily = useMemo(() => eventsByDay(events, 90, new Date(), oldestLoaded), [events, oldestLoaded])
  const filtered = useMemo(() => events.filter((e) => !kind || e.kind === kind), [events, kind])
  const groups = useMemo(() => groupByDay(filtered.slice(0, shown)), [filtered, shown])

  const crumbs = (
    <nav aria-label="Breadcrumb">
      <p className="crumbs">
        <Link to={`/u/${encodeURIComponent(user.login)}/repos`}>Repositories</Link> <span aria-hidden="true">/</span> <span aria-current="page">{name}</span>
      </p>
    </nav>
  )

  if (!repo) {
    return (
      <div className="stack">
        {crumbs}
        <div className="card inline-error" role="alert">
          <p>
            <strong>No repository named “{name}” for @{user.login}.</strong> It may have been renamed or deleted, or be one of the repositories RiftyHub has not loaded (it loads 300 at first; the Repositories page can load more).
          </p>
          <Link className="btn" to={`/u/${encodeURIComponent(user.login)}/repos`}>
            Back to repositories
          </Link>
        </div>
      </div>
    )
  }

  const tiles = [
    { label: 'Public events', value: formatNumber(summary.total) },
    { label: 'Commits pushed', value: formatNumber(summary.commits) },
    { label: 'Pull request events', value: formatNumber(summary.pullRequests) },
    { label: 'Issue events', value: formatNumber(summary.issues) },
    { label: 'Reviews and comments', value: formatNumber(summary.discussion) },
    { label: 'Active days', value: formatNumber(summary.activeDays) },
  ]

  return (
    <div className="stack">
      {crumbs}
      <div className="repo-head">
        <h1 className="page-title">{repo.name}</h1>
        {repo.description && <p className="muted">{repo.description}</p>}
        <div className="repo-head-meta muted small">
          <span className="stat" title="Stars">
            <Star size={14} aria-hidden="true" /> {formatNumber(repo.stargazers_count)}
            <span className="sr-only"> stars</span>
          </span>
          <span className="stat" title="Forks">
            <GitFork size={14} aria-hidden="true" /> {formatNumber(repo.forks_count)}
            <span className="sr-only"> forks</span>
          </span>
          <span>Last push {timeAgo(repo.pushed_at ?? repo.updated_at)}</span>
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            Open on GitHub <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="stack" role="status" aria-label="Loading activity">
          <div className="stats">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 84, borderRadius: 14 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 260, borderRadius: 14 }} />
        </div>
      )}

      {state.status === 'error' && (
        <div className="card inline-error" role="alert">
          <p>
            <strong>{describeError(state.error, user.login).title}.</strong> Recent activity couldn’t be loaded.
          </p>
          <button className="btn" onClick={retry}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {state.status === 'success' && <RefreshNote state={state} onRetry={retry} />}

      {state.status === 'success' && events.length === 0 && (
        <div className="card panel">
          <p>
            No public activity by @{user.login} in <strong>{repo.name}</strong> shows up in the events GitHub shares, which cover at most the last 90 days and 300 events across all repositories.
          </p>
          <p className="muted small">That does not mean the repository has never had activity: older work, other contributors’ work and activity in private repositories are not included.</p>
        </div>
      )}

      {state.status === 'success' && events.length > 0 && (
        <>
          <div className="stats">
            {tiles.map((t) => (
              <div key={t.label} className="card stat-tile">
                <span className="stat-value">{t.value}</span>
                <span className="stat-label">{t.label}</span>
              </div>
            ))}
          </div>

          <section className="card panel" aria-labelledby="repo-daily-heading">
            <div className="panel-head">
              <h2 id="repo-daily-heading">Daily activity</h2>
              <span className="muted small">
                Last event {timeAgo(events[0].createdAt)} · {formatNumber(events.length)} of {formatNumber(allEvents.length)} loaded events
              </span>
            </div>
            <p className="muted small">
              Public events per day in this repository, across the same {daily.length}-day span as the developer’s whole activity. This is @{user.login}’s own activity only: GitHub shares at most 300 events from the last 90 days, so for very busy accounts the oldest days are missing.
            </p>
            <ActivityChart activity={daily} ariaLabel={`Bar chart of public events per day in ${repo.name}`} />
          </section>

          <section className="card panel" aria-labelledby="repo-timeline-heading">
            <div className="panel-head">
              <h2 id="repo-timeline-heading">Timeline</h2>
              <div className="panel-tools">
                <select
                  className="select"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as ActivityKind | '')
                    setShown(PAGE)
                  }}
                  aria-label="Filter by activity type"
                >
                  {KIND_FILTERS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="muted small" aria-live="polite">
              Showing {Math.min(shown, filtered.length)} of {filtered.length} events.
            </p>

            {filtered.length === 0 ? <p className="muted">No events match this filter.</p> : <EventTimeline groups={groups} showRepo={false} />}

            {filtered.length > shown && (
              <div>
                <button className="btn" onClick={() => setShown((n) => n + PAGE)}>
                  Show more
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
