import { Link } from 'react-router-dom'
import { useUserData } from '../components/UserLayout'
import ProfileCard from '../components/ProfileCard'
import { RepoCard } from '../components/RepoViews'
import { formatNumber } from '../utils/format'

export default function OverviewPage() {
  const { user, repos } = useUserData()
  const recent = [...repos]
    .sort((a, b) => Date.parse(b.pushed_at ?? b.updated_at) - Date.parse(a.pushed_at ?? a.updated_at))
    .slice(0, 6)

  const stats = [
    { label: 'Public repositories', value: user.public_repos },
    { label: 'Followers', value: user.followers },
    { label: 'Following', value: user.following },
    { label: 'Public gists', value: user.public_gists },
  ]

  return (
    <div className="stack">
      <ProfileCard user={user} />

      <section className="stats" aria-label="Profile statistics">
        {stats.map((s) => (
          <div key={s.label} className="card stat-tile">
            <span className="stat-value">{formatNumber(s.value)}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

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
