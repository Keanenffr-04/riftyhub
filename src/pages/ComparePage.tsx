import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { isValidUsername } from '../services/github'
import { useCompare } from '../hooks/useCompare'
import LanguageBars from '../components/LanguageBars'
import { describeError } from '../components/States'
import { computeAnalytics, type Analytics } from '../utils/analytics'
import { formatDate, formatNumber } from '../utils/format'
import type { UserData } from '../types/github'

interface Side extends UserData {
  stats: Analytics
}

const toSide = (data: UserData): Side => ({ ...data, stats: computeAnalytics(data.repos) })

const formatMedian = (n: number) => (Number.isInteger(n) ? formatNumber(n) : n.toFixed(1))

const numericRows: { label: string; get: (s: Side) => number; fmt?: (n: number) => string; higherWins: boolean }[] = [
  { label: 'Followers', get: (s) => s.user.followers, higherWins: true },
  { label: 'Following', get: (s) => s.user.following, higherWins: false },
  { label: 'Public repositories', get: (s) => s.user.public_repos, higherWins: true },
  { label: 'Original repositories', get: (s) => s.stats.originalCount, higherWins: false },
  { label: 'Total stars', get: (s) => s.stats.totalStars, higherWins: true },
  { label: 'Total forks', get: (s) => s.stats.totalForks, higherWins: true },
  { label: 'Avg. stars per original repo', get: (s) => s.stats.avgStars, fmt: (n) => n.toFixed(1), higherWins: true },
  { label: 'Median stars per original repo', get: (s) => s.stats.medianStars, fmt: formatMedian, higherWins: true },
  { label: 'Pushed in the last 12 months', get: (s) => s.stats.activeLastYear, higherWins: true },
  { label: 'Original repos with a license', get: (s) => s.stats.licensedPercent, fmt: (n) => `${Math.round(n)}%`, higherWins: true },
  { label: 'Archived repositories', get: (s) => s.stats.archivedCount, higherWins: false },
]

