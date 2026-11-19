# RiftyHub

Explore any GitHub developer: profile, stats and public repositories, using live data from the GitHub REST API.

**Stack:** React 18, TypeScript, Vite, React Router, Recharts, Lucide icons, plain CSS.

## Getting started

Requires Node.js 18+. Run all commands from the project root (the folder containing `package.json`).

### Commands: what they do and when to run them

| Command | What it does | When to run it |
| --- | --- | --- |
| `npm install` | Downloads every package listed in `package.json` into `node_modules/`. | Once after cloning or unzipping the project, and again any time `package.json` changes (e.g. after pulling a new version that adds or upgrades a dependency). |
| `npm run dev` | Starts the Vite dev server at http://localhost:5173 with hot reload: edits show in the browser instantly. | Every time you sit down to work on the app. Leave it running; stop it with `Ctrl+C`. |
| `npm run build` | Type-checks the code with TypeScript (`tsc --noEmit`), then creates an optimised production build in `dist/`. Fails if there are type errors. | Before deploying, and before committing bigger changes, to confirm nothing is broken. Netlify runs this automatically on deploy. |
| `npm run preview` | Serves the built `dist/` folder locally at http://localhost:4173 so you can test the real production output. | After `npm run build`, to check the production version before it goes live. It does not rebuild, so re-run `build` after any code change. |

### Typical workflows

**First time setup:**
```bash
npm install
npm run dev
```

**Day-to-day development:**
```bash
npm run dev
```

**Checking before you deploy:**
```bash
npm run build
npm run preview
```

## Features
- Profile dashboard: stat tiles, top languages, most starred and recent commits
- Profile tabs (Overview, Repositories, Analytics) for quick navigation
- Repository explorer: multi-word search (name, description, language, topics), filters for language, topic, license, minimum stars and last push date, hide forks/archived, six sort options with a reverse toggle, removable filter chips
- Filters are stored in the URL, so a filtered view can be bookmarked or shared
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
  utils/        Formatting, analytics and repository filter helpers
```

See `CHANGELOG.md` for version history.
