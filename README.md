# RiftyHub

Explore any GitHub developer: profile, stats and public repositories, using live data from the GitHub REST API.

**Stack:** React 18, TypeScript, Vite, React Router, Recharts, Lucide icons, plain CSS.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other commands: `npm run build` (type-check + production build), `npm run preview`.

## Features
- Profile, stats and recent commits
- Repository filtering and sorting
- Analytics: stars, forks, languages, charts
- Developer comparison
- Saved profiles (browser storage)

## Notes
- Uses unauthenticated GitHub API requests (60/hour per IP). No tokens are stored or sent.
- Responses are cached for 10 minutes per browser tab; use "Refresh data" to re-fetch.
- Shows up to 300 public repositories per user.

## Structure
```
src/
  components/   UI building blocks (shell, sidebar, cards, charts, states)
  pages/        Home, Overview, Repositories, Analytics, Compare, Saved
  hooks/        useGitHubData (loading / error / success state)
  services/     GitHub API client, cache, rate-limit tracking
  styles/       Design tokens and global styles
  types/        GitHub API types
  utils/        Formatting and analytics helpers
```

See `CHANGELOG.md` for version history.
