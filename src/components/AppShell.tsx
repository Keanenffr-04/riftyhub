import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { Menu, Moon, Sun } from 'lucide-react'
import Sidebar from './Sidebar'
import SearchForm from './SearchForm'
import ErrorBoundary from './ErrorBoundary'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useThemeToggle } from '../hooks/useTheme'
import { pageTitle } from '../utils/pageTitle'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const match = useMatch('/u/:username/*')
  const username = match?.params.username ? decodeURIComponent(match.params.username) : null
  const location = useLocation()
  const online = useOnlineStatus()
  const { next: nextTheme, toggle: toggleTheme } = useThemeToggle()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // On every page change: update the tab title (screen readers announce it), return to the top,
  // and move keyboard focus to the content so it doesn't stay on the link that was clicked.
  useEffect(() => {
    document.title = pageTitle(location.pathname)
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Pressing "/" jumps to the search box (unless you are already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      const box = document.querySelector<HTMLInputElement>('form[role="search"] input')
      if (!box) return
      e.preventDefault()
      setMenuOpen(false)
      box.focus()
      box.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="shell">
      <a className="skip-link" href="#content">
        Skip to main content
      </a>
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
          <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
            {nextTheme === 'light' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            You’re offline. Pages you already opened still work; new lookups need a connection.
          </div>
        )}
        <main className="content" id="content" ref={mainRef} tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