function Results({ a, b }: { a: string; b: string }) {
  const state = useCompare(a, b)

  if (state.status === 'loading') {
    return <div className="skeleton" style={{ height: 380, borderRadius: 14 }} role="status" aria-label="Loading comparison" />
  }

  const failures = [
    { name: a, result: state.a },
    { name: b, result: state.b },
  ].flatMap((s) => (s.result.status === 'error' ? [{ name: s.name, error: s.result.error }] : []))

  if (failures.length > 0) {
    return (
      <div className="stack" role="alert">
        {failures.map((f) => {
          const d = describeError(f.error, f.name)
          return (
            <div key={f.name} className="card inline-error">
              <p>
                <strong>{d.title}.</strong> {d.body}
              </p>
            </div>
          )
        })}
      </div>
    )
  }
  if (state.a.status !== 'ok' || state.b.status !== 'ok') return null

  const left = toSide(state.a.data)
  const right = toSide(state.b.data)

  // Tally who has the higher value across the metrics where higher is meaningful; equal values are ties.
  const scored = numericRows.filter((r) => r.higherWins)
  const leftWins = scored.filter((r) => r.get(left) > r.get(right)).length
  const rightWins = scored.filter((r) => r.get(right) > r.get(left)).length
  const ties = scored.length - leftWins - rightWins

  const leftNames = new Set(left.stats.languages.map((l) => l.name))
  const rightNames = new Set(right.stats.languages.map((l) => l.name))
  const shared = left.stats.languages.filter((l) => rightNames.has(l.name)).map((l) => l.name)
  const onlyLeft = left.stats.languages.filter((l) => !rightNames.has(l.name)).map((l) => l.name)
  const onlyRight = right.stats.languages.filter((l) => !leftNames.has(l.name)).map((l) => l.name)

  return (
    <div className="stack">
      <p className="card compare-summary" aria-live="polite">
        <span>
          <strong>@{left.user.login}</strong> leads in {leftWins}
        </span>
        <span>
          <strong>@{right.user.login}</strong> leads in {rightWins}
        </span>
        <span className="muted">
          {ties} tied · {scored.length} metrics compared
        </span>
      </p>

      <div className="card table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <td />
              {[left, right].map((s) => (
                <th key={s.user.login} scope="col">
                  <Link to={`/u/${s.user.login}`} className="compare-user">
                    <img src={s.user.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" />
                    <span>
                      <strong>{s.user.name ?? s.user.login}</strong>
                      <span className="muted">@{s.user.login}</span>
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numericRows.map((row) => {
              const va = row.get(left)
              const vb = row.get(right)
              const fmt = row.fmt ?? formatNumber
              const decided = row.higherWins && va !== vb
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className={decided && va > vb ? 'win' : undefined}>{fmt(va)}</td>
                  <td className={decided && vb > va ? 'win' : undefined}>{fmt(vb)}</td>
                </tr>
              )
            })}
            <tr>
              <th scope="row">Top language</th>
              <td>{left.stats.topLanguage ?? '—'}</td>
              <td>{right.stats.topLanguage ?? '—'}</td>
            </tr>
            <tr>
              <th scope="row">Joined</th>
              <td>{formatDate(left.user.created_at)}</td>
              <td>{formatDate(right.user.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">Highlighted values are the higher of the two (not shown for following, original and archived counts, where higher is not better or worse). Repository statistics use up to 300 public repositories each.</p>

      <section className="card panel" aria-labelledby="overlap-heading">
        <h2 id="overlap-heading">Language overlap</h2>
        <p className="muted small">Primary languages of original repositories.</p>
        <div className="overlap">
          <div>
            <h3>Both use</h3>
            <div className="pills">{shared.length ? shared.map((n) => <span key={n} className="tag">{n}</span>) : <span className="muted small">No languages in common</span>}</div>
          </div>
          <div>
            <h3>Only @{left.user.login}</h3>
            <div className="pills">{onlyLeft.length ? onlyLeft.map((n) => <span key={n} className="tag">{n}</span>) : <span className="muted small">None</span>}</div>
          </div>
          <div>
            <h3>Only @{right.user.login}</h3>
            <div className="pills">{onlyRight.length ? onlyRight.map((n) => <span key={n} className="tag">{n}</span>) : <span className="muted small">None</span>}</div>
          </div>
        </div>
      </section>

      <div className="compare-langs">
        {[left, right].map((s) => (
          <section key={s.user.login} className="card panel">
            <h2>@{s.user.login} languages</h2>
            <LanguageBars languages={s.stats.languages} limit={6} />
            {s.stats.topStarred.length > 0 && (
              <>
                <h3 className="mini-heading">Most starred</h3>
                <ol className="top-list">
                  {s.stats.topStarred.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      <a href={r.html_url} target="_blank" rel="noopener noreferrer">
                        {r.name}
                      </a>
                      <span className="muted">{formatNumber(r.stargazers_count)} stars</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const a = (params.get('a') ?? '').trim()
  const b = (params.get('b') ?? '').trim()
  const [first, setFirst] = useState(a)
  const [second, setSecond] = useState(b)
  const [error, setError] = useState<string | null>(null)

  function handleSwap() {
    setFirst(second)
    setSecond(first)
    if (a && b) setParams({ a: b, b: a })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const x = first.trim().replace(/^@/, '')
    const y = second.trim().replace(/^@/, '')
    if (!isValidUsername(x) || !isValidUsername(y)) {
      setError('Enter two valid GitHub usernames.')
      return
    }
    if (x.toLowerCase() === y.toLowerCase()) {
      setError('Choose two different users.')
      return
    }
    setError(null)
    setParams({ a: x, b: y })
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Compare developers</h1>
        <p className="muted">See two GitHub profiles side by side.</p>
      </div>

      <form className="compare-form" onSubmit={handleSubmit}>
        <label>
          <span className="sr-only">First username</span>
          <input type="text" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First username" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </label>
        <label>
          <span className="sr-only">Second username</span>
          <input type="text" value={second} onChange={(e) => setSecond(e.target.value)} placeholder="Second username" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </label>
        <button type="button" className="btn icon-only" onClick={handleSwap} aria-label="Swap the two developers" title="Swap">
          <ArrowLeftRight size={16} />
        </button>
        <button type="submit" className="btn btn-primary">
          Compare
        </button>
      </form>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {isValidUsername(a) && isValidUsername(b) && a.toLowerCase() !== b.toLowerCase() && <Results a={a} b={b} />}
    </div>
  )
}
