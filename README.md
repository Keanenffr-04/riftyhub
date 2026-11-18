# RiftyHub

Explore any GitHub developer: profile, stats and public repositories, using live data from the GitHub REST API.

**Stack:** React 18, TypeScript, Vite, React Router, Lucide icons, plain CSS.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other commands: `npm run build` (type-check + production build), `npm run preview`.

## Notes
- Uses unauthenticated GitHub API requests (60/hour per IP). No tokens are stored or sent.
- Shows up to 300 public repositories per user.

## Structure
```
src/
  components/   UI building blocks (shell, sidebar, cards, states)
  pages/        Home, Overview, Repositories
  hooks/        useGitHubData (loading / error / success state)
  services/     GitHub API client and error types
  styles/       Design tokens and global styles
  types/        GitHub API types
  utils/        Formatting helpers
```

See `CHANGELOG.md` for version history.
