# Changelog

## v6.0.0 – Advanced analytics
- Expanded statistics: new "Developer insights" tiles (original vs fork count, median stars, repositories pushed in the last 12 months, license coverage, archived count, first repository year), top topics and license breakdown panels
- Interactive charts: "Top repositories" can be ranked by stars, forks or open issues; "Activity" switches between repositories created per year and last push by month
- Language statistics accuracy: "Include forks" option, repositories with no detected language are now reported instead of silently ignored, and an on-demand "Code size" view using GitHub's real per-language byte counts (up to 20 most recently pushed repositories, one request each, rate-limit aware, partial results explained)
- Clarified labels: GitHub's open issue count includes pull requests
- No new dependencies. Adapted from roadmap: totals, language counts and activity charts already existed from v2, so v6 extends them

## v5.0.0 – Dashboard UI and repository explorer
- Dashboard UI: profile tab bar on every profile page (Overview / Repositories / Analytics) with a compact identity header on inner pages; Overview stat tiles now have icons; new "Top languages" and "Most starred" panels built from the loaded repositories
- Repository explorer: search now matches name, description, language and topics (every word must match); new filters for topic, license, minimum stars and last-pushed window; new sort options (date created, open issues) with an ascending/descending toggle; topic pills on cards filter on click; removable filter chips and "Clear all"
- Filter and sort state is stored in the URL (shareable, bookmarkable); invalid URL values fall back to defaults
- Kept from v2: text/language filters, hide forks/archived, cards/table layouts
- Types: `created_at` and `topics` added to the repository type (both already returned by the GitHub API); no new dependencies
- Adapted from roadmap: filtering/sorting basics already existed, so v5 extends them instead of rebuilding them

## v4.0.0 – Workflow
- Process: every version now ships with a ready-to-paste, professional git commit message
- No code or README changes

## v3.0.0 – Documentation
- README: new "Commands: what they do and when to run them" section covering `npm install`, `npm run dev`, `npm run build` and `npm run preview`, plus typical workflows
- No code changes

## v2.0.0 – Analytics and advanced features
- Analytics page: total stars/forks/open issues, language statistics, top-starred chart, 12-month activity chart (Recharts)
- Overview: total stars and forks tiles, recent commits (GitHub commit search)
- Repositories: text filter, language filter, sorting (pushed / stars / forks / name), hide forks/archived
- Compare page: two developers side by side (`/compare`)
- Saved profiles stored in the browser (`/saved`), save button on profiles
- API: 10-minute cache (memory + sessionStorage), de-duplicated requests, "Refresh data" bypasses cache, live rate-limit meter in sidebar, handles secondary rate limits
- Fixes: removed shared-request abort bug risk, upgraded Vite 5 → 6 (dev-tooling security advisories)
- Dependencies: added `recharts`; Vite ^6

## v1.0.0 – Foundation and core dashboard
- Vite + React 18 + TypeScript, dark design system, sidebar, GitHub search, profile and repository views, loading/error states, Netlify config
