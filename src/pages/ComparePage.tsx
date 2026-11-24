import { Suspense, lazy, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Activity, ArrowLeftRight, Plus, X } from 'lucide-react'
import { useCompare } from '../hooks/useCompare'
import LanguageBars from '../components/LanguageBars'
import RefreshNote from '../components/RefreshNote'
import { describeError } from '../components/States'
import { computeAnalytics, type Analytics } from '../utils/analytics'
import { COMPARE_KEYS, MAX_COMPARE, buildCompareParams, languageOverlap, parseCompare, tallyLeads, topIndices } from '../utils/compare'
import { formatDate, formatNumber } from '../utils/format'
import type { UserData } from '../types/github'

// The charting library is large, so the activity comparison is only downloaded when it is asked for.
const CompareActivity = lazy(() => import('../components/CompareActivity'))

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

function Results({ users }: { users: string[] }) {
  const state = useCompare(users)

  if (state.status === 'loading') {
    return <div className="skeleton" style={{ height: 380, borderRadius: 14 }} role="status" aria-label="Loading comparison" />
  }

  const failures = state.results.flatMap((r, i) => (r.status === 'error' ? [{ name: users[i], error: r.error }] : []))

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

  const sides = state.results.flatMap((r) => (r.status === 'ok' ? [toSide(r.data)] : []))
  if (sides.length !== users.length) return null

  // Tally who has the single highest value across the metrics where higher is meaningful; a shared top spot is undecided.
  const scored = numericRows.filter((r) => r.higherWins)
  const { leads, undecided } = tallyLeads(
    scored.map((r) => sides.map((s) => r.get(s))),
    sides.length,
  )
  const overlap = languageOverlap(sides.map((s) => s.stats.languages.map((l) => l.name)))
  const pair = sides.length === 2

  return (
    <div className="stack">
      <RefreshNote state={state} />
      <p className="card compare-summary" aria-live="polite">
        {sides.map((s, i) => (
          <span key={s.user.login}>
            <strong>@{s.user.login}</strong> leads in {leads[i]}
          </span>
        ))}
        <span className="muted">
          {undecided} {pair ? 'tied' : 'without a single leader'} · {scored.length} metrics compared
        </span>
      </p>

      <div className="card table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <td />
              {sides.map((s) => (
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
              const values = sides.map((s) => row.get(s))
              const top = row.higherWins ? topIndices(values) : []
              const fmt = row.fmt ?? formatNumber
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {values.map((v, i) => (
                    <td key={sides[i].user.login} className={top.includes(i) ? 'win' : undefined}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              )
            })}
            <tr>
              <th scope="row">Top language</th>
              {sides.map((s) => (
                <td key={s.user.login}>{s.stats.topLanguage ?? '—'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Joined</th>
              {sides.map((s) => (
                <td key={s.user.login}>{formatDate(s.user.created_at)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Highlighted values are the highest{pair ? ' of the two' : ''} (nothing is highlighted when everyone has the same value, or for following, original and archived counts, where higher is not better or worse). Repository statistics use up to 300 public repositories each.
      </p>

      <section className="card panel" aria-labelledby="overlap-heading">
        <h2 id="overlap-heading">Language overlap</h2>
        <p className="muted small">Primary languages of original repositories.</p>
        <div className="overlap">
          <div>
            <h3>{pair ? 'Both use' : `All ${sides.length} use`}</h3>
            <PillList names={overlap.common} empty="No languages in common" />
          </div>
          {!pair && (
            <div>
              <h3>Shared by some</h3>
              <PillList names={overlap.some} empty="None" />
            </div>
          )}
          {sides.map((s, i) => (
            <div key={s.user.login}>
              <h3>Only @{s.user.login}</h3>
              <PillList names={overlap.only[i]} empty="None" />
            </div>
          ))}
        </div>
      </section>

      <div className="compare-langs">
        {sides.map((s) => (
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

      <ActivityGate users={users} />
    </div>
  )
}

function PillList({ names, empty }: { names: string[]; empty: string }) {
  return (
    <div className="pills">
      {names.length ? (
        names.map((n) => (
          <span key={n} className="tag">
            {n}
          </span>
        ))
      ) : (
        <span className="muted small">{empty}</span>
      )}
    </div>
  )
}

/** The activity comparison costs up to 3 GitHub requests per developer, so it only loads when asked for. */
function ActivityGate({ users }: { users: string[] }) {
  const [started, setStarted] = useState(false)
  return (
    <section className="card panel" aria-labelledby="activity-compare-heading">
      <h2 id="activity-compare-heading">Recent activity</h2>
      {started ? (
        <Suspense fallback={<div className="skeleton" style={{ height: 300, borderRadius: 14 }} role="status" aria-label="Loading activity comparison" />}>
          <CompareActivity users={users} />
        </Suspense>
      ) : (
        <>
          <p className="muted small">
            Compare public activity week by week: events, commits, pull requests, reviews and more over the last 13 weeks. This makes up to 3 GitHub requests per developer ({users.length * 3} here), so it only loads when you ask.
          </p>
          <div className="controls">
            <button type="button" className="btn" onClick={() => setStarted(true)}>
              <Activity size={14} aria-hidden="true" /> Compare recent activity
            </button>
          </div>
        </>
      )}
    </section>
  )
}

const PROBLEMS = {
  invalid: 'One of those isn’t a valid GitHub username. Usernames use letters, numbers and single hyphens, up to 39 characters.',
  duplicate: 'Each developer can only be added once.',
  too_few: 'Enter at least two GitHub usernames.',
} as const

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const fromLink = parseCompare(COMPARE_KEYS.map((k) => params.get(k)))
  // Start with the names from the link (at least two boxes), and let people add up to four.
  const [fields, setFields] = useState<string[]>(() => {
    const given = COMPARE_KEYS.map((k) => (params.get(k) ?? '').trim()).filter(Boolean)
    return given.length >= 2 ? given : [...given, ...new Array<string>(2 - given.length).fill('')]
  })
  const [justAdded, setJustAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = (i: number, value: string) => setFields((f) => f.map((x, j) => (j === i ? value : x)))

  function handleAdd() {
    setFields((f) => (f.length < MAX_COMPARE ? [...f, ''] : f))
    setJustAdded(true)
  }

  function handleRemove(i: number) {
    setFields((f) => f.filter((_, j) => j !== i))
    setJustAdded(false)
  }

  function handleSwap() {
    const [x, y] = fields
    setFields([y, x])
    if (fromLink.problem === null && fromLink.users.length === 2) setParams(buildCompareParams([fromLink.users[1], fromLink.users[0]]))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseCompare(fields)
    if (parsed.problem) {
      setError(PROBLEMS[parsed.problem])
      return
    }
    setError(null)
    setParams(buildCompareParams(parsed.users))
  }

  // A link with unusable names explains itself; a link with only one name (from a profile) just waits for the second.
  const linkProblem = fromLink.problem === 'invalid' || fromLink.problem === 'duplicate' ? PROBLEMS[fromLink.problem] : null

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Compare developers</h1>
        <p className="muted">See two to four GitHub profiles side by side.</p>
      </div>

      <form className="compare-form" onSubmit={handleSubmit}>
        {fields.map((value, i) => (
          <div key={i} className="compare-field">
            <label>
              <span className="sr-only">{['First', 'Second', 'Third', 'Fourth'][i]} username</span>
              <input
                type="text"
                value={value}
                onChange={(e) => setField(i, e.target.value)}
                placeholder={`${['First', 'Second', 'Third', 'Fourth'][i]} username`}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={justAdded && i === fields.length - 1}
              />
            </label>
            {i >= 2 && (
              <button type="button" className="btn icon-only" onClick={() => handleRemove(i)} aria-label={`Remove the ${['first', 'second', 'third', 'fourth'][i]} developer`} title="Remove">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        {fields.length === 2 && (
          <button type="button" className="btn icon-only" onClick={handleSwap} aria-label="Swap the two developers" title="Swap">
            <ArrowLeftRight size={16} />
          </button>
        )}
        {fields.length < MAX_COMPARE && (
          <button type="button" className="btn" onClick={handleAdd}>
            <Plus size={15} aria-hidden="true" /> Add developer
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          Compare
        </button>
      </form>
      {(error ?? linkProblem) && (
        <p className="field-error" role="alert">
          {error ?? linkProblem}
        </p>
      )}

      {fromLink.problem === null && <Results key={fromLink.users.join('|')} users={fromLink.users} />}
    </div>
  )
}
