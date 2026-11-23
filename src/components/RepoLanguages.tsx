import { RefreshCw } from 'lucide-react'
import { useRepoLanguages } from '../hooks/useRepoLanguages'
import { describeError } from './States'
import LanguageBars from './LanguageBars'
import { formatBytes } from '../utils/format'

/** Language breakdown for one repository. It only loads (one GitHub request) once it is shown. */
export default function RepoLanguages({ fullName }: { fullName: string }) {
  const { state, retry } = useRepoLanguages(fullName)

  if (state.status === 'loading') {
    return (
      <div className="repo-langs" role="status" aria-live="polite">
        <div className="skeleton" style={{ height: 10, width: '100%', borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 10, width: '70%', borderRadius: 999 }} />
        <span className="sr-only">Loading languages…</span>
      </div>
    )
  }

  if (state.status === 'error') {
    // The request layer words a missing repository as a missing user, so that case is reworded here.
    const { title, body, canRetry } = describeError(state.error, fullName)
    const text = state.error.kind === 'not_found' ? 'This repository could not be found. It may have been renamed or deleted.' : `${title}. ${body}`
    return (
      <div className="repo-langs" role="alert">
        <p className="small">{text}</p>
        {canRetry && state.error.kind !== 'not_found' && (
          <button type="button" className="btn" onClick={retry}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    )
  }

  if (state.languages.length === 0) {
    return (
      <div className="repo-langs">
        <p className="muted small">GitHub found no code to measure in this repository.</p>
      </div>
    )
  }

  return (
    <div className="repo-langs">
      <LanguageBars languages={state.languages} limit={8} formatValue={formatBytes} />
      <p className="muted small">
        {formatBytes(state.totalBytes)} of code in total
        {state.languages.length > 8 ? `, ${state.languages.length - 8} smaller ${state.languages.length - 8 === 1 ? 'language' : 'languages'} not shown` : ''}.
      </p>
    </div>
  )
}
