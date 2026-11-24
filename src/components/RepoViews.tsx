import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowDown, ArrowUp, BarChart3, ChevronsUpDown, ExternalLink, GitFork, Pin, Star } from 'lucide-react'
import type { GitHubRepo } from '../types/github'
import RepoLanguages from './RepoLanguages'
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

function LanguagesToggle({ name, open, panelId, onToggle }: { name: string; open: boolean; panelId: string; onToggle: () => void }) {
  return (
    <button type="button" className={`langs-toggle${open ? ' on' : ''}`} onClick={onToggle} aria-expanded={open} aria-controls={panelId} title="Show the language breakdown">
      <BarChart3 size={14} aria-hidden="true" /> Languages<span className="sr-only"> of {name}</span>
    </button>
  )
}

/** Link to the page with this repository's recent activity. */
function ActivityLink({ repo }: { repo: GitHubRepo }) {
  const [owner, name] = repo.full_name.split('/')
  return (
    <Link className="langs-toggle" to={`/u/${encodeURIComponent(owner)}/repos/${encodeURIComponent(name)}`} title="Show this repository's recent activity">
      <Activity size={14} aria-hidden="true" /> Activity<span className="sr-only"> of {repo.name}</span>
    </Link>
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
  const [showLanguages, setShowLanguages] = useState(false)
  const panelId = useId()
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
      <div className="repo-actions">
        <LanguagesToggle name={repo.name} open={showLanguages} panelId={panelId} onToggle={() => setShowLanguages((v) => !v)} />
        <ActivityLink repo={repo} />
      </div>
      {showLanguages && (
        <div id={panelId}>
          <RepoLanguages fullName={repo.full_name} />
        </div>
      )}
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

interface RowProps {
  repo: GitHubRepo
  pinned: boolean
  onTogglePin?: () => void
}

function RepoRow({ repo, pinned, onTogglePin }: RowProps) {
  const [showLanguages, setShowLanguages] = useState(false)
  const panelId = useId()
  return (
    <>
      <tr>
        <td>
          <a className="repo-name" href={repo.html_url} target="_blank" rel="noopener noreferrer">
            {repo.name}
          </a>
          {repo.fork && <span className="tag">Fork</span>}
          {repo.archived && <span className="tag">Archived</span>}
          {onTogglePin && <PinButton name={repo.name} pinned={pinned} onToggle={onTogglePin} />}
          {repo.description && <div className="table-desc">{repo.description}</div>}
        </td>
        <td>
          <Language language={repo.language} />
          <div className="repo-actions">
            <LanguagesToggle name={repo.name} open={showLanguages} panelId={panelId} onToggle={() => setShowLanguages((v) => !v)} />
            <ActivityLink repo={repo} />
          </div>
        </td>
        <td className="num">{formatCompact(repo.stargazers_count)}</td>
        <td className="num">{formatCompact(repo.forks_count)}</td>
        <td className="muted nowrap">{timeAgo(repo.pushed_at ?? repo.updated_at)}</td>
      </tr>
      {showLanguages && (
        <tr className="lang-row">
          <td colSpan={5} id={panelId}>
            <RepoLanguages fullName={repo.full_name} />
          </td>
        </tr>
      )}
    </>
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
            <RepoRow key={repo.id} repo={repo} pinned={isPinned?.(repo) ?? false} onTogglePin={onTogglePin ? () => onTogglePin(repo) : undefined} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
