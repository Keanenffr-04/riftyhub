# Changelog

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
