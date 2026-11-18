import { useEffect, useState } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import SearchForm from './SearchForm'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const match = useMatch('/u/:username/*')
  const username = match?.params.username ? decodeURIComponent(match.params.username) : null
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="shell">
      <Sidebar username={username} open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-controls="sidebar"
            aria-expanded={menuOpen}
          >
            <Menu size={20} />
          </button>
          {location.pathname !== '/' && <SearchForm key={username ?? 'none'} initialValue={username ?? ''} />}
        </header>
        <main className="content" id="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
