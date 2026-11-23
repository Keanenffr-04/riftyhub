import type { CSSProperties } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GitHubRepo } from '../types/github'
import type { LanguageStat, MonthBucket } from '../utils/analytics'
import { useChartPalette } from '../hooks/useTheme'
import type { ChartPalette } from '../utils/theme'

const tooltipStyle = (c: ChartPalette): CSSProperties => ({
  background: c.tooltipBg,
  border: `1px solid ${c.tooltipBorder}`,
  borderRadius: 10,
  color: c.tooltipText,
  fontSize: 13,
})
const tooltipText = (c: ChartPalette): CSSProperties => ({ color: c.tooltipText })

interface LanguageChartProps {
  languages: LanguageStat[]
  /** Formats a slice's value for the tooltip; default is a repository count. */
  formatValue?: (n: number) => string
  ariaLabel?: string
}

export function LanguageChart({ languages, formatValue, ariaLabel = 'Donut chart of repositories by primary language' }: LanguageChartProps) {
  const c = useChartPalette()
  const top = languages.slice(0, 7)
  const rest = languages.slice(7)
  const data = [
    ...top.map((l) => ({ name: l.name, value: l.count, color: l.color })),
    ...(rest.length ? [{ name: 'Other', value: rest.reduce((s, l) => s + l.count, 0), color: c.other }] : []),
  ]

  return (
    <>
    <div className="chart-box" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle(c)}
            itemStyle={tooltipText(c)}
            formatter={(value, name) => [
              formatValue ? formatValue(Number(value)) : `${value} ${value === 1 ? 'repository' : 'repositories'}`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <ul className="sr-only" aria-label={`${ariaLabel}: values`}>
      {languages.slice(0, 8).map((l) => (
        <li key={l.name}>
          {l.name}: {formatValue ? formatValue(l.count) : `${l.count} ${l.count === 1 ? 'repository' : 'repositories'}`}, {l.percent.toFixed(1)}%
        </li>
      ))}
    </ul>
    </>
  )
}

export type RepoMetric = 'stars' | 'forks' | 'issues'

export const METRIC_LABELS: Record<RepoMetric, string> = {
  stars: 'Stars',
  forks: 'Forks',
  issues: 'Open issues and PRs',
}

export function metricValue(repo: GitHubRepo, metric: RepoMetric): number {
  return metric === 'stars' ? repo.stargazers_count : metric === 'forks' ? repo.forks_count : repo.open_issues_count
}

export function TopReposChart({ repos, metric = 'stars' }: { repos: GitHubRepo[]; metric?: RepoMetric }) {
  const c = useChartPalette()
  const label = METRIC_LABELS[metric]
  const data = repos.map((r) => ({ name: r.name, value: metricValue(r, metric) }))
  return (
    <>
    <div className="chart-box" role="img" aria-label={`Bar chart of repositories with the most ${label.toLowerCase()}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis type="number" stroke={c.axis} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickFormatter={(v: string) => (v.length > 17 ? `${v.slice(0, 16)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: c.cursor }}
            contentStyle={tooltipStyle(c)}
            itemStyle={tooltipText(c)}
            labelStyle={tooltipText(c)}
            formatter={(value) => [`${value}`, label]}
          />
          <Bar dataKey="value" fill={c.accent} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ul className="sr-only" aria-label={`Repositories with the most ${label.toLowerCase()}`}>
      {data.map((d) => (
        <li key={d.name}>
          {d.name}: {d.value}
        </li>
      ))}
    </ul>
    </>
  )
}

export function ActivityChart({ activity, ariaLabel = 'Bar chart of repositories by month of last push' }: { activity: MonthBucket[]; ariaLabel?: string }) {
  const c = useChartPalette()
  return (
    <>
    <div className="chart-box short" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={activity} margin={{ left: -12, right: 8 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" stroke={c.axis} tick={{ fill: c.axis, fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis stroke={c.axis} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: c.cursor }}
            contentStyle={tooltipStyle(c)}
            itemStyle={tooltipText(c)}
            labelStyle={tooltipText(c)}
            formatter={(value) => [`${value}`, 'Repositories']}
          />
          <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ul className="sr-only" aria-label={`${ariaLabel}: periods with activity`}>
      {activity
        .filter((b) => b.count > 0)
        .map((b) => (
          <li key={b.label}>
            {b.label}: {b.count}
          </li>
        ))}
    </ul>
    </>
  )
}
