const SECTIONS: Record<string, string> = { repos: 'Repositories', analytics: 'Analytics', activity: 'Activity' }
const PAGES: Record<string, string> = { compare: 'Compare', saved: 'Saved profiles', settings: 'Settings' }

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** The browser tab title for a route, e.g. "Repositories · torvalds · RiftyHub". */
export function pageTitle(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'u' && parts[1]) {
    return [SECTIONS[parts[2] ?? ''], decode(parts[1]), 'RiftyHub'].filter(Boolean).join(' · ')
  }
  const page = PAGES[parts[0] ?? '']
  return page ? `${page} · RiftyHub` : 'RiftyHub'
}
