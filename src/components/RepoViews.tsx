import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, GitFork, Pin, Star } from 'lucide-react'
import type { GitHubRepo } from '../types/github'
import type { SortDir, SortKey } from '../utils/repoFilters'
import { formatCompact, languageColor, timeAgo } from '../utils/format'

function Language({ language }: { language: string | null }) {
  if (!language) return <span className="muted">—</span>
  return (
    <span className="lang">
      <i style={{ background: languageColor(language) }} aria-hidden="true" />
      {language}
    </span>
  )
}

function PinButton({ name, pinned, onToggle }: { name: string; pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`pin-btn${pinned ? ' on' : ''}`}
      onClick={onToggle}
      aria-pressed={pinned}
      aria-label={`${pinned ? 'Unpin' : 'Pin'} ${name}`}
      title={pinned ? 'Unpin from Overview' : 'Pin to Overview'}
    >
      <Pin size={15} aria-hidden="true" />
    </button>
  )
}

const MAX_TOPICS = 4

interface CardProps {
  repo: GitHubRepo
  onTopic?: (topic: string) => void
  /** When given, the card shows a pin button. */
  pinned?: boolean
  onTogglePin?: () => void
}

export function RepoCard({ repo, onTopic, pinned = false, onTogglePin }: CardProps) {
  const topics = onTopic ? (repo.topics ?? []).slice(0, MAX_TOPICS) : []
  return (
    <article className="card repo-card">
      <header>
        <a className="repo-name" href={repo.html_url} target="_blank" rel="noopener noreferrer">
          {repo.name} <ExternalLink size={13} aria-hidden="true" />
        </a>
        {repo.fork && <span className="tag">Fork</span>}
        {repo.archived && <span className="tag">Archived</span>}
        {onTogglePin && <PinButton name={repo.name} pinned={pinned} onToggle={onTogglePin} />}
      </header>
      <p className={`repo-desc${repo.description ? '' : ' muted'}`}>{repo.description ?? 'No description provided.'}</p>
      {topics.length > 0 && (
        <div className="topics">
          {topics.map((t) => (
            <button key={t} type="button" className="topic" onClick={() => onTopic?.(t)} title={`Filter by topic: ${t}`}>
              {t}
            </button>
          ))}
        </div>
      )}
      <footer>
        <Language language={repo.language} />
        <span className="stat" title="Stars">
          <Star size={14} aria-hidden="true" /> {formatCompact(repo.stargazers_count)}
          <span className="sr-only"> stars</span>
        </span>
        <span className="stat" title="Forks">
          <GitFork size={14} aria-hidden="true" /> {formatCompact(repo.forks_count)}
          <span className="sr-only"> forks</span>
        </span>
        <span className="muted updated">Updated {timeAgo(repo.pushed_at ?? repo.updated_at)}</span>
      </footer>
    </article>
  )
}

interface SortHeaderProps {
  label: string
  column: SortKey
  sort: SortKey
  dir: SortDir
  onSort: (column: SortKey) => void
  num?: boolean
}

function SortHeader({ label, column, sort, dir, onSort, num }: SortHeaderProps) {
  const active = sort === column
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" className={num ? 'num' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort${active ? ' active' : ''}`} onClick={() => onSort(column)}>
        {label} <Icon size={13} aria-hidden="true" />
      </button>
    </th>
  )
}

interface TableProps {
  repos: GitHubRepo[]
  sort: SortKey
  dir: SortDir
  onSort: (column: SortKey) => void
  isPinned?: (repo: GitHubRepo) => boolean
  onTogglePin?: (repo: GitHubRepo) => void
}

export function RepoTable({ repos, sort, dir, onSort, isPinned, onTogglePin }: TableProps) {
  const header = { sort, dir, onSort }
  return (
    <div className="card table-wrap">
      <table className="repo-table">
        <thead>
          <tr>
            <SortHeader label="Repository" column="name" {...header} />
            <th scope="col">Language</th>
            <SortHeader label="Stars" column="stars" num {...header} />
            <SortHeader label="Forks" column="forks" num {...header} />
            <SortHeader label="Updated" column="pushed" {...header} />
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <tr key={repo.id}>
              <td>
                <a className="repo-name" href={repo.html_url} target="_blank" rel="noopener noreferrer">
                  {repo.name}
                </a>
                {repo.fork && <span className="tag">Fork</span>}
                {repo.archived && <span className="tag">Archived</span>}
                {onTogglePin && <PinButton name={repo.name} pinned={isPinned?.(repo) ?? false} onToggle={() => onTogglePin(repo)} />}
                {repo.description && <div className="table-desc">{repo.description}</div>}
              </td>
              <td>
                <Language language={repo.language} />
              </td>
              <td className="num">{formatCompact(repo.stargazers_count)}</td>
              <td className="num">{formatCompact(repo.forks_count)}</td>
              <td className="muted nowrap">{timeAgo(repo.pushed_at ?? repo.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
