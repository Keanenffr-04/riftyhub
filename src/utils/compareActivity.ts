import type { ActivityEvent } from '../types/github'
import { summarizeActivity, type ActivitySummary } from './activity'
import { EVENT_LIMIT } from './events'

/** The comparison covers the last 13 weeks, which fits inside GitHub's 90-day event window. */
export const COMPARE_WEEKS = 13

export interface WeekSlot {
  /** Monday 00:00 (local time) and the following Monday, as timestamps. */
  start: number
  end: number
  label: string
}

/** Monday 00:00 (local time) of the week containing the given date. */
export function startOfWeek(d: Date): Date {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

/** The last `weeks` weeks, oldest first, ending with the week that contains `today`. */
export function weekSlots(today = new Date(), weeks = COMPARE_WEEKS): WeekSlot[] {
  const first = startOfWeek(today)
  first.setDate(first.getDate() - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(first)
    start.setDate(first.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return { start: start.getTime(), end: end.getTime(), label: start.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }
  })
}

export interface WeeklyActivity {
  /** Events per week, oldest first. null = GitHub no longer shares that week for this developer. */
  counts: (number | null)[]
  /** True when the developer has more public events than GitHub shares, so their oldest weeks are cut off. */
  capped: boolean
  /** Date of the oldest event that was loaded, or null when there are none. */
  coveredFrom: number | null
  /** Totals for the events inside the compared weeks. */
  summary: ActivitySummary
  /** Average events per week over the weeks that GitHub shares. */
  avgPerWeek: number
  busiest: { label: string; count: number } | null
}

export function weeklyActivity(events: ActivityEvent[], slots: WeekSlot[], limit = EVENT_LIMIT): WeeklyActivity {
  const times = events.map((e) => Date.parse(e.createdAt))
  const windowStart = slots[0]?.start ?? 0
  const windowEnd = slots[slots.length - 1]?.end ?? 0
  const inWindow = events.filter((_, i) => times[i] >= windowStart && times[i] < windowEnd)
  const oldest = times.length ? Math.min(...times) : null
  const capped = events.length >= limit

  const counts = slots.map((slot): number | null => {
    // A week that ends before the oldest loaded event of a capped list is simply not available.
    if (capped && oldest !== null && slot.end <= oldest) return null
    return times.filter((t) => t >= slot.start && t < slot.end).length
  })

  const known = counts.filter((c): c is number => c !== null)
  let busiest: WeeklyActivity['busiest'] = null
  counts.forEach((count, i) => {
    if (count !== null && count > 0 && (!busiest || count > busiest.count)) busiest = { label: slots[i].label, count }
  })

  return {
    counts,
    capped,
    coveredFrom: oldest,
    summary: summarizeActivity(inWindow),
    avgPerWeek: known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0,
    busiest,
  }
}
