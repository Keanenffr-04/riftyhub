import { useMemo, useState, useSyncExternalStore } from 'react'
import { LanguageChart } from './Charts'
import LanguageBars from './LanguageBars'
import { MAX_LANGUAGE_REPOS, useCodeLanguages } from '../hooks/useCodeLanguages'
import { getRateLimit, subscribeRateLimit } from '../services/rateLimit'
import { buildLanguageStats, computeAnalytics } from '../utils/analytics'
import { formatBytes } from '../utils/format'
import { pushedTime } from '../utils/repoFilters'
import type { GitHubRepo } from '../types/github'

type Mode = 'count' | 'size'

export default function LanguagePanel({ repos }: { repos: GitHubRepo[] }) {
  const [mode, setMode] = useState<Mode>('count')
  const [includeForks, setIncludeForks] = useState(false)
  const rate = useSyncExternalStore(subscribeRateLimit, getRateLimit, getRateLimit)

  const counted = useMemo(() => computeAnalytics(repos, { includeForks }), [repos, includeForks])
  const candidates = useMemo(
    () => repos.filter((r) => includeForks || !r.fork).sort((a, b) => pushedTime(b) - pushedTime(a)),
    [repos, includeForks],
  )
  const { state, load, total } = useCodeLanguages(candidates)

  const sizeStats = useMemo(() => (state.status === 'done' ? buildLanguageStats(Object.entries(state.bytes)) : []), [state])

  const scope = includeForks ? 'repository' : 'original (non-fork) repository'
  const tooFewRequests = rate !== null && rate.remaining < total + 5

  return (
    <section className="card panel" aria-labelledby="lang-heading">
      <div className="panel-head">
        <h2 id="lang-heading">Languages</h2>
        <div className="panel-tools">
          <label className="check">
            <input type="checkbox" checked={includeForks} onChange={(e) => setIncludeForks(e.target.checked)} /> Include forks
          </label>
          <div className="toggle" role="group" aria-label="Language measure">
            <button className={mode === 'count' ? 'active' : ''} onClick={() => setMode('count')} aria-pressed={mode === 'count'}>
              Repository count
            </button>
            <button className={mode === 'size' ? 'active' : ''} onClick={() => setMode('size')} aria-pressed={mode === 'size'}>
              Code size
            </button>
          </div>
        </div>
      </div>

      {mode === 'count' && (
        <>
          <p className="muted small">
            Primary language of each {scope}. {counted.noLanguageCount > 0 && `${counted.noLanguageCount} of ${counted.languageRepoCount} have no detected language and are not counted. `}
            Percentages are shares of repositories that have a language.
          </p>
          {counted.languages.length === 0 ? (
            <p className="muted">No language data available.</p>
          ) : (
            <div className="lang-layout">
              <LanguageChart languages={counted.languages} />
              <LanguageBars languages={counted.languages} limit={8} />
            </div>
          )}
        </>
      )}

      {mode === 'size' && state.status === 'idle' && (
        <div className="lang-load">
          <p className="muted small">
            A repository’s primary language says little about how much code is written in each language. This loads GitHub’s real
            byte counts for the {total === MAX_LANGUAGE_REPOS ? `${MAX_LANGUAGE_REPOS} most recently pushed` : total}{' '}
            {scope}
            {total === 1 ? '' : 's'}, using up to {total} of your GitHub API requests
            {rate ? ` (${rate.remaining} left this hour)` : ''}.
          </p>
          {total === 0 ? (
            <p className="muted">There are no repositories to analyse.</p>
          ) : (
            <>
              <div>
                <button className="btn btn-primary" onClick={load} disabled={tooFewRequests}>
                  Load code-size breakdown
                </button>
              </div>
              {tooFewRequests && rate && (
                <p className="small notice-inline">
                  Only {rate.remaining} requests left. Try again after {rate.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'size' && state.status === 'loading' && (
        <p className="muted" role="status" aria-live="polite">
          Loading language data… {state.done} of {state.total} repositories
        </p>
      )}

      {mode === 'size' && state.status === 'done' && (
        <>
          <p className="muted small">
            Bytes of code across {state.used} of {candidates.length} {scope}
            {candidates.length === 1 ? '' : 's'}
            {candidates.length > state.total ? ` (the ${state.total} most recently pushed)` : ''}, as detected by GitHub.
          </p>
          {state.error && (
            <p className="small notice-inline">
              {state.error.kind === 'rate_limit'
                ? 'GitHub’s rate limit was reached, so this breakdown is incomplete. '
                : 'A network problem interrupted loading, so this breakdown is incomplete. '}
              You can try again later.
            </p>
          )}
          {sizeStats.length === 0 ? (
            <p className="muted">No language data available.</p>
          ) : (
            <div className="lang-layout">
              <LanguageChart languages={sizeStats} formatValue={formatBytes} ariaLabel="Donut chart of code size by language" />
              <LanguageBars languages={sizeStats} limit={8} formatValue={formatBytes} />
            </div>
          )}
          <div>
            <button className="btn" onClick={load}>
              Reload
            </button>
          </div>
        </>
      )}
    </section>
  )
}
