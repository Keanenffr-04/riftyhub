# RiftyHub

Explore any GitHub developer: profile, stats and public repositories, using live data from the GitHub REST API.

**Stack:** React 18, TypeScript, Vite, React Router, Recharts, Lucide icons, plain CSS.

## Quick start: open the app

Open PowerShell in the project folder (the one containing `package.json`) and run:

```powershell
npm install      # first time only
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser. Keep PowerShell open while you use the app and stop the server with `Ctrl+C`.

Requires Node.js 18+ (check with `node -v`). If the page doesn't load, make sure `npm run dev` is still running. If port 5173 is busy, Vite prints a different address in PowerShell: open that one instead.

See [USER_GUIDE.md](USER_GUIDE.md) for a step-by-step walkthrough and an explanation of how everything works together.

## Getting started

Requires Node.js 18+. Run all commands from the project root (the folder containing `package.json`).

### Commands: what they do and when to run them

| Command | What it does | When to run it |
| --- | --- | --- |
| `npm install` | Downloads every package listed in `package.json` into `node_modules/`. | Once after cloning or unzipping the project, and again any time `package.json` changes (e.g. after pulling a new version that adds or upgrades a dependency). |
| `npm run dev` | Starts the Vite dev server at http://localhost:5173 with hot reload: edits show in the browser instantly. | Every time you sit down to work on the app. Leave it running; stop it with `Ctrl+C`. |
| `npm run build` | Type-checks the code with TypeScript (`tsc --noEmit`), then creates an optimised production build in `dist/`. Fails if there are type errors. | Before deploying, and before committing bigger changes, to confirm nothing is broken. Netlify runs this automatically on deploy. |
| `npm test` | Runs the automated tests in `tests/` with Vitest (cache, username checks, comparison helpers, pins, search operators). | After changing helpers or the cache, and before committing. Needs `npm install` first. |
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
- Search operators in the repository search (`stars:>100 lang:python -is:fork pushed:>2024-01-01`), sortable table headers, saved filter presets and configurable default sort and filters
- Filters are stored in the URL, so a filtered view can be bookmarked or shared
- Analytics: totals, developer insights (median stars, recent activity, license coverage), interactive charts (rank repositories by stars, forks or issues; activity by creation year or last push), topic and license breakdowns
- Language statistics by repository count (forks optional, repositories without a language reported) or by real code size, loaded on demand from GitHub
- Performance and reliability: parallel repository loading, slimmed-down cached data, automatic cache cleanup, request timeout and retries, "Show more" paging for large repository lists, lazy-loaded chart pages, offline banner, error boundary, skip link and text alternatives for charts
- Personalisation: Settings page to show, hide and reorder (drag and drop or arrows) Overview sections, choose a dark, light or system theme, compact or comfortable density, set the default repository layout, and export/import a backup
- Pinned repositories (up to six per developer) on the Overview, a sun/moon theme button, and a `/` shortcut to focus the search box
- Per-repository language breakdown: a "Languages" button on every repository card and table row shows real code size per language (one request, only when opened)
- Saved profiles: favourites, named collections, private notes, search, sorting and "Compare selected" for two to four saved developers
- Settings: "Clear cached GitHub data" to force fresh data on the next visit
- Instant revisits: profiles, activity and comparisons you opened earlier open immediately from saved data and update quietly in the background
- Per-repository activity page (from the "Activity" link on any repository): tiles, daily chart and timeline of the developer's public events in that repository
- Automatic checks: a GitHub Actions workflow runs the tests and the build on every push and pull request
- Automated tests (`npm test`) for the cache and the main helper modules
- Developer comparison: two to four developers side by side with a tally of who leads, 11 metrics, language overlap, most starred repositories, and a Compare button on every profile
- Activity comparison (on demand): events per week for the last 13 weeks as a line chart, plus a table of events, commits, pull requests, reviews, active days and busiest week
- Activity page: public event timeline with filters, daily activity chart and a commit explorer (search messages, filter by repository and date)
- Optional GitHub token (Settings) to raise the request limit from 60 to 5,000 per hour, kept only in your browser
- Accessibility and best-practice fixes from a Lighthouse-style audit: readable contrast, labelled navigation, security headers, web app manifest

## Notes
- Uses unauthenticated GitHub API requests (60/hour per IP) unless you add a token in Settings (5,000/hour). A token is stored only in this browser (localStorage), sent only to api.github.com and never included in backups.
- Responses are cached per browser tab: fresh for 10 minutes, then shown instantly as saved data while a new copy is fetched in the background (for up to 24 hours); use "Refresh data" to re-fetch. Temporary failures are retried automatically and requests time out after 15 seconds.
- Saved profiles (with their notes), collections, filter presets, pinned repositories and preferences are stored in this browser (localStorage) only. Export a backup from Settings to keep a copy.
- Shows up to 300 public repositories per user.
- Activity (and the Compare activity section) uses GitHub's public events (up to 300 events from the last 90 days; the comparison costs up to 3 requests per developer and loads only when you click it). The commit explorer uses GitHub's commit search, which allows about 10 searches per minute without a token.
- The code-size language breakdown uses one GitHub request per repository (up to 20 most recently pushed), so it only runs when you click "Load code-size breakdown". The per-repository "Languages" button uses one request each time a repository's breakdown is first opened (kept for 30 minutes).

## Structure
```
src/
  components/   UI building blocks (shell, sidebar, cards, charts, states)
  pages/        Home, Overview, Repositories, Analytics, Activity, Compare, Saved, Settings
  hooks/        useGitHubData (loading / error / success state)
  services/     GitHub API client, cache, rate-limit tracking
  styles/       Design tokens and global styles
  types/        GitHub API types
  utils/        Formatting, analytics and repository filter helpers
```

See `CHANGELOG.md` for version history.
