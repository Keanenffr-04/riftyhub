# Backlog

Ideas for future versions. Items are moved into a version only when it has room (max two major improvements per version).

## Repository explorer

## Dashboard

## Analytics / data
- Language trends over time
- Contributions beyond the 300-repository cap

## Comparison and activity
- Per-repository activity from more than the developer's own events (e.g. all contributors' recent commits, 30-day commit counts)
- Commit activity heatmap beyond GitHub's 90-day event window

## Saved profiles
- Sync across browsers (would need an account or a server)

## Quality
- Fix whatever the first real Lighthouse report (run on `npm run preview`) still flags
- Extend stale-while-revalidate to the remaining loaders (commit search, the Compare recent-activity section, per-repository languages)
- Virtualised long lists
- More automated tests: the filter helpers, request layer (with a fake `fetch`), saved profiles and backup import, and the React screens
- Run the tests automatically on every push (CI)
