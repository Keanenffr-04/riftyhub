import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Bookmark, FolderGit2, GitCompare, Home, LayoutDashboard, Settings, X } from 'lucide-react'
import Logo from './Logo'
import RateLimitMeter from './RateLimitMeter'
import { useSavedProfiles } from '../hooks/useSavedProfiles'

interface Props {
  username: string | null
  open: boolean
  onClose: () => void
}

export default function Sidebar({ username, open, onClose }: Props) {
  const { profiles } = useSavedProfiles()
  const base = username ? `/u/${encodeURIComponent(username)}` : null
  const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

  const userLinks = [
    { to: base, label: 'Overview', icon: LayoutDashboard, end: true },
    { to: base && `${base}/repos`, label: 'Repositories', icon: FolderGit2, end: false },
    { to: base && `${base}/analytics`, label: 'Analytics', icon: BarChart3, end: false },
    { to: base && `${base}/activity`, label: 'Activity', icon: Activity, end: false },
  ]

  return (
    <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`} aria-label="Primary">
      <div className="sidebar-head">
        <NavLink to="/" aria-label="RiftyHub home" onClick={onClose}>
          <Logo />
        </NavLink>
        <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="nav">
        <NavLink to="/" end className={linkClass} onClick={onClose}>
          <Home size={17} /> Home
        </NavLink>

        {userLinks.map(({ to, label, icon: Icon, end }) =>
          to ? (
            <NavLink key={label} to={to} end={end} className={linkClass} onClick={onClose}>
              <Icon size={17} /> {label}
            </NavLink>
          ) : (
            <span key={label} className="nav-link disabled" aria-disabled="true">
              <Icon size={17} /> {label}
            </span>
          ),
        )}

        <p className="nav-group">Tools</p>
        <NavLink to="/compare" className={linkClass} onClick={onClose}>
          <GitCompare size={17} /> Compare
        </NavLink>
        <NavLink to="/saved" className={linkClass} onClick={onClose}>
          <Bookmark size={17} /> Saved profiles
          {profiles.length > 0 && <span className="badge">{profiles.length}</span>}
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={onClose}>
          <Settings size={17} /> Settings
        </NavLink>
      </nav>

      <div className="sidebar-foot">
        <RateLimitMeter />
      </div>
    </aside>
  )
}
