import { NavLink } from 'react-router-dom'
import { BarChart3, Bookmark, FolderGit2, GitCompare, LayoutDashboard, Home, X } from 'lucide-react'
import Logo from './Logo'

interface Props {
  username: string | null
  open: boolean
  onClose: () => void
}

const upcoming = [
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Compare', icon: GitCompare },
  { label: 'Saved profiles', icon: Bookmark },
]

export default function Sidebar({ username, open, onClose }: Props) {
  const base = username ? `/u/${encodeURIComponent(username)}` : null
  const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

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
        {base ? (
          <>
            <NavLink to={base} end className={linkClass} onClick={onClose}>
              <LayoutDashboard size={17} /> Overview
            </NavLink>
            <NavLink to={`${base}/repos`} className={linkClass} onClick={onClose}>
              <FolderGit2 size={17} /> Repositories
            </NavLink>
          </>
        ) : (
          <>
            <span className="nav-link disabled" aria-disabled="true">
              <LayoutDashboard size={17} /> Overview
            </span>
            <span className="nav-link disabled" aria-disabled="true">
              <FolderGit2 size={17} /> Repositories
            </span>
          </>
        )}

        <p className="nav-group">Coming next</p>
        {upcoming.map(({ label, icon: Icon }) => (
          <span key={label} className="nav-link disabled" aria-disabled="true">
            <Icon size={17} /> {label}
          </span>
        ))}
      </nav>

      <p className="sidebar-foot">
        Live data from the public GitHub REST API. Without a token, GitHub allows 60 requests per hour.
      </p>
    </aside>
  )
}
