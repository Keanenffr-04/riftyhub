import { NavLink, useMatch } from 'react-router-dom'
import { BarChart3, FolderGit2, LayoutDashboard } from 'lucide-react'
import type { GitHubUser } from '../types/github'

interface Props {
  username: string
  user: GitHubUser
  repoCount: number
}

export default function UserTabs({ username, user, repoCount }: Props) {
  const base = `/u/${encodeURIComponent(username)}`
  const onOverview = useMatch({ path: '/u/:username', end: true }) !== null
  const tabClass = ({ isActive }: { isActive: boolean }) => `tab${isActive ? ' active' : ''}`

  return (
    <div className="user-bar">
      {!onOverview && (
        <div className="user-bar-id">
          <img src={user.avatar_url} alt="" width={32} height={32} />
          <span>
            <strong>{user.name ?? user.login}</strong>
            <span className="muted">@{user.login}</span>
          </span>
        </div>
      )}
      <nav className="tabs" aria-label="Profile sections">
        <NavLink to={base} end className={tabClass}>
          <LayoutDashboard size={15} aria-hidden="true" /> Overview
        </NavLink>
        <NavLink to={`${base}/repos`} className={tabClass}>
          <FolderGit2 size={15} aria-hidden="true" /> Repositories <span className="tab-count">{repoCount}</span>
        </NavLink>
        <NavLink to={`${base}/analytics`} className={tabClass}>
          <BarChart3 size={15} aria-hidden="true" /> Analytics
        </NavLink>
      </nav>
    </div>
  )
}
