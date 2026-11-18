import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from '../components/UserLayout'
import ProfileCard from '../components/ProfileCard'
import RecentCommits from '../components/RecentCommits'
import { RepoCard } from '../components/RepoViews'
import { computeAnalytics } from '../utils/analytics'
import { formatNumber } from '../utils/format'

export default function OverviewPage() {
  const { user, repos, refresh } = useUserData()
  const analytics = useMemo(() => computeAnalytics(repos), [repos])
  const recent = repos.slice(0, 6) // API already returns most recently pushed first

  const stats = [
    { label: 'Public repositories', value: user.public_repos },
    { label: 'Total stars', value: analytics.totalStars },
    { label: 'Total forks', value: analytics.totalForks },
    { label: 'Followers', value: user.followers },
    { label: 'Following', value: user.following },
    { label: 'Public gists', value: user.public_gists },
  ]

  return (
    <div className="stack">
      <ProfileCard user={user} onRefresh={refresh} />

      <section aria-label="Profile statistics">
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="card stat-tile">
              <span className="stat-value">{formatNumber(s.value)}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="muted small note">
          Stars and forks are totals across the {repos.length} loaded repositories.{' '}
          <Link to="analytics">See full analytics</Link>
        </p>
      </section>

      <RecentCommits username={user.login} />

      <section aria-labelledby="recent-heading">
        <div className="section-head">
          <h2 id="recent-heading">Recently active repositories</h2>
          {repos.length > 0 && <Link to="repos">View all {repos.length}</Link>}
        </div>
        {recent.length === 0 ? (
          <p className="muted">This user has no public repositories yet.</p>
        ) : (
          <div className="repo-grid">
            {recent.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
