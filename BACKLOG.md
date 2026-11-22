# Backlog

Ideas for future versions. Items are moved into a version only when it has room (max two major improvements per version).

## Repository explorer
- Sortable table column headers (click Stars / Updated to sort)
- Search operators such as `stars:>100` and `lang:python`
- Saved filter presets

## Dashboard
- Light theme and theme switcher
- Default sort and filters for the Repositories page as a preference
- Drag-and-drop reordering of Overview sections
- Keyboard shortcut to focus the search box
- Pinned repositories on the Overview page

## Analytics / data
- Per-repository code-size breakdown (click a repository to see its languages)
- Language trends over time
- Contributions beyond the 300-repository cap

## Comparison and activity
- Compare three or more developers
- Side-by-side activity comparison (events per week)
- Commit activity heatmap beyond GitHub's 90-day event window
- Per-repository activity page

## Saved profiles
- Notes on each saved profile
- Sync across browsers (would need an account or a server)
- "Clear cached GitHub data" button in Settings

## Quality
- Automated tests for the filter helpers (verified manually in v5)
- Lighthouse audit and fixes (V10)
- Optional GitHub token field to raise the request limit (stored only in the browser)
- Stale-while-revalidate: show cached data instantly and refresh quietly in the background
- Virtualised long lists
- Automated test suite in the repo (helpers, request layer and cache were verified with throwaway scripts in v6 to v9)
