import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

const numericRows: { label: string; get: (s: Side) => number; fmt?: (n: number) => string; higherWins: boolean }[] = [
  { label: 'Followers', get: (s) => s.user.followers, higherWins: true },
  { label: 'Following', get: (s) => s.user.following, higherWins: false },
  { label: 'Public repositories', get: (s) => s.user.public_repos, higherWins: true },
  { label: 'Total stars', get: (s) => s.stats.totalStars, higherWins: true },
  { label: 'Total forks', get: (s) => s.stats.totalForks, higherWins: true },
  { label: 'Avg. stars per original repo', get: (s) => s.stats.avgStars, fmt: (n) => n.toFixed(1), higherWins: true },
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

  return (
    <div className="stack">
      <div className="card table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <td />
              {[left, right].map((s) => (
                <th key={s.user.login} scope="col">
                  <Link to={`/u/${s.user.login}`} className="compare-user">
                    <img src={s.user.avatar_url} alt="" width={44} height={44} />
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
      <p className="muted small">Highlighted values are the higher of the two. Repository totals use up to 300 public repositories each.</p>

      <div className="compare-langs">
        {[left, right].map((s) => (
          <section key={s.user.login} className="card panel">
            <h2>@{s.user.login} languages</h2>
            <LanguageBars languages={s.stats.languages} limit={6} />
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
