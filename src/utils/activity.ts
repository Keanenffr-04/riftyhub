import type { ActivityEvent, ActivityKind } from '../types/github'
import type { MonthBucket } from './analytics'

export const KIND_FILTERS: { value: ActivityKind | ''; label: string }[] = [
  { value: '', label: 'All activity' },
  { value: 'push', label: 'Pushes' },
  { value: 'pull_request', label: 'Pull requests' },
  { value: 'issue', label: 'Issues' },
  { value: 'review', label: 'Reviews' },
  { value: 'comment', label: 'Comments' },
  { value: 'create', label: 'Created' },
  { value: 'fork', label: 'Forks' },
  { value: 'star', label: 'Stars' },
  { value: 'release', label: 'Releases' },
  { value: 'other', label: 'Other' },
]

export interface ActivitySummary {
  total: number
  commits: number
  pullRequests: number
  issues: number
  discussion: number
  activeDays: number
  topRepo: { name: string; count: number } | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day, e.g. "2026-11-19". */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function summarizeActivity(events: ActivityEvent[]): ActivitySummary {
  const repoCounts = new Map<string, number>()
  const days = new Set<string>()
  let commits = 0
  let pullRequests = 0
  let issues = 0
  let discussion = 0

  for (const e of events) {
    days.add(dayKey(e.createdAt))
    repoCounts.set(e.repo, (repoCounts.get(e.repo) ?? 0) + 1)
    commits += e.commits
    if (e.kind === 'pull_request') pullRequests++
    else if (e.kind === 'issue') issues++
    else if (e.kind === 'review' || e.kind === 'comment') discussion++
  }

  const top = [...repoCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return {
    total: events.length,
    commits,
    pullRequests,
    issues,
    discussion,
    activeDays: days.size,
    topRepo: top ? { name: top[0], count: top[1] } : null,
  }
}

/** Events per day from the oldest loaded event (at most `maxDays` back) up to today. */
export function eventsByDay(events: ActivityEvent[], maxDays = 90, today = new Date()): MonthBucket[] {
  if (events.length === 0) return []
  const counts = new Map<string, number>()
  let oldest = today.getTime()
  for (const e of events) {
    const t = Date.parse(e.createdAt)
    if (t < oldest) oldest = t
    counts.set(dayKey(e.createdAt), (counts.get(dayKey(e.createdAt)) ?? 0) + 1)
  }
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const earliest = new Date(end.getTime() - (maxDays - 1) * 86_400_000)
  const o = new Date(oldest)
  const start = new Date(Math.max(new Date(o.getFullYear(), o.getMonth(), o.getDate()).getTime(), earliest.getTime()))

  const buckets: MonthBucket[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    buckets.push({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: counts.get(dayKey(d)) ?? 0 })
  }
  return buckets
}

export interface DayGroup {
  key: string
  label: string
  events: ActivityEvent[]
}

/** Groups events (already newest first) by local calendar day, keeping their order. */
export function groupByDay(events: ActivityEvent[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const e of events) {
    const key = dayKey(e.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.events.push(e)
    else {
      const label = new Date(e.createdAt).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      groups.push({ key, label, events: [e] })
    }
  }
  return groups
}
