import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { useUserEvents } from '../hooks/useUserEvents'
import { ActivityChart } from '../components/Charts'
import CommitExplorer from '../components/CommitExplorer'
import EventTimeline from '../components/EventTimeline'
import RefreshNote from '../components/RefreshNote'
import { describeError } from '../components/States'
import { KIND_FILTERS, eventsByDay, groupByDay, summarizeActivity } from '../utils/activity'
import { formatNumber } from '../utils/format'
import type { ActivityKind } from '../types/github'

const PAGE = 40

export default function ActivityPage() {
  const { user, repos } = useUserData()
  const { state, retry } = useUserEvents(user.login)
  const [kind, setKind] = useState<ActivityKind | ''>('')
  const [repo, setRepo] = useState('')
  const [shown, setShown] = useState(PAGE)

  const events = state.status === 'success' ? state.events : []
  const summary = useMemo(() => summarizeActivity(events), [events])
  const daily = useMemo(() => eventsByDay(events), [events])
  const repoNames = useMemo(() => [...new Set(events.map((e) => e.repo))].sort((a, b) => a.localeCompare(b)), [events])
  const filtered = useMemo(() => events.filter((e) => (!kind || e.kind === kind) && (!repo || e.repo === repo)), [events, kind, repo])
  const groups = useMemo(() => groupByDay(filtered.slice(0, shown)), [filtered, shown])

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
      <div>
        <h1 className="page-title">Activity</h1>
        <p className="muted">
          Recent public activity by @{user.login}. GitHub shares up to 300 public events from the last 90 days, so busy accounts cover a shorter span.
        </p>
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
        <p className="muted">GitHub has no public activity from the last 90 days for @{user.login}.</p>
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

          <section className="card panel" aria-labelledby="daily-heading">
            <div className="panel-head">
              <h2 id="daily-heading">Daily activity</h2>
              {summary.topRepo && (
                <span className="muted small">
                  Busiest repository: <strong>{summary.topRepo.name}</strong> ({summary.topRepo.count} events)
                </span>
              )}
            </div>
            <p className="muted small">Public events per day across the {daily.length}-day span covered by the loaded events.</p>
            <ActivityChart activity={daily} ariaLabel="Bar chart of public events per day" />
          </section>

          <section className="card panel" aria-labelledby="timeline-heading">
            <div className="panel-head">
              <h2 id="timeline-heading">Timeline</h2>
              <div className="panel-tools">
                <select className="select" value={kind} onChange={(e) => { setKind(e.target.value as ActivityKind | ''); setShown(PAGE) }} aria-label="Filter by activity type">
                  {KIND_FILTERS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <select className="select" value={repo} onChange={(e) => { setRepo(e.target.value); setShown(PAGE) }} aria-label="Filter by repository">
                  <option value="">All repositories</option>
                  {repoNames.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="muted small" aria-live="polite">
              Showing {Math.min(shown, filtered.length)} of {filtered.length} events.
            </p>

            {filtered.length === 0 ? (
              <p className="muted">No events match these filters.</p>
            ) : (
              <EventTimeline groups={groups} />
            )}

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

      <CommitExplorer username={user.login} repos={repos} />
    </div>
  )
}
