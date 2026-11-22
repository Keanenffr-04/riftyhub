# Changelog

## v8.0.0 – Personalisation and user experience
- Settings page (new sidebar link): show, hide and reorder the Overview sections, comfortable or compact density, default Repositories layout (cards or table); all saved in the browser and applied on every visit
- Saved profiles: favourites (star), named collections (create, rename, delete, assign), search, three sort options, and "Compare selected" for any two saved developers
- Backup and restore: export saved profiles, collections and preferences to a JSON file and import them back (imports add to existing data)
- Data safety: stored data is validated on load, so old, damaged or hand-edited data falls back to safe defaults; profiles saved in earlier versions load unchanged
- New USER_GUIDE.md: step-by-step usage and an explanation of how the parts work together
- No new dependencies. Adapted from roadmap: the saved-profile list and Compare button already existed from v2, so v8 extends them

## v7.0.0 – Developer comparison and activity
- Compare: now 11 metrics (adds original repositories, median stars, pushed in the last 12 months, license coverage, archived), a summary of who leads in how many metrics, language overlap (shared and unique languages), most starred repositories per developer, a swap button, and a Compare button on every profile
- New Activity page and tab: real public event timeline grouped by day (pushes, pull requests, issues, reviews, comments, stars, forks, releases) with type and repository filters, activity tiles and a daily activity chart
- Commit explorer: search commit messages, filter by repository and date, paginated "load more" (up to 300 results), total match count; Overview links to it from Recent commits
- README: new "Quick start: open the app" section at the top with the local server link (http://localhost:5173)
- No new dependencies. Activity covers GitHub's last 90 days / 300 public events; commit explorer uses GitHub's commit search
- Adapted from roadmap: the comparison page and recent commits already existed from v2, so v7 extends them

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
