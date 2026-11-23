import { useMemo } from 'react'
import { useCompareActivity } from '../hooks/useCompareActivity'
import { useChartPalette } from '../hooks/useTheme'
import { describeError } from './States'
import { SERIES_DASHES, WeeklyCompareChart } from './Charts'
import { topIndices } from '../utils/compare'
import { weekSlots, weeklyActivity, type WeeklyActivity } from '../utils/compareActivity'
import { formatDate, formatNumber } from '../utils/format'

const rows: { label: string; get: (w: WeeklyActivity) => number; fmt?: (n: number) => string }[] = [
  { label: 'Public events', get: (w) => w.summary.total },
  { label: 'Commits pushed', get: (w) => w.summary.commits },
  { label: 'Pull requests', get: (w) => w.summary.pullRequests },
  { label: 'Issues', get: (w) => w.summary.issues },
  { label: 'Reviews and comments', get: (w) => w.summary.discussion },
  { label: 'Active days', get: (w) => w.summary.activeDays },
  { label: 'Average events per week', get: (w) => w.avgPerWeek, fmt: (n) => n.toFixed(1) },
]

/** Weekly public activity for two to four developers: a chart, a table and the weekly numbers. */
export default function CompareActivity({ users }: { users: string[] }) {
  const state = useCompareActivity(users)
  const palette = useChartPalette()
  const slots = useMemo(() => weekSlots(), [])

  const people = useMemo(() => {
    if (state.status !== 'done') return []
    return state.results.flatMap((r, i) => (r.status === 'ok' ? [{ name: users[i], activity: weeklyActivity(r.events, slots) }] : []))
  }, [state, users, slots])

  if (state.status === 'loading') {
    return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} role="status" aria-label="Loading activity comparison" />
  }

  const failures = state.results.flatMap((r, i) => (r.status === 'error' ? [{ name: users[i], error: r.error }] : []))
  const capped = people.filter((p) => p.activity.capped)

  return (
    <div className="stack">
      {failures.length > 0 && (
        <div className="stack" role="alert">
          {failures.map((f) => {
            const d = describeError(f.error, f.name)
            return (
              <div key={f.name} className="card inline-error">
                <p>
                  <strong>@{f.name}: {d.title}.</strong> {d.body}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {people.length > 0 && (
        <>
          <ul className="series-legend" aria-label="Chart legend">
            {people.map((p, i) => (
              <li key={p.name}>
                <svg width="32" height="10" aria-hidden="true">
                  <line x1="1" y1="5" x2="31" y2="5" stroke={palette.series[i % palette.series.length]} strokeWidth="2.5" strokeDasharray={SERIES_DASHES[i % SERIES_DASHES.length]} />
                </svg>
                @{p.name}
              </li>
            ))}
          </ul>

          <WeeklyCompareChart
            labels={slots.map((s) => s.label)}
            series={people.map((p) => ({ name: p.name, values: p.activity.counts }))}
            ariaLabel={`Line chart of public events per week for ${people.map((p) => `@${p.name}`).join(', ')}. The weekly numbers are listed below the table.`}
          />

          <div className="card table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <td />
                  {people.map((p) => (
                    <th key={p.name} scope="col">
                      @{p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const values = people.map((p) => row.get(p.activity))
                  const top = topIndices(values)
                  const fmt = row.fmt ?? formatNumber
                  return (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {values.map((v, i) => (
                        <td key={people[i].name} className={top.includes(i) ? 'win' : undefined}>
                          {fmt(v)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
                <tr>
                  <th scope="row">Busiest week</th>
                  {people.map((p) => (
                    <td key={p.name}>{p.activity.busiest ? `${p.activity.busiest.label} (${formatNumber(p.activity.busiest.count)})` : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <details className="menu">
            <summary>Show the weekly numbers</summary>
            <div className="table-wrap menu-panel">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Week of</th>
                    {people.map((p) => (
                      <th key={p.name} scope="col">
                        @{p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, w) => (
                    <tr key={slot.start}>
                      <th scope="row">{slot.label}</th>
                      {people.map((p) => (
                        <td key={p.name}>{p.activity.counts[w] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <div className="muted small stack-tight">
            <p>
              Public events over the last {slots.length} weeks (weeks start on Monday). The oldest week may be incomplete, because GitHub shares public activity from the last 90 days only. Highlighted values are the highest.
            </p>
            {capped.map((p) => (
              <p key={p.name}>
                @{p.name} has more public events than GitHub shares (300), so weeks before {p.activity.coveredFrom ? formatDate(new Date(p.activity.coveredFrom).toISOString()) : 'then'} are left out for them (shown as “—” and gaps in the chart) and their totals and average cover only the weeks that are shown.
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
