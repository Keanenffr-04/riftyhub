import { useMemo, useState } from 'react'
import { LanguageTrendChart, type TrendMode } from './Charts'
import { useChartPalette } from '../hooks/useTheme'
import { computeLanguageTrends, yearShare } from '../utils/languageTrends'
import type { GitHubRepo } from '../types/github'

/** Which languages a developer started projects in, year by year (primary language, by creation year). */
export default function LanguageTrendsPanel({ repos }: { repos: GitHubRepo[] }) {
  const [mode, setMode] = useState<TrendMode>('share')
  const [includeForks, setIncludeForks] = useState(false)
  const palette = useChartPalette()
  const trends = useMemo(() => computeLanguageTrends(repos, { includeForks }), [repos, includeForks])
  const scope = includeForks ? 'repository' : 'original (non-fork) repository'
  const ariaLabel = mode === 'share' ? 'Stacked bar chart of the language share of repositories created each year' : 'Stacked bar chart of repositories created each year by language'

  return (
    <section className="card panel" aria-labelledby="trends-heading">
      <div className="panel-head">
        <h2 id="trends-heading">Language trends</h2>
        <div className="panel-tools">
          <label className="check">
            <input type="checkbox" checked={includeForks} onChange={(e) => setIncludeForks(e.target.checked)} /> Include forks
          </label>
          <div className="toggle" role="group" aria-label="Trend measure">
            <button className={mode === 'share' ? 'active' : ''} onClick={() => setMode('share')} aria-pressed={mode === 'share'}>
              Share
            </button>
            <button className={mode === 'count' ? 'active' : ''} onClick={() => setMode('count')} aria-pressed={mode === 'count'}>
              Count
            </button>
          </div>
        </div>
      </div>

      <p className="muted small">
        Primary language of each {scope}, grouped by the year it was created. This shows which languages projects were started in, not how much code was
        written each year.
        {trends.noLanguageCount > 0 && ` ${trends.noLanguageCount} without a detected language ${trends.noLanguageCount === 1 ? 'is' : 'are'} not counted.`}
      </p>

      {trends.series.length === 0 ? (
        <p className="muted">No language data available.</p>
      ) : (
        <>
          <ul className="series-legend" aria-label="Chart legend">
            {trends.series.map((s) => (
              <li key={s.name}>
                <svg width="12" height="12" aria-hidden="true">
                  <rect width="12" height="12" rx="3" fill={s.color ?? palette.other} />
                </svg>
                {s.name}
              </li>
            ))}
          </ul>

          <LanguageTrendChart trends={trends} mode={mode} ariaLabel={ariaLabel} />

          <details className="menu">
            <summary>Show the numbers</summary>
            <div className="table-wrap menu-panel">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    {trends.series.map((s) => (
                      <th key={s.name} scope="col">
                        {s.name}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.years.map((year, y) => (
                    <tr key={year}>
                      <th scope="row">{year}</th>
                      {trends.series.map((s, i) => (
                        <td key={s.name}>
                          {trends.totals[y] === 0 ? '—' : mode === 'share' ? `${Math.round(yearShare(trends, i, y))}%` : s.counts[y]}
                        </td>
                      ))}
                      <td>{trends.totals[y]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
