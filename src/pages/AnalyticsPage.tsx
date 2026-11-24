import { useMemo, useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { ActivityChart, METRIC_LABELS, TopReposChart, metricValue, type RepoMetric } from '../components/Charts'
import LanguageBars from '../components/LanguageBars'
import LanguagePanel from '../components/LanguagePanel'
import LanguageTrendsPanel from '../components/LanguageTrendsPanel'
import { EmptyState } from '../components/States'
import { computeAnalytics } from '../utils/analytics'
import { formatNumber } from '../utils/format'

type ActivityView = 'created' | 'pushed'

export default function AnalyticsPage() {
  const { user, repos } = useUserData()
  const a = useMemo(() => computeAnalytics(repos), [repos])
  const [metric, setMetric] = useState<RepoMetric>('stars')
  const [activity, setActivity] = useState<ActivityView>('created')

  const topByMetric = useMemo(
    () =>
      [...repos]
        .filter((r) => metricValue(r, metric) > 0)
        .sort((x, y) => metricValue(y, metric) - metricValue(x, metric) || x.name.localeCompare(y.name))
        .slice(0, 8),
    [repos, metric],
  )

  if (repos.length === 0) {
    return <EmptyState title="Nothing to analyse yet" body={`@${user.login} has no public repositories.`} />
  }

  const tiles = [
    { label: 'Total stars', value: formatNumber(a.totalStars) },
    { label: 'Total forks', value: formatNumber(a.totalForks) },
    { label: 'Open issues and PRs', value: formatNumber(a.openIssues) },
    { label: 'Avg. stars per original repo', value: a.avgStars.toFixed(1) },
  ]
  const insights = [
    { label: 'Original repositories', value: `${a.originalCount} of ${repos.length}` },
    { label: 'Median stars per original repo', value: String(a.medianStars) },
    { label: 'Pushed in the last 12 months', value: `${a.activeLastYear} of ${repos.length}` },
    { label: 'Original repos with a license', value: `${Math.round(a.licensedPercent)}%` },
    { label: 'Archived repositories', value: formatNumber(a.archivedCount) },
    { label: 'First repository created', value: a.createdByYear[0]?.label ?? '—' },
  ]
  const best = a.topStarred[0]

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="muted">
          Based on {repos.length} public repositories by @{user.login} ({a.originalCount} original, {a.forkCount} forks). GitHub counts pull
          requests in the open issues figure.
        </p>
      </div>

      <div className="stats">
        {tiles.map((t) => (
          <div key={t.label} className="card stat-tile">
            <span className="stat-value">{t.value}</span>
            <span className="stat-label">{t.label}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="sub-heading">
          Developer insights
        </h2>
        <div className="stats">
          {insights.map((t) => (
            <div key={t.label} className="card stat-tile">
              <span className="stat-value">{t.value}</span>
              <span className="stat-label">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {best && (
        <a className="card highlight" href={best.html_url} target="_blank" rel="noopener noreferrer">
          <Star size={18} aria-hidden="true" />
          <span>
            Most starred: <strong>{best.name}</strong> with {formatNumber(best.stargazers_count)} stars
          </span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}

      <LanguagePanel repos={repos} />

      <LanguageTrendsPanel repos={repos} />

      <section className="card panel" aria-labelledby="top-heading">
        <div className="panel-head">
          <h2 id="top-heading">Top repositories</h2>
          <div className="toggle" role="group" aria-label="Ranking measure">
            {(Object.keys(METRIC_LABELS) as RepoMetric[]).map((m) => (
              <button key={m} className={metric === m ? 'active' : ''} onClick={() => setMetric(m)} aria-pressed={metric === m}>
                {m === 'issues' ? 'Issues' : METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        {topByMetric.length === 0 ? (
          <p className="muted">No repositories have any {METRIC_LABELS[metric].toLowerCase()} yet.</p>
        ) : (
          <TopReposChart repos={topByMetric} metric={metric} />
        )}
      </section>

      <section className="card panel" aria-labelledby="activity-heading">
        <div className="panel-head">
          <h2 id="activity-heading">Activity</h2>
          <div className="toggle" role="group" aria-label="Activity view">
            <button className={activity === 'created' ? 'active' : ''} onClick={() => setActivity('created')} aria-pressed={activity === 'created'}>
              Created per year
            </button>
            <button className={activity === 'pushed' ? 'active' : ''} onClick={() => setActivity('pushed')} aria-pressed={activity === 'pushed'}>
              Last push, 12 months
            </button>
          </div>
        </div>
        {activity === 'created' ? (
          <>
            <p className="muted small">Repositories grouped by the calendar year they were created, including forks.</p>
            <ActivityChart activity={a.createdByYear} ariaLabel="Bar chart of repositories created per year" />
          </>
        ) : (
          <>
            <p className="muted small">Repositories grouped by the month of their latest push, last 12 months.</p>
            <ActivityChart activity={a.activity} />
          </>
        )}
      </section>

      {(a.topics.length > 0 || a.licenses.length > 0) && (
        <div className="dash-row">
          {a.topics.length > 0 && (
            <section className="card panel" aria-labelledby="topics-heading">
              <h2 id="topics-heading">Top topics</h2>
              <p className="muted small">Share of original repositories tagged with each topic.</p>
              <LanguageBars languages={a.topics} limit={8} />
            </section>
          )}
          <section className="card panel" aria-labelledby="licenses-heading">
            <h2 id="licenses-heading">Licenses</h2>
            <p className="muted small">Share of original repositories under each license.</p>
            <LanguageBars languages={a.licenses} limit={8} />
          </section>
        </div>
      )}
    </div>
  )
}
