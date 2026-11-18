import { useMemo } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { ActivityChart, LanguageChart, TopReposChart } from '../components/Charts'
import LanguageBars from '../components/LanguageBars'
import { EmptyState } from '../components/States'
import { computeAnalytics } from '../utils/analytics'
import { formatNumber } from '../utils/format'

export default function AnalyticsPage() {
  const { user, repos } = useUserData()
  const a = useMemo(() => computeAnalytics(repos), [repos])

  if (repos.length === 0) {
    return <EmptyState title="Nothing to analyse yet" body={`@${user.login} has no public repositories.`} />
  }

  const tiles = [
    { label: 'Total stars', value: formatNumber(a.totalStars) },
    { label: 'Total forks', value: formatNumber(a.totalForks) },
    { label: 'Open issues', value: formatNumber(a.openIssues) },
    { label: 'Avg. stars per original repo', value: a.avgStars.toFixed(1) },
  ]
  const best = a.topStarred[0]

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="muted">
          Based on {repos.length} public repositories by @{user.login} ({a.originalCount} original, {repos.length - a.originalCount} forks).
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

      {best && (
        <a className="card highlight" href={best.html_url} target="_blank" rel="noopener noreferrer">
          <Star size={18} aria-hidden="true" />
          <span>
            Most starred: <strong>{best.name}</strong> with {formatNumber(best.stargazers_count)} stars
          </span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}

      <section className="card panel" aria-labelledby="lang-heading">
        <h2 id="lang-heading">Languages</h2>
        <p className="muted small">Primary language of each original (non-fork) repository.</p>
        {a.languages.length === 0 ? (
          <p className="muted">No language data available.</p>
        ) : (
          <div className="lang-layout">
            <LanguageChart languages={a.languages} />
            <LanguageBars languages={a.languages} limit={8} />
          </div>
        )}
      </section>

      {a.topStarred.length > 0 && (
        <section className="card panel" aria-labelledby="stars-heading">
          <h2 id="stars-heading">Most starred repositories</h2>
          <TopReposChart repos={a.topStarred} />
        </section>
      )}

      <section className="card panel" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Recent activity</h2>
        <p className="muted small">Repositories grouped by the month of their latest push, last 12 months.</p>
        <ActivityChart activity={a.activity} />
      </section>
    </div>
  )
}
