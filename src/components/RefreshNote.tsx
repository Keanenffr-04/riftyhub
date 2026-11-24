import { Loader2, RefreshCw } from 'lucide-react'
import type { LoadState } from '../hooks/useGitHubData'
import { timeAgo } from '../utils/format'

type Success = Extract<LoadState, { status: 'success' }>

/**
 * A quiet note shown above a profile while saved data is on screen: either a newer copy is being
 * fetched in the background, or that refresh failed and the saved copy is what you are looking at.
 */
export default function RefreshNote({ state, onRetry }: { state: Success; onRetry: () => void }) {
  if (state.refreshing) {
    return (
      <p className="refresh-note" role="status">
        <Loader2 size={14} className="spin" aria-hidden="true" /> Showing saved data while checking GitHub for updates…
      </p>
    )
  }
  if (state.stale) {
    const reason =
      state.stale.error.kind === 'rate_limit'
        ? 'GitHub’s request limit has been reached'
        : state.stale.error.kind === 'auth'
          ? 'GitHub did not accept the saved token'
          : 'GitHub could not be reached'
    return (
      <p className="refresh-note refresh-note-warn" role="status">
        <span>
          Couldn’t update: {reason}. Showing data saved {timeAgo(new Date(state.stale.storedAt).toISOString())}.
        </span>
        <button type="button" className="btn refresh-note-btn" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      </p>
    )
  }
  return null
}
