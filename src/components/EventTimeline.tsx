import { Activity as ActivityIcon, CircleDot, ExternalLink, FolderPlus, GitCommitHorizontal, GitFork, GitPullRequest, MessageSquare, Rocket, Star, type LucideIcon } from 'lucide-react'
import type { ActivityKind } from '../types/github'
import type { DayGroup } from '../utils/activity'

const KIND_ICONS: Record<ActivityKind, LucideIcon> = {
  push: GitCommitHorizontal,
  pull_request: GitPullRequest,
  issue: CircleDot,
  review: MessageSquare,
  comment: MessageSquare,
  create: FolderPlus,
  fork: GitFork,
  star: Star,
  release: Rocket,
  other: ActivityIcon,
}

/** Events grouped by day. `showRepo` adds the repository name to each line (not needed on a single repository's page). */
export default function EventTimeline({ groups, showRepo = true }: { groups: DayGroup[]; showRepo?: boolean }) {
  return (
    <div className="timeline">
      {groups.map((g) => (
        <div key={g.key} className="timeline-day">
          <h3>{g.label}</h3>
          <ul className="card commit-list">
            {g.events.map((e) => {
              const Icon = KIND_ICONS[e.kind]
              return (
                <li key={e.id}>
                  <Icon size={16} aria-hidden="true" className="commit-icon" />
                  <div className="commit-main">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="commit-msg">
                        {e.title} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="commit-msg">{e.title}</span>
                    )}
                    {showRepo && <span className="muted">{e.repo}</span>}
                  </div>
                  <time className="muted nowrap" dateTime={e.createdAt}>
                    {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
