import { Fragment, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Code, FolderGit2, GitFork, Star, UserPlus, Users } from 'lucide-react'
import { useUserData } from '../components/UserLayout'
import { usePreferences } from '../hooks/usePreferences'
import ProfileCard from '../components/ProfileCard'
import RecentCommits from '../components/RecentCommits'
import LanguageBars from '../components/LanguageBars'
import { RepoCard } from '../components/RepoViews'
import { computeAnalytics } from '../utils/analytics'
import { formatNumber } from '../utils/format'
import type { SectionId } from '../utils/preferences'

export default function OverviewPage() {
  const { user, repos, refresh } = useUserData()
  const { preferences } = usePreferences()
  const analytics = useMemo(() => computeAnalytics(repos), [repos])
  const recent = repos.slice(0, 6) // API already returns most recently pushed first

  const stats = [
    { label: 'Public repositories', value: user.public_repos, icon: FolderGit2 },
    { label: 'Total stars', value: analytics.totalStars, icon: Star },
    { label: 'Total forks', value: analytics.totalForks, icon: GitFork },
    { label: 'Followers', value: user.followers, icon: Users },
    { label: 'Following', value: user.following, icon: UserPlus },
    { label: 'Public gists', value: user.public_gists, icon: Code },
  ]

  const sections: Record<SectionId, ReactNode> = {
    stats: (
      <section aria-label="Profile statistics">
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="card stat-tile">
              <span className="stat-label">
                <s.icon size={15} aria-hidden="true" /> {s.label}
              </span>
              <span className="stat-value">{formatNumber(s.value)}</span>
            </div>
          ))}
        </div>
        <p className="muted small note">
          Stars and forks are totals across the {repos.length} loaded repositories.{' '}
          <Link to="analytics">See full analytics</Link>
        </p>
      </section>
    ),
    highlights: (
      <>
      {repos.length > 0 && (
        <div className="dash-row">
          <section className="card panel" aria-labelledby="ov-lang-heading">
            <div className="section-head">
              <h2 id="ov-lang-heading">Top languages</h2>
              <Link to="analytics">Details</Link>
            </div>
            <LanguageBars languages={analytics.languages} limit={5} />
          </section>
          <section className="card panel" aria-labelledby="ov-stars-heading">
            <div className="section-head">
              <h2 id="ov-stars-heading">Most starred</h2>
              <Link to="repos?sort=stars">View all</Link>
            </div>
            {analytics.topStarred.length === 0 ? (
              <p className="muted">No starred repositories yet.</p>
            ) : (
              <ol className="top-list">
                {analytics.topStarred.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <a href={r.html_url} target="_blank" rel="noopener noreferrer">
                      {r.name}
                    </a>
                    <span className="stat">
                      <Star size={14} aria-hidden="true" /> {formatNumber(r.stargazers_count)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
      </>
    ),
    commits: <RecentCommits username={user.login} />,
    repos: (
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
    ),
  }

  return (
    <div className="stack">
      <ProfileCard user={user} onRefresh={refresh} />
      {preferences.overview
        .filter((section) => section.visible)
        .map((section) => (
          <Fragment key={section.id}>{sections[section.id]}</Fragment>
        ))}
      {preferences.overview.every((section) => !section.visible) && (
        <p className="muted">
          All Overview sections are hidden. <Link to="/settings">Choose what to show in Settings</Link>.
        </p>
      )}
    </div>
  )
}
