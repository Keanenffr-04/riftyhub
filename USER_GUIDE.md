# RiftyHub User Guide

A step-by-step guide to using RiftyHub, followed by an explanation of what every part does and how the parts work together.

---

## Part 1: Step by step

### 1. Start the app
1. Open PowerShell in the project folder (the one that contains `package.json`).
2. First time only: run `npm install`.
3. Run `npm run dev`.
4. Open **http://localhost:5173** in your browser.
5. Leave PowerShell open while you use the app. Press `Ctrl+C` to stop it.

### 2. Look up a developer
1. On the Home page, type a GitHub username (for example `torvalds`) and press Enter. You can also click one of the example names.
2. You land on that developer's **Overview** page.
3. Tip: on any page, press **/** to jump straight to the search box. The sun/moon button at the top switches between the dark and light theme.

### 3. Read the Overview
- The **profile card** shows their avatar, name, bio, company, location, website and join date.
- The **statistics tiles** show repositories, stars, forks, followers, following and gists.
- **Pinned repositories** shows up to six projects you pinned for this developer (see step 4). Pins are your own picks and are stored in this browser.
- **Top languages** and **Most starred** give a quick summary of their work.
- **Recent commits** lists their latest public commits.
- **Recently active repositories** shows the six most recently pushed projects.
- Use the tabs at the top (Overview, Repositories, Analytics, Activity) or the sidebar to move between pages.

### 4. Explore their repositories
1. Click the **Repositories** tab.
2. Type in the search box to search names, descriptions, languages and topics. Every word you type must match. You can also add operators, for example `stars:>100 lang:python -is:fork pushed:>2024-01-01` (open **Search tips** under the box for the full list). Anything RiftyHub can't understand is listed and ignored.
3. Use the drop-downs to filter by language, topic, license, minimum stars and when it was last pushed.
4. Tick **Hide forks** or **Hide archived** to remove those.
5. Change the sort and click the arrow button to reverse the order.
6. Click a topic pill on a card to filter by that topic.
7. Active filters appear as chips. Click a chip to remove it, or use **Clear all**.
8. In the **Table** layout, click a column heading (Repository, Stars, Forks, Updated) to sort by it, and click again to reverse. Switch between **Cards** and **Table** at the top right. Large lists show 24 cards (or 50 rows) at a time: click **Show more** for the rest.
9. The address bar keeps your filters, so you can bookmark or share the filtered page.
10. **Pinning:** click the pin button on a repository (card or table row) to pin it to the Overview, and click it again to unpin. You can pin up to six per developer.
11. **Activity in one repository:** click **Activity** on a card or table row to open that repository's page: how many public events, commits pushed, pull requests, issues and reviews you (the developer) had there, a chart per day and a timeline. It only shows the developer's own public events from the last 90 days (up to 300 across all repositories), so "nothing found" means nothing recent, not that the repository was never active.
12. **Languages of one repository:** click **Languages** on a card or table row to see a bar chart of the code in that repository, by language. It uses one GitHub request, only when you open it, and the result is kept for 30 minutes. Click the button again to close it.
13. **Presets:** set up a search you use often, click **Save current view**, name it, and click its name next time to apply it. The ✕ on a preset deletes it. Presets are saved in this browser and included in backups.

### 5. Read the Analytics
1. Click the **Analytics** tab.
2. The top tiles show totals. **Developer insights** adds median stars, recent activity, license coverage and more.
3. **Languages**: choose *Repository count* or *Code size*. Tick *Include forks* if you want forks counted. For *Code size*, click **Load code-size breakdown** (it uses up to 20 of your GitHub requests).
4. **Top repositories**: switch between Stars, Forks and Issues.
5. **Activity**: switch between repositories created per year and last push by month.
6. **Top topics** and **Licenses** show the most common ones.

### 6. Follow their activity
1. Click the **Activity** tab.
2. The tiles and chart summarise their public events from the last 90 days.
3. The **Timeline** lists each event by day. Filter by type (pushes, pull requests, issues, reviews and so on) or by repository, and click **Show more** for older events.
4. The **Commit explorer** searches every public commit they authored: type words from the commit message, pick a repository and date range, and click **Search**. Click **Load 30 more** for further results.

### 7. Compare developers
1. Click **Compare** in the sidebar (or the **Compare** button on a profile).
2. Enter two usernames and click **Compare**. Click **Add developer** to compare a third and a fourth person (the ✕ removes one). With exactly two developers the swap button flips them.
3. Read the summary line (who leads in how many metrics), the table, the language overlap, and each developer's most starred repositories.
4. Click **Compare recent activity** to see events per week for the last 13 weeks, with a chart and a table (commits, pull requests, reviews, active days, busiest week). It uses up to 3 GitHub requests per developer, which is why it only loads when you click. Very busy developers have more events than GitHub shares (300), so their oldest weeks show “—” instead of a number.
5. The link in your address bar can be shared.

### 8. Save people you want to come back to
1. On a profile, click **Save profile**.
2. Open **Saved profiles** in the sidebar.
3. Click the star to make someone a **favourite**.
4. Type a name under *New collection name* and click **Create collection** (for example "Mentors" or "Hiring").
5. Open the **Collections** menu on a saved profile and tick the collections it belongs to.
6. Use the chips to view All, Favourites or one collection. With a collection selected you can **Rename** or **Delete** it (profiles stay saved).
7. Click **Add note** on a saved profile to write a private note (up to 500 characters), for example why you saved them. Click **Edit note** to change it, and save an empty note to remove it. Notes show on the card and are found by the search box.
8. Search saved profiles (names and notes), sort them, or tick two to four profiles and click **Compare selected**.

### 9. Make RiftyHub yours
1. Open **Settings** in the sidebar.
2. **Overview layout**: tick sections to show or hide them. Reorder them by dragging a row's handle (mouse) or with the arrow buttons (keyboard and touch).
3. **Display**: choose the **Theme** (System, Dark or Light), Comfortable or Compact spacing, and whether Repositories starts as Cards or Table.
   **Repositories page defaults**: choose the sort, its direction and whether forks or archived repositories are hidden when the page opens.
4. **GitHub token (optional)**: paste a token to raise GitHub's limit (see step 10). **Save and test** checks it with GitHub first; **Remove token** deletes it.
5. **Cached GitHub data**: RiftyHub remembers GitHub's answers for a few minutes to save requests. **Clear cached data** removes them so the next page you open loads fresh data (this uses requests). Your saved profiles, notes and settings are not affected.
6. **Backup and restore**: click **Export backup** to download a file with your saved profiles (and their notes), collections, filter presets, pinned repositories and preferences. **Import backup** adds a backup file to what you already have.
7. Changes apply immediately and are remembered next time.

### 10. Keep an eye on the request limit
RiftyHub uses GitHub without a login, which allows **60 requests per hour**. The meter at the bottom of the sidebar shows how many you have left. If it runs out, wait until the reset time shown. Data is cached for 10 minutes, so revisiting a page doesn't cost extra requests. After 10 minutes, a profile you opened earlier in the same tab still appears instantly from saved data, with a note while RiftyHub quietly checks GitHub for updates (this does use requests). If that check fails, the saved data stays and the note explains why. Click **Refresh data** on a profile to fetch fresh data.

To raise the limit to **5,000 per hour**, add a free token: on GitHub open Settings → Developer settings → Personal access tokens → Fine-grained tokens, generate a token with **no permissions** (public data is enough), then paste it into **Settings → GitHub token** in RiftyHub. The token stays in this browser only and is not part of backups. If GitHub later rejects it (for example it expired), RiftyHub says so and links to Settings so you can replace or remove it.

### 11. When something goes wrong
- **Temporary problems are retried for you.** If GitHub can't be reached or has a server problem, RiftyHub retries up to twice before showing an error, and gives up on a request that takes longer than 15 seconds.
- **Offline.** A yellow banner appears if your connection drops. Pages you already opened still work.
- **Rate limit used up.** RiftyHub stops sending requests and tells you when the limit resets.
- **Unexpected error.** If a page crashes, you get a message with **Reload page** and **Back to home** instead of a blank screen. The rest of the app (the sidebar) keeps working.
- **Keyboard and screen readers.** Press Tab once on any page to reveal **Skip to main content**. Each page sets its own tab title, focus moves to the content when you change pages, and the charts have text lists of their values.

---

## Part 2: What everything does and how it works together

### The big picture
RiftyHub is a web page that runs entirely in your browser. There is no RiftyHub server and no account. When you look up a developer, your browser asks **GitHub's public API** for the data, turns it into statistics and charts, and shows it. Nothing you search is sent anywhere else.

```
 You type a username
        │
        ▼
 React Router opens /u/<username>
        │
        ▼
 UserLayout asks the GitHub service for the profile + repositories
        │                 (cache first, then GitHub, rate limit tracked)
        ▼
 Overview / Repositories / Analytics / Activity pages
 all read the same loaded data and calculate what they need
```

### The pages
| Page | What it does |
| --- | --- |
| **Home** | Search box and example usernames. |
| **Overview** | Profile card plus summary sections you can reorder or hide. |
| **Repositories** | Search, filter and sort a developer's repositories. |
| **Analytics** | Statistics, language breakdowns and charts. |
| **Activity** | Public event timeline and the commit explorer. |
| **Compare** | Two to four developers side by side, plus a weekly activity comparison. |
| **Saved profiles** | Your favourites, collections and notes. |
| **Settings** | Layout, display, token, cached data, backup and restore. |

### The parts under the hood
| Part | Where | What it does |
| --- | --- | --- |
| GitHub service | `src/services/github.ts` | Every request to GitHub goes through here: profile, repositories, events, commit search, language bytes. It adds a 15-second timeout, retries temporary failures, stops early when your quota is used up, loads repository pages in parallel and keeps only the fields the app uses. It turns errors into clear messages. |
| Cache | `src/services/cache.ts` | Remembers responses (in the browser tab): fresh for 10 minutes, then kept for up to 24 hours as "saved data" that is shown instantly while a new copy loads in the background. Repeat visits are instant and fresh ones don't use your request allowance. Settings can clear it on demand. Tidies itself: entries older than 24 hours are removed on start, and the soonest-to-expire entries are dropped if browser storage fills up. |
| Rate-limit meter | `src/services/rateLimit.ts` | Reads GitHub's rate-limit headers and feeds the sidebar meter. |
| Token | `src/services/token.ts` | Keeps the optional GitHub token in this browser and adds it to requests sent to GitHub. |
| User layout | `src/components/UserLayout.tsx` | Loads a developer once and shares it with the Overview, Repositories, Analytics and Activity pages, so switching tabs does not reload anything. |
| Analytics helpers | `src/utils/analytics.ts` | Turns the repository list into totals, medians, language shares, topics and licenses. |
| Filter helpers | `src/utils/repoFilters.ts` | Applies the Repositories search, filters and sorting, and reads and writes them in the URL. |
| Event helpers | `src/utils/events.ts`, `activity.ts` | Turn GitHub's raw events into readable timeline entries, daily counts and summaries. |
| Search query parser | `src/utils/searchQuery.ts` | Turns the Repositories search text into plain words plus operator conditions (stars, language, dates, and so on) and reports operators it can't understand. |
| Theme and pins | `src/hooks/useTheme.ts`, `src/utils/theme.ts`, `src/utils/pins.ts`, `public/theme-init.js` | Apply the dark or light theme (before the first paint, so there is no flash), supply chart colours for each theme, and store pinned repositories. |
| Presets | `src/utils/presets.ts`, `src/hooks/usePresets.ts` | Stores, validates and merges saved filter presets. |
| Persistent store | `src/utils/persistentStore.ts` | Saves your preferences, saved profiles, collections and presets in the browser (localStorage) and keeps open tabs in sync. |
| Preferences and saved helpers | `src/utils/preferences.ts`, `saved.ts` | Validate stored data (so damaged or old data can never break the app), and handle filtering, merging and backup. |

### How the pieces work together
- **One load, many views.** The profile and repositories are fetched once and shared. Overview, Repositories, Analytics and Compare all calculate from the same list. Only Activity, the commit explorer and the code-size language breakdown make extra requests, because they need data the basic load doesn't include.
- **Real data only.** All numbers come from GitHub. Where GitHub limits what it gives (300 repositories, 300 events over 90 days, 1,000 search results), the page says so.
- **Heavy parts load only when needed.** The charting library is downloaded the first time you open Analytics or Activity, which keeps the first page load small.
- **The cache protects your limit.** Because responses are remembered, moving between tabs and back costs nothing. The meter shows what's left.
- **Your preferences shape every page.** Settings are stored in your browser and read by the Overview (which sections, in what order), the Repositories page (starting layout) and the whole app (spacing).
- **Saved profiles connect to Compare.** From Saved profiles you can compare one person (the **Compare** button) or two to four (tick them, then **Compare selected**). Compare also links back to each developer's profile, and every profile has a Compare button.
- **Your data stays with you.** Saved profiles, notes, collections, presets, pins and preferences live only in this browser. Use **Export backup** if you want a copy or want to move to another browser.

### Good to know
- Without a GitHub token, GitHub allows 60 requests per hour and about 10 commit searches per minute. With one: 5,000 per hour and about 30 searches per minute.
- Only public data is shown. Private repositories never appear.
- Clearing your browser data erases saved profiles and preferences unless you exported a backup.
